import { Router } from "express";
import type { Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import Stripe from "stripe";

export const billingRouter = Router();

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key, { apiVersion: "2025-05-28.basil" });
  return _stripe;
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Price IDs from Stripe — injected via env on server
const PRICE_IDS: Record<string, string | undefined> = {
  pro:      process.env.STRIPE_PRO_PRICE_ID,
  business: process.env.STRIPE_BIZ_PRICE_ID,
};

const CREDIT_PACKS = [
  { id: "credits_10",  usd: 10,  tokens: 1000,  label: "1,000 tokens"  },
  { id: "credits_25",  usd: 25,  tokens: 2500,  label: "2,500 tokens"  },
  { id: "credits_50",  usd: 50,  tokens: 5000,  label: "5,000 tokens"  },
  { id: "credits_100", usd: 100, tokens: 10000, label: "10,000 tokens" },
];

// Monthly credits included per plan (in USD, stored internally)
const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  pro:      60,   // $60 = 6,000 tokens
  business: 250,  // $250 = 25,000 tokens
};

const PLANS = [
  { id: "dev",      name: "Dev",      priceMonthly: 0,   tokens: 0,     description: "Pay-as-you-go · 3 keys · 60 rpm" },
  { id: "pro",      name: "Pro",      priceMonthly: 49,  tokens: 6000,  description: "6,000 tokens/mo · 10 keys · 300 rpm" },
  { id: "business", name: "Business", priceMonthly: 199, tokens: 25000, description: "25,000 tokens/mo · unlimited keys · 1,000 rpm" },
];

// GET /billing/plans
billingRouter.get("/plans", (_req: Request, res: Response): void => {
  res.json({ plans: PLANS, creditPacks: CREDIT_PACKS });
});

// ── Helper: get or create Stripe customer ────────────────────────────────────
async function ensureStripeCustomer(stripe: Stripe, customerId: number, email: string): Promise<string> {
  const [customer] = await db.select({ stripeCustomerId: schema.customers.stripeCustomerId })
    .from(schema.customers).where(eq(schema.customers.id, customerId)).limit(1);

  if (customer?.stripeCustomerId) return customer.stripeCustomerId;

  const sc = await stripe.customers.create({ email, metadata: { routerCustomerId: String(customerId) } });
  await db.update(schema.customers).set({ stripeCustomerId: sc.id }).where(eq(schema.customers.id, customerId));
  return sc.id;
}

// POST /billing/checkout — one-time credit top-up
billingRouter.post("/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { packId } = req.body as { packId?: string };
  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) { res.status(400).json({ error: "Invalid credit pack" }); return; }

  const [customer] = await db.select().from(schema.customers)
    .where(eq(schema.customers.id, req.customerId!)).limit(1);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Billing not configured" }); return; }

  const stripeCustomerId = await ensureStripeCustomer(stripe, customer.id, customer.email);

  const session = await stripe.checkout.sessions.create({
    customer:             stripeCustomerId,
    mode:                 "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency:     "usd",
        unit_amount:  pack.usd * 100,
        product_data: { name: `Sirius AI Router — ${pack.label}` },
      },
    }],
    metadata:    { customerId: String(customer.id), credits: String(pack.usd), type: "topup" },
    success_url: `${process.env.ROUTER_DASHBOARD_URL ?? "https://sirius-ai.live"}/dashboard/billing?success=topup`,
    cancel_url:  `${process.env.ROUTER_DASHBOARD_URL ?? "https://sirius-ai.live"}/dashboard/billing`,
  });

  res.json({ url: session.url });
});

// POST /billing/subscribe — start a Pro or Business subscription
billingRouter.post("/subscribe", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { plan } = req.body as { plan?: string };
  if (!plan || !["pro", "business"].includes(plan)) {
    res.status(400).json({ error: "plan must be pro or business" }); return;
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    res.status(503).json({ error: "Subscription pricing not configured on server" }); return;
  }

  const [customer] = await db.select().from(schema.customers)
    .where(eq(schema.customers.id, req.customerId!)).limit(1);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Billing not configured" }); return; }

  const stripeCustomerId = await ensureStripeCustomer(stripe, customer.id, customer.email);

  const session = await stripe.checkout.sessions.create({
    customer:             stripeCustomerId,
    mode:                 "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata:    { customerId: String(customer.id), plan, type: "subscription" },
    success_url: `${process.env.ROUTER_DASHBOARD_URL ?? "https://sirius-ai.live"}/dashboard/billing?success=subscribed&plan=${plan}`,
    cancel_url:  `${process.env.ROUTER_DASHBOARD_URL ?? "https://sirius-ai.live"}/dashboard/billing`,
    subscription_data: {
      metadata: { customerId: String(customer.id), plan },
    },
  });

  res.json({ url: session.url });
});

// POST /billing/cancel — cancel active subscription
billingRouter.post("/cancel", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [customer] = await db.select().from(schema.customers)
    .where(eq(schema.customers.id, req.customerId!)).limit(1);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  if (!customer.stripeCustomerId) { res.status(400).json({ error: "No active subscription" }); return; }

  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Billing not configured" }); return; }

  // Find active subscription
  const subs = await stripe.subscriptions.list({ customer: customer.stripeCustomerId, status: "active", limit: 1 });
  if (!subs.data.length) { res.status(400).json({ error: "No active subscription found" }); return; }

  // Cancel at period end (not immediately — they keep access until paid period ends)
  await stripe.subscriptions.update(subs.data[0]!.id, { cancel_at_period_end: true });

  res.json({ ok: true, message: "Subscription will cancel at the end of the current billing period." });
});

