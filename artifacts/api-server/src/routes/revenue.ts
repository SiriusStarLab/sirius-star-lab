import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { db, labReports, labCommissions, labBlueprints, labBlueprintPurchases, labProjects } from "@workspace/db";
import { eq, desc, sum, count, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function getStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
}

function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
}


// ─── Intelligence Reports ──────────────────────────────────────────

// POST /api/lab/revenue/report/checkout
// Creates a Stripe Checkout session for a £49 market intelligence report
router.post("/lab/revenue/report/checkout", async (req: Request, res: Response) => {
  try {
    const { sector, question, email } = req.body as { sector?: string; question?: string; email?: string };
    if (!sector?.trim() || !question?.trim()) {
      return res.status(400).json({ error: "sector and question required" });
    }

    const stripe = getStripe();
    const base = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: "gbp",
          unit_amount: 4900,
          product_data: {
            name: "Sirius Market Intelligence Report",
            description: `Deep AI analysis: ${sector} — ${question.slice(0, 80)}`,
            images: [],
          },
        },
        quantity: 1,
      }],
      metadata: { sector, question: question.slice(0, 500), type: "intelligence_report" },
      success_url: `${base}/star-lab?tab=revenue&report_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/star-lab?tab=revenue&report_cancelled=1`,
    });

    // Pre-create the report record as pending
    await db.insert(labReports).values({
      stripeSessionId: session.id,
      customerEmail: email || "",
      sector: sector.trim(),
      question: question.trim(),
      amountPaid: 4900,
      status: "pending",
    });

    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[Revenue] Report checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/lab/revenue/report/deliver?session_id=xxx
// Verifies Stripe payment, generates report if not already done, returns it
router.get("/lab/revenue/report/deliver", async (req: Request, res: Response) => {
  try {
    const { session_id } = req.query as { session_id?: string };
    if (!session_id) return res.status(400).json({ error: "session_id required" });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["payment_intent"] });
    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment not completed" });
    }

    // Check if report already exists
    const [existing] = await db.select().from(labReports).where(eq(labReports.stripeSessionId, session_id));
    if (!existing) return res.status(404).json({ error: "Report record not found" });

    // If already delivered, return cached content
    if (existing.status === "delivered" && existing.reportContent) {
      return res.json({ report: existing.reportContent, cached: true });
    }

    // Update status to paid
    await db.update(labReports).set({
      status: "paid",
      stripePaymentIntentId: (session.payment_intent as any)?.id || "",
      customerEmail: session.customer_email || existing.customerEmail || "",
    }).where(eq(labReports.stripeSessionId, session_id));

    // Generate the report via AI (streaming SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const prompt = `You are Sirius — an elite market intelligence AI. Generate a comprehensive, actionable market intelligence report.

SECTOR: ${existing.sector}
RESEARCH QUESTION: ${existing.question}

Produce a detailed professional report with the following structure (use full markdown):

# Market Intelligence Report: ${existing.sector}

## Executive Summary
(3-4 paragraphs — the key insight, the opportunity, and the recommended action)

## Market Overview
(Size, growth rate, key players, market maturity, geographic distribution)

## Problem & Gap Analysis
(What is broken or underserved in this market right now? Be specific with data)

## Competitive Landscape
(Main players, their weaknesses, where they fall short, pricing, who wins and why)

## Opportunity Assessment
(Top 3 specific opportunities ranked by feasibility and potential return)

## Target Customer Profiles
(2-3 specific buyer personas with pain points, budget, and where they can be found)

## Go-To-Market Strategy
(Recommended entry approach, channels, pricing model, first 90 days)

## Risk Analysis
(Top 5 risks and mitigation strategies)

## Financial Projections
(Realistic Year 1, Year 2, Year 3 revenue scenarios with assumptions)

## Strategic Recommendations
(5 specific, actionable recommendations — numbered, bold, precise)

## Data Sources & Further Reading
(Key sources, reports, organisations to monitor)

