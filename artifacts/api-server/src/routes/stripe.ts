import { Router } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const PLANS = {
  plus: {
    name: "Sirius Plus",
    description: "200 messages per day · image generation · full memory",
    amount: 999,
    currency: "gbp",
    tier: "plus",
  },
  pro: {
    name: "Sirius Pro",
    description: "Unlimited messages · priority speed · early access to features",
    amount: 1999,
    currency: "gbp",
    tier: "pro",
  },
};

// GET /api/stripe/links — not used but kept for compatibility
router.get("/stripe/links", (_req, res) => {
  res.json({
    plusUrl: `${process.env.APP_URL || "https://sirius-ai.live"}/pricing`,
    proUrl:  `${process.env.APP_URL || "https://sirius-ai.live"}/pricing`,
  });
});

// POST /api/stripe/checkout — create a checkout session
router.post("/stripe/checkout", async (req, res) => {
  try {
    const { userId, tier } = req.body as { userId: string; tier: "plus" | "pro" };

    if (!tier || !PLANS[tier]) {
      res.status(400).json({ error: "Invalid tier — must be 'plus' or 'pro'" });
      return;
    }

    const plan = PLANS[tier];
    const origin = "https://sirius-ai.live";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout-success?tier=${tier}&session_id={CHECKOUT_SESSION_ID}${userId ? `&userId=${userId}` : ""}`,
      cancel_url:  `${origin}/pricing`,
      allow_promotion_codes: true,
      metadata: { userId: userId || "", tier },
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[Stripe] checkout error:", err);
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    res.status(500).json({ error: message });
  }
});

// POST /api/stripe/activate — called by success page to mark user as upgraded
router.post("/stripe/activate", async (req, res) => {
  try {
    const { userId, tier, sessionId } = req.body as { userId: string; tier: string; sessionId?: string };

    if (!userId || !tier) {
      res.status(400).json({ error: "userId and tier required" });
      return;
    }

    if (!["plus", "pro"].includes(tier)) {
      res.status(400).json({ error: "Invalid tier" });
      return;
    }

    // Optionally verify the session with Stripe
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid" && session.status !== "complete") {
          res.status(400).json({ error: "Payment not completed" });
          return;
        }
      } catch {
        // If verification fails, still try to activate (webhook is the fallback)
      }
    }

    await db
      .update(userProfilesTable)
      .set({ subscriptionTier: tier })
      .where(eq(userProfilesTable.userId, userId));

    res.json({ success: true, tier });
  } catch (err: unknown) {
    console.error("[Stripe] activate error:", err);
    res.status(500).json({ error: "Failed to activate subscription" });
  }
});

// POST /api/stripe/webhook — Stripe webhook for reliable activation
router.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body as Stripe.Event;
    }
  } catch (err) {
    console.error("[Stripe] webhook signature error:", err);
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const tier   = session.metadata?.tier;

      if (userId && tier && ["plus", "pro"].includes(tier)) {
        await db
          .update(userProfilesTable)
          .set({
            subscriptionTier: tier,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
          })
          .where(eq(userProfilesTable.userId, userId));
        console.log(`[Stripe] Activated ${tier} for userId=${userId}`);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (customerId) {
        await db
          .update(userProfilesTable)
          .set({ subscriptionTier: "free" })
          .where(eq(userProfilesTable.stripeCustomerId, customerId));
        console.log(`[Stripe] Downgraded to free for customerId=${customerId}`);
      }
    }
  } catch (err) {
    console.error("[Stripe] webhook handler error:", err);
  }

  res.json({ received: true });
});

// GET /api/stripe/subscription/:userId
router.get("/stripe/subscription/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [profile] = await db
      .select({ subscriptionTier: userProfilesTable.subscriptionTier, stripeCustomerId: userProfilesTable.stripeCustomerId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));

    res.json({
      tier: profile?.subscriptionTier || "free",
      hasStripeCustomer: !!profile?.stripeCustomerId,
    });
  } catch {
    res.json({ tier: "free", hasStripeCustomer: false });
  }
});

// POST /api/stripe/portal — customer portal for managing subscription
router.post("/stripe/portal", async (req, res) => {
  try {
    const { userId } = req.body as { userId: string };
    if (!userId) { res.status(400).json({ error: "userId required" }); return; }

    const [profile] = await db
      .select({ stripeCustomerId: userProfilesTable.stripeCustomerId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));

    if (!profile?.stripeCustomerId) {
      res.status(404).json({ error: "No Stripe customer found" });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: "https://sirius-ai.live/pricing",
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[Stripe] portal error:", err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
