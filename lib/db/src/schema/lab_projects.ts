import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const labProjects = pgTable("lab_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull().default("General"),

  // Phase: "design" | "production" | "complete"
  phase: text("phase").notNull().default("design"),
  status: text("status").notNull().default("active"),

  // Design phase fields
  brief: text("brief").default(""),
  research: text("research").default(""),
  specs: text("specs").default(""),
  code: text("code").default(""),
  drawingNotes: text("drawing_notes").default(""),
  cadUrl: text("cad_url").default(""),
  materials: text("materials").default(""),

  // Production phase fields
  workflows: text("workflows").default(""),
  industryProblem: text("industry_problem").default(""),
  uses: text("uses").default(""),

  // Complete phase fields
  brochure: text("brochure").default(""),
  pitch: text("pitch").default(""),
  costToBuild: text("cost_to_build").default(""),
  profitMargin: text("profit_margin").default(""),

  // Market & commercialisation fields
  businessCase: text("business_case").default(""),
  goToMarket: text("go_to_market").default(""),

  // Renders — JSON array of { url: string, label: string, type: "2d"|"3d"|"photo" }
  renders: text("renders").default("[]"),

  // Autonomous lab — set when project was auto-created by the daily scanner
  autoCreated: text("auto_created").default(""),   // "" | "auto"
  autoScanId: text("auto_scan_id").default(""),

  // Approval workflow — auto-created projects start as "pending"
  approvalStatus: text("approval_status").default(""),  // "" | "pending" | "approved" | "rejected"

  // Funding analysis — auto-populated per project
  fundingAnalysis: text("funding_analysis").default(""),
  fundingStatus: text("funding_status").default(""),   // "" | "pending" | "complete" | "error"
  fundingAnalysedAt: timestamp("funding_analysed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLabProjectSchema = createInsertSchema(labProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LabProject = typeof labProjects.$inferSelect;
export type InsertLabProject = z.infer<typeof insertLabProjectSchema>;
