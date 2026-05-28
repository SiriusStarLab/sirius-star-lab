/**
 * Sirius Star Lab — Command Centre Orchestrator
 *
 * One command → the twin executes the full project pipeline:
 *   1. Parse    — Understand what to build (GPT-4o)
 *   2. Create   — Create the project in Star Lab
 *   3. Research — Write a full brief + research section
 *   4. Analyse  — AI Architecture classification + tech stack
 *   5. Build    — Autonomous 6-agent App Builder (software projects)
 *   6. Fund     — Funding Radar analysis
 *   7. Market   — Full Sales & Marketing Plan with unit economics
 *   8. Complete — Summary + project link
 *
 * Uses SSE to stream live progress to the frontend.
 */

import { eq } from "drizzle-orm";
import { db, labProjects } from "@workspace/db";
import { openai } from "@workspace/ai-client";
import { analyseProject } from "./ai-arch-sweep.js";
import { triggerAutoBuildForProject, triggerFundingForProject } from "./lab-auto-scan.js";

export type OrchStage =
  | "parse" | "create" | "research" | "analyse" | "build" | "fund" | "market" | "complete";

export type OrchEvent =
  | { type: "stage_start";  stage: OrchStage; label: string; detail: string }
  | { type: "stage_done";   stage: OrchStage; label: string }
  | { type: "stage_skip";   stage: OrchStage; label: string; reason: string }
  | { type: "stage_error";  stage: OrchStage; label: string; error: string }
  | { type: "message";      stage: OrchStage; text: string }
  | { type: "complete";     projectId: number; projectName: string; summary: string; isLinked: boolean }
  | { type: "fatal";        error: string };

type ParsedPlan = {
  projectName: string;
  industry: string;
  type: "bot" | "saas" | "app" | "platform" | "tool" | "research" | "physical" | "other";
  brief: string;
  features: string[];
  isSoftware: boolean;
};

export type SalesPlan = {
  targetSectors: Array<{
    name: string;
    description: string;
    potentialCustomers: string;
    urgency: "high" | "medium" | "low";
  }>;
  buyerPersonas: Array<{
    title: string;
    painPoints: string[];
    budgetAuthority: string;
    decisionTimeline: string;
  }>;
  unitEconomics: {
    costToBuild: string;
    costToDeliver: string;
    totalCostPerUnit: string;
    sellingPricePerUnit: string;
    grossProfitPerUnit: string;
    grossMarginPercent: string;
    breakEvenUnits: number;
    breakEvenRevenue: string;
    notes: string;
  };
  revenueProjections: {
    year1: { units: number; revenue: string; grossProfit: string; marketingSpend: string };
    year2: { units: number; revenue: string; grossProfit: string; marketingSpend: string };
    year3: { units: number; revenue: string; grossProfit: string; marketingSpend: string };
  };
  pricingStrategy: {
    model: string;
    rationale: string;
    competitors: Array<{ name: string; price: string }>;
    upsells: string[];
  };
  marketingPlan: {
    monthlyBudget: string;
    channels: Array<{
      name: string;
      monthlySpend: string;
      expectedLeadsPerMonth: number;
      tactics: string[];
    }>;
    contentStrategy: string;
    keyMessages: string[];
  };
  salesStrategy: {
    approach: string;
    channels: string[];
    salesCycleLength: string;
    targetMonthlyLeads: number;
    leadConversionRate: string;
    closingTactics: string[];
  };
  launchPlan: {
    phase1: string;
    phase2: string;
    phase3: string;
    quickWins: string[];
  };
};

const STAGE_LABELS: Record<OrchStage, string> = {
  parse:    "Understanding your command",
  create:   "Creating the project",
  research: "Writing brief & research",
  analyse:  "AI Architecture analysis",
  build:    "Building the app",
  fund:     "Finding funding",
  market:   "Sales & marketing plan",
  complete: "Complete",
};

