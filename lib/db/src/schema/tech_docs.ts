import { pgTable, serial, integer, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { labProjects } from "./lab_projects";

export const techDocs = pgTable("tech_docs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => labProjects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
  mimeType: text("mime_type").notNull().default(""),
  objectPath: text("object_path").notNull(),
  // "drawing" | "spec" | "datasheet" | "photo" | "concept" | "other"
  docType: text("doc_type").notNull().default("other"),
  description: text("description").default(""),
  // "" | "pending" | "complete" | "error"
  analysisStatus: text("analysis_status").notNull().default(""),
  analysisContent: text("analysis_content").default(""),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTechDocSchema = createInsertSchema(techDocs).omit({
  id: true,
  uploadedAt: true,
});

export type TechDoc = typeof techDocs.$inferSelect;
export type InsertTechDoc = z.infer<typeof insertTechDocSchema>;
