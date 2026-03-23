import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const mediaOutlets = pgTable("media_outlets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("news"), // "news" | "magazine" | "blog" | "journal" | "newsletter" | "podcast"
  categories: text("categories").notNull().default("[]"), // JSON string[]: ["tech", "ai", "engineering", "aerospace", "medical", "oil_gas", "manufacturing", "healthcare", "software"]
  url: text("url").default(""),
  contactEmail: text("contact_email").default(""),
  submitUrl: text("submit_url").default(""), // Press release / article submission URL
  region: text("region").default("Global"), // "UK" | "USA" | "Global"
  description: text("description").default(""),
  audience: text("audience").default(""), // e.g. "Engineers, procurement managers"
  active: text("active").default("true"),
  aiManaged: text("ai_managed").default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MediaOutlet = typeof mediaOutlets.$inferSelect;
