/**
 * Investment Rule — Auto-archive projects whose investment requirement exceeds £10,000.
 *
 * Reads businessCase + costToBuild text, uses AI to extract a single GBP figure,
 * stores it in investmentRequired, then archives if > THRESHOLD.
 *
 * Safe to run repeatedly — skips projects already assessed (investmentAssessedAt set).
 * Can also be forced via forceReassess flag.
 */

import { eq, isNull, or, and, ne } from "drizzle-orm";
import { db, labProjects } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const THRESHOLD = 10_000; // £10,000

export interface InvestmentRuleResult {
  assessed: number;
  archived: number;
  skipped: number;
  details: Array<{ id: number; name: string; amount: number | null; action: "archived" | "kept" | "skipped" | "no-data" }>;
}

export async function runInvestmentRule(forceReassess = false): Promise<InvestmentRuleResult> {
  const result: InvestmentRuleResult = { assessed: 0, archived: 0, skipped: 0, details: [] };

  // Fetch active projects that need assessment
  const projects = await db
    .select({
      id: labProjects.id,
      name: labProjects.name,
      businessCase: labProjects.businessCase,
      costToBuild: labProjects.costToBuild,
      investmentRequired: labProjects.investmentRequired,
      investmentAssessedAt: labProjects.investmentAssessedAt,
    })
    .from(labProjects)
    .where(
      and(
        ne(labProjects.status, "archived"),
        or(
          // Not yet assessed
          isNull(labProjects.investmentAssessedAt),
          // Force mode: re-assess everything
          ...(forceReassess ? [ne(labProjects.status, "archived")] : []),
        ),
      ),
    );

  for (const project of projects) {
    const textToAnalyse = [project.businessCase, project.costToBuild]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000);

    if (!textToAnalyse || textToAnalyse.trim().length < 30) {
      // No financial content to assess
      result.details.push({ id: project.id, name: project.name, amount: null, action: "no-data" });
      result.skipped++;

      // Still stamp assessedAt so we don't keep re-visiting empty projects
      await db
        .update(labProjects)
        .set({ investmentAssessedAt: new Date() })
        .where(eq(labProjects.id, project.id));
      continue;
    }

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 60,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You extract a single investment/capital required figure from text. Return ONLY a JSON object: { "amount": <number in GBP or null if not found> }. The amount should be the TOTAL investment or capital required to build/develop the project — not revenue, not profit, not unit price. If the text mentions a range, use the lower figure. If no investment figure is mentioned return null.`,
          },
          {
            role: "user",
            content: `Extract the total investment required (in GBP) from this project financial text:\n\n${textToAnalyse}`,
          },
        ],
      });

      let amount: number | null = null;
      try {
        const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
        if (typeof parsed.amount === "number" && parsed.amount > 0) {
          amount = Math.round(parsed.amount);
        }
      } catch {
        // ignore parse error — amount stays null
      }

      result.assessed++;

      if (amount !== null && amount > THRESHOLD) {
        // Archive the project
        await db
          .update(labProjects)
          .set({
            investmentRequired: amount,
            investmentAssessedAt: new Date(),
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(labProjects.id, project.id));

        console.log(`[Investment Rule] Archived "${project.name}" — investment £${amount.toLocaleString()} > £${THRESHOLD.toLocaleString()}`);
        result.archived++;
        result.details.push({ id: project.id, name: project.name, amount, action: "archived" });
      } else {
        // Keep active — just record the assessed amount
        await db
          .update(labProjects)
          .set({
            investmentRequired: amount,
            investmentAssessedAt: new Date(),
          })
          .where(eq(labProjects.id, project.id));

        result.details.push({ id: project.id, name: project.name, amount, action: "kept" });
      }
    } catch (err: any) {
      console.error(`[Investment Rule] Failed for "${project.name}":`, err?.message);
      result.details.push({ id: project.id, name: project.name, amount: null, action: "skipped" });
      result.skipped++;
    }
  }

  console.log(`[Investment Rule] Done — assessed ${result.assessed}, archived ${result.archived}, skipped ${result.skipped}`);
  return result;
}
