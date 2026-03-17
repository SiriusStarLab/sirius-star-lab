import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { WebhookHandlers } from "./webhookHandlers";

const app: Express = express();

const isDev = process.env.NODE_ENV !== "production";

const allowedOrigins = isDev
  ? true
  : (process.env.REPLIT_DOMAINS || "")
      .split(",")
      .flatMap(d => {
        const domain = d.trim();
        return domain ? [`https://${domain}`, `https://www.${domain}`] : [];
      });

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Stripe webhook MUST be registered BEFORE express.json()
// Stripe requires the raw Buffer body for signature verification
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      return res.status(400).json({ error: "Webhook processing failed" });
    }
  }
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

export default app;
