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
 * Builds chain immediately — as soon as one project finishes, the next starts with no delay.
 * When the queue is empty, a 30-second idle check polls for new projects.
 * Bulk triggering is disabled — the scanner only queues projects; this manages them.
 */

import { eq, isNull, or, and, asc, ne, sql, inArray, desc } from "drizzle-orm";
import { db, labProjects, appBuilderSessions, cadFiles, cadJobs } from "@workspace/db";
import { triggerAutoBuildForProject, isSoftwareBuildable } from "./lab-auto-scan.js";
import { openai } from "@workspace/ai-client";
import { generateAndPostCadDrawing } from "./cad-auto-gen.js";

const ND_BASE_URL = () => (process.env.NEWDIMENSIONS_BASE_URL || "https://new-dimension-cad.replit.app").replace(/\/$/, "");
const ND_API_KEY  = () => process.env.NEWDIMENSIONS_API_KEY || "";

/** Wake New Dimensions and auto-send a physical project to CAD.
 *  Skips silently if there's already a pending/complete CAD job. */
async function autoSendToCad(projectId: number, name: string, industry: string, specs: string, drawingNotes: string): Promise<void> {
  // Skip if already has a CAD job
  const existing = await db.select({ id: cadJobs.id, status: cadJobs.status }).from(cadJobs)
    .where(eq(cadJobs.projectId, projectId)).orderBy(desc(cadJobs.createdAt)).limit(1);
  if (existing.length > 0 && (existing[0].status === "pending" || existing[0].status === "complete")) {
    console.log(`[Pipeline] ↷ CAD job already exists for "${name}" (${existing[0].status}) — skipping auto-send`);
    return;
  }

  const description = [
    `INDUSTRY: ${industry}`,
    specs?.trim()        ? `\n## SPECIFICATIONS\n${specs}`        : "",
    drawingNotes?.trim() ? `\n## DRAWING NOTES\n${drawingNotes}` : "",
  ].filter(Boolean).join("\n");

  const ndBase = ND_BASE_URL();
  const apiKey = ND_API_KEY();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) { headers["Authorization"] = `Bearer ${apiKey}`; headers["X-API-Key"] = apiKey; }

  // Wake New Dimensions (up to 30 s)
  let awake = false;
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(`${ndBase}/api/projects`, { signal: AbortSignal.timeout(8000) });
      if (r.ok || r.status === 400) { awake = true; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 5000));
  }
  if (!awake) { console.warn(`[Pipeline] ⚠ New Dimensions unreachable — skipping auto-send for "${name}"`); return; }

  const ndRes = await fetch(`${ndBase}/api/projects`, {
    method: "POST", headers,
    body: JSON.stringify({ name, description }),
  });
  if (!ndRes.ok) {
    console.warn(`[Pipeline] ⚠ New Dimensions rejected project for "${name}": ${ndRes.status}`);
    return;
  }
  const ndProject = await ndRes.json() as any;
  const ndProjectId = String(ndProject.id ?? ndProject._id ?? "");
  if (!ndProjectId) { console.warn(`[Pipeline] ⚠ New Dimensions returned no ID for "${name}"`); return; }

  await db.insert(cadJobs).values({ projectId, jobId: ndProjectId, status: "pending", specSent: description });
  console.log(`[Pipeline] ✅ Auto-sent "${name}" to New Dimensions (ND project #${ndProjectId})`);

  // Kick off AI drawing generation in the background
  setImmediate(() => {
    generateAndPostCadDrawing(projectId, ndProjectId, name, description).catch(console.error);
  });
}

const IDLE_CHECK_MS = 30 * 1000; // 30 seconds — how often to check when queue is empty

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
    .where(
      and(
        eq(labProjects.launchStatus, "building"),
        ne(labProjects.status, "archived"),
      ),
    )
    .limit(1);

  const cadPendingList = await db
    .select({ id: labProjects.id, name: labProjects.name, industry: labProjects.industry, updatedAt: labProjects.updatedAt })
    .from(labProjects)
    .where(eq(labProjects.launchStatus, "cad-pending"))
    .limit(50);

  const queued = await db
    .select({ id: labProjects.id, name: labProjects.name, industry: labProjects.industry, updatedAt: labProjects.updatedAt })
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
    queuedList: queued,
    cadPending: cadPendingList.length,
    cadPendingList,
    launchReady,
    launched: launched.length,
  };
}

/**
 * Immediately trigger a build for a specific project, bypassing the 3-minute queue.
 * Used by Sirius tools so she can command the pipeline directly.
 */
