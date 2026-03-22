/**
 * Sirius AI — Security Middleware
 *
 * Protections applied:
 *   1. Helmet       — HTTP security headers (XSS, clickjacking, MIME sniffing, HSTS, etc.)
 *   2. Rate limits  — Per-IP throttling on all routes, stricter on sensitive endpoints
 *   3. Pin guard    — Brute-force lockout on Star Lab PIN (5 failures → 15-min ban)
 *   4. Body guard   — Hard payload size limits per route type
 *   5. Input scan   — Reject requests carrying SQL injection or XSS payloads
 *   6. Security log — Structured log of all threat events
 */

import { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// ── 1. Security headers via Helmet ────────────────────────────────────────────

export const helmetMiddleware = helmet({
  // Content-Security-Policy — controls what resources the browser can load
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.stripe.com", "wss:", "https:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // HTTP Strict Transport Security — force HTTPS for 1 year
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // Prevent clickjacking
  frameguard: { action: "sameorigin" },
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // XSS filter (legacy browsers)
  xssFilter: true,
  // Referrer policy — don't leak URLs to third parties
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // Permissions policy — restrict dangerous browser features
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  crossOriginEmbedderPolicy: false, // Required for some Stripe/iframe flows
});

// ── 2. Rate limiting ──────────────────────────────────────────────────────────

const rateLimitMessage = (windowMinutes: number, max: number) => ({
  error: "Too many requests",
  message: `Rate limit exceeded — maximum ${max} requests per ${windowMinutes} minute${windowMinutes > 1 ? "s" : ""}. Please slow down.`,
  retryAfter: windowMinutes * 60,
});

// General API rate limit — 200 req/min per IP
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    securityLog("RATE_LIMIT_GENERAL", req);
    res.status(429).json(rateLimitMessage(1, 200));
  },
});

// Chat / streaming — 30 messages per minute per IP (prevents bot spamming)
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    securityLog("RATE_LIMIT_CHAT", req);
    res.status(429).json(rateLimitMessage(1, 30));
  },
});

// Star Lab PIN endpoint — 10 attempts per 15 minutes per IP
export const labAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    securityLog("RATE_LIMIT_LAB_AUTH", req);
    res.status(429).json({ error: "Too many access attempts. Try again in 15 minutes." });
  },
});

// Image generation — expensive endpoint, 10 per hour per IP
export const imageGenRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    securityLog("RATE_LIMIT_IMAGE", req);
    res.status(429).json(rateLimitMessage(60, 10));
  },
});

// Scan trigger — max 3 manual triggers per hour
export const scanTriggerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    securityLog("RATE_LIMIT_SCAN", req);
    res.status(429).json({ error: "Maximum 3 manual scans per hour." });
  },
});

// ── 3. PIN brute-force protection ─────────────────────────────────────────────

type BanRecord = { failures: number; firstFailure: number; bannedUntil: number | null };
const pinAttempts = new Map<string, BanRecord>();

const MAX_PIN_FAILURES = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes
const BAN_DURATION_MS = 15 * 60 * 1000; // 15-minute ban after 5 failures

// Clean up expired records every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of pinAttempts.entries()) {
    if (record.bannedUntil && record.bannedUntil < now) pinAttempts.delete(ip);
    else if (now - record.firstFailure > PIN_WINDOW_MS && !record.bannedUntil) pinAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

export function recordPinFailure(req: Request): { banned: boolean; remaining: number; banExpiresAt: Date | null } {
  const ip = getClientIp(req);
  const now = Date.now();
  let record = pinAttempts.get(ip) ?? { failures: 0, firstFailure: now, bannedUntil: null };

  // Reset if window expired and not currently banned
  if (!record.bannedUntil && now - record.firstFailure > PIN_WINDOW_MS) {
    record = { failures: 0, firstFailure: now, bannedUntil: null };
  }

  record.failures++;

  if (record.failures >= MAX_PIN_FAILURES) {
    record.bannedUntil = now + BAN_DURATION_MS;
    pinAttempts.set(ip, record);
    securityLog("PIN_BRUTE_FORCE_BAN", req, `${record.failures} failed PIN attempts — IP banned for 15 minutes`);
    return { banned: true, remaining: 0, banExpiresAt: new Date(record.bannedUntil) };
  }

  pinAttempts.set(ip, record);
  securityLog("PIN_FAILURE", req, `Failure ${record.failures}/${MAX_PIN_FAILURES}`);
  return { banned: false, remaining: MAX_PIN_FAILURES - record.failures, banExpiresAt: null };
}

export function checkPinBan(req: Request): { banned: boolean; banExpiresAt: Date | null } {
  const ip = getClientIp(req);
  const record = pinAttempts.get(ip);
  if (!record?.bannedUntil) return { banned: false, banExpiresAt: null };
  if (Date.now() > record.bannedUntil) {
    pinAttempts.delete(ip);
    return { banned: false, banExpiresAt: null };
  }
  return { banned: true, banExpiresAt: new Date(record.bannedUntil) };
}

