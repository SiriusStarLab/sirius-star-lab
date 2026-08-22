import { db, siriusErrors, siriusNotifications } from "@workspace/db";
import { sql } from "drizzle-orm";
import * as tls from "tls";
import * as os from "node:os";
import { stat, statfs } from "node:fs/promises";
import { sendTelegramMessage } from "./telegram.js";
import { openai } from "@workspace/ai-client";
import { sendAlertEmail } from "./alert-delivery.js";
import { startOperationalReporting } from "./operational-reporting.js";

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
const INCIDENT_COOLDOWN_MS = 30 * 60 * 1000;
const PUBLIC_SITE_ROUTES = [
  "/",
  "/wellbeing",
  "/dream-lab",
  "/star-lab",
  "/creator-lab",
  "/projects",
  "/pricing",
  "/origin",
  "/universe",
  "/learn",
  "/discover",
  "/compare",
  "/memories",
  "/why-sirius",
  "/terms",
  "/privacy",
] as const;
let lastIncidentFingerprint = "";
let lastIncidentAt = 0;
let lastAiSummary = "";
let lastChatProbeAt = 0;

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

async function checkAiUsage(): Promise<CheckResult> {
  const key = process.env["OPENROUTER_API_KEY"] || process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!key) return { name: "ai_usage", status: "warn", detail: "No AI usage key configured" };

  const t = Date.now();
  try {
    const base = process.env["OPENROUTER_BASE_URL"] || "https://openrouter.ai/api/v1";
    const response = await fetch(`${base}/key`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - t;
    if (!response.ok) {
      return { name: "ai_usage", status: "warn", latencyMs, detail: `AI usage endpoint HTTP ${response.status}` };
    }

    const payload = await response.json() as { data?: { usage?: number; limit?: number | null } };
    const usage = Number(payload.data?.usage);
    const limit = payload.data?.limit == null ? null : Number(payload.data.limit);
    if (!Number.isFinite(usage)) {
      return { name: "ai_usage", status: "warn", latencyMs, detail: "AI provider returned no usage value" };
    }
    if (limit && Number.isFinite(limit)) {
      const ratio = usage / limit;
      const detail = `AI usage $${usage.toFixed(2)} of $${limit.toFixed(2)} limit`;
      if (ratio >= 0.9) return { name: "ai_usage", status: "fail", latencyMs, detail };
      if (ratio >= 0.75) return { name: "ai_usage", status: "warn", latencyMs, detail };
      return { name: "ai_usage", status: "ok", latencyMs, detail };
    }
    return { name: "ai_usage", status: "ok", latencyMs, detail: `AI usage $${usage.toFixed(2)}; no provider limit reported` };
  } catch (error: any) {
    return { name: "ai_usage", status: "warn", latencyMs: Date.now() - t, detail: error?.message || "AI usage probe failed" };
  }
}

async function checkStripeGateway(): Promise<CheckResult> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) {
    return { name: "stripe_gateway", status: "warn", detail: "STRIPE_SECRET_KEY is not configured; Stripe cannot be monitored" };
  }

  const t = Date.now();
  try {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - t;
    if (response.ok) return { name: "stripe_gateway", status: "ok", latencyMs };
    if (response.status >= 500) {
      return { name: "stripe_gateway", status: "fail", latencyMs, detail: `Stripe HTTP ${response.status}` };
    }
    return { name: "stripe_gateway", status: "warn", latencyMs, detail: `Stripe HTTP ${response.status}` };
  } catch (error: any) {
    return { name: "stripe_gateway", status: "fail", latencyMs: Date.now() - t, detail: error?.message || "Stripe probe failed" };
  }
}

