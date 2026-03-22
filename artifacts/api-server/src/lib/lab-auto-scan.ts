/**
 * Sirius Star Lab — Autonomous Daily Scanner
 *
 * Runs every 24 hours to:
 *   1. Discover new product opportunities across diverse industries
 *   2. Auto-create Star Lab projects with pre-filled Brief + Research
 *   3. Upgrade existing projects with latest research intelligence
 *   4. Trigger funding analysis on all new projects
 */

import crypto from "crypto";
import { eq, desc, or, like } from "drizzle-orm";
import { db, labProjects, labScanHistory } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ── System prompts ─────────────────────────────────────────────────────────────

const DISCOVERY_SYSTEM_PROMPT = () => `You are an autonomous R&D intelligence engine inside Sirius Star Lab — the world's most advanced private R&D intelligence platform. Today is ${TODAY()}.

## YOUR MISSION
Search the web right now for 10 genuinely valuable, buildable product opportunities across diverse industries. These should be real product concepts that a world-class engineering and product team could begin designing immediately.

## WHAT TO SEARCH FOR
- New product gaps where existing solutions are outdated, overpriced, or missing
- Emerging technology enabling new products that weren't possible 12 months ago
- Products other companies have proven work but haven't been executed well in the UK/EU market
- Hardware + software combos where the AI layer transforms a traditional product
- Medical devices, diagnostics, or health monitoring products
- Industrial automation and manufacturing tools
- Clean energy, battery, or sustainability products
- AI/software tools that automate specific high-value professional workflows
- AgriTech, FoodTech, or logistics optimisation
- Consumer electronics with genuine technical differentiation
- Safety, security, or compliance automation
- B2B SaaS where no dominant player exists yet

## OUTPUT FORMAT (strict — one per opportunity, separated by ---PRODUCT---)

PRODUCT_NAME: [Specific, marketable product name — not generic]
INDUSTRY: [Exact industry: e.g. Medical Devices | Manufacturing | Clean Energy | Software / SaaS | Robotics | AgriTech | Consumer Electronics | Defence | Logistics | Healthcare | Aerospace]
PROBLEM: [Specific problem this product solves — 2 sentences]
SOLUTION: [How this product solves it — 2 sentences]
BRIEF: [Comprehensive 350-word product brief covering: exact product concept, who the customer is, what their pain is today, how this product solves it, key features and capabilities, technical approach, what makes it genuinely better than existing options, initial target market, revenue model]
RESEARCH: [Comprehensive 350-word initial research covering: market size (with estimates), who the main competitors are and their weaknesses, what technologies are being used, key technical challenges, regulatory considerations, material or supply chain considerations, recent market signals (news, patents, funding) that validate this opportunity]
TARGET_MARKET: [Specific target customer — e.g. "NHS acute care hospitals", "UK SME manufacturers with <500 staff", "European e-commerce logistics operators"]
OPPORTUNITY_SCORE: [1-10 — genuine commercial viability + technical feasibility]

---PRODUCT---

[next opportunity]

## RULES
1. Scan real web sources — trade press, patent filings, startup news, research papers, industry reports
2. Each product must be genuinely buildable — no science fiction
3. All 10 products must be from different industries
4. Minimum OPPORTUNITY_SCORE of 7 — only strong opportunities
5. Be specific — name real competitors, real technologies, real market sizes
6. Each BRIEF and RESEARCH section must be at minimum 300 words`;

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
  industry: string;
  problem: string;
  solution: string;
  brief: string;
  research: string;
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
      industry: get("INDUSTRY"),
      problem: get("PROBLEM"),
      solution: get("SOLUTION"),
      brief: get("BRIEF"),
      research: get("RESEARCH"),
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

// ── Funding analysis trigger (copied from lab.ts pattern, fire-and-forget) ────

