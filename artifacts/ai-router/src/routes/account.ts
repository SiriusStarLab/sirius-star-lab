import { Router } from "express";
import type { Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { requireAuth, hashKey } from "../middleware/auth.js";
import crypto from "crypto";

export const accountRouter = Router();
accountRouter.use(requireAuth);

const PLAN_RPM: Record<string, number> = { dev: 60, pro: 300, business: 1000 };
const PLAN_MAX_KEYS: Record<string, number> = { dev: 3, pro: 10, business: 999 };

// GET /account/me
accountRouter.get("/me", async (req: Request, res: Response): Promise<void> => {
  const [customer] = await db.select({
    id: schema.customers.id, email: schema.customers.email,
    plan: schema.customers.plan, balanceUsd: schema.customers.balanceUsd,
    createdAt: schema.customers.createdAt,
  }).from(schema.customers).where(eq(schema.customers.id, req.customerId!)).limit(1);

  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  res.json(customer);
});

// GET /account/usage?period=today|week|month
accountRouter.get("/usage", async (req: Request, res: Response): Promise<void> => {
  const { period = "today" } = req.query as { period?: string };
  const from = new Date();
  if (period === "today") from.setHours(0, 0, 0, 0);
  if (period === "week")  from.setDate(from.getDate() - 7);
  if (period === "month") from.setDate(from.getDate() - 30);

  const rows = await db
    .select({
      model:            schema.routerRequests.model,
      requests:         sql<number>`COUNT(*)::int`,
      promptTokens:     sql<number>`SUM(prompt_tokens)::bigint`,
      completionTokens: sql<number>`SUM(completion_tokens)::bigint`,
      costUsd:          sql<number>`ROUND(SUM(cost_usd::numeric), 6)`,
      cached:           sql<number>`SUM(CASE WHEN cached THEN 1 ELSE 0 END)::int`,
    })
    .from(schema.routerRequests)
    .where(and(
      eq(schema.routerRequests.customerId, req.customerId!),
      gte(schema.routerRequests.createdAt, from),
    ))
    .groupBy(schema.routerRequests.model)
    .orderBy(desc(sql`SUM(cost_usd::numeric)`));

  const totals = await db
    .select({
      totalRequests: sql<number>`COUNT(*)::int`,
      totalCostUsd:  sql<number>`ROUND(SUM(cost_usd::numeric), 6)`,
      cachedHits:    sql<number>`SUM(CASE WHEN cached THEN 1 ELSE 0 END)::int`,
    })
    .from(schema.routerRequests)
    .where(and(
      eq(schema.routerRequests.customerId, req.customerId!),
      gte(schema.routerRequests.createdAt, from),
    ));

  res.json({ period, from, byModel: rows, totals: totals[0] });
});

// GET /account/keys
accountRouter.get("/keys", async (req: Request, res: Response): Promise<void> => {
  const keys = await db.select({
    id: schema.routerApiKeys.id, label: schema.routerApiKeys.label,
    keyPrefix: schema.routerApiKeys.keyPrefix, isActive: schema.routerApiKeys.isActive,
    rpmLimit: schema.routerApiKeys.rpmLimit, createdAt: schema.routerApiKeys.createdAt,
  })
    .from(schema.routerApiKeys)
    .where(eq(schema.routerApiKeys.customerId, req.customerId!))
    .orderBy(desc(schema.routerApiKeys.createdAt));

  res.json(keys);
});

// POST /account/keys
accountRouter.post("/keys", async (req: Request, res: Response): Promise<void> => {
  const { label = "default" } = req.body as { label?: string };

  const [customer] = await db.select({ plan: schema.customers.plan })
    .from(schema.customers).where(eq(schema.customers.id, req.customerId!)).limit(1);

  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const maxKeys = PLAN_MAX_KEYS[customer.plan] ?? 3;
  const existing = await db.select({ id: schema.routerApiKeys.id })
    .from(schema.routerApiKeys)
    .where(and(eq(schema.routerApiKeys.customerId, req.customerId!), eq(schema.routerApiKeys.isActive, true)));

  if (existing.length >= maxKeys) {
    res.status(403).json({ error: `Your ${customer.plan} plan allows max ${maxKeys} active keys. Upgrade to add more.` });
    return;
  }

  const raw    = `sk-sr-${crypto.randomBytes(24).toString("hex")}`;
  const hash   = hashKey(raw);
  const prefix = raw.slice(0, 12);
  const rpm    = PLAN_RPM[customer.plan] ?? 60;

  const [row] = await db.insert(schema.routerApiKeys).values({
    customerId: req.customerId!, name: `key-${label}`, label,
    keyHash: hash, keyPrefix: prefix, isActive: true, rpmLimit: rpm,
  }).returning();

  res.status(201).json({ id: row!.id, label, keyPrefix: prefix, key: raw, rpmLimit: rpm });
});

// DELETE /account/keys/:id
accountRouter.delete("/keys/:id", async (req: Request, res: Response): Promise<void> => {
  const [key] = await db.select({ customerId: schema.routerApiKeys.customerId })
    .from(schema.routerApiKeys).where(eq(schema.routerApiKeys.id, Number(req.params.id))).limit(1);

  if (!key || key.customerId !== req.customerId) {
    res.status(404).json({ error: "Key not found" }); return;
  }
  await db.update(schema.routerApiKeys).set({ isActive: false })
    .where(eq(schema.routerApiKeys.id, Number(req.params.id)));

  res.json({ ok: true });
});

// GET /account/aliases
accountRouter.get("/aliases", async (req: Request, res: Response): Promise<void> => {
  const aliases = await db.select().from(schema.routerAliases)
    .where(eq(schema.routerAliases.customerId, req.customerId!))
    .orderBy(desc(schema.routerAliases.createdAt));
  res.json(aliases);
});

// POST /account/aliases — { alias: "my-fast", targetModel: "anthropic/claude-haiku-4-5" }
accountRouter.post("/aliases", async (req: Request, res: Response): Promise<void> => {
  const { alias, targetModel } = req.body as { alias?: string; targetModel?: string };
  if (!alias || !targetModel) { res.status(400).json({ error: "alias and targetModel required" }); return; }

  const [row] = await db.insert(schema.routerAliases)
    .values({ customerId: req.customerId!, alias: alias.toLowerCase(), targetModel })
    .onConflictDoNothing()
    .returning();

  res.status(201).json(row);
});

// DELETE /account/aliases/:id
accountRouter.delete("/aliases/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(schema.routerAliases)
    .where(and(eq(schema.routerAliases.id, Number(req.params.id)), eq(schema.routerAliases.customerId, req.customerId!)));
  res.json({ ok: true });
});

