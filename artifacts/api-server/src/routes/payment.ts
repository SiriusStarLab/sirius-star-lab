import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { paymentRequestsTable, userProfilesTable, siriusNotifications } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";

const router = Router();

const EXPIRY_HOURS = 48;

function labPinGuard(req: Request, res: Response, next: NextFunction) {
  const pin = req.headers["x-lab-pin"] as string;
  const expected = process.env.STAR_LAB_PIN || "2025";
  if (!pin || pin !== expected) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  next();
}

const BANK = {
  name: "GCTH Supplies Ltd",
  account: "26359434",
  sortCode: "04-03-33",
  bank: "Mettle",
};

const PRICES: Record<string, { amount: string; label: string }> = {
  plus: { amount: "£6.99", label: "Sirius Plus" },
  pro: { amount: "£14.99", label: "Sirius Pro" },
};

// GET /api/payment/bank — return bank details
router.get("/payment/bank", (_req, res) => {
  res.json(BANK);
});

// POST /api/payment/request — auto-activate user and send Star Lab notification
router.post("/payment/request", async (req, res) => {
  try {
    const { userId, tier, name, email, note } = req.body as {
      userId?: string; tier?: string; name?: string; email?: string; note?: string;
    };
    if (!userId || !tier || !PRICES[tier]) {
      return res.status(400).json({ error: "userId and valid tier required" });
    }

    const price = PRICES[tier];
    const who = name ? `${name}${email ? ` (${email})` : ""}` : email || `User ${userId.substring(0, 8)}`;

    // ── Abuse checks ────────────────────────────────────────────────────────────

    // Pull the full payment history for this userId
    const history = await db.select().from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.userId, userId))
      .orderBy(desc(paymentRequestsTable.createdAt));

    // 1. Block if they already have an active unconfirmed payment right now
    const activePayment = history.find(p => p.status === "activated");
    if (activePayment) {
      return res.status(400).json({
        error: "You already have a pending subscription request. Your account will be activated once your transfer is confirmed, or automatically cancelled after 48 hours if no payment arrives.",
      });
    }

    // 2. Count how many times they've had payments expire or get rejected
    const badHistory = history.filter(p => p.status === "expired" || p.status === "rejected");

    // Hard block — two or more failures → locked out, Garry notified
    if (badHistory.length >= 2) {
      await db.insert(siriusNotifications).values({
        title: `🚫 Blocked subscription attempt — repeat offender`,
        message: `${who} (userId: ${userId.substring(0, 8)}) tried to sign up for ${price.label} but has been blocked.\n\nThey have ${badHistory.length} previous expired/rejected payment(s) on record. Their account has NOT been upgraded.\n\nIf this is a genuine customer, you can manually confirm a payment in Star Lab to unlock them.`,
        type: "payment",
        urgency: "high",
        read: false,
        sentEmail: false,
      });
      return res.status(403).json({
        error: "We were unable to process your subscription request. Please contact support.",
      });
    }

    // ── All checks passed — proceed with activation ──────────────────────────

    const reference = `SIRIUS-${userId.substring(0, 8).toUpperCase()}-${tier.toUpperCase()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

    await db.insert(paymentRequestsTable).values({
      userId, tier, amount: price.amount, name, email, note, reference,
      status: "activated",
      activatedAt: now,
      expiresAt,
    });

    // Auto-activate immediately — the user said they've paid
    await db.insert(userProfilesTable)
      .values({ userId, aiName: "Sirius", subscriptionTier: tier })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { subscriptionTier: tier },
      });

    // Star Lab notification — flag if this is a first-time suspect (1 prior failure)
    const isFirstOffender = badHistory.length === 1;
    const warningLine = isFirstOffender
      ? `\n\n⚠️ WARNING: This user had a previous payment that expired or was rejected. Watch this one closely.`
      : "";

    await db.insert(siriusNotifications).values({
      title: isFirstOffender
        ? `⚠️ New subscription (flagged) — ${price.label}`
        : `💰 New subscription — ${price.label}`,
      message: `${who} has subscribed to ${price.label} (${price.amount}/month).\n\nReference: ${reference}\nCheck your Mettle account and confirm the transfer in Star Lab within 48 hours, or their account will automatically revert to free.${warningLine}`,
      type: "payment",
      urgency: isFirstOffender ? "high" : "high",
      read: false,
      sentEmail: false,
    });

    return res.json({ success: true, reference, amount: price.amount, label: price.label });
  } catch (err: any) {
    console.error("Payment request error:", err.message);
    return res.status(500).json({ error: "Failed to process payment request" });
  }
});

// POST /api/payment/:id/confirm — Garry confirms the bank transfer arrived (PIN-protected)
router.post("/payment/:id/confirm", labPinGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid payment ID" });

    const [payment] = await db.select().from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.id, id))
      .limit(1);

    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.confirmedAt) return res.json({ ok: true, alreadyConfirmed: true });

    await db.update(paymentRequestsTable)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(paymentRequestsTable.id, id));

    // If the account was expired/downgraded, restore it now that Garry confirmed manually
    await db.update(userProfilesTable)
      .set({ subscriptionTier: payment.tier })
      .where(eq(userProfilesTable.userId, payment.userId));

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/all — list all payment records (Star Lab, PIN-protected)
router.get("/payment/all", labPinGuard, async (_req, res) => {
  try {
    const rows = await db.select().from(paymentRequestsTable)
      .orderBy(desc(paymentRequestsTable.createdAt))
      .limit(50);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/pending — kept for backwards compat, PIN-protected
router.get("/payment/pending", labPinGuard, async (_req, res) => {
  try {
    const rows = await db.select().from(paymentRequestsTable)
      .orderBy(desc(paymentRequestsTable.createdAt))
      .limit(20);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
