import { db, siriusErrors, siriusNotifications } from "@workspace/db";
import { sql } from "drizzle-orm";
import * as tls from "tls";
import { sendTelegramMessage } from "./telegram.js";

export interface CheckResult {
  name: string;
  status: "ok" | "warn" | "fail";
  latencyMs?: number;
  detail?: string;
}

export interface HealthReport {
  runAt: string;
  overall: "ok" | "degraded" | "down";
  checks: CheckResult[];
  issues: string[];
}

const MAX_HISTORY = 48;
const history: HealthReport[] = [];
let lastReport: HealthReport | null = null;

// Track last Telegram alert time per check to avoid spam
const lastTelegramAlert: Record<string, number> = {};
const TELEGRAM_COOLDOWN_MS = 30 * 60 * 1000; // 30 min per check

export function getLastReport(): HealthReport | null { return lastReport; }
export function getHistory(): HealthReport[] { return [...history]; }

// ── Individual Checks ──────────────────────────────────────────────────────────

async function checkDatabase(): Promise<CheckResult> {
  const t = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { name: "database", status: "ok", latencyMs: Date.now() - t };
  } catch (e: any) {
    return { name: "database", status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

async function checkOpenRouter(): Promise<CheckResult> {
  const t = Date.now();
  const key = process.env["OPENROUTER_API_KEY"] || process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!key) return { name: "openrouter", status: "warn", detail: "No API key configured" };
  try {
    const orBase = process.env["OPENROUTER_BASE_URL"] || "https://openrouter.ai/api/v1";
    const res = await fetch(`${orBase}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - t;
    if (res.ok) return { name: "openrouter", status: "ok", latencyMs: ms };
    return { name: "openrouter", status: "warn", latencyMs: ms, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: "openrouter", status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

async function checkSelfEndpoint(path: string, label: string): Promise<CheckResult> {
  const port = process.env["PORT"] || "4000";
  const t = Date.now();
  try {
    const res = await fetch(`http://localhost:${port}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - t;
    if (res.ok) return { name: label, status: "ok", latencyMs: ms };
    return { name: label, status: "warn", latencyMs: ms, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: label, status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

async function checkConversationApi(): Promise<CheckResult> {
  const port = process.env["PORT"] || "4000";
  const t = Date.now();
  try {
    const res = await fetch(`http://localhost:${port}/api/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "health-check-probe", title: "health check" }),
      signal: AbortSignal.timeout(6000),
    });
    const ms = Date.now() - t;
    if (res.ok || res.status === 201) return { name: "chat_api", status: "ok", latencyMs: ms };
    return { name: "chat_api", status: "warn", latencyMs: ms, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: "chat_api", status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

async function checkDreamLabApi(): Promise<CheckResult> {
  const port = process.env["PORT"] || "4000";
  const t = Date.now();
  try {
    const res = await fetch(`http://localhost:${port}/api/dream-lab/ideas`, {
      headers: { "x-dream-user": "health-probe" },
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - t;
    if (res.status < 500) return { name: "dream_lab_api", status: "ok", latencyMs: ms };
    return { name: "dream_lab_api", status: "warn", latencyMs: ms, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: "dream_lab_api", status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

// ── NEW: Auth endpoint patrol ──────────────────────────────────────────────────
async function checkAuthEndpoint(): Promise<CheckResult> {
  const port = process.env["PORT"] || "4000";
  const t = Date.now();
  try {
    const res = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "patrol-probe@sirius.internal", password: "probe" }),
      signal: AbortSignal.timeout(6000),
    });
    const ms = Date.now() - t;
    // 401 = wrong password = auth system is up and responding correctly
    // 400 = validation error = route is alive
    // 200 = should not happen with fake creds but fine
    // 5xx = real problem
    if (res.status < 500) return { name: "auth_endpoint", status: "ok", latencyMs: ms };
    return { name: "auth_endpoint", status: "fail", latencyMs: ms, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: "auth_endpoint", status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

// ── NEW: userId integrity patrol — catches orphaned conversations ───────────────
async function checkUserIdIntegrity(): Promise<CheckResult> {
  try {
    const rows = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM conversations
          WHERE user_id IS NULL
            AND created_at > NOW() - INTERVAL '1 hour'
            AND title NOT IN ('probe', 'health check', 'test')`
    ) as any;
    const cnt = parseInt((rows.rows ?? rows)[0]?.cnt ?? "0", 10);
    if (cnt === 0) return { name: "userid_integrity", status: "ok", detail: "No orphaned conversations in last hour" };
    if (cnt <= 3) return { name: "userid_integrity", status: "warn", detail: `${cnt} conversation(s) saved with no userId in last hour` };
    return { name: "userid_integrity", status: "fail", detail: `${cnt} conversations saved with no userId in last hour — message save bug may have returned` };
  } catch (e: any) {
    return { name: "userid_integrity", status: "warn", detail: `Could not check: ${e.message}` };
  }
}

// ── NEW: Message save patrol — ensure conversations have messages ──────────────
async function checkMessageSaveRate(): Promise<CheckResult> {
  try {
    // Look at real-user conversations from last 2 hours and see if any are empty (no messages saved)
    const rows = await db.execute(
      sql`SELECT COUNT(*) as empty_convos FROM conversations c
          WHERE c.created_at > NOW() - INTERVAL '2 hours'
            AND c.user_id NOT LIKE '%probe%'
            AND c.user_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM messages m WHERE m.conversation_id = c.id
            )`
    ) as any;
    const cnt = parseInt((rows.rows ?? rows)[0]?.empty_convos ?? "0", 10);
    if (cnt === 0) return { name: "message_save", status: "ok", detail: "All recent conversations have messages" };
    if (cnt <= 2) return { name: "message_save", status: "warn", detail: `${cnt} conversation(s) started but no messages saved` };
    return { name: "message_save", status: "fail", detail: `${cnt} conversations with no messages — possible save failure` };
  } catch (e: any) {
    return { name: "message_save", status: "warn", detail: `Could not check: ${e.message}` };
  }
}

// ── NEW: Frontend serving patrol — verify sirius-ai.live is up ────────────────
async function checkFrontend(): Promise<CheckResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://sirius-ai.live/", {
      signal: AbortSignal.timeout(10000),
      headers: { "Cache-Control": "no-cache" },
    });
    const ms = Date.now() - t;
    if (!res.ok) return { name: "frontend", status: "fail", latencyMs: ms, detail: `HTTP ${res.status}` };
    const html = await res.text();
    if (!html.includes("index-") || !html.includes(".js")) {
      return { name: "frontend", status: "warn", latencyMs: ms, detail: "Response OK but missing JS bundle reference in HTML" };
    }
    return { name: "frontend", status: "ok", latencyMs: ms, detail: "Site serving correctly" };
  } catch (e: any) {
    return { name: "frontend", status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

// ── SSL certificate check ──────────────────────────────────────────────────────
export function checkSslCertificateDays(): Promise<number | null> {
  const domain = "sirius-ai.live";
  return new Promise((resolve) => {
    const socket = tls.connect(443, domain, { servername: domain }, () => {
      try {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        if (!cert || !cert.valid_to) return resolve(null);
        const expiresAt = new Date(cert.valid_to);
        resolve(Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000));
      } catch {
        socket.destroy();
        resolve(null);
      }
    });
    socket.setTimeout(8000, () => { socket.destroy(); resolve(null); });
    socket.on("error", () => resolve(null));
  });
}

async function checkSslCertificate(): Promise<CheckResult> {
  const daysLeft = await checkSslCertificateDays();
  if (daysLeft === null) return { name: "ssl_cert", status: "warn", detail: "Could not read certificate" };
  if (daysLeft <= 7)  return { name: "ssl_cert", status: "fail", detail: `Expires in ${daysLeft} days — RENEW NOW` };
  if (daysLeft <= 30) return { name: "ssl_cert", status: "warn", detail: `Expires in ${daysLeft} days` };
  return { name: "ssl_cert", status: "ok", detail: `Valid for ${daysLeft} more days` };
}

// ── Telegram alert with per-check cooldown ────────────────────────────────────
async function sendAlert(checkName: string, message: string): Promise<void> {
  const now = Date.now();
  const last = lastTelegramAlert[checkName] ?? 0;
  if (now - last < TELEGRAM_COOLDOWN_MS) return; // skip if alerted recently
  lastTelegramAlert[checkName] = now;
  try {
    await sendTelegramMessage(message);
  } catch {}
}

// ── Main health check runner ──────────────────────────────────────────────────
export async function runHealthCheck(): Promise<HealthReport> {
  const runAt = new Date().toISOString();
  console.log("[HealthMonitor] Running patrol checks…");

  const checks = await Promise.all([
    checkDatabase(),
    checkOpenRouter(),
    checkSelfEndpoint("/api/healthz", "http_server"),
    checkDreamLabApi(),
    checkConversationApi(),
    checkSslCertificate(),
    checkAuthEndpoint(),
    checkUserIdIntegrity(),
    checkMessageSaveRate(),
    checkFrontend(),
  ]);

  const issues = checks
    .filter(c => c.status !== "ok")
    .map(c => `${c.name}: ${c.status}${c.detail ? ` — ${c.detail}` : ""}`);

  const hasFailure = checks.some(c => c.status === "fail");
  const hasWarn = checks.some(c => c.status === "warn");
  const overall = hasFailure ? "down" : hasWarn ? "degraded" : "ok";

  const report: HealthReport = { runAt, overall, checks, issues };
  lastReport = report;

  history.unshift(report);
  if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);

  if (overall === "ok") {
    console.log("[HealthMonitor] ✅ All patrol checks passed");
  } else {
    console.warn(`[HealthMonitor] ⚠️ ${overall.toUpperCase()} — ${issues.join("; ")}`);

    const failedChecks = checks.filter(c => c.status === "fail");
    const warnChecks = checks.filter(c => c.status === "warn");

    // Log all failures to sirius_errors
    for (const c of failedChecks) {
      try {
        await db.insert(siriusErrors).values({
          toolName: `health_monitor_${c.name}`,
          errorMessage: `${c.name} failed: ${c.detail ?? "no detail"}`,
          context: `Detected by HealthMonitor patrol at ${runAt}. Overall: ${overall}.`,
        } as any);
      } catch {}
    }

    // Send Telegram alerts for CRITICAL failures (per check, with cooldown)
    for (const c of failedChecks) {
      const emoji = c.name === "database" ? "🔴" :
                    c.name === "frontend" ? "🌐" :
                    c.name === "auth_endpoint" ? "🔐" :
                    c.name === "userid_integrity" ? "⚠️" :
                    c.name === "message_save" ? "💾" :
                    c.name === "ssl_cert" ? "🔒" :
                    c.name === "openrouter" ? "🤖" : "🔴";
      await sendAlert(
        c.name,
        `${emoji} *Sirius Alert — ${c.name.replace(/_/g, " ").toUpperCase()}*\n\n${c.detail ?? "Check failed"}\n\n_Detected at ${new Date(runAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London" })}_`
      );
    }

    // Warnings — send Telegram if it's the critical ones (userid, message_save, auth)
    const criticalWarnChecks = ["userid_integrity", "message_save", "auth_endpoint", "ssl_cert"];
    for (const c of warnChecks.filter(c => criticalWarnChecks.includes(c.name))) {
      await sendAlert(
        `${c.name}_warn`,
        `⚠️ *Sirius Warning — ${c.name.replace(/_/g, " ")}*\n\n${c.detail ?? "Degraded"}\n\n_Patrol check at ${new Date(runAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London" })}_`
      );
    }

    // Passive notification for Garry to see in Star Lab
    if (overall === "down") {
      try {
        const recentNotif = await db.execute(
          sql`SELECT id FROM sirius_notifications
              WHERE type = 'health_alert'
                AND created_at > NOW() - INTERVAL '1 hour'
              LIMIT 1`
        ) as any;
        const rows = recentNotif.rows ?? recentNotif;
        if (!rows || rows.length === 0) {
          await db.insert(siriusNotifications).values({
            title: `🔴 Patrol alert: ${overall.toUpperCase()}`,
            message: `Health patrol at ${runAt} found critical failures:\n${issues.join("\n")}\n\nTelegram alert sent. Investigating.`,
            type: "health_alert",
            urgency: "high",
            read: false,
            sentEmail: false,
          } as any);
        }
      } catch {}
    }
  }

  return report;
}

export function startHealthMonitor(intervalMinutes = 10) {
  // First check after 25 seconds (let server fully boot)
  setTimeout(() => runHealthCheck().catch(e => console.error("[HealthMonitor] Error:", e)), 25_000);
  setInterval(() => runHealthCheck().catch(e => console.error("[HealthMonitor] Error:", e)), intervalMinutes * 60 * 1000);
  console.log(`[HealthMonitor] 🛡️ Patrol started — checking every ${intervalMinutes} minutes`);
}
