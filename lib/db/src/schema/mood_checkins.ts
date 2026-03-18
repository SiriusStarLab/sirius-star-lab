import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moodCheckinsTable = pgTable("mood_checkins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  mood: text("mood").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMoodCheckinSchema = createInsertSchema(moodCheckinsTable).omit({ id: true, createdAt: true });
export type InsertMoodCheckin = z.infer<typeof insertMoodCheckinSchema>;
export type MoodCheckin = typeof moodCheckinsTable.$inferSelect;
