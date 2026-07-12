import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { siriusAccountsTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Extend express-session to include our userId field
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const router = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  try {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db
      .select({ id: siriusAccountsTable.id })
      .from(siriusAccountsTable)
      .where(eq(siriusAccountsTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists. Please log in." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [account] = await db
      .insert(siriusAccountsTable)
      .values({ email: normalizedEmail, passwordHash })
      .returning({ id: siriusAccountsTable.id });

    const userId = `acct_${account.id}`;
    const displayName = name?.trim() || normalizedEmail.split("@")[0];

    await db
      .insert(userProfilesTable)
      .values({ userId, displayName })
      .onConflictDoNothing();

    req.session.userId = userId;
    res.json({ userId, email: normalizedEmail, displayName });
  } catch (err) {
    console.error("[auth/signup]", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [account] = await db
      .select()
      .from(siriusAccountsTable)
      .where(eq(siriusAccountsTable.email, normalizedEmail))
      .limit(1);

    if (!account) {
      res.status(401).json({ error: "No account found with that email." });
      return;
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect password." });
      return;
    }

    const userId = `acct_${account.id}`;

    const [profile] = await db
      .select({ displayName: userProfilesTable.displayName })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId))
      .limit(1);

    req.session.userId = userId;
    res.json({ userId, email: normalizedEmail, displayName: profile?.displayName ?? "" });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET /api/auth/me — restore session from cookie (auto-login)
router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    // For Garry's bypass account
    if (userId === "garry") {
      res.json({ userId, email: "", displayName: "Garry" });
      return;
    }
    const accountId = parseInt(userId.replace("acct_", ""));
    const [account] = await db
      .select({ email: siriusAccountsTable.email })
      .from(siriusAccountsTable)
      .where(eq(siriusAccountsTable.id, accountId))
      .limit(1);
    const [profile] = await db
      .select({ displayName: userProfilesTable.displayName })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId))
      .limit(1);
    res.json({ userId, email: account?.email ?? "", displayName: profile?.displayName ?? "" });
  } catch (err) {
    console.error("[auth/me]", err);
    res.status(500).json({ error: "Session restore failed." });
  }
});

// POST /api/auth/logout — clear session
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// Shared tester password — all team testers use this password (they cannot change it)
const TESTER_PASSWORD = "SiriusTester2026!";

function labPinGuard(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  const pin = req.headers["x-lab-pin"] as string;
  const expected = process.env.STAR_LAB_PIN || "2025";
  if (!pin || pin !== expected) { res.status(401).json({ error: "Unauthorised" }); return; }
  next();
}

// POST /api/auth/create-tester — PIN-protected; creates a team tester account
router.post("/auth/create-tester", labPinGuard, async (req, res): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) { res.status(400).json({ error: "Email is required." }); return; }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db
      .select({ id: siriusAccountsTable.id })
      .from(siriusAccountsTable)
      .where(eq(siriusAccountsTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists." }); return;
    }

    const passwordHash = await bcrypt.hash(TESTER_PASSWORD, 12);
    const [account] = await db
      .insert(siriusAccountsTable)
      .values({ email: normalizedEmail, passwordHash })
      .returning({ id: siriusAccountsTable.id });

    const userId = `acct_${account.id}`;
    const displayName = normalizedEmail.split("@")[0];
    await db.insert(userProfilesTable).values({ userId, displayName }).onConflictDoNothing();

    res.json({ success: true, userId, email: normalizedEmail, displayName, password: TESTER_PASSWORD });
  } catch (err) {
    console.error("[auth/create-tester]", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET /api/auth/testers — PIN-protected; lists all tester accounts
router.get("/auth/testers", labPinGuard, async (_req, res): Promise<void> => {
  try {
    const accounts = await db
      .select({ id: siriusAccountsTable.id, email: siriusAccountsTable.email, createdAt: siriusAccountsTable.createdAt })
      .from(siriusAccountsTable)
      .orderBy(siriusAccountsTable.createdAt);
    res.json(accounts);
  } catch (err) {
    console.error("[auth/testers]", err);
    res.status(500).json({ error: "Failed to load testers." });
  }
});

export default router;