// POST /billing/webhook — Stripe webhook (no auth, verified by signature)
billingRouter.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Billing not configured" }); return; }

  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[billing] Webhook signature failed:", err.message);
    res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
    return;
  }

  // Idempotency check
  const existing = await db.select({ id: schema.routerStripeEvents.id })
    .from(schema.routerStripeEvents).where(eq(schema.routerStripeEvents.eventId, event.id)).limit(1);
  if (existing.length > 0) { res.json({ ok: true }); return; }
  await db.insert(schema.routerStripeEvents).values({ eventId: event.id });

  console.log(`[billing] Event: ${event.type}`);

  // ── One-time top-up completed ─────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = Number(session.metadata?.customerId);
    const type       = session.metadata?.type ?? "topup";

    if (type === "topup") {
      const credits = Number(session.metadata?.credits ?? 0);
      if (customerId && credits > 0) {
        const [cust] = await db.select({ balanceUsd: schema.customers.balanceUsd })
          .from(schema.customers).where(eq(schema.customers.id, customerId)).limit(1);
        if (cust) {
          const newBalance = Number(cust.balanceUsd) + credits;
          await db.update(schema.customers)
            .set({ balanceUsd: String(newBalance) })
            .where(eq(schema.customers.id, customerId));
          console.log(`[billing] ✅ Top-up: +$${credits} to customer ${customerId} (new balance: $${newBalance})`);
        }
      }
    }

    // Subscription checkout completed — plan upgrade handled by subscription.created below
  }

  // ── Subscription created or renewed ──────────────────────────────────────
  if (event.type === "customer.subscription.created" || event.type === "invoice.payment_succeeded") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = Number(sub.metadata?.customerId);
    const plan       = sub.metadata?.plan as string | undefined;

    if (customerId && plan && ["pro", "business"].includes(plan)) {
      const monthlyCredits = PLAN_MONTHLY_CREDITS[plan] ?? 0;

      const [cust] = await db.select({ balanceUsd: schema.customers.balanceUsd, proSince: schema.customers.proSince })
        .from(schema.customers).where(eq(schema.customers.id, customerId)).limit(1);

      if (cust) {
        const newBalance = Number(cust.balanceUsd) + monthlyCredits;
        const firstTimePro = plan === "pro" && !cust.proSince;
        await db.update(schema.customers)
          .set({
            plan,
            balanceUsd: String(newBalance),
            stripeSubscriptionId: sub.id,
            ...(firstTimePro && { proSince: new Date() }),
          })
          .where(eq(schema.customers.id, customerId));
        console.log(`[billing] ✅ Subscription ${plan}: +$${monthlyCredits} credits to customer ${customerId}`);
      }
    }
  }

  // ── Subscription cancelled / expired ─────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = Number(sub.metadata?.customerId);

    if (customerId) {
      await db.update(schema.customers)
        .set({ plan: "dev", stripeSubscriptionId: null })
        .where(eq(schema.customers.id, customerId));
      console.log(`[billing] ⚠️ Subscription cancelled for customer ${customerId} — downgraded to dev`);
    }
  }

  // ── Subscription updated (upgrade/downgrade) ──────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = Number(sub.metadata?.customerId);
    const plan       = sub.metadata?.plan as string | undefined;

    if (customerId && plan && ["pro", "business"].includes(plan)) {
      await db.update(schema.customers)
        .set({ plan, stripeSubscriptionId: sub.id })
        .where(eq(schema.customers.id, customerId));
      console.log(`[billing] ✅ Subscription updated: customer ${customerId} → ${plan}`);
    }
  }

  res.json({ ok: true });
});

// GET /billing/balance
billingRouter.get("/balance", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [customer] = await db.select({ balanceUsd: schema.customers.balanceUsd, plan: schema.customers.plan })
    .from(schema.customers).where(eq(schema.customers.id, req.customerId!)).limit(1);
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ balanceUsd: Number(customer.balanceUsd), plan: customer.plan });
});

// GET /billing/subscription — get current subscription status from Stripe
billingRouter.get("/subscription", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [customer] = await db.select({ stripeCustomerId: schema.customers.stripeCustomerId, plan: schema.customers.plan })
    .from(schema.customers).where(eq(schema.customers.id, req.customerId!)).limit(1);
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }

  if (!customer.stripeCustomerId) {
    res.json({ active: false, plan: customer.plan });
    return;
  }

  const stripe = getStripe();
  if (!stripe) { res.json({ active: false, plan: customer.plan }); return; }

  const subs = await stripe.subscriptions.list({
    customer: customer.stripeCustomerId,
    status: "active",
    limit: 1,
  });

  if (!subs.data.length) {
    res.json({ active: false, plan: customer.plan });
    return;
  }

  const sub = subs.data[0]!;
  res.json({
    active:             true,
    plan:               customer.plan,
    cancelAtPeriodEnd:  sub.cancel_at_period_end,
    currentPeriodEnd:   new Date((sub as any).current_period_end * 1000).toISOString(),
    subscriptionId:     sub.id,
  });
});
