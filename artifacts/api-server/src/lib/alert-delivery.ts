import nodemailer from "nodemailer";

const DEFAULT_ALERT_RECIPIENT = "support@sirius-ai.live";

export interface AlertMessage {
  subject: string;
  text: string;
  html?: string;
}

export interface DeliveryResult {
  ok: boolean;
  channel: "resend" | "smtp" | "none";
  error?: string;
}

function recipients(): string[] {
  return (process.env.SIRIUS_ALERT_EMAILS || DEFAULT_ALERT_RECIPIENT)
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL
    || process.env.SMTP_FROM
    || process.env.SMTP_USER
    || "Sirius Monitoring <onboarding@resend.dev>";
}

export async function sendAlertEmail(message: AlertMessage): Promise<DeliveryResult> {
  const to = recipients();
  if (to.length === 0) return { ok: false, channel: "none", error: "No alert recipients configured" };

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import("resend");
      const result = await new Resend(resendKey).emails.send({
        from: fromAddress(),
        to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      if (result.error) {
        return { ok: false, channel: "resend", error: result.error.message };
      }
      return { ok: true, channel: "resend" };
    } catch (error: any) {
      return { ok: false, channel: "resend", error: error?.message || "Resend delivery failed" };
    }
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: fromAddress(),
        to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return { ok: true, channel: "smtp" };
    } catch (error: any) {
      return { ok: false, channel: "smtp", error: error?.message || "SMTP delivery failed" };
    }
  }

  return {
    ok: false,
    channel: "none",
    error: "No email provider configured (RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS)",
  };
}