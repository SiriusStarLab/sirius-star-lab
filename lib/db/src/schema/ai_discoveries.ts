import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiDiscoveries = pgTable("ai_discoveries", {
  id: serial("id").primaryKey(),
  sweepId: text("sweep_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  detail: text("detail").notNull(),
  source: text("source").default(""),
  sourceType: text("source_type").default("research"),
  applicability: text("applicability").default(""),
  isRead: boolean("is_read").default(false),
  isSaved: boolean("is_saved").default(false),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiSweepLog = pgTable("ai_sweep_log", {
  id: serial("id").primaryKey(),
  sweepId: text("sweep_id").notNull(),
  status: text("status").notNull().default("running"),
  itemsFound: text("items_found").default("0"),
  summary: text("summary").default(""),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertAiDiscoverySchema = createInsertSchema(aiDiscoveries).omit({ id: true, discoveredAt: true });
export const insertSweepLogSchema = createInsertSchema(aiSweepLog).omit({ id: true, startedAt: true });

export type AiDiscovery = typeof aiDiscoveries.$inferSelect;
export type AiSweepLog = typeof aiSweepLog.$inferSelect;
export type InsertAiDiscovery = z.infer<typeof insertAiDiscoverySchema>;
