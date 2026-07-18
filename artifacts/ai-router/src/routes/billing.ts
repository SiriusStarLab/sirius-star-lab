import { Router } from "express";
import type { Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import Stripe from "stripe";

export const billingRouter = Router();

// Lazy Stripe client — only created when a key is available
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key, { apiVersion: "2025-05-28.basil" });
  return _stripe;
}
const WEBHOOK_SECRET = process.env.STRIPE_ROUTER_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "";

const CREDIT_PACKS = [
  { id: "credits_10",  usd: 10,  credits: 10,  label: "$10 credits"  },
  { id: "credits_25",  usd: 25,  credits: 25,  label: "$25 credits"  },
  { id: "credits_50",  usd: 50,  credits: 50,  label: "$50 credits"  },
  { id: "credits_100", usd: 100, credits: 100, label: "$100 credits" },
];

const PLANS = [
  { id: "plan_dev",      name: "Dev",      priceMonthly: 0,   description: "Pay-as-you-go, 3 keys, 60 rpm" },
  { id: "plan_pro",      name: "Pro",      priceMonthly: 49,  description: "$60 credits/mo, 10 keys, 300 rpm" },
  { id: "plan_business", name: "Business", priceMonthly: 199, description: "$250 credits/mo, unlimited keys, 1000 rpm" },
];

// GET /billing/plans
billingRouter.get("/plans", (_req: Request, res: Response): void => {
  res.json({ plans: PLANS, creditPacks: CREDIT_PACKS });
});

// POST /billing/checkout — create a Stripe checkout session for credit top-up
billingRouter.post("/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { packId } = req.body as { packId?: string };
  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) { res.status(400).json({ error: "Invalid credit pack" }); return; }

  const [customer] = await db.select().from(schema.customers)
    .where(eq(schema.customers.id, req.customerId!)).limit(1);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Billing not configured" }); return; }

  // Get or create Stripe customer
  let stripeCustomerId = customer.stripeCustomerId;
  if (!stripeCustomerId) {
    const sc = await stripe.customers.create({ email: customer.email });
    stripeCustomerId = sc.id;
    await db.update(schema.customers).set({ stripeCustomerId }).where(eq(schema.customers.id, customer.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer:              stripeCustomerId,
    mode:                  "payment",
    payment_method_types:  ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency:     "usd",
        unit_amount:  pack.usd * 100,
        product_data: { name: `Sirius AI Router — ${pack.label}` },
      },
    }],
    metadata:     { customerId: String(customer.id), credits: String(pack.credits) },
    success_url:  `${process.env.ROUTER_DASHBOARD_URL ?? "https://api.sirius-ai.live"}/dashboard/billing?success=1`,
    cancel_url:   `${process.env.ROUTER_DASHBOARD_URL ?? "https://api.sirius-ai.live"}/dashboard/billing`,
  });

  res.json({ url: session.url });
});

// POST /billing/webhook — Stripe webhook (no auth — verified by signature)
billingRouter.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: "Billing not configured" }); return; }
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, WEBHOOK_SECRET);
  } catch (err: any) {
    res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
    return;
  }

  // Idempotency check
  const existing = await db.select({ id: schema.routerStripeEvents.id })
    .from(schema.routerStripeEvents).where(eq(schema.routerStripeEvents.eventId, event.id)).limit(1);
  if (existing.length > 0) { res.json({ ok: true }); return; }

  await db.insert(schema.routerStripeEvents).values({ eventId: event.id });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = Number(session.metadata?.customerId);
    const credits    = Number(session.metadata?.credits ?? 0);

    if (customerId && credits > 0) {
      const [existing] = await db.select({ balanceUsd: schema.customers.balanceUsd })
        .from(schema.customers).where(eq(schema.customers.id, customerId)).limit(1);

      if (existing) {
        const newBalance = Number(existing.balanceUsd) + credits;
        await db.update(schema.customers)
          .set({ balanceUsd: String(newBalance) })
          .where(eq(schema.customers.id, customerId));
        console.log(`[billing] ✅ Added $${credits} credits to customer ${customerId} (new balance: $${newBalance})`);
      }
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
