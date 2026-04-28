#!/bin/bash
set -e
cd /opt/sirius
echo "=== Sirius Update — $(date '+%H:%M %d/%m/%Y') ==="

# ── payment.ts (security + expiry + abuse detection) ──────────────────────────
cat > artifacts/api-server/src/routes/payment.ts << 'ENDOFFILE'
import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { paymentRequestsTable, userProfilesTable, siriusNotifications } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";

const router = Router();

const EXPIRY_HOURS = 48;

function labPinGuard(req: Request, res: Response, next: NextFunction) {
  const pin = req.headers["x-lab-pin"] as string;
  const expected = process.env.STAR_LAB_PIN || "2025";
  if (!pin || pin !== expected) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  next();
}

const BANK = {
  name: "GCTH Supplies Ltd",
  account: "26359434",
  sortCode: "04-03-33",
  bank: "Mettle",
};

const PRICES: Record<string, { amount: string; label: string }> = {
  plus: { amount: "£5.00", label: "Sirius Plus" },
  pro: { amount: "£12.00", label: "Sirius Pro" },
};

router.get("/payment/bank", (_req, res) => {
  res.json(BANK);
});

router.post("/payment/request", async (req, res) => {
  try {
    const { userId, tier, name, email, note } = req.body as {
      userId?: string; tier?: string; name?: string; email?: string; note?: string;
    };
    if (!userId || !tier || !PRICES[tier]) {
      return res.status(400).json({ error: "userId and valid tier required" });
    }

    const price = PRICES[tier];
    const who = name ? `${name}${email ? ` (${email})` : ""}` : email || `User ${userId.substring(0, 8)}`;

    const history = await db.select().from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.userId, userId))
      .orderBy(desc(paymentRequestsTable.createdAt));

    const activePayment = history.find(p => p.status === "activated");
    if (activePayment) {
      return res.status(400).json({
        error: "You already have a pending subscription request. Your account will be activated once your transfer is confirmed, or automatically cancelled after 48 hours if no payment arrives.",
      });
    }

    const badHistory = history.filter(p => p.status === "expired" || p.status === "rejected");

    if (badHistory.length >= 2) {
      await db.insert(siriusNotifications).values({
        title: `🚫 Blocked subscription attempt — repeat offender`,
        message: `${who} (userId: ${userId.substring(0, 8)}) tried to sign up for ${price.label} but has been blocked.\n\nThey have ${badHistory.length} previous expired/rejected payment(s) on record. Their account has NOT been upgraded.\n\nIf this is a genuine customer, you can manually confirm a payment in Star Lab to unlock them.`,
        type: "payment",
        urgency: "high",
        read: false,
        sentEmail: false,
      });
      return res.status(403).json({
        error: "We were unable to process your subscription request. Please contact support.",
      });
    }

    const reference = `SIRIUS-${userId.substring(0, 8).toUpperCase()}-${tier.toUpperCase()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

    await db.insert(paymentRequestsTable).values({
      userId, tier, amount: price.amount, name, email, note, reference,
      status: "activated",
      activatedAt: now,
      expiresAt,
    });

    await db.insert(userProfilesTable)
      .values({ userId, aiName: "Sirius", subscriptionTier: tier })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { subscriptionTier: tier },
      });

    const isFirstOffender = badHistory.length === 1;
    const warningLine = isFirstOffender
      ? `\n\n⚠️ WARNING: This user had a previous payment that expired or was rejected. Watch this one closely.`
      : "";

    await db.insert(siriusNotifications).values({
      title: isFirstOffender ? `⚠️ New subscription (flagged) — ${price.label}` : `💰 New subscription — ${price.label}`,
      message: `${who} has subscribed to ${price.label} (${price.amount}/month).\n\nReference: ${reference}\nCheck your Mettle account and confirm the transfer in Star Lab within 48 hours, or their account will automatically revert to free.${warningLine}`,
      type: "payment",
      urgency: "high",
      read: false,
      sentEmail: false,
    });

    return res.json({ success: true, reference, amount: price.amount, label: price.label });
  } catch (err: any) {
    console.error("Payment request error:", err.message);
    return res.status(500).json({ error: "Failed to process payment request" });
  }
});

router.post("/payment/:id/confirm", labPinGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid payment ID" });

    const [payment] = await db.select().from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.id, id))
      .limit(1);

    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.confirmedAt) return res.json({ ok: true, alreadyConfirmed: true });

    await db.update(paymentRequestsTable)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(paymentRequestsTable.id, id));

    await db.update(userProfilesTable)
      .set({ subscriptionTier: payment.tier })
      .where(eq(userProfilesTable.userId, payment.userId));

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/payment/all", labPinGuard, async (_req, res) => {
  try {
    const rows = await db.select().from(paymentRequestsTable)
      .orderBy(desc(paymentRequestsTable.createdAt))
      .limit(50);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/payment/pending", labPinGuard, async (_req, res) => {
  try {
    const rows = await db.select().from(paymentRequestsTable)
      .orderBy(desc(paymentRequestsTable.createdAt))
      .limit(20);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
ENDOFFILE
echo "✅ payment.ts updated"

# ── payment-expiry.ts (new file) ───────────────────────────────────────────────
cat > artifacts/api-server/src/lib/payment-expiry.ts << 'ENDOFFILE'
import { db, paymentRequestsTable, userProfilesTable, siriusNotifications } from "@workspace/db";
import { eq, and, lt, isNull } from "drizzle-orm";

const EXPIRY_HOURS = 48;

export function startPaymentExpiryJob() {
  runExpiryCheck();
  setInterval(runExpiryCheck, 60 * 60 * 1000);
}

async function runExpiryCheck() {
  try {
    const now = new Date();
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
        await db
          .update(userProfilesTable)
          .set({ subscriptionTier: "free" })
          .where(eq(userProfilesTable.userId, payment.userId));

        await db
          .update(paymentRequestsTable)
          .set({ status: "expired" })
          .where(eq(paymentRequestsTable.id, payment.id));

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
ENDOFFILE
echo "✅ payment-expiry.ts created"

# ── index.ts (add expiry job) ──────────────────────────────────────────────────
cat > artifacts/api-server/src/index.ts << 'ENDOFFILE'
import app from "./app";
import { startScheduledSweeps } from "./routes/intelligence-sweep.js";
import { startLabAutoScanner } from "./lib/lab-auto-scan.js";
import { startAiArchSweep } from "./lib/ai-arch-sweep.js";
import { startProjectPipeline, advanceCadPendingWithNotes } from "./lib/project-pipeline.js";
import { tickAutomations } from "./lib/sirius-automation.js";
import { runInvestmentRule } from "./lib/investment-rule.js";
import { startProactiveEngine } from "./lib/sirius-proactive.js";
import { startPaymentExpiryJob } from "./lib/payment-expiry.js";

process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  setTimeout(() => process.exit(1), 500);
});

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startProjectPipeline();
  advanceCadPendingWithNotes().catch(e => console.error("[Pipeline] Migration failed:", e));
  const runRule = () => runInvestmentRule().catch(e => console.error("[Investment Rule] Error:", e));
  setTimeout(runRule, 30_000);
  setInterval(runRule, 6 * 60 * 60 * 1000);
  console.log("[Investment Rule] Auto-archive rule started — projects >£10,000 investment archived automatically");
  setInterval(() => tickAutomations(), 60_000);
  console.log("[Sirius Automations] Self-management engine started — checking every 60 seconds");
  console.log("[Sirius] Lean mode active — market scans & proactive enrichment are manual-only. Use chat commands to trigger.");
  startPaymentExpiryJob();
  console.log("[Payment Expiry] Watching for unconfirmed payments — auto-expire after 48 hours");
});
ENDOFFILE
echo "✅ index.ts updated"

# ── DB schema (add expiresAt + confirmedAt) ────────────────────────────────────
cat > lib/db/src/schema/payment_requests.ts << 'ENDOFFILE'
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const paymentRequestsTable = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  tier: text("tier").notNull(),
  amount: text("amount").notNull(),
  status: text("status").notNull().default("pending"),
  name: text("name"),
  email: text("email"),
  reference: text("reference").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  confirmedAt: timestamp("confirmed_at"),
});
ENDOFFILE
echo "✅ DB schema updated"

# ── app.ts (self-update endpoints + fix-server + security middleware) ──────────
cat > artifacts/api-server/src/app.ts << 'ENDOFFILE'
import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import router from "./routes";
import { db, siriusErrors } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  helmetMiddleware,
  generalRateLimit,
  suspiciousRequestDetector,
  payloadSizeGuard,
  pinBanMiddleware,
  chatRateLimit,
  imageGenRateLimit,
  scanTriggerRateLimit,
} from "./middlewares/security.js";

const app: Express = express();

const isDev = process.env.NODE_ENV !== "production";

// ── 1. Security headers ───────────────────────────────────────────────────────
app.use(helmetMiddleware);

// ── 2. CORS — locked to known origins in production ──────────────────────────
const CUSTOM_DOMAINS = ["https://sirius-ai.live", "https://www.sirius-ai.live"];

const allowedOrigins = isDev
  ? true
  : [
      ...CUSTOM_DOMAINS,
      ...(process.env.REPLIT_DOMAINS || "")
        .split(",")
        .flatMap(d => {
          const domain = d.trim();
          return domain ? [`https://${domain}`, `https://www.${domain}`] : [];
        }),
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-lab-pin"],
}));

