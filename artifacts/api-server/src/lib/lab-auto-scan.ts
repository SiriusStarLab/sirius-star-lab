/**
 * Sirius Star Lab — Autonomous Multi-Sector Scanner
 *
 * Runs every 24 hours. Scans EVERY industry sector on Earth across 5 intelligence passes:
 *
 *   Pass 1 — Bot & Automation opportunities (4 sector clusters × 4 bots)
 *   Pass 2 — SaaS & Software gap opportunities (4 sector clusters × 3 products)
 *   Pass 3 — Broken Product mining (App Store, Reddit, forums — 6 improvement targets)
 *   Pass 4 — Precision Engineering products (expanded sectors — 6 products)
 *   Pass 5 — Trend & Patent intelligence (emerging opportunities — 5 products)
 *
 * Every project lands in the DB with approvalStatus = "pending" — owner decides what to build.
 */

import crypto from "crypto";
import { eq, desc } from "drizzle-orm";
import { db, labProjects, labScanHistory, appBuilderSessions } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ── Shared output format ───────────────────────────────────────────────────────

const PRODUCT_FORMAT = `
## OUTPUT FORMAT (strict — separate each product with ---PRODUCT---)

PRODUCT_NAME: [Specific, marketable product name — not generic]
TYPE: [Bot/Automation | SaaS/Software | Product Improvement | Engineering Product | Trend Play]
INDUSTRY: [Exact industry sector]
PROBLEM: [Specific problem — 2 sentences with evidence of real people complaining about this]
SOLUTION: [Precisely what gets built — not vague]
BRIEF: [350+ word product brief: what it is, who buys it, their exact daily pain, how this solves it, key features, tech approach, why better than alternatives, revenue model]
RESEARCH: [350+ word research: market size with source, top 3 competitors and their specific weaknesses, key tech/regulatory considerations, recent signals validating this, UK/Scotland angles if any]
BUSINESS_CASE: [250+ word business case: revenue potential yr 1/3, investment needed, time to first £, key risks, recommendation with confidence level 1-10]
OPPORTUNITY_SCORE: [6-10]
---PRODUCT---`;

const RULES = `
## RULES
1. Search the web RIGHT NOW — all data must be current (within 12 months)
2. Every product must have evidence someone is asking for it (real complaint, real trend, real gap)
3. No science fiction — must be buildable within 18 months with current technology
4. Minimum OPPORTUNITY_SCORE 7
5. Be specific: name real competitors, real market sizes, real technologies, real customers
6. Each BRIEF, RESEARCH, and BUSINESS_CASE must be minimum 250 words
7. Never repeat an opportunity from a different angle — each must be genuinely distinct`;

// ── Pass 1: Bot & Automation — 4 sector clusters ──────────────────────────────

const BOT_CLUSTERS = [
  {
    id: "bots-professional",
    label: "Professional Services",
    sectors: "Legal (law firms, conveyancing, contract review), Finance (accounting, bookkeeping, CFO services), Insurance (claims processing, underwriting), HR (recruitment agencies, onboarding, payroll, compliance)",
    count: 4,
  },
  {
    id: "bots-health-care",
    label: "Healthcare & Public Sector",
    sectors: "Healthcare (GP practices, dental, physio, mental health clinics, NHS admin), Social Care, Veterinary practices, Pharmacy, Local government (planning, permits, council services)",
    count: 4,
  },
  {
    id: "bots-commerce",
    label: "Commerce & Hospitality",
    sectors: "Retail (inventory, customer service, returns), eCommerce (Amazon/Shopify sellers, fulfilment), Hospitality (hotels, restaurants, takeaways), Food delivery, Events & ticketing, Tourism",
    count: 4,
  },
  {
    id: "bots-industrial",
    label: "Industrial & Trades",
    sectors: "Construction (site admin, compliance, procurement), Property management (landlords, letting agents, facilities), Agriculture (farm management, livestock tracking, crop monitoring), Logistics (haulage, last-mile, freight forwarding), Manufacturing (production scheduling, quality reporting)",
    count: 4,
  },
];

// ── Pass 2: SaaS & Software Gaps — 4 sector clusters ─────────────────────────

