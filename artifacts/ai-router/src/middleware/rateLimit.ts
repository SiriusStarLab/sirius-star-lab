import type { Request, Response, NextFunction } from "express";

// In-memory sliding window rate limiter per API key
const windows = new Map<string, number[]>();

export function rateLimitByKey(req: Request, res: Response, next: NextFunction): void {
  const keyId = req.apiKeyId;
  if (!keyId) { next(); return; }

  const rpm     = req.rpmLimit ?? 60;
  const now     = Date.now();
  const windowMs = 60_000;
  const bucketKey = String(keyId);

  const timestamps = (windows.get(bucketKey) ?? []).filter(t => now - t < windowMs);
  timestamps.push(now);
  windows.set(bucketKey, timestamps);

  if (timestamps.length > rpm) {
    const retryAfter = Math.ceil((timestamps[0]! + windowMs - now) / 1000);
    res.status(429).json({
      error: {
        message: `Rate limit exceeded. Max ${rpm} requests/minute. Retry after ${retryAfter}s.`,
        type: "rate_limit_error",
        code: 429,
      },
    });
    return;
  }

  next();
}

// Cleanup old windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windows.entries()) {
    const fresh = timestamps.filter(t => now - t < 60_000);
    if (fresh.length === 0) windows.delete(key);
    else windows.set(key, fresh);
  }
}, 300_000);
