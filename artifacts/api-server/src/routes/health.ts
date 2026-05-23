import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { runHealthCheck, getLastReport, getHistory } from "../lib/health-monitor.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/full", async (_req, res) => {
  const last = getLastReport();
  if (last) {
    res.json({ cached: true, history: getHistory().slice(0, 10), latest: last });
  } else {
    const report = await runHealthCheck();
    res.json({ cached: false, history: getHistory().slice(0, 10), latest: report });
  }
});

router.get("/health/run", async (_req, res) => {
  try {
    const report = await runHealthCheck();
    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
