import { Router, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import Stripe from "stripe";

const router = Router();
const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

function authMiddleware(req: Request, res: Response, next: () => void) {
  const pin = req.headers["x-lab-pin"] as string;
  if (pin !== LAB_PIN) { res.status(401).json({ error: "Unauthorised" }); return; }
  next();
}

function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

// ─── Service Packages ──────────────────────────────────────────────

// GET /api/lab/agency/packages
router.get("/lab/agency/packages", (_req: Request, res: Response) => {
  return res.json([
    {
      id: "social",
      name: "Sirius Social AI",
      price: 799,
      period: "month",
      tagline: "Your client's entire social presence, run by AI",
      colour: "hsl(280,70%,55%)",
      features: [
        "30 AI-crafted posts/month (Instagram, LinkedIn, TikTok, Facebook, X)",
        "Platform-specific tone and formatting for each channel",
        "Engagement reply drafts — AI suggests responses to comments",
        "Monthly competitor content analysis",
        "Content performance report with AI recommendations",
        "Hashtag strategy and posting schedule",
      ],
      ideal: "E-commerce brands, hospitality, retail, lifestyle businesses",
      roi: "Replaces a £2,500+/month social media manager",
    },
    {
      id: "sales",
      name: "Sirius Sales Intelligence",
      price: 1299,
      period: "month",
      tagline: "AI-powered sales engine that never sleeps",
      colour: "hsl(45,100%,50%)",
      features: [
        "AI cold email sequences (outreach, follow-up, nurture — 5 steps)",
        "Lead intelligence briefs — deep research on each prospect",
        "CRM data enrichment — fill the gaps AI can find",
        "Sales call preparation briefs (company, contacts, talking points)",
        "Competitor intelligence — pricing, positioning, weak spots",
        "Monthly pipeline analysis and deal acceleration report",
      ],
      ideal: "B2B companies, SaaS, professional services, agencies",
      roi: "Replaces a £3,000+/month SDR and a £1,500/month sales tool stack",
    },
    {
      id: "fullstack",
      name: "Sirius Full Operations",
      price: 2499,
      period: "month",
      tagline: "The complete AI intelligence layer for their entire business",
      colour: "hsl(155,70%,45%)",
      features: [
        "Everything in Sirius Social AI",
        "Everything in Sirius Sales Intelligence",
        "AI customer service — draft responses to support tickets and DMs",
        "Monthly blog posts and newsletter (2 per month, fully written)",
        "Brand sentiment monitoring — daily alerts on mentions",
        "Quarterly deep market intelligence report",
        "Monthly strategy call — AI insights presented by Garry",
      ],
      ideal: "Scale-ups, marketing agencies, growing SMEs wanting everything",
      roi: "Replaces £6,000–£10,000/month of agency, tool, and headcount costs",
    },
  ]);
});

// ─── Public Stripe Checkout for Agency Packages ────────────────────

const AGENCY_PACKAGES: Record<string, { name: string; price: number; tagline: string }> = {
  social:    { name: "Sirius Social AI",         price: 79900,  tagline: "Your entire social presence, run by AI" },
  sales:     { name: "Sirius Sales Intelligence", price: 129900, tagline: "AI-powered sales engine that never sleeps" },
  fullstack: { name: "Sirius Full Operations",    price: 249900, tagline: "Complete AI intelligence layer for your business" },
};

function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host  = (req.headers["x-forwarded-host"]  as string) || req.get("host");
  return `${proto}://${host}`;
}

// POST /api/agency/checkout — public, no PIN needed
router.post("/agency/checkout", async (req: Request, res: Response) => {
  try {
    const { package: pkg, email, companyName } = req.body as { package?: string; email?: string; companyName?: string };
    if (!pkg || !AGENCY_PACKAGES[pkg]) {
      return res.status(400).json({ error: "Invalid package. Choose: social, sales, or fullstack" });
    }
    const stripe = getStripe();
    const baseUrl = getBaseUrl(req);
    const pkgDetails = AGENCY_PACKAGES[pkg];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: pkgDetails.name,
            description: pkgDetails.tagline,
            images: [],
          },
          unit_amount: pkgDetails.price,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/checkout/success?tier=agency_${pkg}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/why-sirius#pricing`,
      metadata: { package: pkg, companyName: companyName || "", email: email || "" },
      ...(email ? { customer_email: email } : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("[Agency checkout]", err.message);
    return res.status(500).json({ error: err.message || "Checkout failed" });
  }
});

// ─── Prospect Scanner ──────────────────────────────────────────────

