import { Router } from "express";
import { db } from "@workspace/db";
import { paymentRequestsTable, userProfilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

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

// POST /api/payment/request — log a payment request
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
    const [row] = await db.insert(paymentRequestsTable).values({
      userId, tier, amount: price.amount, name, email, note, reference, status: "pending",
    }).returning();
    return res.json({ success: true, reference, amount: price.amount, label: price.label });
  } catch (err: any) {
    console.error("Payment request error:", err.message);
    return res.status(500).json({ error: "Failed to log payment request" });
  }
});

// GET /api/payment/pending — list pending payments (owner only — Star Lab)
router.get("/payment/pending", async (_req, res) => {
  try {
    const rows = await db.select().from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.status, "pending"))
      .orderBy(desc(paymentRequestsTable.createdAt));
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/activate — owner activates a pending payment
router.post("/payment/activate", async (req, res) => {
  try {
    const { id } = req.body as { id?: number };
    if (!id) return res.status(400).json({ error: "id required" });
    const [row] = await db.select().from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });

    await db.update(paymentRequestsTable)
      .set({ status: "activated", activatedAt: new Date() })
      .where(eq(paymentRequestsTable.id, id));

    await db.insert(userProfilesTable)
      .values({ userId: row.userId, aiName: "Sirius", subscriptionTier: row.tier })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { subscriptionTier: row.tier },
      });

    return res.json({ success: true, userId: row.userId, tier: row.tier });
  } catch (err: any) {
    console.error("Activate payment error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/reject — owner rejects/cancels a payment request
router.post("/payment/reject", async (req, res) => {
  try {
    const { id } = req.body as { id?: number };
    if (!id) return res.status(400).json({ error: "id required" });
    await db.update(paymentRequestsTable)
      .set({ status: "rejected" })
      .where(eq(paymentRequestsTable.id, id));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
