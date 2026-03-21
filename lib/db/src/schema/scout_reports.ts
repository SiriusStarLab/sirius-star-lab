import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoutReports = pgTable("scout_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  industry: text("industry").notNull(),
  opportunity: text("opportunity").notNull(),
  type: text("type").notNull().default("new"),
  potentialValue: text("potential_value").default(""),
  suggestedApproach: text("suggested_approach").default(""),
  sources: text("sources").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertScoutReportSchema = createInsertSchema(scoutReports).omit({
  id: true,
  createdAt: true,
});

export type ScoutReport = typeof scoutReports.$inferSelect;
export type InsertScoutReport = z.infer<typeof insertScoutReportSchema>;
