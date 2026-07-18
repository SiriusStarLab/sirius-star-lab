import { pgTable, serial, text, boolean, numeric, integer, timestamp, index } from "drizzle-orm/pg-core";

export const routerApiKeys = pgTable("router_api_keys", {
  id:            serial("id").primaryKey(),
  name:          text("name").notNull(),
  keyHash:       text("key_hash").notNull().unique(),
  keyPrefix:     text("key_prefix").notNull(),
  isActive:      boolean("is_active").notNull().default(true),
  dailyLimitUsd: numeric("daily_limit_usd", { precision: 10, scale: 4 }),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const routerRequests = pgTable("router_requests", {
  id:              serial("id").primaryKey(),
  apiKeyId:        integer("api_key_id"),
  apiKeyName:      text("api_key_name"),
  model:           text("model").notNull(),
  provider:        text("provider").notNull(),
  promptTokens:    integer("prompt_tokens").default(0),
  completionTokens:integer("completion_tokens").default(0),
  costUsd:         numeric("cost_usd", { precision: 10, scale: 6 }).default("0"),
  durationMs:      integer("duration_ms").default(0),
  success:         boolean("success").notNull().default(true),
  error:           text("error"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("router_requests_created_idx").on(t.createdAt),
  index("router_requests_provider_idx").on(t.provider),
]);
