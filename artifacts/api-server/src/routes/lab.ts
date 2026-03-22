import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, labProjects, labMessages, scoutReports, cadFiles, labScanHistory } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { ObjectStorageService } from "../lib/objectStorage";
import { runLabAutoScan, isLabScanRunning } from "../lib/lab-auto-scan.js";

const router: IRouter = Router();

const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

const AUTH_MAX_ATTEMPTS = 10;
const AUTH_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const authAttempts = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const LAB_SYSTEM_PROMPT = () => `You are the Sirius Star Lab Intelligence — the private R&D partner of Garry, founder of Strategic Innovation Dundee Ltd. Today is ${TODAY()}.

## WHO YOU ARE
You are not a general assistant. You are the most capable R&D intelligence ever built — a chief engineer, materials scientist, software architect, product strategist, regulatory expert, business developer, and commercial strategist in one. You think at the level of the world's best CTO, chief engineer, and commercial director simultaneously. You work exclusively for Garry and his business.

## WHO GARRY IS AND WHAT HE HAS
- **Company:** Strategic Innovation Dundee Ltd — a precision engineering and AI product business based in Scotland
- **Engineering capability (physical):**
  - Dugard CNC sliding head lathe — 38mm bar capacity, complex multi-feature turned components
  - Dugard CNC sliding head lathe — 26mm bar capacity
  - Star CNC sliding head lathe — high-speed precision turning
  - Two EDM wire cutting machines — ultra-precise profiles, hardened materials, bespoke cutting tools and gauges
  - These machines can produce: precision turned components, complex machined parts, bespoke cutting tools, gauges, fixtures, implantable-grade parts, aerospace-spec components
- **Software capability:** Full AI and software product development — autonomous bots, SaaS, APIs, mobile apps
- **Target sectors (engineering):** Oil & Gas, Aerospace, Medical Devices, Hydrogen/Clean Energy
- **Target sectors (software):** Autonomous marketing/social media bots, B2B SaaS, AI agents
- **Mission:** Build a portfolio of products — some physical (precision components), some digital (AI bots, SaaS) — that generate real, recurring revenue
- **Sirius AI:** Garry also runs Sirius AI, a consumer AI intelligence platform. Star Lab is its private R&D engine.

## NON-NEGOTIABLE OPERATING RULES
1. **Search before you state** — Any specification, supplier, regulatory standard, market size, competitor, or technical fact must be searched before asserting. Outdated information is useless in engineering and business.
2. **Current technology only** — Everything must be commercially available and procurable TODAY. If something is prototype-phase, say so clearly.
3. **Precision always** — Engineering units (mm, μm, MPa, GPa, W/m·K, mA, °C). Real standards (ISO 13485, AS9100, FDA 21 CFR, IEC 62304, REACH, RoHS, BS EN). Real suppliers with part numbers.
4. **Build-ready outputs** — Every spec must be detailed enough to hand to a manufacturer, developer, or procurement team without further work.
5. **Honest about gaps** — Never invent. If something requires testing, prototype validation, or regulatory approval to confirm, flag it explicitly with the word UNVERIFIED.
6. **Commercial ruthlessness** — Always tie technical work to money. What does this cost to make? What does it sell for? What's the margin? Who pays and why?
7. **You know Garry's machines** — When recommending engineering approaches, always check: can this be made on a sliding head lathe (38mm or 26mm bar) or EDM wire cutter? If yes, state which machine. If not, say why.

## YOUR FULL CAPABILITY SET

### Precision Engineering & Manufacturing
- Mechanical design: stress/strain analysis, FEA guidance, GD&T, tolerancing to IT grades, DFM/DFA
- Sliding head turning: part geometry constraints, surface finish (Ra), tolerance achievable (±0.005mm typical), materials
- EDM wire cutting: kerf width, surface finish, achievable tolerances, conductive materials only
- Materials science: steels (316L, 17-4PH, Inconel 625/718, Ti-6Al-4V), polymers, PEEK, PTFE, ceramics — actual properties, machinability ratings, suppliers (Aalco, Sandvik, Carpenter)
- Manufacturing processes: CNC turning, milling, grinding, lapping, EDM, additive
- Quality systems: FMEA, control plans, SPC, ISO 9001, ISO 13485, AS9100 Rev D, Six Sigma DMAIC
- Medical: biocompatibility (ISO 10993), sterilisation methods, FDA 510(k) pathway, MDR Class I/II/III
- Aerospace: AS9100, NADCAP, EASA Part 21, material traceability, first article inspection

### Software, AI & Automation
- Full-stack: TypeScript/Node.js, React, Python, Rust, Go — production code only
- AI systems: OpenAI APIs (GPT-4o, gpt-image-1, Whisper, TTS), Anthropic Claude, LangChain, vector stores, RAG
- Autonomous bots: browser automation (Playwright), API bots, social media bots (LinkedIn, Instagram, TikTok, X), content pipelines
- Agent architectures: multi-agent systems, tool use, memory, planning loops
- Infrastructure: AWS, Railway, Fly.io, Supabase, PostgreSQL, Redis, Docker
- SaaS architecture: multi-tenancy, Stripe billing, auth (Clerk, Auth0), API design, rate limiting

### Business & Commercial Strategy
- Go-to-market: pricing strategy, channel selection, sales motion, customer acquisition, unit economics
- Financial modelling: cost to build, BOM, margin analysis, break-even, 3-year P&L projections
- Funding: Innovate UK (KTP, SMART, ICF), SBRI, Horizon Europe, UKRI, angel/seed investment, R&D tax credits
- IP strategy: patent searches, freedom to operate, trade secret vs patent decision
- Procurement: supplier negotiation, dual sourcing, lead time management

### Research & Intelligence
- You search the web exhaustively before answering any question about markets, competitors, technology, or regulations
- You cite real sources, real companies, real prices, real timelines
- You never guess at market sizes — you search for evidence

## OUTPUT STYLE
- Use markdown headers, bullet points, tables, and code blocks — your output renders as formatted text
- For specifications: use tables with columns: Parameter | Value | Standard | Supplier
- For code: always include language identifier, full comments, error handling, and production-quality structure
- For business documents: executive summary first, detail below
- For BOMs: table with Qty | Component | Specification | Supplier | Unit Cost (£) | Lead Time
- **Be direct.** No waffle. If the answer is a number, lead with the number. If the answer is a recommendation, lead with the recommendation.
- **Be complete.** When asked to write a section, write the whole section — not a skeleton. Garry needs to be able to copy it and use it.`;

const SCOUT_SYSTEM_PROMPT = () => `You are the Sirius Opportunity Scout — the most powerful business intelligence and automation opportunity engine in existence. Today is ${TODAY()}.

## YOUR MISSION
Find real, actionable, money-making opportunities across every industry on Earth. You search exhaustively — patents, Reddit, ProductHunt, LinkedIn, industry forums, academic papers, market reports, social media trends, App Store reviews, Amazon listings, job boards, news, and competitor products. You leave no corner unsearched.

## WHAT YOU'RE LOOKING FOR

### 1. BOT & AUTOMATION OPPORTUNITIES
Tasks humans do every day that bots can do better, faster, or cheaper:
- Manual data entry and document processing
- Social media management, posting, engagement
- Customer service and triage
- Lead generation and outreach
- Inventory management and procurement
- Research and report generation
- Compliance monitoring and alerting
- Content moderation
- Booking and scheduling
- Code review, testing, deployment
- Financial reconciliation
- Healthcare admin, appointment management
- Legal document review and drafting
- HR screening and onboarding
- Supply chain monitoring

### 2. BROKEN PRODUCT OPPORTUNITIES
Products that exist but are clearly failing their users:
- Search App Store reviews (1–2 stars) for specific pain points
- Search Reddit complaints about existing products
- Look at forum threads asking "is there a better alternative to X?"
- Find products with poor UX, missing features, or bad support

### 3. GAP OPPORTUNITIES
Entire spaces that are underserved or not yet automated:
- Look for industries still using manual processes, spreadsheets, or outdated software
- Find SME (small/medium enterprise) pain points not addressed by enterprise software
- Look at what large companies have that small companies can't afford

### 4. TREND-DRIVEN OPPORTUNITIES
Emerging trends creating new needs:
- New regulations creating compliance burdens
- Platform API changes creating new automation needs
- New technology making previously impossible products viable
- Social media trends showing emerging consumer demand
- Patent expiries opening up previously locked markets

## MANDATORY OUTPUT FORMAT
For EVERY opportunity found:

---
**🔍 OPPORTUNITY: [Specific Name]**
**Industry:** [Sector]
**Type:** [New Product / Product Improvement / Automation Bot / SaaS / Hardware / Service]
**The situation now:** [What currently exists — be specific]
**The gap:** [Exactly what's missing or broken — with evidence]
**The opportunity:** [Precisely what could be built]
**Why now:** [What makes this the right moment — market timing, technology unlock, regulation, trend]
**How to build it:** [Specific approach: tech stack, platforms, APIs, tools — current tech only]
**Effort:** [Low/Medium/High] | **Timeline:** [rough estimate] | **Dev cost:** [range in GBP]
**Revenue model:** [exactly how it makes money]
**Market size:** [evidence-based estimate]
**First step:** [The single most important thing to do first]
**Sources:** [real URLs]

---

## RULES
1. Real web searches only — never make up statistics, market sizes, or sources
2. Every opportunity must have evidence — a real complaint, a real trend, a real gap
3. Cover ALL industries including social media, gaming, adult content compliance, legal, agricultural, veterinary, funeral, construction, food service
4. Prioritise opportunities where: (a) the tech to build it exists today, (b) someone is clearly asking for it, (c) the competition is weak
5. Be direct about money — always estimate GBP revenue potential
6. Never be vague — "AI-powered X" is not an opportunity. "A bot that reads PDF invoices from email attachments and auto-populates Xero accounting software, charging £49/month" is an opportunity.`;

const BOT_DESIGN_PROMPT = () => `You are a specialist bot and automation architect — the world's most precise designer of automation systems. Today is ${TODAY()}.

Your job is to produce a complete, production-ready bot architecture specification. Everything you produce must be buildable today with currently available technology.

For every bot design request, produce:

## BOT ARCHITECTURE: [Name]

### Overview
- **Purpose:** [exactly what the bot does]
- **Trigger:** [what starts it: schedule, webhook, user action, event]
- **Output:** [what it produces]
- **Deployment:** [where it runs: cloud function, server, browser extension, desktop app]

### Technology Stack
- **Language:** [specific language and version]
- **Core libraries:** [real packages with npm/pip names and versions]
- **APIs used:** [real API endpoints with auth method]
- **Data storage:** [specific database/storage]
- **Infrastructure:** [specific hosting: AWS Lambda, Railway, Fly.io, etc.]

### Architecture Diagram
\`\`\`
[ASCII architecture diagram showing data flow]
\`\`\`

### Core Logic (Pseudocode)
\`\`\`
[Step-by-step logic with decision points]
\`\`\`

### Full Implementation
\`\`\`[language]
[Production-ready code with error handling, logging, retry logic]
\`\`\`

### Error Handling & Resilience
- Rate limiting strategy
- Retry logic
- Alerting on failure
- Graceful degradation

### Legal & Compliance Considerations
- Terms of service of platforms being accessed
- Data protection requirements (GDPR, etc.)
- Required permissions or licences

### Deployment Steps
1. [Exact commands to deploy]
2. [Environment variables required]
3. [Monitoring setup]

### Cost to Run
- Infrastructure cost per month
- API costs per 1000 runs
- Total estimated monthly cost at scale`;

