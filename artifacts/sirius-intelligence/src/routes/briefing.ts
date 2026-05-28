import { Router, Request, Response } from "express";
import { db } from "../lib/db.js";
import { generateText } from "../lib/ai.js";

const router = Router();

async function buildBriefingContext(userId: string) {
  const [projects, memory, events, profile] = await Promise.all([
    db.query(
      `SELECT id, name, status, phase, updated_at,
              COALESCE(brief, '') as brief,
              COALESCE(funding_status, '') as funding_status,
              COALESCE(launch_status, '') as launch_status
       FROM lab_projects
       ORDER BY updated_at DESC
       LIMIT 10`,
    ),
    db.query(
      `SELECT memory_type, key, value, observation_count
       FROM sirius_memory
       WHERE user_id = $1
       ORDER BY observation_count DESC
       LIMIT 20`,
      [userId],
    ),
    db.query(
      `SELECT event_type, source, data, created_at
       FROM sirius_events
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '48 hours'
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId],
    ),
    db.query(
      `SELECT display_name, business_name, business_sector, business_goals
       FROM user_profiles
       WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const now = new Date();
  const stalled = projects.rows.filter((p) => {
    const updated = new Date(p["updated_at"] as string);
    const daysSince = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 7 && p["status"] !== "completed";
  });

  const active = projects.rows.filter((p) => {
    const updated = new Date(p["updated_at"] as string);
    const daysSince = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });

  return {
    profile: profile.rows[0] ?? {},
    projects: {
      all: projects.rows,
      active,
      stalled,
      total: projects.rows.length,
    },
    memory: memory.rows,
    recentEvents: events.rows,
    generatedAt: now.toISOString(),
  };
}

async function generateBriefing(userId: string) {
  const ctx = await buildBriefingContext(userId);
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const projectSummary = ctx.projects.all
    .map((p) => `- ${p["name"]} (${p["status"]}, phase: ${p["phase"]}, last updated: ${new Date(p["updated_at"] as string).toLocaleDateString()})`)
    .join("\n") || "No projects yet.";

  const stalledSummary = ctx.projects.stalled.length > 0
    ? ctx.projects.stalled.map((p) => `- ${p["name"]} (last touched ${new Date(p["updated_at"] as string).toLocaleDateString()})`).join("\n")
    : "None";

  const memoryLines = ctx.memory
    .map((m) => `- ${m["key"]}: ${typeof m["value"] === "string" ? m["value"] : JSON.stringify(m["value"])}`)
    .join("\n") || "No patterns recorded yet.";

  const systemPrompt = `You are Sirius, a personal AI built for Garry. 
You generate a concise, direct morning briefing. 
Tone: warm, direct, like a trusted partner who knows the business well.
No fluff. Focus on what matters and what action to take today.
Use Garry's name. Keep it under 300 words.`;

  const userPrompt = `Today is ${today}.

STAR LAB PROJECTS:
${projectSummary}

STALLED (>7 days):
${stalledSummary}

WHAT SIRIUS KNOWS ABOUT GARRY:
${memoryLines}

Generate Garry's morning briefing. Include:
1. A brief warm greeting acknowledging the day
2. Key project status — what's moving, what's stalled
3. One clear recommendation for what to focus on today
4. Any pattern or observation worth flagging
Keep it punchy. This appears in Garry's chat the moment he opens Sirius.`;

  const content = await generateText(systemPrompt, userPrompt, "anthropic/claude-3.5-haiku");

  return {
    content,
    context: ctx,
    generatedAt: new Date().toISOString(),
  };
}

router.get("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const today = new Date().toISOString().split("T")[0];

  const existing = await db.query(
    `SELECT content, created_at FROM sirius_briefings
     WHERE user_id = $1 AND briefing_date = $2`,
    [userId, today],
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    res.json({
      userId,
      date: today,
      briefing: row["content"],
      cached: true,
      createdAt: row["created_at"],
    });
    return;
  }

  const briefing = await generateBriefing(userId);

  await db.query(
    `INSERT INTO sirius_briefings (user_id, briefing_date, content)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, briefing_date)
     DO UPDATE SET content = EXCLUDED.content`,
    [userId, today, JSON.stringify({ text: briefing.content, context: briefing.context })],
  );

  res.json({
    userId,
    date: today,
    briefing: { text: briefing.content, context: briefing.context },
    cached: false,
    createdAt: briefing.generatedAt,
  });
});

router.post("/:userId/generate", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const today = new Date().toISOString().split("T")[0];

  const briefing = await generateBriefing(userId);

  await db.query(
    `INSERT INTO sirius_briefings (user_id, briefing_date, content)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, briefing_date)
     DO UPDATE SET content = EXCLUDED.content`,
    [userId, today, JSON.stringify({ text: briefing.content, context: briefing.context })],
  );

  res.json({
    userId,
    date: today,
    briefing: { text: briefing.content, context: briefing.context },
    generatedAt: briefing.generatedAt,
  });
});

router.get("/:userId/history", async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await db.query(
    `SELECT briefing_date, created_at, email_sent
     FROM sirius_briefings
     WHERE user_id = $1
     ORDER BY briefing_date DESC
     LIMIT 14`,
    [userId],
  );

  res.json({ userId, briefings: result.rows });
});

export default router;
