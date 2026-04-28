import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { paymentRequestsTable, userProfilesTable, siriusNotifications } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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
  plus: { amount: "£5.00", label: "Sirius Plus" },
  pro: { amount: "£12.00", label: "Sirius Pro" },
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
    const reference = `SIRIUS-${userId.substring(0, 8).toUpperCase()}-${tier.toUpperCase()}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

    // Log the request with 48-hour expiry window
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

    // Star Lab notification for Garry
    const who = name ? `${name}${email ? ` (${email})` : ""}` : email || `User ${userId.substring(0, 8)}`;
    await db.insert(siriusNotifications).values({
      title: `💰 New subscription — ${price.label}`,
      message: `${who} has subscribed to ${price.label} (${price.amount}/month).\n\nReference: ${reference}\nCheck your Mettle account and confirm the transfer in Star Lab within 48 hours, or their account will automatically revert to free.`,
      type: "payment",
      urgency: "high",
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

// GET /api/payment/pending — kept for backwards compat (now returns "activated" ones for review), PIN-protected
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
