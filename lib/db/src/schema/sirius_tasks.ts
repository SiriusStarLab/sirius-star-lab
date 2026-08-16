import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siriusTasks = pgTable("sirius_tasks", {
  id:          serial("id").primaryKey(),
  title:       text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  status:      text("status").notNull().default("pending"),
  progress:    text("progress").notNull().default(""),
  result:      text("result"),
  error:       text("error"),
  startedAt:   timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});
