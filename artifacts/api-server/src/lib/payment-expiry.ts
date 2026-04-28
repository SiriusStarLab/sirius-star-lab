import { db, paymentRequestsTable, userProfilesTable, siriusNotifications } from "@workspace/db";
import { eq, and, lt, isNull } from "drizzle-orm";

const EXPIRY_HOURS = 48;

export function startPaymentExpiryJob() {
  // Run once at startup, then every hour
  runExpiryCheck();
  setInterval(runExpiryCheck, 60 * 60 * 1000);
}

async function runExpiryCheck() {
  try {
    const now = new Date();

    // Find payments that are still "activated" (unconfirmed) and past their expiry
    const expired = await db
      .select()
      .from(paymentRequestsTable)
      .where(
        and(
          eq(paymentRequestsTable.status, "activated"),
          isNull(paymentRequestsTable.confirmedAt),
          lt(paymentRequestsTable.expiresAt, now)
        )
      );

    for (const payment of expired) {
      try {
        // Downgrade user back to free
        await db
          .update(userProfilesTable)
          .set({ subscriptionTier: "free" })
          .where(eq(userProfilesTable.userId, payment.userId));

        // Mark payment as expired
        await db
          .update(paymentRequestsTable)
          .set({ status: "expired" })
          .where(eq(paymentRequestsTable.id, payment.id));

        // Notify Garry in Star Lab
        const who = payment.name
          ? `${payment.name}${payment.email ? ` (${payment.email})` : ""}`
          : payment.email || `User ${payment.userId.substring(0, 8)}`;

        await db.insert(siriusNotifications).values({
          title: `⚠️ Subscription expired — no transfer received`,
          message: `${who}'s ${payment.tier.toUpperCase()} subscription (${payment.amount}/month) has been automatically cancelled.\n\nReference: ${payment.reference}\nThey signed up ${new Date(payment.createdAt).toLocaleString("en-GB")} but no bank transfer arrived within ${EXPIRY_HOURS} hours.\n\nTheir account has been returned to the free tier.`,
          type: "payment",
          urgency: "high",
          read: false,
          sentEmail: false,
        });

        console.log(`[Payment Expiry] Expired payment ${payment.id} for user ${payment.userId}`);
      } catch (err: any) {
        console.error(`[Payment Expiry] Failed to expire payment ${payment.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[Payment Expiry] Check failed:", err.message);
  }
}
