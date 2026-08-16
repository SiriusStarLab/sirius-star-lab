/**
 * Sirius Approval Gate
 *
 * Any autonomous code modification MUST call requireGarryApproval() first.
 * It sends Garry a Telegram message, then waits up to 10 minutes for a
 * YES or NO reply. If no reply arrives, the change is blocked automatically.
 *
 * Garry approves by replying "YES" (or "YES [any text]") to the Telegram bot.
 * Garry blocks by replying "NO" (or "NO [any text]").
 */

import { sendTelegramMessage } from "./telegram.js";

const TG_API = "https://api.telegram.org/bot";
const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 10 * 60 * 1_000; // 10 minutes

function getToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

async function getSiriusConfigValue(key: string): Promise<string | null> {
  try {
    const { db, siriusConfig } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(siriusConfig).where(eq(siriusConfig.key, key));
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Get the highest Telegram update_id currently in the bot's queue */
async function getCurrentUpdateOffset(): Promise<number> {
  const token = getToken();
  if (!token) return 0;
  try {
    const res = await fetch(`${TG_API}${token}/getUpdates?limit=100&allowed_updates=["message"]`);
    const data = await res.json() as any;
    if (!data.ok || !data.result?.length) return 0;
    const ids: number[] = data.result.map((u: any) => u.update_id as number);
    return Math.max(...ids);
  } catch {
    return 0;
  }
}

/** Poll for a Telegram message containing YES or NO after a given update offset */
async function pollTelegramForReply(
  afterOffset: number,
  deadline: number,
): Promise<"YES" | "NO" | "TIMEOUT"> {
  const token = getToken();
  if (!token) return "TIMEOUT";

  let offset = afterOffset + 1;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    try {
      const url = `${TG_API}${token}/getUpdates?offset=${offset}&limit=20&allowed_updates=["message"]`;
      const res = await fetch(url);
      const data = await res.json() as any;
      if (!data.ok || !data.result?.length) continue;

      for (const update of data.result) {
        offset = Math.max(offset, update.update_id + 1);
        const text: string = (update.message?.text ?? "").trim().toUpperCase();
        if (text === "YES" || text.startsWith("YES ")) return "YES";
        if (text === "NO"  || text.startsWith("NO "))  return "NO";
      }
    } catch {
      // network hiccup — keep polling
    }
  }

  return "TIMEOUT";
}

/**
 * Gate any autonomous code modification behind Garry's explicit approval.
 *
 * @param description  Short plain-English description of what will be changed
 * @param context      Optional extra detail (file path, reason, etc.)
 * @returns            true = approved, false = blocked/expired
 */
export async function requireGarryApproval(
  description: string,
  context: string = "",
): Promise<boolean> {
  // Record the request in DB for audit trail
  let requestId = 0;
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(sql`
      INSERT INTO sirius_approval_requests (description, context, status, requested_at)
      VALUES (${description}, ${context}, 'pending', NOW())
      RETURNING id
    `);
    requestId = (result.rows?.[0] as any)?.id ?? 0;
  } catch (e: any) {
    console.error("[ApprovalGate] DB insert failed:", e.message);
  }

  // Note the current Telegram update offset so we only look at NEW messages
  const offset = await getCurrentUpdateOffset();

  // Send the Telegram request
  const chatId = await getSiriusConfigValue("telegram_chat_id");
  const msg = [
    `🔐 *Sirius wants to modify code*`,
    ``,
    `*What:* ${description}`,
    context ? `*Detail:* ${context}` : null,
    ``,
    `Reply *YES* to approve or *NO* to block.`,
    `_Expires in 10 minutes. No reply = blocked._`,
    requestId ? `_Request #${requestId}_` : null,
  ].filter(Boolean).join("\n");

  await sendTelegramMessage(msg, chatId ?? undefined);
  console.log(`[ApprovalGate] ⏳ Waiting for Garry approval — request #${requestId}: ${description}`);

  // Poll for reply
  const deadline = Date.now() + TIMEOUT_MS;
  const reply = await pollTelegramForReply(offset, deadline);

  const approved = reply === "YES";
  const status   = reply === "YES" ? "approved" : reply === "NO" ? "rejected" : "expired";

  // Update DB record
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      UPDATE sirius_approval_requests
      SET status = ${status}, resolved_at = NOW()
      WHERE id = ${requestId}
    `);
  } catch {}

  // Notify Garry of the outcome if it expired
  if (reply === "TIMEOUT") {
    await sendTelegramMessage(
      `⏱️ Code change request #${requestId} expired — blocked automatically.\n\n_${description}_`,
      chatId ?? undefined,
    );
    console.log(`[ApprovalGate] ⏰ Request #${requestId} expired — change blocked`);
  } else {
    console.log(`[ApprovalGate] ${approved ? "✅ Approved" : "❌ Blocked"} — request #${requestId}`);
  }

  return approved;
}
