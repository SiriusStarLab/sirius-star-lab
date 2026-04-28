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

# ── Build ──────────────────────────────────────────────────────────────────────
echo "Building API server..."
pnpm --filter @workspace/api-server run build 2>&1 | tail -10
echo "✅ API build complete"

echo "Building frontend..."
pnpm --filter @workspace/ai-chat run build 2>&1 | tail -10
echo "✅ Frontend build complete"

# ── Restart ────────────────────────────────────────────────────────────────────
pm2 restart sirius-api --update-env
echo ""
echo "✅ Sirius is live with all updates"
echo ""
