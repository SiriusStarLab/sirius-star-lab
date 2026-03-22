# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/ai-chat` — Sirius AI Partnership App
React + Vite frontend served at `/`. A full AI partnership platform — not a tool, not an assistant, a genuine partner:

**Sirius Star Lab** (private R&D, at `/star-lab`)
- PIN-gated (default PIN: 2025, changeable via STAR_LAB_PIN env var)
- Multi-project workspace: Brief, Research, Specs, Code, Drawings, Funding tabs per project
- Lab AI: engineering-focused, current tech only, web search, build-ready outputs
- Opportunity Scout: scans industries + social media for product/business opportunities
- CAD file storage per project: upload DWG, DXF, STEP, IGES, STL, OBJ, F3D files directly into Star Lab (stored in GCS object storage). Files are linked to the project and accessible from the Drawings tab.
- Drawing notes + CAD files split view in the Drawings tab
- **Auto Funding Analysis**: per-project R&D tax credits and grants evaluated automatically when Brief/Specs are saved. Covers 20+ countries: UK (RDEC, Innovate UK, DASA, EIS/SEIS), EU (Horizon Europe, EIC, Eurostars), USA (Section 41 R&D Credit, SBIR/STTR, ARPA-E), Canada (SR&ED, NRC IRAP), Australia (R&D Tax Incentive), Germany (ZIM, Forschungszulage), France (CIR/CII), Ireland, Israel (IIA), Singapore (EDG), Japan (NEDO), South Korea, India, UAE, Sweden, Denmark, Spain, Italy, Netherlands. Results stored in DB, displayed in per-project Funding tab. In-app toast notifications fire when analysis completes (polls every 30s). Sidebar badge pulses amber while any project is pending.
- Funding Radar: global manual scan across all projects (streaming, Funding Radar nav section)
- **Autonomous Lab** (`autolab` nav in Star Lab): Runs every 24h. Scans for 6 social media/marketing bot opportunities and 4 precision engineering products for Strategic Innovation Dundee Ltd (Dugard 38/26 sliding head lathes, Star slider, EDM wire cutters) targeting oil & gas, aerospace, medical, hydrogen. Each scan auto-creates projects with BRIEF + RESEARCH + BUSINESS_CASE, sets `approvalStatus: "pending"`. Sidebar Star Lab button shows orange pulsing badge with count when projects await approval (polls `/api/lab/notification-count` every 30s). Approval panel shows pending projects with expandable business case + Approve / Reject buttons. Approving navigates directly to the project workspace. DB: `approvalStatus` column on `lab_projects`, `lab_scan_history` table. Routes: `GET /api/lab/notification-count` (public), `GET /api/lab/projects/pending-approval`, `POST /api/lab/projects/:id/approve`, `POST /api/lab/projects/:id/reject`, `GET /api/lab/scan-history`, `POST /api/lab/auto-scan/trigger`, `GET /api/lab/auto-scan/status`.
- **Outreach Hub**: AI-personalised outreach campaigns — configure message type, tone, sender info, product; add recipients individually or via bulk paste (CSV); generates personalised messages per recipient via SSE stream; editable subject + body; copy all or send via SMTP. API routes: POST `/api/outreach/generate`, POST `/api/outreach/send`. SMTP config via env vars (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM, SMTP_FROM_NAME) or entered inline.

**Main site features**
- **Sirius Guide**: Tutorials panel accessible from sidebar ("Sirius Guide" button). Slide-in right drawer with categorised accordion sections: Getting Started, Intelligence Modes, Topic Hub, Voice Input, Image Analysis, Memory Portrait, Daily Wisdom, Plans, Star Lab. Fully self-contained in `src/components/tutorials-modal.tsx`.

- All projects persist independently in PostgreSQL (lab_projects, lab_messages, scout_reports tables)

**Core experience**
- Partnership-first design: the AI is an equal intelligence partner, not a tool
- Mood check-in on welcome screen (8 emotional states → personalised opener)
- Daily Wisdom card: rotating quotes from all world religions & philosophies
- Topic hub: Religion & Faith, Meditation, Philosophy, History, Health, Music, Mechanics, Just Talk
- Spotify "Now Playing" widget: shows current/recent tracks, lets you ask the AI about them
- Chat input: "Talk to me — I'm here..." / "You are not alone — I'm here for all of it"

**Personalisation & Memory**
- Each browser gets a UUID (`nexus_user_id` in localStorage)
- User profiles stored in `user_profiles` DB table (ai name, ai personality, memories)
- After each conversation turn, AI extracts key facts and saves them as memories
- Settings panel in sidebar: name your AI, shape its personality, see what it remembers
- AI name appears everywhere (welcome screen, sidebar header)

**AI Capabilities**
- Real-time web search via OpenAI Responses API `web_search_preview` tool
- Rich partnership system prompt: emotional intelligence, accessibility, no restrictions
- Covers: all religions/spirituality, meditation/mindfulness, philosophy, history, medicine, music, mechanics
- Fallback to `gpt-4o` chat completions if Responses API unavailable
- Memory extraction runs async after each message (non-blocking)

**Spotify Integration**
- Connected via Replit OAuth connector (`conn_spotify_01KKW2ZR1Q51QT871RHEDRVYPP`)
- Routes: `GET /api/openai/spotify/now-playing`, `/recently-played`, `/top-tracks`
- Spotify client: `artifacts/api-server/src/lib/spotify.ts`
- Widget gracefully hides when Spotify is not active or unavailable
- Note: Requires Spotify Premium + app registered in development mode on Spotify dashboard

### OpenAI Integration
Uses `@workspace/integrations-openai-ai-server` and `@workspace/integrations-openai-ai-react`.
API routes in `artifacts/api-server/src/routes/openai/index.ts`.
DB tables: `conversations`, `messages`, `user_profiles` (Drizzle + Postgres).
AI keys auto-provisioned via `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`.
Model used: `gpt-4o` (Responses API for web search, chat completions as fallback).

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
