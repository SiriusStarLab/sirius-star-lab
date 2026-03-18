import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

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

// Raw body for Stripe webhook signature verification — must come before JSON parser
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

export default app;
