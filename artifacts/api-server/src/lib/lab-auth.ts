import { type Request, type Response } from "express";
import { db, siriusConfig, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { recordPinFailure, securityLog } from "../middlewares/security.js";

export type AccessRole = "owner" | "guest";

let LAB_PIN = process.env.STAR_LAB_PIN || "2025";
const GUEST_PIN = process.env.STAR_LAB_GUEST_PIN || "";

export function getLabPin(): string {
  return LAB_PIN;
}

export function setLabPin(pin: string): void {
  LAB_PIN = pin;
}

export async function loadLabPinFromDb(): Promise<void> {
  try {
    const rows = await db.select().from(siriusConfig).where(eq(siriusConfig.key, "lab_pin")).limit(1);
    if (rows.length > 0 && rows[0].value) { LAB_PIN = rows[0].value; }
  } catch {}
}

export function getPinRole(pin: string): AccessRole | null {
  if (pin === LAB_PIN) return "owner";
  if (GUEST_PIN && pin === GUEST_PIN) return "guest";
  return null;
}

export async function authMiddleware(req: Request, res: Response, next: () => void): Promise<void> {
  const pin = req.headers["x-lab-pin"] as string;
  // Owner PIN auth
  if (pin === LAB_PIN) { next(); return; }

  // Subscriber bypass: Plus or Pro users access lab routes via x-user-id
  const userId = req.headers["x-user-id"] as string;
  if (userId && userId.length >= 4) {
    try {
      const rows = await db
        .select({ tier: userProfilesTable.subscriptionTier })
        .from(userProfilesTable)
        .where(eq(userProfilesTable.userId, userId))
        .limit(1);
      const tier = rows[0]?.tier || "free";
      if (tier === "pro" || tier === "plus") { next(); return; }
      res.status(403).json({ error: "Star Lab requires a Pro subscription." });
      return;
    } catch {
      res.status(500).json({ error: "Could not verify subscription." });
      return;
    }
  }

  // PIN failed
  const result = recordPinFailure(req);
  if (result.banned) {
    res.status(403).json({
      error: "Access locked",
      message: "Too many incorrect PIN attempts. Locked for 15 minutes.",
      unlocksAt: result.banExpiresAt?.toISOString(),
    });
  } else {
    securityLog("LAB_HEADER_AUTH_FAIL", req, "Invalid x-lab-pin header");
    res.status(401).json({ error: "Unauthorised" });
  }
}

export function sseHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

export const TODAY = (): string =>
  new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
}
