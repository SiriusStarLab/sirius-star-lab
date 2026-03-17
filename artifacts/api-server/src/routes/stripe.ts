import { Router } from "express";
import { stripeService } from "../stripeService";

const router = Router();

function getBaseUrl(req: any): string {
  const origin = req.headers.origin as string | undefined;
  if (origin) return origin;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (domain) return `https://${domain}`;
  return `${req.protocol}://${req.get("host")}`;
}

// POST /api/stripe/checkout — create a Stripe Checkout session
router.post("/stripe/checkout", async (req, res) => {
  try {
    const { userId, tier } = req.body as { userId?: string; tier?: string };

    if (!userId || !tier) {
      return res.status(400).json({ error: "userId and tier are required" });
    }

    if (!["plus", "pro"].includes(tier)) {
      return res.status(400).json({ error: "tier must be 'plus' or 'pro'" });
    }

    const session = await stripeService.createCheckoutSession(
      userId,
      tier as "plus" | "pro",
      getBaseUrl(req)
    );

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout session error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to create checkout session" });
  }
});

// POST /api/stripe/portal — create a Billing Portal session for managing subscription
router.post("/stripe/portal", async (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const session = await stripeService.createBillingPortalSession(userId, getBaseUrl(req));
    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("Billing portal error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to create portal session" });
  }
});

// GET /api/stripe/publishable-key — return the public key for frontend use
router.get("/stripe/publishable-key", async (_req, res) => {
  try {
    const { getStripePublishableKey } = await import("../stripeClient");
    const key = await getStripePublishableKey();
    return res.json({ publishableKey: key });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to get publishable key" });
  }
});

export default router;
