import { openai } from "@workspace/ai-client";
import { db, aiDiscoveries, aiSweepLog } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export type SweepProgress = {
  phase: string;
  content: string;
  done?: boolean;
  error?: string;
  sweepId?: string;
  itemsFound?: number;
};

const SWEEP_SYSTEM_PROMPT = () => `You are Sirius Intelligence — an autonomous AI research sweep engine. Today is ${TODAY()}.

## YOUR MISSION
Search exhaustively across ALL sources for the latest AI developments, discoveries, research breakthroughs, and new use cases. You are the most comprehensive AI intelligence feed on Earth.

## WHAT TO SEARCH
- Academic papers (arXiv, PubMed, Nature, Science, IEEE, ACM Digital Library)
- University research announcements (MIT, Stanford, Oxford, Cambridge, DeepMind, OpenAI, Anthropic, Google Brain, Meta AI, Microsoft Research, Tsinghua, ETH Zurich, CMU, Berkeley, Toronto)
- AI company announcements and product releases
- Patent filings from tech companies
- Industry-specific AI deployments across every sector
- Healthcare, medicine, diagnostics, drug discovery
- Engineering, manufacturing, aerospace, automotive
- Agriculture, food science, environmental monitoring
- Legal, finance, insurance, compliance
- Education, accessibility, creative arts
- Defence, security, cybersecurity
- Social media, content creation, marketing
- Robotics, autonomous systems, drones
- Energy, climate, sustainability
- Retail, logistics, supply chain
- Construction, real estate, architecture

## OUTPUT FORMAT
For each discovery, produce EXACTLY this format (one per discovery, separated by ---ITEM---):

TITLE: [Specific, informative title]
CATEGORY: [one of: Healthcare | Engineering | Robotics | Language | Vision | Creative | Science | Finance | Legal | Education | Security | Agriculture | Energy | Retail | Research Breakthrough | New Application | Platform Release]
SOURCE_TYPE: [one of: university_research | industry_deployment | product_release | patent | breakthrough | use_case]
SUMMARY: [2-3 sentences: what it does, why it matters, what's new]
DETAIL: [Comprehensive 4-6 sentence explanation including: the specific AI technique used, the problem it solves, quantitative results if known, who built it, when published/announced, and what it enables]
APPLICABILITY: [How could Sirius or its users adopt or build on this? What product, feature, or bot does this unlock? Be specific.]
SOURCE: [Organisation or publication name + approximate date]

---ITEM---

[next discovery]

Find 8-12 discoveries. Spread across different categories and source types. Prioritise genuinely new things from the last 30 days. Be specific — no vague generalities.`;

async function parseSweepOutput(raw: string): Promise<{
  title: string; category: string; sourceType: string; summary: string;
  detail: string; applicability: string; source: string;
}[]> {
  const items = raw.split("---ITEM---").map(s => s.trim()).filter(Boolean);
  return items.map(item => {
    const get = (key: string) => {
      const match = item.match(new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s"));
      return match ? match[1].trim() : "";
    };
    return {
      title: get("TITLE"),
      category: get("CATEGORY") || "Research Breakthrough",
      sourceType: get("SOURCE_TYPE") || "research",
      summary: get("SUMMARY"),
      detail: get("DETAIL"),
      applicability: get("APPLICABILITY"),
      source: get("SOURCE"),
    };
  }).filter(item => item.title && item.summary);
}

export async function runIntelligenceSweep(
  onProgress?: (p: SweepProgress) => void
): Promise<{ sweepId: string; itemsFound: number }> {
  const sweepId = crypto.randomUUID().slice(0, 8);

  const [logEntry] = await db.insert(aiSweepLog).values({
    sweepId, status: "running", summary: "Sweep in progress..."
  }).returning();

  onProgress?.({ phase: "start", content: "", sweepId });
  onProgress?.({ phase: "searching", content: `Sweep ${sweepId} initialised. Searching across AI research sources...` });

  let rawOutput = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4.6",
      stream: true,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SWEEP_SYSTEM_PROMPT() },
        {
          role: "user",
          content: `Conduct a comprehensive sweep right now. Search across university research portals, arXiv preprints, company engineering blogs, patent filings, industry news, and product announcements. Find 8-12 genuinely new AI developments, use cases, or research breakthroughs from the last 30 days. For each one, explain how Sirius could use or build on it.`
        }
      ]
    });

    let buffer = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        rawOutput += delta;
        buffer += delta;
        if (buffer.includes("\n") || buffer.length > 120) {
          onProgress?.({ phase: "streaming", content: delta });
          buffer = "";
        }
      }
    }

    const discoveries = await parseSweepOutput(rawOutput);
    let saved = 0;

    for (const d of discoveries) {
      if (!d.title || !d.summary) continue;
      await db.insert(aiDiscoveries).values({
        sweepId,
        category: d.category,
        title: d.title,
        summary: d.summary,
        detail: d.detail,
        source: d.source,
        sourceType: d.sourceType,
        applicability: d.applicability,
        isRead: false,
        isSaved: false,
      });
      saved++;
    }

    await db.update(aiSweepLog)
      .set({ status: "complete", itemsFound: String(saved), summary: `Found ${saved} new AI developments`, completedAt: new Date() })
      .where(eq(aiSweepLog.id, logEntry.id));

    onProgress?.({ phase: "done", content: "", done: true, sweepId, itemsFound: saved });
    return { sweepId, itemsFound: saved };

  } catch (err: any) {
    await db.update(aiSweepLog)
      .set({ status: "error", summary: err.message, completedAt: new Date() })
      .where(eq(aiSweepLog.id, logEntry.id));

    onProgress?.({ phase: "error", content: "", error: err.message });
    return { sweepId, itemsFound: 0 };
  }
}

let sweepInterval: NodeJS.Timeout | null = null;
let isSweeping = false;

export function startScheduledSweeps(intervalHours = 6) {
  if (sweepInterval) return;

  const run = async () => {
    if (isSweeping) return;
    isSweeping = true;
    console.log(`[Intelligence Sweep] Starting scheduled sweep...`);
    try {
      const { itemsFound } = await runIntelligenceSweep();
      console.log(`[Intelligence Sweep] Complete — ${itemsFound} items found`);
    } catch (err) {
      console.error("[Intelligence Sweep] Error:", err);
    }
    isSweeping = false;
  };

  run();
  sweepInterval = setInterval(run, intervalHours * 60 * 60 * 1000);
  console.log(`[Intelligence Sweep] Scheduled every ${intervalHours} hours`);
}

export function stopScheduledSweeps() {
  if (sweepInterval) { clearInterval(sweepInterval); sweepInterval = null; }
}

export function isSweepRunning() { return isSweeping; }

export { aiDiscoveries, aiSweepLog, db, desc };
