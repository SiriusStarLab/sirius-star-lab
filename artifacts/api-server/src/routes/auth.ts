import { Router, Request, Response } from "express";
import { createHmac, randomBytes } from "crypto";
import { Client } from "pg";
import bcrypt from "bcryptjs";

const router = Router();
const LAB_PIN = process.env.STAR_LAB_PIN || "";
const DB_URL  = process.env.DATABASE_URL || "";
const SECRET  = LAB_PIN || "sirius-session-key";

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
  const token  = makeToken(userId);
  const maxAge = 30 * 24 * 60 * 60;
  res.setHeader("Set-Cookie",
    `sirius_session=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`);
}

async function dbQuery(sql: string, params: unknown[] = []) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try { return await client.query(sql, params); }
  finally { await client.end(); }
}

// POST /api/auth/signup
router.post("/auth/signup", async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Email and password are required." }); return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." }); return;
  }
  try {
    const existing = await dbQuery(
      "SELECT id FROM sirius_accounts WHERE email=$1",
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "An account with this email already exists. Please sign in." }); return;
    }
    const hash   = await bcrypt.hash(password, 10);
    const result = await dbQuery(
      "INSERT INTO sirius_accounts (email, password_hash) VALUES ($1, $2) RETURNING id",
      [email.toLowerCase().trim(), hash]
    );
    const userId = `acct_${result.rows[0].id}`;
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
    // Master bypass — Lab PIN lets Garry in with any email containing "garry"
    if (LAB_PIN && password === LAB_PIN) {
      const userId = /garry/i.test(email) ? "garry" : `pin_${email.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
      setSessionCookie(res, userId);
      res.json({ userId }); return;
    }

    const result = await dbQuery(
      "SELECT id, password_hash FROM sirius_accounts WHERE email=$1",
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "No account found with this email. Please sign up." }); return;
    }
    const ok = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!ok) {
      res.status(401).json({ error: "Incorrect password." }); return;
    }
    const userId = /garry/i.test(email) ? "garry" : `acct_${result.rows[0].id}`;
    setSessionCookie(res, userId);
    res.json({ userId });
  } catch (e: any) {
    console.error("[Auth] Login error:", e.message);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /api/auth/me
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

// POST /api/auth/request-reset
router.post("/auth/request-reset", async (req: Request, res: Response) => {
  const { email } = req.body as Record<string, string>;
  if (!email?.trim()) {
    res.status(400).json({ error: "Email is required." }); return;
  }
  try {
    const found = await dbQuery(
      "SELECT id FROM sirius_accounts WHERE email=$1",
      [email.toLowerCase().trim()]
    );
    if (found.rows.length === 0) {
      // Don't reveal whether email exists
      res.json({ ok: true }); return;
    }
    const token = randomBytes(24).toString("hex");
    // Remove any existing unused tokens for this email
    await dbQuery("DELETE FROM password_reset_tokens WHERE email=$1", [email.toLowerCase().trim()]);
    await dbQuery(
      "INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [email.toLowerCase().trim(), token]
    );
    const resetUrl = `https://sirius-ai.live/?reset=${token}`;
    console.log(`[Auth] Password reset for ${email} — URL: ${resetUrl}`);
    res.json({ ok: true, resetUrl });
  } catch (e: any) {
    console.error("[Auth] Request reset error:", e.message);
    res.status(500).json({ error: "Could not generate reset link. Please try again." });
  }
});

// POST /api/auth/reset-password
router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as Record<string, string>;
  if (!token || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "A valid token and a password of at least 8 characters are required." }); return;
  }
  try {
    const result = await dbQuery(
      "SELECT email FROM password_reset_tokens WHERE token=$1 AND expires_at > NOW() AND used = FALSE",
      [token]
    );
    if (result.rows.length === 0) {
      res.status(400).json({ error: "This reset link has expired or has already been used. Please request a new one." }); return;
    }
    const email = result.rows[0].email as string;
    const hash  = await bcrypt.hash(newPassword, 10);
    await dbQuery("UPDATE sirius_accounts SET password_hash=$1 WHERE email=$2", [hash, email]);
    await dbQuery("UPDATE password_reset_tokens SET used=TRUE WHERE token=$1", [token]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[Auth] Reset password error:", e.message);
    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});

export default router;
