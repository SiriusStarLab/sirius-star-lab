import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siriusCustomTools = pgTable("sirius_custom_tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  parameters: text("parameters").default("{}"),
  handlerType: text("handler_type").notNull().default("http"),
  handlerConfig: text("handler_config").notNull().default("{}"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SiriusCustomTool = typeof siriusCustomTools.$inferSelect;
