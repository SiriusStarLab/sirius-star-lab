import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const dreamLabProfiles = pgTable("dream_lab_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  personality: text("personality").notNull().default(""),
  lifestyle: text("lifestyle").notNull().default(""),
  coreValues: text("core_values").notNull().default(""),
  bigDream: text("big_dream").notNull().default(""),
  manifestationStyle: text("manifestation_style").notNull().default(""),
  colourTheme: text("colour_theme").notNull().default("cosmic"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dreamLabIdeas = pgTable("dream_lab_ideas", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("idea"),
  status: text("status").notNull().default("seed"),
  affirmations: text("affirmations").notNull().default(""),
  siriusInsights: text("sirius_insights").notNull().default(""),
  energyLevel: integer("energy_level").notNull().default(5),
  pinned: boolean("pinned").notNull().default(false),
  colour: text("colour").notNull().default("violet"),
  emoji: text("emoji").notNull().default("✨"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dreamLabManifestations = pgTable("dream_lab_manifestations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  ideaId: integer("idea_id"),
  text: text("text").notNull(),
  type: text("type").notNull().default("affirmation"),
  frequency: text("frequency").notNull().default("daily"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dreamLabJournal = pgTable("dream_lab_journal", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default(""),
  content: text("content").notNull(),
  mood: text("mood").notNull().default("inspired"),
  tags: text("tags").notNull().default(""),
  siriusResponse: text("sirius_response").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DreamLabProfile = typeof dreamLabProfiles.$inferSelect;
export type DreamLabIdea = typeof dreamLabIdeas.$inferSelect;
export type DreamLabManifestation = typeof dreamLabManifestations.$inferSelect;
export type DreamLabJournal = typeof dreamLabJournal.$inferSelect;
