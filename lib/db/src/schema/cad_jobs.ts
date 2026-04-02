import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const cadJobs = pgTable("cad_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  jobId: text("job_id").default(""),
  status: text("status").notNull().default("pending"),
  specSent: text("spec_sent").default(""),
  callbackPayload: text("callback_payload").default(""),
  errorMessage: text("error_message").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});