// ── 3. General rate limiting — all API routes ─────────────────────────────────
app.use(generalRateLimit);

// ── 4. Suspicious request detector (logging only — never blocks legitimate use) ──
app.use(suspiciousRequestDetector);

// ── 5. Payload size guard — before body parsers ───────────────────────────────
app.use(payloadSizeGuard);

// ── 6. Raw body for Stripe webhook — must come before JSON parser ─────────────
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// ── 7. Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Disable proxy buffering for all SSE streaming responses
app.use((_req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name: string, value: any) {
    if (name.toLowerCase() === "content-type" && String(value).includes("text/event-stream")) {
      originalSetHeader("X-Accel-Buffering", "no");
    }
    return originalSetHeader(name, value);
  };
  next();
});

// ── 9. Per-route rate limits ──────────────────────────────────────────────────

// Star Lab — PIN brute-force check on ALL lab routes
app.use("/api/lab", pinBanMiddleware);

// Chat / streaming endpoints
app.use("/api/openai/conversations/:id/messages", chatRateLimit);
app.use("/api/lab/projects/:id/chat", chatRateLimit);
app.use("/api/lab/projects/:id/complete-all", chatRateLimit);

// Image generation — expensive, strictly limited
app.use("/api/openai/image", imageGenRateLimit);
app.use("/api/lab/projects/:id/render", imageGenRateLimit);

