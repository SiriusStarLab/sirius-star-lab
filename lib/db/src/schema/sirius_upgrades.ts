import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siriusUpgrades = pgTable("sirius_upgrades", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("software"),
  description: text("description").notNull().default(""),
  whyNeeded: text("why_needed").notNull().default(""),
  estimatedCost: text("estimated_cost").default(""),
  purchaseUrl: text("purchase_url").default(""),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("wanted"),
  identifiedBy: text("identified_by").notNull().default("sirius"),
  notes: text("notes").default(""),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SiriusUpgrade = typeof siriusUpgrades.$inferSelect;
export type InsertSiriusUpgrade = typeof siriusUpgrades.$inferInsert;
