import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, labProjects, labMessages, scoutReports } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

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
  const {
    name, industry, phase, status,
    brief, research, specs, code, drawingNotes, cadUrl, materials,
    workflows, industryProblem, uses,
    brochure, pitch, costToBuild, profitMargin, renders
  } = req.body;
  const updatePayload: Record<string, any> = { updatedAt: new Date() };
  const fields = { name, industry, phase, status, brief, research, specs, code, drawingNotes, cadUrl, materials, workflows, industryProblem, uses, brochure, pitch, costToBuild, profitMargin, renders };
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
  };

  const sectionAliases: Record<string, string> = { market: "industryProblem", economics: "cost" };
  const resolvedSection = sectionAliases[section] || section;

  const selected = prompts[resolvedSection];
  if (!selected) { res.write(`data: ${JSON.stringify({ error: "Unknown section" })}\n\n`); res.end(); return; }

  const dbFieldMap: Record<string, string> = {
    cost: "costToBuild", industryProblem: "industryProblem",
    materials: "materials", workflows: "workflows",
    brochure: "brochure", pitch: "pitch",
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
    design: "This project is in the Design Phase. Focus on: design risks, missing specifications, material selection issues, regulatory compliance gaps, IP considerations, and technical feasibility concerns.",
    production: "This project is in the Production Phase. Focus on: manufacturing risks, supply chain vulnerabilities, quality control gaps, workflow inefficiencies, timeline risks, and cost overruns.",
    complete: "This project is nearing or at completion. Focus on: market positioning gaps, pricing strategy, pitch weaknesses, competitive differentiation, go-to-market risks, and final pre-launch checks.",
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
    { key: "renders", label: "Product Renders", phase: "complete", filled: (JSON.parse(p.renders || "[]") as any[]).length > 0 },
    { key: "brochure", label: "Brochure", phase: "complete", filled: !!p.brochure?.trim() },
    { key: "pitch", label: "Pitch", phase: "complete", filled: !!p.pitch?.trim() },
    { key: "costToBuild", label: "Cost Analysis", phase: "complete", filled: !!p.costToBuild?.trim() },
    { key: "profitMargin", label: "Profit Margin", phase: "complete", filled: !!p.profitMargin?.trim() },
  ];

  const filled = checks.filter(c => c.filled).length;
  const total = checks.length;
  const pct = Math.round((filled / total) * 100);

  res.json({ checks, filled, total, pct, phase: p.phase });
});

export default router;
