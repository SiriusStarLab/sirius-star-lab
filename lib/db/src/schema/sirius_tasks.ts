import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siriusTasks = pgTable("sirius_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  progress: text("progress"),
  result: text("result"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export type SiriusTask = typeof siriusTasks.$inferSelect;
export type InsertSiriusTask = typeof siriusTasks.$inferInsert;
