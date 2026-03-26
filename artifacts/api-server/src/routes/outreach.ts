import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import {
  outreachContacts, outreachCampaigns, outreachSends,
  type OutreachContact, type OutreachCampaign,
} from "@workspace/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import nodemailer from "nodemailer";

const router: IRouter = Router();
const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

function authMiddleware(req: Request, res: Response, next: () => void) {
  const pin = req.headers["x-lab-pin"] as string;
  if (pin !== LAB_PIN) { res.status(401).json({ error: "Unauthorised" }); return; }
  next();
}

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

// ─── Contacts ───────────────────────────────────────────────────────────────

router.get("/outreach/contacts", authMiddleware, async (_req: Request, res: Response) => {
  const contacts = await db.select().from(outreachContacts).orderBy(desc(outreachContacts.createdAt));
  res.json(contacts);
});

router.post("/outreach/contacts", authMiddleware, async (req: Request, res: Response) => {
  const { name, email, company, role, sector, website, location, companySize, notes, source } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
  const [contact] = await db.insert(outreachContacts).values({
    name: name.trim(), email: email?.trim() || "", company: company?.trim() || "",
    role: role?.trim() || "", sector: sector?.trim() || "General",
    website: website?.trim() || "", location: location?.trim() || "",
    companySize: companySize?.trim() || "", notes: notes?.trim() || "",
    source: source || "manual",
  }).returning();
  res.json(contact);
});

router.put("/outreach/contacts/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const updates: Partial<OutreachContact> = req.body;
  const [updated] = await db.update(outreachContacts).set({ ...updates, updatedAt: new Date() })
    .where(eq(outreachContacts.id, id)).returning();
  res.json(updated);
});

router.delete("/outreach/contacts/:id", authMiddleware, async (req: Request, res: Response) => {
  await db.delete(outreachContacts).where(eq(outreachContacts.id, parseInt(req.params.id as string)));
  res.json({ ok: true });
});