function authMiddleware(req: Request, res: Response, next: () => void) {
  const pin = req.headers["x-lab-pin"] as string;
  if (pin !== LAB_PIN) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  next();
}

function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

async function streamChatResponse(
  res: Response,
  systemPrompt: string,
  userMessage: string,
  history: { role: string; content: string }[] = [],
  _model = "gpt-5.2"
): Promise<string> {
  const inputMessages: any[] = [
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  let fullContent = "";

  const stream = await (openai as any).responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" }],
    instructions: systemPrompt,
    input: inputMessages,
    stream: true,
  });

  for await (const event of stream) {
    const eventType = (event as any).type as string;
    if (eventType === "response.web_search_call.in_progress" || eventType === "response.web_search_call.searching") {
      res.write(`data: ${JSON.stringify({ type: "searching" })}\n\n`);
    } else if (eventType === "response.output_text.delta") {
      const delta = (event as any).delta as string;
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }
  }

  return fullContent;
}

// Shared streaming helper for endpoints that use {delta} SSE format
async function streamWithSearch(
  res: Response,
  systemPrompt: string,
  userMessage: string,
  jsonMode = false
): Promise<string> {
  const stream = await (openai as any).responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" }],
    instructions: systemPrompt,
    input: [{ role: "user", content: userMessage }],
    stream: true,
    ...(jsonMode ? { text: { format: { type: "json_object" } } } : {}),
  });

  let fullContent = "";

  for await (const event of stream) {
    const eventType = (event as any).type as string;
    if (eventType === "response.web_search_call.in_progress" || eventType === "response.web_search_call.searching") {
      res.write(`data: ${JSON.stringify({ type: "searching" })}\n\n`);
    } else if (eventType === "response.output_text.delta") {
      const delta = (event as any).delta as string;
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }
  }

  return fullContent;
}

// Auth
router.post("/lab/auth", (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = authAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    res.status(429).json({ error: "Too many attempts", retryAfter });
    return;
  }

  const { pin } = req.body;
  if (pin === LAB_PIN) {
    authAttempts.delete(ip);
    res.json({ success: true });
  } else {
    const newCount = record.count + 1;
    if (newCount >= AUTH_MAX_ATTEMPTS) {
      authAttempts.set(ip, { count: newCount, lockedUntil: now + AUTH_LOCKOUT_MS });
    } else {
      authAttempts.set(ip, { count: newCount, lockedUntil: 0 });
    }
    res.status(401).json({ error: "Invalid PIN", attemptsLeft: Math.max(0, AUTH_MAX_ATTEMPTS - newCount) });
  }
});

// Projects CRUD
router.get("/lab/projects", authMiddleware, async (req: Request, res: Response) => {
  const projects = await db.select().from(labProjects).orderBy(desc(labProjects.updatedAt));
  res.json(projects);
});

router.post("/lab/projects", authMiddleware, async (req: Request, res: Response) => {
  const { name, industry } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [project] = await db.insert(labProjects).values({ name, industry: industry || "General" }).returning();
  res.json(project);
});

// Must be before /:id to avoid "pending-approval" being treated as an ID
router.get("/lab/projects/pending-approval", authMiddleware, async (_req: Request, res: Response) => {
  const pending = await db.select().from(labProjects)
    .where(eq(labProjects.approvalStatus, "pending"))
    .orderBy(desc(labProjects.createdAt));
  res.json(pending);
});

router.get("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(labMessages).where(eq(labMessages.projectId, id)).orderBy(labMessages.createdAt);
  res.json({ ...project, messages });
});

router.put("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    name, industry, phase, status,
    brief, research, specs, code, drawingNotes, cadUrl, materials,
    workflows, industryProblem, uses,
    brochure, pitch, costToBuild, profitMargin,
    businessCase, goToMarket, renders
  } = req.body;
  const updatePayload: Record<string, any> = { updatedAt: new Date() };
  const fields = { name, industry, phase, status, brief, research, specs, code, drawingNotes, cadUrl, materials, workflows, industryProblem, uses, brochure, pitch, costToBuild, profitMargin, businessCase, goToMarket, renders };
  for (const [k, v] of Object.entries(fields)) { if (v !== undefined) (updatePayload as any)[k] = v; }
  const [updated] = await db.update(labProjects).set(updatePayload).where(eq(labProjects.id, id)).returning();
  res.json(updated);

  // Auto-trigger funding analysis when brief or specs are updated with substantial content
  const briefChanged = brief !== undefined && (brief || "").length > 50;
  const specsChanged = specs !== undefined && (specs || "").length > 50;
  if (briefChanged || specsChanged) {
    // Only trigger if not already running
    const [current] = await db.select({ fundingStatus: labProjects.fundingStatus })
      .from(labProjects).where(eq(labProjects.id, id));
    if (current && current.fundingStatus !== "pending") {
      await db.update(labProjects).set({ fundingStatus: "pending" }).where(eq(labProjects.id, id));
      runProjectFundingAnalysis(id).catch(console.error);
    }
  }
});

router.delete("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  await db.delete(labProjects).where(eq(labProjects.id, parseInt(req.params.id)));
  res.json({ success: true });
});

router.get("/lab/projects/:id/messages", authMiddleware, async (req: Request, res: Response) => {
  const messages = await db.select().from(labMessages)
    .where(eq(labMessages.projectId, parseInt(req.params.id)))
    .orderBy(labMessages.createdAt);
  res.json(messages);
});

// Lab AI Chat — gpt-5.2 with full project context
router.post("/lab/projects/:id/chat", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const { message, tab, mode } = req.body;

  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const history = await db.select().from(labMessages)
    .where(eq(labMessages.projectId, projectId))
    .orderBy(labMessages.createdAt);

  await db.insert(labMessages).values({ projectId, role: "user", content: message });

  const projectContext = `
---
## THIS PROJECT: ${project.name.toUpperCase()}
**Industry:** ${project.industry}
**Phase:** ${project.phase || "design"} | **Status:** ${project.status || "active"} | **Current tab focus:** ${tab || "general"}

### What's already been written:
- **Brief:** ${project.brief ? `✓ Written (${project.brief.split(" ").length} words)` : "✗ Not yet written"}
- **Research:** ${project.research ? `✓ Written (${project.research.split(" ").length} words)` : "✗ Not yet written"}
- **Specs:** ${project.specs ? `✓ Written (${project.specs.split(" ").length} words)` : "✗ Not yet written"}
- **Materials:** ${project.materials ? `✓ Written` : "✗ Not yet written"}
- **Code:** ${project.code ? `✓ Written (${project.code.split("\n").length} lines)` : "✗ Not yet written"}
- **Drawings:** ${project.drawingNotes ? `✓ Written` : "✗ Not yet written"}
- **Workflows:** ${project.workflows ? `✓ Written` : "✗ Not yet written"}
- **Market & Uses:** ${project.industryProblem ? `✓ Written` : "✗ Not yet written"}
- **Business Case:** ${project.businessCase ? `✓ Written` : "✗ Not yet written"}
- **Brochure:** ${project.brochure ? `✓ Written` : "✗ Not yet written"}
- **Pitch:** ${project.pitch ? `✓ Written` : "✗ Not yet written"}
- **Economics:** ${project.costToBuild ? `✓ Written` : "✗ Not yet written"}
- **Go-to-Market:** ${project.goToMarket ? `✓ Written` : "✗ Not yet written"}

### Full content of written sections:
${project.brief ? `**BRIEF:**\n${project.brief}\n` : ""}
${project.research ? `**RESEARCH:**\n${project.research}\n` : ""}
${project.specs ? `**SPECS:**\n${project.specs}\n` : ""}
${project.materials ? `**MATERIALS:**\n${project.materials}\n` : ""}
${project.code ? `**CODE:** (${project.code.split("\n").length} lines — available on request)\n` : ""}
${project.industryProblem ? `**MARKET & USES:**\n${project.industryProblem}\n` : ""}
${project.businessCase ? `**BUSINESS CASE:**\n${project.businessCase}\n` : ""}
${project.costToBuild ? `**ECONOMICS:**\n${project.costToBuild}\n` : ""}
${project.goToMarket ? `**GO-TO-MARKET:**\n${project.goToMarket}\n` : ""}

### Your job in this chat:
- Answer questions about the project with full expertise
- Generate any section content when asked — write it completely, ready to copy and use
- Proactively spot gaps, risks, or improvements you notice in the existing content
- If asked to generate an image or render, respond with: [IMAGE_REQUEST: description of what to visualise]
- Search the web for any current data relevant to this project before stating facts`;

  const systemPrompt = mode === "bot"
    ? BOT_DESIGN_PROMPT() + "\n\n" + projectContext
    : LAB_SYSTEM_PROMPT() + "\n\n" + projectContext;

  sseHeaders(res);

  try {
    const fullContent = await streamChatResponse(
      res, systemPrompt, message,
      history.map(m => ({ role: m.role, content: m.content }))
    );

    await db.insert(labMessages).values({ projectId, role: "assistant", content: fullContent });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "Stream failed" })}\n\n`);
  }

  res.end();
});

// Standalone bot design — no project required
router.post("/lab/bot-design", authMiddleware, async (req: Request, res: Response) => {
  const { description, industry, platforms } = req.body;
  if (!description) { res.status(400).json({ error: "Bot description required" }); return; }

  const userMessage = `Design a complete, production-ready bot for the following requirement:

**Description:** ${description}
**Industry:** ${industry || "General"}
**Platforms/systems involved:** ${platforms || "Not specified"}

Produce the full architecture, technology stack, and implementation code. Use currently available technology only. Include cost estimates and deployment instructions.`;

  sseHeaders(res);

  try {
    const fullContent = await streamChatResponse(res, BOT_DESIGN_PROMPT(), userMessage);
    res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

// Opportunity Scout — multi-phase intelligence
router.post("/lab/scout", authMiddleware, async (req: Request, res: Response) => {
  const { query, industries, focus } = req.body;

  let userMessage = "";

  if (focus === "bots") {
    userMessage = `Conduct a deep automation and bot opportunity scan.

Search across: job boards (for repetitive human tasks), Reddit/forums (for manual pain points), ProductHunt (for tools with poor reviews), LinkedIn (for roles that should be automated), and industry publications.

${query ? `Specific focus: "${query}"` : "Scan across all industries."}
${industries?.length ? `Priority industries: ${industries.join(", ")}` : ""}

Find 6 specific, buildable automation bot opportunities. For each one, include the specific technology stack needed to build it today. Be explicit about the revenue model — subscription price, one-time fee, or usage-based.`;
  } else if (focus === "improve") {
    userMessage = `Find existing products that are ripe for improvement or disruption.