Write with authority and precision. Include specific numbers, market sizes in £/$ where known, and avoid vague generalities. This report is worth £49 — make it exceptional.`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 4000,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      fullContent += text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Save completed report
    await db.update(labReports).set({
      status: "delivered",
      reportContent: fullContent,
      deliveredAt: new Date(),
    }).where(eq(labReports.stripeSessionId, session_id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[Revenue] Report delivery error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/lab/revenue/report/list — list all report sales (Lab-only)
router.get("/lab/revenue/report/list", async (_req: Request, res: Response) => {
  try {
    const reports = await db.select().from(labReports).orderBy(desc(labReports.createdAt)).limit(100);
    return res.json(reports);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Commission Intake ──────────────────────────────────────────────

// POST /api/lab/revenue/commission/estimate
// AI generates a scope/cost/timeline estimate before the customer pays
router.post("/lab/revenue/commission/estimate", async (req: Request, res: Response) => {
  try {
    const { title, description, type } = req.body as { title?: string; description?: string; type?: string };
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "title and description required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You are a senior technical consultant at Strategic Innovation Dundee Ltd — a precision engineering and AI software company. 
You evaluate commission requests and provide honest, professional estimates.
The company has: Dugard 38mm & 26mm sliding head CNC lathes, Star slider, 2× EDM wire machines.
Software capabilities: AI bots, SaaS tools, automation systems, web applications.
Respond ONLY with a JSON object (no markdown) like:
{
  "feasible": true,
  "summary": "One paragraph summary of what this project involves",
  "timeline": "e.g. 4-6 weeks",
  "depositAmount": 50000,
  "totalEstimate": 150000,
  "depositPercent": 33,
  "deliverables": ["item1", "item2", "item3"],
  "techStack": ["technology1", "technology2"],
  "risks": ["risk1", "risk2"],
  "notes": "Any important caveats or questions we need answered"
}
depositAmount and totalEstimate are in pence (GBP). Be realistic and fair.`
      }, {
        role: "user",
        content: `Commission request:\nTitle: ${title}\nType: ${type || "Not specified"}\nDescription: ${description}`,
      }],
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const estimate = JSON.parse(raw);
    return res.json(estimate);
  } catch (err: any) {
    console.error("[Revenue] Commission estimate error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/lab/revenue/commission/checkout
// Creates a Stripe Checkout session for the commission deposit
router.post("/lab/revenue/commission/checkout", async (req: Request, res: Response) => {
  try {
    const { customerName, customerEmail, title, description, type, depositAmount, totalEstimate, aiEstimate } = req.body as {
      customerName?: string;
      customerEmail?: string;
      title?: string;
      description?: string;
      type?: string;
      depositAmount?: number;
      totalEstimate?: number;
      aiEstimate?: string;
    };

    if (!customerName?.trim() || !customerEmail?.trim() || !title?.trim() || !description?.trim() || !depositAmount) {
      return res.status(400).json({ error: "customerName, customerEmail, title, description, and depositAmount required" });
    }

    if (depositAmount < 5000 || depositAmount > 1000000) {
      return res.status(400).json({ error: "depositAmount must be between £50 and £10,000" });
    }

    const stripe = getStripe();
    const base = getBaseUrl(req);
    const totalGBP = ((totalEstimate || depositAmount) / 100).toFixed(0);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail,
      line_items: [{
        price_data: {
          currency: "gbp",
          unit_amount: depositAmount,
          product_data: {
            name: `Commission Deposit: ${title}`,
            description: `50% deposit for custom build. Total project estimate: £${totalGBP}. Strategic Innovation Dundee Ltd.`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        type: "commission",
        customerName: customerName.trim(),
        title: title.trim(),
        projectType: type || "software",
      },
      success_url: `${base}/star-lab?tab=revenue&commission_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/star-lab?tab=revenue&commission_cancelled=1`,
    });

    // Pre-create commission record
    await db.insert(labCommissions).values({
      stripeSessionId: session.id,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      projectTitle: title.trim(),
      projectDescription: description.trim(),
      projectType: type || "software",
      aiEstimate: aiEstimate || "",
      depositAmount,
      totalEstimate: totalEstimate || depositAmount * 2,
      status: "pending",
    });

    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[Revenue] Commission checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/lab/revenue/commission/confirm?session_id=xxx
// Called after Stripe redirect — confirms payment and creates Lab project
router.get("/lab/revenue/commission/confirm", async (req: Request, res: Response) => {
  try {
    const { session_id } = req.query as { session_id?: string };
    if (!session_id) return res.status(400).json({ error: "session_id required" });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["payment_intent"] });
    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment not completed" });
    }

    const [commission] = await db.select().from(labCommissions).where(eq(labCommissions.stripeSessionId, session_id));
    if (!commission) return res.status(404).json({ error: "Commission not found" });
    if (commission.status !== "pending") return res.json({ commission, alreadyConfirmed: true });

    // Create a Lab project for this commission
    const [newProject] = await db.insert(labProjects).values({
      name: commission.projectTitle,
      industry: commission.projectType === "engineering" ? "Precision Engineering" : "Software",
      phase: "design",
      status: "active",
      brief: `**COMMISSIONED PROJECT**\n\nClient: ${commission.customerName} (${commission.customerEmail})\nDeposit Paid: £${(commission.depositAmount / 100).toFixed(0)}\nTotal Estimate: £${(commission.totalEstimate / 100).toFixed(0)}\n\n**Project Description:**\n${commission.projectDescription}\n\n**AI Estimate:**\n${commission.aiEstimate}`,
      approvalStatus: "approved",
    }).returning();

    // Update commission record
    await db.update(labCommissions).set({
      status: "paid",
      stripePaymentIntentId: (session.payment_intent as any)?.id || "",
      labProjectId: newProject.id,
      updatedAt: new Date(),
    }).where(eq(labCommissions.stripeSessionId, session_id));

    const updated = await db.select().from(labCommissions).where(eq(labCommissions.stripeSessionId, session_id));
    return res.json({ commission: updated[0], labProjectId: newProject.id });
  } catch (err: any) {
    console.error("[Revenue] Commission confirm error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/lab/revenue/commissions — list all commissions (Lab-only)
router.get("/lab/revenue/commissions", async (_req: Request, res: Response) => {
  try {
    const commissions = await db.select().from(labCommissions).orderBy(desc(labCommissions.createdAt)).limit(100);
    return res.json(commissions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/lab/revenue/commissions/:id — update commission status/notes
router.patch("/lab/revenue/commissions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body as { status?: string; notes?: string };
    const updatePayload: any = { updatedAt: new Date() };
    if (status) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;
    if (status === "delivered") updatePayload.deliveredAt = new Date();
    const [updated] = await db.update(labCommissions).set(updatePayload).where(eq(labCommissions.id, id)).returning();
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Blueprint Store ────────────────────────────────────────────────

// GET /api/lab/revenue/blueprints — list active blueprints
router.get("/lab/revenue/blueprints", async (_req: Request, res: Response) => {
  try {
    const blueprints = await db.select().from(labBlueprints)
      .where(eq(labBlueprints.status, "active"))
      .orderBy(desc(labBlueprints.createdAt));
    return res.json(blueprints);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/lab/revenue/blueprints — list a Lab project as a blueprint for sale
router.post("/lab/revenue/blueprints", async (req: Request, res: Response) => {
  try {
    const { labProjectId, title, description, category, priceAmount } = req.body as {
      labProjectId?: number;
      title?: string;
      description?: string;
      category?: string;
      priceAmount?: number;
    };

    if (!labProjectId || !title?.trim() || !description?.trim() || !priceAmount) {
      return res.status(400).json({ error: "labProjectId, title, description, priceAmount required" });
    }
    if (priceAmount < 19900 || priceAmount > 99900) {
      return res.status(400).json({ error: "Price must be between £199 and £999" });
    }

    const stripe = getStripe();

    // Create Stripe product and price
    const product = await stripe.products.create({
      name: title.trim(),
      description: description.trim(),
      metadata: { type: "blueprint", labProjectId: String(labProjectId) },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceAmount,
      currency: "gbp",
    });

    const [blueprint] = await db.insert(labBlueprints).values({
      labProjectId,
      title: title.trim(),
      description: description.trim(),
      category: category || "General",
      priceAmount,
      stripePriceId: price.id,
      stripeProductId: product.id,
      status: "active",
    }).returning();

    return res.json(blueprint);
  } catch (err: any) {
    console.error("[Revenue] Blueprint create error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/lab/revenue/blueprints/:id/checkout — buy a blueprint
router.post("/lab/revenue/blueprints/:id/checkout", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { email } = req.body as { email?: string };
    const [blueprint] = await db.select().from(labBlueprints).where(and(eq(labBlueprints.id, id), eq(labBlueprints.status, "active")));
    if (!blueprint) return res.status(404).json({ error: "Blueprint not found" });

    const stripe = getStripe();
    const base = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email || undefined,
      line_items: [{ price: blueprint.stripePriceId, quantity: 1 }],
      metadata: { type: "blueprint", blueprintId: String(id) },
      success_url: `${base}/star-lab?tab=revenue&blueprint_session={CHECKOUT_SESSION_ID}&blueprint_id=${id}`,
      cancel_url: `${base}/star-lab?tab=revenue`,
    });

    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Revenue Dashboard Stats ────────────────────────────────────────

// GET /api/lab/revenue/stats — total revenue breakdown
router.get("/lab/revenue/stats", async (_req: Request, res: Response) => {
  try {
    const [reportStats] = await db.select({
      total: sum(labReports.amountPaid),
      count: count(),
    }).from(labReports).where(eq(labReports.status, "delivered"));

    const [commissionStats] = await db.select({
      total: sum(labCommissions.depositAmount),
      count: count(),
    }).from(labCommissions).where(eq(labCommissions.status, "paid"));

    const [blueprintStats] = await db.select({
      total: sum(labBlueprintPurchases.amountPaid),
      count: count(),
    }).from(labBlueprintPurchases).where(eq(labBlueprintPurchases.status, "paid"));

    const recentReports = await db.select().from(labReports).orderBy(desc(labReports.createdAt)).limit(5);
    const recentCommissions = await db.select().from(labCommissions).orderBy(desc(labCommissions.createdAt)).limit(5);

    const reportTotal = Number(reportStats?.total || 0);
    const commissionTotal = Number(commissionStats?.total || 0);
    const blueprintTotal = Number(blueprintStats?.total || 0);
    const grandTotal = reportTotal + commissionTotal + blueprintTotal;

    return res.json({
      grandTotal,
      grandTotalGBP: (grandTotal / 100).toFixed(2),
      reports: {
        total: reportTotal,
        totalGBP: (reportTotal / 100).toFixed(2),
        count: Number(reportStats?.count || 0),
      },
      commissions: {
        total: commissionTotal,
        totalGBP: (commissionTotal / 100).toFixed(2),
        count: Number(commissionStats?.count || 0),
      },
      blueprints: {
        total: blueprintTotal,
        totalGBP: (blueprintTotal / 100).toFixed(2),
        count: Number(blueprintStats?.count || 0),
      },
      recentReports,
      recentCommissions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