// Sector Scanner — AI finds real companies using web search
router.post("/outreach/contacts/scan-sector", authMiddleware, async (req: Request, res: Response) => {
  const { sector, count = 10 } = req.body;
  if (!sector) { res.status(400).json({ error: "Sector required" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const prompt = `Today is ${TODAY()}.

You are the Sirius Prospect Scanner. Your job: find ${count} real companies in the "${sector}" sector that are likely buyers of an AI intelligence platform called Sirius Star Lab.

Sirius Star Lab offers:
- Autonomous business intelligence (market scanning, opportunity finding)
- AI-generated sales content and outreach
- Automated social media and content operations
- B2B managed AI services (£799–£2,499/month)
- Custom AI agent development

Search the web exhaustively. Find companies that:
- Are actively growing and would benefit from AI
- Have marketing/sales/operations challenges AI could solve
- Are in the ${sector} sector specifically
- Are real, operating businesses (not listed companies or huge corporations — focus on mid-market SMEs that make decisions fast)

For each company, return:
- Company name
- Best contact person (CEO/MD/Founder/Marketing Director — decision makers only)
- Email (estimate based on company website pattern if needed, or leave blank)
- Website URL
- Location
- Company size estimate
- One specific reason why Sirius Star Lab would help them

Return ONLY valid JSON array: [{"name":"...","company":"...","email":"...","role":"...","website":"...","location":"...","companySize":"...","notes":"..."}]
No markdown, no explanation — pure JSON array only.`;

  try {
    const response = await (openai as any).responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    });

    let raw = "";
    for (const output of response.output || []) {
      if (output.type === "message") {
        for (const part of output.content || []) {
          if (part.type === "output_text") raw += part.text || "";
        }
      }
    }

    // Parse JSON
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      res.write(`data: ${JSON.stringify({ error: "Could not parse AI response" })}\n\n`);
      res.end(); return;
    }

    const companies: any[] = JSON.parse(jsonMatch[0]);
    const inserted: OutreachContact[] = [];

    for (const c of companies.slice(0, count)) {
      try {
        const [contact] = await db.insert(outreachContacts).values({
          name: c.name || "Unknown", company: c.company || "",
          email: c.email || "", role: c.role || "",
          sector, website: c.website || "", location: c.location || "",
          companySize: c.companySize || "", notes: c.notes || "",
          source: "sector-scan",
        }).returning();
        inserted.push(contact);
        res.write(`data: ${JSON.stringify({ type: "contact", contact })}\n\n`);
      } catch { /* skip duplicates */ }
    }

    res.write(`data: ${JSON.stringify({ type: "done", count: inserted.length })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

// Bulk import from CSV text
router.post("/outreach/contacts/import", authMiddleware, async (req: Request, res: Response) => {
  const { text, sector } = req.body;
  if (!text) { res.status(400).json({ error: "Text required" }); return; }

  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
  const inserted: OutreachContact[] = [];

  for (const line of lines) {
    const parts = line.split(/,|\t/).map((p: string) => p.trim());
    const name = parts[0] || "";
    const email = parts[1] || "";
    if (!name) continue;
    try {
      const [c] = await db.insert(outreachContacts).values({
        name, email, company: parts[2] || "", role: parts[3] || "",
        sector: sector || parts[4] || "General", source: "import",
      }).returning();
      inserted.push(c);
    } catch { /* skip */ }
  }

  res.json({ inserted: inserted.length, contacts: inserted });
});

// ─── Campaigns ──────────────────────────────────────────────────────────────

router.get("/outreach/campaigns", authMiddleware, async (_req: Request, res: Response) => {
  const campaigns = await db.select().from(outreachCampaigns).orderBy(desc(outreachCampaigns.createdAt));
  res.json(campaigns);
});

router.post("/outreach/campaigns", authMiddleware, async (req: Request, res: Response) => {
  const {
    name, product, targetSectors, messageType, tone,
    subjectTemplate, senderName, senderCompany, fromEmail,
  } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }

  const sectors = Array.isArray(targetSectors) ? JSON.stringify(targetSectors) : targetSectors || "[]";
  const sectorArr = JSON.parse(sectors);

  // Count contacts in those sectors
  let totalContacts = 0;
  if (sectorArr.length > 0) {
    const contacts = await db.select({ id: outreachContacts.id }).from(outreachContacts)
      .where(inArray(outreachContacts.sector, sectorArr));
    totalContacts = contacts.length;
  }

  const [campaign] = await db.insert(outreachCampaigns).values({
    name: name.trim(), product: product?.trim() || "Sirius Star Lab",
    targetSectors: sectors, messageType: messageType || "Cold Email",
    tone: tone || "Professional", subjectTemplate: subjectTemplate?.trim() || "",
    senderName: senderName?.trim() || "Garry Hutton",
    senderCompany: senderCompany?.trim() || "Strategic Innovation Dundee Ltd",
    fromEmail: fromEmail?.trim() || "",
    totalContacts,
  }).returning();

  res.json(campaign);
});

router.put("/outreach/campaigns/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const updates = req.body;
  if (updates.targetSectors && Array.isArray(updates.targetSectors)) {
    updates.targetSectors = JSON.stringify(updates.targetSectors);
  }
  const [updated] = await db.update(outreachCampaigns).set({ ...updates, updatedAt: new Date() })
    .where(eq(outreachCampaigns.id, id)).returning();
  res.json(updated);
});

router.delete("/outreach/campaigns/:id", authMiddleware, async (req: Request, res: Response) => {
  await db.delete(outreachSends).where(eq(outreachSends.campaignId, parseInt(req.params.id as string)));
  await db.delete(outreachCampaigns).where(eq(outreachCampaigns.id, parseInt(req.params.id as string)));
  res.json({ ok: true });
});

// Get sends for a campaign (with contact info)
router.get("/outreach/campaigns/:id/sends", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const sends = await db.select().from(outreachSends).where(eq(outreachSends.campaignId, id));
  const contactIds = [...new Set(sends.map(s => s.contactId))];
  const contacts = contactIds.length
    ? await db.select().from(outreachContacts).where(inArray(outreachContacts.id, contactIds))
    : [];
  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]));
  res.json(sends.map(s => ({ ...s, contact: contactMap[s.contactId] || null })));
});

// Generate AI pitches for all contacts in a campaign's target sectors (streaming)
router.post("/outreach/campaigns/:id/generate", authMiddleware, async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id as string);
  const [campaign] = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, campaignId));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  const sectors: string[] = JSON.parse(campaign.targetSectors || "[]");
  let contacts: OutreachContact[] = [];

  if (sectors.length > 0) {
    contacts = await db.select().from(outreachContacts)
      .where(and(inArray(outreachContacts.sector, sectors), eq(outreachContacts.status, "prospect")));
  } else {
    contacts = await db.select().from(outreachContacts).where(eq(outreachContacts.status, "prospect"));
  }

  if (!contacts.length) {
    res.status(400).json({ error: "No prospect contacts in the selected sectors. Add contacts first." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Delete any existing pending sends for this campaign
  await db.delete(outreachSends).where(
    and(eq(outreachSends.campaignId, campaignId), eq(outreachSends.status, "pending"))
  );

  res.write(`data: ${JSON.stringify({ type: "start", total: contacts.length })}\n\n`);

  for (const contact of contacts) {
    try {
      const prompt = `Write a ${campaign.tone} ${campaign.messageType} from ${campaign.senderName} at ${campaign.senderCompany} to ${contact.name}${contact.company ? ` at ${contact.company}` : ""}${contact.role ? ` (${contact.role})` : ""}.

Product/service: ${campaign.product}
${campaign.subjectTemplate ? `Subject line idea: ${campaign.subjectTemplate}` : ""}
${contact.notes ? `Context about this company: ${contact.notes}` : ""}
Sector: ${contact.sector}
${contact.location ? `Location: ${contact.location}` : ""}
${contact.companySize ? `Company size: ${contact.companySize}` : ""}

About Sirius Star Lab (for context):
Sirius Star Lab is an intelligence partnership platform — it provides autonomous business intelligence, AI-powered sales and outreach automation, content operations, and custom AI agent development. Plans from £5/month consumer to £2,499/month managed agency service.

Write this as if Garry personally wrote it — sharp, direct, no waffle. Reference something specific about their sector or company. Keep under 180 words body. One clear call to action (book a 15-min call or visit siriusai.app).

Return valid JSON only: {"subject":"...","body":"..."}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.88,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // Save as a pending send
      const [send] = await db.insert(outreachSends).values({
        campaignId,
        contactId: contact.id,
        subject: result.subject || "",
        body: result.body || "",
        status: "pending",
      }).returning();

      res.write(`data: ${JSON.stringify({
        type: "pitch",
        send: { ...send, contact },
      })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: "error", contactId: contact.id, error: err.message })}\n\n`);
    }
  }

  // Update campaign contact count and mark as ready
  await db.update(outreachCampaigns).set({
    totalContacts: contacts.length, status: "ready", updatedAt: new Date(),
  }).where(eq(outreachCampaigns.id, campaignId));

  res.write(`data: ${JSON.stringify({ type: "done", total: contacts.length })}\n\n`);
  res.end();
});

