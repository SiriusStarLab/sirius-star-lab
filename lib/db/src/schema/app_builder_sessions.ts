import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const appBuilderSessions = pgTable("app_builder_sessions", {
  id: serial("id").primaryKey(),
  pin: text("pin").notNull(),
  appName: text("app_name").notNull().default(""),
  status: text("status").notNull().default("draft"),
  phase: integer("phase").notNull().default(1),
  requirements: text("requirements").default("{}"),
  plan: text("plan").default("[]"),
  files: text("files").default("{}"),
  bugs: text("bugs").default("[]"),
  architectLog: text("architect_log").default("[]"),
  buildQueue: text("build_queue").default("[]"),
  thinkingLog: text("thinking_log").default("[]"),
  buildLog: text("build_log").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AppBuilderSession = typeof appBuilderSessions.$inferSelect;
export type NewAppBuilderSession = typeof appBuilderSessions.$inferInsert;
