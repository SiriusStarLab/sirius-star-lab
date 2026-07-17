import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable, conversations, messages, moodCheckinsTable } from "@workspace/db";
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

    const limits: Record<string, number> = { free: 10, plus: 75, pro: 500 };
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

// DELETE /api/users/:userId — permanently deletes all user data (§5.1.1(v) compliance)
router.delete("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId required" });

    // Delete in FK order: messages → conversations → mood_checkins → user_profile
    const userConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    for (const conv of userConvs) {
      await db.delete(messages).where(eq(messages.conversationId, conv.id));
    }

    await db.delete(conversations).where(eq(conversations.userId, userId));
    await db.delete(moodCheckinsTable).where(eq(moodCheckinsTable.userId, userId));
    await db.delete(userProfilesTable).where(eq(userProfilesTable.userId, userId));

    return res.json({ success: true, message: "Account and all data permanently deleted." });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
