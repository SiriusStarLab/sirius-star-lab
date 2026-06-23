/**
 * Session Summarizer
 *
 * After every real conversation ends, generates a structured summary and
 * saves it to mnemosyne_sessions. Also extracts any ideas mentioned and
 * saves them to dream_lab_ideas. Runs async — never blocks the response.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openai } from "@workspace/ai-client";

interface Message {
  role: string;
  content: string;
}

export async function summariseSession(
  userId: string,
  messages: Message[],
  conversationId: number | null
): Promise<void> {
  // Only summarise real conversations with at least 3 exchanges
  const realMessages = messages.filter(m => m.role === "user" || m.role === "assistant");
  if (realMessages.length < 4) return;

  const transcript = realMessages
    .map(m => `${m.role === "user" ? "Garry" : "Sirius"}: ${String(m.content).slice(0, 600)}`)
    .join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are Sirius's memory system. Read the conversation transcript and produce a structured session summary.
Return ONLY a JSON object with exactly these fields:
{
  "key_themes": "2-4 sentence summary of main topics discussed",
  "decisions_made": "Any concrete decisions or plans agreed upon. 'None' if none.",
  "things_built": "Code written, features deployed, files created, tools made. 'None' if none.",
  "emotional_tone": "One word: energised/focused/frustrated/exploratory/satisfied/mixed",
  "progress_made": "What genuinely moved forward this session. Be specific.",
  "ideas_captured": ["array of any ideas Garry mentioned, as short strings. Empty array if none."]
}
Return only valid JSON. No markdown, no explanation.`,
        },
        {
          role: "user",
          content: `Summarise this session:\n\n${transcript}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() || "";
    let summary: any;
    try {
      summary = JSON.parse(raw);
    } catch {
      // Try extracting JSON from response if wrapped in markdown
      const match = raw.match(/\{[\s\S]+\}/);
      if (match) summary = JSON.parse(match[0]);
      else return; // give up silently
    }

    const today = new Date().toISOString().split("T")[0];

    // Save session summary to mnemosyne_sessions
    await db.execute(sql`
      INSERT INTO mnemosyne_sessions
        (session_date, key_themes, decisions_made, things_built, emotional_tone, progress_made)
      VALUES (
        ${today},
        ${summary.key_themes || ""},
        ${summary.decisions_made || "None"},
        ${summary.things_built || "None"},
        ${summary.emotional_tone || "neutral"},
        ${summary.progress_made || ""}
      )
    `);

    // Save any ideas captured to dream_lab_ideas
    const ideas: string[] = Array.isArray(summary.ideas_captured) ? summary.ideas_captured : [];
    for (const idea of ideas.slice(0, 5)) {
      if (!idea || String(idea).trim().length < 5) continue;
      try {
        await db.execute(sql`
          INSERT INTO dream_lab_ideas (user_id, title, description, category, status)
          VALUES (${userId}, ${String(idea).slice(0, 120)}, ${String(idea).slice(0, 400)}, 'idea', 'active')
          ON CONFLICT DO NOTHING
        `);
      } catch { /* skip duplicate ideas */ }
    }

    console.log(`[SessionSummariser] Saved summary for conv ${conversationId} | tone: ${summary.emotional_tone} | ideas: ${ideas.length}`);
  } catch (err: any) {
    // Never let summarisation errors surface to the user
    console.error("[SessionSummariser] Failed:", err?.message);
  }
}
