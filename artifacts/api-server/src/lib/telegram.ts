import { db, siriusConfig } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSiriusConfigValue, setSiriusConfigValue } from "./sirius-automation.js";

const TG_API = "https://api.telegram.org/bot";

function getToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

export async function sendTelegramMessage(text: string, chatId?: string): Promise<{ ok: boolean; error?: string }> {
  const token = getToken();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  const target = chatId ?? await getSiriusConfigValue("telegram_chat_id");
  if (!target) return { ok: false, error: "No Telegram chat ID configured. Message the bot first, then run /telegram setup." };

  try {
    const res = await fetch(`${TG_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: target, text, parse_mode: "Markdown" }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json() as any;
    if (!data.ok) return { ok: false, error: data.description };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function getLatestChatId(): Promise<{ chatId: string; username: string } | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${TG_API}${token}/getUpdates?limit=10&allowed_updates=["message"]`);
    const data = await res.json() as any;
    if (!data.ok || !data.result?.length) return null;

    const latest = data.result[data.result.length - 1];
    const msg = latest.message;
    if (!msg) return null;

    return {
      chatId: String(msg.chat.id),
      username: msg.from?.username ?? msg.from?.first_name ?? "unknown",
    };
  } catch {
    return null;
  }
}

export async function setupTelegram(): Promise<string> {
  const token = getToken();
  if (!token) return "❌ TELEGRAM_BOT_TOKEN is not set on the server. Add it to the server .env file and restart.";

  const update = await getLatestChatId();
  if (!update) {
    return [
      "📱 **Telegram Setup**",
      "",
      "I couldn't find any messages to your bot yet.",
      "",
      "1. Open Telegram and search for your bot by username",
      "2. Send it any message (e.g. `/start`)",
      "3. Come back here and say **'set up telegram'** again",
    ].join("\n");
  }

  await setSiriusConfigValue("telegram_chat_id", update.chatId);

  const test = await sendTelegramMessage("✅ *Sirius is connected.* You'll receive notifications here.", update.chatId);
  if (!test.ok) return `❌ Found your chat (${update.username}) but couldn't send a test message: ${test.error}`;

  return [
    `✅ **Telegram connected for @${update.username}**`,
    "",
    "I've sent you a test message. From now on I'll push notifications here for:",
    "• New paying users",
    "• Automation alerts",
    "• System errors",
    "• Anything you ask me to notify you about",
    "",
    "You can also ask me to send yourself a message any time.",
  ].join("\n");
}

export async function isTelegramConfigured(): Promise<boolean> {
  const chatId = await getSiriusConfigValue("telegram_chat_id");
  return !!chatId && !!getToken();
}

export async function sendTelegram(message: string, _severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO'): Promise<void> {
  await sendTelegramMessage(message);
}
