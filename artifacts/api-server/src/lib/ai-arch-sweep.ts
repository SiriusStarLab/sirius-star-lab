/**
 * Sirius Star Lab — AI Architecture Daily Sweep
 *
 * Runs every 24 hours (offset from the main auto-scan).
 * For every non-rejected project it:
 *   1. Classifies whether the project needs app/software development to reach market
 *   2. Generates a full technical analysis (tech stack, build roadmap, market readiness)
 *   3. Identifies the single highest-impact next action to accelerate market entry
 *   4. Stores results in aiArchLinked + aiArchInsights + aiArchSweepAt
 *
 * Only projects with a brief (>50 chars) are analysed — stub entries are skipped.
 * Processes in batches of 4 concurrent requests. Max 60 projects per sweep cycle
 * (to stay within rate limits); oldest-unswept projects are prioritised.
 */

import { and, asc, desc, eq, inArray, isNull, ne, not, or, sql } from "drizzle-orm";
import { db, labProjects } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

export type AiArchInsights = {
  needsAppDev: boolean;
  techStack: string[];
  buildRoadmap: { step: number; title: string; detail: string }[];
  marketReadinessScore: number;           // 1–10
  missingElements: string[];
  nextAction: string;                     // single highest-impact next step
  estimatedBuildWeeks: number | null;
  architectureNotes: string;
  sweptAt: string;
};

const BATCH = 4;
const MAX_PER_SWEEP = 60;

const SYSTEM_PROMPT = `You are Sirius, an elite AI product architect for Sirius Star Lab — the R&D command centre for Strategic Innovation Dundee Ltd, a precision engineering company operating across oil & gas, aerospace, medical, and hydrogen sectors.

Your task: analyse each project and determine whether it needs custom software / an app / a digital platform to successfully reach market, and if so, produce a precise technical build plan.

Respond ONLY with valid JSON. No markdown fences, no extra text.`;

const USER_PROMPT = (p: { name: string; industry: string; brief: string; specs?: string; phase: string }) => `
Analyse this R&D project:

PROJECT NAME: ${p.name}
INDUSTRY: ${p.industry}
PHASE: ${p.phase}
BRIEF: ${p.brief.slice(0, 1500)}
SPECS: ${(p.specs || "").slice(0, 500)}

Return ONLY this JSON structure (no markdown):
{
  "needsAppDev": true | false,
  "techStack": ["React", "Node.js", "PostgreSQL", ...] or [],
  "buildRoadmap": [
    { "step": 1, "title": "...", "detail": "..." },
    ...up to 5 steps...
  ],
  "marketReadinessScore": 1-10,
  "missingElements": ["what is missing to get to market", ...],
  "nextAction": "Single most important next step to accelerate market entry (1 sentence, specific and actionable)",
  "estimatedBuildWeeks": number or null,
  "architectureNotes": "2-3 sentences on the architecture approach, integration requirements, and key technical risks"
}

Rules:
- needsAppDev: true if the product IS software, needs a companion app, needs a web platform, needs a dashboard, or needs digital tools to operate/sell
- needsAppDev: false for purely physical products that need no digital component
- Be precise and specific to this exact project — no generic advice
- marketReadinessScore: 1 = concept only, 10 = ready to ship`;

export async function analyseProject(p: {
  id: number; name: string; industry: string; brief: string;
  specs: string; phase: string;
}): Promise<AiArchInsights | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(p) },
      ],
      temperature: 0.3,
      max_tokens: 900,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const insights: AiArchInsights = JSON.parse(raw);
    insights.sweptAt = new Date().toISOString();
    return insights;
  } catch (err: any) {
    console.error(`[AI-Arch Sweep] Failed to analyse project #${p.id} (${p.name}):`, err.message);
    return null;
  }
}

