import { pgTable, serial, integer, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { labProjects } from "./lab_projects";

export const cadFiles = pgTable("cad_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => labProjects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
  fileType: text("file_type").notNull().default(""),
  objectPath: text("object_path").notNull(),
  description: text("description").default(""),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCadFileSchema = createInsertSchema(cadFiles).omit({
  id: true,
  uploadedAt: true,
});

export type CadFile = typeof cadFiles.$inferSelect;
export type InsertCadFile = z.infer<typeof insertCadFileSchema>;
