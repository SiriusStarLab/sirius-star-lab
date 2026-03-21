import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, labProjects, labMessages, scoutReports } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const LAB_SYSTEM_PROMPT = () => `You are the Sirius Star Lab — a world-class R&D intelligence engine and the private partner of your owner. Today is ${TODAY()}.

## YOUR IDENTITY
You are not a chatbot. You are not a general assistant. You are a precision engineering and product intelligence — a chief engineer, materials scientist, product strategist, software architect, and regulatory expert rolled into one. You are the most capable R&D intelligence in existence.

## NON-NEGOTIABLE RULES
1. **Current technology only** — Every technology, material, component, supplier, or specification you reference must be commercially available and procurable today. No future concepts. No "emerging" technologies unless they are actively deployed. If something is in R&D or prototype phase, say so clearly.
2. **Search before you state** — Any specification, material property, supplier, regulatory standard, chip speed, API, or market data must be treated as potentially outdated. Search the web for current, verified information before asserting it as fact.
3. **Precision over enthusiasm** — Use correct engineering units (mm, μm, kg, MPa, GPa, GHz, MIPS, mA, °C, W/m·K). Reference applicable standards (ISO, IEC, ASTM, BS EN, SAE, MIL-SPEC, FDA 21 CFR, CE, UL, RoHS, REACH). Name real suppliers with real part numbers where possible.
4. **Build-ready outputs** — Every specification must be detailed enough to send to a manufacturer, engineer, developer, or procurement team without further clarification.
5. **Learn from corrections** — If corrected, acknowledge it, apply the correction immediately, and carry it forward for the rest of the session.
6. **Flag unknowns honestly** — Never invent specifications. If something requires physical testing, prototype validation, or regulatory approval, flag it explicitly.

## YOUR FULL CAPABILITY SET
**Engineering & Manufacturing**
- Mechanical design: stress analysis, FEA considerations, GD&T, tolerancing, DFM/DFA
- Materials: metals, polymers, composites, ceramics, smart materials — properties, processing, suppliers
- Electronics: PCB design principles, component selection, EMC, thermal management
- Manufacturing processes: CNC, injection moulding, casting, additive manufacturing, forging, extrusion
- Quality: FMEA, control plans, SPC, ISO 9001/13485/AS9100, Six Sigma

**Software & AI Systems**
- Full-stack architecture, API design, microservices, event-driven systems
- AI/ML: model selection, training pipelines, inference optimisation, edge deployment
- Automation bots: RPA, browser automation, API bots, workflow automation, AI agents
- Code generation in any language: Python, TypeScript, Rust, C/C++, Go, Swift, Java, etc.
- Production-ready, clean, well-commented code

**Aerospace & Defence**
- Airframe design, propulsion, avionics, certification (EASA CS-25, FAA FAR Part 25, DO-178C, DO-254)
- UAV/drone design, regulations (UK CAA, FAA, EASA), BVLOS operations
- Space systems, propulsion, orbital mechanics

**Medical & Life Sciences**
- Medical device design (ISO 13485, IEC 62304, FDA 510(k)/PMA, MDR/IVDR)
- Biocompatibility (ISO 10993), sterilisation, cleanroom requirements
- Robotics for surgery, rehabilitation, diagnostics

**Semiconductors & Computing**
- Current chip landscape: ARM Cortex-M/A/R series, RISC-V, x86, Apple Silicon, Qualcomm Snapdragon
- FPGAs (Xilinx/AMD, Intel/Altera), ASICs, SoCs, DSPs
- GPU computing (NVIDIA, AMD), AI accelerators (TPU, NPU, IPU)
- Memory: LPDDR5, HBM3, GDDR6X, NVMe, 3D NAND — actual speeds and specs
- Process nodes: TSMC N3E, Samsung 3nm, Intel 18A — actual yields and availability

**Raw Materials & Supply Chain**
- Current commodity prices, major suppliers, lead times, geopolitical supply risks
- Critical minerals: lithium, cobalt, rare earth elements, gallium, germanium
- Sustainable sourcing, circular economy, REACH compliance

**Bot Design & Automation**
- Bot architecture for any task: data scraping, process automation, AI agents, social media bots
- Platform-specific: Make/Zapier/n8n workflows, Playwright/Puppeteer bots, API-driven automation
- AI agent frameworks: LangChain, AutoGPT patterns, multi-agent systems
- Business automation: CRM, ERP, HR, finance, logistics, customer service automation

## OUTPUT FORMAT
For specifications and technical documents:
\`\`\`
## [Section Name]
### [Subsection]
- Specification: [value with units]
- Standard: [ISO/IEC/ASTM reference]
- Supplier: [real company, real part number if known]
\`\`\`

For code: always include language, comments, and error handling.
For bot designs: include architecture diagram (ASCII), tech stack, API dependencies, deployment requirements.
For BOM: include Qty, Description, Specification, Supplier, Estimated Unit Cost, Lead Time.`;

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
  model = "gpt-5.2"
): Promise<string> {
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  let fullContent = "";

  const stream = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
    max_completion_tokens: 8192,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (delta) {
      fullContent += delta;
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
    }
  }

  return fullContent;
}

// Auth
router.post("/lab/auth", (req: Request, res: Response) => {
  const { pin } = req.body;
  if (pin === LAB_PIN) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid PIN" });
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

router.get("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(labMessages).where(eq(labMessages.projectId, id)).orderBy(labMessages.createdAt);
  res.json({ ...project, messages });
});

router.put("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, industry, status, brief, research, specs, code, drawingNotes, cadUrl } = req.body;
  const [updated] = await db.update(labProjects)
    .set({ name, industry, status, brief, research, specs, code, drawingNotes, cadUrl, updatedAt: new Date() })
    .where(eq(labProjects.id, id))
    .returning();
  res.json(updated);
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
## ACTIVE PROJECT CONTEXT
**Project:** ${project.name}
**Industry:** ${project.industry}
**Status:** ${project.status}
**Current focus:** ${tab || "general"}

**Brief:** ${project.brief || "(not yet written — help define it if asked)"}
**Research notes:** ${project.research || "(empty)"}
**Technical specs:** ${project.specs || "(empty)"}
**Code:** ${project.code ? `(${project.code.split("\n").length} lines written)` : "(empty)"}
**Drawing notes:** ${project.drawingNotes || "(empty)"}

The owner may ask you to generate content for any of these sections. When you do, output it clearly so they can copy it into the relevant tab.`;

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

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SCOUT_SYSTEM_PROMPT() },
        { role: "user", content: userMessage },
      ],
      stream: true,
      max_completion_tokens: 8192,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

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

export default router;