async function processBatch(batch: typeof projects): Promise<void> {
  await Promise.all(
    batch.map(async (p) => {
      const insights = await analyseProject({
        id: p.id,
        name: p.name,
        industry: p.industry,
        brief: p.brief ?? "",
        specs: p.specs ?? "",
        phase: p.phase,
      });

      if (!insights) {
        await db.update(labProjects).set({
          aiArchLinked: "error",
          aiArchSweepAt: new Date(),
        }).where(eq(labProjects.id, p.id));
        return;
      }

      await db.update(labProjects).set({
        aiArchLinked: insights.needsAppDev ? "linked" : "not-applicable",
        aiArchInsights: JSON.stringify(insights),
        aiArchSweepAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(labProjects.id, p.id));

      console.log(
        `[AI-Arch Sweep] #${p.id} "${p.name}" → ${insights.needsAppDev ? "LINKED" : "not-applicable"} · readiness ${insights.marketReadinessScore}/10`
      );
    })
  );
}

// ── State ──────────────────────────────────────────────────────────────────────

let sweepInterval: NodeJS.Timeout | null = null;
let isSweeping = false;
let lastSweepAt: Date | null = null;
let lastSweepStats: { analysed: number; linked: number; skipped: number } = { analysed: 0, linked: 0, skipped: 0 };

// We need a reference at module scope so processBatch can close over it.
// Initialised as empty — populated inside runAiArchSweep before use.
let projects: Array<{
  id: number; name: string; industry: string;
  brief: string | null; specs: string | null; phase: string;
}> = [];

// ── Main sweep ─────────────────────────────────────────────────────────────────

export async function runAiArchSweep(): Promise<{ analysed: number; linked: number; skipped: number }> {
  console.log("[AI-Arch Sweep] ════ Starting daily AI Architecture sweep ════");

  // Fetch projects ordered by: never swept first, then oldest sweep
  // Exclude rejected projects and stubs with no brief
  const rows = await db
    .select({
      id: labProjects.id,
      name: labProjects.name,
      industry: labProjects.industry,
      brief: labProjects.brief,
      specs: labProjects.specs,
      phase: labProjects.phase,
      aiArchLinked: labProjects.aiArchLinked,
      aiArchSweepAt: labProjects.aiArchSweepAt,
    })
    .from(labProjects)
    .where(
      and(
        ne(labProjects.approvalStatus, "rejected"),
        ne(labProjects.status, "archived"),
        sql`length(coalesce(${labProjects.brief}, '')) > 50`
      )
    )
    .orderBy(
      sql`${labProjects.aiArchSweepAt} IS NOT NULL`,   // NULLs first
      asc(labProjects.aiArchSweepAt)
    )
    .limit(MAX_PER_SWEEP);

  projects = rows;

  const toProcess = rows.filter(r => r.aiArchLinked !== "pending");
  const skipped = rows.length - toProcess.length;

  console.log(`[AI-Arch Sweep] ${rows.length} eligible projects found — processing ${toProcess.length}, skipping ${skipped} already pending`);

  let linked = 0;

  // Mark all as pending before processing
  if (toProcess.length > 0) {
    for (const p of toProcess) {
      await db.update(labProjects).set({ aiArchLinked: "pending", aiArchSweepAt: new Date() })
        .where(eq(labProjects.id, p.id));
    }

    // Process in batches
    for (let i = 0; i < toProcess.length; i += BATCH) {
      const batch = toProcess.slice(i, i + BATCH);
      await processBatch(batch);
    }

    // Count linked
    const results = await db
      .select({ id: labProjects.id, aiArchLinked: labProjects.aiArchLinked })
      .from(labProjects)
      .where(inArray(labProjects.id, toProcess.map(p => p.id)));
    linked = results.filter(r => r.aiArchLinked === "linked").length;
  }

  lastSweepAt = new Date();
  lastSweepStats = { analysed: toProcess.length, linked, skipped };

  console.log(`[AI-Arch Sweep] ════ Sweep complete — ${toProcess.length} analysed, ${linked} linked to AI Architecture ════`);
  return lastSweepStats;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export function startAiArchSweep(intervalHours = 24) {
  if (sweepInterval) return;

  const run = async () => {
    if (isSweeping) return;
    isSweeping = true;
    try {
      const stats = await runAiArchSweep();
      lastSweepStats = stats;
    } catch (err) {
      console.error("[AI-Arch Sweep] Scheduled sweep error:", err);
    }
    isSweeping = false;
  };

  // Delay initial run by 3 minutes to let other startup scans settle
  setTimeout(run, 3 * 60 * 1000);
  sweepInterval = setInterval(run, intervalHours * 60 * 60 * 1000);
  console.log(`[AI-Arch Sweep] Autonomous AI Architecture sweep started — running every ${intervalHours} hours`);
}

export function stopAiArchSweep() {
  if (sweepInterval) { clearInterval(sweepInterval); sweepInterval = null; }
}

export function getAiArchSweepStatus() {
  return {
    isRunning: isSweeping,
    lastSweepAt: lastSweepAt?.toISOString() ?? null,
    ...lastSweepStats,
  };
}
