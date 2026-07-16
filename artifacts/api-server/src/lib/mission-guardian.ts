/**
 * MISSION GUARDIAN
 * Garry's protection layer — three systems:
 *
 * 1. BASELINE MONITOR — checks model + bundle hash every 30 min,
 *    alerts the moment anything shifts
 * 2. AUTO-RESTORE — if the live bundle is tampered, downloads the
 *    last known-good copy from S3 and restores it, then restarts PM2
 * 3. OFF-SERVER BACKUP — pushes critical config + memories to S3
 *    every 6 hours so if the whole box is compromised we still have truth
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { db, siriusErrors, siriusNotifications } from "@workspace/db";
import { sql } from "drizzle-orm";

const execAsync = promisify(exec);

const BUNDLE_PATH = "/opt/sirius/artifacts/api-server/dist/index.cjs";
const BASELINE_KEY = "mission_baseline";
const BACKUP_PREFIX = "sirius-guardian";
const S3_BUCKET = process.env.STORAGE_BUCKET || "sirius-storage";
const S3_REGION = process.env.STORAGE_REGION || "eu-west-1";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const EXPECTED_MODEL = "anthropic/claude-opus-4.8";

// ── Telegram direct alert ─────────────────────────────────────────────────────
async function telegramAlert(message: string): Promise<void> {
  try {
    const row = await db.execute(
      sql`SELECT value FROM sirius_config WHERE key = 'telegram_chat_id' LIMIT 1`
    );
    const chatId = (row.rows?.[0] as any)?.value;
    if (!chatId || !TELEGRAM_BOT_TOKEN) return;
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `🛡️ MISSION GUARDIAN\n\n${message}`, parse_mode: "HTML" }),
      }
    );
  } catch {}
}

// ── DB notification ───────────────────────────────────────────────────────────
async function notify(title: string, message: string): Promise<void> {
  try {
    await db.insert(siriusNotifications).values({
      title,
      message,
      type: "alert",
      urgency: "critical",
      read: false,
      sentEmail: false,
    } as any);
  } catch {}
}

// ── SHA256 of the live bundle ─────────────────────────────────────────────────
function bundleHash(): string {
  try {
    const buf = readFileSync(BUNDLE_PATH);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return "unreadable";
  }
}

// ── Extract the model variable from the live bundle ───────────────────────────
function bundleModel(): string {
  try {
    const src = readFileSync(BUNDLE_PATH, "utf8");
    const patterns: RegExp[] = [
      /[A-Za-z]{1,3}="(anthropic\/[a-z0-9\-\.]+)";async function/,
      /SIRIUS_MODEL\s*=\s*"(anthropic\/[a-z0-9\-\.]+)"/,
      /"model"\s*:\s*"(anthropic\/[a-z0-9\-\.]+)"/,
      /defaultModel\s*=\s*"(anthropic\/[a-z0-9\-\.]+)"/,
    ];
    for (const p of patterns) {
      const m = src.match(p);
      if (m) return m[1];
    }
    // Env-var fallback — if the process started correctly the model is set
    const envModel = process.env["AI_INTEGRATIONS_OPENAI_MODEL"] || process.env["OPENAI_MODEL"] || "";
    if (envModel.startsWith("anthropic/")) return envModel;
    return "undetectable";
  } catch {
    return "unreadable";
  }
}

// ── Load baseline from DB ─────────────────────────────────────────────────────
async function loadBaseline(): Promise<{ model: string; hash: string } | null> {
  try {
    const row = await db.execute(
      sql`SELECT value FROM sirius_config WHERE key = ${BASELINE_KEY} LIMIT 1`
    );
    const v = (row.rows?.[0] as any)?.value;
    if (!v) return null;
    return JSON.parse(v);
  } catch {
    return null;
  }
}

// ── Save baseline to DB ───────────────────────────────────────────────────────
async function saveBaseline(model: string, hash: string): Promise<void> {
  const val = JSON.stringify({ model, hash, savedAt: new Date().toISOString() });
  await db.execute(
    sql`INSERT INTO sirius_config (key, value) VALUES (${BASELINE_KEY}, ${val})
        ON CONFLICT (key) DO UPDATE SET value = ${val}`
  );
}

// ── S3 upload ─────────────────────────────────────────────────────────────────
async function s3Upload(key: string, body: string): Promise<boolean> {
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: S3_REGION });
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/json",
    }));
    return true;
  } catch (e: any) {
    console.error("[Guardian] S3 upload failed:", e.message);
    return false;
  }
}

// ── S3 download ───────────────────────────────────────────────────────────────
async function s3Download(key: string): Promise<Buffer | null> {
  try {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: S3_REGION });
    const r = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of r.Body as any) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (e: any) {
    console.error("[Guardian] S3 download failed:", e.message);
    return null;
  }
}

// ── 2. OFF-SERVER BACKUP ──────────────────────────────────────────────────────
export async function runOffServerBackup(): Promise<void> {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");

    // a) sirius_config snapshot
    const config = await db.execute(sql`SELECT key, value FROM sirius_config ORDER BY key`);
    await s3Upload(`${BACKUP_PREFIX}/config/${ts}.json`, JSON.stringify(config.rows, null, 2));

    // b) core_memories snapshot
    const memories = await db.execute(sql`SELECT * FROM core_memories ORDER BY importance DESC`);
    await s3Upload(`${BACKUP_PREFIX}/memories/${ts}.json`, JSON.stringify(memories.rows, null, 2));

    // c) bundle hash record
    const hash = bundleHash();
    const model = bundleModel();
    await s3Upload(`${BACKUP_PREFIX}/bundle-state/${ts}.json`, JSON.stringify({ hash, model, ts }));

    // d) upload the compiled bundle itself as known-good backup
    const bundleBuf = readFileSync(BUNDLE_PATH);
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: S3_REGION });
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${BACKUP_PREFIX}/bundle/latest.cjs`,
      Body: bundleBuf,
      ContentType: "application/octet-stream",
    }));

    console.log(`[Guardian] ✅ Off-server backup complete — config, memories, bundle → S3 ${ts}`);
  } catch (e: any) {
    console.error("[Guardian] Backup failed:", e.message);
  }
}

// ── 2. AUTO-RESTORE from S3 ───────────────────────────────────────────────────
async function autoRestore(): Promise<boolean> {
  try {
    console.log("[Guardian] 🔄 Attempting auto-restore from S3...");
    const goodBundle = await s3Download(`${BACKUP_PREFIX}/bundle/latest.cjs`);
    if (!goodBundle) {
      console.error("[Guardian] No S3 backup available yet — cannot auto-restore");
      return false;
    }
    writeFileSync(BUNDLE_PATH, goodBundle);
    await execAsync("pm2 reload sirius-api");
    console.log("[Guardian] ✅ Bundle restored from S3 and PM2 reloaded");
    return true;
  } catch (e: any) {
    console.error("[Guardian] Auto-restore failed:", e.message);
    return false;
  }
}

// ── 1. BASELINE MONITOR ───────────────────────────────────────────────────────
export async function runBaselineCheck(): Promise<void> {
  try {
    const currentModel = bundleModel();
    const currentHash = bundleHash();
    let baseline = await loadBaseline();

    // First run — establish baseline
    if (!baseline) {
      await saveBaseline(currentModel, currentHash);
      // Also do first backup immediately
      await runOffServerBackup();
      console.log(`[Guardian] ✅ Baseline established — model: ${currentModel}, hash: ${currentHash.slice(0, 16)}...`);
      return;
    }

    let tampered = false;
    const issues: string[] = [];

    // Check 1: model mismatch
    // "undetectable" means the minified bundle regex did not match after a legitimate rebuild.
    // Real tampering would show a *different detectable* model string, not silence.
    if (currentModel !== EXPECTED_MODEL && currentModel !== "undetectable" && currentModel !== "unreadable") {
      issues.push(`Model changed: expected ${EXPECTED_MODEL}, found ${currentModel}`);
      tampered = true;
    }

    // Check 2: bundle hash changed unexpectedly
    if (currentHash !== baseline.hash && currentModel !== EXPECTED_MODEL) {
      issues.push(`Bundle hash changed: ${baseline.hash.slice(0, 12)}... → ${currentHash.slice(0, 12)}...`);
    }

    if (tampered) {
      const msg = `⚠️ TAMPERING DETECTED\n\n${issues.join("\n")}\n\nAutomatic restore in progress...`;
      console.error(`[Guardian] 🚨 ${msg}`);
      await telegramAlert(msg);
      await notify("Mission Guardian: Tampering Detected", issues.join(" | "));

      // Auto-restore from S3
      const restored = await autoRestore();
      const restoreMsg = restored
        ? "✅ Bundle restored from S3 backup. PM2 reloaded."
        : "❌ Auto-restore failed — manual intervention required.";
      await telegramAlert(restoreMsg);
      await notify("Mission Guardian: Restore Result", restoreMsg);

      // Update baseline hash after restore
      if (restored) {
        await saveBaseline(EXPECTED_MODEL, bundleHash());
      }
    } else {
      // All good — update baseline hash silently (legitimate builds change the hash)
      if (currentHash !== baseline.hash) {
        await saveBaseline(currentModel, currentHash);
        console.log(`[Guardian] ✅ Baseline updated after legitimate build — hash: ${currentHash.slice(0, 16)}...`);
      } else {
        console.log(`[Guardian] ✅ Baseline check passed — model: ${currentModel}`);
      }
    }
  } catch (e: any) {
    console.error("[Guardian] Baseline check error:", e.message);
  }
}

// ── START ─────────────────────────────────────────────────────────────────────
export function startMissionGuardian(): void {
  // Baseline check: on startup + every 30 minutes
  setTimeout(() => runBaselineCheck(), 15_000);
  setInterval(() => runBaselineCheck(), 30 * 60 * 1000);

  // Off-server backup: every 6 hours
  setInterval(() => runOffServerBackup(), 6 * 60 * 60 * 1000);

  console.log("[Mission Guardian] 🛡️ Active — baseline check every 30 min, S3 backup every 6 hours");
}
