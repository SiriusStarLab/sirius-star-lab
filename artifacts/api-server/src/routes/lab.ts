import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, labProjects, labMessages, scoutReports } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

const AUTH_MAX_ATTEMPTS = 10;
const AUTH_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const authAttempts = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

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
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content || "[]";
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

    const stream = await (openai as any).chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

// Funding Radar — real grants & tax incentives across all projects
const FUNDING_SYSTEM_PROMPT = `You are a specialist R&D funding advisor with deep expertise in UK, EU, and international grant schemes, tax incentives, and innovation funding programmes. Today is ${TODAY()}.

## YOUR MISSION
Analyse each R&D project provided and identify ONLY real, currently active or regularly recurring funding opportunities. Do not invent schemes. Do not mention schemes that have closed permanently. Do not mention schemes that are irrelevant to the project.

## REAL SCHEMES YOU MAY REFERENCE (verify relevance to each project)

### UK TAX INCENTIVES
- **RDEC (R&D Expenditure Credit)** — merged scheme from April 2024. 20% taxable credit on qualifying R&D expenditure for all UK companies. R&D-intensive SMEs (where qualifying R&D ≥ 30% of total expenditure) receive 27% credit. Qualifying costs: staff salaries, subcontractor costs (65% cap), materials consumed, software licences, utilities. Must be UK-based R&D activities solving scientific or technological uncertainty.
- **Patent Box** — 10% corporation tax rate on profits attributable to patented inventions. Can be combined with RDEC. Relevant if project produces patentable innovations.

### UK GRANTS — INNOVATE UK / UKRI
- **Innovate UK Smart Grants** — quarterly open competitions, £25k–£2M, 25–70% funding, for game-changing innovations across all sectors. Apply via Innovate UK website.
- **Knowledge Transfer Partnerships (KTP)** — 50–67% funded collaborative projects between businesses and universities. Minimum 2-year projects. Delivers a graduate embedded in the business.
- **Small Business Research Initiative (SBRI)** — government department challenges, up to £1M Phase 2. Various departments run these (DASA, DHSC, DESNZ etc).
- **Innovate UK Edge** — support for high-growth innovative SMEs.
- **Horizon Europe (UK association restored Dec 2023)** — UK companies fully eligible. EIC Accelerator (up to €2.5M grant + €15M equity investment), EIC Pathfinder (up to €4M collaborative), ERC grants (individual researchers).
- **Eurostars** — EUREKA programme for R&D-performing SMEs, up to 50% funding, collaborative international projects.

### UK SECTOR-SPECIFIC
- **DASA (Defence and Security Accelerator)** — Quick Wins £25k–£100k, main competitions up to £5M. Open to dual-use technologies. Industries: defence, security, cybersecurity, drones, AI, sensors, communications.
- **ATI Programme (Aerospace Technology Institute)** — up to 50% funding for aerospace R&D. Minimum £250k project costs. Joint government/industry funding.
- **APC (Advanced Propulsion Centre)** — up to £10M+ for automotive/propulsion technology R&D. Focus on zero emission vehicles, batteries, fuel cells, powertrains.
- **NIHR (National Institute for Health Research)** — for medical devices, diagnostics, health technology. Invention for Innovation (i4i) programme, £100k–£2M.
- **UK Space Agency grants** — for space technology, Earth observation, satellite communications. Various competitions throughout the year.
- **Made Smarter Innovation** — manufacturing digitalisation, Industry 4.0, robotics, AI in manufacturing. Up to £5M.
- **Catapult Centres** — co-funded access to facilities and expertise: High Value Manufacturing Catapult, Connected Places, Digital Catapult, Medicines Discovery Catapult, Offshore Renewable Energy Catapult.
- **Faraday Battery Challenge** — battery technology, energy storage, electric vehicles. Up to £10M.
- **Industrial Energy Transformation Fund (IETF)** — energy efficiency and decarbonisation in industry.

### EU / INTERNATIONAL
- **Horizon Europe EIC Accelerator** — up to €2.5M grant + up to €15M equity. For deep tech startups. Open to UK companies (re-associated Dec 2023). Highly competitive.
- **Horizon Europe EIC Pathfinder** — up to €4M for breakthrough research. Collaborative.
- **Canada SR&ED (Scientific Research & Experimental Development)** — 15–35% tax credit on qualifying R&D. Available to any company with Canadian R&D activities or subsidiaries.
- **Australia R&D Tax Incentive** — 43.5% refundable tax offset for companies with <$20M aggregated turnover; 38.5% non-refundable for larger. Available to Australian entities.
- **Germany ZIM (Zentrales Innovationsprogramm Mittelstand)** — up to €2.1M per project for German SMEs or international collaboration with German partners.
- **Netherlands WBSO** — R&D tax credit, 32% for first €350k for startups, 16% thereafter.
- **USA SBIR/STTR** — if company has US operations: Phase I up to $275k, Phase II up to $1.85M. 11 federal agencies.
- **Singapore Enterprise Development Grant (EDG)** — up to 50% funding for product development and innovation if operating in Singapore.

## OUTPUT FORMAT
Return valid JSON only. No markdown. No preamble. This exact structure:

{
  "opportunities": [
    {
      "projectId": <number>,
      "projectName": "<string>",
      "matches": [
        {
          "scheme": "<exact scheme name>",
          "type": "tax_credit" | "grant" | "equity" | "loan",
          "geography": "UK" | "EU" | "International" | "UK + EU",
          "amount": "<e.g. Up to £2M | 20% of qualifying costs | €2.5M grant + €15M equity>",
          "matchStrength": "strong" | "good" | "possible",
          "matchReason": "<1-2 sentences: exactly why this project qualifies for this specific scheme>",
          "keyEvidence": "<what the applicant needs to document/evidence to support the claim>",
          "nextStep": "<specific actionable next step — e.g. 'Register on Innovate UK Funding Service and apply in next Smart Grant round (check innovateuk.ukri.org for current window)'>",
          "url": "<real URL for more information>"
        }
      ]
    }
  ],
  "summary": "<2-3 sentences: overall portfolio funding picture — estimated total potential value, strongest opportunities, strategic recommendations>"
}

## RULES
1. Only include schemes where there is genuine eligibility based on the project description — do not list every scheme for every project
2. matchStrength "strong" = project clearly meets core eligibility criteria; "good" = likely eligible with some conditions; "possible" = worth investigating, eligibility not certain
3. Be specific about WHY this project qualifies — reference actual project content
4. URLs must be real government or official organisation websites
5. If a project has insufficient information to assess, include it with an empty matches array and note in matchReason
6. Prioritise UK RDEC for any project with genuine scientific/technological uncertainty — it applies to almost all R&D`;

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

    const stream = await (openai as any).chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: FUNDING_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

export default router;
