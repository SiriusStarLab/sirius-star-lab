/**
 * Sirius Star Lab — Autonomous Daily Scanner
 *
 * Runs every 24 hours to:
 *   1. Discover new product opportunities across focused industries
 *   2. Auto-create Star Lab projects with pre-filled Brief + Research + Business Case
 *   3. Set approval_status = "pending" on all auto-created projects
 *   4. Upgrade existing projects with latest research intelligence
 *   5. Trigger funding analysis on all new projects
 */

import crypto from "crypto";
import { eq, desc } from "drizzle-orm";
import { db, labProjects, labScanHistory } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ── System prompts ─────────────────────────────────────────────────────────────

const DISCOVERY_SYSTEM_PROMPT = () => `You are an autonomous R&D intelligence engine inside Sirius Star Lab. Today is ${TODAY()}.

## COMPANY CONTEXT
You are scanning opportunities for TWO business capabilities:

### CAPABILITY A — Software / AI Products (6 opportunities)
Focus: Autonomous social media and marketing bots and SaaS tools that businesses will pay for.
Products must be:
- Autonomous AI agents that run without human input
- Genuinely sellable to companies (B2B SaaS model)
- Covering social media management, content creation, campaign automation, lead generation, brand monitoring, analytics reporting, influencer tracking, or outreach automation
- Capable of operating 24/7 with minimal supervision
- Differentiated from existing tools (not just another Hootsuite clone)

Target buyers: Marketing agencies, e-commerce brands, retail chains, hospitality groups, professional services firms, startups scaling their brand.

### CAPABILITY B — Precision Engineering Products (4 opportunities)
Company: Strategic Innovation Dundee Ltd — a precision engineering facility with:
- Dugard CNC sliding head machines (38mm and 26mm bar capacity) — for turned parts, complex multi-feature components
- Star CNC sliding head machine — high-speed precision turning
- Two EDM wire cutting machines — for ultra-precise forms, complex profiles, hardened materials, bespoke cutting tools and gauges

The engineering shop CAN produce: precision turned components, complex machined parts, bespoke cutting tools, gauges, fixtures, implantable-grade components, aerospace-spec parts.

Scan for NEW PRODUCT OPPORTUNITIES in these engineering sectors ONLY:
- Oil & Gas: subsea connectors, precision valve bodies, instrumentation parts, hydraulic fittings, downhole tools
- Aerospace: landing gear components, fasteners, precision hydraulic parts, sensor housings, actuator components
- Medical Devices: orthopaedic implants, surgical instruments, endoscopy components, catheter tips, drug delivery mechanisms, diagnostic tool housings
- Hydrogen / Clean Energy: precision valve components, fuel cell hardware, electrolysis equipment parts, hydrogen sensor housings, high-pressure fittings

Products must be manufacturable on the existing machines. Focus on HIGH-VALUE components where precision is critical and margins are strong.

## OUTPUT FORMAT (strict — separate each product with ---PRODUCT---)

PRODUCT_NAME: [Specific, marketable product name]
CAPABILITY: [A — Software/Marketing Bot | B — Engineering Product]
INDUSTRY: [Exact industry]
PROBLEM: [Specific problem this product solves — 2 sentences]
SOLUTION: [How this product solves it — 2 sentences]
BRIEF: [400-word product brief: what the product is, who the customer is, their exact pain today, how this product solves it, key features, technical approach, what makes it better than alternatives, target market, revenue model]
RESEARCH: [400-word research: market size, main competitors and their weaknesses, technologies involved, key technical challenges, regulatory considerations, recent market signals validating this opportunity, any UK/EU specific angles]
BUSINESS_CASE: [300-word business case: why we should build this NOW — urgency, TAM/SAM, revenue potential year 1/3/5, investment required, time to first sale, strategic fit, key risks and mitigations, recommendation with confidence level]
TARGET_MARKET: [Specific customer description]
OPPORTUNITY_SCORE: [1-10]

---PRODUCT---

[next opportunity]

## RULES
1. Scan real trade press, patent filings, startup news, industry reports, academic papers right now
2. All 6 Capability A products must be genuinely autonomous AI/bot tools — not manual dashboards
3. All 4 Capability B products must be manufacturable on sliding head lathes or EDM wire cutting — check this
4. No science fiction — everything must be buildable within 18 months
5. Minimum OPPORTUNITY_SCORE of 7
6. Be specific — name real competitors, real market sizes, real technologies
7. Each BRIEF, RESEARCH, and BUSINESS_CASE section must be minimum 280 words`;

