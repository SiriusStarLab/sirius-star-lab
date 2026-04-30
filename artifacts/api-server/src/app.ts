import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import router from "./routes";
import { db, siriusErrors } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  helmetMiddleware,
  generalRateLimit,
  suspiciousRequestDetector,
  payloadSizeGuard,
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

// Disable proxy buffering for all SSE streaming responses
app.use((_req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name: string, value: any) {
    if (name.toLowerCase() === "content-type" && String(value).includes("text/event-stream")) {
      originalSetHeader("X-Accel-Buffering", "no");
    }
    return originalSetHeader(name, value);
  };
  next();
});

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

// ── 10b-1. Mobile project download ───────────────────────────────────────────
app.get("/api/deploy/sirius-mobile-build", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const file = "/tmp/sirius-mobile-build.tar.gz";
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=sirius-mobile-build.tar.gz");
  res.sendFile(file);
});

// ── 10b-2. App Store screenshot downloads ────────────────────────────────────
app.get("/api/deploy/screenshot/:name", (req, res) => {
  if (req.query.token !== "SIRIUS_DEPLOY_2026_SECURE") return res.status(403).json({ error: "Forbidden" });
  const allowed = ["appstore_1_chat.png","appstore_2_voice.png","appstore_3_memory.png","appstore_4_wisdom.png","appstore_5_starlab.png"];
  const name = req.params.name;
  if (!allowed.includes(name)) return res.status(404).json({ error: "Not found" });
  const file = path.resolve(`/home/runner/workspace/attached_assets/screenshots/${name}`);
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename=${name}`);
  res.sendFile(file);
});

// ── 10b. Secure self-deploy endpoints (private server pull-update) ────────────
const DEPLOY_TOKEN = "SIRIUS_DEPLOY_2026_SECURE";
app.get("/api/deploy/api-dist", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const file = path.resolve("/home/runner/workspace/artifacts/api-server/dist/index.cjs");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=index.cjs");
  res.sendFile(file);
});
app.get("/api/deploy/frontend", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const distDir = path.resolve("/home/runner/workspace/artifacts/ai-chat/dist/public");
  const tarPath = "/tmp/sirius-frontend.tar.gz";
  try {
    execSync(`tar czf ${tarPath} -C ${path.dirname(distDir)} public`, { stdio: "pipe" });
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", "attachment; filename=sirius-frontend.tar.gz");
    res.sendFile(tarPath);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to package frontend", detail: e.message });
  }
});
app.get("/api/deploy/install.sh", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN || "";
  const AI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "";
  const AI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "";
  const script = `#!/bin/bash
set -e
echo "[SIRIUS UPDATE] Starting..."
TOKEN="SIRIUS_DEPLOY_2026_SECURE"
BASE="https://${REPLIT_DOMAIN}"

echo "[1/5] Downloading API..."
curl -sfL "$BASE/api/deploy/api-dist?token=$TOKEN" -o /tmp/index.cjs
cp /opt/sirius/artifacts/api-server/dist/index.cjs /opt/sirius/artifacts/api-server/dist/index.cjs.bak
cp /tmp/index.cjs /opt/sirius/artifacts/api-server/dist/index.cjs

echo "[2/5] Downloading frontend..."
curl -sfL "$BASE/api/deploy/frontend?token=$TOKEN" -o /tmp/sirius-frontend.tar.gz

echo "[3/5] Installing frontend..."
rm -rf /opt/sirius/frontend.bak
cp -r /opt/sirius/frontend /opt/sirius/frontend.bak 2>/dev/null || true
rm -rf /opt/sirius/frontend/*
tar xzf /tmp/sirius-frontend.tar.gz -C /opt/sirius/frontend

echo "[4/5] Updating OpenAI transcription env vars..."
ENV_FILE="/opt/sirius/.env"
if [ -f "$ENV_FILE" ]; then
  sed -i '/^AI_INTEGRATIONS_OPENAI_BASE_URL=/d' "$ENV_FILE"
  sed -i '/^AI_INTEGRATIONS_OPENAI_API_KEY=/d' "$ENV_FILE"
fi
echo 'AI_INTEGRATIONS_OPENAI_BASE_URL=${AI_BASE_URL}' >> "$ENV_FILE"
echo 'AI_INTEGRATIONS_OPENAI_API_KEY=${AI_API_KEY}' >> "$ENV_FILE"

echo "[5/5] Restarting API..."
pm2 restart sirius-api

echo "[SIRIUS UPDATE] Complete. All systems updated."
`;
  res.setHeader("Content-Type", "text/plain");
  res.send(script);
});

// ── 10b-3. Env var patch — write current AI integration keys to VPS .env ─────
app.get("/api/deploy/env-patch.sh", (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const AI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "";
  const AI_API_KEY  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY  || "";
  if (!AI_BASE_URL || !AI_API_KEY) {
    res.status(503).send("# OpenAI integration env vars not configured on Replit\n");
    return;
  }
  const script = `#!/bin/bash
ENV_FILE="/opt/sirius/.env"
touch "$ENV_FILE"
sed -i '/^AI_INTEGRATIONS_OPENAI_BASE_URL=/d' "$ENV_FILE"
sed -i '/^AI_INTEGRATIONS_OPENAI_API_KEY=/d' "$ENV_FILE"
echo 'AI_INTEGRATIONS_OPENAI_BASE_URL=${AI_BASE_URL}' >> "$ENV_FILE"
echo 'AI_INTEGRATIONS_OPENAI_API_KEY=${AI_API_KEY}'  >> "$ENV_FILE"
echo "[env-patch] OpenAI transcription credentials updated."
`;
  res.setHeader("Content-Type", "text/plain");
  res.send(script);
});

// ── 10c. Remote server fix — schema migration + error clear ──────────────────
app.post("/api/deploy/fix-server", async (req, res) => {
  if (req.query.token !== DEPLOY_TOKEN) return res.status(403).json({ error: "Forbidden" });
  const results: string[] = [];
  const errs: string[] = [];

  // 1. Add missing columns to lab_projects
  const projectCols = [
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS funding_applications text DEFAULT '{}'`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS ai_arch_linked text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS ai_arch_insights text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS ai_arch_sweep_at timestamptz`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sales_plan text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sales_plan_generated_at timestamptz`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS stripe_product_id text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS stripe_price_id text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS stripe_payment_link text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sell_price text DEFAULT ''`,
    `ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS sell_price_type text DEFAULT ''`,
  ];
  for (const stmt of projectCols) {
    try { await db.execute(sql.raw(stmt)); results.push(`OK: ${stmt.slice(0, 60)}`); }
    catch (e: any) { errs.push(`SKIP: ${e.message?.slice(0, 80)}`); }
  }

  // 2. Add missing columns to sirius_automations
  const automationCols = [
    `ALTER TABLE sirius_automations ADD COLUMN IF NOT EXISTS last_run_result text DEFAULT ''`,
  ];
  for (const stmt of automationCols) {
    try { await db.execute(sql.raw(stmt)); results.push(`OK: ${stmt.slice(0, 60)}`); }
    catch (e: any) { errs.push(`SKIP: ${e.message?.slice(0, 80)}`); }
  }

  // 3. Clear all sirius_errors
  try {
    const del = await db.delete(siriusErrors).returning({ id: siriusErrors.id });
    results.push(`Cleared ${del.length} error(s) from sirius_errors`);
  } catch (e: any) {
    errs.push(`Error clearing sirius_errors: ${e.message}`);
  }

  res.json({ ok: true, applied: results, skipped: errs });
});

// ── 11. Serve update script for server deployment ─────────────────────────────
function serveDeployScript(_req: any, res: any) {
  const candidates = [
    "/home/runner/workspace/server-update.sh",
    path.join(process.cwd(), "../../server-update.sh"),
    path.join(process.cwd(), "server-update.sh"),
  ];
  const scriptPath = candidates.find(p => fs.existsSync(p));
  if (!scriptPath) {
    res.status(404).send("# Script not found");
    return;
  }
  res.setHeader("Content-Type", "text/plain");
  res.send(fs.readFileSync(scriptPath, "utf8"));
}
app.get("/api/sirius-deploy", serveDeployScript);
app.get("/sirius-deploy", serveDeployScript);

// ── 12. All other routes ──────────────────────────────────────────────────────
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
