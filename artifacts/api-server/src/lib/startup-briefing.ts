/**
 * Sirius Startup Briefing
 *
 * Builds a comprehensive context briefing at the start of every conversation.
 * Reads in parallel: memories, core knowledge, recent lab chats, custom tools,
 * automations, errors, config, PM2 server health, and the C3 Docker container.
 *
 * Cached per-user for 5 minutes so it doesn't re-run on every message.
 * Call invalidateBriefingCache(userId) after save_memory to force a refresh next session.
 */

import { db, userProfilesTable, siriusCustomTools, siriusAutomations, siriusErrors, siriusConfig } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Per-user 5-minute cache — avoids hammering the DB on every message
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { built: number; content: string }>();

export async function buildStartupBriefing(userId: string): Promise<string> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.built < CACHE_TTL) return hit.content;

  const now = new Date();

  const [
    profileResult,
    coreMemResult,
    recentChatsResult,
    toolsResult,
    automationsResult,
    errorsResult,
    configResult,
    pm2Result,
    dockerResult,
  ] = await Promise.allSettled([

    // 1. User profile — memories, business context
    db.select({
      memories:       userProfilesTable.memories,
      businessName:   userProfilesTable.businessName,
      businessSector: userProfilesTable.businessSector,
      businessGoals:  userProfilesTable.businessGoals,
      keyClients:     userProfilesTable.keyClients,
    }).from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1),

    // 2. Core memories — changelog, key facts stored by category
    db.execute(sql`
      SELECT category, LEFT(content, 1500) AS content, importance
      FROM core_memories
      ORDER BY importance DESC
      LIMIT 5
    `),

    // 3. Recent lab project conversations — last 3 messages from 5 most active projects
    db.execute(sql`
      WITH recent_projects AS (
        SELECT project_id
        FROM lab_messages
        GROUP BY project_id
        ORDER BY MAX(created_at) DESC
        LIMIT 5
      ),
      ranked AS (
        SELECT
          lm.role,
          LEFT(lm.content, 350) AS content,
          lp.name                AS project_name,
          lm.created_at,
          ROW_NUMBER() OVER (PARTITION BY lm.project_id ORDER BY lm.created_at DESC) AS rn
        FROM lab_messages lm
        JOIN lab_projects lp      ON lp.id = lm.project_id
        JOIN recent_projects rp   ON rp.project_id = lm.project_id
      )
      SELECT project_name, role, content, created_at
      FROM ranked
      WHERE rn <= 3
      ORDER BY project_name, created_at ASC
    `),

    // 4. Custom tools Sirius has created
    db.select({
      name:        siriusCustomTools.name,
      description: siriusCustomTools.description,
    }).from(siriusCustomTools).orderBy(desc(siriusCustomTools.createdAt)).limit(30),

    // 5. Automations — name, enabled/paused, last run
    db.select({
      name:      siriusAutomations.name,
      enabled:   siriusAutomations.enabled,
      lastRunAt: siriusAutomations.lastRunAt,
    }).from(siriusAutomations).limit(20),

    // 6. Unresolved errors (most recent 5)
    db.select({
      toolName:     siriusErrors.toolName,
      errorMessage: siriusErrors.errorMessage,
      occurredAt:   siriusErrors.occurredAt,
    }).from(siriusErrors)
      .where(eq(siriusErrors.resolved, false))
      .orderBy(desc(siriusErrors.occurredAt))
      .limit(5),

    // 7. All config key-value pairs (lab_pin excluded for security)
    db.select({ key: siriusConfig.key, value: siriusConfig.value }).from(siriusConfig),

    // 8. PM2 process list (JSON)
    execAsync("pm2 jlist 2>/dev/null", { timeout: 6000 }),

    // 9. Docker containers — C3 (sirius-intelligence) + redis
    execAsync("docker ps --format '{{.Names}} | {{.Status}} | {{.Image}}' 2>/dev/null", { timeout: 6000 }),
  ]);

  const lines: string[] = [];

  const stamp = now.toLocaleString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });

  lines.push(`╔══════════════════════════════════════════════════════╗`);
  lines.push(`║            SIRIUS STARTUP BRIEFING                   ║`);
  lines.push(`║  ${stamp.padEnd(52)}║`);
  lines.push(`╚══════════════════════════════════════════════════════╝`);
  lines.push(`Read this entire briefing before responding to Garry.`);
  lines.push(``);

  // ── 1. MEMORIES ─────────────────────────────────────────────
  lines.push(`## 🧠 MEMORIES & BUSINESS CONTEXT`);
  if (profileResult.status === "fulfilled" && profileResult.value[0]) {
    const p = profileResult.value[0];
    if (p.businessName)   lines.push(`Business: ${p.businessName}`);
    if (p.businessSector) lines.push(`Sector: ${p.businessSector}`);
    if (p.businessGoals)  lines.push(`Goals: ${p.businessGoals}`);
    if (p.keyClients)     lines.push(`Key clients/targets: ${p.keyClients}`);
    if (p.memories) {
      lines.push(`\nSaved memories (${p.memories.length} chars total):`);
      lines.push(p.memories.slice(0, 3000));
      if (p.memories.length > 3000) lines.push(`[...${p.memories.length - 3000} chars omitted — use query_database to read the rest]`);
    } else {
      lines.push(`No memories saved yet.`);
    }
  } else {
    lines.push(`Could not load profile — DB error or no profile exists.`);
  }
  lines.push(``);

  // ── 2. CORE KNOWLEDGE ───────────────────────────────────────
  if (coreMemResult.status === "fulfilled") {
    const rows = ((coreMemResult.value as any).rows ?? coreMemResult.value) as any[];
    if (rows.length > 0) {
      lines.push(`## 📚 CORE KNOWLEDGE (${rows.length} entries)`);
      for (const row of rows) {
        lines.push(`[${row.category} | importance: ${row.importance}]`);
        lines.push(String(row.content).replace(/\n{3,}/g, "\n\n"));
      }
      lines.push(``);
    }
  }

  // ── 3. RECENT LAB PROJECT CONVERSATIONS ─────────────────────
  lines.push(`## 💬 RECENT LAB PROJECT CONVERSATIONS`);
  if (recentChatsResult.status === "fulfilled") {
    const rows = ((recentChatsResult.value as any).rows ?? recentChatsResult.value) as any[];
    if (rows.length === 0) {
      lines.push(`No lab project messages found.`);
    } else {
      let lastProject = "";
      for (const row of rows) {
        if (row.project_name !== lastProject) {
          lines.push(`\nProject: ${row.project_name}`);
          lastProject = row.project_name;
        }
        const speaker = row.role === "user" ? "Garry" : "Sirius";
        lines.push(`  ${speaker}: ${row.content}`);
      }
    }
  } else {
    lines.push(`Could not load recent lab conversations.`);
  }
  lines.push(``);

  // ── 4. CUSTOM TOOLS ─────────────────────────────────────────
  if (toolsResult.status === "fulfilled") {
    const tools = toolsResult.value;
    lines.push(`## 🔧 CUSTOM TOOLS (${tools.length})`);
    if (tools.length === 0) {
      lines.push(`  None registered yet. Use create_custom_tool to create them.`);
    } else {
      for (const t of tools) {
        lines.push(`  • ${t.name}: ${t.description ?? "no description"}`);
      }
    }
  }
  lines.push(``);

  // ── 5. AUTOMATIONS ──────────────────────────────────────────
  if (automationsResult.status === "fulfilled") {
    const auts = automationsResult.value;
    lines.push(`## ⚙️ AUTOMATIONS (${auts.length})`);
    for (const a of auts) {
      const status   = a.enabled ? "✅ active" : "⏸️ paused";
      const lastRun  = a.lastRunAt ? new Date(a.lastRunAt as any).toLocaleDateString("en-GB") : "never run";
      lines.push(`  • ${a.name} | ${status} | last run: ${lastRun}`);
    }
  }
  lines.push(``);

  // ── 6. UNRESOLVED ERRORS ────────────────────────────────────
  if (errorsResult.status === "fulfilled") {
    const errs = errorsResult.value;
    lines.push(`## ⚠️ UNRESOLVED ERRORS (${errs.length})`);
    if (errs.length === 0) {
      lines.push(`  None outstanding — all clear.`);
    } else {
      for (const e of errs) {
        const when = e.occurredAt ? new Date(e.occurredAt as any).toLocaleString("en-GB") : "unknown time";
        lines.push(`  • [${e.toolName}] ${String(e.errorMessage).slice(0, 200)} — ${when}`);
      }
    }
  }
  lines.push(``);

  // ── 7. CONFIG ───────────────────────────────────────────────
  if (configResult.status === "fulfilled") {
    const cfg = configResult.value.filter(c => c.key !== "lab_pin"); // never expose PIN
    lines.push(`## 🔑 CONFIG (${cfg.length} values)`);
    for (const c of cfg) {
      lines.push(`  ${c.key}: ${String(c.value).slice(0, 120)}`);
    }
  }
  lines.push(``);

  // ── 8. SERVER HEALTH (PM2) ──────────────────────────────────
  lines.push(`## 🖥️ SERVER HEALTH — PM2 PROCESSES`);
  if (pm2Result.status === "fulfilled") {
    try {
      const procs = JSON.parse(pm2Result.value.stdout) as any[];
      for (const proc of procs) {
        const st  = proc.pm2_env?.status === "online" ? "✅ online" : `❌ ${proc.pm2_env?.status ?? "unknown"}`;
        const mem = proc.monit?.memory ? `${Math.round(proc.monit.memory / 1024 / 1024)}MB` : "?MB";
        const rst = proc.pm2_env?.restart_time ?? 0;
        const up  = proc.pm2_env?.pm_uptime
          ? Math.round((Date.now() - proc.pm2_env.pm_uptime) / 3600000) + "h uptime"
          : "uptime unknown";
        lines.push(`  • ${proc.name}: ${st} | ${mem} RAM | ${rst} restarts | ${up}`);
      }
    } catch {
      lines.push(pm2Result.value.stdout.slice(0, 600));
    }
  } else {
    lines.push(`  ❌ Could not reach PM2.`);
  }
  lines.push(``);

  // ── 9. C3 CONTAINER (Docker) ────────────────────────────────
  lines.push(`## 🐳 C3 CONTAINER — DOCKER SERVICES`);
  if (dockerResult.status === "fulfilled") {
    const containers = dockerResult.value.stdout.trim().split("\n").filter(Boolean);
    if (containers.length === 0) {
      lines.push(`  ⚠️ No Docker containers running — sirius-intelligence may be down.`);
    } else {
      for (const c of containers) {
        const isC3 = c.includes("sirius-intelligence");
        lines.push(`  ${isC3 ? "🧠" : "•"} ${c}${isC3 ? " ← C3 INTELLIGENCE CONTAINER" : ""}`);
      }
    }
  } else {
    lines.push(`  ❌ Could not reach Docker daemon.`);
  }
  lines.push(``);
  lines.push(`══════════════════════════════════════════════════════`);
  lines.push(`END OF BRIEFING — You are fully loaded. Begin your session.`);

  const content = lines.join("\n");
  cache.set(userId, { built: Date.now(), content });
  return content;
}

/** Force a fresh briefing next time — call this after save_memory or any memory write */
export function invalidateBriefingCache(userId: string): void {
  cache.delete(userId);
}