const SAAS_CLUSTERS = [
  {
    id: "saas-creative",
    label: "Creative & Media",
    sectors: "Podcasters, YouTubers, newsletter writers, indie game developers, music producers, graphic designers, photographers, video editors, social media creators — tools they desperately need that don't exist or are badly broken",
    count: 3,
  },
  {
    id: "saas-education",
    label: "Education & Training",
    sectors: "Schools (admin, SEN reporting, parent communication), universities, tutoring platforms, corporate L&D, professional certification bodies, skills bootcamps — gaps in their tooling",
    count: 3,
  },
  {
    id: "saas-niche-smb",
    label: "Niche SMB Tools",
    sectors: "Funeral directors, tattoo studios, pet groomers, car detailers, mobile mechanics, personal trainers, massage therapists, childcare providers, cleaning companies — businesses using WhatsApp and spreadsheets because no decent software exists for them",
    count: 3,
  },
  {
    id: "saas-data-compliance",
    label: "Data, Compliance & Regulation",
    sectors: "GDPR/data compliance for SMEs, AI governance tools, ESG reporting, supply chain due diligence (UK Modern Slavery Act), employment law compliance, CQC compliance for care homes, FCA compliance for IFAs",
    count: 3,
  },
];

// ── Pass 3: Broken Product Mining ─────────────────────────────────────────────

const BROKEN_PRODUCT_PROMPT = () => `You are a product intelligence analyst with access to the web. Today is ${TODAY()}.

## YOUR MISSION
Search the internet RIGHT NOW for products that are clearly failing their users — then identify exactly what better version to build.

Search these specific sources:
- App Store reviews (1-2 star reviews) for: project management apps, CRM tools, accounting software, HR software, scheduling apps, field service management apps
- Reddit threads: r/smallbusiness, r/freelance, r/entrepreneur, r/legaladvice, r/accounting, r/marketing — search "is there a better alternative to X", "I hate X app because", "frustrated with X"
- G2, Capterra, Trustpilot — look for software with high complaint volume about specific features
- Twitter/X — search for "X app is terrible", "X software keeps", "switched away from X"
- UK-specific: look for US-centric tools that are poor for UK SMEs (US date formats, no VAT support, no Companies House integration, etc.)

For each broken product you find, design the better version.

${PRODUCT_FORMAT}
${RULES}

Find 6 genuinely broken products with clear evidence of user frustration and identify the exact better product to build.`;

// ── Pass 4: Precision Engineering — Expanded Sectors ─────────────────────────

const ENGINEERING_PROMPT = () => `You are a precision engineering product intelligence analyst. Today is ${TODAY()}.

## MANUFACTURING CAPABILITY
Strategic Innovation Dundee Ltd has:
- Dugard CNC sliding head lathes (38mm bar capacity) — complex multi-feature turned parts, ±0.005mm tolerance
- Dugard CNC sliding head lathes (26mm bar capacity) — high-volume precision turning
- Star CNC sliding head lathe — high-speed precision turning
- Two EDM wire cutting machines — ultra-precise profiles, hardened steels, complex forms, bespoke tooling & gauges

CAN MAKE: precision turned components, complex machined parts, bespoke cutting tools, gauges, fixtures, implant-grade parts, aerospace-spec components, sensor housings, hydraulic fittings, custom tooling.

## SECTORS TO SCAN
Search for high-value precision component opportunities across ALL of these sectors:
- **Oil & Gas**: subsea connectors, valve bodies, downhole tools, wellhead components, hydraulic manifolds
- **Aerospace**: landing gear parts, fastener systems, hydraulic actuator components, sensor housings, fuel system parts
- **Medical Devices**: orthopaedic implants, surgical instruments, endoscopy components, catheter components, drug delivery mechanisms, dental implant components
- **Hydrogen/Clean Energy**: fuel cell hardware, high-pressure hydrogen fittings, electrolysis components, valve seats, sensor housings
- **Automotive/Motorsport**: precision powertrain components, EV battery connectors, motorsport-spec parts, fuel injection components
- **Defence**: precision actuator components, optical instrument housings, weapon system components, UAV precision parts
- **Nuclear**: instrumentation fittings, high-integrity valve components, containment seals (where EDM/turning applicable)
- **Marine/Offshore**: subsea instrumentation fittings, precision pump components, ROV components, mooring system parts
- **Semiconductor/Electronics**: precision jigs and fixtures, test probe housings, inspection gauges, vacuum system components
- **Scientific Instruments**: precision optical mounts, metrology gauge components, laboratory instrument parts

${PRODUCT_FORMAT}
${RULES}

Find 6 high-value precision component products manufacturable on the described machines. Each must state WHICH machine makes it and why it's a strong commercial opportunity right now.`;

// ── Pass 5: Trend & Patent Intelligence ──────────────────────────────────────

