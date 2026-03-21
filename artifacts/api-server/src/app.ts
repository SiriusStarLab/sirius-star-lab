import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

const isDev = process.env.NODE_ENV !== "production";

const allowedOrigins = isDev
  ? true
  : (process.env.REPLIT_DOMAINS || "")
      .split(",")
      .flatMap(d => {
        const domain = d.trim();
        return domain ? [`https://${domain}`, `https://www.${domain}`] : [];
      });

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-lab-pin"],
}));

// Raw body for Stripe webhook signature verification — must come before JSON parser
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.get("/api/download/sirius-mobile", (req, res) => {
  const file = path.join("/home/runner/workspace/artifacts/sirius-mobile.tar.gz");
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", "attachment; filename=sirius-mobile.tar.gz");
  res.download(file, "sirius-mobile.tar.gz");
});

app.use("/api", router);

// In production, serve the built web app from the ai-chat artifact
if (!isDev) {
  const webDistPath = path.resolve(
    process.cwd(),
    "artifacts",
    "ai-chat",
    "dist",
    "public",
  );
  app.use(express.static(webDistPath));
  // SPA fallback: send index.html for any unknown route
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDistPath, "index.html"));
  });
}

export default app;
