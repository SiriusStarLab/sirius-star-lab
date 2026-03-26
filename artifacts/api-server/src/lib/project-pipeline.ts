/**
 * Sirius Star Lab — Sequential Project Pipeline
 *
 * Processes ONE project at a time through a strict lifecycle:
 *
 *   queued (launch_status = "")
 *     → building  (App Builder running — one at a time, never in parallel)
 *     → cad-pending  (build done, waiting for CAD drawings to be attached)
 *     → launch-ready (CAD attached — project is surfaced to Garry / Sirius for launch)
 *     → launched  (confirmed launched to market)
 *
 * The pipeline ticks every 3 minutes. If a build is already running it does nothing.
 * Bulk triggering is disabled — the scanner only queues projects; this manages them.
 */

import { eq, isNull, or, and, asc } from "drizzle-orm";
import { db, labProjects, appBuilderSessions, cadFiles } from "@workspace/db";
import { triggerAutoBuildForProject } from "./lab-auto-scan.js";
import { openai } from "@workspace/integrations-openai-ai-server";

const TICK_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

let pipelineRunning = false;
let tickTimer: ReturnType<typeof setTimeout> | null = null;

// ── Public helpers ────────────────────────────────────────────────────────────

/** Called by the CAD upload route when a file is successfully attached. */
export async function onCadFileAttached(projectId: number): Promise<void> {
  const [project] = await db
    .select({ id: labProjects.id, launchStatus: labProjects.launchStatus, name: labProjects.name })
    .from(labProjects)
    .where(eq(labProjects.id, projectId))
    .limit(1);

  if (!project) return;

  if (project.launchStatus === "cad-pending") {
    await db
      .update(labProjects)
      .set({ launchStatus: "launch-ready", updatedAt: new Date() })
      .where(eq(labProjects.id, projectId));

    console.log(`[Pipeline] ✅ "${project.name}" → LAUNCH READY (CAD attached)`);
  }
}

/** Return a live snapshot of the pipeline state. */
export async function getPipelineStatus() {
  const [building] = await db
    .select({ id: labProjects.id, name: labProjects.name })
    .from(labProjects)
    .where(eq(labProjects.launchStatus, "building"))
    .limit(1);

  const [cadPending] = await db
    .select({ count: labProjects.id })
    .from(labProjects)
    .where(eq(labProjects.launchStatus, "cad-pending"))
    .limit(1);

  const queued = await db
    .select({ id: labProjects.id })
    .from(labProjects)
    .where(
      or(
        isNull(labProjects.launchStatus),
        eq(labProjects.launchStatus, ""),
      ),
    );

  const launchReady = await db
    .select({ id: labProjects.id, name: labProjects.name, industry: labProjects.industry, updatedAt: labProjects.updatedAt })
    .from(labProjects)
    .where(eq(labProjects.launchStatus, "launch-ready"))
    .limit(20);

  const launched = await db
    .select({ count: labProjects.id })
    .from(labProjects)
    .where(eq(labProjects.launchStatus, "launched"))
    .limit(1);

  return {
    currentlyBuilding: building ?? null,
    queued: queued.length,
    cadPending: cadPending ? 1 : 0,
    launchReady,
    launched: launched.length,
  };
}

// ── Core tick ─────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (pipelineRunning) {
    console.log("[Pipeline] Tick skipped — build already in progress");
    return;
  }

  try {
    // 1. Is anything currently building? If so, wait.
    const [activelyBuilding] = await db
      .select({ id: labProjects.id, name: labProjects.name })
      .from(labProjects)
      .where(eq(labProjects.launchStatus, "building"))
      .limit(1);

    if (activelyBuilding) {
      console.log(`[Pipeline] Waiting — "${activelyBuilding.name}" is still building`);
      return;
    }

    // 2. Pick the next queued project (oldest first, must have a brief)
    const [next] = await db
      .select()
      .from(labProjects)
      .where(
        and(
          or(isNull(labProjects.launchStatus), eq(labProjects.launchStatus, "")),
        ),
      )
      .orderBy(asc(labProjects.createdAt))
      .limit(1);

    if (!next) {
      console.log("[Pipeline] Queue empty — nothing to build");
      return;
    }

    if (!next.brief || next.brief.trim().length < 20) {
      console.log(`[Pipeline] Skipping "${next.name}" — no brief content`);
      await db
        .update(labProjects)
        .set({ launchStatus: "cad-pending", updatedAt: new Date() })
        .where(eq(labProjects.id, next.id));
      return;
    }

    // 3. Mark it as building
    await db
      .update(labProjects)
      .set({ launchStatus: "building", updatedAt: new Date() })
      .where(eq(labProjects.id, next.id));

    pipelineRunning = true;
    console.log(`[Pipeline] ▶ Starting build for "${next.name}" (project #${next.id})`);

    // 4. Run the App Builder (this takes several minutes — runs to completion)
    await triggerAutoBuildForProject(next.id, next.name, next.brief || "", next.industry || "General");

    // 5. After build, auto-generate technical drawing notes if not already present
    if (!next.drawingNotes || next.drawingNotes.trim().length < 10) {
      try {
        const drawingRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `You are a technical product designer. Write concise CAD/technical drawing specifications for this product so a CAD engineer can produce technical drawings.

Product: "${next.name}"
Industry: ${next.industry}
Description: "${(next.brief || "").slice(0, 600)}"

Produce clear, numbered drawing requirements (dimensions, views, materials, tolerances, assembly notes). Keep it under 300 words.`,
          }],
          max_tokens: 400,
        });
        const drawingNotes = drawingRes.choices[0]?.message?.content || "";
        if (drawingNotes) {
          await db
            .update(labProjects)
            .set({ drawingNotes, updatedAt: new Date() })
            .where(eq(labProjects.id, next.id));
          console.log(`[Pipeline] ✓ Drawing notes generated for "${next.name}"`);
        }
      } catch (err: any) {
        console.error(`[Pipeline] Drawing notes failed for "${next.name}":`, err?.message);
      }
    }

    // 6. Check if CAD files already exist for this project
    const existingCad = await db
      .select({ id: cadFiles.id })
      .from(cadFiles)
      .where(eq(cadFiles.projectId, next.id))
      .limit(1);

    const nextStatus = existingCad.length > 0 ? "launch-ready" : "cad-pending";

    await db
      .update(labProjects)
      .set({ launchStatus: nextStatus, updatedAt: new Date() })
      .where(eq(labProjects.id, next.id));

    console.log(`[Pipeline] ✅ "${next.name}" → ${nextStatus.toUpperCase()}`);

  } catch (err: any) {
    console.error("[Pipeline] Tick error:", err?.message);
  } finally {
    pipelineRunning = false;
  }
}

// ── Start / stop ──────────────────────────────────────────────────────────────

export function startProjectPipeline(): void {
  if (tickTimer) return; // already running

  console.log("[Pipeline] Started — processing one project every 3 minutes");

  const schedule = () => {
    tickTimer = setTimeout(async () => {
      await tick();
      schedule();
    }, TICK_INTERVAL_MS);
  };

  // First tick after 10 seconds (let the server warm up)
  setTimeout(async () => {
    await tick();
    schedule();
  }, 10_000);
}

export function stopProjectPipeline(): void {
  if (tickTimer) {
    clearTimeout(tickTimer);
    tickTimer = null;
  }
}
