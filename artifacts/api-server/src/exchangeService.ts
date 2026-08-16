/**
 * Sirius Exchange partner integration.
 * Issues one-time Star Lab unlock codes from siriusexchange.net after a Pro purchase.
 * Called SERVER-SIDE ONLY — the partner key must never reach the browser.
 */

const EXCHANGE_ENDPOINT = "https://siriusexchange.net/api/public/star-lab/issue-code";
const RETRY_DELAY_MS = 5_000;

async function callExchangeAPI(
  partnerKey: string,
  email: string,
  reference: string,
): Promise<{ code: string } | { retryable: true } | { fatal: true }> {
  let res: Response;
  try {
    res = await fetch(EXCHANGE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-partner-key": partnerKey,
      },
      body: JSON.stringify({ email, reference }),
    });
  } catch (err) {
    console.error("[Exchange] Network error:", err);
    return { retryable: true };
  }

  if (res.status === 200) {
    const data = (await res.json()) as { code: string };
    return { code: data.code };
  }
  if (res.status === 401) {
    console.error("[Exchange] 401 — invalid partner key. Check STAR_EXCHANGE_PARTNER_KEY.");
    return { fatal: true };
  }
  if (res.status === 429) {
    console.warn("[Exchange] 429 — rate limited (max 60/hr). Will retry.");
    return { retryable: true };
  }
  // 500 or other
  console.warn(`[Exchange] ${res.status} response — will retry.`);
  return { retryable: true };
}

/**
 * Issues a Star Lab unlock code from Sirius Exchange.
 * Retries once after RETRY_DELAY_MS on 429/500.
 * Returns the code string on success, or null if it cannot be obtained.
 */
export async function issueExchangeCode(
  email: string,
  reference: string,
): Promise<string | null> {
  const partnerKey = process.env.STAR_EXCHANGE_PARTNER_KEY;
  if (!partnerKey) {
    console.error("[Exchange] STAR_EXCHANGE_PARTNER_KEY is not set — cannot issue code.");
    return null;
  }

  const result = await callExchangeAPI(partnerKey, email, reference);

  if ("code" in result) return result.code;
  if ("fatal" in result) return null;

  // Retryable — wait and try once more
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  const retry = await callExchangeAPI(partnerKey, email, reference);
  if ("code" in retry) return retry.code;

  console.error("[Exchange] Failed after retry — giving up.");
  return null;
}

/**
 * Sends the exchange code to the customer via Resend.
 * Fails silently so a Resend issue never blocks the webhook response.
 */
export async function emailExchangeCode(
  toEmail: string,
  code: string,
  reference = "",
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !toEmail) return;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from =
      process.env.RESEND_FROM_EMAIL || "Sirius <onboarding@resend.dev>";

    await resend.emails.send({
      from,
      to: toEmail,
      subject: "Your Sirius Exchange unlock code 🔑",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#080c1a;font-family:system-ui,sans-serif;color:#fff;">
  <div style="max-width:520px;margin:40px auto;padding:40px 32px;background:#0d1225;border-radius:16px;border:1px solid rgba(245,158,11,0.15);">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);margin-bottom:16px;">
        <span style="font-size:28px;">⭐</span>
      </div>
      <h1 style="margin:0;font-size:24px;font-weight:800;color:#f59e0b;">Your Sirius Exchange code</h1>
    </div>

    <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin-bottom:24px;">
      Thank you for subscribing to <strong style="color:#fff;">Sirius Star Lab Pro</strong>. Your Sirius Exchange unlock code is below.
    </p>

    <div style="background:#080c1a;border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-family:monospace;">Unlock code</p>
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#f59e0b;font-family:monospace;">${code}</p>
    </div>

    <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.7;margin-bottom:8px;"><strong style="color:#fff;">How to redeem:</strong></p>
    <ol style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.9;padding-left:18px;margin:0 0 28px;">
      <li>Visit <a href="https://siriusexchange.net" style="color:#f59e0b;">siriusexchange.net</a> and log in</li>
      <li>Open the <strong style="color:#fff;">Sirius AI</strong> chat button in the bottom-right corner</li>
      <li>Enter the code above to unlock your assistant</li>
    </ol>

    <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.6;">
        ⚠️ This code is <strong style="color:rgba(255,255,255,0.6);">single-use</strong> and locks to the first account that redeems it. Keep it safe.
      </p>
    </div>

    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center;font-family:monospace;">
      Ref: ${reference}
    </p>
  </div>
</body>
</html>`,
    });

    console.log(`[Exchange] Code emailed to ${toEmail}`);
  } catch (err) {
    console.error("[Exchange] Failed to send email:", err);
  }
}