async function triggerFundingAnalysis(projectId: number) {
  try {
    await db.update(labProjects).set({ fundingStatus: "pending" }).where(eq(labProjects.id, projectId));
    // Import and call the function dynamically to avoid circular dependencies
    const { default: labRouter } = await import("../routes/lab.js") as any;
    // Since we can't easily call the private function, we'll hit the internal endpoint
    // Instead, we implement a lightweight version here
    await triggerFundingForProject(projectId);
  } catch (err) {
    console.error(`[Lab Auto-Scan] Funding trigger failed for project ${projectId}:`, err);
  }
}

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
  console.log("[Lab Auto-Scan] Phase 1: Scanning for new product opportunities...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: DISCOVERY_SYSTEM_PROMPT() },
      {
        role: "user",
        content: `Run a full product opportunity scan right now. Search across industry news, patent databases, startup funding announcements, trade press, and research publications. Find 10 distinct product opportunities across 10 different industries. Today is ${TODAY()}.

Focus on opportunities with genuine commercial viability and technical feasibility. Be specific — not generic. Return exactly 10 opportunities separated by ---PRODUCT--- as specified.`,
      },
    ],
    max_tokens: 16000,
    temperature: 0.4,
  });

  const raw = response.choices[0]?.message?.content || "";
  const opportunities = parseOpportunities(raw);

  console.log(`[Lab Auto-Scan] Found ${opportunities.length} opportunities. Creating projects...`);

  // Get existing projects for deduplication
  const existing = await db.select({ id: labProjects.id, name: labProjects.name })
    .from(labProjects).orderBy(desc(labProjects.createdAt));

  const items: any[] = [];
  let created = 0;

  for (const opp of opportunities) {
    if (!opp.name || !opp.brief) continue;

    // Check for duplicate
    const isDuplicate = existing.some(p => namesSimilar(p.name, opp.name));
    if (isDuplicate) {
      console.log(`[Lab Auto-Scan] Skipping duplicate: "${opp.name}"`);
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
        autoCreated: "auto",
        autoScanId: scanId,
        fundingStatus: "pending",
      }).returning();

      existing.push({ id: project.id, name: project.name });
      items.push({ type: "new", projectId: project.id, projectName: project.name, action: `Created from auto-scan — ${opp.industry}` });
      created++;

      // Trigger funding in background (don't await)
      triggerFundingForProject(project.id).catch(err =>
        console.error(`[Lab Auto-Scan] Funding failed for ${project.id}:`, err)
      );

      console.log(`[Lab Auto-Scan] Created project: "${project.name}" (${opp.industry})`);
    } catch (err) {
      console.error(`[Lab Auto-Scan] Failed to create project "${opp.name}":`, err);
    }
  }

  return { created, items };
}

// ── Phase 2: Upgrade existing projects ────────────────────────────────────────

async function upgradeExistingProjects(scanId: string): Promise<{ upgraded: number; items: any[] }> {
  console.log("[Lab Auto-Scan] Phase 2: Scanning for project upgrades...");

  // Get projects with meaningful briefs, prioritise recently updated ones
  const projects = await db.select().from(labProjects)
    .where(eq(labProjects.status, "active"))
    .orderBy(desc(labProjects.updatedAt))
    .limit(10);

  const eligibleProjects = projects.filter(p => (p.brief || "").length > 80);

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

  // Create scan log entry
  const [logEntry] = await db.insert(labScanHistory).values({
    scanId,
    status: "running",
    summary: "Scan in progress...",
  }).returning();

  let projectsCreated = 0;
  let upgradesApplied = 0;
  const allItems: any[] = [];

  try {
    // Phase 1: Discover new opportunities
    const discovery = await discoverOpportunities(scanId);
    projectsCreated = discovery.created;
    allItems.push(...discovery.items);

    // Phase 2: Upgrade existing projects
    const upgrades = await upgradeExistingProjects(scanId);
    upgradesApplied = upgrades.upgraded;
    allItems.push(...upgrades.items);

    const summary = `Scan complete — ${projectsCreated} new project${projectsCreated !== 1 ? "s" : ""} created, ${upgradesApplied} existing project${upgradesApplied !== 1 ? "s" : ""} upgraded with latest intelligence.`;

    await db.update(labScanHistory).set({
      status: "complete",
      opportunitiesFound: projectsCreated + upgradesApplied,
      projectsCreated,
      upgradesApplied,
      summary,
      items: JSON.stringify(allItems),
      completedAt: new Date(),
    }).where(eq(labScanHistory.id, logEntry.id));

    console.log(`[Lab Auto-Scan] ════ Scan ${scanId} complete — ${projectsCreated} created, ${upgradesApplied} upgraded ════\n`);
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

  // Run immediately on startup, then every intervalHours
  run();
  scanInterval = setInterval(run, intervalHours * 60 * 60 * 1000);
  console.log(`[Lab Auto-Scan] Autonomous scanner started — running every ${intervalHours} hours`);
}

export function stopLabAutoScanner() {
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
}

export function isLabScanRunning() { return isScanning; }
