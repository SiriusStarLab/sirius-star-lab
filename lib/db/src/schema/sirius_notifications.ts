import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const siriusNotifications = pgTable("sirius_notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  urgency: text("urgency").notNull().default("normal"),
  read: boolean("read").notNull().default(false),
  sentEmail: boolean("sent_email").notNull().default(false),
  actionUrl: text("action_url").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SiriusNotification = typeof siriusNotifications.$inferSelect;
export type InsertSiriusNotification = typeof siriusNotifications.$inferInsert;