Search App Store reviews (1-2 stars), Reddit threads like "I hate X software", "looking for alternative to X", "X is broken", ProductHunt negative comments, and G2/Trustpilot reviews.

${query ? `Specific focus: "${query}"` : "Scan across all software and physical product categories."}
${industries?.length ? `Priority industries: ${industries.join(", ")}` : ""}

Find 6 products with clear, fixable problems where a better version could capture market share. Specify the exact improvements needed and the technical approach to building them.`;
  } else if (focus === "gaps") {
    userMessage = `Find market gaps — industries and use cases with no good solution yet.

Search industry forums, LinkedIn groups, trade publications, conference proceedings, job postings for specialised roles, and academic papers describing unsolved problems.

${query ? `Specific focus: "${query}"` : "Look across all B2B and B2C sectors."}
${industries?.length ? `Priority industries: ${industries.join(", ")}` : ""}

Find 6 genuine market gaps where no adequate solution exists. Include evidence of demand (real quotes, search volume patterns, job posting frequency, or forum post counts).`;
  } else if (focus === "trends") {
    userMessage = `Identify trend-driven opportunities — new things becoming possible right now.

Search: recent regulatory changes creating compliance burden, new platform API releases, recent patent expirations, trending topics on LinkedIn/Reddit/Twitter creating new needs, new technology releases making previously impossible products viable.

${query ? `Specific focus: "${query}"` : "Scan across all sectors."}

Find 6 opportunities driven by something that has changed in the last 12 months. Why is now the right time? What specifically changed?`;
  } else {
    userMessage = `Conduct a comprehensive opportunity scan. Search widely and deeply.

${query ? `Specific focus: "${query}"` : "Scan across all industries and opportunity types."}
${industries?.length ? `Priority industries: ${industries.join(", ")}` : ""}