export function clearPinRecord(req: Request) {
  pinAttempts.delete(getClientIp(req));
}

// Middleware version of PIN ban check — attach to all /lab/* routes
export function pinBanMiddleware(req: Request, res: Response, next: NextFunction) {
  const { banned, banExpiresAt } = checkPinBan(req);
  if (banned) {
    securityLog("PIN_BAN_BLOCKED", req, `Blocked — ban expires ${banExpiresAt?.toISOString()}`);
    return res.status(403).json({
      error: "Access temporarily locked",
      message: "Too many incorrect PIN attempts. Access is locked for 15 minutes.",
      unlocksAt: banExpiresAt?.toISOString(),
    });
  }
  next();
}

// ── 4. Payload size guard ─────────────────────────────────────────────────────

// Reject requests with absurdly large payloads before they hit Express's parser
export function payloadSizeGuard(req: Request, res: Response, next: NextFunction) {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  const MAX_NORMAL = 5 * 1024 * 1024;   // 5MB for normal routes
  const MAX_IMAGE  = 30 * 1024 * 1024;  // 30MB for image/document upload routes

  const isImageRoute = req.path.includes("/render") || req.path.includes("/image") || req.path.includes("/document");

  const limit = isImageRoute ? MAX_IMAGE : MAX_NORMAL;

  if (contentLength > limit) {
    securityLog("PAYLOAD_TOO_LARGE", req, `Content-Length: ${contentLength} bytes (limit: ${limit})`);
    return res.status(413).json({
      error: "Payload too large",
      message: `Request body exceeds the ${isImageRoute ? "30MB" : "5MB"} limit.`,
    });
  }
  next();
}

// ── 5. Input threat scanner ───────────────────────────────────────────────────

// Patterns that indicate injection/exploit attempts
const THREAT_PATTERNS = [
  // SQL injection
  /(\bUNION\b.*\bSELECT\b|\bDROP\b.*\bTABLE\b|\bINSERT\b.*\bINTO\b|\bDELETE\b.*\bFROM\b|\bEXEC\b\s*\()/i,
  // Script injection
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']?(?:alert|eval|document|window)/i,
  // Path traversal
  /\.\.[/\\]{1,}/,
  // SSRF / internal network probing
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/i,
  // Template injection
  /\{\{.*\}\}|\$\{.*\}|<%.*%>/,
  // Null byte injection
  /\x00/,
];

function scanValue(value: unknown): boolean {
  if (typeof value === "string") return THREAT_PATTERNS.some(p => p.test(value));
  if (Array.isArray(value)) return value.some(v => scanValue(v));
  if (value && typeof value === "object") return Object.values(value).some(v => scanValue(v));
  return false;
}

export function inputScanMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only scan routes that accept user content
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const isThreat = scanValue(req.body) || scanValue(req.query) || scanValue(req.params);

  if (isThreat) {
    securityLog("THREAT_DETECTED", req, `Suspicious payload pattern in ${req.method} ${req.path}`);
    return res.status(400).json({
      error: "Request rejected",
      message: "The request contains disallowed content.",
    });
  }

  next();
}

// ── 6. Security event logger ──────────────────────────────────────────────────

export function securityLog(event: string, req: Request, detail?: string) {
  const entry = {
    event,
    ip: getClientIp(req),
    method: req.method,
    path: req.path,
    userAgent: req.headers["user-agent"]?.slice(0, 120) || "unknown",
    timestamp: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  };
  console.log(`[SECURITY] ${JSON.stringify(entry)}`);
}

// ── Suspicious request detector — log unusual patterns ───────────────────────

const SUSPICIOUS_AGENTS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /nessus/i,
  /python-requests/i, /go-http-client/i, /curl\//i, /wget\//i,
  /scrapy/i, /burpsuite/i, /owasp/i, /zgrab/i, /nuclei/i,
];

const SUSPICIOUS_PATHS = [
  /\/(wp-admin|wp-login|phpmyadmin|admin|\.env|config|backup|\.git|\.ssh)/i,
  /\.(php|asp|aspx|jsp|cgi|pl|sh|bash|py)\b/i,
  /\/etc\/(passwd|shadow|hosts)/i,
];

export function suspiciousRequestDetector(req: Request, _res: Response, next: NextFunction) {
  const ua = req.headers["user-agent"] || "";
  const path = req.path;

  if (SUSPICIOUS_AGENTS.some(p => p.test(ua))) {
    securityLog("SUSPICIOUS_USER_AGENT", req, `UA: ${ua.slice(0, 80)}`);
  }

  if (SUSPICIOUS_PATHS.some(p => p.test(path))) {
    securityLog("SUSPICIOUS_PATH_PROBE", req, `Path: ${path}`);
  }

  next();
}

// ── Utility: reliable IP extraction ─────────────────────────────────────────

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || "unknown";
}