const TREND_PROMPT = () => `You are an emerging opportunity analyst with full web access. Today is ${TODAY()}.

## YOUR MISSION
Search the web RIGHT NOW for:
1. New UK/EU regulations coming into force in the next 12 months that will create compliance burdens and therefore software/service opportunities
2. Patent filings in the last 6 months in areas where the underlying technology is now mature enough to build a product
3. ProductHunt launches in the last 30 days that are getting traction — what's the gap their success reveals?
4. Recent Y Combinator / Seedcamp / Techstars batches — what sectors are they investing in and what's the gap adjacent to those bets?
5. News about industries being disrupted by AI where incumbents haven't adapted — businesses that still operate the old way
6. New government initiatives (UK specifically): UKRI funding calls, DESNZ hydrogen projects, NHS digitisation, defence procurement
7. Job boards (Indeed, LinkedIn) — search for "we need someone to manually do X" — these are automation opportunities
8. Social media trends creating new commercial needs (new platforms, new content formats, new creator economy segments)

${PRODUCT_FORMAT}
${RULES}

Find 5 specific trend-driven or regulation-driven product opportunities with concrete timing reasons why NOW is the moment to build.`;

// ── Shared: product parser ─────────────────────────────────────────────────────

type ProductOpportunity = {
  name: string;
  type: string;
  industry: string;
  problem: string;
  solution: string;
  brief: string;
  research: string;
  businessCase: string;
  score: number;
};

function parseOpportunities(raw: string): ProductOpportunity[] {
  const blocks = raw.split("---PRODUCT---").map(s => s.trim()).filter(Boolean);
  return blocks.map(block => {
    const get = (key: string): string => {
      const match = block.match(new RegExp(`${key}:\\s*([\\s\\S]+?)(?=\\n[A-Z_]+:|$)`));
      return match ? match[1].trim() : "";
    };
    const score = parseInt(get("OPPORTUNITY_SCORE")) || 7;
    return {
      name: get("PRODUCT_NAME"),
      type: get("TYPE") || "Software/SaaS",
      industry: get("INDUSTRY"),
      problem: get("PROBLEM"),
      solution: get("SOLUTION"),
      brief: get("BRIEF"),
      research: get("RESEARCH"),
      businessCase: get("BUSINESS_CASE"),
      score,
    };
  }).filter(o => o.name && o.brief && o.score >= 6);
}

// ── Duplicate detection ───────────────────────────────────────────────────────

function namesSimilar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const na = norm(a).split(/\s+/);
  const nb = norm(b).split(/\s+/);
  const common = na.filter(w => nb.includes(w) && w.length > 3);
  return common.length >= 2;
}

// ── GPT-4o with web search ────────────────────────────────────────────────────

async function runScanWithWebSearch(systemPrompt: string, userPrompt: string, maxTokens = 8000): Promise<string> {
  // Use the Responses API with web_search_preview for live internet access
  const response = await (openai as any).responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" }],
    instructions: systemPrompt,
    input: [{ role: "user", content: userPrompt }],
    max_output_tokens: maxTokens,
  });

  // Extract text from response
  let text = "";
  for (const item of response.output || []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === "output_text") text += c.text;
      }
    }
  }
  return text;
}

// ── Funding analysis ──────────────────────────────────────────────────────────

