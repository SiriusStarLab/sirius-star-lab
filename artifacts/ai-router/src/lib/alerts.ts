import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

const ALERT_THRESHOLD_USD = 5.00; // alert when balance drops below $5

export async function checkSpendAlert(customerId: number, balanceUsd: number): Promise<void> {
  if (balanceUsd > ALERT_THRESHOLD_USD) return;

  const [customer] = await db
    .select({ email: schema.customers.email, spendAlertSentAt: schema.customers.spendAlertSentAt })
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1);

  if (!customer) return;

  // Only send once per 24 hours
  if (customer.spendAlertSentAt) {
    const hoursSince = (Date.now() - new Date(customer.spendAlertSentAt).getTime()) / 3_600_000;
    if (hoursSince < 24) return;
  }

  await sendAlert(customer.email, balanceUsd);

  await db
    .update(schema.customers)
    .set({ spendAlertSentAt: new Date() })
    .where(eq(schema.customers.id, customerId));
}

async function sendAlert(email: string, balanceUsd: number): Promise<void> {
  // If SMTP_FROM + SMTP_HOST configured, send real email. Otherwise log.
  const smtpHost = process.env.SMTP_HOST;
  const smtpFrom = process.env.SMTP_FROM;

  if (!smtpHost || !smtpFrom) {
    console.warn(`[alerts] ⚠️ Low balance for ${email}: $${balanceUsd.toFixed(2)} remaining — configure SMTP to send email`);
    return;
  }

  // nodemailer-style send (only if nodemailer installed)
  try {
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) { console.warn("[alerts] nodemailer not installed — skipping email"); return; }

    const transport = nodemailer.default.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transport.sendMail({
      from: smtpFrom,
      to: email,
      subject: "⚠️ Low API credits — Sirius AI Router",
      text: `Your Sirius AI Router balance is low: $${balanceUsd.toFixed(2)} remaining.\n\nTop up at https://api.sirius-ai.live/dashboard/billing`,
    });

    console.log(`[alerts] ✅ Low-balance alert sent to ${email}`);
  } catch (err: any) {
    console.error("[alerts] Failed to send email:", err?.message);
  }
}
