/**
 * Sirius Security Scanner
 *
 * Gives Sirius the ability to scan her own codebase and environment
 * for vulnerabilities, suspicious access, exposed secrets, and integrity issues.
 * She can run this herself, on demand or on a schedule.
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { db, siriusErrors } from "@workspace/db";
import { desc, gte } from "drizzle-orm";

const execAsync = promisify(exec);
const WORKSPACE = "/home/runner/workspace";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SecurityFinding = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "dependency" | "secret" | "access" | "integrity" | "config";
  title: string;
  detail: string;
  recommendation: string;
};

export type SecurityReport = {
  timestamp: string;
  overallRisk: "critical" | "high" | "medium" | "low" | "clean";
  findings: SecurityFinding[];
  summary: string;
  stats: {
    dependencyVulns: number;
    suspiciousAccessAttempts: number;
    secretExposures: number;
    totalFindings: number;
  };
};

// ── Secret pattern detection ───────────────────────────────────────────────────

const SECRET_PATTERNS = [
  { name: "Hardcoded API key", pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][a-zA-Z0-9_\-]{20,}/gi },
  { name: "Hardcoded password", pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{6,}/gi },
  { name: "OpenAI key", pattern: /sk-[a-zA-Z0-9]{20,}/g },
  { name: "Stripe secret key", pattern: /sk_(?:live|test)_[a-zA-Z0-9]{20,}/g },
  { name: "Private key block", pattern: /-----BEGIN (?:RSA|EC|OPENSSH) PRIVATE KEY-----/g },
  { name: "Bearer token hardcoded", pattern: /Authorization:\s*["']Bearer [a-zA-Z0-9_\-.]{20,}/gi },
];

const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".env"];
const SKIP_DIRS = ["node_modules", ".git", "dist", ".cache"];

async function scanFileForSecrets(filePath: string): Promise<SecurityFinding[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const findings: SecurityFinding[] = [];

    for (const { name, pattern } of SECRET_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          severity: "critical",
          category: "secret",
          title: `${name} detected`,
          detail: `Found in ${path.relative(WORKSPACE, filePath)} — ${matches.length} match(es)`,
          recommendation: "Move to environment variable / Replit Secret immediately. Never commit credentials to source files.",
        });
      }
    }

    return findings;
  } catch {
    return [];
  }
}

async function walkAndScan(dir: string, findings: SecurityFinding[]): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkAndScan(fullPath, findings);
    } else if (entry.isFile() && SCAN_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      const fileFindings = await scanFileForSecrets(fullPath);
      findings.push(...fileFindings);
    }
  }
}

// ── Dependency vulnerability scan ─────────────────────────────────────────────

async function scanDependencies(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  try {
    const { stdout } = await execAsync("pnpm audit --json 2>/dev/null || true", {
      cwd: WORKSPACE,
      timeout: 30000,
    });

    let report: any = null;
    try { report = JSON.parse(stdout); } catch { return findings; }

    const vulns = report?.vulnerabilities || report?.advisories || {};
    const counts = { critical: 0, high: 0, moderate: 0, low: 0 };

    for (const [, vuln] of Object.entries<any>(vulns)) {
      const severity = vuln.severity || "low";
      const mappedSev = severity === "moderate" ? "medium" : severity;

      if (severity === "critical") counts.critical++;
      else if (severity === "high") counts.high++;
      else if (severity === "moderate") counts.moderate++;
      else counts.low++;

      // pnpm audit JSON: package name is in module_name, vulnerability title in title
      const pkgName = vuln.module_name || vuln.name || "unknown-package";
      const vulnTitle = vuln.title || "Known vulnerability";

      if (severity === "critical" || severity === "high") {
        findings.push({
          severity: mappedSev as SecurityFinding["severity"],
          category: "dependency",
          title: `Vulnerable dependency: ${pkgName}`,
          detail: vulnTitle,
          recommendation: vuln.fixAvailable
            ? `Fix available — run: pnpm update ${pkgName}`
            : `No automatic fix. Consider replacing or removing ${pkgName}.`,
        });
      }
    }

    const totalVulns = counts.critical + counts.high + counts.moderate + counts.low;
    if (totalVulns > 0 && findings.length === 0) {
      findings.push({
        severity: "low",
        category: "dependency",
        title: `${counts.moderate + counts.low} low/medium dependency issues`,
        detail: `${counts.moderate} moderate, ${counts.low} low severity vulnerabilities found`,
        recommendation: "Run pnpm audit for full details. Low/medium issues are lower priority but should be addressed over time.",
      });
    }

    if (totalVulns === 0) {
      findings.push({
        severity: "info",
        category: "dependency",
        title: "Dependencies clean",
        detail: "No known vulnerabilities found in installed packages",
        recommendation: "Continue running scans regularly to catch new disclosures.",
      });
    }
  } catch (e: any) {
    findings.push({
      severity: "info",
      category: "dependency",
      title: "Dependency scan unavailable",
      detail: `Could not run audit: ${e.message?.slice(0, 100)}`,
      recommendation: "Run pnpm audit manually if needed.",
    });
  }

  return findings;
}

// ── Access log monitoring ──────────────────────────────────────────────────────

async function scanAccessLogs(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const errors = await db
      .select()
      .from(siriusErrors)
      .where(gte(siriusErrors.occurredAt, since))
      .orderBy(desc(siriusErrors.occurredAt))
      .limit(100);

    const authFailures = errors.filter(e =>
      (e.errorMessage || "").toLowerCase().includes("auth") ||
      (e.errorMessage || "").toLowerCase().includes("pin") ||
      (e.errorMessage || "").toLowerCase().includes("unauthorized") ||
      (e.toolName || "").toLowerCase().includes("auth")
    );

    if (authFailures.length >= 5) {
      findings.push({
        severity: "high",
        category: "access",
        title: `${authFailures.length} authentication failures in last 24h`,
        detail: `Multiple failed access attempts detected. May indicate brute-force or probing activity.`,
        recommendation: "Review access patterns. Consider changing the Star Lab PIN. Monitor for further attempts.",
      });
    } else if (authFailures.length > 0) {
      findings.push({
        severity: "low",
        category: "access",
        title: `${authFailures.length} authentication failure(s) in last 24h`,
        detail: "Some failed access attempts logged — could be accidental or testing.",
        recommendation: "Monitor. If frequency increases, consider changing the PIN.",
      });
    } else {
      findings.push({
        severity: "info",
        category: "access",
        title: "Access logs clean",
        detail: "No suspicious authentication activity in the last 24 hours",
        recommendation: "Continue monitoring.",
      });
    }
  } catch {
    findings.push({
      severity: "info",
      category: "access",
      title: "Access log scan skipped",
      detail: "Could not query access logs",
      recommendation: "Ensure database connection is healthy.",
    });
  }

  return findings;
}

// ── Config integrity check ─────────────────────────────────────────────────────

async function checkConfigIntegrity(): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  // Check that critical env vars are present (without exposing values)
  const required = ["OPENROUTER_API_KEY", "DATABASE_URL", "STAR_LAB_PIN"];
  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    findings.push({
      severity: "critical",
      category: "config",
      title: `Missing critical environment variable(s): ${missing.join(", ")}`,
      detail: "One or more required secrets are not set in the environment.",
      recommendation: "Add the missing secrets via Replit Secrets immediately. The system may be partially broken without them.",
    });
  }

  // Check PIN strength
  const pin = process.env.STAR_LAB_PIN || "";
  if (pin.length < 6) {
    findings.push({
      severity: "medium",
      category: "config",
      title: "Star Lab PIN is short",
      detail: `Current PIN is ${pin.length} digits. Short PINs are easier to guess.`,
      recommendation: "Use a PIN of at least 8 digits. Change it via Star Lab settings.",
    });
  }

  if (missing.length === 0 && pin.length >= 6) {
    findings.push({
      severity: "info",
      category: "config",
      title: "Configuration looks healthy",
      detail: "All required environment variables are present and PIN meets minimum length.",
      recommendation: "Keep secrets rotated regularly.",
    });
  }

  return findings;
}

// ── Main scanner ───────────────────────────────────────────────────────────────

export async function runSecurityScan(): Promise<SecurityReport> {
  const timestamp = new Date().toISOString();
  const allFindings: SecurityFinding[] = [];

  // Run all scans in parallel
  const [depFindings, accessFindings, configFindings, secretFindings] = await Promise.all([
    scanDependencies(),
    scanAccessLogs(),
    checkConfigIntegrity(),
    (async () => {
      const f: SecurityFinding[] = [];
      await walkAndScan(path.join(WORKSPACE, "artifacts"), f);
      await walkAndScan(path.join(WORKSPACE, "lib"), f);
      return f;
    })(),
  ]);

  allFindings.push(...depFindings, ...accessFindings, ...configFindings, ...secretFindings);

  const realFindings = allFindings.filter(f => f.severity !== "info");
  const stats = {
    dependencyVulns: allFindings.filter(f => f.category === "dependency" && f.severity !== "info").length,
    suspiciousAccessAttempts: allFindings.filter(f => f.category === "access" && f.severity !== "info").length,
    secretExposures: allFindings.filter(f => f.category === "secret").length,
    totalFindings: realFindings.length,
  };

  const hasCritical = realFindings.some(f => f.severity === "critical");
  const hasHigh = realFindings.some(f => f.severity === "high");
  const hasMedium = realFindings.some(f => f.severity === "medium");

  const overallRisk = hasCritical ? "critical" : hasHigh ? "high" : hasMedium ? "medium"
    : realFindings.length > 0 ? "low" : "clean";

  const summary = overallRisk === "clean"
    ? "All systems clear. No vulnerabilities, suspicious access, or exposed secrets detected."
    : `${realFindings.length} issue(s) found — ${hasCritical ? "CRITICAL action required" : hasHigh ? "high priority items need attention" : "low/medium issues to address"}. ${stats.secretExposures > 0 ? "⚠ Exposed secrets require immediate action." : ""}`;

  return { timestamp, overallRisk, findings: allFindings, summary, stats };
}
