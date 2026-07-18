import express from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat.js";
import { modelsRouter } from "./routes/models.js";
import { adminRouter } from "./routes/admin.js";
import { db, schema } from "./db/index.js";
import { eq } from "drizzle-orm";
import { hashKey } from "./middleware/auth.js";
import crypto from "crypto";
import pg from "pg";

const app  = express();
const PORT = Number(process.env.ROUTER_PORT ?? 5000);

app.use(cors());
app.use(express.json({ limit: "4mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/v1", chatRouter);
app.use("/v1", modelsRouter);
app.use("/admin", adminRouter);

app.get("/health", (_req, res) => res.json({ ok: true, service: "Sirius AI Router", version: "1.0.0" }));

// ── DB Migration ──────────────────────────────────────────────────────────────
async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS router_api_keys (
      id              SERIAL PRIMARY KEY,
      name            TEXT NOT NULL,
      key_hash        TEXT NOT NULL UNIQUE,
      key_prefix      TEXT NOT NULL,
      is_active       BOOLEAN NOT NULL DEFAULT true,
      daily_limit_usd NUMERIC(10,4),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS router_requests (
      id                SERIAL PRIMARY KEY,
      api_key_id        INTEGER,
      api_key_name      TEXT,
      model             TEXT NOT NULL,
      provider          TEXT NOT NULL,
      prompt_tokens     INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      cost_usd          NUMERIC(10,6) DEFAULT 0,
      duration_ms       INTEGER DEFAULT 0,
      success           BOOLEAN NOT NULL DEFAULT true,
      error             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS router_requests_created_idx ON router_requests(created_at);
    CREATE INDEX IF NOT EXISTS router_requests_provider_idx ON router_requests(provider);
  `);

  await pool.end();
  console.log("✓ DB tables ready");
}

// ── Seed default Sirius API key ───────────────────────────────────────────────
async function seedSiriusKey() {
  const existing = await db.select().from(schema.routerApiKeys)
    .where(eq(schema.routerApiKeys.name, "Sirius")).limit(1);

  if (existing.length > 0) return;

  // Generate a key and store its hash — the raw key goes into ecosystem.config.json
  const raw    = `sk-sr-${crypto.randomBytes(24).toString("hex")}`;
  const hash   = hashKey(raw);
  const prefix = raw.slice(0, 12);

  await db.insert(schema.routerApiKeys).values({
    name:      "Sirius",
    keyHash:   hash,
    keyPrefix: prefix,
    isActive:  true,
  });

  // Print key once so it can be added to ecosystem.config.json
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  SIRIUS ROUTER API KEY (save this — shown only once)         ║");
  console.log(`║  ${raw}  ║`);
  console.log("║  Add to ecosystem.config.json as SIRIUS_ROUTER_KEY           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  await migrate();
  await seedSiriusKey();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Sirius AI Router running on port ${PORT}`);
    console.log(`  OpenRouter:  ${process.env.OPENROUTER_API_KEY ? "✓" : "✗"}`);
    console.log(`  OpenAI:      ${process.env.OPENAI_API_KEY     ? "✓" : "✗"}`);
    console.log(`  Anthropic:   ${process.env.ANTHROPIC_API_KEY  ? "✓" : "✗"}`);
  });
}

main().catch(err => { console.error("Startup failed:", err); process.exit(1); });
