import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { labProjects } from "./lab_projects";

export const labMessages = pgTable("lab_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => labProjects.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLabMessageSchema = createInsertSchema(labMessages).omit({
  id: true,
  createdAt: true,
});

export type LabMessage = typeof labMessages.$inferSelect;
export type InsertLabMessage = z.infer<typeof insertLabMessageSchema>;
