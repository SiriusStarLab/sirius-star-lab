import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const labScanHistory = pgTable("lab_scan_history", {
  id: serial("id").primaryKey(),
  scanId: text("scan_id").notNull(),
  status: text("status").notNull().default("running"), // "running" | "complete" | "error"
  opportunitiesFound: integer("opportunities_found").notNull().default(0),
  projectsCreated: integer("projects_created").notNull().default(0),
  upgradesApplied: integer("upgrades_applied").notNull().default(0),
  summary: text("summary").default(""),
  items: text("items").default("[]"), // JSON: { type: "new"|"upgrade", projectId, projectName, action }[]
  error: text("error").default(""),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type LabScanHistory = typeof labScanHistory.$inferSelect;