async function triggerFundingForProject(projectId: number) {
  try {
    const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
    if (!project) return;

    const prompt = `Analyse this project for UK and international funding opportunities. Return the top 5 most relevant schemes.

PROJECT: ${project.name} | INDUSTRY: ${project.industry}
BRIEF: ${(project.brief || "").slice(0, 600)}

Return JSON: { "opportunities": [{ "projectId": ${project.id}, "projectName": "${project.name}", "matches": [{ "scheme": "...", "type": "tax_credit|grant|equity|loan", "geography": "UK|EU|USA|...", "amount": "...", "matchStrength": "strong|good|possible", "matchReason": "...", "keyEvidence": "...", "nextStep": "...", "url": "..." }] }], "summary": "..." }`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a specialist R&D funding advisor. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = resp.choices[0]?.message?.content;
    if (!content) throw new Error("No content");
    JSON.parse(content);

    await db.update(labProjects).set({
      fundingAnalysis: content,
      fundingStatus: "complete",
      fundingAnalysedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(labProjects.id, projectId));
  } catch (err) {
    await db.update(labProjects).set({ fundingStatus: "error" }).where(eq(labProjects.id, projectId));
    console.error(`[Lab Auto-Scan] Funding analysis failed for project ${projectId}:`, err);
  }
}

// ── Auto-Build Engine — fires for every software project the scanner creates ──

const SOFTWARE_KEYWORDS = [
  "bot", "saas", "platform", "app", "software", "dashboard", "tool", "api",
  "automation", "ai", "agent", "portal", "system", "suite", "engine", "service",
  "crm", "erp", "marketplace", "plugin", "extension", "chatbot", "workflow",
];

function isSoftwareBuildable(name: string, brief: string): boolean {
  const text = `${name} ${brief}`.toLowerCase();
  return SOFTWARE_KEYWORDS.some(kw => text.includes(kw));
}

function parseAgentFiles(output: string): Record<string, string> {
  const files: Record<string, string> = {};
  const fileRegex = /###\s*FILE:\s*(.+?)\s*###\n([\s\S]*?)###\s*END FILE\s*###/g;
  let match: RegExpExecArray | null;
  while ((match = fileRegex.exec(output)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    if (path && content) files[path] = content;
  }
  return files;
}

function buildAutoAgentPrompt(
  agentId: string,
  appName: string,
  description: string,
  appType: string,
  techStack: string,
  features: string[],
  existingFiles: Record<string, string>,
): string {
  const fileList = Object.keys(existingFiles).join(", ") || "none yet";
  const featureList = features.join(", ") || "standard features";
  const base = `You are building "${appName}" — a ${appType} application.
Description: ${description}
Tech stack: ${techStack}
Features required: ${featureList}
Files already created: ${fileList}

CRITICAL RULES:
- Output ONLY code files, no explanation text outside files
- Wrap every file exactly like this:
  ### FILE: path/filename.ext ###
  [full file content here]
  ### END FILE ###
- Write complete, production-quality code — no placeholders, no TODOs
- Every file must be fully functional and immediately usable`;

  const rolePrompts: Record<string, string> = {
    architect: `${base}\n\nYour role: System Architect\nCreate: package.json, README.md, .env.example, ARCHITECTURE.md`,
    frontend:  `${base}\n\nYour role: Frontend Agent\nBuild all UI files: App.tsx, index.tsx, all pages, all components, styling`,
    backend:   `${base}\n\nYour role: Backend Agent\nBuild: server entry, all route files, middleware, services, utilities`,
    database:  `${base}\n\nYour role: Database Agent\nBuild: schema/migrations, models, seed data, DB connection utility`,
    integration: `${base}\n\nYour role: Integration Agent\nBuild: docker-compose.yml, Dockerfile, CI/CD workflow, setup.sh, DEPLOYMENT.md`,
    monitoring: `${base}\n\nYour role: Monitoring Agent\nBuild: logger middleware, error handler, health check endpoint, metrics collection`,
  };
  return rolePrompts[agentId] || base;
}

async function triggerAutoBuildForProject(
  projectId: number,
  name: string,
  brief: string,
  industry: string,
): Promise<void> {
  if (!isSoftwareBuildable(name, brief)) {
    console.log(`[Auto-Build] Skipping "${name}" — not a software product`);
    return;
  }

  console.log(`[Auto-Build] ▶ Starting autonomous build for "${name}" (project #${projectId})`);

  try {
    // Step 1 — Interpret: extract structured requirements from the brief
    const interpretRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `You are an expert software architect. Extract structured requirements from this product description.

Product: "${name}"
Industry: ${industry}
Description: "${brief}"

Respond ONLY with valid JSON (no markdown):
{
  "appName": "short name",
  "summary": "one sentence description",
  "appType": "one of: Web App, SaaS Platform, REST API, AI-Powered Bot, Dashboard",
  "techStack": "e.g. React + Node.js + PostgreSQL",
  "coreFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
  "targetUsers": "who uses this",
  "estimatedComplexity": "Simple | Medium | Complex"
}`,
      }],
      max_tokens: 600,
    });

    const interpretRaw = interpretRes.choices[0]?.message?.content || "{}";
    let reqs: Record<string, any> = {};
    try {
      reqs = JSON.parse(interpretRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      reqs = { appName: name, summary: brief, appType: "SaaS Platform", techStack: "React + Node.js + PostgreSQL", coreFeatures: [], estimatedComplexity: "Medium" };
    }

    console.log(`[Auto-Build] ✓ Requirements interpreted for "${name}"`);

    // Step 2 — Plan: generate task list
    const planRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a build plan for: ${reqs.appName} (${reqs.appType}, ${reqs.techStack}).
Features: ${(reqs.coreFeatures || []).join(", ")}.
Respond ONLY with valid JSON: { "tasks": [{ "id": "T001", "agent": "Architect Agent", "title": "...", "outputs": ["file.ts"] }] }`,
      }],
      max_tokens: 600,
    });

    const planRaw = planRes.choices[0]?.message?.content || "{}";
    let plan: Record<string, any> = { tasks: [] };
    try {
      plan = JSON.parse(planRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch { /* use default */ }

    console.log(`[Auto-Build] ✓ Plan generated — ${plan.tasks?.length || 0} tasks`);

    // Create the session record now so we can update it as agents finish
    const [session] = await db.insert(appBuilderSessions).values({
      pin: "auto",
      appName: reqs.appName || name,
      status: "building",
      phase: 4,
      requirements: JSON.stringify(reqs),
      plan: JSON.stringify(plan.tasks || []),
      files: "{}",
      buildLog: `[Auto-Build] Autonomous build started by Lab Auto-Scan for project #${projectId}\n`,
    }).returning();

    // Step 3 — Run 6 build agents sequentially
    const AGENTS = ["architect", "frontend", "backend", "database", "integration", "monitoring"];
    const allFiles: Record<string, string> = {};
    let buildLog = session.buildLog || "";

    for (const agentId of AGENTS) {
      console.log(`[Auto-Build] → Running ${agentId} agent for "${name}"...`);
      try {
        const prompt = buildAutoAgentPrompt(
          agentId,
          reqs.appName || name,
          reqs.summary || brief,
          reqs.appType || "SaaS Platform",
          reqs.techStack || "React + Node.js",
          reqs.coreFeatures || [],
          allFiles,
        );

        const agentRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 3000,
        });

        const agentOutput = agentRes.choices[0]?.message?.content || "";
        const agentFiles = parseAgentFiles(agentOutput);
        Object.assign(allFiles, agentFiles);
        buildLog += `[${agentId}] ✓ Generated ${Object.keys(agentFiles).length} files\n`;

        // Persist progress after each agent
        await db.update(appBuilderSessions).set({
          files: JSON.stringify(allFiles),
          buildLog,
          updatedAt: new Date(),
        }).where(eq(appBuilderSessions.id, session.id));

        console.log(`[Auto-Build] ✓ ${agentId} agent done — ${Object.keys(agentFiles).length} files`);
      } catch (agentErr: any) {
        console.error(`[Auto-Build] ${agentId} agent failed:`, agentErr?.message);
        buildLog += `[${agentId}] ✗ Error: ${agentErr?.message}\n`;
      }
    }

    // Mark session complete
    await db.update(appBuilderSessions).set({
      status: "complete",
      phase: 7,
      files: JSON.stringify(allFiles),
      buildLog,
      updatedAt: new Date(),
    }).where(eq(appBuilderSessions.id, session.id));

    const totalFiles = Object.keys(allFiles).length;
    console.log(`[Auto-Build] ✅ "${name}" build complete — ${totalFiles} files · session #${session.id}`);

  } catch (err: any) {
    console.error(`[Auto-Build] ✗ Failed for "${name}":`, err?.message);
  }
}

