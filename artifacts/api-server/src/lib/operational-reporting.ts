import { db, siriusErrors, siriusNotifications } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendTelegramMessage } from "./telegram.js";
import { sendAlertEmail } from "./alert-delivery.js";
import type { HealthReport } from "./health-monitor.js";

type ReportPeriod = "daily" | "weekly";

interface AggregateSignals {
  errors: number;
  unresolvedErrors: number;
  paymentRequests: number;
  activatedPayments: number;
  confirmedPayments: number;
  paymentSignals: number;
}

let started = false;

async function collectSignals(hours: number): Promise<AggregateSignals> {
  const errorRows = await db.execute(sql`
    SELECT
      COUNT(*)::int AS errors,
      COUNT(*) FILTER (WHERE resolved = false)::int AS unresolved_errors,
      COUNT(*) FILTER (
        WHERE tool_name ILIKE '%stripe%'
           OR tool_name ILIKE '%payment%'
           OR tool_name ILIKE '%webhook%'
      )::int AS payment_signals
    FROM sirius_errors
    WHERE occurred_at >= NOW() - (${hours} * INTERVAL '1 hour')
  `) as any;
  const paymentRows = await db.execute(sql`
    SELECT
      COUNT(*)::int AS payment_requests,
      COUNT(*) FILTER (WHERE status = 'activated')::int AS activated_payments,
      COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::int AS confirmed_payments
    FROM payment_requests
    WHERE created_at >= NOW() - (${hours} * INTERVAL '1 hour')
  `) as any;

  const errorsSummary = (errorRows.rows ?? errorRows)[0] ?? {};
  const paymentsSummary = (paymentRows.rows ?? paymentRows)[0] ?? {};
  return {
    errors: Number(errorsSummary.errors ?? 0),
    unresolvedErrors: Number(errorsSummary.unresolved_errors ?? 0),
    paymentRequests: Number(paymentsSummary.payment_requests ?? 0),
    activatedPayments: Number(paymentsSummary.activated_payments ?? 0),
    confirmedPayments: Number(paymentsSummary.confirmed_payments ?? 0),
    paymentSignals: Number(errorsSummary.payment_signals ?? 0),
  };
}

function latestCheck(report: HealthReport | null, name: string): string {
  const check = report?.checks.find((item) => item.name === name);
  return check ? `${check.status}${check.detail ? ` — ${check.detail}` : ""}` : "not available yet";
}

async function buildReport(period: ReportPeriod, report: HealthReport | null): Promise<string> {
  const hours = period === "daily" ? 24 : 24 * 7;
  const signals = await collectSignals(hours);
  const latest = report?.runAt ?? "not available";
  return [
    `Sirius ${period} operational summary`,
    `Window: last ${hours} hours`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `Errors: ${signals.errors} total; ${signals.unresolvedErrors} unresolved`,
    `Payment requests: ${signals.paymentRequests} total; ${signals.activatedPayments} activated; ${signals.confirmedPayments} confirmed`,
    `Payment/webhook error signals: ${signals.paymentSignals}`,
    "",
    `Latest patrol: ${report?.overall ?? "not available"} at ${latest}`,
    `AI dependency: ${latestCheck(report, "openrouter")}`,
    `AI usage/cost: ${latestCheck(report, "ai_usage")}`,
    `Stripe gateway: ${latestCheck(report, "stripe_gateway")}`,
    `Backup freshness: ${latestCheck(report, "backup_freshness")}`,
    `Infrastructure capacity: ${latestCheck(report, "infrastructure")}`,
    `Public frontend: ${latestCheck(report, "frontend")}`,
    "",
    "This is an aggregate operational report. No customer content or credentials are included.",
  ].join("\n");
}

async function deliverReport(period: ReportPeriod, report: HealthReport | null): Promise<void> {
  try {
    const text = await buildReport(period, report);
    const subject = `Sirius ${period} operational summary`;
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const email = await sendAlertEmail({
      subject,
      text,
      html: `<h2>${subject}</h2><pre style="white-space:pre-wrap">${escaped}</pre>`,
    });
    const telegram = await sendTelegramMessage(`📊 *${subject}*\n\n${text}`);
    await db.insert(siriusNotifications).values({
      title: `📊 ${subject}`,
      message: `${text}\n\nEmail: ${email.ok ? "sent" : "unavailable"}; Telegram: ${telegram.ok ? "sent" : "unavailable"}.`,
      type: "operational_report",
      urgency: "normal",
      read: false,
      sentEmail: email.ok,
    } as any);
    console.log(`[OperationalReporting] ${period} summary delivered — email=${email.ok} telegram=${telegram.ok}`);
  } catch (error: any) {
    console.error(`[OperationalReporting] ${period} summary failed:`, error?.message || error);
  }
}

export function startOperationalReporting(getHealthReport: () => HealthReport | null): void {
  if (started) return;
  started = true;
  setInterval(() => deliverReport("daily", getHealthReport()), 24 * 60 * 60 * 1000);
  setInterval(() => deliverReport("weekly", getHealthReport()), 7 * 24 * 60 * 60 * 1000);
  console.log("[OperationalReporting] Daily and weekly summaries scheduled");
}