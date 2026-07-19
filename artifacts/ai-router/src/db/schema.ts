import { pgTable, serial, text, boolean, numeric, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = pgTable("router_customers", {
  id:                   serial("id").primaryKey(),
  email:                text("email").notNull().unique(),
  passwordHash:         text("password_hash").notNull(),
  plan:                 text("plan").notNull().default("dev"), // dev | pro | business
  balanceUsd:           numeric("balance_usd", { precision: 12, scale: 6 }).notNull().default("0"),
  stripeCustomerId:     text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  spendAlertThreshold:  numeric("spend_alert_threshold", { precision: 10, scale: 2 }), // alert when balance drops below
  spendAlertSentAt:     timestamp("spend_alert_sent_at"),
  loyaltyBonusClaimed:  boolean("loyalty_bonus_claimed").notNull().default(false),
  createdAt:            timestamp("created_at").defaultNow().notNull(),
});

// ── API Keys ──────────────────────────────────────────────────────────────────
export const routerApiKeys = pgTable("router_api_keys", {
  id:            serial("id").primaryKey(),
  customerId:    integer("customer_id"),          // null = internal Sirius key
  name:          text("name").notNull(),
  label:         text("label").notNull().default("default"), // dev / staging / production / etc
  keyHash:       text("key_hash").notNull().unique(),
  keyPrefix:     text("key_prefix").notNull(),
  isActive:      boolean("is_active").notNull().default(true),
  dailyLimitUsd: numeric("daily_limit_usd", { precision: 10, scale: 4 }),
  rpmLimit:      integer("rpm_limit").default(60), // requests per minute
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

// ── Requests ──────────────────────────────────────────────────────────────────
export const routerRequests = pgTable("router_requests", {
  id:               serial("id").primaryKey(),
  customerId:       integer("customer_id"),
  apiKeyId:         integer("api_key_id"),
  apiKeyName:       text("api_key_name"),
  model:            text("model").notNull(),
  resolvedModel:    text("resolved_model"),       // after alias resolution
  provider:         text("provider").notNull(),
  promptTokens:     integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  costUsd:          numeric("cost_usd", { precision: 10, scale: 6 }).default("0"),
  chargedUsd:       numeric("charged_usd", { precision: 10, scale: 6 }).default("0"), // after markup
  durationMs:       integer("duration_ms").default(0),
  cached:           boolean("cached").notNull().default(false),
  fallbackUsed:     boolean("fallback_used").notNull().default(false),
  success:          boolean("success").notNull().default(true),
  error:            text("error"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("router_requests_created_idx").on(t.createdAt),
  index("router_requests_customer_idx").on(t.customerId),
  index("router_requests_provider_idx").on(t.provider),
]);

// ── Cache ─────────────────────────────────────────────────────────────────────
export const routerCache = pgTable("router_cache", {
  id:         serial("id").primaryKey(),
  cacheKey:   text("cache_key").notNull().unique(),
  model:      text("model").notNull(),
  response:   jsonb("response").notNull(),
  hitCount:   integer("hit_count").notNull().default(0),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("router_cache_key_idx").on(t.cacheKey),
  index("router_cache_expires_idx").on(t.expiresAt),
]);

// ── Model Aliases ─────────────────────────────────────────────────────────────
export const routerAliases = pgTable("router_aliases", {
  id:          serial("id").primaryKey(),
  customerId:  integer("customer_id").notNull(),
  alias:       text("alias").notNull(),       // e.g. "my-fast-model"
  targetModel: text("target_model").notNull(), // e.g. "anthropic/claude-haiku-4-5"
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ── Model Fallbacks ───────────────────────────────────────────────────────────
export const routerFallbacks = pgTable("router_fallbacks", {
  id:             serial("id").primaryKey(),
  customerId:     integer("customer_id").notNull(),
  primaryModel:   text("primary_model").notNull(),
  fallbackModels: jsonb("fallback_models").notNull(), // string[]
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

// ── Stripe Events (idempotency) ───────────────────────────────────────────────
export const routerStripeEvents = pgTable("router_stripe_events", {
  id:          serial("id").primaryKey(),
  eventId:     text("event_id").notNull().unique(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
