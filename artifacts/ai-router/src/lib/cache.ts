import crypto from "crypto";
import { db, schema } from "../db/index.js";
import { eq, lt } from "drizzle-orm";
import type { ChatMessage } from "../types.js";

const DEFAULT_TTL_SECONDS = 3600; // 1 hour

export function buildCacheKey(model: string, messages: ChatMessage[]): string {
  const payload = JSON.stringify({ model, messages });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function getCached(cacheKey: string): Promise<Record<string, unknown> | null> {
  const [row] = await db
    .select()
    .from(schema.routerCache)
    .where(eq(schema.routerCache.cacheKey, cacheKey))
    .limit(1);

  if (!row) return null;
  if (new Date(row.expiresAt) < new Date()) {
    // Expired — delete and return null
    await db.delete(schema.routerCache).where(eq(schema.routerCache.cacheKey, cacheKey));
    return null;
  }

  // Increment hit count
  await db
    .update(schema.routerCache)
    .set({ hitCount: (row.hitCount ?? 0) + 1 })
    .where(eq(schema.routerCache.id, row.id))
    .catch(() => null);

  return row.response as Record<string, unknown>;
}

export async function setCached(
  cacheKey: string,
  model: string,
  response: Record<string, unknown>,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await db
    .insert(schema.routerCache)
    .values({ cacheKey, model, response, expiresAt })
    .onConflictDoUpdate({
      target: schema.routerCache.cacheKey,
      set: { response, expiresAt, hitCount: 0 },
    })
    .catch(() => null);
}

// Prune expired entries — call periodically
export async function pruneCache(): Promise<void> {
  await db
    .delete(schema.routerCache)
    .where(lt(schema.routerCache.expiresAt, new Date()))
    .catch(() => null);
}