export async function runOrchestration(
  command: string,
  onEvent: (event: OrchEvent) => void,
): Promise<void> {
  const emit = (event: OrchEvent) => onEvent(event);

  // ── Stage 1: Parse ─────────────────────────────────────────────────────────

  emit({ type: "stage_start", stage: "parse", label: STAGE_LABELS.parse, detail: "Analysing your command to understand what to build…" });
  emit({ type: "message", stage: "parse", text: `Reading: "${command}"` });

  let plan: ParsedPlan;
  try {
    const parseRes = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4.6",
      messages: [
        {
          role: "system",
          content: `You are Sirius, the AI intelligence partner for Sirius Star Lab — an R&D command centre for Sirius Star Lab. Parse the user's build command and extract a structured plan. Respond ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Parse this command: "${command}"

Return ONLY this JSON (no markdown):
{
  "projectName": "specific product name (not generic)",
  "industry": "primary industry sector",
  "type": "bot|saas|app|platform|tool|research|physical|other",
  "brief": "350-word product brief: what it is, who buys it, their pain, how it solves it, key features, tech approach, revenue model",
  "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "isSoftware": true or false
}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const raw = parseRes.choices[0]?.message?.content?.trim() ?? "{}";
    plan = JSON.parse(raw);
    emit({ type: "message", stage: "parse", text: `Identified: "${plan.projectName}" · ${plan.industry} · ${plan.type}` });
    emit({ type: "stage_done", stage: "parse", label: STAGE_LABELS.parse });
  } catch (err: any) {
    emit({ type: "stage_error", stage: "parse", label: STAGE_LABELS.parse, error: err.message });
    emit({ type: "fatal", error: "Could not understand the command — please try again with more detail." });
    return;
  }

  // ── Stage 2: Create Project ────────────────────────────────────────────────

  emit({ type: "stage_start", stage: "create", label: STAGE_LABELS.create, detail: `Creating "${plan.projectName}" in your Star Lab projects…` });

  let projectId: number;
  try {
    const [inserted] = await db.insert(labProjects).values({
      name: plan.projectName,
      industry: plan.industry,
      phase: "design",
      status: "active",
      autoCreated: "orchestrated",
      approvalStatus: "approved",
      brief: plan.brief,
      fundingStatus: "",
      aiArchLinked: "pending",
      updatedAt: new Date(),
    }).returning({ id: labProjects.id });

    projectId = inserted.id;
    emit({ type: "message", stage: "create", text: `Project #${projectId} created` });
    emit({ type: "stage_done", stage: "create", label: STAGE_LABELS.create });
  } catch (err: any) {
    emit({ type: "stage_error", stage: "create", label: STAGE_LABELS.create, error: err.message });
    emit({ type: "fatal", error: "Failed to create the project." });
    return;
  }

  // ── Stage 3: Research ──────────────────────────────────────────────────────

  emit({ type: "stage_start", stage: "research", label: STAGE_LABELS.research, detail: "Writing deep research: market size, competitors, regulatory context, opportunities…" });

  try {
    const researchRes = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4.6",
      messages: [
        { role: "system", content: "You are Sirius, an elite R&D strategist. Write detailed, specific, evidence-based research. No generic advice. No placeholders." },
        {
          role: "user",
          content: `Write a comprehensive research section for this project.

PROJECT: ${plan.projectName}
INDUSTRY: ${plan.industry}
BRIEF: ${plan.brief}

Write 500+ words covering:
1. Market size and growth rate (with specific figures)
2. Top 3 direct competitors with their specific weaknesses
3. Key regulatory considerations (UK/EU focus)
4. Technology landscape and relevant APIs/tools
5. Recent market signals validating this opportunity
6. UK/Scotland specific angles (NHS, Companies House, HMRC integrations if relevant)
7. Recommended go-to-market channels

Be specific. Name real companies, real figures, real regulations.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });

    const research = researchRes.choices[0]?.message?.content ?? "";
    await db.update(labProjects).set({ research, updatedAt: new Date() }).where(eq(labProjects.id, projectId));
    emit({ type: "message", stage: "research", text: `${research.split(" ").length} word research section written` });
    emit({ type: "stage_done", stage: "research", label: STAGE_LABELS.research });
  } catch (err: any) {
    emit({ type: "stage_error", stage: "research", label: STAGE_LABELS.research, error: err.message });
  }

  // ── Stage 4: AI Architecture Analysis ─────────────────────────────────────

  emit({ type: "stage_start", stage: "analyse", label: STAGE_LABELS.analyse, detail: "Classifying tech stack, build roadmap, and market readiness…" });

  let isLinked = false;
  try {
    const insights = await analyseProject({
      id: projectId,
      name: plan.projectName,
      industry: plan.industry,
      brief: plan.brief,
      specs: "",
      phase: "design",
    });

    if (insights) {
      isLinked = insights.needsAppDev;
      await db.update(labProjects).set({
        aiArchLinked: insights.needsAppDev ? "linked" : "not-applicable",
        aiArchInsights: JSON.stringify(insights),
        aiArchSweepAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(labProjects.id, projectId));
      emit({ type: "message", stage: "analyse", text: insights.needsAppDev
        ? `Software project confirmed · readiness ${insights.marketReadinessScore}/10 · ${insights.techStack.slice(0,3).join(", ")}`
        : "Physical product — no app development required"
      });
    }
    emit({ type: "stage_done", stage: "analyse", label: STAGE_LABELS.analyse });
  } catch (err: any) {
    emit({ type: "stage_error", stage: "analyse", label: STAGE_LABELS.analyse, error: err.message });
  }

  // ── Stage 5: App Builder ───────────────────────────────────────────────────

  if (plan.isSoftware || isLinked) {
    emit({ type: "stage_start", stage: "build", label: STAGE_LABELS.build, detail: "Deploying 6-agent autonomous build pipeline: Architect → Frontend → Backend → Database → Integration → Monitoring…" });
    try {
      await triggerAutoBuildForProject(projectId, plan.projectName, plan.brief, plan.industry);
      emit({ type: "message", stage: "build", text: "All 6 build agents complete — full file set generated" });
      emit({ type: "stage_done", stage: "build", label: STAGE_LABELS.build });
    } catch (err: any) {
      emit({ type: "stage_error", stage: "build", label: STAGE_LABELS.build, error: err.message });
    }
  } else {
    emit({ type: "stage_skip", stage: "build", label: STAGE_LABELS.build, reason: "Physical product — no app build required" });
  }

  // ── Stage 6: Funding ───────────────────────────────────────────────────────

  emit({ type: "stage_start", stage: "fund", label: STAGE_LABELS.fund, detail: "Searching UK, EU, and international funding opportunities, grants, and tax credits…" });
  try {
    await triggerFundingForProject(projectId);
    const [updated] = await db.select({ fundingAnalysis: labProjects.fundingAnalysis })
      .from(labProjects).where(eq(labProjects.id, projectId));
    const matchCount = (() => {
      try { return JSON.parse(updated?.fundingAnalysis ?? "{}").opportunities?.[0]?.matches?.length ?? 0; } catch { return 0; }
    })();
    emit({ type: "message", stage: "fund", text: `${matchCount} funding scheme${matchCount !== 1 ? "s" : ""} identified` });
    emit({ type: "stage_done", stage: "fund", label: STAGE_LABELS.fund });
  } catch (err: any) {
    emit({ type: "stage_error", stage: "fund", label: STAGE_LABELS.fund, error: err.message });
  }

  // ── Stage 7: Sales & Marketing Plan ───────────────────────────────────────

  emit({ type: "stage_start", stage: "market", label: STAGE_LABELS.market, detail: "Building full sales & marketing plan: unit economics, target sectors, pricing, revenue projections…" });
  try {
    const marketRes = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4.6",
      messages: [
        {
          role: "system",
          content: `You are Sirius, an elite commercial strategist. You produce highly specific, actionable sales and marketing plans with real numbers. No generic advice. No placeholders. Think like a CFO + CMO combined. Respond ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Build a complete sales & marketing plan for this product.

PRODUCT: ${plan.projectName}
INDUSTRY: ${plan.industry}
TYPE: ${plan.type}
BRIEF: ${plan.brief}

Return ONLY this JSON (no markdown, no code fences):
{
  "targetSectors": [
    { "name": "sector name", "description": "why this sector needs this product", "potentialCustomers": "estimated number of addressable buyers in UK", "urgency": "high|medium|low" }
  ],
  "buyerPersonas": [
    { "title": "job title of buyer", "painPoints": ["specific pain 1", "specific pain 2"], "budgetAuthority": "description of their budget control", "decisionTimeline": "how long they take to buy" }
  ],
  "unitEconomics": {
    "costToBuild": "£X one-off or £X/month for SaaS (dev + infrastructure cost to create the product)",
    "costToDeliver": "£X per customer (hosting, support, onboarding, licence fees etc.)",
    "totalCostPerUnit": "£X per customer per year",
    "sellingPricePerUnit": "£X per customer per year (or per unit for physical products)",
    "grossProfitPerUnit": "£X per customer per year",
    "grossMarginPercent": "XX%",
    "breakEvenUnits": 42,
    "breakEvenRevenue": "£Xk total revenue to break even",
    "notes": "key assumptions: what drives these numbers"
  },
  "revenueProjections": {
    "year1": { "units": 20, "revenue": "£Xk", "grossProfit": "£Xk", "marketingSpend": "£Xk" },
    "year2": { "units": 60, "revenue": "£Xk", "grossProfit": "£Xk", "marketingSpend": "£Xk" },
    "year3": { "units": 150, "revenue": "£Xk", "grossProfit": "£Xk", "marketingSpend": "£Xk" }
  },
  "pricingStrategy": {
    "model": "SaaS monthly|annual licence|per unit|per project|freemium|enterprise",
    "rationale": "why this pricing model fits this market",
    "competitors": [{ "name": "competitor name", "price": "their pricing" }],
    "upsells": ["upsell 1", "upsell 2"]
  },
  "marketingPlan": {
    "monthlyBudget": "£X/month",
    "channels": [
      { "name": "channel name", "monthlySpend": "£X/month", "expectedLeadsPerMonth": 5, "tactics": ["tactic 1", "tactic 2"] }
    ],
    "contentStrategy": "what content to produce and where to publish it",
    "keyMessages": ["message 1", "message 2", "message 3"]
  },
  "salesStrategy": {
    "approach": "inbound|outbound|channel|enterprise|self-serve",
    "channels": ["LinkedIn outreach", "industry events", "etc."],
    "salesCycleLength": "X weeks average",
    "targetMonthlyLeads": 15,
    "leadConversionRate": "X%",
    "closingTactics": ["tactic 1", "tactic 2"]
  },
  "launchPlan": {
    "phase1": "Month 1-2: what to do first",
    "phase2": "Month 3-4: what comes next",
    "phase3": "Month 5-6: scale",
    "quickWins": ["quick win 1 to get first customer fast", "quick win 2"]
  }
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2500,
    });

    const raw = marketRes.choices[0]?.message?.content?.trim() ?? "{}";
    const salesPlan: SalesPlan = JSON.parse(raw);

    await db.update(labProjects).set({
      salesPlan: JSON.stringify(salesPlan),
      salesPlanGeneratedAt: new Date(),
      costToBuild: salesPlan.unitEconomics.costToBuild,
      profitMargin: salesPlan.unitEconomics.grossMarginPercent,
      goToMarket: salesPlan.salesStrategy.approach,
      businessCase: `Sell at ${salesPlan.unitEconomics.sellingPricePerUnit} · Gross profit ${salesPlan.unitEconomics.grossProfitPerUnit} · Break even at ${salesPlan.unitEconomics.breakEvenUnits} customers`,
      updatedAt: new Date(),
    }).where(eq(labProjects.id, projectId));

    const sectors = salesPlan.targetSectors.slice(0, 3).map(s => s.name).join(", ");
    emit({ type: "message", stage: "market", text: `Target sectors: ${sectors}` });
    emit({ type: "message", stage: "market", text: `Unit economics: costs ${salesPlan.unitEconomics.totalCostPerUnit} · sells at ${salesPlan.unitEconomics.sellingPricePerUnit} · ${salesPlan.unitEconomics.grossMarginPercent} margin` });
    emit({ type: "message", stage: "market", text: `Year 3 projection: ${salesPlan.revenueProjections.year3.revenue} revenue · ${salesPlan.revenueProjections.year3.grossProfit} gross profit` });
    emit({ type: "stage_done", stage: "market", label: STAGE_LABELS.market });
  } catch (err: any) {
    emit({ type: "stage_error", stage: "market", label: STAGE_LABELS.market, error: err.message });
  }

  // ── Stage 8: Complete ──────────────────────────────────────────────────────

  const summary = `"${plan.projectName}" is ready in your Star Lab. Brief, research, AI Architecture analysis, ${plan.isSoftware || isLinked ? "full app build files, " : ""}funding radar, and a complete sales & marketing plan with unit economics are all done. Open the project to review everything.`;
  emit({ type: "complete", projectId, projectName: plan.projectName, summary, isLinked });
}