const UPGRADE_SYSTEM_PROMPT = () => `You are an autonomous R&D intelligence engine running inside Sirius Star Lab. Today is ${TODAY()}.

## YOUR MISSION
For the project provided, search the web right now for the latest developments (last 30 days) that are relevant to this project's design, technology, market, or competitive landscape.

## WHAT TO FIND
1. New materials, components, or manufacturing processes applicable to this project
2. Competitor product launches or updates that change the competitive picture
3. New patents filed in this space
4. Recent research papers with relevant findings
5. Regulatory changes that affect this product category
6. Market intelligence: new investment, partnerships, demand signals
7. New AI/software capabilities that could enhance or transform this product
8. Supply chain developments: new suppliers, price changes, availability

## OUTPUT FORMAT
Return a JSON object with this structure:
{
  "upgrades": [
    {
      "category": "Technology | Competition | Regulation | Market | Research | Supply Chain",
      "headline": "<10-word headline>",
      "detail": "<150-word detailed finding with source references>",
      "impact": "high | medium | low",
      "actionRequired": "<specific action or update this insight should trigger>"
    }
  ],
  "researchAppend": "<600-word research update — comprehensive, formatted with subheadings, suitable to append to the project Research tab. Begin with '## Research Update — [DATE]'. Cover all relevant findings.>"
}

## RULES
- Only include genuinely relevant, specific findings
- Minimum 3 upgrades, maximum 8
- Only include if there's something genuinely new in the last 30 days
- researchAppend must be comprehensive and actionable`;

// ── Opportunity parser ────────────────────────────────────────────────────────

type ProductOpportunity = {
  name: string;
  capability: string;
  industry: string;
  problem: string;
  solution: string;
  brief: string;
  research: string;
  businessCase: string;
  targetMarket: string;
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
      capability: get("CAPABILITY"),
      industry: get("INDUSTRY"),
      problem: get("PROBLEM"),
      solution: get("SOLUTION"),
      brief: get("BRIEF"),
      research: get("RESEARCH"),
      businessCase: get("BUSINESS_CASE"),
      targetMarket: get("TARGET_MARKET"),
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

// ── Funding analysis trigger ──────────────────────────────────────────────────

async function triggerFundingForProject(projectId: number) {
  try {
    const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
    if (!project) return;

    const prompt = `Analyse this R&D project for UK and international funding opportunities. Focus on the top 5 most relevant schemes.

PROJECT: ${JSON.stringify({
      id: project.id, name: project.name, industry: project.industry,
      brief: (project.brief || "").slice(0, 800),
      research: (project.research || "").slice(0, 400),
    })}

Return JSON: { "opportunities": [{ "projectId": ${project.id}, "projectName": "${project.name}", "matches": [{ "scheme": "...", "type": "tax_credit|grant|equity|loan", "geography": "UK|EU|USA|Canada|Australia|...", "amount": "...", "matchStrength": "strong|good|possible", "matchReason": "...", "keyEvidence": "...", "nextStep": "...", "url": "..." }] }], "summary": "..." }`;

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
    JSON.parse(content); // validate

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

// ── Phase 1: Discover new product opportunities ───────────────────────────────

async function discoverOpportunities(scanId: string): Promise<{ created: number; items: any[] }> {
  console.log("[Lab Auto-Scan] Phase 1: Scanning for new product opportunities (software bots + engineering)...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: DISCOVERY_SYSTEM_PROMPT() },
      {
        role: "user",
        content: `Run a full product opportunity scan right now. Today is ${TODAY()}.

Search for:
- 6 autonomous social media / marketing bot / AI SaaS product opportunities (B2B, companies will pay for these)
- 4 precision engineering product opportunities manufacturable on CNC sliding head lathes (38mm, 26mm bar capacity) and EDM wire cutting machines in oil & gas, aerospace, medical, and hydrogen sectors

For each opportunity produce a full BRIEF, RESEARCH, and BUSINESS_CASE as specified. Separate each with ---PRODUCT--- exactly. Return all 10 opportunities.`,
      },
    ],
    max_tokens: 16000,
    temperature: 0.35,
  });

  const raw = response.choices[0]?.message?.content || "";
  const opportunities = parseOpportunities(raw);

  console.log(`[Lab Auto-Scan] Found ${opportunities.length} opportunities. Creating projects...`);

  const existing = await db.select({ id: labProjects.id, name: labProjects.name })
    .from(labProjects).orderBy(desc(labProjects.createdAt));

  const items: any[] = [];
  let created = 0;

  for (const opp of opportunities) {
    if (!opp.name || !opp.brief) continue;

    const isDuplicate = existing.some(p => namesSimilar(p.name, opp.name));
    if (isDuplicate) {
      console.log(`[Lab Auto-Scan] Skipping duplicate: "${opp.name}"`);
      continue;
    }

    try {
      const capabilityLabel = opp.capability.startsWith("A") ? "Social/Marketing Bot" : "Engineering Product";

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
        capability: capabilityLabel,
        action: `New ${capabilityLabel} — ${opp.industry} — awaiting your approval`,
      });
      created++;

      triggerFundingForProject(project.id).catch(err =>
        console.error(`[Lab Auto-Scan] Funding failed for ${project.id}:`, err)
      );

      console.log(`[Lab Auto-Scan] Created project: "${project.name}" [${capabilityLabel}] → PENDING APPROVAL`);
    } catch (err) {
      console.error(`[Lab Auto-Scan] Failed to create project "${opp.name}":`, err);
    }
  }

  return { created, items };
}

