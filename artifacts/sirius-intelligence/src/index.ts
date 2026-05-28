import express from "express";
import cors from "cors";
import { checkDb } from "./lib/db.js";
import { checkRedis } from "./lib/redis.js";
import { db } from "./lib/db.js";
import contextRoutes from "./routes/context.js";
import memoryRoutes from "./routes/memory.js";
import briefingRoutes from "./routes/briefing.js";
import analyzeRoutes from "./routes/analyze.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "";

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://127.0.0.1", "http://localhost"],
}));

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  if (INTERNAL_SECRET && req.headers["x-internal-secret"] !== INTERNAL_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

app.get("/health", async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([checkDb(), checkRedis()]);
  const status = dbOk ? "ok" : "degraded";
  res.status(dbOk ? 200 : 503).json({
    status,
    checks: { db: dbOk, redis: redisOk },
    uptime: process.uptime(),
    version: "1.0.0",
  });
});

app.use("/context", contextRoutes);
app.use("/memory", memoryRoutes);
app.use("/briefing", briefingRoutes);
app.use("/analyze", analyzeRoutes);

app.post("/events", async (req, res) => {
  const { userId, eventType, source, data } = req.body as {
    userId: string;
    eventType: string;
    source: string;
    data: unknown;
  };

  if (!userId || !eventType || !source) {
    res.status(400).json({ error: "userId, eventType, source required" });
    return;
  }

  await db.query(
    `INSERT INTO sirius_events (user_id, event_type, source, data)
     VALUES ($1, $2, $3, $4)`,
    [userId, eventType, source, JSON.stringify(data ?? {})],
  );

  res.json({ ok: true });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[intelligence] Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[intelligence] Running on port ${PORT}`);
  console.log(`[intelligence] DB: ${process.env.DATABASE_URL ? "configured" : "NOT SET"}`);
  console.log(`[intelligence] Redis: ${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || "6379"}`);
});
