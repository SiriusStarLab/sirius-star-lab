import { Router, type Request, type Response } from "express";
import { intelligence } from "../lib/intelligence-client.js";

const router = Router();

router.get("/intelligence/briefing/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const result = await intelligence.getBriefing(userId);
  if (!result) { res.status(503).json({ error: "Intelligence service unavailable" }); return; }
  res.json(result);
});

router.post("/intelligence/briefing/:userId/generate", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  try {
    const resp = await fetch(`${process.env.INTELLIGENCE_URL || "http://127.0.0.1:3001"}/briefing/${userId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json();
    res.json(data);
  } catch {
    res.status(503).json({ error: "Intelligence service unavailable" });
  }
});

router.get("/intelligence/insights/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const result = await intelligence.getInsights(userId);
  if (!result) { res.status(503).json({ error: "Intelligence service unavailable" }); return; }
  res.json(result);
});

router.get("/intelligence/context/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const result = await intelligence.getUnifiedContext(userId);
  if (!result) { res.status(503).json({ error: "Intelligence service unavailable" }); return; }
  res.json(result);
});

router.get("/intelligence/memory/:userId/prompt", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const result = await intelligence.getMemoryPrompt(userId);
  if (!result) { res.status(503).json({ error: "Intelligence service unavailable" }); return; }
  res.json(result);
});

router.post("/intelligence/events", async (req: Request, res: Response) => {
  const { userId, eventType, source, data } = req.body;
  await intelligence.logEvent(userId, eventType, source, data);
  res.json({ ok: true });
});

router.get("/intelligence/health", async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${process.env.INTELLIGENCE_URL || "http://127.0.0.1:3001"}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await resp.json();
    res.json(data);
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

export default router;
