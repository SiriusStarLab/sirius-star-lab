import { Router, Request, Response } from "express";
import { db } from "../lib/db.js";
import { generateText } from "../lib/ai.js";

const router = Router();

router.get("/:userId/insights", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const now = new Date();

  const [projects, events] = await Promise.all([
    db.query(
      `SELECT id, name, status, phase, updated_at, brief
       FROM lab_projects
       WHERE status != 'completed'
       ORDER BY updated_at DESC`,
    ),
    db.query(
      `SELECT event_type, source, data, created_at
       FROM sirius_events
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    ),
  ]);

  const insights: Array<{
    type: string;
    project?: string;
    message: string;
    priority: "high" | "medium" | "low";
  }> = [];

  for (const p of projects.rows) {
    const updated = new Date(p["updated_at"] as string);
    const daysSince = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince > 14) {
      insights.push({
        type: "stalled",
        project: p["name"] as string,
        message: `${p["name"]} hasn't been touched in ${Math.floor(daysSince)} days. Worth picking up or archiving.`,
        priority: "high",
      });
    } else if (daysSince > 7) {
      insights.push({
        type: "cooling",
        project: p["name"] as string,
        message: `${p["name"]} is slowing down — last activity ${Math.floor(daysSince)} days ago.`,
        priority: "medium",
      });
    }

    if (p["status"] === "active" && p["phase"] === "design" && !p["brief"]) {
      insights.push({
        type: "incomplete",
        project: p["name"] as string,
        message: `${p["name"]} is missing a brief — hard to move forward without one.`,
        priority: "medium",
      });
    }
  }

  const activeCount = projects.rows.filter(
    (p) => {
      const updated = new Date(p["updated_at"] as string);
      return (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    },
  ).length;

  if (activeCount > 5) {
    insights.push({
      type: "focus",
      message: `${activeCount} projects active simultaneously. Consider narrowing focus to 2-3 to move faster.`,
      priority: "high",
    });
  }

  insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  res.json({
    userId,
    insights,
    projectCount: projects.rows.length,
    activeCount,
    generatedAt: now.toISOString(),
  });
});

router.post("/project", async (req: Request, res: Response) => {
  const { projectId, userId } = req.body as { projectId: number; userId: string };

  if (!projectId) {
    res.status(400).json({ error: "projectId required" });
    return;
  }

  const result = await db.query(
    `SELECT name, status, phase, brief, specs, updated_at,
            funding_status, launch_status, business_case, go_to_market
     FROM lab_projects WHERE id = $1`,
    [projectId],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const project = result.rows[0];
  const updated = new Date(project["updated_at"] as string);
  const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);

  const systemPrompt = `You are Sirius, an AI business partner. 
Analyse this project and give a concise, honest assessment.
Be direct. Identify the most critical next action.
Keep response under 200 words.`;

  const userPrompt = `Project: ${project["name"]}
Status: ${project["status"]}, Phase: ${project["phase"]}
Last updated: ${Math.floor(daysSince)} days ago
Brief: ${project["brief"] || "Not written"}
Specs: ${project["specs"] ? "Present" : "Missing"}
Business case: ${project["business_case"] ? "Written" : "Missing"}
Go-to-market: ${project["go_to_market"] ? "Written" : "Missing"}
Funding status: ${project["funding_status"] || "Not assessed"}

What is the most important thing to work on next for this project, and why?`;

  const analysis = await generateText(systemPrompt, userPrompt, "anthropic/claude-3.5-haiku");

  if (userId) {
    await db.query(
      `INSERT INTO sirius_events (user_id, event_type, source, data)
       VALUES ($1, $2, $3, $4)`,
      [userId, "project_analyzed", "intelligence", JSON.stringify({ projectId, projectName: project["name"] })],
    );
  }

  res.json({
    projectId,
    projectName: project["name"],
    analysis,
    daysSinceUpdate: Math.floor(daysSince),
    generatedAt: new Date().toISOString(),
  });
});

export default router;