// Update a single send's subject/body
router.put("/outreach/sends/:id", authMiddleware, async (req: Request, res: Response) => {
  const { subject, body } = req.body;
  const [updated] = await db.update(outreachSends)
    .set({ subject, body })
    .where(eq(outreachSends.id, parseInt(req.params.id as string))).returning();
  res.json(updated);
});

// Launch campaign — blast all pending sends via SMTP
router.post("/outreach/campaigns/:id/launch", authMiddleware, async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id as string);
  const { smtpHost, smtpPort, smtpUser, smtpPass, fromName, fromEmail } = req.body;

  const host = smtpHost || process.env.SMTP_HOST;
  const port = Number(smtpPort || process.env.SMTP_PORT || 587);
  const user = smtpUser || process.env.SMTP_USER;
  const pass = smtpPass || process.env.SMTP_PASS;
  const from = fromEmail || process.env.SMTP_FROM || user;
  const name = fromName || process.env.SMTP_FROM_NAME || "Sirius Outreach";

  if (!host || !user || !pass) {
    res.status(400).json({ error: "SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to environment variables." });
    return;
  }

  const sends = await db.select().from(outreachSends).where(
    and(eq(outreachSends.campaignId, campaignId), eq(outreachSends.status, "pending"))
  );

  const contacts = sends.length
    ? await db.select().from(outreachContacts).where(inArray(outreachContacts.id, sends.map(s => s.contactId)))
    : [];
  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]));

  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
  });

  let sent = 0; let failed = 0;
  const results: { to: string; status: string; error?: string }[] = [];

  for (const send of sends) {
    const contact = contactMap[send.contactId];
    if (!contact?.email) continue;
    try {
      await transporter.sendMail({
        from: `"${name}" <${from}>`,
        to: contact.email,
        subject: send.subject,
        text: send.body,
        html: send.body.split("\n\n").map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join(""),
      });
      await db.update(outreachSends).set({ status: "sent", sentAt: new Date() }).where(eq(outreachSends.id, send.id));
      await db.update(outreachContacts).set({ status: "contacted", lastContactedAt: new Date(), updatedAt: new Date() }).where(eq(outreachContacts.id, contact.id));
      results.push({ to: contact.email, status: "sent" });
      sent++;
    } catch (err: any) {
      await db.update(outreachSends).set({ status: "failed", errorMessage: err.message }).where(eq(outreachSends.id, send.id));
      results.push({ to: contact.email, status: "failed", error: err.message });
      failed++;
    }
  }

  // Update campaign stats
  await db.update(outreachCampaigns).set({
    totalSent: sent, status: sent > 0 ? "sent" : "ready", sentAt: new Date(), updatedAt: new Date(),
  }).where(eq(outreachCampaigns.id, campaignId));

  res.json({ sent, failed, results });
});

