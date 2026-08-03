import { db, userProfilesTable } from "@workspace/db";
import { openai } from "@workspace/ai-client";

/**
 * THE SINGLE CANONICAL MEMORY ENGINE.
 *
 * Both the regular chat and Star Lab call this function. It uses one format:
 *   (P) — Personal fact (name, location, family, occupation, beliefs, goals)
 *   (S) — Communication style (tone, length preference, directness)
 *   (E) — Emotional pattern (current mood, recurring worries/hopes)
 *   (R) — Recent context (active projects, upcoming events, live decisions)
 *
 * (P) and (S) lines are STABLE — never pruned unless explicitly contradicted.
 * (E) and (R) lines are DYNAMIC — refreshed each session.
 *
 * Nothing else writes to the memories field. Any caller that was producing its
 * own format (e.g. [Business], [Goals]) must be replaced with a call here.
 */
export async function extractAndSaveMemories(
  userId: string,
  conversation: Array<{ role: string; content: string | any }>,
  existingMemories: string
): Promise<void> {
  try {
    const existingLines = existingMemories
      ? existingMemories.split("\n").map(l => l.trim()).filter(Boolean)
      : [];

    // Stable = (P) or (S) prefixed — preserved across sessions, never pruned
    const stableLines = existingLines.filter(l => /^\((P|S)\)/i.test(l));
    // Dynamic = everything else — refreshed freely
    const dynamicLines = existingLines.filter(l => !/^\((P|S)\)/i.test(l));

    // Serialise conversation — image objects become "[image attached]"
    const serialised = conversation
      .slice(-20)
      .map(m => {
        const role = m.role === "user" ? "Person" : "AI";
        let text: string;
        if (typeof m.content === "string") {
          text = m.content.slice(0, 1000);
        } else if (Array.isArray(m.content)) {
          text = m.content
            .map((c: any) => (c.type === "text" ? c.text : "[image attached]"))
            .join(" ")
            .slice(0, 1000);
        } else {
          text = String(m.content).slice(0, 1000);
        }
        return `${role}: ${text}`;
      })
      .join("\n\n");

    if (!serialised.trim()) return;

    // Hard timeout — 25s gives OpenRouter enough headroom without hanging forever
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 25_000);

    let response;
    try {
      response = await openai.chat.completions.create(
        {
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a memory engine for a personal AI partner. Extract NEW facts from the conversation to update the memory profile. Respond in JSON only.

EXISTING STABLE FACTS (personal identity & style — preserve unless clearly contradicted):
${stableLines.length > 0 ? stableLines.join("\n") : "none yet"}

EXISTING DYNAMIC FACTS (emotional state, recent context — update freely):
${dynamicLines.length > 0 ? dynamicLines.join("\n") : "none yet"}

Extract facts in FOUR categories from the NEW conversation:
1. PERSONAL FACTS — Name, location, family, occupation, beliefs, goals, business, clients, products, finances. Prefix: (P)
2. COMMUNICATION STYLE — Response length, tone, formatting, directness, pace. Prefix: (S)
3. EMOTIONAL PATTERNS — Current mood, recurring worries or hopes. Prefix: (E)
4. RECENT CONTEXT — Active projects, upcoming events, live decisions, strategy. Prefix: (R)

Rules:
- Only return facts that are NEW or UPDATED. Do not repeat stable facts unless correcting them.
- Each fact must be under 30 words.
- Return up to 20 new/updated facts.
- Return valid JSON: {"new_facts": ["(P) fact", ...], "remove_facts": ["exact text of outdated fact to remove"]}
- If nothing new: {"new_facts": [], "remove_facts": []}`,
            },
            { role: "user", content: serialised },
          ],
        },
        { signal: abort.signal }
      );
    } finally {
      clearTimeout(timer);
    }

    const raw = response.choices[0]?.message?.content;
    if (!raw) return;

    const stripped = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
    const parsed = JSON.parse(stripped);
    const newFacts: string[] = Array.isArray(parsed.new_facts) ? parsed.new_facts : [];
    const removeFacts: string[] = Array.isArray(parsed.remove_facts) ? parsed.remove_facts : [];

    // Start with all existing lines, drop outdated ones
    let merged = existingLines.filter(line =>
      !removeFacts.some(r => line.toLowerCase().includes(r.toLowerCase().slice(0, 40)))
    );

    // Add new facts — skip any that are already effectively captured
    for (const fact of newFacts) {
      const key = fact.replace(/^\([PSER]\)\s*/i, "").toLowerCase().slice(0, 35);
      const alreadyExists = merged.some(m =>
        m.replace(/^\([PSER]\)\s*/i, "").toLowerCase().slice(0, 35) === key
      );
      if (!alreadyExists) merged.push(fact);
    }

    // Cap at 80 facts — keep all stable (P/S), trim oldest dynamic (E/R) first
    if (merged.length > 80) {
      const stable = merged.filter(l => /^\((P|S)\)/i.test(l));
      const dynamic = merged.filter(l => !/^\((P|S)\)/i.test(l));
      merged = [...stable, ...dynamic.slice(-(80 - stable.length))];
    }

    if (merged.length === 0 && existingLines.length === 0) return;

    const memoriesText = merged.join("\n");

    await db
      .insert(userProfilesTable)
      .values({ userId, memories: memoriesText })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { memories: memoriesText, updatedAt: new Date() },
      });

    console.log(`[memory] saved ${merged.length} facts for user ${userId} (+${newFacts.length} new, -${removeFacts.length} removed)`);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("[memory] extractAndSaveMemories timed out — OpenRouter took >12s");
    } else {
      console.error("[memory] extractAndSaveMemories failed:", err?.message ?? err);
    }
  }
}