// ── Save opportunities to DB ──────────────────────────────────────────────────

async function saveOpportunities(
  opportunities: ProductOpportunity[],
  existing: { id: number; name: string }[],
  scanId: string,
  passLabel: string,
): Promise<{ created: number; items: any[] }> {
  const items: any[] = [];
  let created = 0;

  for (const opp of opportunities) {
    if (!opp.name || !opp.brief) continue;

    const isDuplicate = existing.some(p => namesSimilar(p.name, opp.name));
    if (isDuplicate) {
      console.log(`[Lab Auto-Scan] [${passLabel}] Skip duplicate: "${opp.name}"`);
      continue;
    }

    try {
      const [project] = await db.insert(labProjects).values({
        name: opp.name,
        industry: opp.industry || "General",
        phase: "design",
        status: "active",
        brief: opp.brief,
        research: opp.research,
        businessCase: opp.businessCase,
        autoCreated: "auto",
        autoScanId: scanId,
        approvalStatus: "pending",
        fundingStatus: "pending",
      }).returning();

      existing.push({ id: project.id, name: project.name });
      items.push({
        type: "new",
        projectId: project.id,
        projectName: project.name,
        capability: opp.type,
        action: `[${passLabel}] New ${opp.type} — ${opp.industry} — awaiting approval`,
      });
      created++;

      console.log(`[Lab Auto-Scan] [${passLabel}] Created: "${project.name}" [${opp.industry}] → PENDING`);

      triggerFundingForProject(project.id).catch(() => {});
      triggerAutoBuildForProject(project.id, project.name, opp.brief || "", opp.industry || "General").catch(() => {});
    } catch (err) {
      console.error(`[Lab Auto-Scan] [${passLabel}] Failed to create "${opp.name}":`, err);
    }
  }

  return { created, items };
}