async function checkPaymentIntegrity(): Promise<CheckResult> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS overdue_count
      FROM payment_requests
      WHERE status = 'activated'
        AND confirmed_at IS NULL
        AND expires_at < NOW()
    `) as any;
    const overdueCount = Number((result.rows ?? result)[0]?.overdue_count ?? 0);
    if (overdueCount === 0) return { name: "payment_integrity", status: "ok", detail: "No overdue payment confirmations" };
    return {
      name: "payment_integrity",
      status: "warn",
      detail: `${overdueCount} activated payment request(s) are past their confirmation window`,
    };
  } catch (error: any) {
    return { name: "payment_integrity", status: "warn", detail: `Could not inspect payment state: ${error?.message || "unknown error"}` };
  }
}

async function checkBackupFreshness(): Promise<CheckResult> {
  const backupLogPath = "/var/log/sirius_backup.log";
  try {
    const info = await stat(backupLogPath);
    const ageHours = (Date.now() - info.mtimeMs) / 3_600_000;
    if (ageHours > 48) {
      return { name: "backup_freshness", status: "fail", detail: `No backup log update for ${Math.floor(ageHours)} hours` };
    }
    if (ageHours > 28) {
      return { name: "backup_freshness", status: "warn", detail: `Latest backup log update was ${Math.floor(ageHours)} hours ago` };
    }
    return { name: "backup_freshness", status: "ok", detail: `Backup log updated ${Math.max(0, Math.floor(ageHours))} hours ago` };
  } catch (error: any) {
    return { name: "backup_freshness", status: "fail", detail: `Backup log unavailable: ${error?.message || "unknown error"}` };
  }
}

async function checkInfrastructure(): Promise<CheckResult> {
  try {
    const [fileSystem] = await Promise.all([statfs("/")]);
    const diskUsedRatio = 1 - (fileSystem.bavail / fileSystem.blocks);
    const memoryFreeRatio = os.freemem() / os.totalmem();
    const diskPercent = Math.round(diskUsedRatio * 100);
    const memoryFreePercent = Math.round(memoryFreeRatio * 100);
    const detail = `Disk ${diskPercent}% used; memory ${memoryFreePercent}% free`;

    if (diskUsedRatio >= 0.95 || memoryFreeRatio <= 0.05) {
      return { name: "infrastructure", status: "fail", detail };
    }
    if (diskUsedRatio >= 0.85 || memoryFreeRatio <= 0.1) {
      return { name: "infrastructure", status: "warn", detail };
    }
    return { name: "infrastructure", status: "ok", detail };
  } catch (error: any) {
    return { name: "infrastructure", status: "warn", detail: `Could not read host capacity: ${error?.message || "unknown error"}` };
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

async function checkPublicRoute(path: string): Promise<CheckResult> {
  const routeName = `route_${path === "/" ? "home" : path.slice(1).replace(/\//g, "_")}`;
  const t = Date.now();
  try {
    const res = await fetch(`https://sirius-ai.live${path}`, {
      signal: AbortSignal.timeout(10000),
      headers: { "Cache-Control": "no-cache" },
    });
    const ms = Date.now() - t;
    if (!res.ok) return { name: routeName, status: "fail", latencyMs: ms, detail: `HTTP ${res.status}` };
    const html = await res.text();
    if (!html.includes("<script") || !html.includes(".js")) {
      return { name: routeName, status: "warn", latencyMs: ms, detail: "Route returned HTML without an application bundle" };
    }
    return { name: routeName, status: "ok", latencyMs: ms };
  } catch (error: any) {
    return { name: routeName, status: "fail", latencyMs: Date.now() - t, detail: error?.message || "Route probe failed" };
  }
}

async function checkChatStream(): Promise<CheckResult> {
  const port = process.env["PORT"] || "4000";
  const t = Date.now();
  let conversationId = "";
  try {
    const conversationResponse = await fetch(`http://localhost:${port}/api/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "health-check-probe", title: "health check chat probe" }),
      signal: AbortSignal.timeout(6000),
    });
    if (!conversationResponse.ok) {
      return { name: "chat_stream", status: "fail", latencyMs: Date.now() - t, detail: `Conversation creation HTTP ${conversationResponse.status}` };
    }

    const conversation = await conversationResponse.json() as { id?: string };
    conversationId = conversation.id || "";
    if (!conversationId) {
      return { name: "chat_stream", status: "fail", latencyMs: Date.now() - t, detail: "Conversation creation returned no ID" };
    }

    const response = await fetch(`http://localhost:${port}/api/openai/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "health-check-probe", content: "Reply with OK only.", mode: "guru" }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok || !response.body) {
      return { name: "chat_stream", status: "fail", latencyMs: Date.now() - t, detail: `Message stream HTTP ${response.status}` };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedContent = false;
    let receivedDone = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") {
          receivedDone = true;
          continue;
        }
        try {
          const event = JSON.parse(payload) as { content?: string; done?: boolean; error?: string };
          if (event.content) receivedContent = true;
          if (event.done) receivedDone = true;
          if (event.error) return { name: "chat_stream", status: "fail", latencyMs: Date.now() - t, detail: event.error.slice(0, 240) };
        } catch {
          // Partial SSE frames are completed on the next read.
        }
      }
      if (receivedDone) break;
    }

    if (!receivedContent || !receivedDone) {
      return { name: "chat_stream", status: "fail", latencyMs: Date.now() - t, detail: "Stream ended without content and completion signal" };
    }
    return { name: "chat_stream", status: "ok", latencyMs: Date.now() - t, detail: "Synthetic chat response completed" };
  } catch (error: any) {
    return { name: "chat_stream", status: "fail", latencyMs: Date.now() - t, detail: error?.message || "Chat stream probe failed" };
  } finally {
    if (conversationId) {
      await db.execute(sql`DELETE FROM messages WHERE conversation_id = ${conversationId}`).catch(() => {});
      await db.execute(sql`DELETE FROM conversations WHERE id = ${conversationId}`).catch(() => {});
    }
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

async function createAiIncidentSummary(report: HealthReport): Promise<string> {
  const fallback = `Sirius health patrol detected ${report.overall} status:\n${report.issues.join("\n")}`;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return fallback;
  }
  try {
    const result = await openai.chat.completions.create({
      model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "anthropic/claude-opus-4.8",
      messages: [
        {
          role: "system",
          content: "You are Sirius production monitoring. Summarize an incident in three short lines: severity, likely cause, and safest next action. Do not suggest code changes or autonomous restarts. Never invent facts.",
        },
        {
          role: "user",
          content: `Health checks:\n${JSON.stringify(report.checks)}\nIssues:\n${report.issues.join("\n")}`,
        },
      ],
      max_tokens: 220,
      temperature: 0,
    });
    return result.choices[0]?.message?.content?.trim() || fallback;
  } catch (error: any) {
    console.warn(`[HealthMonitor] AI incident summary unavailable: ${error?.message || "unknown error"}`);
    return fallback;
  }
}

