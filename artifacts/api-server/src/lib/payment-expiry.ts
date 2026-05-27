import { db, paymentRequestsTable, userProfilesTable, siriusNotifications } from "@workspace/db";
import { eq, and, lt, isNull } from "drizzle-orm";

const ALERT_HOURS = 48;

export function startPaymentExpiryJob() {
  // Run once at startup, then every hour
  runExpiryCheck();
  setInterval(runExpiryCheck, 60 * 60 * 1000);
}

async function runExpiryCheck() {
  try {
    const now = new Date();

    // Find payments that are still "activated" (unconfirmed) and past the alert window
    // We do NOT auto-revert — bank transfers can take longer than 48hrs.
    // Instead we alert Garry so he can manually confirm or cancel.
    const overdue = await db
      .select()
      .from(paymentRequestsTable)
      .where(
        and(
          eq(paymentRequestsTable.status, "activated"),
          isNull(paymentRequestsTable.confirmedAt),
          lt(paymentRequestsTable.expiresAt, now)
        )
      );

    for (const payment of overdue) {
      try {
        // Mark as "overdue" so we stop re-alerting, but do NOT touch the user's subscription
        await db
          .update(paymentRequestsTable)
          .set({ status: "overdue" })
          .where(eq(paymentRequestsTable.id, payment.id));

        const who = payment.name
          ? `${payment.name}${payment.email ? ` (${payment.email})` : ""}`
          : payment.email || `User ${payment.userId.substring(0, 8)}`;

        // Alert Garry — he decides whether to confirm or cancel
        await db.insert(siriusNotifications).values({
          title: `⚠️ Bank transfer overdue — please check`,
          message: `${who}'s ${payment.tier.toUpperCase()} subscription (${payment.amount}/month) has not been confirmed yet.\n\nReference: ${payment.reference}\nThey signed up ${new Date(payment.createdAt).toLocaleString("en-GB")} — it has been over ${ALERT_HOURS} hours.\n\nTheir account remains active. Please check your Mettle account and confirm or cancel this payment manually in Star Lab.`,
          type: "payment",
          urgency: "high",
          read: false,
          sentEmail: false,
        });

        console.log(`[Payment Expiry] Overdue alert sent for payment ${payment.id} — user account kept active`);
      } catch (err: any) {
        console.error(`[Payment Expiry] Failed to process overdue payment ${payment.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[Payment Expiry] Check failed:", err.message);
  }
}