// ── Pass 1: Bot & Automation scans ───────────────────────────────────────────

async function runBotScans(scanId: string, existing: { id: number; name: string }[]): Promise<{ created: number; items: any[] }> {
  let totalCreated = 0;
  const allItems: any[] = [];

  for (const cluster of BOT_CLUSTERS) {
    console.log(`[Lab Auto-Scan] [Pass 1 — Bots] Scanning: ${cluster.label}...`);
    try {
      const systemPrompt = `You are an automation opportunity analyst with live web access. Today is ${TODAY()}.

Your job is to find specific bot and automation opportunities in this sector cluster: ${cluster.label}

Sectors in scope: ${cluster.sectors}

For each opportunity: it must be a GENUINELY AUTONOMOUS bot or AI agent — not a dashboard or manual tool. It must run without human input, perform a task currently done by humans, and businesses will pay monthly for it.

Before suggesting any opportunity, search the web for: evidence this task is done manually today, complaints about the manual process, attempts by others that failed or that have poor reviews, and the specific technology that makes automation possible now.

${PRODUCT_FORMAT}
${RULES}

Find ${cluster.count} genuine bot/automation opportunities across these sectors. Search the web for evidence of each one.`;

      const raw = await runScanWithWebSearch(systemPrompt, `Search for ${cluster.count} automation bot opportunities in: ${cluster.sectors}. Today is ${TODAY()}. Find real evidence of manual processes ripe for automation.`);
      const opps = parseOpportunities(raw);
      const result = await saveOpportunities(opps, existing, scanId, `Bots-${cluster.label}`);
      totalCreated += result.created;
      allItems.push(...result.items);
    } catch (err) {
      console.error(`[Lab Auto-Scan] [Pass 1] Failed cluster ${cluster.label}:`, err);
    }
  }

  return { created: totalCreated, items: allItems };
}

// ── Pass 2: SaaS & Software scans ────────────────────────────────────────────

async function runSaaSScans(scanId: string, existing: { id: number; name: string }[]): Promise<{ created: number; items: any[] }> {
  let totalCreated = 0;
  const allItems: any[] = [];

  for (const cluster of SAAS_CLUSTERS) {
    console.log(`[Lab Auto-Scan] [Pass 2 — SaaS] Scanning: ${cluster.label}...`);
    try {
      const systemPrompt = `You are a SaaS product opportunity analyst with live web access. Today is ${TODAY()}.

Focus sector: ${cluster.label}
Sectors: ${cluster.sectors}

Search for software GAPS — products people need that don't exist, or where existing tools are badly inadequate. Prioritise:
- Verticals where the dominant tool is 10+ years old
- Sectors where the typical solution is still spreadsheets + email
- Niches too small for enterprise software but still commercially viable at SME pricing (£29-£199/month)
- UK-specific gaps where US tools don't work well (VAT, Companies House, HMRC integration, UK date/currency formats)

Search Reddit, G2, Capterra, Twitter, industry forums for evidence of the gap before suggesting it.

${PRODUCT_FORMAT}
${RULES}

Find ${cluster.count} SaaS product opportunities. Each must have real evidence of the gap from web research.`;

      const raw = await runScanWithWebSearch(systemPrompt, `Search for ${cluster.count} SaaS software gap opportunities in: ${cluster.sectors}. Today is ${TODAY()}. Find evidence these gaps are real from forums, reviews, and complaints.`);
      const opps = parseOpportunities(raw);
      const result = await saveOpportunities(opps, existing, scanId, `SaaS-${cluster.label}`);
      totalCreated += result.created;
      allItems.push(...result.items);
    } catch (err) {
      console.error(`[Lab Auto-Scan] [Pass 2] Failed cluster ${cluster.label}:`, err);
    }
  }

  return { created: totalCreated, items: allItems };
}

// ── Pass 3: Broken Product Mining ────────────────────────────────────────────

async function runBrokenProductScan(scanId: string, existing: { id: number; name: string }[]): Promise<{ created: number; items: any[] }> {
  console.log("[Lab Auto-Scan] [Pass 3 — Broken Products] Mining App Store, Reddit, forums...");
  try {
    const raw = await runScanWithWebSearch(
      `You are a product intelligence analyst mining user complaints to find broken products ripe for replacement. Today is ${TODAY()}. ${RULES}`,
      BROKEN_PRODUCT_PROMPT(),
      6000,
    );
    const opps = parseOpportunities(raw);
    return saveOpportunities(opps, existing, scanId, "Broken Products");
  } catch (err) {
    console.error("[Lab Auto-Scan] [Pass 3] Failed:", err);
    return { created: 0, items: [] };
  }
}