// ── Phase 2: Upgrade existing projects ────────────────────────────────────────

async function upgradeExistingProjects(scanId: string): Promise<{ upgraded: number; items: any[] }> {
  console.log("[Lab Auto-Scan] Phase 2: Scanning for project upgrades...");

  const projects = await db.select().from(labProjects)
    .where(eq(labProjects.status, "active"))
    .orderBy(desc(labProjects.updatedAt))
    .limit(10);

  const eligibleProjects = projects.filter(p =>
    (p.brief || "").length > 80 && p.approvalStatus !== "rejected"
  );

  let upgraded = 0;
  const items: any[] = [];

  for (const project of eligibleProjects) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: UPGRADE_SYSTEM_PROMPT() },
          {
            role: "user",
            content: `Search the web for the latest developments relevant to this project and generate an upgrade report.

PROJECT NAME: ${project.name}
INDUSTRY: ${project.industry}
BRIEF: ${(project.brief || "").slice(0, 600)}
EXISTING RESEARCH (to avoid duplicating): ${(project.research || "").slice(0, 400)}

Return the JSON response as specified. Be specific, current, and actionable.`,
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
        const currentResearch = project.research || "";
        const newResearch = currentResearch
          ? `${currentResearch}\n\n---\n\n${append}`
          : append;

        await db.update(labProjects).set({
          research: newResearch,
          updatedAt: new Date(),
        }).where(eq(labProjects.id, project.id));

        const upgradeCount = (data.upgrades || []).length;
        items.push({
          type: "upgrade",
          projectId: project.id,
          projectName: project.name,
          action: `${upgradeCount} new intelligence signals — research updated`,
        });
        upgraded++;
        console.log(`[Lab Auto-Scan] Upgraded project: "${project.name}" (${upgradeCount} signals)`);
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
  console.log(`\n[Lab Auto-Scan] ════ Starting autonomous scan ${scanId} ════`);

  const [logEntry] = await db.insert(labScanHistory).values({
    scanId,
    status: "running",
    summary: "Scan in progress...",
  }).returning();

  let projectsCreated = 0;
  let upgradesApplied = 0;
  const allItems: any[] = [];

  try {
    const discovery = await discoverOpportunities(scanId);
    projectsCreated = discovery.created;
    allItems.push(...discovery.items);

    const upgrades = await upgradeExistingProjects(scanId);
    upgradesApplied = upgrades.upgraded;
    allItems.push(...upgrades.items);

    const summary = `Scan complete — ${projectsCreated} new project${projectsCreated !== 1 ? "s" : ""} created (awaiting approval), ${upgradesApplied} existing project${upgradesApplied !== 1 ? "s" : ""} upgraded with latest intelligence.`;

    await db.update(labScanHistory).set({
      status: "complete",
      opportunitiesFound: projectsCreated + upgradesApplied,
      projectsCreated,
      upgradesApplied,
      summary,
      items: JSON.stringify(allItems),
      completedAt: new Date(),
    }).where(eq(labScanHistory.id, logEntry.id));

    console.log(`[Lab Auto-Scan] ════ Scan ${scanId} complete — ${projectsCreated} created (pending approval), ${upgradesApplied} upgraded ════\n`);
    return { scanId, projectsCreated, upgradesApplied };

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
