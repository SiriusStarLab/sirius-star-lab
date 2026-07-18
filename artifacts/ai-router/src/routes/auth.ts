import { Router } from "express";
import type { Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateJwt, hashKey } from "../middleware/auth.js";
import crypto from "crypto";

export const authRouter = Router();

const PLANS: Record<string, { rpmLimit: number; maxKeys: number; startingCredits: number }> = {
  dev:      { rpmLimit: 60,   maxKeys: 3,         startingCredits: 5   },
  pro:      { rpmLimit: 300,  maxKeys: 10,        startingCredits: 60  },
  business: { rpmLimit: 1000, maxKeys: 999,       startingCredits: 250 },
};

// POST /auth/signup
authRouter.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const { email, password, plan = "dev" } = req.body as { email?: string; password?: string; plan?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }
  if (!["dev", "pro", "business"].includes(plan)) {
    res.status(400).json({ error: "invalid plan" });
    return;
  }

  const existing = await db.select({ id: schema.customers.id })
    .from(schema.customers).where(eq(schema.customers.email, email.toLowerCase())).limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const planConfig = PLANS[plan]!;
  const passwordHash = hashPassword(password);
  const startingBalance = String(planConfig.startingCredits);

  const [customer] = await db.insert(schema.customers).values({
    email:        email.toLowerCase(),
    passwordHash,
    plan,
    balanceUsd:   startingBalance,
  }).returning();

  // Auto-generate a default API key
  const raw    = `sk-sr-${crypto.randomBytes(24).toString("hex")}`;
  const hash   = hashKey(raw);
  const prefix = raw.slice(0, 12);

  await db.insert(schema.routerApiKeys).values({
    customerId: customer!.id,
    name:       email.toLowerCase(),
    label:      "default",
    keyHash:    hash,
    keyPrefix:  prefix,
    isActive:   true,
    rpmLimit:   planConfig.rpmLimit,
  });

  const token = generateJwt({
    customerId: customer!.id,
    email: customer!.email,
    plan:  customer!.plan,
    exp:   Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
  });

  res.status(201).json({
    token,
    customer: { id: customer!.id, email: customer!.email, plan, balanceUsd: planConfig.startingCredits },
    apiKey: raw, // shown once
  });
});

// POST /auth/login
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const [customer] = await db.select()
    .from(schema.customers)
    .where(eq(schema.customers.email, email.toLowerCase()))
    .limit(1);

  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateJwt({
    customerId: customer.id,
    email:      customer.email,
    plan:       customer.plan,
    exp:        Math.floor(Date.now() / 1000) + 86400 * 30,
  });

  res.json({
    token,
    customer: {
      id:         customer.id,
      email:      customer.email,
      plan:       customer.plan,
      balanceUsd: Number(customer.balanceUsd),
    },
  });
});