// ── Pass 4: Precision Engineering ────────────────────────────────────────────

async function runEngineeringScan(scanId: string, existing: { id: number; name: string }[]): Promise<{ created: number; items: any[] }> {
  console.log("[Lab Auto-Scan] [Pass 4 — Engineering] Scanning expanded precision component sectors...");
  try {
    const raw = await runScanWithWebSearch(
      `You are a precision engineering product analyst. Today is ${TODAY()}. ${RULES}`,
      ENGINEERING_PROMPT(),
      6000,
    );
    const opps = parseOpportunities(raw);
    return saveOpportunities(opps, existing, scanId, "Engineering");
  } catch (err) {
    console.error("[Lab Auto-Scan] [Pass 4] Failed:", err);
    return { created: 0, items: [] };
  }
}

// ── Pass 5: Trend & Patent Intelligence ──────────────────────────────────────

async function runTrendScan(scanId: string, existing: { id: number; name: string }[]): Promise<{ created: number; items: any[] }> {
  console.log("[Lab Auto-Scan] [Pass 5 — Trends] Scanning regulations, patents, ProductHunt, YC, social trends...");
  try {
    const raw = await runScanWithWebSearch(
      `You are a trend and patent intelligence analyst. Today is ${TODAY()}. ${RULES}`,
      TREND_PROMPT(),
      5000,
    );
    const opps = parseOpportunities(raw);
    return saveOpportunities(opps, existing, scanId, "Trends");
  } catch (err) {
    console.error("[Lab Auto-Scan] [Pass 5] Failed:", err);
    return { created: 0, items: [] };
  }
}

// ── Phase 2: Upgrade existing projects ────────────────────────────────────────

const UPGRADE_SYSTEM_PROMPT = () => `You are an autonomous R&D intelligence engine. Today is ${TODAY()}.

For the project provided, search the web for the latest developments (last 30 days) relevant to this project.

Find:
1. New materials, components, or processes applicable to this project
2. Competitor product launches or updates
3. New patents filed in this space
4. Recent research papers with relevant findings
5. Regulatory changes affecting this product category
6. Market intelligence: new investment, demand signals
7. New AI/software capabilities that could enhance this product
8. Supply chain developments: new suppliers, price changes

Return JSON:
{
  "upgrades": [{ "category": "Technology|Competition|Regulation|Market|Research|Supply Chain", "headline": "...", "detail": "...", "impact": "high|medium|low", "actionRequired": "..." }],
  "researchAppend": "## Research Update — [DATE]\\n\\n[600+ word comprehensive update with subheadings]"
}

Rules: minimum 3 upgrades, only include genuinely new findings from last 30 days, researchAppend must be actionable.`;

