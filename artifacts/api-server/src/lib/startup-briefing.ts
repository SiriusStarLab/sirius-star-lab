/**
 * Sirius Startup Briefing — Full Context Load
 *
 * Reads EVERYTHING in parallel before Sirius starts a conversation:
 * - Profile memories + business context
 * - Deep memory layer (mnemosyne_memories — identity, values, patterns)
 * - Session history (mnemosyne_sessions — what happened in recent sessions)
 * - Core knowledge (changelog, key facts)
 * - Recent lab project conversations
 * - Ideas captured (dream_lab_ideas)
 * - Recent daily briefings (sirius_briefings)
 * - Custom tools, automations, config
 * - PM2 server health (all processes)
 * - C3 Docker container (sirius-intelligence + redis)
 *
 * Cached per-user for 5 minutes. Call invalidateBriefingCache() after memory writes.
 */

import { db, userProfilesTable, siriusCustomTools, siriusAutomations, siriusErrors, siriusConfig } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { built: number; content: string }>();

export async function buildStartupBriefing(userId: string): Promise<string> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.built < CACHE_TTL) return hit.content;

  const now = new Date();

  const [
    profileResult,
    deepMemoryResult,
    sessionHistoryResult,
    coreMemResult,
    recentChatsResult,
    ideasResult,
    briefingsResult,
    toolsResult,
    automationsResult,
    errorsResult,
    configResult,
    pm2Result,
    dockerResult,
  ] = await Promise.allSettled([

    // 1. User profile — canonical memories + business context
    db.select({
      memories:       userProfilesTable.memories,
      businessName:   userProfilesTable.businessName,
      businessSector: userProfilesTable.businessSector,
      businessGoals:  userProfilesTable.businessGoals,
      keyClients:     userProfilesTable.keyClients,
    }).from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1),

    // 2. Deep memory layer — identity, values, vision, patterns (mnemosyne_memories)
    db.execute(sql`
      SELECT layer, category, content, emotional_weight, confidence, pattern_tags
      FROM mnemosyne_memories
      ORDER BY emotional_weight DESC, confidence DESC
    `),

    // 3. Session history — what happened in past sessions (mnemosyne_sessions)
    db.execute(sql`
      SELECT session_date, key_themes, decisions_made, things_built, emotional_tone, progress_made
      FROM mnemosyne_sessions
      ORDER BY session_date DESC
      LIMIT 30
    `),

    // 4. Core knowledge — changelog, key facts
    db.execute(sql`
      SELECT category, LEFT(content, 1200) AS content, importance
      FROM core_memories
      ORDER BY importance DESC
      LIMIT 5
    `),

    // 5. Recent lab project conversations — last 3 from 5 most active projects
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
          lp.name AS project_name,
          lm.created_at,
          ROW_NUMBER() OVER (PARTITION BY lm.project_id ORDER BY lm.created_at DESC) AS rn
        FROM lab_messages lm
        JOIN lab_projects lp    ON lp.id = lm.project_id
        JOIN recent_projects rp ON rp.project_id = lm.project_id
      )
      SELECT project_name, role, content, created_at
      FROM ranked WHERE rn <= 3
      ORDER BY project_name, created_at ASC
    `),

    // 6. Ideas captured (dream_lab_ideas)
    db.execute(sql`
      SELECT title, description, category, status, created_at
      FROM dream_lab_ideas
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `),

    // 7. Recent daily briefings (sirius_briefings)
    db.execute(sql`
      SELECT briefing_date, LEFT(content, 800) AS content
      FROM sirius_briefings
      WHERE user_id = ${userId}
      ORDER BY briefing_date DESC
      LIMIT 3
    `),

    // 8. Custom tools
    db.select({
      name:        siriusCustomTools.name,
      description: siriusCustomTools.description,
    }).from(siriusCustomTools).orderBy(desc(siriusCustomTools.createdAt)).limit(30),

    // 9. Automations
    db.select({
      name:      siriusAutomations.name,
      enabled:   siriusAutomations.enabled,
      lastRunAt: siriusAutomations.lastRunAt,
    }).from(siriusAutomations).limit(20),

    // 10. Unresolved errors (last 5)
    db.select({
      toolName:     siriusErrors.toolName,
      errorMessage: siriusErrors.errorMessage,
      occurredAt:   siriusErrors.occurredAt,
    }).from(siriusErrors)
      .where(eq(siriusErrors.resolved, false))
      .orderBy(desc(siriusErrors.occurredAt))
      .limit(5),

    // 11. Config
    db.select({ key: siriusConfig.key, value: siriusConfig.value }).from(siriusConfig),

    // 12. PM2 server health
    execAsync("pm2 jlist 2>/dev/null", { timeout: 6000 }),

    // 13. Docker — C3 (sirius-intelligence) + redis
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

  // ── 1. MEMORIES & BUSINESS CONTEXT ──────────────────────────
  lines.push(`## 🧠 MEMORIES & BUSINESS CONTEXT`);
  if (profileResult.status === "fulfilled" && profileResult.value[0]) {
    const p = profileResult.value[0];
    if (p.businessName)   lines.push(`Business: ${p.businessName}`);
    if (p.businessSector) lines.push(`Sector: ${p.businessSector}`);
    if (p.businessGoals)  lines.push(`Goals: ${p.businessGoals}`);
    if (p.keyClients)     lines.push(`Key clients/targets: ${p.keyClients}`);
    if (p.memories) {
      lines.push(`\nSaved memories:`);
      lines.push(p.memories.slice(0, 3000));
      if (p.memories.length > 3000) lines.push(`[...${p.memories.length - 3000} more chars — use query_database to read the rest]`);
    } else {
      lines.push(`No memories saved yet.`);
    }
  } else {
    lines.push(`Could not load profile.`);
  }
  lines.push(``);

  // ── 2. DEEP MEMORY LAYER (Mnemosyne Intelligence) ───────────
  if (deepMemoryResult.status === "fulfilled") {
    const rows = ((deepMemoryResult.value as any).rows ?? deepMemoryResult.value) as any[];
    if (rows.length > 0) {
      lines.push(`## 🔮 DEEP MEMORY — WHO GARRY IS (${rows.length} entries)`);
      lines.push(`These facts were observed across sessions. They define how to work with Garry.`);
      for (const r of rows) {
        const tags = Array.isArray(r.pattern_tags) ? r.pattern_tags.join(", ") : String(r.pattern_tags || "");
        lines.push(`[${r.layer}/${r.category} | weight:${r.emotional_weight} confidence:${r.confidence}]`);
        lines.push(`  ${r.content}`);
        if (tags) lines.push(`  Tags: ${tags}`);
      }
      lines.push(``);
    }
  }

  // ── 3. SESSION HISTORY ───────────────────────────────────────
  if (sessionHistoryResult.status === "fulfilled") {
    const rows = ((sessionHistoryResult.value as any).rows ?? sessionHistoryResult.value) as any[];
    if (rows.length > 0) {
      lines.push(`## 📓 SESSION HISTORY (last ${rows.length} sessions)`);
      for (const r of rows) {
        const date = r.session_date ? String(r.session_date).split("T")[0] : "unknown date";
        lines.push(`\n${date} | tone: ${r.emotional_tone}`);
        lines.push(`  Themes: ${r.key_themes}`);
        if (r.things_built && r.things_built !== "None") lines.push(`  Built: ${r.things_built}`);
        if (r.decisions_made && r.decisions_made !== "None") lines.push(`  Decided: ${r.decisions_made}`);
        if (r.progress_made) lines.push(`  Progress: ${r.progress_made}`);
      }
      lines.push(``);
    } else {
      lines.push(`## 📓 SESSION HISTORY\n  No session summaries yet — they'll build up from this conversation onward.\n`);
    }
  }

  // ── 4. CORE KNOWLEDGE ───────────────────────────────────────
  if (coreMemResult.status === "fulfilled") {
    const rows = ((coreMemResult.value as any).rows ?? coreMemResult.value) as any[];
    if (rows.length > 0) {
      lines.push(`## 📚 CORE KNOWLEDGE`);
      for (const row of rows) {
        lines.push(`[${row.category}]`);
        lines.push(String(row.content).replace(/\n{3,}/g, "\n\n"));
      }
      lines.push(``);
    }
  }

  // ── 5. RECENT LAB PROJECT CONVERSATIONS ─────────────────────
  lines.push(`## 💬 RECENT LAB PROJECT CONVERSATIONS`);
  if (recentChatsResult.status === "fulfilled") {
    const rows = ((recentChatsResult.value as any).rows ?? recentChatsResult.value) as any[];
    if (rows.length === 0) {
      lines.push(`  No lab project messages yet.`);
    } else {
      let lastProject = "";
      for (const row of rows) {
        if (row.project_name !== lastProject) {
          lines.push(`\n  Project: ${row.project_name}`);
          lastProject = row.project_name;
        }
        const speaker = row.role === "user" ? "Garry" : "Sirius";
        lines.push(`    ${speaker}: ${row.content}`);
      }
    }
  } else {
    lines.push(`  Could not load.`);
  }
  lines.push(``);

  // ── 6. IDEAS CAPTURED ───────────────────────────────────────
  if (ideasResult.status === "fulfilled") {
    const rows = ((ideasResult.value as any).rows ?? ideasResult.value) as any[];
    if (rows.length > 0) {
      lines.push(`## 💡 IDEAS CAPTURED (${rows.length})`);
      for (const r of rows) {
        const date = r.created_at ? String(r.created_at).split("T")[0] : "";
        lines.push(`  • [${r.status}] ${r.title} ${date ? `(${date})` : ""}`);
        if (r.description && r.description !== r.title) lines.push(`    ${String(r.description).slice(0, 200)}`);
      }
      lines.push(``);
    }
  }

  // ── 7. RECENT DAILY BRIEFINGS ────────────────────────────────
  if (briefingsResult.status === "fulfilled") {
    const rows = ((briefingsResult.value as any).rows ?? briefingsResult.value) as any[];
    if (rows.length > 0) {
      lines.push(`## 📰 RECENT DAILY BRIEFINGS`);
      for (const r of rows) {
        lines.push(`\n[${r.briefing_date}]`);
        lines.push(String(r.content));
      }
      lines.push(``);
    }
  }

  // ── 8. CUSTOM TOOLS ─────────────────────────────────────────
  if (toolsResult.status === "fulfilled") {
    const tools = toolsResult.value;
    lines.push(`## 🔧 CUSTOM TOOLS (${tools.length})`);
    if (tools.length === 0) {
      lines.push(`  None registered yet.`);
    } else {
      for (const t of tools) lines.push(`  • ${t.name}: ${t.description ?? "no description"}`);
    }
  }
  lines.push(``);

  // ── 9. AUTOMATIONS ──────────────────────────────────────────
  if (automationsResult.status === "fulfilled") {
    const auts = automationsResult.value;
    lines.push(`## ⚙️ AUTOMATIONS (${auts.length})`);
    for (const a of auts) {
      const status  = a.enabled ? "✅" : "⏸️";
      const lastRun = a.lastRunAt ? new Date(a.lastRunAt as any).toLocaleDateString("en-GB") : "never";
      lines.push(`  ${status} ${a.name} | last run: ${lastRun}`);
    }
  }
  lines.push(``);

  // ── 10. UNRESOLVED ERRORS ────────────────────────────────────
  if (errorsResult.status === "fulfilled") {
    const errs = errorsResult.value;
    if (errs.length > 0) {
      lines.push(`## ⚠️ UNRESOLVED ERRORS (${errs.length})`);
      for (const e of errs) {
        const when = e.occurredAt ? new Date(e.occurredAt as any).toLocaleString("en-GB") : "";
        lines.push(`  • [${e.toolName}] ${String(e.errorMessage).slice(0, 200)} ${when ? `— ${when}` : ""}`);
      }
    } else {
      lines.push(`## ⚠️ ERRORS\n  None outstanding — all clear.`);
    }
  }
  lines.push(``);

  // ── 11. CONFIG ───────────────────────────────────────────────
  if (configResult.status === "fulfilled") {
    const cfg = configResult.value.filter(c => c.key !== "lab_pin");
    lines.push(`## 🔑 CONFIG`);
    for (const c of cfg) lines.push(`  ${c.key}: ${String(c.value).slice(0, 120)}`);
  }
  lines.push(``);

  // ── 12. SERVER HEALTH (PM2) ─────────────────────────────────
  lines.push(`## 🖥️ SERVER — PM2 PROCESSES`);
  if (pm2Result.status === "fulfilled") {
    try {
      const procs = JSON.parse(pm2Result.value.stdout) as any[];
      for (const proc of procs) {
        const st  = proc.pm2_env?.status === "online" ? "✅" : `❌ ${proc.pm2_env?.status ?? "?"}`;
        const mem = proc.monit?.memory ? `${Math.round(proc.monit.memory / 1024 / 1024)}MB` : "?MB";
        const rst = proc.pm2_env?.restart_time ?? 0;
        const up  = proc.pm2_env?.pm_uptime
          ? `${Math.round((Date.now() - proc.pm2_env.pm_uptime) / 3600000)}h up`
          : "uptime?";
        lines.push(`  ${st} ${proc.name} | ${mem} | ${rst} restarts | ${up}`);
      }
    } catch {
      lines.push(pm2Result.value.stdout.slice(0, 400));
    }
  } else {
    lines.push(`  ❌ PM2 unreachable.`);
  }
  lines.push(``);

  // ── 13. C3 CONTAINER (Docker) ────────────────────────────────
  lines.push(`## 🐳 C3 — DOCKER CONTAINERS`);
  if (dockerResult.status === "fulfilled") {
    const containers = dockerResult.value.stdout.trim().split("\n").filter(Boolean);
    if (containers.length === 0) {
      lines.push(`  ⚠️ No containers running — sirius-intelligence may be down.`);
    } else {
      for (const c of containers) {
        const isC3 = c.includes("sirius-intelligence");
        lines.push(`  ${isC3 ? "🧠 C3:" : "  •"} ${c}`);
      }
    }
  } else {
    lines.push(`  ❌ Docker unreachable.`);
  }
  lines.push(``);
  lines.push(`══════════════════════════════════════════════════════`);
  lines.push(`END OF BRIEFING — fully loaded. Begin session.`);

  const content = lines.join("\n");
  cache.set(userId, { built: Date.now(), content });
  return content;
}

/** Call this after any memory write to force a fresh briefing next session */
export function invalidateBriefingCache(userId: string): void {
  cache.delete(userId);
}
