import { Router, Request, Response } from "express";
import { createHmac, randomBytes } from "crypto";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const router = Router();
const LAB_PIN = process.env.STAR_LAB_PIN || "";
const DB_URL  = process.env.DATABASE_URL || "";
const SECRET  = LAB_PIN || "sirius-session-key";

// ── Email transport ────────────────────────────────────────────────────────────
function getMailer() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SIRIUS_GARRY_EMAIL || "";
  const pass = process.env.SMTP_PASS || "";
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  const mailer = getMailer();
  if (!mailer) {
    console.warn("[Auth] Email not configured — SMTP_USER or SMTP_PASS missing. Reset URL:", resetUrl);
    return;
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.SIRIUS_GARRY_EMAIL || "noreply@sirius-ai.live";
  const fromName = "Sirius Star Lab";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your Sirius password</title>
</head>
<body style="margin:0;padding:0;background:#080c1a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080c1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <span style="font-size:28px;color:#00d4ff;">✦</span>
                <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Sirius Star Lab</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#0f1628;border-radius:18px;border:1px solid rgba(0,212,255,0.15);padding:40px 36px;">

              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                Reset your password
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:rgba(180,200,240,0.7);line-height:1.6;">
                We received a request to reset the password for your Sirius account.
                Click the button below to choose a new password. This link expires in <strong style="color:#ffffff;">1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#00d4ff;color:#04081a;font-size:16px;font-weight:700;
                              text-decoration:none;padding:16px 36px;border-radius:12px;letter-spacing:0.2px;">
                      Reset my password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:rgba(150,170,210,0.5);line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;color:rgba(0,212,255,0.6);word-break:break-all;">
                ${resetUrl}
              </p>

              <hr style="border:none;border-top:1px solid rgba(0,212,255,0.1);margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:rgba(150,170,210,0.4);line-height:1.5;">
                If you didn't request this, you can safely ignore this email — your password won't change.
                <br /><br />
                Questions? Reply to this email or contact
                <a href="mailto:support@sirius-ai.live" style="color:rgba(0,212,255,0.6);">support@sirius-ai.live</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:rgba(150,170,210,0.3);">
                © ${new Date().getFullYear()} Sirius Star Lab · GCTH Supplies Ltd
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Reset your Sirius password\n\nWe received a request to reset your password.\n\nClick this link to reset it (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.\n\nSirius Star Lab · support@sirius-ai.live`;

  await mailer.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: toEmail,
    subject: "Reset your Sirius password",
    text,
    html,
  });

  console.log(`[Auth] Password reset email sent to ${toEmail}`);
}

// ── Session helpers ────────────────────────────────────────────────────────────
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

// ── Routes ─────────────────────────────────────────────────────────────────────

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
    // Always respond with ok — don't reveal whether email exists
    if (found.rows.length === 0) {
      res.json({ ok: true }); return;
    }
    const token = randomBytes(24).toString("hex");
    await dbQuery("DELETE FROM password_reset_tokens WHERE email=$1", [email.toLowerCase().trim()]);
    await dbQuery(
      "INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [email.toLowerCase().trim(), token]
    );
    const resetUrl = `https://sirius-ai.live/?reset=${token}`;

    // Send the email (non-blocking — don't fail the response if email fails)
    sendResetEmail(email.toLowerCase().trim(), resetUrl).catch(err => {
      console.error("[Auth] Failed to send reset email:", err.message);
    });

    res.json({ ok: true });
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
