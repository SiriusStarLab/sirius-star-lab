import { Router } from "express";
import Stripe from "stripe";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const PLANS = {
  monthly: {
    name: "FitStack CRM Monthly",
    amount: 2900,
    currency: "gbp",
    interval: "month" as const,
  },
  annual: {
    name: "FitStack CRM Annual",
    amount: 24900,
    currency: "gbp",
    interval: "year" as const,
  },
};

router.post("/checkout", async (req, res) => {
  try {
    const { email, plan = "monthly" } = req.body as { email: string; plan: "monthly" | "annual" };

    if (!email || !plan || !PLANS[plan]) {
      res.status(400).json({ error: "Missing email or invalid plan" });
      return;
    }

    const planConfig = PLANS[plan];
    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: planConfig.currency,
            product_data: {
              name: planConfig.name,
              description: plan === "monthly"
                ? "£29/month — cancel anytime"
                : "£249/year — save £99 vs monthly",
            },
            unit_amount: planConfig.amount,
            recurring: { interval: planConfig.interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/fitstack-crm/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/fitstack-crm/`,
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[FitStack] checkout error:", err);
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    res.status(500).json({ error: message });
  }
});

router.get("/verify", async (req, res) => {
  try {
    const { session_id } = req.query as { session_id: string };
    if (!session_id) {
      res.status(400).json({ error: "Missing session_id" });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      res.status(400).json({ error: "Payment not completed" });
      return;
    }

    res.json({
      success: true,
      customerEmail: session.customer_email || session.customer_details?.email || "",
      plan: session.amount_total === 24900 ? "annual" : "monthly",
    });
  } catch (err: unknown) {
    console.error("[FitStack] verify error:", err);
    const message = err instanceof Error ? err.message : "Failed to verify session";
    res.status(500).json({ error: message });
  }
});

export default router;
