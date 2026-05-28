/**
 * Sirius Self-Repair Engine
 *
 * Runs every 5 minutes in the background. Autonomous error detection,
 * logging, health enforcement, and Garry notification.
 *
 * What it does:
 *  1. Reads PM2 error logs → spots new errors → logs to sirius_errors
 *  2. Probes the live chat API endpoint — if it returns 5xx 3 times in
 *     a row the server restarts itself (pm2 auto-revives it)
 *  3. Probes the healthz endpoint — same 3-strike restart rule
 *  4. Checks SSL certificate expiry — notifies Garry if < 30 days
 *  5. Any critical finding → notify_garry via sirius_notifications
 */

import { exec } from "child_process";
import { promisify } from "util";
import { db, siriusErrors, siriusNotifications } from "@workspace/db";
import { sql } from "drizzle-orm";

const execAsync = promisify(exec);

// ── Counters (in-memory, reset on restart) ────────────────────────────────────
let chatApiFailures = 0;
let healthzFailures = 0;
let sslNotifiedAt: Date | null = null;

// ── Insert a notification for Garry ──────────────────────────────────────────
async function notifyGarry(
  title: string,
  message: string,
  type: string = "alert",
  urgency: string = "medium",
): Promise<void> {
  try {
    await db.insert(siriusNotifications).values({
      title,
      message,
      type,
      urgency,
      read: false,
      sentEmail: false,
    } as any);
    console.log(`[SelfRepair] 📬 Notified Garry: ${title}`);
  } catch (e: any) {
    console.error("[SelfRepair] Failed to insert notification:", e.message);
  }
}

// ── Log an error to sirius_errors ─────────────────────────────────────────────
async function logError(toolName: string, errorMessage: string, context = ""): Promise<void> {
  try {
    await db.insert(siriusErrors).values({
      toolName,
      errorMessage: errorMessage.slice(0, 500),
      context: context.slice(0, 500),
    } as any);
  } catch {}
}

// ── Normalise a log line for dedup comparison ─────────────────────────────────
function normalise(line: string): string {
  return line
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, "")  // strip ISO timestamps
    .replace(/\d+:\d+:\d+\s(AM|PM)/g, "")                           // strip time
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

// ── Check whether a message was already logged in the last hour ───────────────
async function alreadyLogged(message: string): Promise<boolean> {
  try {
    const norm = normalise(message);
    const rows = await db.execute(
      sql`SELECT id FROM sirius_errors
          WHERE tool_name = 'pm2_error_log'
            AND occurred_at > NOW() - INTERVAL '1 hour'
          LIMIT 50`
    );
    const recent = (rows.rows ?? rows) as any[];
    // We don't have the messages in this query — use a simpler approach:
    // just check count of recent pm2 errors. If > 20 in last hour, skip to avoid flood.
    return recent.length >= 20;
  } catch {
    return false;
  }
}

// ── Step 1: Watch PM2 error logs ──────────────────────────────────────────────
async function watchPm2Logs(): Promise<void> {
  // PM2 only exists on the production VPS — skip silently in dev
  if (process.env.NODE_ENV !== "production") return;
  try {
    const { stdout } = await execAsync(
      "pm2 logs sirius-api --lines 80 --nostream 2>&1",
      { timeout: 15_000 },
    );

    // Known benign patterns — ignore these to avoid false alarms
    const BENIGN = [
      /ENOENT.*frontend\/index\.html/,
      /ENOENT.*ai-chat\/dist/,
      /ENOENT.*public\/index\.html/,
      /\[HealthMonitor\]/,
      /\[SelfRepair\]/,
      /\[Pipeline\]/,
      /\[Investment Rule\]/,
      /\[Sirius Automations\]/,
      /self-repair-probe/,
      /health-check-probe/,
    ];

    const errorLines = stdout
      .split("\n")
      .filter(line =>
        /error:|typeerror:|syntaxerror:|uncaughtexception|unhandledpromiserejection|fatal/i.test(line)
        && line.trim().length > 10
        && !BENIGN.some(pat => pat.test(line)),
      )
      .slice(0, 10);

    if (errorLines.length === 0) return;

    // Check recent DB count to avoid flooding
    const tooMany = await alreadyLogged("");
    if (tooMany) return;

    // Get existing recent error messages for dedup
    const recentRows = await db.execute(
      sql`SELECT error_message FROM sirius_errors
          WHERE tool_name = 'pm2_error_log'
            AND occurred_at > NOW() - INTERVAL '1 hour'`
    ) as any;
    const recentMessages = new Set(
      ((recentRows.rows ?? recentRows) as any[]).map((r: any) =>
        normalise(r.error_message ?? r.errorMessage ?? "")
      )
    );

    const newErrors: string[] = [];
    for (const line of errorLines) {
      const norm = normalise(line);
      if (!recentMessages.has(norm)) {
        newErrors.push(line.trim());
        recentMessages.add(norm);
      }
    }

    if (newErrors.length === 0) return;

    console.warn(`[SelfRepair] ⚠️ ${newErrors.length} new error(s) in PM2 logs — logging`);

    for (const err of newErrors) {
      await logError("pm2_error_log", err, "Detected by self-repair engine");
    }

    await notifyGarry(
      `⚠️ ${newErrors.length} new error${newErrors.length > 1 ? "s" : ""} detected`,
      `I spotted new error${newErrors.length > 1 ? "s" : ""} in my server logs:\n\n${newErrors.slice(0, 3).join("\n")}\n\nI've logged ${newErrors.length > 3 ? `these (showing 3 of ${newErrors.length})` : "this"} to the error log. I'll investigate and fix at the start of our next conversation.`,
      "alert",
      "high",
    );
  } catch (e: any) {
    if (!e.message?.includes("not found") && !e.message?.includes("timeout")) {
      console.error("[SelfRepair] PM2 log watch error:", e.message);
    }
  }
}

