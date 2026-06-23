import { db, labProjects } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/ai-client";

const ENGINEERING_SECTORS = [
  "oil_gas", "oil & gas", "aerospace", "medical", "medical_devices",
  "manufacturing", "hydrogen", "clean_energy", "engineering", "defence",
  "nuclear", "subsea", "marine",
];

async function gen(sys: string, user: string, tokens = 500): Promise<string> {
  try {
    const r = await openai.chat.completions.create({
      model: "claude-sonnet-4-5",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      max_tokens: tokens,
      temperature: 0.4,
    });
    return r.choices[0]?.message?.content?.trim() || "";
  } catch (err: any) {
    throw new Error(`AI generation failed: ${err?.message}`);
  }
}

// ── Extract a suggested sell price in pence from the cost analysis text ───────
async function suggestSellPrice(costText: string, projName: string, industry: string): Promise<number | null> {
  try {
    const res = await openai.chat.completions.create({
      model: "anthropic/claude-haiku-4-5",
      messages: [{
        role: "user",
        content: `Based on this cost analysis for "${projName}" (${industry}), suggest a realistic market sell price in GBP.

Cost analysis:
${costText.slice(0, 800)}

Rules:
- Return ONLY a single integer representing pence (e.g. 49900 for £499, 9900 for £99, 150000 for £1500)
- Account for a healthy profit margin (typically 3-5× cost for software, 40-60% margin for physical products)
- Minimum £9.99, maximum £50,000
- For SaaS/subscriptions suggest a monthly price
- Return ONLY the integer, nothing else`,
      }],
      max_tokens: 20,
      temperature: 0.1,
    });
    const raw = res.choices[0]?.message?.content?.trim() || "";
    const pence = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(pence) && pence >= 999 && pence <= 5_000_000) return pence;
    return null;
  } catch {
    return null;
  }
}


async function completeProject(proj: any): Promise<string[]> {
  const isEngineering = ENGINEERING_SECTORS.some(s =>
    (proj.industry || "").toLowerCase().includes(s)
  );
  const ctx = `Product: "${proj.name}"\nIndustry: ${proj.industry || "General"}\nBrief: ${(proj.brief || "").slice(0, 600)}`;
  const updates: Record<string, string> = {};

  const [brief, research, specs, businessCase, goToMarket, brochure, pitch, socialPosts, costToBuild] = await Promise.all([
    proj.brief      ? Promise.resolve("") : gen("You are a strategic product consultant. Write a 3-paragraph executive brief. Be specific, professional, and commercial.", `Product: ${proj.name}\nIndustry: ${proj.industry}`, 400),
    proj.research   ? Promise.resolve("") : gen("You are a market research analyst. Write a thorough market research report covering market size, key competitors, trends, and opportunities.", `Context: ${ctx}`, 500),
    proj.specs      ? Promise.resolve("") : gen("You are a technical specifications writer. Write complete, detailed technical specifications.", `Context: ${ctx}`, 500),
    proj.businessCase ? Promise.resolve("") : gen("You are a business strategist. Write a compelling, investment-grade business case with financials, risk analysis, and projected returns.", `Context: ${ctx}`, 500),
    proj.goToMarket ? Promise.resolve("") : gen("You are a go-to-market strategist. Write a full GTM strategy including channels, pricing, target segments, and launch roadmap.", `Context: ${ctx}`, 500),
    proj.brochure   ? Promise.resolve("") : gen("You are a marketing copywriter. Write a complete, compelling product brochure.", `Context: ${ctx}`, 500),
    proj.pitch      ? Promise.resolve("") : gen("You are a pitch deck writer. Write a 12-slide investor pitch deck with slide-by-slide content.", `Context: ${ctx}`, 500),
    proj.socialPosts ? Promise.resolve("") : gen("You are a social media strategist. Write polished LinkedIn, X (Twitter), and Instagram launch posts.", `Context: ${ctx}`, 300),
    proj.costToBuild ? Promise.resolve("") : gen("You are a cost analyst. Write a detailed cost analysis including development, materials, infrastructure, and total investment estimate.", `Context: ${ctx}`, 300),
  ]);

  if (brief)        updates.brief        = brief;
  if (research)     updates.research     = research;
  if (specs)        updates.specs        = specs;
  if (businessCase) updates.businessCase = businessCase;
  if (goToMarket)   updates.goToMarket   = goToMarket;
  if (brochure)     updates.brochure     = brochure;
  if (pitch)        updates.pitch        = pitch;
  if (socialPosts)  updates.socialPosts  = socialPosts;
  if (costToBuild)  updates.costToBuild  = costToBuild;

  if (isEngineering && !proj.materials) {
    updates.materials = await gen(
      "You are a senior materials engineer with deep expertise in extreme-environment materials selection — subsea, aerospace, oil & gas, high-temperature, medical. Always cite real material grades (Inconel 625/718, SAF 2507, Ti-6Al-4V, PEEK, etc.) and applicable standards (ISO, ASTM, AMS, NACE, DNV).",
      `Write a full materials specification for: ${proj.name}\nContext: ${ctx}`,
      500
    );
  }

  if (Object.keys(updates).length > 0) {
    updates.phase = "complete";
    await db.update(labProjects).set(updates as any).where(eq(labProjects.id, proj.id));
  }

  return Object.keys(updates).filter(k => k !== "phase");
}

export async function runProactiveEngine(): Promise<void> {
  console.log("[Sirius Proactive] Autonomous check starting…");

  try {
    const allProjects = await db.select().from(labProjects).orderBy(labProjects.id);

    const incomplete = allProjects.filter(p => {
      if (p.status === "archived") return false;
      if ((p as any).approvalStatus === "pending") return false;
      return !p.brief || !p.businessCase || !p.pitch;
    });

    if (incomplete.length === 0) {
      console.log("[Sirius Proactive] All projects complete — no work needed.");
      return;
    }

    console.log(`[Sirius Proactive] Found ${incomplete.length} incomplete project(s) — working autonomously…`);

    // Process up to 5 per run to keep each cycle within a reasonable time window
    const batch = incomplete.slice(0, 5);

    for (const proj of batch) {
      try {
        console.log(`[Sirius Proactive] → Working on #${proj.id}: "${proj.name}"…`);
        const generated = await completeProject(proj);
        if (generated.length > 0) {
          console.log(`[Sirius Proactive] ✓ #${proj.id} "${proj.name}" — completed: ${generated.join(", ")}`);
        } else {
          console.log(`[Sirius Proactive] ○ #${proj.id} "${proj.name}" — already complete, skipped`);
        }
      } catch (err: any) {
        console.error(`[Sirius Proactive] ✗ #${proj.id} "${proj.name}" — failed: ${err?.message}`);
      }
    }

    const remaining = incomplete.length - batch.length;
    if (remaining > 0) {
      console.log(`[Sirius Proactive] ${remaining} project(s) remain — will continue next cycle.`);
    } else {
      console.log("[Sirius Proactive] Batch done — all caught-up projects completed.");
    }

  } catch (err: any) {
    console.error("[Sirius Proactive] Engine error:", err?.message);
  }
}

export function startProactiveEngine(intervalMinutes = 15): void {
  console.log(`[Sirius Proactive] Autonomous engine online — running every ${intervalMinutes} minutes`);
  // First run 10 seconds after boot so other systems are ready
  setTimeout(() => runProactiveEngine().catch(console.error), 10_000);
  setInterval(() => runProactiveEngine().catch(console.error), intervalMinutes * 60 * 1000);
}
