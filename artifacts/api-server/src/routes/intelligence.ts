import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, userProfilesTable, moodCheckinsTable } from "@workspace/db";
import { openai } from "@workspace/ai-client";

const router = Router();

// POST /api/intelligence/mood — log a mood check-in
router.post("/intelligence/mood", async (req, res) => {
  const { userId, mood, note } = req.body ?? {};
  if (!userId || !mood) return res.status(400).json({ error: "userId and mood required" });

  const [checkin] = await db.insert(moodCheckinsTable).values({ userId, mood, note: note ?? "" }).returning();
  return res.json(checkin);
});

// GET /api/intelligence/mood/:userId — get mood history
router.get("/intelligence/mood/:userId", async (req, res) => {
  const { userId } = req.params;
  const checkins = await db
    .select()
    .from(moodCheckinsTable)
    .where(eq(moodCheckinsTable.userId, userId))
    .orderBy(desc(moodCheckinsTable.createdAt))
    .limit(60);
  return res.json(checkins);
});

// GET /api/intelligence/arc/:userId — AI analysis of emotional patterns
router.get("/intelligence/arc/:userId", async (req, res) => {
  const { userId } = req.params;

  const checkins = await db
    .select()
    .from(moodCheckinsTable)
    .where(eq(moodCheckinsTable.userId, userId))
    .orderBy(desc(moodCheckinsTable.createdAt))
    .limit(30);

  if (checkins.length < 3) {
    return res.json({ insight: null, message: "Check in a few more times and I'll start to see your patterns." });
  }

  const moodHistory = checkins
    .map(c => `${new Date(c.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}: ${c.mood}${c.note ? ` — "${c.note}"` : ""}`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "anthropic/claude-haiku-4.5",
    messages: [
      {
        role: "system",
        content: `You are a deeply perceptive intelligence partner. Analyse the person's mood check-in history and identify genuine patterns — recurring feelings, timing patterns, emotional rhythms. Be warm, specific, and honest. Never be generic. Speak directly to the person. Keep it to 3–5 sentences. End with one gentle, open question that invites reflection.`,
      },
      {
        role: "user",
        content: `Here is my mood check-in history:\n\n${moodHistory}\n\nWhat patterns do you see?`,
      },
    ],
    max_tokens: 300,
  });

  const insight = completion.choices[0]?.message?.content ?? null;
  return res.json({ insight, checkinCount: checkins.length });
});

// POST /api/intelligence/portrait/:userId — generate memory portrait
router.post("/intelligence/portrait/:userId", async (req, res) => {
  const { userId } = req.params;

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
  if (!profile?.memories || profile.memories.trim().length < 20) {
    return res.json({ portrait: null, message: "Talk to me more and I'll start to see who you are." });
  }

  const completion = await openai.chat.completions.create({
    model: "claude-sonnet-4-5",
    messages: [
      {
        role: "system",
        content: `You are writing a deeply personal portrait of someone based on what you have learned about them through conversation. Write it as a direct address — "You are..." or "There is a quality in you..." — warm, specific, poetic but grounded in truth. This should feel like someone truly seeing them, not a therapy summary. 150–200 words. No bullet points. Pure prose.`,
      },
      {
        role: "user",
        content: `Here is what I know about this person through our conversations:\n\n${profile.memories}\n\nWrite their portrait.`,
      },
    ],
    max_tokens: 400,
  });

  const portrait = completion.choices[0]?.message?.content ?? null;
  return res.json({ portrait, generatedAt: new Date().toISOString() });
});

// POST /api/intelligence/briefing/:userId — daily proactive briefing
router.post("/intelligence/briefing/:userId", async (req, res) => {
  const { userId } = req.params;

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
  const memories = profile?.memories ?? "";
  const aiName = profile?.aiName ?? "Sirius";

  const recentMoods = await db
    .select()
    .from(moodCheckinsTable)
    .where(eq(moodCheckinsTable.userId, userId))
    .orderBy(desc(moodCheckinsTable.createdAt))
    .limit(3);

  const moodContext = recentMoods.length > 0
    ? `Recent moods: ${recentMoods.map(m => m.mood).join(", ")}.`
    : "";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const completion = await openai.chat.completions.create({
    model: "claude-sonnet-4-5",
    messages: [
      {
        role: "system",
        content: `You are ${aiName}, a deeply intelligent AI intelligence partner. Today is ${today}. Generate a personalised daily briefing for this person. Based on what you know about their interests and recent emotional state, choose 2–3 genuinely fascinating things happening in the world right now that they would care about — mix scientific discovery, philosophy, something unexpected. Open with a warm, personal one-line check-in. Keep it concise, brilliant, and alive. Use your web search capability to find real, current stories. Format with clear sections. No more than 300 words.`,
      },
      {
        role: "user",
        content: `What you know about me:\n${memories || "Not much yet — make it broadly fascinating."}\n\n${moodContext}\n\nGive me my briefing.`,
      },
    ],
    max_tokens: 600,
  });

  const briefing = completion.choices[0]?.message?.content ?? null;
  res.json({ briefing, date: today });
});

// POST /api/intelligence/research — autonomous multi-step research
router.post("/intelligence/research", async (req, res) => {
  const { topic, userId } = req.body ?? {};
  if (!topic) return res.status(400).json({ error: "topic required" });

  const [profile] = userId
    ? await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId))
    : [null];
  const aiName = (profile as any)?.aiName ?? "Sirius";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: "claude-sonnet-4-5",
      stream: true,
      messages: [
        {
          role: "system",
          content: `You are ${aiName}, an autonomous research intelligence. Today is ${today}. You have been asked to deeply research a topic. Your process: 1) Conduct multiple web searches to gather current, authoritative information. 2) Synthesise across sources — looking for consensus, controversy, and emerging understanding. 3) Present your findings as a structured research briefing: an executive summary, key findings, what's contested or unknown, and one paragraph on why this matters. Be rigorous, specific, cite dates and sources where possible. This is not a chat response — it's a proper research document. Be thorough.`,
        },
        {
          role: "user",
          content: `Research topic: ${topic}\n\nGo deep. Search broadly. Come back with everything that matters.`,
        },
      ],
      max_completion_tokens: 2000,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
