import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";

const router = Router();

const SyncSchema = z.object({
  userId: z.string().min(1),
  source: z.enum(["chat", "star_lab", "dream_lab", "voice"]),
  snapshot: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

router.post("/sync", async (req: Request, res: Response) => {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId, source, snapshot, metadata } = parsed.data;

  await db.query(
    `INSERT INTO sirius_context (user_id, source, context_data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT DO NOTHING`,
    [userId, source, JSON.stringify({ snapshot, metadata, timestamp: new Date().toISOString() })],
  );

  const cacheKey = `context:${userId}:${source}`;
  await redis.set(cacheKey, JSON.stringify({ snapshot, metadata, timestamp: new Date().toISOString() }), 3600);

  await db.query(
    `INSERT INTO sirius_events (user_id, event_type, source, data)
     VALUES ($1, $2, $3, $4)`,
    [userId, "context_sync", source, JSON.stringify({ snippet: snapshot.slice(0, 200) })],
  );

  res.json({ ok: true });
});

router.get("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  const sources = ["chat", "star_lab", "dream_lab", "voice"];
  const cached: Record<string, unknown> = {};

  for (const source of sources) {
    const val = await redis.get(`context:${userId}:${source}`);
    if (val) {
      try { cached[source] = JSON.parse(val); } catch { /* skip */ }
    }
  }

  if (Object.keys(cached).length > 0) {
    res.json({ userId, sources: cached, fromCache: true });
    return;
  }

  const result = await db.query(
    `SELECT DISTINCT ON (source) source, context_data, updated_at
     FROM sirius_context
     WHERE user_id = $1
     ORDER BY source, updated_at DESC`,
    [userId],
  );

  const sources_data: Record<string, unknown> = {};
  for (const row of result.rows) {
    sources_data[row["source"] as string] = row["context_data"];
  }

  res.json({ userId, sources: sources_data, fromCache: false });
});

router.get("/:userId/unified", async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await db.query(
    `SELECT source, context_data, updated_at
     FROM sirius_context
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 20`,
    [userId],
  );

  const entries = result.rows.map((r) => ({
    source: r["source"],
    data: r["context_data"],
    at: r["updated_at"],
  }));

  const formatted = entries
    .map((e) => {
      const d = e.data as { snapshot?: string };
      return `[${e.source}] ${d.snapshot ?? ""}`;
    })
    .join("\n\n");

  res.json({ userId, entries, formatted });
});

export default router;
