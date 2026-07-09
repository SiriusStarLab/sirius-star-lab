/**
 * Sirius Session Summariser — Significance-Filtered
 *
 * After every real conversation, scores significance and only saves what matters:
 *   HIGH   — decisions made, things built/deployed, strategy agreed, breakthroughs
 *   MEDIUM — useful discussion, ideas introduced, meaningful exploration
 *   LOW    — discarded (short exchanges, troubleshooting loops, routine checks)
 *
 * High-significance sessions also extract new deep facts → mnemosyne_memories.
 * Ideas mentioned always get saved → dream_lab_ideas.
 * Runs fully async — never blocks the chat response.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openai } from "@workspace/ai-client";

interface Message {
  role: string;
  content: string;
}

// Keywords that strongly indicate significant content
const HIGH_SIGNAL_WORDS = [
  "deploy", "deployed", "built", "launched", "created", "decided", "agreed",
  "fixed", "solved", "shipped", "released", "pushed", "integrated",
  "strategy", "architecture", "design", "plan", "roadmap",
];
const MEDIUM_SIGNAL_WORDS = [
  "idea", "concept", "approach", "think", "should", "could", "considering",
  "research", "explore", "build", "create", "change", "update", "improve",
];

function scoreSignificance(messages: Message[]): "high" | "medium" | "low" {
  const real = messages.filter(m => m.role === "user" || m.role === "assistant");
  const totalChars = real.reduce((n, m) => n + String(m.content).length, 0);
  const avgAssistantLen = real.filter(m => m.role === "assistant")
    .reduce((n, m, _, a) => n + String(m.content).length / a.length, 0);

  // Immediate discard conditions
  if (real.length < 4) return "low";
  if (totalChars < 300) return "low";

  const fullText = real.map(m => String(m.content).toLowerCase()).join(" ");

  let score = 0;

  // Message depth
  if (real.length >= 8)  score += 3;
  if (real.length >= 6)  score += 2;
  if (real.length >= 4)  score += 1;

  // Response depth
  if (avgAssistantLen > 800)  score += 3;
  if (avgAssistantLen > 400)  score += 2;
  if (avgAssistantLen > 200)  score += 1;

  // High-signal keyword hits
  for (const word of HIGH_SIGNAL_WORDS) {
    if (fullText.includes(word)) score += 2;
  }

  // Medium-signal keyword hits (capped)
  let mediumHits = 0;
  for (const word of MEDIUM_SIGNAL_WORDS) {
    if (fullText.includes(word)) mediumHits++;
  }
  score += Math.min(mediumHits, 4);

  // Penalties for noise
  const userMsgs = real.filter(m => m.role === "user");
  const avgUserLen = userMsgs.reduce((n, m) => n + String(m.content).length, 0) / (userMsgs.length || 1);
  if (avgUserLen < 30)  score -= 3; // one-word replies = low engagement
  if (totalChars < 800) score -= 2;

  if (score >= 10) return "high";
  if (score >= 5)  return "medium";
  return "low";
}

export async function summariseSession(
  userId: string,
  messages: Message[],
  conversationId: number | null
): Promise<void> {
  // Pre-screen — discard noise before calling the AI
  const preScore = scoreSignificance(messages);
  if (preScore === "low") {
    console.log(`[Summariser] Conv ${conversationId} scored LOW — discarded.`);
    return;
  }

  const real = messages.filter(m => m.role === "user" || m.role === "assistant");
  const transcript = real
    .map(m => `${m.role === "user" ? "Garry" : "Sirius"}: ${String(m.content).slice(0, 700)}`)
    .join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4.5",
      max_tokens: 1500,
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: `You are Sirius's memory and significance-filtering system.

Read the conversation and decide if it's worth remembering. Be ruthless — only save what genuinely matters.

SIGNIFICANT (save as high/medium):
- Decisions made or plans agreed
- Things built, deployed, fixed, shipped
- New ideas, concepts, or strategic direction introduced
- Meaningful technical or business discussions
- Garry sharing something personal, a value, or a preference worth knowing

NOT SIGNIFICANT (return low — discard):
- Short troubleshooting that went nowhere
- Routine status checks with no action taken
- Repetitive conversations already covered before
- Small talk or brief exchanges under 5 real turns
- Failed attempts with no resolution

Return ONLY valid JSON — no markdown, no explanation:
{
  "significance": "high" | "medium" | "low",
  "discard_reason": "why discarded (only if low)",
  "key_themes": "2-3 sentence summary of what this session was really about",
  "decisions_made": "Concrete decisions or plans. Be specific. 'None' if none.",
  "things_built": "Code written, features shipped, tools created, files made. 'None' if none.",
  "emotional_tone": "one word: energised | focused | frustrated | exploratory | satisfied | mixed | routine",
  "progress_made": "What genuinely moved forward. Specific. 'None' if nothing real happened.",
  "ideas_captured": ["short string per idea mentioned — only genuinely new ones"],
  "new_facts_about_garry": ["facts worth adding to deep memory — only if truly new and not already known"]
}`,
        },
        { role: "user", content: `Evaluate this session:\n\n${transcript}` },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() || "";
    let summary: any;
    try {
      summary = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]+\}/);
      if (match) summary = JSON.parse(match[0]);
      else return;
    }

    // Final significance gate — Claude might downgrade what the pre-filter passed
    if (summary.significance === "low") {
      console.log(`[Summariser] Conv ${conversationId} — Claude rated LOW: ${summary.discard_reason || "not significant"}`);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    // Save to mnemosyne_sessions
    // key_themes, decisions_made, things_built are text[] — wrap strings in single-element arrays
    const toTextArray = (v: any): string[] => {
      if (Array.isArray(v)) return v.map(String).filter(Boolean);
      if (typeof v === "string" && v.trim()) return [v.trim()];
      return [];
    };
    await db.execute(sql`
      INSERT INTO mnemosyne_sessions
        (session_date, key_themes, decisions_made, things_built, emotional_tone, progress_made, significance)
      VALUES (
        ${today}::date,
        ${toTextArray(summary.key_themes)}::text[],
        ${toTextArray(summary.decisions_made || "None")}::text[],
        ${toTextArray(summary.things_built || "None")}::text[],
        ${summary.emotional_tone || "neutral"},
        ${summary.progress_made || ""},
        ${summary.significance || "medium"}
      )
    `);

    // Save new ideas → dream_lab_ideas
    const ideas: string[] = Array.isArray(summary.ideas_captured) ? summary.ideas_captured : [];
    for (const idea of ideas.slice(0, 5)) {
      const ideaStr = String(idea || "").trim();
      if (ideaStr.length < 5) continue;
      try {
        await db.execute(sql`
          INSERT INTO dream_lab_ideas (user_id, title, description, category, status)
          VALUES (${userId}, ${ideaStr.slice(0, 120)}, ${ideaStr.slice(0, 400)}, 'idea', 'active')
          ON CONFLICT DO NOTHING
        `);
      } catch { /* skip duplicate */ }
    }

    // For HIGH significance: extract new deep facts → mnemosyne_memories
    if (summary.significance === "high") {
      const newFacts: string[] = Array.isArray(summary.new_facts_about_garry) ? summary.new_facts_about_garry : [];
      for (const fact of newFacts.slice(0, 3)) {
        const factStr = String(fact || "").trim();
        if (factStr.length < 10) continue;
        try {
          await db.execute(sql`
            INSERT INTO mnemosyne_memories
              (layer, category, content, emotional_weight, confidence, source, pattern_tags)
            VALUES (
              'observed',
              'session_insight',
              ${factStr.slice(0, 600)},
              7,
              7,
              ${"session_" + today},
              '["auto_extracted"]'
            )
          `);
        } catch { /* skip */ }
      }
    }

    console.log(`[Summariser] Conv ${conversationId} saved — ${summary.significance.toUpperCase()} | tone: ${summary.emotional_tone} | ideas: ${ideas.length} | new facts: ${(summary.new_facts_about_garry || []).length}`);
  } catch (err: any) {
    console.error("[Summariser] Failed:", err?.message);
  }
}
