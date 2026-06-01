import { Router } from "express";

const router = Router();

// Stripe has been removed from this platform.
// These routes return 410 Gone to avoid breaking any cached client requests.

router.get("/stripe/links", (_req, res) => res.json({ plusLink: null, proLink: null }));
router.post("/stripe/checkout", (_req, res) => res.status(410).json({ error: "Stripe payments are not active on this platform." }));
router.post("/stripe/activate", (_req, res) => res.status(410).json({ error: "Stripe payments are not active on this platform." }));
router.post("/stripe/portal", (_req, res) => res.status(410).json({ error: "Stripe payments are not active on this platform." }));
router.post("/stripe/webhook", (_req, res) => res.status(410).json({ error: "Stripe webhook not active." }));
router.get("/stripe/subscription/:userId", (_req, res) => res.json({ tier: "free", hasStripeCustomer: false }));

export default router;
