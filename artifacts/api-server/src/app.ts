import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";
import {
  helmetMiddleware,
  generalRateLimit,
  suspiciousRequestDetector,
  payloadSizeGuard,
  inputScanMiddleware,
  pinBanMiddleware,
  chatRateLimit,
  imageGenRateLimit,
  scanTriggerRateLimit,
} from "./middlewares/security.js";

const app: Express = express();

const isDev = process.env.NODE_ENV !== "production";

// ── 1. Security headers ───────────────────────────────────────────────────────
app.use(helmetMiddleware);

// ── 2. CORS — locked to known origins in production ──────────────────────────
// Always include the custom production domain in addition to Replit's domains
const CUSTOM_DOMAINS = ["https://sirius-ai.live", "https://www.sirius-ai.live"];

const allowedOrigins = isDev
  ? true
  : [
      ...CUSTOM_DOMAINS,
      ...(process.env.REPLIT_DOMAINS || "")
        .split(",")
        .flatMap(d => {
          const domain = d.trim();
          return domain ? [`https://${domain}`, `https://www.${domain}`] : [];
        }),
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-lab-pin"],
}));

// ── 3. General rate limiting — all API routes ─────────────────────────────────
app.use(generalRateLimit);

// ── 4. Suspicious request detector (logging only — never blocks legitimate use) ──
app.use(suspiciousRequestDetector);

// ── 5. Payload size guard — before body parsers ───────────────────────────────
app.use(payloadSizeGuard);

// ── 6. Raw body for Stripe webhook — must come before JSON parser ─────────────
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// ── 7. Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── 8. Input threat scanner — runs after body is parsed ──────────────────────
app.use(inputScanMiddleware);

// ── 9. Per-route rate limits ──────────────────────────────────────────────────

// Star Lab — PIN brute-force check on ALL lab routes
app.use("/api/lab", pinBanMiddleware);

// Chat / streaming endpoints
app.use("/api/openai/conversations/:id/messages", chatRateLimit);
app.use("/api/lab/projects/:id/chat", chatRateLimit);
app.use("/api/lab/projects/:id/complete-all", chatRateLimit);

// Image generation — expensive, strictly limited
app.use("/api/openai/image", imageGenRateLimit);
app.use("/api/lab/projects/:id/render", imageGenRateLimit);

// Scan trigger — max 3 manual runs per hour
app.use("/api/lab/auto-scan/trigger", scanTriggerRateLimit);

// ── 10. Mobile app download ───────────────────────────────────────────────────
app.get("/api/download/sirius-mobile", (req, res) => {
  const file = path.join("/home/runner/workspace/artifacts/sirius-mobile.tar.gz");
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=sirius-mobile.tar.gz");
  res.download(file, "sirius-mobile.tar.gz");
});

// ── 11. All other routes ──────────────────────────────────────────────────────
app.use("/api", router);

// ── 12. Serve the built React frontend in production ─────────────────────────
// In development the Vite dev server handles the frontend separately.
// In production the single `node` process must serve both the API and the SPA.
if (!isDev) {
  const frontendDist = path.join(process.cwd(), "artifacts/ai-chat/dist/public");
  app.use(express.static(frontendDist, { maxAge: "1h" }));
  // SPA fallback — any path that isn't an API route returns index.html
  // Use app.use() not app.get("*") — Express 5 removed bare wildcard route syntax
  app.use((_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