// Analytics overview
router.get("/outreach/analytics", authMiddleware, async (_req: Request, res: Response) => {
  const contacts = await db.select().from(outreachContacts);
  const campaigns = await db.select().from(outreachCampaigns);
  const sends = await db.select().from(outreachSends);

  const bySector = contacts.reduce((acc: Record<string, number>, c) => {
    acc[c.sector] = (acc[c.sector] || 0) + 1; return acc;
  }, {});

  const byStatus = contacts.reduce((acc: Record<string, number>, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1; return acc;
  }, {});

  res.json({
    totalContacts: contacts.length,
    totalCampaigns: campaigns.length,
    totalSent: sends.filter(s => s.status === "sent").length,
    totalReplied: sends.filter(s => s.status === "replied").length,
    bySector,
    byStatus,
    recentCampaigns: campaigns.slice(0, 5),
  });
});

// Legacy generate (kept for backward compat)
router.post("/outreach/generate", authMiddleware, async (req: Request, res: Response) => {
  const { messageType, product, senderName, senderCompany, tone, subjectTemplate, recipients } = req.body;
  if (!recipients || recipients.length === 0) { res.status(400).json({ error: "Recipients required" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  for (const recipient of recipients) {
    try {
      const prompt = `Write a ${tone || "professional"} ${messageType || "cold email"} from ${senderName}${senderCompany ? ` at ${senderCompany}` : ""} to ${recipient.name}${recipient.company ? ` at ${recipient.company}` : ""}${recipient.role ? ` (${recipient.role})` : ""}.
Product: ${product}
${subjectTemplate ? `Subject: ${subjectTemplate}` : ""}
${recipient.notes ? `Context: ${recipient.notes}` : ""}
Return JSON: {"subject":"...","body":"..."}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.85,
      });
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.write(`data: ${JSON.stringify({ recipientId: recipient.id, name: recipient.name, email: recipient.email, subject: result.subject || "", body: result.body || "" })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ recipientId: recipient.id, error: err.message })}\n\n`);
    }
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// Legacy send
router.post("/outreach/send", authMiddleware, async (req: Request, res: Response) => {
  const { messages, smtpHost, smtpPort, smtpUser, smtpPass, fromName, fromEmail } = req.body;
  const host = smtpHost || process.env.SMTP_HOST;
  const port = Number(smtpPort || process.env.SMTP_PORT || 587);
  const user = smtpUser || process.env.SMTP_USER;
  const pass = smtpPass || process.env.SMTP_PASS;
  const from = fromEmail || process.env.SMTP_FROM || user;
  const name = fromName || process.env.SMTP_FROM_NAME || "Sirius Outreach";

  if (!host || !user || !pass) {
    res.status(400).json({ error: "SMTP not configured." }); return;
  }

  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  const results: { to: string; status: string; error?: string }[] = [];
  for (const msg of messages) {
    try {
      await transporter.sendMail({ from: `"${name}" <${from}>`, to: msg.to, subject: msg.subject, text: msg.body });
      results.push({ to: msg.to, status: "sent" });
    } catch (err: any) {
      results.push({ to: msg.to, status: "failed", error: err.message });
    }
  }
  res.json({ results, sent: results.filter(r => r.status === "sent").length, failed: results.filter(r => r.status === "failed").length });
});

export default router;
