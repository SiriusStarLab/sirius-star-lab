import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siriusConfig = pgTable("sirius_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SiriusConfig = typeof siriusConfig.$inferSelect;
