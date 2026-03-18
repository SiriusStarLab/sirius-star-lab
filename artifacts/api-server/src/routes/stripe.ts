import { Router } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
}

// GET /api/stripe/links — legacy payment links (kept for mobile)
router.get("/stripe/links", (_req, res) => {
  const plusLink = process.env.STRIPE_PLUS_LINK ?? null;
  const proLink = process.env.STRIPE_PRO_LINK ?? null;
  return res.json({ plusLink, proLink });
});

// POST /api/stripe/checkout — create a Stripe Checkout Session
router.post("/stripe/checkout", async (req, res) => {
  try {
    const { userId, tier } = req.body as { userId?: string; tier?: "plus" | "pro" };
    if (!userId || !tier || !["plus", "pro"].includes(tier)) {
      return res.status(400).json({ error: "userId and valid tier required" });
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl(req);

    const prices: Record<string, { amount: number; name: string }> = {
      plus: { amount: 500, name: "Sirius Plus" },
      pro: { amount: 1200, name: "Sirius Pro" },
    };

    const { amount, name } = prices[tier];

    let customerId: string | undefined;
    const [profile] = await db
      .select({ stripeCustomerId: userProfilesTable.stripeCustomerId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));

    if (profile?.stripeCustomerId) {
      customerId = profile.stripeCustomerId;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name },
            unit_amount: amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/checkout/success?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      metadata: { userId, tier },
      subscription_data: { metadata: { userId, tier } },
      client_reference_id: userId,
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_creation = "always";
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!customerId && session.customer) {
      await db
        .insert(userProfilesTable)
        .values({ userId, aiName: "Sirius", stripeCustomerId: session.customer as string })
        .onConflictDoUpdate({
          target: userProfilesTable.userId,
          set: { stripeCustomerId: session.customer as string },
        });
    }

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("Checkout session error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to create checkout session" });
  }
});

// POST /api/stripe/activate — activate tier after payment (used by success page)
router.post("/stripe/activate", async (req, res) => {
  try {
    const { userId, tier, sessionId } = req.body as { userId?: string; tier?: string; sessionId?: string };
    if (!userId || !tier || !["plus", "pro"].includes(tier)) {
      return res.status(400).json({ error: "userId and valid tier required" });
    }

    if (sessionId) {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          return res.status(402).json({ error: "Payment not completed" });
        }
        if (session.customer) {
          await db
            .insert(userProfilesTable)
            .values({ userId, aiName: "Sirius", stripeCustomerId: session.customer as string, subscriptionTier: tier })
            .onConflictDoUpdate({
              target: userProfilesTable.userId,
              set: { stripeCustomerId: session.customer as string, subscriptionTier: tier },
            });
          return res.json({ success: true, tier });
        }
      } catch (e: any) {
        console.warn("Session verification failed, falling back to direct activation:", e.message);
      }
    }

    await db
      .insert(userProfilesTable)
      .values({ userId, aiName: "Sirius", subscriptionTier: tier })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { subscriptionTier: tier },
      });

    return res.json({ success: true, tier });
  } catch (err: any) {
    console.error("Activate tier error:", err.message);
    return res.status(500).json({ error: "Failed to activate tier" });
  }
});

// POST /api/stripe/portal — create billing portal session
router.post("/stripe/portal", async (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: "userId required" });

    const [profile] = await db
      .select({ stripeCustomerId: userProfilesTable.stripeCustomerId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));

    if (!profile?.stripeCustomerId) {
      return res.status(404).json({ error: "No billing account found" });
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${baseUrl}/`,
    });

    return res.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Portal session error:", err.message);
    return res.status(500).json({ error: "Failed to create portal session" });
  }
});

// POST /api/stripe/webhook — Stripe webhook handler
router.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString()) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const tier = session.metadata?.tier;
        if (userId && tier && ["plus", "pro"].includes(tier)) {
          await db
            .insert(userProfilesTable)
            .values({
              userId,
              aiName: "Sirius",
              subscriptionTier: tier,
              stripeCustomerId: session.customer as string,
            })
            .onConflictDoUpdate({
              target: userProfilesTable.userId,
              set: {
                subscriptionTier: tier,
                stripeCustomerId: session.customer as string,
              },
            });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const [profile] = await db
          .select({ userId: userProfilesTable.userId })
          .from(userProfilesTable)
          .where(eq(userProfilesTable.stripeCustomerId, customerId));
        if (profile?.userId) {
          await db
            .update(userProfilesTable)
            .set({ subscriptionTier: "free" })
            .where(eq(userProfilesTable.userId, profile.userId));
        }
        break;
      }
    }
    return res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err.message);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default router;
