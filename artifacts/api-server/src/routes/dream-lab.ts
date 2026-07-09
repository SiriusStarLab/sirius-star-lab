import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, dreamLabProfiles, dreamLabIdeas, dreamLabManifestations, dreamLabJournal } from "@workspace/db";
import { openai } from "@workspace/ai-client";

const router: IRouter = Router();

// ── Middleware: require userId header ─────────────────────────────────────────
function requireUser(req: Request, res: Response, next: () => void) {
  const userId = req.headers["x-dream-user"] as string;
  if (!userId || userId.length < 4) {
    res.status(401).json({ error: "User ID required" });
    return;
  }
  next();
}

// ── Content guard: reject dark/harmful material ───────────────────────────────
const BLOCKED_TERMS = [
  "porn", "pornograph", "explicit sex", "nude", "naked", "hate", "abuse", "violence",
  "kill", "murder", "harm", "racist", "racist", "terror", "drug deal", "traffick",
];
function isContentSafe(text: string): boolean {
  const lower = text.toLowerCase();
  return !BLOCKED_TERMS.some(t => lower.includes(t));
}

// ── GET /dream-lab/profile ────────────────────────────────────────────────────
router.get("/dream-lab/profile", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const [profile] = await db.select().from(dreamLabProfiles).where(eq(dreamLabProfiles.userId, userId));
    res.json(profile || null);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /dream-lab/profile ───────────────────────────────────────────────────
router.post("/dream-lab/profile", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const { displayName, personality, lifestyle, coreValues, bigDream, manifestationStyle, colourTheme } = req.body;
    const safeCheck = [displayName, personality, lifestyle, coreValues, bigDream, manifestationStyle].filter(Boolean);
    if (!safeCheck.every(t => isContentSafe(t || ""))) {
      res.status(400).json({ error: "Content not aligned with Sirius values — please keep it positive and uplifting." });
      return;
    }
    const existing = await db.select().from(dreamLabProfiles).where(eq(dreamLabProfiles.userId, userId));
    if (existing.length > 0) {
      const [updated] = await db.update(dreamLabProfiles)
        .set({ displayName, personality, lifestyle, coreValues, bigDream, manifestationStyle, colourTheme, updatedAt: new Date() })
        .where(eq(dreamLabProfiles.userId, userId))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(dreamLabProfiles)
        .values({ userId, displayName: displayName || "", personality: personality || "", lifestyle: lifestyle || "", coreValues: coreValues || "", bigDream: bigDream || "", manifestationStyle: manifestationStyle || "", colourTheme: colourTheme || "cosmic" })
        .returning();
      res.json(created);
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /dream-lab/ideas ──────────────────────────────────────────────────────
router.get("/dream-lab/ideas", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const ideas = await db.select().from(dreamLabIdeas)
      .where(eq(dreamLabIdeas.userId, userId))
      .orderBy(desc(dreamLabIdeas.pinned), desc(dreamLabIdeas.createdAt));
    res.json(ideas);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /dream-lab/ideas ─────────────────────────────────────────────────────
router.post("/dream-lab/ideas", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const { title, description, category, colour, emoji, energyLevel } = req.body;
    if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }
    if (!isContentSafe(title + " " + (description || ""))) {
      res.status(400).json({ error: "Content not aligned with Sirius values — please keep it positive and uplifting." });
      return;
    }
    const [idea] = await db.insert(dreamLabIdeas)
      .values({ userId, title: title.trim(), description: description || "", category: category || "idea", colour: colour || "violet", emoji: emoji || "✨", energyLevel: energyLevel || 5 })
      .returning();
    res.json(idea);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── PUT /dream-lab/ideas/:id ──────────────────────────────────────────────────
router.put("/dream-lab/ideas/:id", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const id = parseInt(req.params.id as string);
    const { title, description, category, status, affirmations, energyLevel, pinned, colour, emoji } = req.body;
    const safeCheck = [title, description, affirmations].filter(Boolean);
    if (!safeCheck.every(t => isContentSafe(t || ""))) {
      res.status(400).json({ error: "Content not aligned with Sirius values." });
      return;
    }
    const [updated] = await db.update(dreamLabIdeas)
      .set({ title, description, category, status, affirmations, energyLevel, pinned, colour, emoji, updatedAt: new Date() })
      .where(and(eq(dreamLabIdeas.id, id), eq(dreamLabIdeas.userId, userId)))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── DELETE /dream-lab/ideas/:id ───────────────────────────────────────────────
router.delete("/dream-lab/ideas/:id", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const id = parseInt(req.params.id as string);
    await db.delete(dreamLabIdeas).where(and(eq(dreamLabIdeas.id, id), eq(dreamLabIdeas.userId, userId)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /dream-lab/ideas/:id/sirius ─────────────────────────────────────────
// Sirius enhances an idea — returns insight + affirmations (streaming)
router.post("/dream-lab/ideas/:id/sirius", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const id = parseInt(req.params.id as string);
    const [idea] = await db.select().from(dreamLabIdeas)
      .where(and(eq(dreamLabIdeas.id, id), eq(dreamLabIdeas.userId, userId)));
    if (!idea) { res.status(404).json({ error: "Idea not found" }); return; }

    const [profile] = await db.select().from(dreamLabProfiles).where(eq(dreamLabProfiles.userId, userId));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const systemPrompt = `You are Sirius — a warm, deeply intelligent AI intelligence partner. You help people develop their dreams, visions, and business ideas with clarity, insight, and genuine enthusiasm. You believe in the highest potential of every human being.

Your style: thoughtful, uplifting, specific — not generic. You give real insight, not hollow encouragement. You are optimistic but honest. You speak with warmth and intelligence.

VISION ALIGNMENT: Only engage with positive, constructive, uplifting ideas. Redirect any harmful, dark, or exploitative content toward something higher. Pornographic, violent, hateful, or abusive material is completely off-limits — politely redirect toward positive alternatives.

${profile ? `This user's profile:
- Name: ${profile.displayName || "Unknown"}
- Personality: ${profile.personality || "Not set"}
- Lifestyle: ${profile.lifestyle || "Not set"}
- Core values: ${profile.coreValues || "Not set"}
- Big dream: ${profile.bigDream || "Not set"}
- Manifestation style: ${profile.manifestationStyle || "Not set"}` : ""}

When given an idea, respond with:
1. A genuine, insightful reflection on what makes this idea powerful
2. What unique strengths this person brings to it (based on their profile)
3. The biggest opportunity hidden inside this idea
4. 3 powerful daily affirmations tailored to this specific idea and person
5. One concrete next action they could take today

Format your response naturally — flowing prose, then list the affirmations clearly. Be specific, not generic. Show you actually understand their idea.`;

    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Help me develop this idea:\n\nTitle: ${idea.title}\nDescription: ${idea.description || "(no description yet)"}\nCategory: ${idea.category}\nEnergy level: ${idea.energyLevel}/10` },
      ],
      max_tokens: 800,
    });

    let full = "";
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        full += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Save the insight to the DB
    await db.update(dreamLabIdeas)
      .set({ siriusInsights: full, updatedAt: new Date() })
      .where(eq(dreamLabIdeas.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err?.message })}\n\n`);
    res.end();
  }
});

// ── POST /dream-lab/sirius-chat ───────────────────────────────────────────────
// General Sirius chat within Dream Lab (streaming)
router.post("/dream-lab/sirius-chat", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const { message, history, systemPrompt: overrideSystemPrompt } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }
    if (!isContentSafe(message)) {
      res.status(400).json({ error: "Let's keep the Dream Lab a high-vibration space. Please rephrase." });
      return;
    }

    const [profile] = await db.select().from(dreamLabProfiles).where(eq(dreamLabProfiles.userId, userId));

    // Load their ideas and recent journal entries for context
    const ideas = await db.select().from(dreamLabIdeas)
      .where(eq(dreamLabIdeas.userId, userId))
      .orderBy(desc(dreamLabIdeas.createdAt))
      .limit(8);

    const journalEntries = await db.select().from(dreamLabJournal)
      .where(eq(dreamLabJournal.userId, userId))
      .orderBy(desc(dreamLabJournal.createdAt))
      .limit(4);

    const ideasContext = ideas.length > 0
      ? `\nIDEAS & DREAMS IN THEIR BOARD:\n${ideas.map(i => `- "${i.title}"${i.description ? `: ${i.description}` : ""} [${i.status || "seed"}]`).join("\n")}`
      : "";

    const journalContext = journalEntries.length > 0
      ? `\nRECENT JOURNAL ENTRIES:\n${journalEntries.map(e => `- ${e.title || "Entry"}: ${e.content?.slice(0, 150)}…`).join("\n")}`
      : "";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const dreamSystemPrompt = `You are Sirius — a deeply engaged, warm, and brilliant intelligence partner living inside someone's personal Dream Lab. This is their private space for building dreams, ideas, and the life they want.

YOUR PERSONALITY:
You are genuinely curious about this person. You listen carefully, pick up on what they say, and build on it. You are not a life coach reciting platitudes — you are a thinking partner who gets excited by ideas and helps turn vague feelings into real plans. You take the LEAD — you don't wait to be asked, you actively guide, suggest, and build.

YOUR JOB IN EVERY RESPONSE:
1. ENGAGE with what they actually said — reflect back what you heard, show you understood it
2. ADD something — a new angle, a suggestion, an option they haven't considered, a pattern you noticed
3. MOVE IT FORWARD — give them a concrete next step, a question that unlocks something, or a challenge that stretches them. Always end with forward momentum — a specific question, a choice, or an invitation to act.
4. BUILD on the story — each message should feel like another block being laid. Reference things they've mentioned before. Connect dots.

RESPONSE STYLE:
- Warm but not saccharine — real warmth, not hollow cheerleading
- Specific — use their actual words, their actual dream details, their actual ideas
- Offer concrete options when relevant (e.g. "There are a few directions this could go: 1… 2… 3… Which feels most alive?")
- Keep responses conversational — not a lecture, not bullet points unless genuinely useful
- Length: enough to be genuinely helpful, not so long it feels like homework
- YOU INITIATE — don't wait. If you can see a next step, say it. If you spot a blocker, name it. If you see a pattern, point it out.

${profile ? `WHO YOU ARE TALKING TO:
- Name: ${profile.displayName || "them"}
- Personality: ${profile.personality || ""}
- Lifestyle: ${profile.lifestyle || ""}
- Core values: ${profile.coreValues || ""}
- Big dream: ${profile.bigDream || ""}
- Manifestation style: ${profile.manifestationStyle || ""}` : "This person hasn't set up their profile yet — warmly invite them to share their name and one dream they're working on. Keep it simple and inviting."}
${ideasContext}
${journalContext}

NEVER engage with harmful, violent, exploitative, or hateful content. Gently redirect toward something constructive.`;

    const systemPrompt = overrideSystemPrompt || dreamSystemPrompt;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-12)) {
        if (h.role && h.content) messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: "user", content: message });

    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4.5",
      stream: true,
      messages,
      max_tokens: 1500,
      temperature: 0.8,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err?.message })}\n\n`);
    res.end();
  }
});

// ── GET /dream-lab/manifestations ─────────────────────────────────────────────
router.get("/dream-lab/manifestations", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const items = await db.select().from(dreamLabManifestations)
      .where(eq(dreamLabManifestations.userId, userId))
      .orderBy(desc(dreamLabManifestations.createdAt));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /dream-lab/manifestations ────────────────────────────────────────────
router.post("/dream-lab/manifestations", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const { text, type, frequency, ideaId } = req.body;
    if (!text?.trim()) { res.status(400).json({ error: "Text required" }); return; }
    if (!isContentSafe(text)) {
      res.status(400).json({ error: "Please keep your manifestations positive and uplifting." });
      return;
    }
    const [item] = await db.insert(dreamLabManifestations)
      .values({ userId, text: text.trim(), type: type || "affirmation", frequency: frequency || "daily", ideaId: ideaId || null })
      .returning();
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── DELETE /dream-lab/manifestations/:id ──────────────────────────────────────
router.delete("/dream-lab/manifestations/:id", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const id = parseInt(req.params.id as string);
    await db.delete(dreamLabManifestations).where(and(eq(dreamLabManifestations.id, id), eq(dreamLabManifestations.userId, userId)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /dream-lab/journal ────────────────────────────────────────────────────
router.get("/dream-lab/journal", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const entries = await db.select().from(dreamLabJournal)
      .where(eq(dreamLabJournal.userId, userId))
      .orderBy(desc(dreamLabJournal.createdAt))
      .limit(30);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── DELETE /dream-lab/journal/:id ────────────────────────────────────────────
router.delete("/dream-lab/journal/:id", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const id = parseInt(req.params.id as string);
    await db.delete(dreamLabJournal).where(and(eq(dreamLabJournal.id, id), eq(dreamLabJournal.userId, userId)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /dream-lab/journal ───────────────────────────────────────────────────
router.post("/dream-lab/journal", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const { title, content, mood, tags } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }
    if (!isContentSafe(content + " " + (title || ""))) {
      res.status(400).json({ error: "Please keep your journal entries positive and uplifting." });
      return;
    }
    const [entry] = await db.insert(dreamLabJournal)
      .values({ userId, title: title || "", content: content.trim(), mood: mood || "inspired", tags: tags || "" })
      .returning();
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /dream-lab/generate-affirmations ─────────────────────────────────────
// Sirius generates a batch of personalised affirmations
router.post("/dream-lab/generate-affirmations", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-dream-user"] as string;
    const { theme, count = 5 } = req.body;
    if (!isContentSafe(theme || "")) {
      res.status(400).json({ error: "Please keep affirmation themes positive and uplifting." });
      return;
    }

    const [profile] = await db.select().from(dreamLabProfiles).where(eq(dreamLabProfiles.userId, userId));

    const prompt = `Generate ${Math.min(count, 10)} powerful, personal daily affirmations${theme ? ` on the theme of: ${theme}` : ""}.

${profile ? `Personalise them deeply for this person:
- Name: ${profile.displayName || ""}
- Personality: ${profile.personality || ""}
- Core values: ${profile.coreValues || ""}
- Big dream: ${profile.bigDream || ""}
- Manifestation style: ${profile.manifestationStyle || ""}` : "Make them universally powerful and uplifting."}

Rules:
- Write in first person ("I am", "I have", "I create")
- Make them specific, not generic
- High vibration — expansive, confident, warm
- Each on its own line, no numbering
- No quotation marks
- No explanation, just the affirmations`;

    const response = await openai.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: [
        { role: "system", content: "You generate powerful, personalised affirmations. High vibration, specific, first-person present tense." },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
    });

    const text = response.choices[0]?.message?.content || "";
    const affirmations = text.split("\n").map(l => l.trim()).filter(l => l.length > 10);
    res.json({ affirmations });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
