import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const voiceJournalTable = pgTable("voice_journal", {
  id: serial("id").primaryKey(),
  pin: text("pin").notNull(),
  sessionKey: text("session_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  dominantMood: text("dominant_mood").notNull().default("neutral"),
  moodProgression: text("mood_progression").notNull().default("[]"),
  avgEnergy: text("avg_energy").notNull().default("normal"),
  navModesVisited: text("nav_modes_visited").notNull().default("[]"),
  projectsMentioned: text("projects_mentioned").notNull().default("[]"),
  messageCount: integer("message_count").notNull().default(0),
  rawTranscript: text("raw_transcript").notNull().default(""),
  summary: text("summary").notNull().default(""),
  keyTopics: text("key_topics").notNull().default("[]"),
});

export const insertVoiceJournalSchema = createInsertSchema(voiceJournalTable).omit({ id: true, createdAt: true });
export type InsertVoiceJournal = z.infer<typeof insertVoiceJournalSchema>;
export type VoiceJournal = typeof voiceJournalTable.$inferSelect;