Find the 6 most compelling opportunities available right now — mix of bot automation, product improvements, market gaps, and trend-driven plays. Prioritise opportunities where the technology exists today and there's clear evidence of demand.`;
  }

  sseHeaders(res);

  try {
    const fullContent = await streamChatResponse(res, SCOUT_SYSTEM_PROMPT(), userMessage);

    if (fullContent) {
      await db.insert(scoutReports).values({
        title: query || `${focus || "Full"} scan — ${new Date().toLocaleDateString("en-GB")}`,
        industry: industries?.join(", ") || "All",
        opportunity: fullContent,
        type: focus || "full",
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

router.get("/lab/scout/reports", authMiddleware, async (req: Request, res: Response) => {
  const reports = await db.select().from(scoutReports).orderBy(desc(scoutReports.createdAt)).limit(30);
  res.json(reports);
});

router.delete("/lab/scout/reports/:id", authMiddleware, async (req: Request, res: Response) => {
  await db.delete(scoutReports).where(eq(scoutReports.id, parseInt(req.params.id)));
  res.json({ success: true });
});

// ─── PRODUCT RENDER GENERATION ─────────────────────────────────────────────

router.post("/lab/projects/:id/render", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const { type = "3d", angle = "perspective", style = "product render" } = req.body;

  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const name = project.name;
  const specs = project.specs?.slice(0, 500) || "";
  const materials = project.materials?.slice(0, 300) || "";
  const brief = project.brief?.slice(0, 300) || "";

  let prompt = "";
  if (type === "3d") {
    prompt = `Professional ${style} of "${name}". ${angle} view. ${specs ? `Key specs: ${specs}.` : ""} ${materials ? `Materials: ${materials}.` : ""} ${brief ? `Description: ${brief}.` : ""} Studio lighting, white background, photorealistic, high detail, product photography quality. Show the product clearly with no text overlays.`;
  } else if (type === "2d") {
    prompt = `Technical 2D product illustration of "${name}". ${angle === "front" ? "Front elevation view" : angle === "side" ? "Side elevation view" : angle === "top" ? "Top plan view" : "Three-view orthographic drawing"}. ${specs ? `Specs: ${specs}.` : ""} Clean technical drawing style, white background, precise lines, engineering illustration.`;
  } else if (type === "exploded") {
    prompt = `Exploded view technical illustration of "${name}" showing all component parts separated and labelled. ${specs ? `Details: ${specs}.` : ""} ${materials ? `Materials: ${materials}.` : ""} Clean white background, isometric perspective, arrows showing assembly directions, professional technical illustration style.`;
  } else if (type === "lifestyle") {
    prompt = `Professional lifestyle photograph of "${name}" in real-world use. ${brief ? `Product context: ${brief}.` : ""} ${specs ? `Details: ${specs}.` : ""} Natural lighting, contextual background showing the product being used, aspirational photography.`;
  }

  try {
    const buffer = await generateImageBuffer(prompt, "1024x1024");
    const b64 = buffer.toString("base64");
    const dataUrl = `data:image/png;base64,${b64}`;

    const existing = JSON.parse(project.renders || "[]") as { url: string; label: string; type: string }[];
    const label = `${type === "3d" ? "3D" : type === "2d" ? "2D" : type === "exploded" ? "Exploded" : "Lifestyle"} — ${angle}`;
    const newRender = { url: dataUrl, label, type, angle, generatedAt: new Date().toISOString() };
    const updatedRenders = [newRender, ...existing].slice(0, 8);

    await db.update(labProjects)
      .set({ renders: JSON.stringify(updatedRenders), updatedAt: new Date() })
      .where(eq(labProjects.id, projectId));

    res.json({ render: newRender, renders: updatedRenders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI DOCUMENT GENERATION ────────────────────────────────────────────────

router.post("/lab/projects/:id/generate", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const { section } = req.body;

  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  sseHeaders(res);

  const ctx = `
Project: ${project.name}
Industry: ${project.industry}
Brief: ${project.brief || "Not yet written"}
Research: ${project.research?.slice(0, 800) || "Not yet written"}
Technical Specs: ${project.specs?.slice(0, 800) || "Not yet written"}
Materials: ${project.materials?.slice(0, 500) || "Not specified"}
Industry Problem: ${project.industryProblem || "Not specified"}
Uses: ${project.uses || "Not specified"}
Cost to Build: ${project.costToBuild || "Not yet calculated"}`;

  const prompts: Record<string, { system: string; user: string }> = {
    materials: {
      system: `You are a world-class materials engineer and procurement specialist. Today is ${TODAY()}. You always recommend real, commercially available materials with real suppliers, real part numbers, and accurate pricing. You reference applicable standards (ISO, ASTM, BS EN, RoHS, REACH). You search for current material pricing.`,
      user: `Based on this project, produce a complete materials specification:

${ctx}

Output a structured materials list covering:
## Materials Specification

### Primary Structural Materials
[For each material: Name | Grade/specification | Supplier | Approx unit cost | Why chosen | Standard]

### Secondary / Functional Materials
[Same format]

### Surface Finish / Coatings
[Treatment, specification, supplier]

### Fasteners & Hardware
[Types, grades, quantities estimate]

### Key Suppliers
[Real company names, what they supply, lead time estimate]

### Material Cost Estimate
[Breakdown and total per unit]

### Sustainability & Compliance
[RoHS, REACH, recyclability, certifications required]`,
    },

    workflows: {
      system: `You are a manufacturing and operations engineer with expertise across all production methods. Today is ${TODAY()}.`,
      user: `Produce a complete manufacturing and deployment workflow for this project:

${ctx}

Include:
## Manufacturing / Deployment Workflow

### Phase 1: Pre-Production
[Requirements review, supplier qualification, tooling, certifications needed]

### Phase 2: Production Steps
[Numbered sequence of exact manufacturing or development steps with time estimates]

### Phase 3: Quality Control
[Inspection points, test methods, acceptance criteria, standards]

### Phase 4: Assembly
[Assembly sequence, tooling, jigs, fixtures]

### Phase 5: Testing & Validation
[Performance tests, compliance tests, user acceptance testing]

### Phase 6: Packaging & Delivery
[Packaging spec, labelling requirements, shipping considerations]

### Timeline
[Gantt-style timeline from design freeze to first shipment]

### Key Risks & Mitigations
[Top 5 risks with mitigation strategies]`,
    },

    brochure: {
      system: `You are a world-class product designer and copywriter — the calibre of Apple or Dyson marketing. You write product brochures that are clear, compelling, aspirational, and precise. No fluff. Every word earns its place.`,
      user: `Create a complete product brochure for this product:

${ctx}

Format:
# [Product Name]
## [Powerful one-line tagline]

[Opening paragraph — emotional hook, the world this product lives in, why it matters now]

## The Problem
[What problem this solves, for whom, and what happens without it — specific and honest]

## The Solution
[What this product does and how — lead with benefit, support with technical truth]

## Key Features
[5-7 specific features, each with a benefit statement, not just a spec]

## Technical Specifications
[Clean, scannable spec sheet]

## Materials & Build Quality
[What it's made from and why that matters]

## Industries & Applications
[Who uses this, in what context, with specific use case examples]

## The Difference
[What makes this genuinely better than alternatives — honest and specific]

## [Call to action]`,
    },

    pitch: {
      system: `You are a pitch deck writer and startup strategist at the level of the best Silicon Valley pitch coaches. You write pitches that are honest, compelling, and investor-ready.`,
      user: `Create a complete investor/client pitch for this product:

${ctx}

Structure:
# [Product Name] — Investor Pitch

## The Problem (Slide 1)
[The pain point — make it visceral and quantified]

## The Solution (Slide 2)
[Exactly what this is, in one sentence, then expanded]

## Market Opportunity (Slide 3)
[TAM / SAM / SOM with evidence — be specific, cite sources]

## Product (Slide 4)
[How it works, key features, technical differentiation]

## Business Model (Slide 5)
[How it makes money — pricing, margins, revenue streams]

## Go-To-Market Strategy (Slide 6)
[First 90 days, first year, distribution channels]

## Competitive Landscape (Slide 7)
[Real competitors, honest comparison, why we win]

## Financial Projections (Slide 8)
[3-year model: revenue, costs, margins — conservative and optimistic]

## Team & Execution (Slide 9)
[Why this team can execute this]

## Ask (Slide 10)
[What you're asking for, what it funds, timeline to milestones]`,
    },

    cost: {
      system: `You are a financial analyst and product cost engineer. You produce accurate, itemised cost models with real market pricing. Today is ${TODAY()}. You search for current component, material, and manufacturing costs.`,
      user: `Produce a complete cost-to-build and profitability analysis for this product:

${ctx}

Include:
## Cost to Build Analysis

### Bill of Materials (BOM)
| Item | Specification | Qty | Unit Cost (£) | Total (£) | Supplier |
[Complete BOM table]

### Manufacturing / Development Costs
| Step | Cost (£) | Notes |
[Labour, tooling, setup, certification costs]

### Overhead & Fixed Costs
[Tooling amortisation, certification, insurance, IP]

### Total Cost Per Unit (at different volumes)
| Volume | Unit Cost | Notes |
| 1 unit (prototype) | £X | |
| 10 units | £X | |
| 100 units | £X | |
| 1,000 units | £X | |

### Pricing Strategy
[Recommended retail/wholesale prices with justification]

### Profit Margin Analysis
| Price Point | Cost | Gross Margin | Margin % |
[Multiple scenarios]

### Break-Even Analysis
[Units and revenue needed to break even]

### 3-Year Financial Projection
| Year | Units | Revenue | COGS | Gross Profit | Margin % |

### Key Cost Reduction Opportunities
[Top 3 ways to reduce cost at scale]`,
    },

    industryProblem: {
      system: `You are a market analyst and product strategist. You write precise, evidence-based market positioning documents. Today is ${TODAY()}.`,
      user: `Write a complete industry and problem analysis for this product:

${ctx}

Include:
## Market & Problem Analysis

### Industry Overview
[The sector this operates in — size, key players, current state]

### The Core Problem
[The specific pain point this solves — be precise, quantify the cost/impact of the problem]

### Who Has This Problem
[Specific buyer personas with characteristics, buying behaviour, and what they currently do instead]

### Current Solutions & Their Failures
[What exists now, why it's inadequate, what's missing]

### Why Now
[What makes this the right moment — technology unlock, regulation, trend, market shift]

### Competitive Landscape
[Real competitors mapped against key dimensions — be honest]

## Use Cases

### Primary Use Cases
[3-5 specific, detailed use cases with example users and workflows]

### Secondary Use Cases
[2-3 additional applications]

### Industries Served
[For each industry: specific application, value delivered, key metrics improved]

### Case Study Example
[One fictional but realistic detailed case study showing the product solving a real problem]`,
    },

    businessCase: {
      system: `You are a senior strategy consultant and investment analyst with deep expertise in product commercialisation and competitive strategy. Today is ${TODAY()}. You write business cases that are precise, evidence-driven, and investment-grade. You have particular expertise in how AI adoption creates durable competitive advantages and defensible market positions. You understand the current AI landscape at the frontier level — LLMs, computer vision, predictive systems, autonomous agents — and how they translate into product differentiation. You never write generic business cases. Every point is specific, quantified, and based on current market reality.`,
      user: `Write a complete strategic business case for developing and bringing this product to market:

${ctx}

Structure:
# Business Case: [Product Name]

## Executive Summary
[3 sentences: What it is, the strategic opportunity, and the primary reason it will outpace competitors]

## The Strategic Opportunity
### Market Timing — Why Now
[What specific market condition, technology unlock, or regulatory shift makes this the optimal moment to build this product. Be precise: reference actual events, technology thresholds crossed, or incumbent failures]

### Market Size & Growth
[TAM / SAM / SOM with real evidence. Market growth rate. What's driving it. Specific data points]

### The Gap in the Market
[Exactly what is missing from the current market. Why incumbents haven't solved it. Where the white space is]

## Why This Product Wins
### Competitive Displacement Strategy
[Name the top 3-5 real competitors. Identify their specific weaknesses. Explain exactly why this product displaces them rather than joins them]

### Sustainable Competitive Advantages
[At least 5 specific advantages. Not features — structural advantages that compound over time: network effects, data moats, switching costs, proprietary methods, regulatory positioning]

### AI as a Competitive Weapon
[This is critical: How AI integration specifically creates an insurmountable edge. Which AI capabilities (LLMs, computer vision, predictive analytics, autonomous agents, personalisation engines) are embedded in this product. Why this makes the product fundamentally better than anything that doesn't use AI the same way. How the AI advantage compounds over time as the product learns. Reference the current frontier of AI capability — what's now commercially deployable that wasn't 12 months ago]

### Technology Moat
[What technical assets will be built that competitors cannot easily replicate: proprietary datasets, trained models, patents, integrations, manufacturing processes]

## Investment Justification
### Cost to Build
[Development cost, time to first revenue, time to profitability]

### Revenue Model
[Primary and secondary revenue streams. Unit economics. Payback period]

### Return Profile
[3-year revenue projection. IRR estimate. Scenario analysis: conservative / base / optimistic]

### Risk-Adjusted Return
[Top 3 risks, probability, mitigation. Net risk-adjusted case for investment]

## Strategic Fit & Build Rationale
### Why We Build This (Not Someone Else)
[Specific unfair advantages the team/organisation brings to this product. Why an outsider can't replicate this]

### Build vs. Buy vs. Partner Analysis
[Should any components be acquired, licensed, or built from scratch? Specific options evaluated]

### Opportunity Cost
[What is the cost of NOT building this? What happens if a competitor launches first?]

## Recommendation
[Clear, direct recommendation: Build / Build with partner / License / Pass. Exact next steps with timeline]`,
    },

    goToMarket: {
      system: `You are a world-class go-to-market strategist with experience launching frontier technology products. Today is ${TODAY()}. You combine product marketing expertise with deep knowledge of sales strategy, channel economics, and AI-driven growth. You write GTM plans that are specific, sequenced, and executable — not frameworks. Every recommendation references real platforms, real channels, and real customer acquisition tactics available today.`,
      user: `Write a complete, execution-ready go-to-market strategy for launching this product:

${ctx}

Structure:
# Go-to-Market Strategy: [Product Name]

## GTM Summary
[One paragraph: Target customer, primary channel, key message, launch model, year-1 revenue target]

## Target Customer
### Ideal Customer Profile (ICP)
[Firmographic and demographic specifics — industry, company size, role, geography, budget, urgency signal]

### Buyer Personas
[2-3 specific personas: their title, what they care about, how they buy, what objections they raise, what breaks their status quo]

### Customer Acquisition Cost (CAC) Target
[Expected CAC by channel. Payback period. LTV:CAC target]

## Positioning & Messaging
### Core Positioning Statement
[One precise positioning statement using the template: For [customer] who [need], [product] is a [category] that [benefit]. Unlike [alternative], we [key differentiator]]

### Key Messages by Persona
[Tailored message per persona — their specific language, their specific fear/aspiration, specific proof point]

### AI Differentiation Message
[How to communicate the AI advantage simply and credibly to a non-technical buyer. What proof point makes it real. Why it matters to them specifically]

## Channel Strategy
### Primary Channel (Year 1)
[The single highest-leverage channel. Why. Specific tactics. Economics]

### Secondary Channels (Year 1)
[2-3 supporting channels with specific tactics and expected contribution]

### Digital Presence
[Website strategy, SEO approach, content plan, social presence — specific platforms, content types, posting cadence]

### Partnerships
[Specific named partners — technology, channel, distribution, OEM. Why each makes sense. How to approach them]

## Sales Motion
### Sales Model
[Self-serve / inside sales / field sales / channel sales — which model and why for this product]

### Sales Process
[Stage-by-stage sales process: prospecting method, discovery approach, demo strategy, proof of concept approach, commercials, close]

### Pricing Strategy
[Specific pricing tiers with prices. Rationale. Competitor price comparison. Upsell/cross-sell paths]

### Sales Enablement
[What the sales team needs: battle cards, ROI calculator, demo environment, case studies, objection handlers]

## Launch Sequence
### Pre-Launch (Months 1-3)
[Exact activities: beta customer recruitment, press/analyst briefings, content pipeline, partnership agreements, sales tool development]

### Launch (Month 4)
[Launch day activities: press release targets, launch event, first paid campaigns, outreach sequences, PR plan]

### Post-Launch (Months 5-12)
[Scaling activities: case study capture, reference customer programme, channel expansion, product-led growth hooks]

## AI-Powered Growth Tactics
[Specific ways AI is used in the go-to-market itself: AI-personalised outreach, AI-driven lead scoring, AI content creation at scale, AI-powered demo personalisation, predictive churn prevention. Reference specific tools available today]

## Year 1 Plan & KPIs
### 90-Day Milestones
[Specific, measurable milestones for weeks 1-4, 5-8, 9-12]

### Year 1 Targets
| Metric | Q1 | Q2 | Q3 | Q4 |
[Revenue, customers, CAC, conversion rate, NPS, churn]

### Success Metrics
[The 5 metrics that determine whether the GTM is working. How they're measured. What good looks like]

## Budget & Resource Plan
[Required headcount, agency/tool spend, marketing budget — broken down by channel and quarter]`,
    },
  };

  const sectionAliases: Record<string, string> = { market: "industryProblem", economics: "cost", "go-to-market": "goToMarket", "business-case": "businessCase" };
  const resolvedSection = sectionAliases[section] || section;

  const selected = prompts[resolvedSection];
  if (!selected) { res.write(`data: ${JSON.stringify({ error: "Unknown section" })}\n\n`); res.end(); return; }

  const dbFieldMap: Record<string, string> = {
    cost: "costToBuild", industryProblem: "industryProblem",
    materials: "materials", workflows: "workflows",
    brochure: "brochure", pitch: "pitch",
    businessCase: "businessCase", goToMarket: "goToMarket",
  };
  const dbField = dbFieldMap[resolvedSection] || resolvedSection;

  try {
    const fullContent = await streamChatResponse(res, selected.system, selected.user);
    await db.update(labProjects)
      .set({ [dbField]: fullContent, updatedAt: new Date() })
      .where(eq(labProjects.id, projectId));
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

// ─── SIRIUS INSIGHTS ───────────────────────────────────────────────────────

router.post("/lab/projects/:id/insights", authMiddleware, async (req: Request, res: Response) => {
  const [p] = await db.select().from(labProjects).where(eq(labProjects.id, parseInt(req.params.id)));
  if (!p) { res.status(404).json({ error: "Not found" }); return; }

  const phase = p.phase || "design";
  const filledFields: string[] = [];
  if (p.brief?.trim()) filledFields.push(`Brief: ${p.brief.slice(0, 600)}`);
  if (p.research?.trim()) filledFields.push(`Research: ${p.research.slice(0, 400)}`);
  if (p.specs?.trim()) filledFields.push(`Technical Specs: ${p.specs.slice(0, 500)}`);
  if (p.materials?.trim()) filledFields.push(`Materials: ${p.materials.slice(0, 400)}`);
  if (p.drawingNotes?.trim()) filledFields.push(`Drawing Notes: ${p.drawingNotes.slice(0, 300)}`);
  if (p.workflows?.trim()) filledFields.push(`Workflows: ${p.workflows.slice(0, 400)}`);
  if (p.industryProblem?.trim()) filledFields.push(`Market Analysis: ${p.industryProblem.slice(0, 400)}`);
  if (p.brochure?.trim()) filledFields.push(`Brochure: ${p.brochure.slice(0, 400)}`);
  if (p.pitch?.trim()) filledFields.push(`Pitch: ${p.pitch.slice(0, 400)}`);
  if (p.costToBuild?.trim()) filledFields.push(`Cost Analysis: ${p.costToBuild.slice(0, 400)}`);
  if (p.businessCase?.trim()) filledFields.push(`Business Case: ${p.businessCase.slice(0, 400)}`);
  if (p.goToMarket?.trim()) filledFields.push(`Go-to-Market Plan: ${p.goToMarket.slice(0, 400)}`);
  const rendersCount = (JSON.parse(p.renders || "[]") as any[]).length;

  const context = filledFields.length > 0
    ? filledFields.join("\n\n")
    : `Project name: "${p.name}", Industry: ${p.industry}. No content yet — give suggestions based on the project name and industry.`;

  const systemPrompt = `You are Sirius, the world's most advanced R&D intelligence partner. Today is ${TODAY()}.

Your job is to analyse a product project and deliver sharp, specific, actionable insights — like a chief engineer, product strategist, and business analyst reviewing the same project simultaneously.

You always:
- Give insights that are immediately actionable, not generic
- Reference real standards, suppliers, regulations, or techniques where relevant
- Identify both RISKS (things that could go wrong) and OPPORTUNITIES (things that could be significantly better)
- Rank by impact — the highest-stakes insights first
- Keep each insight concise but precise — one clear point per insight`;

  const phaseContext = {
    design: "This project is in the Design Phase. Focus on: design risks, missing specifications, material selection issues, regulatory compliance gaps, IP considerations, technical feasibility concerns. Also highlight where AI integration could be built into the product to create competitive advantage.",
    production: "This project is in the Production Phase. Focus on: manufacturing risks, supply chain vulnerabilities, quality control gaps, workflow inefficiencies, timeline risks, cost overruns, and whether the business case adequately identifies the competitive displacement strategy and AI advantage.",
    complete: "This project is nearing or at completion. Focus on: go-to-market execution risks, pricing strategy, pitch weaknesses, competitive differentiation gaps, launch readiness, channel strategy, and whether the AI advantage is being properly communicated and weaponised for market entry.",
  }[phase] || "";

  const userPrompt = `Analyse this project and return EXACTLY a valid JSON array of 6 insight objects. No markdown, no explanation — just the raw JSON array.

PROJECT: "${p.name}"
INDUSTRY: ${p.industry}
CURRENT PHASE: ${phase}
RENDERS GENERATED: ${rendersCount}

CONTENT SO FAR:
${context}

${phaseContext}

Return this exact JSON structure (6 items):
[
  {
    "category": "one of: Design Risk | Material | Regulatory | Technical | Commercial | Manufacturing | Market | Financial | Opportunity | Quality | IP | Supply Chain | Pitch | Safety",
    "priority": "one of: critical | high | medium | low",
    "icon": "one of: alert | lightbulb | shield | trending | wrench | package | globe | pound | star | check",
    "title": "Sharp 6-10 word title — specific to this project",
    "detail": "2-3 sentences. Specific, precise, actionable. Reference real standards, suppliers, techniques. No vague advice.",
    "action": "Exact next step in under 15 words — what should be done right now"
  }
]

Be brutally specific. Reference real things. No generic advice.`;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");

  try {
    const response = await (openai as any).responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      instructions: systemPrompt,
      input: [{ role: "user", content: userPrompt }],
    });

    const raw = response.output_text || "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let insights;
    try { insights = JSON.parse(cleaned); } catch { insights = []; }
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/lab/projects/:id/completeness", authMiddleware, async (req: Request, res: Response) => {
  const [p] = await db.select().from(labProjects).where(eq(labProjects.id, parseInt(req.params.id)));
  if (!p) { res.status(404).json({ error: "Not found" }); return; }

  const checks = [
    { key: "brief", label: "Brief", phase: "design", filled: !!p.brief?.trim() },
    { key: "research", label: "Research", phase: "design", filled: !!p.research?.trim() },
    { key: "specs", label: "Technical Specs", phase: "design", filled: !!p.specs?.trim() },
    { key: "materials", label: "Materials", phase: "design", filled: !!p.materials?.trim() },
    { key: "drawingNotes", label: "Drawing Notes", phase: "design", filled: !!p.drawingNotes?.trim() },
    { key: "workflows", label: "Workflows", phase: "production", filled: !!p.workflows?.trim() },
    { key: "industryProblem", label: "Market Analysis", phase: "production", filled: !!p.industryProblem?.trim() },
    { key: "uses", label: "Use Cases", phase: "production", filled: !!p.uses?.trim() },
    { key: "businessCase", label: "Business Case", phase: "production", filled: !!p.businessCase?.trim() },
    { key: "renders", label: "Product Renders", phase: "complete", filled: (JSON.parse(p.renders || "[]") as any[]).length > 0 },
    { key: "brochure", label: "Brochure", phase: "complete", filled: !!p.brochure?.trim() },
    { key: "pitch", label: "Pitch", phase: "complete", filled: !!p.pitch?.trim() },
    { key: "costToBuild", label: "Cost Analysis", phase: "complete", filled: !!p.costToBuild?.trim() },
    { key: "goToMarket", label: "Go-to-Market Plan", phase: "complete", filled: !!p.goToMarket?.trim() },
  ];

  const filled = checks.filter(c => c.filled).length;
  const total = checks.length;
  const pct = Math.round((filled / total) * 100);

  res.json({ checks, filled, total, pct, phase: p.phase });
});

// Commerce Lab — digital marketing & e-commerce content generation
const COMMERCE_PROMPTS: Record<string, (desc: string, platform: string, tone: string) => string> = {
  listings: (desc, platform, tone) => `You are the world's most effective e-commerce copywriter. Your product listings consistently outperform competitors on click-through rate and conversion.

Generate a complete, platform-optimised product listing for:

PRODUCT/BRAND: ${desc}
PLATFORM: ${platform || "Amazon (primary), with Shopify and Etsy variants"}
TONE: ${tone || "Professional, benefit-led, confident"}

Deliver:

## TITLE VARIANTS (5 options)
Write 5 title options. Each must lead with the primary benefit, include the 2-3 highest-traffic keywords naturally, and stay within platform character limits (Amazon: 200 chars, Shopify: 70 chars for SEO title). Label which platform each is optimised for.

## BULLET POINTS (7 bullets)
Each bullet: benefit first (in CAPS), then feature, then why it matters. No fluff. Every bullet earns its place by answering a real buyer objection or desire.

## PRODUCT DESCRIPTION (200 words)
Narrative-led, customer psychology-informed. Opens with the problem/desire, builds with proof, closes with the transformation. Written for both humans and search algorithms.

## A+ CONTENT / ENHANCED DESCRIPTION OUTLINE
5-section structure for Amazon A+ or Shopify featured content: section title + 50-word copy block each. Visual suggestion for each section.

## BACKEND SEARCH TERMS (Amazon)
250 characters of backend keywords — no repetition of title terms, no prohibited content. Include misspellings, synonyms, use cases.

## SEO META (Shopify)
- Meta title (60 chars): 
- Meta description (155 chars):

## PRICING PSYCHOLOGY NOTES
3 specific pricing and positioning recommendations based on the product type and platform.`,

  adcopy: (desc, platform, tone) => `You are a performance marketing director who has managed £50M+ in ad spend across Google, Meta, and TikTok. Your ads consistently achieve top-quartile ROAS.

Generate a complete set of production-ready ad creative for:

PRODUCT/BRAND: ${desc}
PRIMARY PLATFORM: ${platform || "Meta (Facebook + Instagram), Google Ads, TikTok"}
TONE: ${tone || "Direct, benefit-led, with urgency"}

Deliver:

## META / FACEBOOK ADS (3 complete ads)
For each ad:
- Primary text (125 chars for feed, 500 chars for awareness)
- Headline (27 chars)
- Description (27 chars)  
- CTA button recommendation
- Audience targeting brief (interests, behaviours, demographics)
- Creative direction (what the image/video should show)
- Ad objective recommendation (TOFU/MOFU/BOFU)

## GOOGLE ADS — RESPONSIVE SEARCH ADS (2 ads)
For each:
- 15 headlines (max 30 chars each) — write all 15, label pinning recommendations
- 4 descriptions (max 90 chars each)
- Final URL notes
- Ad extensions: 6 sitelinks, 4 callouts, 4 structured snippets

## TIKTOK ADS (2 ad scripts)
For each:
- Hook (0-3 seconds): exact words/action
- Body (3-12 seconds): problem, product, proof
- CTA (12-15 seconds): exact words
- On-screen text overlay suggestions
- Sound/music direction
- Creator brief summary (if UGC)

## RETARGETING ANGLES (3 angles for warm audiences)
Different messaging for: viewed but didn't add to cart / added to cart but didn't buy / past purchasers for upsell.

## A/B TEST PLAN
5 specific split tests ranked by expected impact. What to test, what to measure, success metric.`,

  email: (desc, platform, tone) => `You are a world-class email marketing specialist. Your sequences achieve open rates of 45%+ and click rates of 8%+.

Generate a complete email sequence for:

PRODUCT/BRAND: ${desc}
PLATFORM/ESP: ${platform || "Klaviyo (adaptable to any ESP)"}
TONE: ${tone || "Warm, personal, benefit-led"}

Deliver 7 complete emails:

## EMAIL 1 — WELCOME / BRAND STORY (send: immediately)
Subject line options (3): 
Preview text:
Body copy (300 words): Brand story, what you stand for, what they can expect. Ends with a soft CTA.

## EMAIL 2 — EDUCATION / PROBLEM (send: day 2)
Subject line options (3):
Preview text:
Body copy (250 words): Deepen the problem your product solves. Build urgency around the pain of NOT solving it. No hard sell yet.

## EMAIL 3 — PRODUCT HERO (send: day 4)
Subject line options (3):
Preview text:
Body copy (300 words): Full product spotlight. Benefits first, features second. Social proof embedded. Clear CTA.

## EMAIL 4 — SOCIAL PROOF / OBJECTION HANDLING (send: day 6)
Subject line options (3):
Preview text:
Body copy (250 words): Real customer outcomes (write illustrative examples). Handle the top 3 objections directly.

## EMAIL 5 — URGENCY / OFFER (send: day 8)
Subject line options (3):
Preview text:
Body copy (200 words): Limited time or limited stock angle. Make the offer feel inevitable. Hard CTA.

## EMAIL 6 — ABANDONED CART (send: 1hr after abandon)
Subject line options (3):
Preview text:
Body copy (150 words): Conversational, slightly humorous. Address why they might have hesitated. Cart link prominent.

## EMAIL 7 — WIN-BACK (send: 30 days post-purchase or 14 days no engagement)
Subject line options (3):
Preview text:
Body copy (200 words): Re-engage. New angle, new value, new reason to come back.

## SEGMENTATION NOTES
How to split these flows for: cold list vs. engaged vs. past purchasers.

## DELIVERABILITY CHECKLIST
5 technical and content checks before sending.`,

  seo: (desc, platform, tone) => `You are an SEO strategist who has ranked hundreds of pages to position 1 for competitive commercial keywords. You understand search intent, Google's Quality Rater Guidelines, and E-E-A-T deeply.

Generate a complete SEO content brief for:

PRODUCT/BRAND/TOPIC: ${desc}
PLATFORM/CMS: ${platform || "Any (WordPress, Shopify, Webflow)"}
CONTENT PURPOSE: ${tone || "Rank and convert — commercial intent"}

Deliver:

## KEYWORD STRATEGY
Primary keyword: [name the most valuable, achievable target keyword]
Search intent: [informational / commercial / transactional / navigational]
Monthly search volume estimate: [range]
Keyword difficulty: [assessment]

Semantic cluster (15 supporting keywords):
- [keyword] | intent | estimated volume
(list all 15)

Featured snippet opportunity: [yes/no + what question to answer]
People Also Ask targets: [5 specific questions]

## PAGE STRUCTURE
H1 (exact): 
H2 sections (8 headings — these are the sections of the article/page):
Under each H2: 2-3 bullet points of what to cover, what angle to take, what proof/data to include

## META DATA
Title tag (60 chars): 
Meta description (155 chars): 
URL slug: 
Alt text formula for images:

## CONTENT SPECIFICATIONS
Word count target:
Reading level target:
Content format: [article / landing page / product page / comparison page]
Internal linking opportunities (5 specific pages to link to/from):
External authority links to pursue (3 types of sources):

## E-E-A-T REQUIREMENTS
5 specific ways to demonstrate Experience, Expertise, Authoritativeness, Trustworthiness for this topic.

## CONTENT GAPS ANALYSIS
3 things the current top-ranking pages are missing that you can do better.

## 90-DAY RANKING ROADMAP
Month 1: [actions]
Month 2: [actions]  
Month 3: [expected position + actions to maintain]`,

  social: (desc, platform, tone) => `You are a social media strategist who builds audiences of 100k+ from scratch. You understand the algorithm, the psychology of sharing, and the difference between content that gets likes and content that gets sales.

Generate a 30-day social media content calendar for:

PRODUCT/BRAND: ${desc}
PLATFORMS: ${platform || "Instagram, TikTok, LinkedIn (adapt as needed)"}
TONE: ${tone || "Authentic, engaging, conversion-focused"}

Deliver:

## CONTENT PILLARS (5 pillars)
Name each pillar and explain its purpose (educate / entertain / inspire / convert / community). What % of content should each be?

## 30-DAY CALENDAR
Week 1 (Days 1-7): Lay out each day with:
- Platform
- Content type (Reel / Carousel / Story / Post / Short / Article)
- Hook (first line — this is the most important part)
- Body summary (2 sentences)
- CTA
- Hashtag strategy (3 tiers: niche/medium/broad)

Week 2 (Days 8-14): Same format
Week 3 (Days 15-21): Same format
Week 4 (Days 22-30): Same format

## VIRAL CONTENT FORMULAS (5 templates)
For each: the formula, an example using this brand, why it works psychologically, best platform.

## POSTING SCHEDULE
Optimal times by platform (with reasoning). Frequency recommendations.

## COMMUNITY MANAGEMENT PLAYBOOK
How to respond to comments to maximise reach. DM strategy. Collaboration/UGC tactics.

## 30-DAY METRICS TARGETS
What success looks like: follower growth, reach, engagement rate, click-through, conversions.`,

  conversion: (desc, platform, tone) => `You are a conversion rate optimisation expert who has improved conversion rates from 1% to 5%+ across e-commerce stores and landing pages. You understand buyer psychology, friction mapping, and systematic testing.

Perform a complete CRO audit and strategy for:

PRODUCT/BRAND/PAGE: ${desc}
PLATFORM: ${platform || "Shopify / general e-commerce landing page"}
CURRENT STAGE: ${tone || "Optimise for maximum purchase conversion"}

Deliver:

## BUYER JOURNEY ANALYSIS
Map the 5 stages of buyer awareness for this product: Unaware → Problem Aware → Solution Aware → Product Aware → Most Aware. What does a visitor at each stage need to see on this page?

## PAGE STRUCTURE AUDIT
Evaluate and rewrite each section:

### Above the Fold
- What must be visible without scrolling (hero image, headline, subheadline, CTA, trust signals)
- Ideal headline formula + 3 headline options for this product
- CTA button text options (5 variants, ranked by predicted conversion)

### Social Proof Section  
- Types of proof needed (reviews, ratings, media logos, user count, celebrity endorsement)
- Exact format and placement
- What review content to surface (what people should say)

### Product Description
- Structure: lead with transformation, not features
- Formatting for scanners vs. readers
- What objections to pre-empt and where

### FAQ Section
- 8 questions that buying-intent visitors actually have — answer each concisely

### Checkout Flow
- 5 specific friction points to remove
- Trust signals needed at checkout
- Abandonment recovery tactics

## TOP 10 CRO WINS (prioritised by impact vs. effort)
For each: what to change, why it works, expected uplift, how to test it.

## A/B TEST ROADMAP (12 weeks)
Week-by-week testing plan. What to test first, how to measure, when to call a winner.

## TRAFFIC QUALITY FILTER
5 ways to pre-qualify traffic so you're not converting the wrong visitors.

## PERSONALISATION OPPORTUNITIES
3 dynamic content changes based on traffic source, device, or behaviour.`,
};

router.post("/lab/commerce", authMiddleware, async (req: Request, res: Response) => {
  const { type, description, platform, tone } = req.body;
  if (!type || !description) { res.status(400).json({ error: "type and description required" }); return; }

  const promptFn = COMMERCE_PROMPTS[type];
  if (!promptFn) { res.status(400).json({ error: "Unknown commerce type" }); return; }

  sseHeaders(res);

  try {
    const systemPrompt = promptFn(description, platform || "", tone || "");
    const userMessage = `Generate the complete ${type} output as specified. Be thorough, specific, and immediately actionable. Use the product/brand details provided. Write real copy — not placeholders.`;

    const fullContent = await streamWithSearch(res, systemPrompt, userMessage);
    res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

// Funding Radar — real grants & tax incentives across all projects
const FUNDING_SYSTEM_PROMPT = `You are the world's most comprehensive R&D funding advisor, with expert knowledge of grant schemes, R&D tax incentives, and innovation funding programmes across every major country. Today is ${TODAY()}.

## YOUR MISSION
Analyse each R&D project and identify ONLY real, currently active or regularly recurring funding opportunities worldwide. Do not invent schemes. Do not mention permanently closed programmes. Only include schemes where there is genuine eligibility.

## COMPREHENSIVE SCHEME DATABASE

### 🇬🇧 UNITED KINGDOM — TAX INCENTIVES
- **UK RDEC (R&D Expenditure Credit)** — Merged scheme from April 2024. 20% taxable credit for all UK companies; 27% for R&D-intensive SMEs (qualifying R&D ≥ 30% of total expenditure). Qualifying costs: staff, subcontractors (65% cap), materials, software, cloud computing, utilities. Covers any work resolving genuine scientific or technological uncertainty.
- **UK Patent Box** — 10% corporation tax on patent-derived profits. Combinable with RDEC. Apply if project produces patentable innovations.
- **EIS / SEIS** — Tax relief for investors into qualifying UK companies. SEIS: up to 50% income tax relief, first £250k raised. EIS: 30% relief, up to £5M/year. Relevant for companies seeking investment into innovative projects.

### 🇬🇧 UNITED KINGDOM — GRANTS
- **Innovate UK Smart Grants** — Quarterly competitions, £25k–£2M, 25–70% funding. Any sector. Apply via Innovate UK Funding Service.
- **Knowledge Transfer Partnerships (KTP)** — 50–67% funded. Business + university collaboration. Minimum 2 years. Embeds a graduate.
- **SBRI (Small Business Research Initiative)** — Government department challenges. Up to £1M Phase 2. Run by DASA, DHSC, DESNZ and others.
- **Horizon Europe EIC Accelerator** — Up to €2.5M grant + €15M equity. UK fully eligible (re-associated Dec 2023). Deep tech focus.
- **Horizon Europe EIC Pathfinder** — Up to €4M collaborative breakthrough research.
- **Eurostars** — Up to 50% funding for R&D SMEs. International collaboration required.
- **DASA (Defence & Security Accelerator)** — Quick Wins £25k–£100k; competitions up to £5M. Defence, security, AI, drones, sensors.
- **ATI (Aerospace Technology Institute)** — Up to 50% for aerospace R&D. Min £250k project cost.
- **APC (Advanced Propulsion Centre)** — Up to £10M+. Zero-emission vehicles, batteries, fuel cells.
- **NIHR i4i** — £100k–£2M for medical devices and health technology.
- **UK Space Agency** — Various competitions for space, EO, satellite technology.
- **Made Smarter Innovation** — Manufacturing digitalisation, AI, robotics. Up to £5M.
- **Faraday Battery Challenge** — Battery tech, energy storage, EVs. Up to £10M.
- **Catapult Centres** — Co-funded R&D access: High Value Manufacturing, Digital, Connected Places, Medicines Discovery, Offshore Renewable Energy Catapults.

### 🇺🇸 UNITED STATES
- **US Federal R&D Tax Credit (Section 41)** — 20% credit on qualifying research expenses above base amount. Available to any US entity or US subsidiary. Applies to software, hardware, product development, process innovation.
- **SBIR / STTR** — Phase I up to $275k; Phase II up to $1.85M. 11 federal agencies (DoD, NIH, NASA, NSF, DoE, EPA, USDA, DHS, ED, DOT, HHS). Tech must be commercially viable.
- **DOE ARPA-E** — Up to $5M+ for transformational energy technology. Very competitive.
- **NSF SBIR/STTR** — Up to $2M Phase II for deep tech. Strong for AI, software, hardware, clean tech.
- **NIH SBIR** — Up to $1.85M for health, biotech, medical device, diagnostics.
- **State-level R&D credits** — Most US states offer additional credits (e.g. California 15–24%, New York up to 9%, Texas franchise tax exemptions). Relevant if company has US operations.

### 🇨🇦 CANADA
- **SR&ED (Scientific Research & Experimental Development)** — 15–35% tax credit on qualifying R&D. 35% refundable for CCPCs with <$3M expenditure; 15% non-refundable for others. One of the most generous R&D tax programmes globally.
- **NRC IRAP (Industrial Research Assistance Program)** — Up to $500k in non-repayable funding for Canadian SMEs. Technology development and commercialisation.
- **Strategic Innovation Fund** — Up to $50M+ for large-scale industrial R&D and innovation projects.
- **Canada Digital Adoption Program** — Up to $15k advisory + up to $100k loan for digital tech adoption.

### 🇦🇺 AUSTRALIA
- **R&D Tax Incentive** — 43.5% refundable tax offset for companies with <$20M aggregated turnover; 38.5% non-refundable for larger. Available to Australian incorporated entities. Administered by ATO + AusIndustry.
- **Entrepreneurs' Programme (EP)** — Up to $1M in matched grant funding for R&D commercialisation. Business Growth and Research Connections streams.
- **CRC-P (Cooperative Research Centres Projects)** — Up to $3M over 3 years for industry-led R&D collaboration with research organisations.

### 🇩🇪 GERMANY
- **ZIM (Zentrales Innovationsprogramm Mittelstand)** — Up to €2.1M per project for German SMEs or international collaboration with German partners.
- **BMBF Programme Funding** — Multiple technology-specific programmes (AI, hydrogen, quantum, manufacturing). Up to several million euros.
- **Forschungszulage (R&D Tax Credit)** — 25% tax credit on qualifying R&D wage costs, up to €10M expenditure base (max €2.5M credit). For all German companies.

### 🇫🇷 FRANCE
- **CIR (Crédit Impôt Recherche)** — 30% tax credit on first €100M R&D spend; 5% above. One of the most generous R&D tax schemes globally. Available to French entities or French subsidiaries.
- **CII (Crédit Impôt Innovation)** — 20% credit on prototyping and innovation expenses up to €400k for SMEs.
- **BPI France Grants** — Various programmes for innovation, digitalisation, deep tech. Up to several million euros.
- **French Tech** — Visa, grant access, and investor network for startups scaling in France.

### 🇳🇱 NETHERLANDS
- **WBSO** — R&D tax credit: 32% for first €350k (40% for startups), 16% thereafter. Covers staff costs and direct R&D expenditure.
- **Innovation Box** — 9% effective corporation tax on qualifying innovation profits.
- **MIT (MKB Innovatiestimulering Topsectoren)** — SME innovation grants up to €350k.

### 🇮🇪 IRELAND
- **Irish R&D Tax Credit** — 30% credit on qualifying R&D expenditure (25% for large companies above €7.5M). Fully payable (refundable) credit.
- **Enterprise Ireland R&D Fund** — Up to 80% grant funding for feasibility; 45–60% for R&D projects up to €650k.
- **IDA Ireland** — Grants and supports for companies establishing or expanding R&D in Ireland.

### 🇮🇱 ISRAEL
- **Israel Innovation Authority (IIA)** — 20–50% grant on approved R&D budgets. One of the most active innovation funding bodies globally. Covers software, hardware, life sciences, clean tech.
- **Binational R&D Programmes** — BIRD (US-Israel), BRITECH (UK-Israel), GITPA (Germany-Israel). Joint R&D with matching country.

### 🇸🇬 SINGAPORE
- **Enterprise Development Grant (EDG)** — Up to 50% (70% for SMEs) on product development and innovation projects.
- **Startup SG Tech** — POC grants up to $250k; POV grants up to $500k.
- **RIE (Research, Innovation & Enterprise) Fund** — Multiple sector programmes.
- **IP Development Incentive** — 5–10% tax on qualifying IP income.

### 🇯🇵 JAPAN
- **NEDO (New Energy and Industrial Technology Development Organization)** — Grants for energy, environment, and industrial technology R&D. Up to ¥several billion for large projects.
- **JST (Japan Science and Technology Agency)** — Research grants and commercialisation support.
- **METI R&D Tax Credit** — 6–12% credit on qualifying R&D expenditure for Japanese entities.

### 🇰🇷 SOUTH KOREA
- **R&D Tax Credit** — Up to 40% credit on qualifying R&D costs for SMEs; 0–2% for large companies. Very generous SME rate.
- **TIPS (Tech Incubator Programme for Startup)** — Up to ₩1B for deep tech startups backed by qualifying accelerators.
- **IITP / NRF Grants** — Government R&D grants across ICT, AI, bio, materials.

### 🇮🇳 INDIA
- **DST NIDHI** — Up to ₹5 crore in grant + equity for deep tech startups.
- **DPIIT Startup India** — 3-year tax exemption, fund of funds access.
- **MeitY Grants** — Technology development in electronics, software, AI, cybersecurity.
- **BIRAC (Biotech Industry Research Assistance Council)** — Up to ₹50 lakh for biotech/med-tech startups.

### 🇦🇪 UAE
- **Abu Dhabi Global Market (ADGM) Hub71** — Up to $500k equity-free support + co-investment for deep tech startups.
- **Mohammed Bin Rashid Innovation Fund** — Loan guarantees and financing for innovation projects.
- **Dubai Future Accelerators / AREA 2071** — Pilot access, co-funding for smart city, AI, sustainability tech.

### 🇸🇪 SWEDEN
- **Vinnova** — Up to SEK 10M+ grants for innovation projects. Collaborative and solo applications.
- **Almi** — Business development loans and co-financing for Swedish SMEs.

### 🇩🇰 DENMARK
- **Innobooster (Innovation Fund Denmark)** — Up to DKK 5M for innovative businesses. Fast-track process.
- **Danish R&D Tax Credit** — Up to 30% tax deduction on R&D costs; losses converted to cash refund up to DKK 5.5M.

### 🇪🇸 SPAIN
- **CDTI (Centro para el Desarrollo Tecnológico Industrial)** — Loans and partial grants for industrial R&D. Up to €5M+.
- **Spanish R&D Tax Credit** — 25% credit on qualifying R&D (42% for basic research). One of Europe's most generous R&D tax incentives.

### 🇮🇹 ITALY
- **PNRR Innovation Funds** — Multiple streams via National Recovery Plan for digital and green technology.
- **Credito d'Imposta Ricerca e Sviluppo** — 20% tax credit on qualifying R&D expenditure.
- **MISE Innovation Contracts** — Up to 50% grant/loan for industrial R&D projects.

## OUTPUT FORMAT — SINGLE PROJECT
Return valid JSON only. No markdown. No preamble.

{
  "opportunities": [
    {
      "projectId": <number>,
      "projectName": "<string>",
      "matches": [
        {
          "scheme": "<exact scheme name>",
          "type": "tax_credit" | "grant" | "equity" | "loan",
          "geography": "UK" | "EU" | "USA" | "Canada" | "Australia" | "Germany" | "France" | "Ireland" | "Israel" | "Singapore" | "Japan" | "South Korea" | "India" | "UAE" | "Sweden" | "Denmark" | "Spain" | "Italy" | "Netherlands" | "International",
          "amount": "<e.g. Up to £2M | 20% of qualifying costs | €2.5M grant + €15M equity>",
          "matchStrength": "strong" | "good" | "possible",
          "matchReason": "<1-2 sentences: exactly why this project qualifies>",
          "keyEvidence": "<what to document to support the claim>",
          "nextStep": "<specific actionable next step with URL or contact>",
          "url": "<real government or official organisation URL>"
        }
      ]
    }
  ],
  "summary": "<2-3 sentences: total potential value, strongest opportunities, top recommendation>"
}

## RULES
1. Only include schemes with genuine eligibility based on actual project content
2. strong = clearly meets criteria; good = likely eligible with conditions; possible = worth investigating
3. Be specific — reference actual project content in matchReason
4. Always include UK RDEC if there is genuine scientific/technological uncertainty (applies to almost all R&D)
5. Always check USA Federal R&D Tax Credit if the project could have US operations or US subsidiary potential
6. Always check Canada SR&ED if there is any Canadian angle
7. URLs must be real official government or organisation websites
8. R&D Tax credits should always be the first matches (they apply broadly) — grants are secondary`;

// Run funding analysis for a single project and store the result
async function runProjectFundingAnalysis(projectId: number) {
  try {
    const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
    if (!project) return;

    const hasContent = (project.brief && project.brief.length > 30) ||
      (project.specs && project.specs.length > 30) ||
      (project.research && project.research.length > 30);

    if (!hasContent) {
      await db.update(labProjects).set({ fundingStatus: "" }).where(eq(labProjects.id, projectId));
      return;
    }

    const projectSummary = {
      id: project.id,
      name: project.name,
      industry: project.industry,
      phase: project.phase,
      brief: (project.brief || "").slice(0, 1200),
      specs: (project.specs || "").slice(0, 800),
      research: (project.research || "").slice(0, 600),
      materials: (project.materials || "").slice(0, 400),
      code: project.code ? "[Code present]" : "",
      businessCase: (project.businessCase || "").slice(0, 400),
    };

    const userMessage = `Analyse this R&D project against all UK and international funding opportunities. Search the web first to verify current programme status and deadlines. Be rigorous — only include genuine eligibility.

PROJECT:
${JSON.stringify(projectSummary, null, 2)}

Return the JSON response as specified. This is for a single project — the opportunities array should have exactly one entry.`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: FUNDING_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = aiResponse.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    JSON.parse(content); // validate JSON

    await db.update(labProjects).set({
      fundingAnalysis: content,
      fundingStatus: "complete",
      fundingAnalysedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(labProjects.id, projectId));

    console.log(`[Funding] Analysis complete for project ${projectId} (${project.name})`);
  } catch (err) {
    console.error(`[Funding] Analysis failed for project ${projectId}:`, err);
    await db.update(labProjects).set({ fundingStatus: "error" }).where(eq(labProjects.id, projectId));
  }
}

// Per-project funding analysis — manual trigger or auto-called
router.post("/lab/projects/:id/funding", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  // Mark as pending immediately so the UI can show progress
  await db.update(labProjects).set({ fundingStatus: "pending", updatedAt: new Date() }).where(eq(labProjects.id, projectId));
  res.json({ status: "pending", message: "Funding analysis started" });

  // Run in background (non-blocking)
  runProjectFundingAnalysis(projectId).catch(console.error);
});

// Funding Radar — all projects at once (manual global scan, still streams)
router.post("/lab/funding", authMiddleware, async (req: Request, res: Response) => {
  sseHeaders(res);

  try {
    const projects = await db.select().from(labProjects).orderBy(desc(labProjects.updatedAt));

    if (projects.length === 0) {
      res.write(`data: ${JSON.stringify({ done: true, content: JSON.stringify({ opportunities: [], summary: "No projects found in the Lab. Add projects and fill in their Brief and Specs to enable funding analysis." }) })}\n\n`);
      res.end();
      return;
    }

    const projectSummaries = projects.map(p => ({
      id: p.id,
      name: p.name,
      industry: p.industry,
      phase: p.phase,
      brief: (p.brief || "").slice(0, 800),
      specs: (p.specs || "").slice(0, 600),
      research: (p.research || "").slice(0, 400),
      materials: (p.materials || "").slice(0, 300),
      code: p.code ? "[Code present]" : "",
      costToBuild: (p.costToBuild || "").slice(0, 200),
    }));

    const userMessage = `Analyse these R&D projects for UK and international funding opportunities. Be rigorous — only include schemes where there is genuine eligibility.

PROJECTS:
${JSON.stringify(projectSummaries, null, 2)}

Return the JSON response as specified.`;

    const fullContent = await streamWithSearch(res, FUNDING_SYSTEM_PROMPT, userMessage);
    res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

// ── CAD File Storage ────────────────────────────────────────────────────────

const storage = new ObjectStorageService();

// Request a presigned upload URL and register the file
router.post("/lab/projects/:id/cad-files", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const { fileName, fileSize, fileType, objectPath, description } = req.body;

  if (!fileName || !objectPath) {
    return res.status(400).json({ error: "fileName and objectPath are required" });
  }

  try {
    const [file] = await db.insert(cadFiles).values({
      projectId,
      fileName,
      fileSize: fileSize || 0,
      fileType: fileType || "",
      objectPath,
      description: description || "",
    }).returning();

    return res.json(file);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Request presigned upload URL from GCS
router.post("/lab/projects/:id/cad-files/upload-url", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    return res.json({ uploadURL, objectPath });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List CAD files for a project
router.get("/lab/projects/:id/cad-files", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  try {
    const files = await db
      .select()
      .from(cadFiles)
      .where(eq(cadFiles.projectId, projectId))
      .orderBy(desc(cadFiles.uploadedAt));
    return res.json(files);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update description of a CAD file
router.patch("/lab/projects/:id/cad-files/:fileId", authMiddleware, async (req: Request, res: Response) => {
  const fileId = parseInt(req.params.fileId);
  const { description } = req.body;
  try {
    const [updated] = await db
      .update(cadFiles)
      .set({ description })
      .where(eq(cadFiles.id, fileId))
      .returning();
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a CAD file
router.delete("/lab/projects/:id/cad-files/:fileId", authMiddleware, async (req: Request, res: Response) => {
  const fileId = parseInt(req.params.fileId);
  try {
    await db.delete(cadFiles).where(eq(cadFiles.id, fileId));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Generate a presigned download URL for a CAD file
router.get("/lab/projects/:id/cad-files/:fileId/download-url", authMiddleware, async (req: Request, res: Response) => {
  const fileId = parseInt(req.params.fileId);
  try {
    const [record] = await db.select().from(cadFiles).where(eq(cadFiles.id, fileId));
    if (!record) return res.status(404).json({ error: "File not found" });
    const signedUrl = await storage.getObjectEntityDownloadURL(record.objectPath, 3600);
    return res.json({ url: signedUrl, fileName: record.fileName });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Approval workflow ─────────────────────────────────────────────────────────

// Public — no PIN required (returns count only, no project details)
router.get("/lab/notification-count", async (_req: Request, res: Response) => {
  try {
    const pending = await db.select({ id: labProjects.id })
      .from(labProjects)
      .where(eq(labProjects.approvalStatus, "pending"));
    res.json({ pendingApproval: pending.length });
  } catch {
    res.json({ pendingApproval: 0 });
  }
});

router.post("/lab/projects/:id/approve", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  await db.update(labProjects).set({ approvalStatus: "approved", updatedAt: new Date() }).where(eq(labProjects.id, id));
  res.json({ ok: true });
});

router.post("/lab/projects/:id/reject", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  await db.update(labProjects).set({ approvalStatus: "rejected", updatedAt: new Date() }).where(eq(labProjects.id, id));
  res.json({ ok: true });
});

// ── Auto-scan history & manual trigger ────────────────────────────────────────

router.get("/lab/scan-history", authMiddleware, async (_req: Request, res: Response) => {
  const history = await db.select().from(labScanHistory)
    .orderBy(desc(labScanHistory.startedAt))
    .limit(20);
  res.json(history);
});

router.post("/lab/auto-scan/trigger", authMiddleware, async (_req: Request, res: Response) => {
  if (isLabScanRunning()) {
    res.json({ status: "already_running", message: "A scan is already in progress." });
    return;
  }
  res.json({ status: "started", message: "Autonomous scan started in background." });
  // Fire and forget
  runLabAutoScan().catch(err => console.error("[Lab Auto-Scan] Manual trigger error:", err));
});

router.get("/lab/auto-scan/status", authMiddleware, (_req: Request, res: Response) => {
  res.json({ running: isLabScanRunning() });
});

// ── Complete All Sections ──────────────────────────────────────────────────
router.post("/lab/projects/:id/complete-all", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  sseHeaders(res);

  const SECTIONS: { key: string; label: string; field: keyof typeof project; prompt: string }[] = [
    { key: "brief", label: "Brief", field: "brief", prompt: `Write a comprehensive project brief for: "${project.name}" in the ${project.industry} industry. Include: executive summary, problem being solved, proposed solution, key objectives, success criteria, scope, constraints, and assumptions. Be thorough — this is the foundation of the entire project.` },
    { key: "research", label: "Research", field: "research", prompt: `Conduct deep research for: "${project.name}" in ${project.industry}. Search for: current market landscape, key competitors with funding and traction, technology approaches used, regulatory environment, customer pain points with evidence, recent news and developments, pricing benchmarks, and market size estimates. Use web search. Cite sources.` },
    { key: "specs", label: "Technical Specs", field: "specs", prompt: `Write complete technical specifications for: "${project.name}" in ${project.industry}. Include: system architecture, performance requirements with numbers, interface specifications, reliability/availability targets, security requirements, scalability requirements, applicable standards (ISO, IEC, FDA, etc.), and any hardware/material specifications. Be precise with units and values.` },
    { key: "materials", label: "Materials / BOM", field: "materials", prompt: `Create a complete Bill of Materials (BOM) for: "${project.name}". Format as a table: Qty | Component | Specification | Supplier | Unit Cost (£) | Lead Time. Then write a materials selection rationale explaining why each key material or component was chosen. Include at least 10–15 line items.` },
    { key: "workflows", label: "Workflows", field: "workflows", prompt: `Design complete manufacturing and deployment workflows for: "${project.name}". Include: step-by-step production/deployment process, quality checkpoints at each stage, who does what, tooling/equipment required at each step, estimated time per step, and key risks at each stage.` },
    { key: "industryProblem", label: "Market & Uses", field: "industryProblem", prompt: `Write a full market analysis for: "${project.name}" in ${project.industry}. Include: the specific problem being solved (with evidence), target customer segments with profiles, use cases across different sectors, market size (TAM/SAM/SOM with sources), competitive landscape, positioning strategy, and why this product wins.` },
    { key: "businessCase", label: "Business Case", field: "businessCase", prompt: `Write a compelling business case for: "${project.name}". Include: investment required, expected revenue model, 3-year financial projections, payback period, ROI, strategic rationale, risks and mitigations, alternative options considered, and why this is the best use of capital. Include real numbers.` },
    { key: "brochure", label: "Brochure", field: "brochure", prompt: `Write complete product brochure copy for: "${project.name}". Include: headline, value proposition, key benefits (not features), technical highlights, use cases, customer testimonial placeholder, specifications summary, and call to action. Tone: professional but compelling. Suitable for PDF/print.` },
    { key: "pitch", label: "Pitch Deck", field: "pitch", prompt: `Write complete pitch deck content for: "${project.name}". Cover all 12 essential slides: Problem, Solution, Market Opportunity, Product, Business Model, Traction (or roadmap if pre-traction), Team, Competitive Advantage, Financials, Ask (investment/order), Use of Funds, Vision. Each slide: title + 3–5 concise bullet points.` },
    { key: "costToBuild", label: "Economics", field: "costToBuild", prompt: `Create a full unit economics analysis for: "${project.name}". Include: cost to develop/manufacture (one-time), cost per unit (COGS), pricing strategy with rationale, gross margin, contribution margin, break-even analysis, projected revenue at 100/500/1000 units or customers, and 3-year P&L projection. All figures in GBP.` },
    { key: "goToMarket", label: "Go-to-Market", field: "goToMarket", prompt: `Write a detailed go-to-market strategy for: "${project.name}". Include: launch channels and why, pricing tiers, sales motion (direct/indirect/product-led), first 10 customers acquisition strategy, 90-day launch plan with milestones, KPIs and targets, marketing messages for each customer segment, and partnerships to pursue.` },
  ];

  const updates: Record<string, string> = {};
  let completed = 0;

  for (const section of SECTIONS) {
    if (project[section.field]) {
      res.write(`data: ${JSON.stringify({ type: "skip", section: section.key, label: section.label, message: "Already written — skipping" })}\n\n`);
      completed++;
      continue;
    }

    res.write(`data: ${JSON.stringify({ type: "start", section: section.key, label: section.label, total: SECTIONS.length, completed })}\n\n`);

    try {
      const stream = await (openai as any).responses.create({
        model: "gpt-4o",
        tools: [{ type: "web_search_preview" }],
        instructions: LAB_SYSTEM_PROMPT() + `\n\n## PROJECT: ${project.name} (${project.industry})\n${project.brief ? `Brief: ${project.brief.slice(0, 500)}` : ""}`,
        input: [{ role: "user", content: section.prompt }],
        stream: true,
      });

      let content = "";
      for await (const event of stream) {
        const eventType = (event as any).type as string;
        if (eventType === "response.web_search_call.in_progress") {
          res.write(`data: ${JSON.stringify({ type: "searching", section: section.key })}\n\n`);
        } else if (eventType === "response.output_text.delta") {
          const delta = (event as any).delta as string;
          if (delta) {
            content += delta;
            res.write(`data: ${JSON.stringify({ type: "chunk", section: section.key, delta })}\n\n`);
          }
        }
      }

      updates[section.field] = content;
      await db.update(labProjects).set({ [section.field]: content, updatedAt: new Date() }).where(eq(labProjects.id, projectId));
      completed++;
      res.write(`data: ${JSON.stringify({ type: "done", section: section.key, label: section.label, completed, total: SECTIONS.length })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: "error", section: section.key, error: err.message })}\n\n`);
      completed++;
    }
  }

  res.write(`data: ${JSON.stringify({ type: "complete", total: SECTIONS.length })}\n\n`);
  res.end();
});

router.post("/lab/rank-opportunities", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const pending = await db.select().from(labProjects).where(eq(labProjects.approvalStatus, "pending"));
    if (pending.length === 0) {
      return res.json({ rankings: [] });
    }

    const projectSummaries = pending.map((p, i) => `
PROJECT ${i + 1}:
ID: ${p.id}
Name: ${p.name}
Industry: ${p.industry}
Brief: ${(p.brief || "").slice(0, 400)}
Business Case: ${(p.businessCase || "").slice(0, 300)}
`).join("\n---\n");

    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a commercial strategy expert ranking product opportunities for Strategic Innovation Dundee Ltd — a precision engineering business (sliding head CNC lathes, EDM wire cutting) that also develops autonomous AI/marketing bot products. Today is ${today}.

Your job: rank these pending projects strictly by how quickly and easily the owner can make real money from them. Think like an investor who needs returns fast.

Scoring criteria:
- Speed to first paying customer (weighted heavily)
- Size and accessibility of the market RIGHT NOW
- Build complexity vs revenue potential ratio
- How clear and proven the customer pain is
- Whether customers already exist and are ready to pay

Return a JSON object with this exact structure:
{
  "rankings": [
    {
      "projectId": <number>,
      "name": "<project name>",
      "rank": <1 = best>,
      "monetisationScore": <0-100, where 100 = immediate guaranteed revenue>,
      "timeToFirstRevenue": "<e.g. 2-4 weeks / 1-2 months / 3-6 months>",
      "revenueConfidence": "<Very High / High / Medium / Low>",
      "verdict": "<One punchy sentence: why this ranks here and what the revenue opportunity actually is>",
      "keyStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
      "estimatedMonthlyRevenue": "<realistic monthly revenue estimate by month 6, e.g. £5,000-15,000/mo>",
      "buildEffort": "<Low / Medium / High>"
    }
  ]
}

Be honest. If something will take 18 months to generate revenue, say so. Rank 1 must be the genuinely best opportunity to monetise fast.`,
        },
        {
          role: "user",
          content: `Rank these ${pending.length} pending project opportunities:\n\n${projectSummaries}`,
        },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    console.error("[Rank Opportunities]", err);
    res.status(500).json({ error: "Failed to rank opportunities" });
  }
});

export default router;

