// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

export * from "./conversations";
export * from "./messages";
export * from "./mood_checkins";
export * from "./user_profiles";
export * from "./lab_projects";
export * from "./lab_messages";
export * from "./scout_reports";
export * from "./ai_discoveries";
export * from "./cad_files";
export * from "./lab_scan_history";
export * from "./study_plans";
export * from "./lab_revenue";
export * from "./outreach_engine";