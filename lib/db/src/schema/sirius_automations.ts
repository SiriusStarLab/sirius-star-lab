import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const siriusAutomations = pgTable("sirius_automations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  triggerType: text("trigger_type").notNull().default("schedule"),
  triggerConfig: text("trigger_config").default(""),
  steps: text("steps").notNull().default("[]"),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  lastRunResult: text("last_run_result").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SiriusAutomation = typeof siriusAutomations.$inferSelect;
