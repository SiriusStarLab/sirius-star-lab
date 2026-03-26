import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const siriusErrors = pgTable("sirius_errors", {
  id: serial("id").primaryKey(),
  toolName: text("tool_name").notNull().default(""),
  errorMessage: text("error_message").notNull().default(""),
  context: text("context").default(""),
  resolved: boolean("resolved").notNull().default(false),
  resolvedNote: text("resolved_note").default(""),
  occurredAt: timestamp("occurred_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type SiriusError = typeof siriusErrors.$inferSelect;
