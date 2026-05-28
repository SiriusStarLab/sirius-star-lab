import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";

const router = Router();

const ObserveSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["preference", "pattern", "goal", "fact", "behaviour"]),
  key: z.string().min(1),
  value: z.unknown(),
  confidence: z.number().min(0).max(1).optional().default(1.0),
});

router.post("/observe", async (req: Request, res: Response) => {
  const parsed = ObserveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId, type, key, value, confidence } = parsed.data;

  await db.query(
    `INSERT INTO sirius_memory (user_id, memory_type, key, value, confidence, last_observed, observation_count)
     VALUES ($1, $2, $3, $4, $5, NOW(), 1)
     ON CONFLICT (user_id, key)
     DO UPDATE SET
       value = EXCLUDED.value,
       confidence = EXCLUDED.confidence,
       last_observed = NOW(),
       observation_count = sirius_memory.observation_count + 1`,
    [userId, type, key, JSON.stringify(value), confidence],
  );

  await redis.del(`memory:${userId}`);

  res.json({ ok: true });
});

router.get("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  const cached = await redis.get(`memory:${userId}`);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const result = await db.query(
    `SELECT memory_type, key, value, confidence, last_observed, observation_count
     FROM sirius_memory
     WHERE user_id = $1
     ORDER BY observation_count DESC, last_observed DESC`,
    [userId],
  );

  const data = {
    userId,
    memories: result.rows,
    count: result.rows.length,
  };

  await redis.set(`memory:${userId}`, JSON.stringify(data), 300);
  res.json(data);
});

router.get("/:userId/prompt", async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await db.query(
    `SELECT memory_type, key, value, observation_count
     FROM sirius_memory
     WHERE user_id = $1
     ORDER BY observation_count DESC, last_observed DESC
     LIMIT 30`,
    [userId],
  );

  if (result.rows.length === 0) {
    res.json({ prompt: "" });
    return;
  }

  const lines = result.rows.map((r) => {
    const v = r["value"];
    const display = typeof v === "string" ? v : JSON.stringify(v);
    return `- [${r["memory_type"]}] ${r["key"]}: ${display}`;
  });

  const prompt = `What Sirius knows about this user:\n${lines.join("\n")}`;
  res.json({ prompt });
});

router.delete("/:userId/:key", async (req: Request, res: Response) => {
  const { userId, key } = req.params;
  await db.query(
    `DELETE FROM sirius_memory WHERE user_id = $1 AND key = $2`,
    [userId, key],
  );
  await redis.del(`memory:${userId}`);
  res.json({ ok: true });
});

export default router;
