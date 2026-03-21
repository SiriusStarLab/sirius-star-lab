import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, aiDiscoveries, aiSweepLog } from "@workspace/db";
import { runIntelligenceSweep, isSweepRunning } from "./intelligence-sweep.js";

const router: IRouter = Router();

const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

function authMiddleware(req: Request, res: Response, next: () => void) {
  const pin = req.headers["x-lab-pin"] as string;
  if (pin !== LAB_PIN) { res.status(401).json({ error: "Unauthorised" }); return; }
  next();
}

function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

// GET /api/feed/discoveries — get all discoveries, newest first
router.get("/feed/discoveries", authMiddleware, async (req: Request, res: Response) => {
  const { category, unread, saved, limit = "50" } = req.query as Record<string, string>;

  let query = db.select().from(aiDiscoveries);
  const conditions: any[] = [];

  if (category && category !== "all") conditions.push(eq(aiDiscoveries.category, category));
  if (unread === "true") conditions.push(eq(aiDiscoveries.isRead, false));
  if (saved === "true") conditions.push(eq(aiDiscoveries.isSaved, true));

  const results = await db.select().from(aiDiscoveries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiDiscoveries.discoveredAt))
    .limit(parseInt(limit));

  res.json(results);
});

// GET /api/feed/sweeps — get sweep history
router.get("/feed/sweeps", authMiddleware, async (req: Request, res: Response) => {
  const sweeps = await db.select().from(aiSweepLog).orderBy(desc(aiSweepLog.startedAt)).limit(20);
  res.json(sweeps);
});

// GET /api/feed/stats — unread count, total, last sweep time
router.get("/feed/stats", authMiddleware, async (req: Request, res: Response) => {
  const all = await db.select().from(aiDiscoveries).orderBy(desc(aiDiscoveries.discoveredAt)).limit(200);
  const unread = all.filter(d => !d.isRead).length;
  const saved = all.filter(d => d.isSaved).length;
  const lastSweep = await db.select().from(aiSweepLog).orderBy(desc(aiSweepLog.startedAt)).limit(1);

  const categories: Record<string, number> = {};
  for (const d of all) { categories[d.category] = (categories[d.category] || 0) + 1; }

  res.json({
    total: all.length,
    unread,
    saved,
    sweepRunning: isSweepRunning(),
    lastSweep: lastSweep[0] ?? null,
    categories,
  });
});

// PATCH /api/feed/discoveries/:id — mark read/saved
router.patch("/feed/discoveries/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { isRead, isSaved } = req.body;
  const updates: Record<string, boolean> = {};
  if (isRead !== undefined) updates.isRead = isRead;
  if (isSaved !== undefined) updates.isSaved = isSaved;
  await db.update(aiDiscoveries).set(updates).where(eq(aiDiscoveries.id, id));
  res.json({ success: true });
});

// DELETE /api/feed/discoveries/:id
router.delete("/feed/discoveries/:id", authMiddleware, async (req: Request, res: Response) => {
  await db.delete(aiDiscoveries).where(eq(aiDiscoveries.id, parseInt(req.params.id)));
  res.json({ success: true });
});

// DELETE /api/feed/discoveries — clear all
router.delete("/feed/discoveries", authMiddleware, async (req: Request, res: Response) => {
  await db.delete(aiDiscoveries);
  res.json({ success: true });
});

// PATCH /api/feed/mark-all-read
router.patch("/feed/mark-all-read", authMiddleware, async (req: Request, res: Response) => {
  await db.update(aiDiscoveries).set({ isRead: true }).where(eq(aiDiscoveries.isRead, false));
  res.json({ success: true });
});

// POST /api/feed/sweep — trigger a manual sweep with SSE progress
router.post("/feed/sweep", authMiddleware, async (req: Request, res: Response) => {
  if (isSweepRunning()) {
    res.status(409).json({ error: "A sweep is already running" }); return;
  }

  sseHeaders(res);

  await runIntelligenceSweep((progress) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  });

  res.end();
});

// GET /api/feed/sweep-status — check if sweep is running
router.get("/feed/sweep-status", authMiddleware, async (req: Request, res: Response) => {
  res.json({ running: isSweepRunning() });
});

export default router;