// POST /api/lab/agency/scan
// Scans for businesses in the digital media space that could use Sirius
router.post("/lab/agency/scan", authMiddleware, async (req: Request, res: Response) => {
  const { sector, region, focus } = req.body as { sector?: string; region?: string; focus?: string };
  sseHeaders(res);

  try {
    const searchFocus = focus || "social media management AI";
    const searchSector = sector || "digital agencies and e-commerce brands";
    const searchRegion = region || "UK";

    const systemPrompt = `You are Sirius — an elite B2B business development AI working for Sirius Star Lab.
Your task: identify 8-10 specific types of businesses in the ${searchRegion} ${searchSector} space that are MOST LIKELY to pay £799-£2,499/month for an AI that runs their social media, sales sequences, content marketing, and business intelligence.

For each prospect category, provide:
- Category name and description
- Why they need AI social/sales/content help RIGHT NOW
- Specific pain points with their current approach
- What they currently spend on these activities (estimate)
- Why Sirius beats their current tools
- The best way to reach them (LinkedIn, direct, cold email, events)
- Likely decision maker and what they care about most
- Recommended Sirius package (Social/Sales/Full Operations)

Focus on ${searchFocus}.

Format with clear headers, be specific and actionable. Name real types of companies, real platforms they use, real pain points — not generic advice.`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Identify the best prospect categories for Sirius Star Lab business intelligence services in the ${searchRegion} ${searchSector} space, specifically for: ${searchFocus}. I want real, actionable prospect categories I can go after this week.` }
      ],
      stream: true,
      max_tokens: 3000,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

// ─── Proposal Generator ────────────────────────────────────────────

// POST /api/lab/agency/proposal
// Generates a full bespoke proposal for a named company
router.post("/lab/agency/proposal", authMiddleware, async (req: Request, res: Response) => {
  const { companyName, website, sector, size, currentTools, painPoints, package: pkg } = req.body as {
    companyName?: string;
    website?: string;
    sector?: string;
    size?: string;
    currentTools?: string;
    painPoints?: string;
    package?: string;
  };

  if (!companyName?.trim()) { res.status(400).json({ error: "companyName required" }); return; }
  sseHeaders(res);

  const packageDetails: Record<string, { name: string; price: number; features: string }> = {
    social: { name: "Sirius Social AI", price: 799, features: "AI social content (30 posts/month), competitor monitoring, engagement drafts, performance reports" },
    sales: { name: "Sirius Sales Intelligence", price: 1299, features: "AI email sequences, lead intelligence, CRM enrichment, sales call briefs, competitor analysis" },
    fullstack: { name: "Sirius Full Operations", price: 2499, features: "Full social + sales + content marketing + customer service AI + brand monitoring + quarterly market intelligence" },
  };

  const selectedPkg = packageDetails[pkg || "fullstack"] || packageDetails["fullstack"];

  try {
    const systemPrompt = `You are Sirius — the world's most sophisticated business intelligence AI, writing a proposal on behalf of Sirius Star Lab.

You are generating a bespoke, professional business proposal for ${companyName} to adopt the "${selectedPkg.name}" service at £${selectedPkg.price}/month.

About us: Sirius Star Lab is run by Garry Hutton. We have built Sirius Star Lab — an elite AI intelligence partnership platform that we now offer as a managed service to businesses who want AI to run their digital operations without building it themselves.

Your proposal must be specific to ${companyName}, feel personally researched, and be compelling enough that the CEO/MD reads it and picks up the phone.

Structure the proposal with these sections:
1. **Opening — Why We're Writing to ${companyName}** (2 paragraphs, specific and personal)
2. **What We've Observed About Your Current Digital Operations** (honest assessment of likely gaps based on sector/size)
3. **The Opportunity You're Missing** (what AI-run operations would enable for them specifically)
4. **The Sirius Solution — ${selectedPkg.name}** (tailored to their sector and business)
5. **What Sirius Will Do For ${companyName} Every Single Month** (concrete, specific deliverables)
6. **The Commercial Case** (ROI calculation — what they currently spend vs. what Sirius costs)
7. **Case for Action Now** (why the next 12 months matter for AI adoption)
8. **How We Work Together** (onboarding, communication, what they own)
9. **Pricing and Next Steps** (£${selectedPkg.price}/month, clear CTA)
10. **About Sirius Star Lab** (credibility, precision engineering + AI)

Write with authority, warmth, and genuine intelligence. This is not a template — every line should feel written specifically for ${companyName}.`;

    const userMsg = `Write the complete proposal for ${companyName}.
Sector: ${sector || "Not specified"}
Company size: ${size || "Not specified"}
Website: ${website || "Not known"}
Current tools: ${currentTools || "Unknown — assume standard fragmented stack"}
Known pain points: ${painPoints || "Not specified — infer from sector"}
Recommended package: ${selectedPkg.name} (£${selectedPkg.price}/month)
Features: ${selectedPkg.features}`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg }
      ],
      stream: true,
      max_tokens: 4000,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

// ─── Quick Pitch ───────────────────────────────────────────────────

// POST /api/lab/agency/pitch
// Generates a short LinkedIn DM / email pitch for a specific prospect
router.post("/lab/agency/pitch", authMiddleware, async (req: Request, res: Response) => {
  const { companyName, contactName, contactRole, sector, format, observation } = req.body as {
    companyName?: string;
    contactName?: string;
    contactRole?: string;
    sector?: string;
    format?: string;
    observation?: string;
  };

  if (!companyName?.trim()) { res.status(400).json({ error: "companyName required" }); return; }
  sseHeaders(res);

  try {
    const prompt = `You are writing a ${format || "LinkedIn DM"} from Garry Hutton at Sirius Star Lab to ${contactName || "the decision maker"} ${contactRole ? `(${contactRole})` : ""} at ${companyName}${sector ? ` in the ${sector} sector` : ""}.

Garry has built Sirius Star Lab — an elite AI intelligence platform that can run a business's entire social media, sales sequences, content, and customer communications.

${observation ? `Specific observation about this company: ${observation}` : ""}

Write a ${format || "LinkedIn DM"} that:
- Opens with something specific and genuine about their business (not generic)
- Identifies ONE clear pain point they're likely experiencing
- Makes one concrete, specific offer (not "let's have a chat" — something tangible)
- Asks a single, easy-to-answer question to start a conversation
- Feels like it was written by a human who actually researched them
- Is ${format === "cold email" ? "150-200 words with a subject line" : "under 100 words — short enough to read on mobile"}
- Ends with a natural, low-pressure CTA

Do NOT use phrases like "I hope this finds you well", "circle back", "synergy", "leverage", "reach out", "touch base", or anything corporate. Write like a real human being.

Return the complete message, ready to send.`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 400,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

export default router;
