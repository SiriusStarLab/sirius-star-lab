import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const paymentRequestsTable = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  tier: text("tier").notNull(),
  amount: text("amount").notNull(),
  status: text("status").notNull().default("pending"),
  name: text("name"),
  email: text("email"),
  reference: text("reference").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  confirmedAt: timestamp("confirmed_at"),
});
