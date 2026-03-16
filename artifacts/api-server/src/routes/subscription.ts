import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/subscription/activate", async (req, res) => {
  try {
    const { userId, subscriptionId, tier } = req.body;

    if (!userId || !subscriptionId || !tier) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["plus", "pro"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (clientId && clientSecret) {
      try {
        const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: "grant_type=client_credentials",
        });
        const tokenData = await tokenRes.json() as any;

        const subRes = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
          headers: { "Authorization": `Bearer ${tokenData.access_token}` },
        });
        const subData = await subRes.json() as any;

        if (subData.status !== "ACTIVE") {
          return res.status(400).json({ error: "Subscription not active" });
        }
      } catch (verifyErr) {
        console.error("PayPal verification error:", verifyErr);
      }
    }

    await db
      .insert(userProfilesTable)
      .values({
        userId,
        aiName: "Sirius",
        subscriptionTier: tier,
        paypalSubscriptionId: subscriptionId,
      })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: {
          subscriptionTier: tier,
          paypalSubscriptionId: subscriptionId,
        },
      });

    return res.json({ success: true, tier });
  } catch (err) {
    console.error("Subscription activation error:", err);
    return res.status(500).json({ error: "Failed to activate subscription" });
  }
});

router.get("/subscription/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [profile] = await db
      .select({
        subscriptionTier: userProfilesTable.subscriptionTier,
        paypalSubscriptionId: userProfilesTable.paypalSubscriptionId,
        dailyMessageCount: userProfilesTable.dailyMessageCount,
      })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));

    const tier = profile?.subscriptionTier || "free";
    const dailyCount = parseInt(profile?.dailyMessageCount || "0", 10);

    const limits = { free: 30, plus: 200, pro: Infinity };
    const limit = limits[tier as keyof typeof limits] ?? 30;

    return res.json({
      tier,
      dailyMessageCount: dailyCount,
      dailyLimit: limit === Infinity ? null : limit,
      canSendMessage: dailyCount < limit,
    });
  } catch (err) {
    console.error("Get subscription error:", err);
    return res.status(500).json({ error: "Failed to get subscription" });
  }
});

export default router;