async function upgradeExistingProjects(scanId: string): Promise<{ upgraded: number; items: any[] }> {
  console.log("[Lab Auto-Scan] [Phase 2 — Upgrades] Updating existing projects with latest intelligence...");

  const projects = await db.select().from(labProjects)
    .where(eq(labProjects.status, "active"))
    .orderBy(desc(labProjects.updatedAt))
    .limit(8);

  const eligible = projects.filter(p => (p.brief || "").length > 80 && p.approvalStatus !== "rejected");

  let upgraded = 0;
  const items: any[] = [];

  for (const project of eligible) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: UPGRADE_SYSTEM_PROMPT() },
          {
            role: "user",
            content: `Search the web for latest developments relevant to this project and return the upgrade JSON.

PROJECT: ${project.name}
INDUSTRY: ${project.industry}
BRIEF: ${(project.brief || "").slice(0, 500)}
EXISTING RESEARCH (avoid duplicating): ${(project.research || "").slice(0, 300)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 3000,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) continue;

      const data = JSON.parse(raw);
      const append = data.researchAppend || "";

      if (append && append.length > 100) {
        const newResearch = project.research
          ? `${project.research}\n\n---\n\n${append}`
          : append;

        await db.update(labProjects).set({ research: newResearch, updatedAt: new Date() }).where(eq(labProjects.id, project.id));

        const upgradeCount = (data.upgrades || []).length;
        items.push({ type: "upgrade", projectId: project.id, projectName: project.name, action: `${upgradeCount} new intelligence signals appended` });
        upgraded++;
        console.log(`[Lab Auto-Scan] Upgraded: "${project.name}" (${upgradeCount} signals)`);
      }
    } catch (err) {
      console.error(`[Lab Auto-Scan] Upgrade failed for "${project.name}":`, err);
    }
  }

  return { upgraded, items };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runLabAutoScan(): Promise<{
  scanId: string;
  projectsCreated: number;
  upgradesApplied: number;
}> {
  const scanId = crypto.randomUUID().slice(0, 8);
  console.log(`\n[Lab Auto-Scan] ════ Starting full multi-sector scan ${scanId} ════`);
  console.log(`[Lab Auto-Scan] Passes: Bot×4 clusters + SaaS×4 clusters + Broken Products + Engineering + Trends + Upgrades`);

  const [logEntry] = await db.insert(labScanHistory).values({
    scanId,
    status: "running",
    summary: "Multi-sector scan in progress...",
  }).returning();

  // Load all existing projects once — shared across all passes for dupe detection
  const existing = await db.select({ id: labProjects.id, name: labProjects.name }).from(labProjects);

  let projectsCreated = 0;
  const allItems: any[] = [];

  try {
    // Run all 5 discovery passes sequentially (to avoid rate limits)
    console.log(`\n[Lab Auto-Scan] ── Pass 1: Bot & Automation (4 sector clusters) ──`);
    const bots = await runBotScans(scanId, existing);
    projectsCreated += bots.created;
    allItems.push(...bots.items);

    console.log(`\n[Lab Auto-Scan] ── Pass 2: SaaS & Software Gaps (4 sector clusters) ──`);
    const saas = await runSaaSScans(scanId, existing);
    projectsCreated += saas.created;
    allItems.push(...saas.items);

    console.log(`\n[Lab Auto-Scan] ── Pass 3: Broken Product Mining ──`);
    const broken = await runBrokenProductScan(scanId, existing);
    projectsCreated += broken.created;
    allItems.push(...broken.items);

    console.log(`\n[Lab Auto-Scan] ── Pass 4: Precision Engineering (expanded sectors) ──`);
    const engineering = await runEngineeringScan(scanId, existing);
    projectsCreated += engineering.created;
    allItems.push(...engineering.items);

    console.log(`\n[Lab Auto-Scan] ── Pass 5: Trend & Patent Intelligence ──`);
    const trends = await runTrendScan(scanId, existing);
    projectsCreated += trends.created;
    allItems.push(...trends.items);

    // Run upgrades on existing projects
    console.log(`\n[Lab Auto-Scan] ── Phase 2: Upgrading existing projects ──`);
    const upgrades = await upgradeExistingProjects(scanId);
    allItems.push(...upgrades.items);

    const summary = `Multi-sector scan complete — ${projectsCreated} new projects created (pending approval), ${upgrades.upgraded} existing projects upgraded. Sectors covered: bots (legal, health, commerce, trades), SaaS (creative, education, niche SMB, compliance), broken products, precision engineering (10 sectors), trends & patents.`;

    await db.update(labScanHistory).set({
      status: "complete",
      opportunitiesFound: projectsCreated + upgrades.upgraded,
      projectsCreated,
      upgradesApplied: upgrades.upgraded,
      summary,
      items: JSON.stringify(allItems),
      completedAt: new Date(),
    }).where(eq(labScanHistory.id, logEntry.id));

    console.log(`\n[Lab Auto-Scan] ════ Scan ${scanId} complete — ${projectsCreated} new projects (pending approval), ${upgrades.upgraded} upgraded ════\n`);
    return { scanId, projectsCreated, upgradesApplied: upgrades.upgraded };

  } catch (err: any) {
    console.error(`[Lab Auto-Scan] Fatal error in scan ${scanId}:`, err);
    await db.update(labScanHistory).set({
      status: "error",
      error: err.message,
      completedAt: new Date(),
      summary: `Scan failed: ${err.message}`,
    }).where(eq(labScanHistory.id, logEntry.id));
    throw err;
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

let scanInterval: NodeJS.Timeout | null = null;
let isScanning = false;

export function startLabAutoScanner(intervalHours = 24) {
  if (scanInterval) return;

  const run = async () => {
    if (isScanning) return;
    isScanning = true;
    try {
      await runLabAutoScan();
    } catch (err) {
      console.error("[Lab Auto-Scan] Scheduled scan error:", err);
    }
    isScanning = false;
  };

  run();
  scanInterval = setInterval(run, intervalHours * 60 * 60 * 1000);
  console.log(`[Lab Auto-Scan] Autonomous scanner started — running every ${intervalHours} hours`);
}

export function stopLabAutoScanner() {
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
}

export function isLabScanRunning() { return isScanning; }