export async function triggerBuildNow(projectId: number): Promise<{ ok: boolean; message: string }> {
  if (pipelineRunning) {
    return { ok: false, message: "A build is already in progress — project queued and will start next." };
  }

  const [project] = await db
    .select()
    .from(labProjects)
    .where(eq(labProjects.id, projectId))
    .limit(1);

  if (!project) return { ok: false, message: `Project #${projectId} not found.` };
  if (project.launchStatus === "building") return { ok: false, message: `"${project.name}" is already building.` };
  if (project.launchStatus === "cad-pending") return { ok: false, message: `"${project.name}" has already been built — awaiting CAD.` };
  if (project.launchStatus === "launch-ready") return { ok: false, message: `"${project.name}" is already launch-ready.` };
  if (!project.brief || project.brief.trim().length < 20) return { ok: false, message: `"${project.name}" has no brief — cannot build.` };

  // Mark as building and fire immediately (non-blocking)
  await db.update(labProjects).set({ launchStatus: "building", updatedAt: new Date() }).where(eq(labProjects.id, projectId));
  pipelineRunning = true;

  console.log(`[Pipeline] ▶ IMMEDIATE build triggered by Sirius for "${project.name}" (#${projectId})`);

  // Run async — don't await so the tool response returns quickly
  (async () => {
    try {
      await triggerAutoBuildForProject(projectId, project.name, project.brief || "", project.industry || "General");

      // Auto drawing notes
      try {
        const drawingRes = await (await import("@workspace/ai-client")).openai.chat.completions.create({
          model: "anthropic/claude-haiku-4.5",
          messages: [{ role: "user", content: `Write concise CAD drawing specs for "${project.name}" (${project.industry}): ${(project.brief || "").slice(0, 400)}. Under 200 words, numbered.` }],
          max_tokens: 300,
        });
        const notes = drawingRes.choices[0]?.message?.content || "";
        if (notes) await db.update(labProjects).set({ drawingNotes: notes, updatedAt: new Date() }).where(eq(labProjects.id, projectId));
      } catch { /* non-critical */ }

      // Drawing notes (generated above or already present) = drawing package complete → launch-ready
      const freshProject = await db.select({ drawingNotes: labProjects.drawingNotes }).from(labProjects).where(eq(labProjects.id, projectId)).limit(1).then(r => r[0]);
      const hasNotes = !!(freshProject?.drawingNotes?.trim());
      const existingCad = await db.select({ id: cadFiles.id }).from(cadFiles).where(eq(cadFiles.projectId, projectId)).limit(1);
      const nextStatus = (existingCad.length > 0 || hasNotes) ? "launch-ready" : "cad-pending";
      await db.update(labProjects).set({ launchStatus: nextStatus, updatedAt: new Date() }).where(eq(labProjects.id, projectId));
      console.log(`[Pipeline] ✅ "${project.name}" → ${nextStatus.toUpperCase()} (Sirius-triggered)`);
    } catch (err: any) {
      console.error(`[Pipeline] Sirius-triggered build failed for "${project.name}":`, err?.message);
      await db.update(labProjects).set({ launchStatus: "", updatedAt: new Date() }).where(eq(labProjects.id, projectId));
    } finally {
      pipelineRunning = false;
    }
  })();

  return { ok: true, message: `Build started for "${project.name}". The pipeline is now running — check pipeline status for live updates.` };
}

