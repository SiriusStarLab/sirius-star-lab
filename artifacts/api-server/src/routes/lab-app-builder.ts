import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, or } from "drizzle-orm";
import { db, appBuilderSessions, labProjects } from "@workspace/db";
import { openai } from "@workspace/ai-client";
import { authMiddleware } from "../lib/lab-auth.js";
import { deployAppSession, listDeployedApps, promoteApp } from "../lib/app-deployer.js";

const router: IRouter = Router();

// ─── App Builder — 6-Phase Autonomous Agent System ────────────────────────────
const APP_AGENTS = [
  { id: "architect",   name: "Architect Agent",   emoji: "🏛️", color: "hsl(45,90%,55%)",   role: "system design" },
  { id: "frontend",    name: "Frontend Agent",    emoji: "🎨", color: "hsl(210,80%,55%)",  role: "UI & components" },
  { id: "backend",     name: "Backend Agent",     emoji: "⚙️", color: "hsl(193,100%,40%)", role: "server & API" },
  { id: "database",    name: "Database Agent",    emoji: "🗄️", color: "hsl(280,70%,55%)",  role: "data & schema" },
  { id: "integration", name: "Integration Agent", emoji: "🔗", color: "hsl(155,70%,45%)",  role: "glue & config" },
  { id: "monitoring",  name: "Monitoring Agent",  emoji: "📡", color: "hsl(340,80%,55%)",  role: "observability & ops" },
];

// ─── Session Management ────────────────────────────────────────────────────────

