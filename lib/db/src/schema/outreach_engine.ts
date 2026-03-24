import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Prospect contacts — companies/people Sirius will target
export const outreachContacts = pgTable("outreach_contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  company: text("company").notNull().default(""),
  role: text("role").notNull().default(""),
  sector: text("sector").notNull().default("General"),
  website: text("website").default(""),
  location: text("location").default(""),
  companySize: text("company_size").default(""), // SME | Mid-Market | Enterprise
  notes: text("notes").default(""),
  source: text("source").default("manual"), // manual | sector-scan | import
  status: text("status").notNull().default("prospect"), // prospect | contacted | replied | converted | unsubscribed
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertOutreachContactSchema = createInsertSchema(outreachContacts).omit({ id: true, createdAt: true, updatedAt: true });
export type OutreachContact = typeof outreachContacts.$inferSelect;
export type InsertOutreachContact = z.infer<typeof insertOutreachContactSchema>;

// Marketing campaigns
export const outreachCampaigns = pgTable("outreach_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  product: text("product").notNull().default("Sirius Star Lab"),
  targetSectors: text("target_sectors").notNull().default("[]"), // JSON array
  messageType: text("message_type").notNull().default("Cold Email"), // Cold Email | Follow-Up | Product Launch | Partnership
  tone: text("tone").notNull().default("Professional"),
  subjectTemplate: text("subject_template").default(""),
  bodyTemplate: text("body_template").default(""), // AI-generated base template
  senderName: text("sender_name").default("Garry Hutton"),
  senderCompany: text("sender_company").default("Strategic Innovation Dundee Ltd"),
  fromEmail: text("from_email").default(""),
  status: text("status").notNull().default("draft"), // draft | ready | sending | sent | paused
  totalContacts: integer("total_contacts").notNull().default(0),
  totalSent: integer("total_sent").notNull().default(0),
  totalReplied: integer("total_replied").notNull().default(0),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertOutreachCampaignSchema = createInsertSchema(outreachCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type OutreachCampaign = typeof outreachCampaigns.$inferSelect;
export type InsertOutreachCampaign = z.infer<typeof insertOutreachCampaignSchema>;

// Individual sends — one row per contact per campaign
export const outreachSends = pgTable("outreach_sends", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  contactId: integer("contact_id").notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | sent | failed | replied
  errorMessage: text("error_message").default(""),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertOutreachSendSchema = createInsertSchema(outreachSends).omit({ id: true, createdAt: true });
export type OutreachSend = typeof outreachSends.$inferSelect;
export type InsertOutreachSend = z.infer<typeof insertOutreachSendSchema>;
