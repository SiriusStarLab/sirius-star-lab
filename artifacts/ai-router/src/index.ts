import express from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat.js";
import { modelsRouter } from "./routes/models.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { accountRouter } from "./routes/account.js";
import { billingRouter } from "./routes/billing.js";
import { db, schema } from "./db/index.js";
import { eq } from "drizzle-orm";
import { hashKey } from "./middleware/auth.js";
import { pruneCache } from "./lib/cache.js";
import crypto from "crypto";
import pg from "pg";

const app  = express();
const PORT = Number(process.env.ROUTER_PORT ?? 5000);

app.use(cors({ origin: true, credentials: true }));

// Raw body needed for Stripe webhook signature verification
app.use("/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "4mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/v1",      chatRouter);
app.use("/v1",      modelsRouter);
app.use("/admin",   adminRouter);
app.use("/auth",    authRouter);
app.use("/account", accountRouter);
app.use("/billing", billingRouter);

app.get("/", (_req, res) => res.redirect("https://sirius-ai.live/dashboard/"));

app.get("/health", (_req, res) => res.json({
  ok: true, service: "Sirius AI Router", version: "2.0.0",
  providers: {
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openai:     !!process.env.OPENAI_API_KEY,
    anthropic:  !!process.env.ANTHROPIC_API_KEY,
  },
}));

// ── DB Migration ──────────────────────────────────────────────────────────────
async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS router_customers (
      id                    SERIAL PRIMARY KEY,
      email                 TEXT NOT NULL UNIQUE,
      password_hash         TEXT NOT NULL,
      plan                  TEXT NOT NULL DEFAULT 'dev',
      balance_usd           NUMERIC(12,6) NOT NULL DEFAULT 0,
      stripe_customer_id    TEXT,
      stripe_subscription_id TEXT,
      spend_alert_threshold NUMERIC(10,2),
      spend_alert_sent_at   TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS router_api_keys (
      id              SERIAL PRIMARY KEY,
      customer_id     INTEGER,
      name            TEXT NOT NULL,
      label           TEXT NOT NULL DEFAULT 'default',
      key_hash        TEXT NOT NULL UNIQUE,
      key_prefix      TEXT NOT NULL,
      is_active       BOOLEAN NOT NULL DEFAULT true,
      daily_limit_usd NUMERIC(10,4),
      rpm_limit       INTEGER DEFAULT 60,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS router_requests (
      id                SERIAL PRIMARY KEY,
      customer_id       INTEGER,
      api_key_id        INTEGER,
      api_key_name      TEXT,
      model             TEXT NOT NULL,
      resolved_model    TEXT,
      provider          TEXT NOT NULL,
      prompt_tokens     INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      cost_usd          NUMERIC(10,6) DEFAULT 0,
      charged_usd       NUMERIC(10,6) DEFAULT 0,
      duration_ms       INTEGER DEFAULT 0,
      cached            BOOLEAN NOT NULL DEFAULT false,
      fallback_used     BOOLEAN NOT NULL DEFAULT false,
      success           BOOLEAN NOT NULL DEFAULT true,
      error             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS router_cache (
      id          SERIAL PRIMARY KEY,
      cache_key   TEXT NOT NULL UNIQUE,
      model       TEXT NOT NULL,
      response    JSONB NOT NULL,
      hit_count   INTEGER NOT NULL DEFAULT 0,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS router_aliases (
      id           SERIAL PRIMARY KEY,
      customer_id  INTEGER NOT NULL,
      alias        TEXT NOT NULL,
      target_model TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id, alias)
    );

    CREATE TABLE IF NOT EXISTS router_fallbacks (
      id               SERIAL PRIMARY KEY,
      customer_id      INTEGER NOT NULL,
      primary_model    TEXT NOT NULL,
      fallback_models  JSONB NOT NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS router_stripe_events (
      id           SERIAL PRIMARY KEY,
      event_id     TEXT NOT NULL UNIQUE,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Add missing columns BEFORE creating indexes that depend on them
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS customer_id    INTEGER;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS api_key_id     INTEGER;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS api_key_name   TEXT;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS resolved_model TEXT;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS charged_usd    NUMERIC(10,6) DEFAULT 0;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS duration_ms    INTEGER DEFAULT 0;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS cached         BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS fallback_used  BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS success        BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE router_requests ADD COLUMN IF NOT EXISTS error          TEXT;
    ALTER TABLE router_api_keys ADD COLUMN IF NOT EXISTS customer_id    INTEGER;
    ALTER TABLE router_api_keys ADD COLUMN IF NOT EXISTS label          TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE router_api_keys ADD COLUMN IF NOT EXISTS rpm_limit      INTEGER DEFAULT 60;

    CREATE INDEX IF NOT EXISTS router_requests_created_idx  ON router_requests(created_at);
    CREATE INDEX IF NOT EXISTS router_requests_customer_idx ON router_requests(customer_id);
    CREATE INDEX IF NOT EXISTS router_requests_provider_idx ON router_requests(provider);
    CREATE INDEX IF NOT EXISTS router_cache_key_idx         ON router_cache(cache_key);
    CREATE INDEX IF NOT EXISTS router_cache_expires_idx     ON router_cache(expires_at);
  `);

  await pool.end();
  console.log("✓ DB tables ready");
}

// ── Seed default Sirius API key ───────────────────────────────────────────────
async function seedSiriusKey() {
  const existing = await db.select().from(schema.routerApiKeys)
    .where(eq(schema.routerApiKeys.name, "Sirius")).limit(1);
  if (existing.length > 0) return;

  const raw    = `sk-sr-${crypto.randomBytes(24).toString("hex")}`;
  const hash   = hashKey(raw);
  const prefix = raw.slice(0, 12);

  await db.insert(schema.routerApiKeys).values({
    name: "Sirius", keyHash: hash, keyPrefix: prefix, isActive: true,
  });

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  SIRIUS ROUTER API KEY (save this — shown only once)         ║");
  console.log(`║  ${raw}  ║`);
  console.log("║  Add to ecosystem.config.json as SIRIUS_ROUTER_KEY           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

// ── Periodic maintenance ──────────────────────────────────────────────────────
function startMaintenance() {
  // Prune expired cache every 30 minutes
  setInterval(() => pruneCache().catch(() => null), 30 * 60 * 1000);
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  await migrate();
  await seedSiriusKey();
  startMaintenance();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Sirius AI Router v2 running on port ${PORT}`);
    console.log(`  OpenRouter:  ${process.env.OPENROUTER_API_KEY ? "✓" : "✗"}`);
    console.log(`  OpenAI:      ${process.env.OPENAI_API_KEY     ? "✓" : "✗"}`);
    console.log(`  Anthropic:   ${process.env.ANTHROPIC_API_KEY  ? "✓" : "✗"}`);
    console.log(`  Stripe:      ${process.env.STRIPE_SECRET_KEY  ? "✓" : "✗"}`);
    console.log(`  Markup:      ${process.env.ROUTER_MARKUP_PCT  ?? "25"}%`);
  });
}

main().catch(err => { console.error("Startup failed:", err); process.exit(1); });
