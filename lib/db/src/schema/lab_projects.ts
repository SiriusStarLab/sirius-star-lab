import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const labProjects = pgTable("lab_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull().default("General"),
  status: text("status").notNull().default("active"),
  brief: text("brief").default(""),
  research: text("research").default(""),
  specs: text("specs").default(""),
  code: text("code").default(""),
  drawingNotes: text("drawing_notes").default(""),
  cadUrl: text("cad_url").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLabProjectSchema = createInsertSchema(labProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LabProject = typeof labProjects.$inferSelect;
export type InsertLabProject = z.infer<typeof insertLabProjectSchema>;