async function sendEmailIncident(report: HealthReport, aiSummary: string): Promise<boolean> {
  const subject = `Sirius ${report.overall.toUpperCase()} — ${report.issues[0] || "health patrol issue"}`;
  const text = [
    `Sirius health patrol: ${report.overall.toUpperCase()}`,
    `Detected: ${report.runAt}`,
    "",
    aiSummary,
    "",
    "Raw issues:",
    ...report.issues.map((issue) => `- ${issue}`),
  ].join("\n");
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const result = await sendAlertEmail({
    subject,
    text,
    html: `<h2>Sirius health patrol: ${report.overall.toUpperCase()}</h2><pre style="white-space:pre-wrap">${escaped}</pre>`,
  });
  if (!result.ok) {
    console.warn(`[HealthMonitor] Email alert unavailable: ${result.error}`);
    return false;
  }
  console.log(`[HealthMonitor] Email alert sent via ${result.channel}`);
  return true;
}

// ── Main health check runner ──────────────────────────────────────────────────
export async function runHealthCheck(): Promise<HealthReport> {
  const runAt = new Date().toISOString();
  console.log("[HealthMonitor] Running patrol checks…");
  const now = Date.now();
  const runChatProbe = process.env.NODE_ENV !== "development" && now - lastChatProbeAt >= 60 * 60 * 1000;
  if (runChatProbe) lastChatProbeAt = now;

  const checks = await Promise.all([
    checkDatabase(),
    checkOpenRouter(),
    checkAiUsage(),
    checkStripeGateway(),
    checkPaymentIntegrity(),
    checkBackupFreshness(),
    checkInfrastructure(),
    checkSelfEndpoint("/api/healthz", "http_server"),
    checkDreamLabApi(),
    checkConversationApi(),
    checkSslCertificate(),
    checkAuthEndpoint(),
    checkUserIdIntegrity(),
    checkMessageSaveRate(),
    checkFrontend(),
    ...PUBLIC_SITE_ROUTES.map((path) => checkPublicRoute(path)),
    ...(runChatProbe ? [checkChatStream()] : []),
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
    const fingerprint = issues.join("|");
    const shouldNotify = fingerprint !== lastIncidentFingerprint || Date.now() - lastIncidentAt >= INCIDENT_COOLDOWN_MS;
    let aiSummary = lastAiSummary;
    let emailDelivered = false;
    if (shouldNotify) {
      lastIncidentFingerprint = fingerprint;
      lastIncidentAt = Date.now();
      aiSummary = await createAiIncidentSummary(report);
      lastAiSummary = aiSummary;
      emailDelivered = await sendEmailIncident(report, aiSummary);
    }

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
        `${emoji} *Sirius Alert — ${c.name.replace(/_/g, " ").toUpperCase()}*\n\n${c.detail ?? "Check failed"}\n\n${shouldNotify ? aiSummary : "Same incident remains active; alert cooldown is in effect."}\n\n_Detected at ${new Date(runAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London" })}_`
      );
    }

    // Warnings — send Telegram if it's the critical ones (userid, message_save, auth)
    const criticalWarnChecks = [
      "userid_integrity",
      "message_save",
      "auth_endpoint",
      "ssl_cert",
      "stripe_gateway",
      "payment_integrity",
      "backup_freshness",
      "infrastructure",
      "ai_usage",
    ];
    for (const c of warnChecks.filter(c => criticalWarnChecks.includes(c.name))) {
      await sendAlert(
        `${c.name}_warn`,
        `⚠️ *Sirius Warning — ${c.name.replace(/_/g, " ")}*\n\n${c.detail ?? "Degraded"}\n\n${shouldNotify ? aiSummary : "Same incident remains active; alert cooldown is in effect."}\n\n_Patrol check at ${new Date(runAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London" })}_`
      );
    }

    // Passive notification for Garry to see in Star Lab
    if (shouldNotify) {
      try {
        const recentNotif = await db.execute(
          sql`SELECT id FROM sirius_notifications
              WHERE type = 'health_alert'
                AND created_at > NOW() - INTERVAL '30 minutes'
              LIMIT 1`
        ) as any;
        const rows = recentNotif.rows ?? recentNotif;
        if (!rows || rows.length === 0) {
          await db.insert(siriusNotifications).values({
            title: `🔴 Patrol alert: ${overall.toUpperCase()}`,
            message: `Health patrol at ${runAt} found issues:\n${issues.join("\n")}\n\nAI triage:\n${aiSummary}\n\nTelegram alert attempted. Email delivery: ${emailDelivered ? "sent" : "not configured or failed"}.`,
            type: "health_alert",
            urgency: "high",
            read: false,
            sentEmail: emailDelivered,
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
  startOperationalReporting(() => getLastReport());
  console.log(`[HealthMonitor] 🛡️ Patrol started — checking every ${intervalMinutes} minutes`);
}
