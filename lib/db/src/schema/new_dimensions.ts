import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ndAccounts = pgTable("nd_accounts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNdAccountSchema = createInsertSchema(ndAccounts).omit({ id: true, createdAt: true });
export type NdAccount = typeof ndAccounts.$inferSelect;
export type InsertNdAccount = z.infer<typeof insertNdAccountSchema>;

export const ndApiKeys = pgTable("nd_api_keys", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNdApiKeySchema = createInsertSchema(ndApiKeys).omit({ id: true, createdAt: true, lastUsedAt: true });
export type NdApiKey = typeof ndApiKeys.$inferSelect;
export type InsertNdApiKey = z.infer<typeof insertNdApiKeySchema>;

export const ndProjects = pgTable("nd_projects", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  specs: text("specs"),
  drawingNotes: text("drawing_notes"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  externalRef: varchar("external_ref", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNdProjectSchema = createInsertSchema(ndProjects).omit({ id: true, createdAt: true, updatedAt: true });
export type NdProject = typeof ndProjects.$inferSelect;
export type InsertNdProject = z.infer<typeof insertNdProjectSchema>;

export const ndDrawings = pgTable("nd_drawings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url"),
  uploadedBy: varchar("uploaded_by", { length: 100 }).default("engineer"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNdDrawingSchema = createInsertSchema(ndDrawings).omit({ id: true, createdAt: true });
export type NdDrawing = typeof ndDrawings.$inferSelect;
export type InsertNdDrawing = z.infer<typeof insertNdDrawingSchema>;