// ── Step 2: Probe the chat API ────────────────────────────────────────────────
async function checkChatApi(): Promise<void> {
  const port = process.env["PORT"] ?? "4000";
  try {
    const res = await fetch(`http://localhost:${port}/api/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "self-repair-probe", title: "probe" }),
      signal: AbortSignal.timeout(7_000),
    });

    if (res.ok || res.status === 201 || res.status === 400 || res.status === 401 || res.status === 404) {
      chatApiFailures = 0;
      return;
    }

    if (res.status >= 500) {
      chatApiFailures++;
      console.warn(`[SelfRepair] Chat API ${res.status} — strike ${chatApiFailures}/3`);
    }
  } catch {
    chatApiFailures++;
    console.warn(`[SelfRepair] Chat API unreachable — strike ${chatApiFailures}/3`);
  }

  if (chatApiFailures >= 3) {
    console.error("[SelfRepair] 🔴 Chat API failed 3 checks in a row — restarting");
    await logError("self_repair", "Chat API failed 3 consecutive health checks — auto-restart triggered", "self-repair engine");
    await notifyGarry(
      "🔧 I restarted myself",
      "My chat API failed 3 health checks in a row, so I triggered an automatic restart. If you're reading this, it worked. I'll review the error log when we next talk.",
      "repair",
      "high",
    );
    chatApiFailures = 0;
    // Small delay to let the notification write complete before exit
    setTimeout(() => process.exit(0), 1_200);
  }
}

// ── Step 3: Probe the healthz endpoint ───────────────────────────────────────
async function checkHealthz(): Promise<void> {
  const port = process.env["PORT"] ?? "4000";
  try {
    const res = await fetch(`http://localhost:${port}/api/healthz`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (res.ok) {
      healthzFailures = 0;
      return;
    }

    healthzFailures++;
    console.warn(`[SelfRepair] /healthz ${res.status} — strike ${healthzFailures}/3`);
  } catch {
    healthzFailures++;
    console.warn(`[SelfRepair] /healthz unreachable — strike ${healthzFailures}/3`);
  }

  if (healthzFailures >= 3) {
    console.error("[SelfRepair] 🔴 /healthz failed 3 checks in a row — restarting");
    await logError("self_repair", "healthz endpoint failed 3 consecutive checks — auto-restart triggered", "self-repair engine");
    await notifyGarry(
      "🔧 Emergency restart — healthz down",
      "My health endpoint failed 3 consecutive checks. I triggered an automatic restart. If you're reading this, the restart worked.",
      "repair",
      "urgent",
    );
    healthzFailures = 0;
    setTimeout(() => process.exit(0), 1_200);
  }
}

// ── Step 4: Check SSL certificate expiry ─────────────────────────────────────
async function checkSslExpiry(): Promise<void> {
  const { checkSslCertificateDays } = await import("./health-monitor.js");
  try {
    const daysLeft = await checkSslCertificateDays();
    if (daysLeft === null) return; // couldn't check

    if (daysLeft <= 7) {
      // Notify every run when critical
      console.error(`[SelfRepair] 🔴 SSL cert expires in ${daysLeft} days — URGENT`);
      await notifyGarry(
        `🚨 SSL cert expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — RENEW NOW`,
        `The SSL certificate for sirius-ai.live expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. This needs to be renewed immediately or the site will show security warnings and go offline.`,
        "alert",
        "urgent",
      );
    } else if (daysLeft <= 30) {
      // Notify once per day maximum
      const now = new Date();
      if (!sslNotifiedAt || (now.getTime() - sslNotifiedAt.getTime()) > 86_400_000) {
        sslNotifiedAt = now;
        console.warn(`[SelfRepair] ⚠️ SSL cert expires in ${daysLeft} days`);
        await notifyGarry(
          `⚠️ SSL cert expires in ${daysLeft} days`,
          `Just a heads-up: the SSL certificate for sirius-ai.live expires in ${daysLeft} days. Worth renewing soon so it doesn't slip.`,
          "reminder",
          "medium",
        );
      }
    }
  } catch (e: any) {
    if (!e.message?.includes("not exported")) {
      console.error("[SelfRepair] SSL check error:", e.message);
    }
  }
}

// ── Main tick ─────────────────────────────────────────────────────────────────
export async function runSelfRepair(): Promise<void> {
  try {
    await Promise.allSettled([
      watchPm2Logs(),
      checkChatApi(),
      checkHealthz(),
      checkSslExpiry(),
    ]);
  } catch (e: any) {
    console.error("[SelfRepair] Engine tick error:", e.message);
  }
}

// ── Start the engine ──────────────────────────────────────────────────────────
export function startSelfRepairEngine(intervalMinutes = 5): void {
  console.log(`[SelfRepair] Autonomous self-repair engine online — checking every ${intervalMinutes} min`);
  // First run 45 seconds after boot so other systems are settled
  setTimeout(() => runSelfRepair().catch(console.error), 45_000);
  setInterval(() => runSelfRepair().catch(console.error), intervalMinutes * 60 * 1_000);
}
