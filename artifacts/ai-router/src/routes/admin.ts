import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { hashKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";
import { eq, desc, sql, gte } from "drizzle-orm";
import crypto from "crypto";

export const adminRouter = Router();

function generateKey(): string {
  return `sk-sr-${crypto.randomBytes(24).toString("hex")}`;
}

// POST /admin/keys — create a new API key
adminRouter.post("/keys", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, dailyLimitUsd } = req.body as { name?: string; dailyLimitUsd?: number };
  if (!name) { res.status(400).json({ error: "name required" }); return; }

  const raw    = generateKey();
  const hash   = hashKey(raw);
  const prefix = raw.slice(0, 12);

  const [row] = await db.insert(schema.routerApiKeys).values({
    name,
    keyHash:       hash,
    keyPrefix:     prefix,
    isActive:      true,
    dailyLimitUsd: dailyLimitUsd ? String(dailyLimitUsd) : null,
  }).returning();

  // Return the raw key ONCE — we don't store it
  res.json({ id: row.id, name: row.name, key: raw, prefix, createdAt: row.createdAt });
});

// GET /admin/keys — list keys (without raw values)
adminRouter.get("/keys", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const keys = await db.select({
    id: schema.routerApiKeys.id,
    name: schema.routerApiKeys.name,
    keyPrefix: schema.routerApiKeys.keyPrefix,
    isActive: schema.routerApiKeys.isActive,
    dailyLimitUsd: schema.routerApiKeys.dailyLimitUsd,
    createdAt: schema.routerApiKeys.createdAt,
  }).from(schema.routerApiKeys).orderBy(desc(schema.routerApiKeys.createdAt));
  res.json(keys);
});

// DELETE /admin/keys/:id — deactivate a key
adminRouter.delete("/keys/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  await db.update(schema.routerApiKeys)
    .set({ isActive: false })
    .where(eq(schema.routerApiKeys.id, Number(req.params.id)));
  res.json({ ok: true });
});

// GET /admin/stats — usage and cost summary
adminRouter.get("/stats", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { period = "today" } = req.query as { period?: string };

  const now  = new Date();
  const from = new Date();
  if (period === "today")   from.setHours(0, 0, 0, 0);
  if (period === "week")    from.setDate(now.getDate() - 7);
  if (period === "month")   from.setDate(now.getDate() - 30);
  if (period === "alltime") from.setFullYear(2020);

  const rows = await db
    .select({
      provider:         schema.routerRequests.provider,
      totalRequests:    sql<number>`COUNT(*)::int`,
      successRequests:  sql<number>`SUM(CASE WHEN success THEN 1 ELSE 0 END)::int`,
      totalCostUsd:     sql<number>`ROUND(SUM(cost_usd::numeric), 4)`,
      totalInputTokens: sql<number>`SUM(prompt_tokens)::bigint`,
      totalOutputTokens:sql<number>`SUM(completion_tokens)::bigint`,
    })
    .from(schema.routerRequests)
    .where(gte(schema.routerRequests.createdAt, from))
    .groupBy(schema.routerRequests.provider);

  const totals = await db
    .select({
      totalRequests: sql<number>`COUNT(*)::int`,
      totalCostUsd:  sql<number>`ROUND(SUM(cost_usd::numeric), 4)`,
    })
    .from(schema.routerRequests)
    .where(gte(schema.routerRequests.createdAt, from));

  const topModels = await db
    .select({
      model:        schema.routerRequests.model,
      requests:     sql<number>`COUNT(*)::int`,
      costUsd:      sql<number>`ROUND(SUM(cost_usd::numeric), 4)`,
    })
    .from(schema.routerRequests)
    .where(gte(schema.routerRequests.createdAt, from))
    .groupBy(schema.routerRequests.model)
    .orderBy(desc(sql`SUM(cost_usd::numeric)`))
    .limit(10);

  res.json({ period, from, byProvider: rows, totals: totals[0], topModels });
});

// GET /admin/health
adminRouter.get("/health", requireAdmin, (_req: Request, res: Response): void => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    providers: {
      openrouter: !!process.env.OPENROUTER_API_KEY,
      openai:     !!process.env.OPENAI_API_KEY,
      anthropic:  !!process.env.ANTHROPIC_API_KEY,
    },
  });
});
