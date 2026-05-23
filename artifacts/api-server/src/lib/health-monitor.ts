import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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

export function getLastReport(): HealthReport | null { return lastReport; }
export function getHistory(): HealthReport[] { return [...history]; }

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
    const res = await fetch("https://openrouter.ai/api/v1/models", {
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
    // GET ideas list — no PIN required, just needs userId query param
    const res = await fetch(`http://localhost:${port}/api/dream-lab/ideas?userId=health-probe`, {
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - t;
    // 200 (empty list) or 404 both mean the route is alive
    if (res.status < 500) return { name: "dream_lab_api", status: "ok", latencyMs: ms };
    return { name: "dream_lab_api", status: "warn", latencyMs: ms, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: "dream_lab_api", status: "fail", latencyMs: Date.now() - t, detail: e.message };
  }
}

export async function runHealthCheck(): Promise<HealthReport> {
  const runAt = new Date().toISOString();
  console.log("[HealthMonitor] Running checks…");

  const checks = await Promise.all([
    checkDatabase(),
    checkOpenRouter(),
    checkSelfEndpoint("/healthz", "http_server"),
    checkDreamLabApi(),
    checkConversationApi(),
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
    console.log("[HealthMonitor] ✅ All systems OK");
  } else {
    console.warn(`[HealthMonitor] ⚠️ ${overall.toUpperCase()} — ${issues.join("; ")}`);
  }

  return report;
}

export function startHealthMonitor(intervalMinutes = 30) {
  // First check after 20 seconds (let server fully boot)
  setTimeout(() => runHealthCheck().catch(e => console.error("[HealthMonitor] Error:", e)), 20_000);
  // Then on schedule
  setInterval(() => runHealthCheck().catch(e => console.error("[HealthMonitor] Error:", e)), intervalMinutes * 60 * 1000);
  console.log(`[HealthMonitor] Started — checks every ${intervalMinutes} minutes`);
}
