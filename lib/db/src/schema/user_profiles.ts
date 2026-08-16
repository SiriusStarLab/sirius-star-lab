import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  aiName: text("ai_name").notNull().default("Sirius"),
  aiPersonality: text("ai_personality").notNull().default(""),
  memories: text("memories").notNull().default(""),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  exchangeCode: text("exchange_code"),
  dailyMessageCount: text("daily_message_count").notNull().default("0"),
  dailyMessageReset: timestamp("daily_message_reset", { withTimezone: true }),
  preferredLanguage: text("preferred_language").notNull().default("auto"),
  businessName: text("business_name").notNull().default(""),
  businessSector: text("business_sector").notNull().default(""),
  businessGoals: text("business_goals").notNull().default(""),
  keyClients: text("key_clients").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
