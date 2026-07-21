import type { Request, Response, NextFunction } from "express";
import { db, schema } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      apiKeyId?:    number;
      apiKeyName?:  string;
      customerId?:  number;
      customerPlan?: string;
      rpmLimit?:    number;
    }
  }
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return derived === hash;
}

export function generateJwt(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body    = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const secret  = process.env.STAR_LAB_PIN ?? "secret";
  const sig     = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    const secret = process.env.STAR_LAB_PIN ?? "secret";
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export { hashKey as default };

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Internal service calls bypass key check
  const internal = req.headers["x-internal-secret"];
  if (internal && internal === process.env.ROUTER_INTERNAL_SECRET) {
    req.apiKeyName = "internal";
    next();
    return;
  }

  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Missing API key", type: "auth_error", code: 401 } });
    return;
  }

  const raw  = auth.slice(7).trim();
  const hash = hashKey(raw);

  const [keyRow] = await db
    .select()
    .from(schema.routerApiKeys)
    .where(and(eq(schema.routerApiKeys.keyHash, hash), eq(schema.routerApiKeys.isActive, true)))
    .limit(1);

  if (!keyRow) {
    res.status(401).json({ error: { message: "Invalid API key", type: "auth_error", code: 401 } });
    return;
  }

  req.apiKeyId   = keyRow.id;
  req.apiKeyName = keyRow.name;
  req.rpmLimit   = keyRow.rpmLimit ?? 60;

  if (keyRow.customerId) {
    const [customer] = await db
      .select({ id: schema.customers.id, plan: schema.customers.plan, balanceUsd: schema.customers.balanceUsd })
      .from(schema.customers)
      .where(eq(schema.customers.id, keyRow.customerId))
      .limit(1);

    if (customer) {
      req.customerId   = customer.id;
      req.customerPlan = customer.plan;

      // Credit check — block if balance is zero
      if (Number(customer.balanceUsd) <= 0) {
        res.status(402).json({
          error: {
            message: "Insufficient credits. Top up at https://sirius-ai.live/dashboard",
            type: "payment_required",
            code: 402,
          },
        });
        return;
      }
    }
  }

  next();
}

// Lighter version — validates the key exists but does NOT check balance.
// Use for informational endpoints (models list, etc.) that should always be accessible.
export async function requireApiKeyOnly(req: Request, res: Response, next: NextFunction): Promise<void> {
  const internal = req.headers["x-internal-secret"];
  if (internal && internal === process.env.ROUTER_INTERNAL_SECRET) {
    req.apiKeyName = "internal"; next(); return;
  }
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Missing API key", type: "auth_error", code: 401 } }); return;
  }
  const hash = hashKey(auth.slice(7).trim());
  const [keyRow] = await db.select().from(schema.routerApiKeys)
    .where(and(eq(schema.routerApiKeys.keyHash, hash), eq(schema.routerApiKeys.isActive, true))).limit(1);
  if (!keyRow) {
    res.status(401).json({ error: { message: "Invalid API key", type: "auth_error", code: 401 } }); return;
  }
  req.apiKeyId = keyRow.id; req.customerId = keyRow.customerId ?? undefined;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const pin = req.headers["x-admin-pin"] || req.query["pin"];
  if (pin !== process.env.STAR_LAB_PIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  const token   = auth.slice(7).trim();
  const payload = verifyJwt(token);
  if (!payload || !payload.customerId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.customerId = payload.customerId as number;
  next();
}
