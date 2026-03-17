import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/stripe/links — return Stripe Payment Link URLs from env vars
router.get("/stripe/links", (_req, res) => {
  const plusLink = process.env.STRIPE_PLUS_LINK ?? null;
  const proLink = process.env.STRIPE_PRO_LINK ?? null;
  return res.json({ plusLink, proLink });
});

// POST /api/stripe/activate — called from success page to activate a tier
// The tier is encoded in the Stripe Payment Link's redirect URL params
router.post("/stripe/activate", async (req, res) => {
  try {
    const { userId, tier } = req.body as { userId?: string; tier?: string };
    if (!userId || !tier || !["plus", "pro"].includes(tier)) {
      return res.status(400).json({ error: "userId and valid tier required" });
    }

    await db
      .insert(userProfilesTable)
      .values({ userId, aiName: "Sirius", subscriptionTier: tier })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { subscriptionTier: tier },
      });

    return res.json({ success: true, tier });
  } catch (err: any) {
    console.error("Activate tier error:", err.message);
    return res.status(500).json({ error: "Failed to activate tier" });
  }
});

export default router;
