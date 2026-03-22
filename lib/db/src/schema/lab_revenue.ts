import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Intelligence Report purchases — someone pays £49, gets an AI-generated market report
export const labReports = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").default(""),
  customerEmail: text("customer_email").default(""),
  sector: text("sector").notNull(),
  question: text("question").notNull(),
  amountPaid: integer("amount_paid").notNull().default(4900), // pence
  status: text("status").notNull().default("pending"), // pending | paid | delivered | failed
  reportContent: text("report_content").default(""),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLabReportSchema = createInsertSchema(labReports).omit({ id: true, createdAt: true });
export type LabReport = typeof labReports.$inferSelect;
export type InsertLabReport = z.infer<typeof insertLabReportSchema>;

// Commission requests — someone describes what they want built, pays a deposit, Garry delivers
export const labCommissions = pgTable("lab_commissions", {
  id: serial("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").default(""),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  projectTitle: text("project_title").notNull(),
  projectDescription: text("project_description").notNull(),
  projectType: text("project_type").notNull().default("software"), // software | engineering | bot | research
  aiEstimate: text("ai_estimate").default(""), // AI-generated scope/cost estimate shown before payment
  depositAmount: integer("deposit_amount").notNull(), // pence
  totalEstimate: integer("total_estimate").notNull().default(0), // pence
  status: text("status").notNull().default("pending"), // pending | paid | in_progress | delivered | cancelled
  labProjectId: integer("lab_project_id").default(0), // linked Lab project if created
  notes: text("notes").default(""), // internal notes from Garry
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLabCommissionSchema = createInsertSchema(labCommissions).omit({ id: true, createdAt: true, updatedAt: true });
export type LabCommission = typeof labCommissions.$inferSelect;
export type InsertLabCommission = z.infer<typeof insertLabCommissionSchema>;

// Blueprint listings — approved Lab projects listed for sale
export const labBlueprints = pgTable("lab_blueprints", {
  id: serial("id").primaryKey(),
  labProjectId: integer("lab_project_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("General"), // Bot | SaaS | Engineering | Research
  priceAmount: integer("price_amount").notNull(), // pence — £199 to £999
  stripePriceId: text("stripe_price_id").default(""),
  stripeProductId: text("stripe_product_id").default(""),
  status: text("status").notNull().default("active"), // active | sold_out | archived
  salesCount: integer("sales_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLabBlueprintSchema = createInsertSchema(labBlueprints).omit({ id: true, createdAt: true });
export type LabBlueprint = typeof labBlueprints.$inferSelect;
export type InsertLabBlueprint = z.infer<typeof insertLabBlueprintSchema>;

// Blueprint purchases — who bought what
export const labBlueprintPurchases = pgTable("lab_blueprint_purchases", {
  id: serial("id").primaryKey(),
  blueprintId: integer("blueprint_id").notNull(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  customerEmail: text("customer_email").notNull(),
  amountPaid: integer("amount_paid").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | delivered
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLabBlueprintPurchaseSchema = createInsertSchema(labBlueprintPurchases).omit({ id: true, createdAt: true });
export type LabBlueprintPurchase = typeof labBlueprintPurchases.$inferSelect;
export type InsertLabBlueprintPurchase = z.infer<typeof insertLabBlueprintPurchaseSchema>;
