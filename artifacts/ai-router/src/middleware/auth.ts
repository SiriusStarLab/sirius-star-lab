import type { Request, Response, NextFunction } from "express";
import { db, schema } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      apiKeyId?: number;
      apiKeyName?: string;
    }
  }
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export { hashKey };

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Allow internal calls (from same server) without a key
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

  const raw = auth.slice(7).trim();
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
