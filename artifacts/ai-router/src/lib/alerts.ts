import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

const DEFAULT_THRESHOLD_USD = 5.00;

export async function checkSpendAlert(customerId: number, balanceUsd: number): Promise<void> {
  const [customer] = await db
    .select({
      email:               schema.customers.email,
      spendAlertThreshold: schema.customers.spendAlertThreshold,
      spendAlertSentAt:    schema.customers.spendAlertSentAt,
    })
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1);

  if (!customer) return;

  const threshold = customer.spendAlertThreshold
    ? Number(customer.spendAlertThreshold)
    : DEFAULT_THRESHOLD_USD;

  if (balanceUsd > threshold) return;

  // Only send once per 24 hours
  if (customer.spendAlertSentAt) {
    const hoursSince = (Date.now() - new Date(customer.spendAlertSentAt).getTime()) / 3_600_000;
    if (hoursSince < 24) return;
  }

  await sendResendAlert(customer.email, balanceUsd, threshold);

  await db
    .update(schema.customers)
    .set({ spendAlertSentAt: new Date() })
    .where(eq(schema.customers.id, customerId));
}

async function sendResendAlert(email: string, balanceUsd: number, threshold: number): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(`[alerts] ⚠️  Low balance for ${email}: $${balanceUsd.toFixed(2)} remaining — set RESEND_API_KEY to send email alerts`);
    return;
  }

  const topUpUrl = "https://sirius-ai.live/dashboard/billing";
  const balanceFormatted = balanceUsd.toFixed(2);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 0">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#13131a;border:1px solid #2a2a38;border-radius:16px;overflow:hidden">
        <tr>
          <td style="background:linear-gradient(135deg,#f97316,#ef4444);padding:24px 32px">
            <p style="margin:0;color:#fff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase">Sirius AI Router</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800">⚠️ Low balance warning</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#8888aa;font-size:15px;line-height:1.6">
              Your Sirius Router credit balance has dropped below <strong style="color:#e2e2f0">$${threshold.toFixed(2)}</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;border:1px solid #2a2a38;border-radius:12px;margin:20px 0">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0;color:#8888aa;font-size:13px;text-transform:uppercase;letter-spacing:.8px">Current balance</p>
                  <p style="margin:8px 0 0;color:#f97316;font-size:36px;font-weight:800;letter-spacing:-1px">$${balanceFormatted}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;color:#8888aa;font-size:15px;line-height:1.6">
              When your balance reaches <strong style="color:#e2e2f0">$0.00</strong>, API calls will stop being processed. Top up now to avoid any interruption.
            </p>
            <a href="${topUpUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
              Top up your balance →
            </a>
            <p style="margin:28px 0 0;color:#55556a;font-size:13px;line-height:1.6">
              You'll receive a maximum of one alert per 24 hours.<br/>
              To change your alert threshold, visit your <a href="${topUpUrl}" style="color:#6366f1">billing settings</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a38">
            <p style="margin:0;color:#55556a;font-size:12px">
              Sirius AI Router · <a href="https://sirius-ai.live" style="color:#55556a">sirius-ai.live</a>
              · You're receiving this because you have a Sirius Router account at ${email}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `⚠️ Low balance warning — Sirius AI Router

Your credit balance has dropped below $${threshold.toFixed(2)}.

Current balance: $${balanceFormatted}

When your balance reaches $0.00, API calls will stop. Top up now:
${topUpUrl}

You'll receive a maximum of one alert per 24 hours.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "Sirius AI Router <alerts@sirius-ai.live>",
        to:      [email],
        subject: `⚠️ Low balance: $${balanceFormatted} remaining — Sirius AI Router`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[alerts] Resend error ${res.status}:`, body);
      return;
    }

    console.log(`[alerts] ✅ Low-balance alert sent to ${email} (balance: $${balanceFormatted})`);
  } catch (err: any) {
    console.error("[alerts] Failed to send alert:", err?.message);
  }
}