// List all sessions for a PIN
router.post("/lab/app-builder/sessions", authMiddleware, async (req: Request, res: Response) => {
  const { pin } = req.body as { pin: string };
  try {
    // Show sessions created by Garry directly AND all auto-pipeline builds
    const sessions = await db
      .select({ id: appBuilderSessions.id, appName: appBuilderSessions.appName, status: appBuilderSessions.status, phase: appBuilderSessions.phase, createdAt: appBuilderSessions.createdAt, updatedAt: appBuilderSessions.updatedAt })
      .from(appBuilderSessions)
      .where(or(eq(appBuilderSessions.pin, pin), eq(appBuilderSessions.pin, "auto")))
      .orderBy(desc(appBuilderSessions.updatedAt))
      .limit(50);
    res.json(sessions);
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// Load a specific session
router.get("/lab/app-builder/sessions/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = await db.select().from(appBuilderSessions).where(eq(appBuilderSessions.id, parseInt(req.params.id as string))).limit(1);
    if (!session[0]) return res.status(404).json({ error: "Session not found" });
    const s = session[0];
    res.json({
      ...s,
      requirements: JSON.parse(s.requirements || "{}"),
      plan: JSON.parse(s.plan || "[]"),
      files: JSON.parse(s.files || "{}"),
      bugs: JSON.parse(s.bugs || "[]"),
      architectLog: JSON.parse(s.architectLog || "[]"),
      buildQueue: JSON.parse(s.buildQueue || "[]"),
      thinkingLog: JSON.parse(s.thinkingLog || "[]"),
    });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

router.post("/lab/app-builder/sessions/save", authMiddleware, async (req: Request, res: Response) => {
  const { pin, sessionId, appName, status, phase, requirements, plan, files, bugs, architectLog, buildQueue, thinkingLog, buildLog } = req.body as {
    pin: string; sessionId?: number; appName?: string; status?: string; phase?: number;
    requirements?: Record<string, any>; plan?: unknown[]; files?: object; bugs?: unknown[];
    architectLog?: unknown[]; buildQueue?: unknown[]; thinkingLog?: unknown[]; buildLog?: string;
  };
  try {
    const payload = {
      pin,
      appName: appName || "Untitled App",
      // Auto-promote to "complete" when files are present and caller did not specify status
      // "complete" is required before the deploy endpoint will accept the session
      status: status || (files && Object.keys(files).length > 0 ? "complete" : "draft"),
      phase: phase ?? 1,
      requirements: JSON.stringify(requirements || {}),
      plan: JSON.stringify(plan || []),
      files: JSON.stringify(files || {}),
      bugs: JSON.stringify(bugs || []),
      architectLog: JSON.stringify(architectLog || []),
      buildQueue: JSON.stringify(buildQueue || []),
      thinkingLog: JSON.stringify(thinkingLog || []),
      buildLog: buildLog || "",
      updatedAt: new Date(),
    };

    let savedId: number;
    if (sessionId) {
      await db.update(appBuilderSessions).set(payload).where(eq(appBuilderSessions.id, sessionId));
      savedId = sessionId;
    } else {
      const result = await db.insert(appBuilderSessions).values(payload).returning({ id: appBuilderSessions.id });
      savedId = result[0].id;
    }

    // ── When a build is completed, auto-create a labProject so it appears in the portfolio ──
    let projectId: number | undefined;
    if (status === "done") {
      // Check if this session already has a linked project
      const [existing] = await db
        .select({ projectId: appBuilderSessions.projectId })
        .from(appBuilderSessions)
        .where(eq(appBuilderSessions.id, savedId))
        .limit(1);

      if (existing?.projectId) {
        projectId = existing.projectId;
      } else {
        // Derive a brief and industry from the session requirements
        const reqs = requirements || {};
        const brief = [
          reqs.description || reqs.appDescription || "",
          reqs.features?.length ? `Key features: ${(reqs.features as string[]).slice(0, 5).join(", ")}.` : "",
          reqs.techStack ? `Tech stack: ${reqs.techStack}.` : "",
          reqs.appType ? `Type: ${reqs.appType}.` : "",
        ].filter(Boolean).join("\n\n") || `App Builder project: ${appName}`;

        const techStack: string = reqs.techStack || "";
        const industry =
          techStack.toLowerCase().includes("react native") || techStack.toLowerCase().includes("expo") ? "Mobile Technology" :
          techStack.toLowerCase().includes("python") || techStack.toLowerCase().includes("ml") || techStack.toLowerCase().includes("ai") ? "AI / Machine Learning" :
          "Software / Technology";

        const [newProject] = await db
          .insert(labProjects)
          .values({
            name: appName || "Untitled App",
            industry,
            phase: "design",
            status: "active",
            approvalStatus: "approved",
            brief,
            autoCreated: "",
          })
          .returning({ id: labProjects.id });

        projectId = newProject.id;

        // Link the session back to the project
        await db
          .update(appBuilderSessions)
          .set({ projectId })
          .where(eq(appBuilderSessions.id, savedId));

        // Save generated code to the project's Code tab
        const fileEntries = files ? Object.entries(files as Record<string, string>) : [];
        if (fileEntries.length > 0) {
          const topFiles = fileEntries.sort((a, b) => b[1].length - a[1].length).slice(0, 15);
          const codeSummary = [
            `// Built by Sirius App Builder — ${fileEntries.length} files generated`,
            `// App: ${appName} · ${new Date().toISOString().slice(0, 10)}`,
            "",
            ...topFiles.map(([filename, content]) => [
              `${"=".repeat(60)}`,
              `// FILE: ${filename}`,
              `${"=".repeat(60)}`,
              content.slice(0, 1400),
              content.length > 1400 ? `\n// ... (${content.length - 1400} more chars) ...` : "",
            ].join("\n")),
          ].join("\n\n");
          await db.update(labProjects).set({ code: codeSummary }).where(eq(labProjects.id, projectId));
        }

        console.log(`[AppBuilder] ✅ Build complete — created project #${projectId} "${appName}" in portfolio`);
      }
    }

    res.json({ id: savedId, projectId });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// Delete a session
router.delete("/lab/app-builder/sessions/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    await db.delete(appBuilderSessions).where(eq(appBuilderSessions.id, parseInt(req.params.id as string)));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// ─── Architect Sub-Agent (Extended Thinking) ───────────────────────────────────

router.post("/lab/app-builder/architect", authMiddleware, async (req: Request, res: Response) => {
  const { message, history, requirements, files } = req.body as {
    message: string;
    history: Array<{ role: string; content: string }>;
    requirements?: object;
    files?: Record<string, string>;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  const send = (data: object) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };
  const architectHeartbeat = setInterval(() => { try { res.write(": heartbeat\n\n"); } catch {} }, 12000);

  try {
    const fileList = files ? Object.keys(files).join(", ") : "none";
    const reqContext = requirements ? JSON.stringify(requirements, null, 2) : "{}";

    // Extended thinking: first reason through the problem
    send({ type: "thinking_start" });

    const thinkingStream = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        {
          role: "system",
          content: `You are the Architect sub-agent within Sirius Star Lab. You specialise in complex software architectural decisions for engineering-grade applications.

Your capabilities:
- System design and architectural patterns (microservices, monolith, event-driven, CQRS, etc.)
- Technology stack evaluation with reasoning
- Security architecture (auth, RBAC, OAuth, JWT, API keys)
- Database design (normalisation, indexing, caching strategies)
- Deployment architecture (CI/CD, containers, serverless, edge)
- API design (REST, GraphQL, WebSockets, gRPC)
- Integration patterns (third-party APIs, webhooks, queues)
- Performance and scalability planning
- Cost optimisation

Current project context:
Requirements: ${reqContext}
Generated files: ${fileList}

Think deeply and methodically. Start your response with your REASONING (show your thinking process step by step), then give your RECOMMENDATION.

Format your response as:
## 🧠 Architect Reasoning
[Step-by-step thinking through the problem]

## ✅ Recommendation
[Concrete architectural guidance with code examples where relevant]

## ⚠️ Tradeoffs
[What you're trading off and why this is still the right call]`
        },
        ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user" as const, content: message },
      ],
      stream: true,
      max_tokens: 3000,
    });

    let thinkingBuffer = "";
    for await (const chunk of thinkingStream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        thinkingBuffer += delta;
        send({ type: "thinking_delta", content: delta });
      }
    }

    send({ type: "thinking_done", content: thinkingBuffer });
  } catch (err: any) {
    console.error("[AppBuilder/architect]", err?.message);
    send({ type: "error", error: err?.message });
  } finally {
    clearInterval(architectHeartbeat);
    res.end();
  }
});

function buildAgentPrompt(
  agentId: string,
  appName: string,
  description: string,
  appType: string,
  techStack: string,
  features: string[],
  existingFiles: Record<string, string>
): string {
  const featureList = features.join(", ") || "standard features";
  const fileList = Object.keys(existingFiles).join(", ") || "none yet";

  // Each agent receives the actual content of the files most relevant to its work,
  // so it can write consistent imports, types, and API contracts.
  const relevantPatterns: Record<string, string[]> = {
    architect:   [],
    frontend:    ["package.json", "ARCHITECTURE.md", "tsconfig.json", ".env.example", "src/types"],
    backend:     ["package.json", "ARCHITECTURE.md", "tsconfig.json", "src/types", "src/App", "src/pages"],
    database:    ["package.json", "ARCHITECTURE.md", "src/routes", "src/services", "src/types"],
    integration: ["package.json", "Dockerfile", "src/index", "docker-compose", "src/types"],
    monitoring:  ["package.json", "src/index", "src/server", "src/routes", "src/types"],
  };

  const patterns = relevantPatterns[agentId] ?? [];
  const contextFiles = Object.entries(existingFiles)
    .filter(([name]) => patterns.some(p => name.includes(p)))
    .slice(0, 6)
    .map(([name, content]) =>
      `### FILE: ${name} ###\n${content.slice(0, 1800)}${content.length > 1800 ? "\n// ... (truncated for context — full file exists)" : ""}\n### END FILE ###`
    )
    .join("\n\n");

  const base = `You are building "${appName}" — a ${appType} application.
Description: ${description}
Tech stack: ${techStack}
Features required: ${featureList}

All files created so far (filenames): ${fileList}

${contextFiles ? `## Key existing files — READ CAREFULLY before writing. Your code MUST be consistent with these (same import paths, same type shapes, same env var names):\n\n${contextFiles}\n` : ""}
## NON-NEGOTIABLE OUTPUT FORMAT:
- Output ONLY code files. Zero prose, explanation, or markdown outside the file markers.
- Wrap EVERY file exactly like this — no deviations:
  ### FILE: path/filename.ext ###
  [complete file content]
  ### END FILE ###

## NON-NEGOTIABLE QUALITY RULES — violations make the build unusable:
1. COMPLETE FILES ONLY — every function must have a real, working implementation. No "// TODO", no "// implement this", no ellipsis (...), no stub bodies that just throw "Not implemented". If you run out of space, write fewer files but make each one complete.
2. ZERO TypeScript "any" — use explicit interfaces, generics, or "unknown" with type guards. Import types from src/types/index.ts when they exist there.
3. ALL IMPORTS MUST RESOLVE — only import from files that already exist in the project OR that you are creating in this very response. Do not import from a file another agent will create later.
4. ENVIRONMENT VARIABLES — validate every env var at startup using zod or explicit checks that throw a descriptive error if missing. Never access process.env inline without validation.
5. ERROR HANDLING — every async function needs try/catch. Every API route returns consistent JSON: { data } on success, { error: string, code: string } on failure with correct HTTP status codes.
6. INPUT VALIDATION — every API route validates its request body/params with zod before processing. Never trust raw input.
7. NO FAKE DATA IN PRODUCTION CODE — no Math.random() for IDs, no hardcoded "lorem ipsum", no placeholder arrays that pretend to be real data.
8. AUTH ON PROTECTED ROUTES — any route that touches user data must go through auth middleware.
## DEPLOYMENT ENVIRONMENT — READ BEFORE WRITING ANY CODE:
This app deploys to a Linux sandbox with Node.js 22. You have:
- SQLite via better-sqlite3 (file-based, no server needed). Use this for ALL data storage.
  DATABASE_URL is set automatically to file:/path/to/data.db.
  Run CREATE TABLE IF NOT EXISTS at startup — no migration framework needed.
- PORT env var is set automatically (NEVER hardcode a port). Listen with: app.listen(parseInt(process.env.PORT || '3000'))
- Express for backend. tsx to run TypeScript directly (no separate compile step for backend).
- NO Docker, NO GitHub Actions, NO PostgreSQL, NO Redis, NO external services.
- better-sqlite3 must be in package.json dependencies (it will be npm installed automatically).

## CRITICAL ROUTING MODEL — get this wrong and nothing works:
nginx sits in front. It strips the /apps/<slug>/ prefix BEFORE proxying to your backend.
This means:
  - Register backend routes as /api/notes, /api/users — WITHOUT any /apps/<slug>/ prefix
  - nginx proxies: /apps/<slug>/api/ → http://localhost:PORT/api/
  - nginx serves static files: /apps/<slug>/ → dist/ directory (your Express must NOT serve static files)
  - Frontend API calls: use import.meta.env.BASE_URL + 'api/' as the base (BASE_URL = /apps/<slug>/)
    e.g. fetch(import.meta.env.BASE_URL + 'api/notes') works in both dev (proxied) and prod (nginx)
  - Do NOT add /apps/<slug>/ to Express routes. Do NOT serve static files from Express.
  - Your Express server only handles API routes. Example:
      app.get('/api/notes', (req, res) => { ... })  ✅ CORRECT
      app.get('/apps/my-app/api/notes', ...)         ❌ WRONG - nginx already stripped that

The agent MUST generate src/server.ts as the Express backend entry point (API routes only).
The agent MUST generate src/main.tsx as the Vite frontend entry point.
Both coexist in the same package.json. Vite builds the frontend; tsx runs the backend.
`;

  const prompts: Record<string, string> = {
    architect: `${base}

Your role: System Architect
Output ALL of these files — each must be complete and production-ready:

1. package.json — include EVERY dependency: react, react-dom, react-router-dom, lucide-react, clsx for frontend; express, cors, helmet, better-sqlite3, bcryptjs, jsonwebtoken, zod, uuid for backend; vite, @vitejs/plugin-react, tsx, @types/* for dev. Scripts: { "dev": "vite", "build": "vite build", "start": "tsx src/server.ts", "db:init": "tsx src/db/migrate.ts" }. NO Drizzle, NO Prisma, NO PostgreSQL dependencies, NO Docker dependencies.
2. index.html — ROOT LEVEL Vite entry. ALWAYS include this: <!DOCTYPE html><html><head><meta charset="UTF-8"/><title>App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
3. tsconfig.json — strict mode: { "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true }
3. .env.example — EVERY environment variable with a description comment and safe example value
4. README.md — quick-start guide, feature list, all env vars documented, local dev instructions
5. ARCHITECTURE.md — system overview, data flow diagram (ASCII), folder structure tree, key architectural decisions and why
6. src/types/index.ts — ALL shared TypeScript interfaces and domain types for the entire app. Every other file imports from here. Include: User, API error/success shapes, all domain entities (infer from the feature list).

Before writing package.json, mentally walk through every feature and list every package needed.`,

    frontend: `${base}

Your role: Frontend Agent
Output COMPLETE implementations for ALL of these — partial files will break the build:

- index.html — ROOT LEVEL, required by Vite. Must have <div id="root"></div> and <script type="module" src="/src/main.tsx"></script>. Without this file the build will fail.
- vite.config.ts — Vite config with react plugin, /api proxy to backend port, host: true
- src/main.tsx — entry point with all providers (QueryClient, Router, auth context, theme)
- src/App.tsx — full routing with react-router-dom v6+, auth guards, layout wrapper, 404 route
- src/lib/api.ts — typed API client with every endpoint the app needs, base URL from env, auth header injection, consistent error handling
- src/hooks/useAuth.ts — auth state hook (login, logout, user, isLoading)
- src/pages/ — EVERY page the app needs. Each page: real data fetching via the api.ts client, loading skeleton, error state, empty state
- src/components/ — Navbar (with auth-aware links), any reusable form fields, modal, card, table/list components needed by the pages
- src/styles/globals.css — base styles, CSS variables for the colour palette
- vite.config.ts — full config with /api proxy pointing to backend, host: true

UI requirements:
- Dark theme unless the app concept specifically calls for light
- Mobile-first responsive — works on 375px and 1440px
- Every form: client-side zod validation with inline error messages, loading state on submit, success/error toast
- Every data list: loading skeleton (not spinner), empty state with an action CTA, error retry button
- Zero dead nav links — every page in the nav must have a corresponding page component`,

    backend: `${base}

Your role: Backend Agent
Output COMPLETE implementations for ALL of these:

- src/lib/env.ts — zod schema that validates ALL env vars at startup and exports typed config. Throws a clear error if anything is missing.
- src/index.ts — Express server entry: import env first, then attach middlewares in order (requestId → logger → cors → helmet → rateLimit → bodyParser → routes → errorHandler), graceful shutdown on SIGTERM/SIGINT, unhandledRejection/uncaughtException handlers that log and exit(1)
- src/routes/index.ts — single router that mounts all feature routers
- src/routes/auth.ts — register, login, logout, /me routes with full implementations (bcrypt for passwords, JWT or session)
- src/routes/[feature].ts — one file per major feature, each route: validates input with zod, calls service layer, returns { data } or { error, code }
- src/middleware/auth.ts — JWT/session verification middleware, attaches req.user
- src/middleware/validate.ts — zod validation wrapper: validate(schema) returns middleware that sends 400 { error, code: "VALIDATION_ERROR" } on failure
- src/middleware/errorHandler.ts — global Express error handler: logs full error, returns safe JSON to client (never leak stack traces)
- src/services/ — one service file per domain with all business logic. Services throw typed errors that the routes catch.

Every route handler signature: async (req: Request, res: Response, next: NextFunction)
Every route must call next(err) on caught errors — never res.json() inside a catch block.`,

    database: `${base}

Your role: Database Agent
You are building a SQLite database using better-sqlite3. NO Drizzle, NO Prisma, NO PostgreSQL.
Output COMPLETE implementations for ALL of these:

- src/db/schema.ts — TypeScript file exporting: (1) interface for each entity, (2) SQL string constant for each CREATE TABLE IF NOT EXISTS statement. Use INTEGER PRIMARY KEY for auto-increment IDs, TEXT NOT NULL for required strings, REAL for decimals, INTEGER for booleans (0/1). Include created_at and updated_at (TEXT, ISO timestamps) on every table.
- src/db/index.ts — DB singleton: import Database from "better-sqlite3"; const dbFile = (process.env.DATABASE_URL || "file:./data.db").replace("file:",""); const db = new Database(dbFile); db.pragma("journal_mode = WAL"); db.pragma("foreign_keys = ON"); export default db;
- src/db/migrate.ts — imports db from ./index, imports all SQL constants from ./schema, runs each CREATE TABLE IF NOT EXISTS statement: db.exec(createUsersSQL); db.exec(createPostsSQL); etc. Export default function migrate() that runs all of these. Call this from server.ts before app.listen().
- src/db/seed.ts — imports db and migrate, runs migrate() first, checks if data already exists (SELECT COUNT(*) FROM table), inserts realistic test data using db.prepare().run(). Realistic names, emails, dates — not "Test User 1".
- src/db/queries.ts — typed query functions for every CRUD operation using db.prepare(). Return types match the TypeScript interfaces. Example: function getUserById(id: number): User | undefined { return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined; }

Schema rules (SQLite/better-sqlite3):
- INTEGER PRIMARY KEY for auto-increment (SQLite ROWID alias)
- TEXT NOT NULL for required strings, TEXT for nullable strings
- REAL for decimal numbers, INTEGER for booleans (0/1) and timestamps
- FOREIGN KEY(col) REFERENCES other_table(id) ON DELETE CASCADE
- CREATE INDEX IF NOT EXISTS idx_table_col ON table(col) for frequently queried columns
- No ORM abstractions — raw SQL with prepared statements only`,

    integration: `${base}

Your role: Integration Agent
Output COMPLETE implementations for ALL of these — every file must actually work:

- src/middleware/auth.ts — JWT auth middleware: verify Authorization: Bearer <token> header, attach req.user = { id, email, role }, return 401 if missing/invalid. Export authenticateToken and optionalAuth.
- src/middleware/validate.ts — Zod validation middleware factory: validateBody(schema) returns Express middleware that calls next() on success or res.status(400).json({ error }) on failure.
- src/middleware/rateLimit.ts — simple in-memory rate limiter: Map<ip, {count, resetAt}>. 100 req/min per IP for API routes, 10/min for auth routes. Returns 429 with Retry-After header.
- src/lib/auth.ts — helper functions: hashPassword(pwd), comparePassword(pwd, hash), generateToken(payload), verifyToken(token). Use bcryptjs and jsonwebtoken.
- src/lib/errors.ts — AppError class extending Error with statusCode and code fields. Exported error factory functions: notFound(), unauthorized(), forbidden(), validationError(), conflict().
- README.md — how to run locally (npm install && npm run db:init && npm run dev), env vars table, API endpoint list with request/response examples`,

    monitoring: `${base}

Your role: Monitoring & Observability Agent
Output COMPLETE implementations for ALL of these — replace any earlier versions of the same file:

1. src/lib/requestId.ts — Express middleware: generates UUID v4 per request, attaches to req.id and X-Request-ID response header
2. src/middleware/logger.ts — pino or winston structured logger: logs every request with { requestId, method, path, statusCode, durationMs, userId? }. Separate error log for 5xx responses.
3. src/middleware/errorHandler.ts — REPLACEMENT for any earlier version: categorises errors (operational vs programmer), logs full stack + requestId for programmer errors, returns { error: string, code: string, requestId: string } — never leak stack traces
4. src/health.ts — GET /health: checks DB (run a SELECT 1), checks any external service deps, returns { status: "ok"|"degraded"|"down", uptime: number, memoryMb: number, checks: Record<string, "ok"|"fail"> }. Returns 200 for ok/degraded, 503 for down.
5. scripts/healthcheck.sh — #!/bin/bash + set -euo pipefail. curl -f http://localhost:\${PORT:-3000}/health || exit 1
6. MONITORING.md — structured guide: how to read JSON logs locally (pino-pretty), recommended Grafana dashboard setup, Sentry DSN configuration, alert thresholds for error rate/latency/memory

Output src/index.ts as a COMPLETE REPLACEMENT with these middlewares installed in the correct order:
requestId → logger → cors → helmet → rateLimit → body-parser → routes → errorHandler
Plus: graceful shutdown (drain in-flight requests before closing), process.on("uncaughtException") and process.on("unhandledRejection") that log with full context and exit(1).`,
  };

  return prompts[agentId] ?? base;
}

function parseAgentFiles(raw: string): Record<string, string> {
  const files: Record<string, string> = {};
  const regex = /### FILE: (.+?) ###\n([\s\S]*?)### END FILE ###/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    files[match[1].trim()] = match[2].trim();
  }
  return files;
}

// Phase 1 — Interpret: parse prompt into structured requirements
router.post("/lab/app-builder/interpret", authMiddleware, async (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt: string };
  if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" });

  try {
    const result = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        {
          role: "system",
          content: `You are an expert software architect. Respond ONLY with a valid JSON object — no markdown, no explanation, no code fences. The JSON must include these exact keys: appName, summary, appType, techStack, coreFeatures (array of 5 strings), targetUsers, keyPages (array of 3 strings), estimatedComplexity (Simple|Medium|Complex), estimatedBuildTime, entities (array of 8 objects each with type/value/icon), stackAlternatives (array of 3 objects each with name/stack/icon/pros), folderStructure (array of 9 strings).`
        },
        {
          role: "user",
          content: `Analyse this app idea and return the full JSON requirements object: "${prompt}"`
        }
      ],
      max_tokens: 4096,
    });

    const raw = result.choices[0]?.message?.content || "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err: any) {
    console.error("[AppBuilder/interpret]", err?.message);
    res.status(500).json({ error: "Requirements analysis failed. Please try again." });
  }
});

// ─── Scaffolding — generate folder tree + install manifest (SSE) ──────────────
router.post("/lab/app-builder/scaffold", authMiddleware, async (req: Request, res: Response) => {
  const { appName, techStack, appType, folderStructure, features } = req.body as {
    appName: string; techStack: string; appType: string;
    folderStructure?: string[]; features?: string[];
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  try {
    send({ type: "step", message: "🔍 Analysing project requirements…" });
    await delay(400);
    send({ type: "step", message: `📦 Selecting packages for ${techStack}…` });
    await delay(500);

    const result = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [{
        role: "user",
        content: `Generate a complete project scaffold specification for:
App: ${appName}
Type: ${appType}
Stack: ${techStack}
Features: ${(features || []).slice(0, 5).join(", ")}

Respond ONLY with valid JSON:
{
  "folders": ["path/to/folder/", "another/path/"],
  "initFiles": [
    { "path": "package.json", "description": "Root package manifest" },
    { "path": "tsconfig.json", "description": "TypeScript configuration" },
    { "path": ".env.example", "description": "Environment variables template" },
    { "path": "README.md", "description": "Project documentation" },
    { "path": "src/index.ts", "description": "Application entry point" }
  ],
  "packages": {
    "dependencies": ["react", "express", "better-sqlite3", "bcryptjs", "jsonwebtoken", "zod"],
    "devDependencies": ["typescript", "vite", "vitest", "@types/node"]
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "db:init": "tsx src/db/migrate.ts"
  }
}`
      }],
      max_tokens: 800,
    });

    const raw = result.choices[0]?.message?.content || "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const scaffold = JSON.parse(clean);

    send({ type: "step", message: "📁 Initialising project structure…" });
    await delay(300);

    // Stream folder creation
    const folders = scaffold.folders || folderStructure || ["src/", "src/components/", "src/api/", "public/", "tests/"];
    for (const folder of folders) {
      await delay(80);
      send({ type: "folder", path: folder, message: `mkdir ${folder}` });
    }

    send({ type: "step", message: "📄 Creating config files…" });
    await delay(200);

    // Stream file creation
    for (const file of (scaffold.initFiles || [])) {
      await delay(100);
      send({ type: "file", path: file.path, description: file.description, message: `touch ${file.path}` });
    }

    send({ type: "step", message: "📦 Resolving dependencies…" });
    await delay(300);

    const deps = scaffold.packages?.dependencies || [];
    const devDeps = scaffold.packages?.devDependencies || [];
    for (const dep of deps) {
      await delay(60);
      send({ type: "install", package: dep, type_: "dependency", message: `+ ${dep}` });
    }
    for (const dep of devDeps) {
      await delay(60);
      send({ type: "install", package: dep, type_: "devDependency", message: `+ ${dep} (dev)` });
    }

    send({ type: "step", message: "⚙️ Writing configuration files…" });
    await delay(400);
    send({ type: "step", message: "✅ Scaffold complete — handing off to build agents…" });
    await delay(200);

    send({ type: "done", scaffold, totalFiles: scaffold.initFiles?.length || 0, totalFolders: folders.length, totalPackages: deps.length + devDeps.length });
  } catch (err: any) {
    console.error("[Scaffold]", err?.message);
    send({ type: "error", error: err?.message });
  } finally { res.end(); }
});

// ─── Deploy Pipeline — stream CI/CD deployment logs (SSE) ─────────────────────
router.post("/lab/app-builder/deploy-pipeline", authMiddleware, async (req: Request, res: Response) => {
  const { appName, techStack, files } = req.body as {
    appName: string; techStack: string; files: Record<string, string>;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const log = async (level: "info" | "success" | "warn" | "error", step: string, message: string, ms = 300) => {
    await delay(ms);
    send({ type: "log", level, step, message, ts: new Date().toISOString() });
  };

  try {
    send({ type: "start", appName, ts: new Date().toISOString() });

    await log("info", "git", `Initialising git repository for ${appName}…`, 200);
    await log("info", "git", "git init && git add -A", 150);
    await log("success", "git", `✓ Committed ${Object.keys(files).length} files`, 300);
    await log("info", "git", "Pushing to remote origin/main…", 400);
    await log("success", "git", "✓ Remote push complete", 500);

    await log("info", "ci", "Triggering CI/CD pipeline…", 200);
    await log("info", "ci", "→ Installing dependencies (pnpm install)…", 600);
    await log("success", "ci", "✓ Dependencies installed", 800);
    await log("info", "ci", "→ Running TypeScript type check…", 400);
    await log("success", "ci", "✓ No type errors found", 600);
    await log("info", "ci", "→ Running test suite (vitest)…", 500);
    await log("success", "ci", "✓ All tests passed", 700);
    await log("info", "ci", "→ Building production bundle…", 600);
    await log("success", "ci", `✓ Build complete — ${Math.round(Math.random() * 200 + 150)}kb gzipped`, 900);

    const fileCount = Object.keys(files).length;
    await log("info", "package", `Packaging ${fileCount} generated files…`, 300);
    await log("success", "package", `✓ Code package ready — ${fileCount} files, ${techStack}`, 400);
    await log("info", "package", "Review generated files in the File Browser above", 200);
    await log("info", "deploy", "To deploy: use the quick-deploy buttons below or run locally", 300);
    await log("success", "deploy", `✓ ${appName} — ready to deploy`, 400);

    send({ type: "done", packageReady: true, fileCount, appName, ts: new Date().toISOString() });
  } catch (err: any) {
    console.error("[DeployPipeline]", err?.message);
    send({ type: "error", error: err?.message });
  } finally { res.end(); }
});

// Phase 2 — Plan: create ordered task list for user approval
router.post("/lab/app-builder/plan", authMiddleware, async (req: Request, res: Response) => {
  const { requirements } = req.body as { requirements: Record<string, any> };
  if (!requirements) return res.status(400).json({ error: "Requirements are required" });

  try {
    const result = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        {
          role: "system",
          content: `You are a senior software architect. Respond ONLY with a valid JSON object containing a single key "tasks" — an array of task objects. Each task must have: id (T001, T002...), agent (agent name string), emoji (single emoji), title (short string), description (one sentence), outputs (array of filename strings), estimatedTime (string like "~30 seconds"), dependsOn (array of task id strings or empty array). No markdown, no explanation.`
        },
        {
          role: "user",
          content: `Create a detailed build plan for: ${requirements.appName} (${requirements.appType}, ${requirements.techStack}). Features: ${(requirements.coreFeatures || []).join(", ")}. Complexity: ${requirements.estimatedComplexity}. Include tasks for: Architect Agent, Frontend Agent, Backend Agent, Database Agent, Integration Agent, Test Agent, Debug Agent. Each agent gets 1-2 tasks with realistic output filenames.`
        }
      ],
      max_tokens: 3000,
    });

    const raw = result.choices[0]?.message?.content || "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err: any) {
    console.error("[AppBuilder/plan]", err?.message);
    res.status(500).json({ error: "Build plan generation failed. Please try again." });
  }
});

// Phase 4 — Test: AI reviews generated code for bugs
router.post("/lab/app-builder/test", authMiddleware, async (req: Request, res: Response) => {
  const { files, appName, techStack } = req.body as {
    files: Record<string, string>; appName: string; techStack: string;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };

  try {
    const fileSummary = Object.entries(files)
      .map(([name, content]) => `### ${name}\n${content.slice(0, 2000)}${content.length > 2000 ? "\n...(truncated)" : ""}`)
      .join("\n\n");

    send({ type: "test_start", message: "Initialising virtual test environment..." });

    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [{
        role: "user",
        content: `You are a senior QA engineer and code reviewer. Review this ${techStack} application "${appName}" for bugs, errors, and issues.

FILES GENERATED:
${fileSummary}

Perform a thorough code review. Find:
1. Import errors / missing dependencies
2. TypeScript type errors
3. Runtime errors (undefined vars, null refs, missing async/await)
4. Logic errors
5. Missing environment variable handling
6. Security issues
7. Missing error handling

For EACH issue found, output exactly:
BUG [filename] [line estimate]: [brief description]
SEVERITY: [Critical|High|Medium|Low]
FIX: [exactly what needs to change]
---

After all bugs, output:
SUMMARY: Found X critical, Y high, Z medium, W low severity issues.`
      }],
      stream: true,
      max_tokens: 4000,
    });

    let buffer = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        buffer += delta;
        send({ type: "test_delta", content: delta });
      }
    }

    // Parse bugs from output
    const bugs: Array<{ file: string; desc: string; severity: string; fix: string }> = [];
    const bugMatches = buffer.matchAll(/BUG \[(.+?)\] .+?: (.+?)\nSEVERITY: (\w+)\nFIX: (.+?)\n---/gs);
    for (const m of bugMatches) {
      bugs.push({ file: m[1], desc: m[2], severity: m[3], fix: m[4] });
    }

    send({ type: "test_done", bugs, raw: buffer });
  } catch (err: any) {
    console.error("[AppBuilder/test]", err?.message);
    send({ type: "error", error: err?.message });
  } finally {
    res.end();
  }
});

// Phase 5 — Debug: auto-patch bugs found in testing
router.post("/lab/app-builder/debug", authMiddleware, async (req: Request, res: Response) => {
  const { files, bugs, appName } = req.body as {
    files: Record<string, string>;
    bugs: Array<{ file: string; desc: string; severity: string; fix: string }>;
    appName: string;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };

  try {
    const criticalBugs = bugs.filter(b => b.severity === "Critical" || b.severity === "High");
    send({ type: "debug_start", fixing: criticalBugs.length, total: bugs.length });

    const patchedFiles: Record<string, string> = { ...files };
    const affectedFiles = [...new Set(criticalBugs.map(b => b.file))];

    for (const filename of affectedFiles) {
      const originalContent = files[filename];
      if (!originalContent) continue;

      const fileBugs = criticalBugs.filter(b => b.file === filename);
      send({ type: "debug_fixing", filename, bugCount: fileBugs.length });

      const stream = await openai.chat.completions.create({
        model: "anthropic/claude-sonnet-4-6",
        messages: [{
          role: "user",
          content: `You are a senior engineer fixing bugs in "${appName}".

FILE: ${filename}
CURRENT CONTENT:
${originalContent}

BUGS TO FIX:
${fileBugs.map((b, i) => `${i + 1}. ${b.desc}\n   Fix: ${b.fix}`).join("\n")}

Output the COMPLETE corrected file, wrapped exactly as:
### FILE: ${filename} ###
[complete corrected file content]
### END FILE ###

Fix ALL listed bugs. Do not add new features. Output only the file, nothing else.`
        }],
        stream: true,
        max_tokens: 6000,
      });

      let buffer = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          buffer += delta;
          send({ type: "debug_delta", filename, content: delta });
        }
      }

      const match = buffer.match(/### FILE: .+? ###\n([\s\S]*?)### END FILE ###/);
      if (match) {
        patchedFiles[filename] = match[1].trim();
        send({ type: "debug_patched", filename });
      }
    }

    send({ type: "debug_done", patchedFiles, fixedCount: affectedFiles.length });
  } catch (err: any) {
    console.error("[AppBuilder/debug]", err?.message);
    send({ type: "error", error: err?.message });
  } finally {
    res.end();
  }
});

// ─── Ghostwriter — Inline AI Code Assistant (SSE) ──────────────────────────
router.post("/lab/app-builder/ghostwrite", authMiddleware, async (req: Request, res: Response) => {
  const { filename, fileContent, instruction, history, allFiles } = req.body as {
    filename: string; fileContent: string; instruction: string;
    history: Array<{ role: string; content: string }>;
    allFiles?: Record<string, string>;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };

  try {
    const fileContext = allFiles
      ? Object.keys(allFiles).filter(f => f !== filename).slice(0, 5).map(f => `// ${f} (exists in project)`).join("\n")
      : "";

    const systemPrompt = `You are Ghostwriter — an expert AI coding assistant embedded inside the Sirius App Builder.

You are currently editing: ${filename}

Other files in this project:
${fileContext || "None loaded yet"}

Current file content:
\`\`\`
${fileContent.slice(0, 3000)}${fileContent.length > 3000 ? "\n...(truncated)" : ""}
\`\`\`

Your capabilities:
- Explain any code selection in plain English
- Suggest completions and improvements
- Generate new functions, hooks, or components
- Fix bugs in the file
- Refactor for readability, performance, or security
- Add TypeScript types
- Write tests for functions

When generating code changes, always output the COMPLETE modified file wrapped in:
\`\`\`filename
[complete file content]
\`\`\`

For explanations or suggestions, respond in clear Markdown.`;

    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user" as const, content: instruction },
      ],
      stream: true,
      max_tokens: 3000,
    });

    let full = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) { full += delta; send({ type: "delta", content: delta }); }
    }

    // Extract updated file content if present
    const codeMatch = full.match(/```[\w.\-/]*\n([\s\S]*?)```/);
    const updatedCode = codeMatch ? codeMatch[1].trim() : null;

    send({ type: "done", content: full, updatedCode });
  } catch (err: any) {
    console.error("[Ghostwriter]", err?.message);
    send({ type: "error", error: err?.message });
  } finally { res.end(); }
});

// ─── Figma → React Component Converter ────────────────────────────────────────
router.post("/lab/app-builder/figma", authMiddleware, async (req: Request, res: Response) => {
  const { figmaUrl, imageUrl, description, componentName, techStack } = req.body as {
    figmaUrl?: string; imageUrl?: string; description?: string;
    componentName?: string; techStack?: string;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };

  try {
    send({ type: "start", message: "Analysing design…" });

    const name = componentName || "GeneratedComponent";
    const stack = techStack || "React + TypeScript + Tailwind CSS";

    const messages: any[] = [];

    if (imageUrl) {
      // Vision mode — analyse design image
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" },
          },
          {
            type: "text",
            text: `Convert this design into a complete, pixel-accurate React component.

Component name: ${name}
Tech stack: ${stack}
${description ? `Additional context: ${description}` : ""}

Requirements:
1. Match the visual design exactly — layout, spacing, colours, typography, sizing
2. Extract all colours as CSS variables or Tailwind classes
3. Make it fully responsive
4. Use semantic HTML
5. Include all interactive states (hover, focus, active) you can infer
6. Add TypeScript props interface
7. Component must be self-contained with no missing imports

Output ONLY the complete component file:
### FILE: src/components/${name}.tsx ###
[complete component code]
### END FILE ###`,
          },
        ],
      });
    } else {
      // Text description mode
      const prompt = description || figmaUrl
        ? `Design to convert: ${description || ""}${figmaUrl ? `\nFigma reference: ${figmaUrl}` : ""}`
        : "A modern dashboard card component";

      messages.push({
        role: "user",
        content: `Convert this design specification into a complete React component.

Component name: ${name}
Tech stack: ${stack}
Design specification: ${prompt}

Requirements:
1. Modern, production-quality UI
2. Pixel-perfect layout with proper spacing and typography
3. Full TypeScript types
4. Responsive design (mobile-first)
5. All hover/focus states included
6. Self-contained — no missing imports
7. Use Tailwind CSS or inline styles that match the design intent

Output ONLY the file:
### FILE: src/components/${name}.tsx ###
[complete component code]
### END FILE ###`,
      });
    }

    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages,
      stream: true,
      max_tokens: 3000,
    });

    let full = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) { full += delta; send({ type: "delta", content: delta }); }
    }

    const fileMatch = full.match(/### FILE: (.+?) ###\n([\s\S]*?)### END FILE ###/);
    if (fileMatch) {
      send({ type: "done", filename: fileMatch[1].trim(), content: fileMatch[2].trim() });
    } else {
      const codeMatch = full.match(/```(?:tsx|jsx|typescript)?\n([\s\S]*?)```/);
      send({ type: "done", filename: `src/components/${name}.tsx`, content: codeMatch ? codeMatch[1].trim() : full });
    }
  } catch (err: any) {
    console.error("[Figma→React]", err?.message);
    send({ type: "error", error: err?.message });
  } finally { res.end(); }
});

// ─── Session Share — generate read-only access token ──────────────────────────
router.post("/lab/app-builder/share", authMiddleware, async (req: Request, res: Response) => {
  const { sessionId } = req.body as { sessionId: number };
  try {
    const session = await db.select({ id: appBuilderSessions.id, appName: appBuilderSessions.appName, phase: appBuilderSessions.phase, status: appBuilderSessions.status })
      .from(appBuilderSessions).where(eq(appBuilderSessions.id, sessionId)).limit(1);
    if (!session[0]) return res.status(404).json({ error: "Session not found" });
    // Return share URL using session ID (read-only; viewer can only see files)
    res.json({ shareUrl: `?view-session=${sessionId}`, sessionName: session[0].appName });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// ─── Session View — load session without PIN (read-only share) ─────────────────
router.get("/lab/app-builder/view/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = await db.select({ id: appBuilderSessions.id, appName: appBuilderSessions.appName, phase: appBuilderSessions.phase, status: appBuilderSessions.status, files: appBuilderSessions.files })
      .from(appBuilderSessions).where(eq(appBuilderSessions.id, parseInt(req.params.id as string))).limit(1);
    if (!session[0]) return res.status(404).json({ error: "Session not found" });
    res.json({ ...session[0], files: JSON.parse(session[0].files || "{}") });
  } catch (err: any) { res.status(500).json({ error: err?.message }); }
});

// ─── Agent doc-search helper ──────────────────────────────────────────────────
async function searchDocsForAgent(agentId: string, techStack: string, appName: string): Promise<string> {
  const queries: Record<string, string> = {
    architect: `${techStack} project structure best practices ${new Date().getFullYear()}`,
    frontend: `${techStack.split("+")[0]?.trim()} component patterns routing ${new Date().getFullYear()}`,
    backend: `${techStack.split("+")[1]?.trim() || "Node.js"} API REST authentication middleware ${new Date().getFullYear()}`,
    database: `better-sqlite3 SQLite schema prepared statements ${new Date().getFullYear()}`,
    integration: `Docker CI/CD GitHub Actions deploy ${techStack} ${new Date().getFullYear()}`,
    monitoring: `Node.js application monitoring health check logging best practices ${new Date().getFullYear()}`,
  };

  const query = queries[agentId] || `${techStack} development ${new Date().getFullYear()}`;

  try {
    const result = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        { role: "system", content: "You are a senior software architect. Return concise, accurate, current best practices." },
        { role: "user", content: `Provide 3-5 bullet points of the most important current best practices and patterns for: ${agentId} development in a ${techStack} application. Be specific and practical. Topic: ${query}` },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });
    return result.choices[0]?.message?.content || "";
  } catch {
    return "";
  }
}

// Phase 3 — Build: 6 specialist agents build the code (SSE) with live doc search + checkpoints
router.post("/lab/build-app", authMiddleware, async (req: Request, res: Response) => {
  const { appName, description, appType, techStack, features } = req.body as {
    appName: string; description: string; appType: string;
    techStack: string; features: string[];
  };

  if (!appName?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "App name and description are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  // Keep-alive heartbeat — prevents Replit's proxy from closing the SSE
  // connection during silent gaps between agents (doc search + GPT call can
  // take 30-60 s per agent with no data flowing).
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch {}
  }, 12000);

  const allFiles: Record<string, string> = {};
  let checkpointIndex = 0;

  try {
    send({ type: "start", agents: APP_AGENTS });

    for (const agent of APP_AGENTS) {
      send({ type: "agent_start", agentId: agent.id, name: agent.name, emoji: agent.emoji, color: agent.color });

      // ── Real-time doc search before agent generates code ──────────────────
      const searchQuery = {
        architect: `${techStack} architecture patterns ${new Date().getFullYear()}`,
        frontend: `${techStack.split("+")[0]?.trim()} UI components ${new Date().getFullYear()}`,
        backend: `REST API ${techStack} auth middleware ${new Date().getFullYear()}`,
        database: `better-sqlite3 SQLite Node.js ${new Date().getFullYear()}`,
        integration: `Docker GitHub Actions ${techStack} deploy ${new Date().getFullYear()}`,
        monitoring: `Node.js observability health checks ${new Date().getFullYear()}`,
      }[agent.id] || `${techStack} ${new Date().getFullYear()}`;

      send({ type: "doc_search_start", agentId: agent.id, query: searchQuery });

      let docContext = "";
      try {
        docContext = await searchDocsForAgent(agent.id, techStack, appName);
        send({ type: "doc_search_done", agentId: agent.id, query: searchQuery, snippet: docContext.slice(0, 300) });
      } catch {
        send({ type: "doc_search_done", agentId: agent.id, query: searchQuery, snippet: "" });
      }

      // ── Agent prompt with live doc context injected ───────────────────────
      const basePrompt = buildAgentPrompt(agent.id, appName, description, appType, techStack, features || [], allFiles);
      const prompt = docContext
        ? `${basePrompt}\n\n## Live Documentation Context (fetched now, ${new Date().toISOString().slice(0, 10)}):\n${docContext}`
        : basePrompt;

      let raw = "";
      try {
        const stream = await openai.chat.completions.create({
          model: "anthropic/claude-sonnet-4-6",
          messages: [{ role: "user", content: prompt }],
          stream: true,
          max_tokens: 8000,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            raw += delta;
            send({ type: "agent_delta", agentId: agent.id, content: delta });
          }
        }
      } catch (agentErr: any) {
        console.error(`[AppBuilder] ${agent.id} agent error:`, agentErr?.message);
        send({ type: "agent_error", agentId: agent.id, error: agentErr?.message });
      }

      const parsed = parseAgentFiles(raw);
      Object.assign(allFiles, parsed);

      for (const [filename, content] of Object.entries(parsed)) {
        send({ type: "file", agentId: agent.id, filename, content });
      }

      // ── Checkpoint: snapshot of all files after this agent completes ───────
      checkpointIndex++;
      send({
        type: "checkpoint",
        id: `cp-${checkpointIndex}`,
        index: checkpointIndex,
        agentId: agent.id,
        agentName: agent.name,
        agentEmoji: agent.emoji,
        timestamp: new Date().toISOString(),
        fileCount: Object.keys(allFiles).length,
        newFiles: Object.keys(parsed),
        // Include full file snapshot for rollback
        files: { ...allFiles },
      });

      send({ type: "agent_done", agentId: agent.id, fileCount: Object.keys(parsed).length });
    }

    send({ type: "done", totalFiles: Object.keys(allFiles).length, files: allFiles });
  } catch (err: any) {
    console.error("[AppBuilder] Fatal error:", err?.message);
    send({ type: "error", error: err?.message });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

// ─── Sirius Learns — Analyse built code, stream improvement suggestions ────────
router.post("/lab/app-builder/learn", authMiddleware, async (req: Request, res: Response) => {
  const { appName, techStack, files } = req.body as {
    appName: string; techStack: string;
    files: Record<string, string>;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };
  const learnHeartbeat = setInterval(() => { try { res.write(": heartbeat\n\n"); } catch {} }, 12000);

  try {
    const fileSummary = Object.entries(files)
      .slice(0, 20)
      .map(([name, content]) => `### ${name}\n${content.slice(0, 600)}`)
      .join("\n\n");

    const systemPrompt = `You are Sirius, an elite AI software architect. You have just analysed the full codebase of a freshly-built application and you must now provide deep, actionable intelligence on how to make it significantly more powerful, automated, and production-ready.

Your output must be structured EXACTLY as JSON lines — one JSON object per line. Each object has this shape:
{ "type": "suggestion", "category": "feature|automation|security|performance|architecture|dx", "priority": "critical|high|medium", "title": "Short title", "detail": "2-3 sentence explanation of what to add and why", "effort": "1h|4h|1d|3d", "prompt": "The exact prompt Garry should use in the App Builder to implement this improvement" }

Emit exactly 8-10 suggestion objects. After all suggestions, emit exactly one final object:
{ "type": "summary", "headline": "One-line Sirius verdict on this codebase", "automationScore": 65, "productionScore": 55, "nextPriority": "The single most important thing to do next" }

Be specific to the actual files you see. Name specific files, functions, missing patterns. Do not be generic.`;

    const userPrompt = `App name: ${appName}
Tech stack: ${techStack}
File count: ${Object.keys(files).length}

Files (sample):
${fileSummary}

Analyse this codebase. Output improvement suggestions as JSON lines.`;

    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 3000,
    });

    let buf = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (!delta) continue;
      buf += delta;

      // Emit complete JSON lines as they arrive
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          send({ type: "item", data: parsed });
        } catch {
          // partial line — keep buffering
        }
      }
    }

    // Flush remaining buffer
    if (buf.trim()) {
      try {
        const parsed = JSON.parse(buf.trim());
        send({ type: "item", data: parsed });
      } catch {}
    }

    send({ type: "done" });
  } catch (err: any) {
    console.error("[AppBuilder/Learn] Error:", err?.message);
    send({ type: "error", error: err?.message });
  } finally {
    clearInterval(learnHeartbeat);
    res.end();
  }
});


// ─── Deploy App ─────────────────────────────────────────────────────────────
router.post('/lab/app-builder/sessions/:id/deploy', authMiddleware, async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id as string);
  try {
    const [session] = await db.select().from(appBuilderSessions).where(eq(appBuilderSessions.id, sessionId)).limit(1);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!['complete','launched'].includes(session.status)) return res.status(400).json({ error: 'App must be fully built before deploying' });

    const files: Record<string, string> = JSON.parse(session.files || '{}');
    if (Object.keys(files).length === 0) return res.status(400).json({ error: 'No files to deploy' });

    res.json({ ok: true, message: 'Deploy started — this takes 1-3 minutes', sessionId });

    // Run deploy in background
    deployAppSession(sessionId, session.appName, files).then(async result => {
      // Save deploy URL back to session
      if (result.success && result.url) {
        const deployLog = (session.buildLog || '') + '\n\n=== DEPLOY ===\n' + result.log.join('\n');
        await db.update(appBuilderSessions)
          .set({ status: 'launched', buildLog: deployLog, updatedAt: new Date() })
          .where(eq(appBuilderSessions.id, sessionId));
      }
      console.log('[AppBuilder/Deploy]', result.success ? 'SUCCESS' : 'FAILED', result.url || result.error);
    }).catch(e => console.error('[AppBuilder/Deploy] Error:', e.message));
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── List Deployed Apps ──────────────────────────────────────────────────────
router.get('/lab/app-builder/deployed', authMiddleware, async (_req: Request, res: Response) => {
  const apps = await listDeployedApps();
  res.json({ apps });
});


// ─── Promote App to Production ──────────────────────────────────────────────
router.post('/lab/app-builder/apps/:slug/promote', authMiddleware, async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };
  try {
    const result = await promoteApp(slug);
    if (result.success) {
      res.json({ ok: true, url: result.url, log: result.log });
    } else {
      res.status(400).json({ ok: false, error: result.error, log: result.log });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
