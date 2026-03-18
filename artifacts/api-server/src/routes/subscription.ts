import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/subscription/:userId — returns current tier and daily usage
router.get("/subscription/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [profile] = await db
      .select({
        subscriptionTier: userProfilesTable.subscriptionTier,
        stripeCustomerId: userProfilesTable.stripeCustomerId,
        dailyMessageCount: userProfilesTable.dailyMessageCount,
      })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));

    const tier = profile?.subscriptionTier || "free";
    const dailyCount = parseInt(profile?.dailyMessageCount || "0", 10);

    const limits: Record<string, number | null> = { free: 10, plus: 200, pro: null };
    const limit = limits[tier] ?? 10;

    return res.json({
      tier,
      dailyMessageCount: dailyCount,
      dailyLimit: limit,
      canSendMessage: limit === null || dailyCount < limit,
      hasStripeCustomer: !!profile?.stripeCustomerId,
    });
  } catch (err) {
    console.error("Get subscription error:", err);
    return res.status(500).json({ error: "Failed to get subscription" });
  }
});

export default router;
