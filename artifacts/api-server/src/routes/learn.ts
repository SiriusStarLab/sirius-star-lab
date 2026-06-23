import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, studyPlans } from "@workspace/db";
import { openai } from "@workspace/ai-client";

const router: IRouter = Router();

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ── STUDY PLAN ──────────────────────────────────────────────────────────────

router.post("/learn/study-plan", async (req: Request, res: Response) => {
  const { userId, topic, level, duration } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: "Topic required" });

  const uid = (userId || "anonymous").toString();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const prompt = `Create a comprehensive, self-contained study plan for learning **${topic}**.

Level: ${level || "Beginner"}
Duration: ${duration || "4 weeks"}
Today: ${TODAY()}

IMPORTANT: This plan must teach the content directly. Do NOT suggest YouTube videos, external courses, or links to other resources. Everything the learner needs to understand should be written here — explanations, examples, and exercises included inline.

Format the plan as follows — use clear markdown with these exact sections:

## Overview
A 2-3 sentence summary of what the learner will achieve and why it matters.

## Learning Objectives
- 4-6 specific, measurable outcomes the learner will reach by the end

## Week-by-Week Breakdown
For each week:
### Week N: Theme Name Here
**Focus:** One sentence on what this week is about

**Core Concepts:**
For each major concept this week, write it out fully:
- **[Concept name]:** A clear 2-4 sentence explanation of what it is and how it works, written so someone encountering it for the first time can genuinely understand it. Include a concrete real-world analogy or example where helpful.

**Worked Example:**
Walk through a specific, concrete example that applies this week's concepts step by step. Show the thinking, not just the answer.

**Practice Exercises:**
3-5 specific exercises the learner can do right now, with enough detail to actually attempt them. Not "study X" — actual tasks: problems to solve, things to write, scenarios to work through.

**Checkpoint:** A clear, specific thing the learner should be able to do or explain by the end of this week — a real test of understanding, not just "review the material".

## Key Concepts to Master
A prioritised list of 8-12 core concepts, each with a 1-2 sentence plain-language explanation written out in full.

## Common Pitfalls
4-5 specific mistakes learners make, with a concrete explanation of why it's wrong and what the correct mental model is.

## How to Know You're Ready
3-4 specific, testable benchmarks. Frame them as challenges: "Can you do X without looking it up?" or "Can you explain Y to someone who has never heard of it?"

Write as Sirius — a knowledgeable partner who teaches through clarity and genuine explanation, not by delegating to other sources.`;

    let fullPlan = "";

    const stream = await openai.chat.completions.create({
      model: "claude-sonnet-4-5",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 3000,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullPlan += delta;
        send({ delta });
      }
    }

    if (uid !== "anonymous" && fullPlan) {
      try {
        await db.insert(studyPlans).values({
          userId: uid,
          topic: topic.trim(),
          level: level || "Beginner",
          duration: duration || "4 weeks",
          plan: fullPlan,
        });
      } catch (e: any) {
        console.error("[Learn] Failed to save study plan to DB:", e?.message);
      }
    }

    send({ done: true });
    res.end();
  } catch (err: any) {
    send({ error: err.message });
    res.end();
  }
});

// GET /api/learn/study-plans — list saved study plans for a user
router.get("/learn/study-plans", async (req: Request, res: Response) => {
  const userId = (req.query.userId || "").toString();
  if (!userId) return res.json([]);
  try {
    const plans = await db
      .select()
      .from(studyPlans)
      .where(eq(studyPlans.userId, userId))
      .orderBy(desc(studyPlans.createdAt))
      .limit(20);
    res.json(plans);
  } catch {
    res.json([]);
  }
});

// DELETE /api/learn/study-plans/:id
router.delete("/learn/study-plans/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    await db.delete(studyPlans).where(eq(studyPlans.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// ── QUIZ ─────────────────────────────────────────────────────────────────────

router.post("/learn/quiz", async (req: Request, res: Response) => {
  const { topic, difficulty, count, content } = req.body;
  if (!topic?.trim() && !content?.trim()) return res.status(400).json({ error: "Topic or content required" });

  try {
    const source = content?.trim()
      ? `Based on this content:\n\n${content.slice(0, 6000)}`
      : `Topic: ${topic}`;

    const prompt = `Generate exactly ${count || 8} multiple-choice quiz questions.
${source}
Difficulty: ${difficulty || "Medium"}

Return ONLY a valid JSON object with no extra text, no markdown code fences, no explanation — just the raw JSON:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct, and what is wrong with the others."
    }
  ]
}

Rules:
- "correct" is the zero-based index of the correct option (0–3)
- Always return exactly ${count || 8} questions — never fewer
- Questions should test genuine understanding, not just memorisation
- Explanations should be educational and specific
- Vary question styles: definition, application, comparison, scenario-based
- Make wrong answers plausible (not obviously wrong)
- If the topic is broad (e.g. "engineering", "science", "history"), pick a diverse spread of subtopics within it
- Start your response with { and end with } — nothing else`;

    const response = await openai.chat.completions.create({
      model: "claude-sonnet-4-5",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const obj = JSON.parse(cleaned);
      const arr = Array.isArray(obj)
        ? obj
        : obj.questions || obj.quiz || obj.items || (Object.values(obj).find(Array.isArray) as any[]);
      parsed = Array.isArray(arr) && arr.length > 0 ? arr : null;
    } catch {
      // Fallback: try to extract JSON block from text
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const obj = JSON.parse(match[0]);
          const arr = Array.isArray(obj)
            ? obj
            : obj.questions || obj.quiz || obj.items || (Object.values(obj).find(Array.isArray) as any[]);
          parsed = Array.isArray(arr) && arr.length > 0 ? arr : null;
        }
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse quiz — please try again" });
    }

    res.json({ questions: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── LEARN FROM DOCUMENT ───────────────────────────────────────────────────────

router.post("/learn/from-document", async (req: Request, res: Response) => {
  const { content, filename } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Document content required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const prompt = `You are Sirius — a brilliant intelligence partner. A user has shared a document with you and wants to learn from it.

Document: "${filename || "Uploaded document"}"
Content:
${content.slice(0, 8000)}

Teach this document to the user in a structured, engaging way. Format your response as:

## What This Is About
A clear 2-3 sentence summary of what this document covers and why it matters.

## Key Ideas
Break down the 5-8 most important concepts, ideas, or pieces of information from this document. For each:
- **[Concept name]:** Plain-language explanation (2-3 sentences)

## The Important Details
3-5 specific facts, figures, or details that are critical to understanding this material.

## How to Think About This
Help the learner form a mental model — how do the key ideas connect? What's the core logic or framework?

## Test Your Understanding
Write 3 questions the learner should be able to answer after reading this. Don't provide answers — challenge them to think.

## What to Explore Next
2-3 natural next steps or related topics to deepen understanding.

Write as a knowledgeable partner who finds this genuinely interesting — not as a textbook summary.`;

    const stream = await openai.chat.completions.create({
      model: "claude-sonnet-4-5",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 2500,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) send({ delta });
    }

    send({ done: true });
    res.end();
  } catch (err: any) {
    send({ error: err.message });
    res.end();
  }
});

export default router;