// GET /account/fallbacks
accountRouter.get("/fallbacks", async (req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(schema.routerFallbacks)
    .where(eq(schema.routerFallbacks.customerId, req.customerId!));
  res.json(rows);
});

// POST /account/fallbacks — { primaryModel: "claude-opus-4", fallbackModels: ["claude-sonnet-4-5"] }
accountRouter.post("/fallbacks", async (req: Request, res: Response): Promise<void> => {
  const { primaryModel, fallbackModels } = req.body as { primaryModel?: string; fallbackModels?: string[] };
  if (!primaryModel || !Array.isArray(fallbackModels) || fallbackModels.length === 0) {
    res.status(400).json({ error: "primaryModel and fallbackModels[] required" }); return;
  }
  const [row] = await db.insert(schema.routerFallbacks)
    .values({ customerId: req.customerId!, primaryModel, fallbackModels })
    .returning();
  res.status(201).json(row);
});

// DELETE /account/fallbacks/:id
accountRouter.delete("/fallbacks/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(schema.routerFallbacks)
    .where(and(eq(schema.routerFallbacks.id, Number(req.params.id)), eq(schema.routerFallbacks.customerId, req.customerId!)));
  res.json({ ok: true });
});

// POST /account/plan — upgrade plan, apply dev→pro $5 loyalty bonus
accountRouter.post("/plan", async (req: Request, res: Response): Promise<void> => {
  const { plan } = req.body as { plan?: string };
  if (!plan || !["dev", "pro", "business"].includes(plan)) {
    res.status(400).json({ error: "plan must be dev, pro, or business" }); return;
  }

  const [customer] = await db.select({
    plan: schema.customers.plan,
    balanceUsd: schema.customers.balanceUsd,
  }).from(schema.customers).where(eq(schema.customers.id, req.customerId!)).limit(1);

  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  if (customer.plan === plan) { res.status(400).json({ error: "Already on that plan" }); return; }

  const upgradingFromDevToPro = customer.plan === "dev" && plan === "pro";
  const loyaltyBonus = upgradingFromDevToPro ? 5 : 0;
  const newBalance = Number(customer.balanceUsd) + loyaltyBonus;

  await db.update(schema.customers)
    .set({ plan, balanceUsd: String(newBalance) })
    .where(eq(schema.customers.id, req.customerId!));

  res.json({
    ok: true,
    plan,
    balanceUsd: newBalance,
    bonusApplied: loyaltyBonus,
    message: loyaltyBonus > 0 ? `$${loyaltyBonus} loyalty credit added to your balance` : undefined,
  });
});
