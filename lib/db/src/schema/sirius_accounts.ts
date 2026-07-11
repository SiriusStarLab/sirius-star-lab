import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siriusAccountsTable = pgTable("sirius_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SiriusAccount = typeof siriusAccountsTable.$inferSelect;