// ── Core tick ─────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (pipelineRunning) {
    console.log("[Pipeline] Tick skipped — build already in progress");
    return;
  }

  let builtOne = false;

  try {
    // 0a. Archived-while-building guard — if a project was archived while its build was
    //     in progress, the investment-rule sets launchStatus='' now, but older records
    //     may still be stuck as "building". Set them to "cad-pending" so they're
    //     marked as processed and the pipeline can move on to the next active project.
    const archivedBuilding = await db
      .update(labProjects)
      .set({ launchStatus: "cad-pending", updatedAt: new Date() })
      .where(
        and(
          eq(labProjects.launchStatus, "building"),
          eq(labProjects.status, "archived"),
        ),
      )
      .returning({ id: labProjects.id, name: labProjects.name });
    if (archivedBuilding.length > 0) {
      for (const p of archivedBuilding) {
        console.log(`[Pipeline] ⚠ Cleared archived-while-building: "${p.name}" → cad-pending (was blocking queue)`);
      }
    }

    // 0b. Staleness guard — if an active project has been stuck in "building" for >45 min
    //     (e.g. server crashed mid-build), reset it so the pipeline can continue.
    const staleReset = await db
      .update(labProjects)
      .set({ launchStatus: "cad-pending", updatedAt: new Date() })
      .where(
        and(
          eq(labProjects.launchStatus, "building"),
          ne(labProjects.status, "archived"),
          sql`${labProjects.updatedAt} < NOW() - INTERVAL '45 minutes'`,
        ),
      )
      .returning({ id: labProjects.id, name: labProjects.name });
    if (staleReset.length > 0) {
      for (const p of staleReset) {
        console.log(`[Pipeline] ⚠ Reset stale build: "${p.name}" → cad-pending (was stuck >45 min)`);
      }
    }

    // 1. Is anything currently building? (Only count non-archived projects.) If so, wait.
    const [activelyBuilding] = await db
      .select({ id: labProjects.id, name: labProjects.name })
      .from(labProjects)
      .where(
        and(
          eq(labProjects.launchStatus, "building"),
          ne(labProjects.status, "archived"),
        ),
      )
      .limit(1);

    if (activelyBuilding) {
      console.log(`[Pipeline] Waiting — "${activelyBuilding.name}" is still building`);
      return;
    }

    // 2. Pick the next queued project (oldest first, must have a brief, must be active/not archived)
    const [next] = await db
      .select()
      .from(labProjects)
      .where(
        and(
          or(isNull(labProjects.launchStatus), eq(labProjects.launchStatus, "")),
          ne(labProjects.status, "archived"),
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
          model: "anthropic/claude-haiku-4.5",
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

    // 6. Determine next status:
    //    - Software/digital products go straight to launch-ready
    //    - Physical products: auto-send to New Dimensions then go to cad-pending
    //    NOTE: re-fetch drawing notes from DB — step 5 may have just written them
    const isDigital = isSoftwareBuildable(next.name, next.brief || "");
    let nextStatus: string;
    if (isDigital) {
      nextStatus = "launch-ready";
    } else {
      const [freshRow] = await db
        .select({ drawingNotes: labProjects.drawingNotes, specs: labProjects.specs })
        .from(labProjects)
        .where(eq(labProjects.id, next.id))
        .limit(1);
      const hasDrawingNotes = !!(freshRow?.drawingNotes?.trim());
      const existingCad = await db
        .select({ id: cadFiles.id })
        .from(cadFiles)
        .where(eq(cadFiles.projectId, next.id))
        .limit(1);

      // Auto-send to New Dimensions if we have drawing notes and no CAD file yet
      if (hasDrawingNotes && existingCad.length === 0) {
        console.log(`[Pipeline] 🔷 Auto-sending "${next.name}" to New Dimensions…`);
        autoSendToCad(
          next.id,
          next.name,
          next.industry || "General",
          freshRow?.specs || "",
          freshRow?.drawingNotes || "",
        ).catch(err => console.error(`[Pipeline] autoSendToCad error for "${next.name}":`, err?.message));
      }

      nextStatus = (existingCad.length > 0 || hasDrawingNotes) ? "cad-pending" : "cad-pending";
    }

    await db
      .update(labProjects)
      .set({ launchStatus: nextStatus, updatedAt: new Date() })
      .where(eq(labProjects.id, next.id));

    console.log(`[Pipeline] ✅ "${next.name}" → ${nextStatus.toUpperCase()}`);

    // Flag so we chain immediately into the next build
    builtOne = true;

  } catch (err: any) {
    console.error("[Pipeline] Tick error:", err?.message);
  } finally {
    pipelineRunning = false;
  }

  // No pause between projects — chain immediately to the next queued item
  if (builtOne) {
    setImmediate(() => tick());
  }
}

// ── One-time migration: unblock cad-pending projects that have drawing notes ──

export async function advanceCadPendingWithNotes(): Promise<void> {
  try {
    const stuck = await db
      .select({ id: labProjects.id, name: labProjects.name, drawingNotes: labProjects.drawingNotes, brief: labProjects.brief })
      .from(labProjects)
      .where(
        and(
          eq(labProjects.launchStatus, "cad-pending"),
          ne(labProjects.status, "archived"),
        )
      );

    // Advance projects that have drawing notes (proper completion)
    const withNotes = stuck.filter(p => p.drawingNotes && p.drawingNotes.trim().length > 20);
    // Also advance projects that have a brief but failed to generate drawing notes
    // (they've been through the pipeline — AI failure shouldn't leave them stuck forever)
    const withBriefOnly = stuck.filter(p =>
      !(p.drawingNotes && p.drawingNotes.trim().length > 20) &&
      p.brief && p.brief.trim().length > 20
    );

    const total = withNotes.length + withBriefOnly.length;
    if (total === 0) return;

    if (withNotes.length > 0) {
      const ids = withNotes.map(p => p.id);
      await db
        .update(labProjects)
        .set({ launchStatus: "launch-ready", updatedAt: new Date() })
        .where(
          and(
            eq(labProjects.launchStatus, "cad-pending"),
            ne(labProjects.status, "archived"),
            inArray(labProjects.id, ids),
          )
        );
      console.log(`[Pipeline] ✅ Migration: advanced ${withNotes.length} cad-pending → launch-ready (drawing notes present)`);
    }

    if (withBriefOnly.length > 0) {
      const ids = withBriefOnly.map(p => p.id);
      await db
        .update(labProjects)
        .set({ launchStatus: "launch-ready", updatedAt: new Date() })
        .where(
          and(
            eq(labProjects.launchStatus, "cad-pending"),
            ne(labProjects.status, "archived"),
            inArray(labProjects.id, ids),
          )
        );
      console.log(`[Pipeline] ✅ Migration: advanced ${withBriefOnly.length} cad-pending → launch-ready (brief present, build was attempted)`);
    }
  } catch (err: any) {
    console.error("[Pipeline] Migration advanceCadPendingWithNotes failed:", err?.message);
  }
}

// ── Start / stop ──────────────────────────────────────────────────────────────

export function startProjectPipeline(): void {
  if (tickTimer) return; // already running

  console.log("[Pipeline] Started — builds chain immediately; idle check every 30 seconds");

  const schedule = () => {
    tickTimer = setTimeout(async () => {
      await tick();
      schedule();
    }, IDLE_CHECK_MS);
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
