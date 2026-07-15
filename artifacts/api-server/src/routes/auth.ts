import { Router, Request, Response } from "express";
import { createHmac } from "crypto";

const router = Router();
const LAB_PIN = process.env.STAR_LAB_PIN || "";
const DB_URL  = process.env.DATABASE_URL || "";
const SECRET  = LAB_PIN || "sirius-session-key";

// ── Tiny cookie helpers (no cookie-parser dependency) ──────────────────────
function getCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function makeToken(userId: string): string {
  const sig = createHmac("sha256", SECRET).update(userId).digest("hex").slice(0, 20);
  return Buffer.from(`${userId}:${sig}`).toString("base64url");
}

function readToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const colon   = decoded.lastIndexOf(":");
    const userId  = decoded.slice(0, colon);
    const sig     = decoded.slice(colon + 1);
    const expected = createHmac("sha256", SECRET).update(userId).digest("hex").slice(0, 20);
    return sig === expected ? userId : null;
  } catch { return null; }
}

function setSessionCookie(res: Response, userId: string) {
  const token = makeToken(userId);
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  res.setHeader("Set-Cookie",
    `sirius_session=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`);
}

// ── DB helper ──────────────────────────────────────────────────────────────
async function query(sql: string, params: any[] = []) {
  const { default: pg } = await import("pg") as any;
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try { return await client.query(sql, params); }
  finally { await client.end(); }
}

// ── Routes ─────────────────────────────────────────────────────────────────

// POST /api/auth/signup
router.post("/auth/signup", async (req: Request, res: Response) => {
  const { email, password, name } = req.body as Record<string, string>;
  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Email and password are required." }); return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." }); return;
  }
  try {
    const existing = await query("SELECT id FROM sirius_accounts WHERE email=$1", [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "An account with this email already exists. Please sign in." }); return;
    }
    const bcrypt = await import("bcryptjs");
    const hash   = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO sirius_accounts (email, password_hash) VALUES ($1, $2) RETURNING id",
      [email.toLowerCase().trim(), hash]
    );
    const userId = `user_${result.rows[0].id}`;
    setSessionCookie(res, userId);
    res.json({ userId, email: email.toLowerCase().trim() });
  } catch (e: any) {
    console.error("[Auth] Signup error:", e.message);
    res.status(500).json({ error: "Account creation failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Email and password are required." }); return;
  }
  try {
    // ── Master bypass — Lab PIN lets Garry in with any email ──────────────
    if (LAB_PIN && password === LAB_PIN) {
      const userId = /garry/i.test(email) ? "garry" : `pin_${email.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
      setSessionCookie(res, userId);
      res.json({ userId });
      return;
    }

    // ── Normal password login ─────────────────────────────────────────────
    const result = await query(
      "SELECT id, password_hash FROM sirius_accounts WHERE email=$1",
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "No account found with this email. Please sign up." }); return;
    }
    const bcrypt = await import("bcryptjs");
    const ok     = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!ok) {
      res.status(401).json({ error: "Incorrect password." }); return;
    }
    // Keep userId = "garry" for Garry's email, otherwise user_<id>
    const userId = /garry/i.test(email) ? "garry" : `user_${result.rows[0].id}`;
    setSessionCookie(res, userId);
    res.json({ userId });
  } catch (e: any) {
    console.error("[Auth] Login error:", e.message);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /api/auth/me  — called on fresh page load to restore session from cookie
router.get("/auth/me", (req: Request, res: Response) => {
  const token  = getCookie(req, "sirius_session");
  if (!token)  { res.status(401).json({ error: "Not authenticated" }); return; }
  const userId = readToken(token);
  if (!userId) { res.status(401).json({ error: "Session expired" });   return; }
  res.json({ userId });
});

// POST /api/auth/logout
router.post("/auth/logout", (_req: Request, res: Response) => {
  res.setHeader("Set-Cookie", "sirius_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/");
  res.json({ ok: true });
});

export default router;