// Scan trigger — max 3 manual runs per hour
app.use("/api/lab/auto-scan/trigger", scanTriggerRateLimit);

// ── 10. Mobile app download ───────────────────────────────────────────────────
app.get("/api/download/sirius-mobile", (req, res) => {
  const file = path.join("/home/runner/workspace/artifacts/sirius-mobile.tar.gz");
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=sirius-mobile.tar.gz");
  res.download(file, "sirius-mobile.tar.gz");
});

// ── 10b-1. Mobile project download ───────────────────────────────────────────
app.get("/api/deploy/sirius-mobile-build", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const file = "/tmp/sirius-mobile-build.tar.gz";
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=sirius-mobile-build.tar.gz");
  res.sendFile(file);
});

// ── 10b-2. App Store screenshot downloads ────────────────────────────────────
app.get("/api/deploy/screenshot/:name", (req, res) => {
  if (req.query.token !== "SIRIUS_DEPLOY_2026_SECURE") return res.status(403).json({ error: "Forbidden" });
  const allowed = ["appstore_1_chat.png","appstore_2_voice.png","appstore_3_memory.png","appstore_4_wisdom.png","appstore_5_starlab.png"];
  const name = req.params.name;
  if (!allowed.includes(name)) return res.status(404).json({ error: "Not found" });
  const file = path.resolve(`/home/runner/workspace/attached_assets/screenshots/${name}`);
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename=${name}`);
  res.sendFile(file);
});

// ── 10b. Secure self-deploy endpoints (private server pull-update) ────────────
const DEPLOY_TOKEN = "SIRIUS_DEPLOY_2026_SECURE";
app.get("/api/deploy/api-dist", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const file = path.resolve("/home/runner/workspace/artifacts/api-server/dist/index.cjs");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=index.cjs");
  res.sendFile(file);
});
app.get("/api/deploy/frontend", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const file = "/tmp/sirius-update.tar.gz";
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=sirius-update.tar.gz");
  res.sendFile(file);
});
app.get("/api/deploy/install.sh", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN || "";
  const script = `#!/bin/bash
set -e
echo "[SIRIUS UPDATE] Starting..."
TOKEN="SIRIUS_DEPLOY_2026_SECURE"
BASE="https://${REPLIT_DOMAIN}"

echo "[1/4] Downloading API..."
curl -sfL "$BASE/api/deploy/api-dist?token=$TOKEN" -o /tmp/index.cjs
cp /opt/sirius/artifacts/api-server/dist/index.cjs /opt/sirius/artifacts/api-server/dist/index.cjs.bak
cp /tmp/index.cjs /opt/sirius/artifacts/api-server/dist/index.cjs

echo "[2/4] Downloading frontend..."
curl -sfL "$BASE/api/deploy/frontend?token=$TOKEN" -o /tmp/sirius-frontend.tar.gz

echo "[3/4] Installing frontend..."
rm -rf /opt/sirius/frontend.bak
cp -r /opt/sirius/frontend /opt/sirius/frontend.bak 2>/dev/null || true
rm -rf /opt/sirius/frontend/*
tar xzf /tmp/sirius-frontend.tar.gz -C /opt/sirius/frontend

echo "[4/4] Restarting API..."
pm2 restart sirius-api

echo "[SIRIUS UPDATE] Complete. All systems updated."
`;
  res.setHeader("Content-Type", "text/plain");
  res.send(script);
});

// ── 10c. Remote server fix — schema migration + error clear ──────────────────
app.post("/api/deploy/fix-server", async (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const results: string[] = [];
  const errs: string[] = [];

  const projectCols = [
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS funding_applications text DEFAULT '{}'`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS ai_arch_linked text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS ai_arch_insights text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS ai_arch_sweep_at timestamptz`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sales_plan text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sales_plan_generated_at timestamptz`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS stripe_product_id text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS stripe_price_id text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS stripe_payment_link text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sell_price text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sell_price_type text DEFAULT ''`,
  ];
  for (const stmt of projectCols) {
    try { await db.execute(sql.raw(stmt)); results.push(`OK: ${stmt.slice(0, 60)}`); }
    catch (e: any) { errs.push(`SKIP: ${e.message?.slice(0, 80)}`); }
  }

  const automationCols = [
    `ALTER TABLE sirius_automations ADD COLUMN IF NOT EXISTS last_run_result text DEFAULT ''`,
  ];
  for (const stmt of automationCols) {
    try { await db.execute(sql.raw(stmt)); results.push(`OK: ${stmt.slice(0, 60)}`); }
    catch (e: any) { errs.push(`SKIP: ${e.message?.slice(0, 80)}`); }
  }

  try {
    const del = await db.delete(siriusErrors).returning({ id: siriusErrors.id });
    results.push(`Cleared ${del.length} error(s) from sirius_errors`);
  } catch (e: any) {
    errs.push(`Error clearing sirius_errors: ${e.message}`);
  }

  res.json({ ok: true, applied: results, skipped: errs });
});

// ── 11. Serve update script for server deployment ─────────────────────────────
app.get("/sirius-deploy", (_req, res) => {
  const candidates = [
    "/home/runner/workspace/server-update.sh",
    path.join(process.cwd(), "../../server-update.sh"),
    path.join(process.cwd(), "server-update.sh"),
  ];
  const scriptPath = candidates.find(p => fs.existsSync(p));
  if (!scriptPath) {
    res.status(404).send("# Script not found");
    return;
  }
  res.setHeader("Content-Type", "text/plain");
  res.send(fs.readFileSync(scriptPath, "utf8"));
});

// ── 12. All other routes ──────────────────────────────────────────────────────
app.use("/api", router);

// ── 12. Serve the built React frontend in production ─────────────────────────
if (!isDev) {
  const frontendDist = path.join(process.cwd(), "artifacts/ai-chat/dist/public");
  app.use(express.static(frontendDist, { maxAge: "1h" }));
  app.use((_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
ENDOFFILE
echo "✅ app.ts updated (self-update + fix-server endpoints)"

# ── Push DB schema changes ─────────────────────────────────────────────────────
echo "Pushing DB schema..."
cd lib/db && npm run push 2>&1 | tail -5
cd /opt/sirius
echo "✅ DB schema pushed"

# ── Patch Dream Lab — exit button ──────────────────────────────────────────────
DREAM=artifacts/ai-chat/src/pages/dream-lab.tsx

# 1. Add wouter import if not already present
grep -q 'from "wouter"' "$DREAM" || \
  sed -i 's|import { getUserId } from "@/lib/user-id";|import { useLocation } from "wouter";\nimport { getUserId } from "@/lib/user-id";|' "$DREAM"

# 2. Add useLocation hook inside DreamLabPage if not already present
grep -q 'setLocation' "$DREAM" || \
  sed -i 's|export function DreamLabPage() {|export function DreamLabPage() {\n  const [, setLocation] = useLocation();|' "$DREAM"

# 3. Replace the old conditional back button with exit+back logic
python3 - "$DREAM" << 'PYEOF'
import sys, re
path = sys.argv[1]
src = open(path).read()
old = '''          {(view !== "board" && view !== "onboard") && (
            <button onClick={() => { setView("board"); setSelectedIdea(null); }}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: T.soft, color: T.accent }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}'''
new = '''          {(view === "board" || view === "onboard") ? (
            <button onClick={() => setLocation("/")}
              title="Back to Sirius"
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: T.soft, color: T.accent }}>
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => { setView("board"); setSelectedIdea(null); }}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: T.soft, color: T.accent }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}'''
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ Dream Lab exit button patched")
else:
    print("ℹ️  Dream Lab exit button already patched or pattern not found — skipping")
PYEOF

# ── Patch Star Lab — add exit button ───────────────────────────────────────────
STARLAB=artifacts/ai-chat/src/pages/star-lab.tsx

# 1. Add wouter import
grep -q 'from "wouter"' "$STARLAB" || \
  sed -i 's|import { getApiBase } from "@/lib/api-base";|import { useLocation } from "wouter";\nimport { getApiBase } from "@/lib/api-base";|' "$STARLAB"

# 2. Add useLocation hook
grep -q 'setLocation.*useLocation' "$STARLAB" || \
  sed -i 's|export function StarLabPage() {|export function StarLabPage() {\n  const [, setLocation] = useLocation();|' "$STARLAB"

# 3. Add exit button next to NotificationBell
python3 - "$STARLAB" << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = '            {!isGuest && <NotificationBell pin={pin} />}\n          </div>'
new = '''            {!isGuest && <NotificationBell pin={pin} />}
            <button
              onClick={() => setLocation("/")}
              title="Back to Sirius"
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all flex-shrink-0"
              style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.35)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(15,23,42,0.1)"; e.currentTarget.style.color = "rgba(15,23,42,0.7)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(15,23,42,0.05)"; e.currentTarget.style.color = "rgba(15,23,42,0.35)"; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>'''
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ Star Lab exit button added")
else:
    print("ℹ️  Star Lab exit button already present or pattern not found — skipping")
PYEOF

# ── Patch Sidebar — remove Configure button ────────────────────────────────────
python3 - artifacts/ai-chat/src/components/sidebar.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = '''        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 text-sm"
        >
          <Settings size={15} />
          <span className="text-[13px]">Configure {aiName}</span>
          {profile.aiPersonality && (
            <span className="ml-auto text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: "hsl(193 100% 52% / 0.1)", color: "hsl(193 100% 52%)", border: "1px solid hsl(193 100% 52% / 0.2)" }}>
              Custom
            </span>
          )}
        </button>'''
if old in src:
    open(path, 'w').write(src.replace(old, '', 1))
    print("✅ Configure button removed from sidebar")
else:
    print("ℹ️  Configure button already removed or not found — skipping")
PYEOF

# ── Fix 1: Remove unintended auto-navigation in Star Lab floating chat ─────────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = '''      if (openProjectMatches.length > 0) {
        // Navigate to projects + open first mentioned project
        if (!navTagMatch && onNavigate) setTimeout(() => onNavigate!("projects"), 200);
        if (onOpenProject) {
          const firstId = parseInt(openProjectMatches[0][1], 10);
          if (!isNaN(firstId)) setTimeout(() => onOpenProject!(firstId), 500);
        }
      }'''
new = '''      if (openProjectMatches.length > 0) {
        // Open the first mentioned project — do NOT auto-navigate away from current page
        if (onOpenProject) {
          const firstId = parseInt(openProjectMatches[0][1], 10);
          if (!isNaN(firstId)) setTimeout(() => onOpenProject!(firstId), 500);
        }
      }'''
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ Unintended navigation bug fixed")
else:
    print("ℹ️  Navigation fix already applied or pattern not found — skipping")
PYEOF

# ── Fix 2: Add X button to CompleteAllModal ────────────────────────────────────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = '''          {finished && <button onClick={() => { onDone(); onClose(); }} className="text-xs px-3 py-1.5 rounded-lg text-slate-800" style={{ background: "hsl(193,100%,35%)" }}>Done</button>}
        </div>
        <div className="p-4 space-y-2">'''
new = '''          <div className="flex items-center gap-2">
            {finished && <button onClick={() => { onDone(); onClose(); }} className="text-xs px-3 py-1.5 rounded-lg text-slate-800" style={{ background: "hsl(193,100%,35%)" }}>Done</button>}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-slate-100" title="Close">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2">'''
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ CompleteAllModal X button added")
else:
    print("ℹ️  CompleteAllModal X button already added or pattern not found — skipping")
PYEOF

# ── Fix 3: Add X button to SMTP modal ─────────────────────────────────────────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = '''                        className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.12)" }}>
                        <p className="text-slate-800 font-semibold text-sm">SMTP Settings — Launch Campaign</p>'''
new = '''                        className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.12)" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-slate-800 font-semibold text-sm">SMTP Settings — Launch Campaign</p>
                          <button onClick={() => setShowSmtp(false)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-slate-100">
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>'''
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ SMTP modal X button added")
else:
    print("ℹ️  SMTP modal X button already added or pattern not found — skipping")
PYEOF

# ── Fix 4: Keep AutoLab + Orchestrate panels mounted (preserve task state) ─────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = '''        {navMode === "autolab" && (
          <AutoLabPanel
            pin={pin}
            projects={projects}
            onSelectProject={p => { setActiveProject(p); setNavMode("projects"); }}
            onFocusProject={p => setActiveProject(p)}
          />
        )}
        {navMode === "orchestrate" && (
          <OrchestratorPanel pin={pin} onOpenProject={(id) => {
            const found = projects.find(p => p.id === id);
            if (found) { setActiveProject(found); setNavMode("projects"); }
            else { setNavMode("projects"); }
          }} />
        )}'''
new = '''        <div style={{ display: navMode === "autolab" ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <AutoLabPanel
            pin={pin}
            projects={projects}
            onSelectProject={p => { setActiveProject(p); setNavMode("projects"); }}
            onFocusProject={p => setActiveProject(p)}
          />
        </div>
        <div style={{ display: navMode === "orchestrate" ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <OrchestratorPanel pin={pin} onOpenProject={(id) => {
            const found = projects.find(p => p.id === id);
            if (found) { setActiveProject(found); setNavMode("projects"); }
            else { setNavMode("projects"); }
          }} />
        </div>'''
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ AutoLab + Orchestrate panels kept mounted across navigation")
else:
    print("ℹ️  Panel state fix already applied or pattern not found — skipping")
PYEOF

# ── Fix 5b: Restore project navigation (onNavigate + onOpenProject together) ───
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = '''      if (openProjectMatches.length > 0) {
        // Open the first mentioned project — do NOT auto-navigate away from current page
        if (onOpenProject) {
          const firstId = parseInt(openProjectMatches[0][1], 10);
          if (!isNaN(firstId)) setTimeout(() => onOpenProject!(firstId), 500);
        }
      }'''
new = '''      if (openProjectMatches.length > 0) {
        if (onNavigate) setTimeout(() => onNavigate!("projects"), 200);
        if (onOpenProject) {
          const firstId = parseInt(openProjectMatches[0][1], 10);
          if (!isNaN(firstId)) setTimeout(() => onOpenProject!(firstId), 500);
        }
      }'''
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ Project navigation restored")
else:
    print("ℹ️  Project navigation already restored or pattern not found — skipping")
PYEOF

# ── Fix 5: Chat uses localStorage so conversations survive browser close ────────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys, re
path = sys.argv[1]
src = open(path).read()
# Replace sessionStorage with localStorage only for CHAT_STORAGE_KEY usages
patched = re.sub(r'sessionStorage(\.(getItem|setItem|removeItem)\(CHAT_STORAGE_KEY)', r'localStorage\1', src)
if patched != src:
    open(path, 'w').write(patched)
    print("✅ Chat messages now use localStorage (persist across sessions)")
else:
    print("ℹ️  Chat localStorage fix already applied — skipping")
PYEOF

# ── Fix 6: Remove redundant onNavigate("projects") from openProjectMatches ──────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = """      if (openProjectMatches.length > 0) {
        if (onNavigate) setTimeout(() => onNavigate!("projects"), 200);
        if (onOpenProject) {
          const firstId = parseInt(openProjectMatches[0][1], 10);
          if (!isNaN(firstId)) setTimeout(() => onOpenProject!(firstId), 500);
        }
      }"""
new = """      if (openProjectMatches.length > 0) {
        if (onOpenProject) {
          const firstId = parseInt(openProjectMatches[0][1], 10);
          if (!isNaN(firstId)) setTimeout(() => onOpenProject!(firstId), 500);
        }
      }"""
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ Removed redundant onNavigate from openProjectMatches — floating chat no longer hijacks nav")
else:
    print("ℹ️  Fix 6 already applied or pattern not found — skipping")
PYEOF

# ── Fix 7: AppBuilderPanel CSS display (preserves build state on nav change) ────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old = """        {navMode === "appbuilder" && (
          <AppBuilderPanel
            pin={pin}
            preloadPrompt={appBuilderPreload}
            onPreloadConsumed={() => setAppBuilderPreload(null)}
            onViewProject={(id) => { loadProject(id); setNavMode("projects"); }}
          />
        )}"""
new = """        <div style={{ display: navMode === "appbuilder" ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <AppBuilderPanel
            pin={pin}
            preloadPrompt={appBuilderPreload}
            onPreloadConsumed={() => setAppBuilderPreload(null)}
            onViewProject={(id) => { loadProject(id); setNavMode("projects"); }}
          />
        </div>"""
if old in src:
    open(path, 'w').write(src.replace(old, new, 1))
    print("✅ AppBuilderPanel now uses CSS display — build state preserved on nav change")
else:
    print("ℹ️  Fix 7 already applied or pattern not found — skipping")
PYEOF

# ── Fix 8: ProjectWorkspace CSS display (preserves project editing state) ────────
python3 - artifacts/ai-chat/src/pages/star-lab.tsx << 'PYEOF'
import sys
path = sys.argv[1]
src = open(path).read()
old_open = """        {navMode === "projects" && (
          activeProject
            ? <ProjectWorkspace
                project={activeProject}
                pin={pin}
                onUpdate={p => setActiveProject(p)}
                onBack={() => setActiveProject(null)}
                allProjects={projects}
                onNavigateProject={id => loadProject(id)}
              />
            : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative" style={{ background: "#F8FAFC" }}>"""
new_open = """        <div style={{ display: (navMode === "projects" && !!activeProject) ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          {activeProject && <ProjectWorkspace
            project={activeProject}
            pin={pin}
            onUpdate={p => setActiveProject(p)}
            onBack={() => setActiveProject(null)}
            allProjects={projects}
            onNavigateProject={id => loadProject(id)}
          />}
        </div>
        {navMode === "projects" && !activeProject && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative" style={{ background: "#F8FAFC" }}>"""
old_close = """              </div>
            )
        )}
      </div>

      {/* Persistent floating twin chat"""
new_close = """              </div>
        )}
      </div>

      {/* Persistent floating twin chat"""
src2 = src.replace(old_open, new_open, 1)
changed = src2 != src
src3 = src2.replace(old_close, new_close, 1)
changed = changed or src3 != src2
if changed:
    open(path, 'w').write(src3)
    print("✅ ProjectWorkspace now uses CSS display — project editing state preserved on nav change")
else:
    print("ℹ️  Fix 8 already applied or pattern not found — skipping")
PYEOF

# ── Build ──────────────────────────────────────────────────────────────────────
echo "Building API server..."
pnpm --filter @workspace/api-server run build 2>&1 | tail -10
echo "✅ API build complete"

# ── Download latest compiled API from Replit (includes all Apr 23+ changes) ───
REPLIT_BASE="https://42c4a590-0572-403f-9e1d-50c0da0b2b76-00-24ejzg4ezx557.worf.replit.dev"
DEPLOY_TOKEN="SIRIUS_DEPLOY_2026_SECURE"
echo "Downloading latest compiled API from Replit..."
if curl -sfL --max-time 30 "${REPLIT_BASE}/api/deploy/api-dist?token=${DEPLOY_TOKEN}" -o /tmp/sirius-index.cjs; then
  cp artifacts/api-server/dist/index.cjs artifacts/api-server/dist/index.cjs.bak 2>/dev/null || true
  cp /tmp/sirius-index.cjs artifacts/api-server/dist/index.cjs
  echo "✅ Latest compiled API installed (lab tools, heartbeat, all Apr 23+ changes)"
else
  echo "⚠️  Replit unreachable — using locally-built API (may be missing recent changes)"
fi

echo "Building frontend..."
pnpm --filter @workspace/ai-chat run build 2>&1 | tail -10
echo "✅ Frontend build complete"

# ── Restart ────────────────────────────────────────────────────────────────────
pm2 restart sirius-api --update-env
echo ""
echo "✅ Sirius is live with all updates"
echo ""
