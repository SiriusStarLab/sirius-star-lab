# Workspace

## Overview
This pnpm workspace monorepo, built with TypeScript, serves as the foundation for an AI partnership platform named Sirius Star Lab, and a CRM for personal trainers called FitStack CRM.

Sirius Star Lab aims to be a cosmic intelligence partner, guiding users through a deep cosmic perspective. It offers advanced AI capabilities for R&D, project management, technical document analysis, automated funding analysis, and an autonomous lab for identifying new opportunities. The platform emphasizes a partnership-first design, where the AI acts as an equal intelligence partner.

FitStack CRM is a subscription-based customer relationship management solution for UK personal trainers, offering a marketing landing page and Stripe integration for subscription management.

The project's ambition is to create sophisticated AI-driven tools for innovation, research, and business development, alongside a focused CRM product.

## User Preferences
I want to work iteratively.
I prefer to be asked before major changes are made to the codebase.
I prefer detailed explanations for complex architectural decisions.
I prefer to use simple language.
I like functional programming.
Do not make changes to the folder `lib/api-spec`.
Changes to `artifacts/ai-chat/src/pages/star-lab.tsx` are permitted — Garry explicitly approved this. The previous restriction is lifted.
**Avoid OpenAI, OpenRouter, and Replit dependencies wherever possible.** Use them only as a last resort. Prefer self-hosted, open-source, or alternative solutions (e.g. Piper for TTS, local models, direct APIs) over routing through these platforms.

## ★ SERVER SECURITY PROTOCOL (NON-NEGOTIABLE) ★

**4-layer security protocol. All four rules apply in every session, automatically.**

### Layer 1 — Agent Approval Gate (MANDATORY)
**ALWAYS ask Garry for explicit confirmation before executing any of these on the server:**
- `ssh` commands that modify files, restart services, or delete anything
- `scp` / file transfers to the server
- `rm`, `rm -rf` on server paths
- `pm2 restart`, `pm2 reload`, `pm2 delete`, `pm2 stop`
- Any command that writes to `/opt/sirius/`, `/opt/sirius-source/`, or `/opt/sirius-apps/`

**Exceptions (safe to run without asking):** read-only commands (`ssh ... cat`, `ssh ... ls`, `ssh ... grep`, `curl` health checks, diagnostic reads).

### Layer 2 — Deploy Script Only
- **No code goes to Kamatera via ad-hoc file copy.** All API deploys go through `/opt/sirius/scripts/deploy-bundle.sh`.
- **No ad-hoc `pm2 restart`** — only via the deploy script or explicit Garry approval.
- Frontend deploys: build on server from `/opt/sirius-source/artifacts/ai-chat/`, copy to `/opt/sirius/frontend/`, then run `/opt/sirius/scripts/lock-frontend.sh`.

### Layer 3 — Pre-Flight Checks (built into deploy-bundle.sh v2)
Deploy script now enforces before any live file is touched:
1. `tsc --noEmit` — TypeScript must be clean
2. Route file sync check — all required source files must exist on server
3. Health check post-deploy — rolls back automatically if `/api/health` ≠ 200
4. Hash verification — SHA-256 of deployed bundle must match expected

### Layer 4 — Git Gate (in progress — see task #7)
Target state: no direct SCP. All changes committed to GitHub, server pulls only from approved branches.
Until task #7 is done: SCP is permitted but requires Layer 1 approval first.

---

## ★ PRIME DIRECTIVE — KAMATERA DEPLOYMENT (NON-NEGOTIABLE, HARDWIRED PROTOCOL) ★

**ALL production traffic for Sirius Star Lab runs on the Kamatera VPS at 185.247.118.196, NOT Replit.**
Garry has repeatedly, explicitly, and forcefully required this. It is a standing rule for
every session on this project, not something to be re-confirmed each time.

**Hard rules:**
1. **No fix or change is "done" until it is deployed to Kamatera and verified live on `https://sirius-ai.live`.**
   Do not tell Garry a fix is complete, and do not ask him to verify something, until after deployment.
2. **Never tell Garry to "republish" or "deploy" on Replit as if that affects production — it does not.**
   Replit is only the dev/build workspace here.
3. **This applies to every code change session automatically** — treat deploy-to-server as implicit in
   every task, the same as running a build or a test. Do not wait to be asked.
4. Full detail and current working deploy mechanics (SSH/SCP commands, paths, sed-patch procedure for
   surgical fixes, env var gotchas) live in `.agents/memory/deploy-protocol.md` and
   `.agents/memory/kamatera-deploy-path.md` — always re-check these at the start of any Sirius task, since
   the exact commands can shift over time (e.g. the old `install.sh?token=` pull mechanism was superseded by
   direct SCP + PM2 reload in later sessions — verify which mechanism is actually in place on the server
   before assuming either one, since the server can self-modify its own deploy tooling too).

**Reference facts (verify these are still accurate before relying on them — server can drift):**
- SSH key: `/home/runner/workspace/.local/sirius_deploy.key`, server: `root@185.247.118.196` port `2222`
- PM2 process: `sirius-api` — app root: `/opt/sirius/`
- Production URL: `https://sirius-ai.live`
- **PM2 env vars:** `pm2 restart` alone does NOT reload `/opt/sirius/.env`. Use `pm2 reload sirius-api --update-env`, or `set -a && source /opt/sirius/.env && set +a && pm2 restart sirius-api --update-env`.
- **Object storage on Kamatera:** `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS` must be in `/opt/sirius/.env` — they are Replit secrets and are NOT auto-synced.
- **Server code can self-modify and drift from this Replit repo** (Sirius has a self-modification system). Before assuming this repo matches production, diff the relevant server files first.

## ★ NEW DIMENSIONS — CAD INTEGRATION (REMEMBER THIS) ★

Star Lab is wired to **New Dimensions**, a separate CAD SaaS at `https://new-dimension-cad.replit.app`.

**How the flow works:**
1. Star Lab sends a project's specs + drawing notes to New Dimensions via `POST /api/lab/projects/:id/send-to-cad`
2. This creates a project in New Dimensions and a `cad_jobs` record in Star Lab with status "pending"
3. When the drawing is done in New Dimensions, it calls back to Star Lab at `POST /api/lab/cad-callback`
4. Star Lab downloads the file, stores it in object storage, attaches it to the project
5. The `NewDimensionsCadButton` component in the project view (`index.tsx` line ~1495) shows status and links

**Key facts:**
- New Dimensions URL: `https://new-dimension-cad.replit.app`
- `NEWDIMENSIONS_API_KEY` secret — NOT YET SET (missing secret — needed for auth)
- `NEWDIMENSIONS_BASE_URL` env var — not set, defaults to the URL above
- Integration code: `artifacts/api-server/src/routes/lab.ts` around line 2905
- UI button: `NewDimensionsCadButton` in `artifacts/ai-chat/src/pages/star-lab/index.tsx`
- `cad_jobs` table tracks dispatch status; `cad_url` on `lab_projects` stores the ND project link
- "CAD drawing completed" from Sirius = drawing *notes text* was generated, NOT a real CAD file sent to ND
- When user asks about a CAD drawing — check `cad_jobs` table and `https://new-dimension-cad.replit.app/api/projects` first

**Auto-generation (BUILT AND WORKING as of 2026-05-24):**
- `artifacts/api-server/src/lib/cad-auto-gen.ts` — shared auto-gen function
- When `send-to-cad` is triggered → GPT-4o generates SVG engineering drawing → uploaded to object storage → POSTed to ND `/api/projects/:ndId/drawings` → imported into `cad_files` → `cad_jobs` marked complete → project → "launch-ready"
- Also fires from the pipeline's `autoSendToCad` in `project-pipeline.ts`
- Admin trigger (no lab PIN needed): `POST /api/deploy/trigger-cad?token=$DEPLOY_TOKEN&projectId=NNN&ndProjectId=NNN`

**Known project mapping (update as more are sent):**
- Star Lab project #2117 → New Dimensions project #4 ("High-Precision Downhole Control Valve Actuator Rings") — drawing generated and stored ✅

## How to Approach Every Change (Non-Negotiable)

Before making any change:
1. **Map the blast radius first.** Identify every file, route, component, or feature that could be affected by the change — not just the thing being changed. If touching a shared file (App.tsx, security.ts, a Zod schema, a shared hook), list everything that uses it.
2. **Think through side effects out loud.** Ask: "If I change X, what breaks?" before writing a single line.
3. **Make the change minimally.** Do only what is needed. Do not change syntax, style, or structure unless directly required.

After making any change:
4. **Test as a real user would** — not by reading code, but by actually using the app. Click every button and route that could have been affected, not just the one that was changed.
5. **Check adjacent features.** If you changed routing, check all routes. If you changed a shared schema, check all endpoints using it. If you changed a shared component, check every page that renders it.
6. **Do not tell the user something works unless you have verified it behaves correctly end-to-end.**

## System Architecture
The project is a pnpm workspace monorepo using Node.js 24 and TypeScript 5.9.

**Core Technologies:**
- **Monorepo Tool:** pnpm workspaces
- **API Framework:** Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod (`zod/v4`) and `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build Tool:** esbuild (CJS bundle)
- **Frontend:** React + Vite (for `ai-chat` and `fitstack-crm`)
- **AI Integration:** OpenAI's `gpt-4o` (Responses API for web search, chat completions as fallback).

**Architectural Patterns:**
- **Modular Monorepo:** Organized into `artifacts/` (deployable applications), `lib/` (shared libraries), and `scripts/` (utility scripts).
- **Database-driven Persistence:** All project data, messages, user profiles, and reports are stored in PostgreSQL using Drizzle ORM.
- **Code Generation:** OpenAPI specification (`openapi.yaml`) is used with Orval to generate React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`), ensuring type safety and consistency between frontend and backend.
- **TypeScript Composite Projects:** Each package uses `composite: true` in its `tsconfig.json` and the root `tsconfig.json` manages project references, ensuring correct type-checking across the monorepo.
- **API Design:** RESTful API with routes defined in `artifacts/api-server/src/routes/` and validated using Zod schemas.

**UI/UX Decisions (Sirius Star Lab):**
- **Partnership-first Design:** AI is presented as an equal intelligence partner.
- **Personalization:** Mood check-ins, daily wisdom cards, customizable AI names and personalities, persistent memory.
- **Thematic Design:** Cosmic intelligence, stardust, grand arc of time motifs.
- **Interactive Elements:** Sidebars for navigation, tutorials (Sirius Guide), settings, and real-time status updates (e.g., Live Pipeline Widget, System Audit Panel).
- **Accessibility:** Voice input compatibility for certain features.

**Feature Specifications (Sirius Star Lab):**
- **Sirius Star Lab:** A private R&D platform with multi-project workspaces, PIN-gated access (owner/guest), engineering-focused AI, opportunity scouting, and CAD file storage (DWG, DXF, STEP, IGES, STL, OBJ, F3D).
- **Technical Documents:** Upload and AI-powered analysis of technical documents (drawings, spec sheets, datasheets, photos, concept sketches) using GPT-4o vision for material recommendations, compliance checks, and data extraction.
- **Auto Funding Analysis:** Automated R&D tax credit and grant analysis across 20+ countries, with results displayed in-app and notification system.
- **Autonomous Lab:** Daily scans for social media/marketing bot opportunities and precision engineering products, auto-creating projects for approval. Includes a live pipeline widget for build status.
- **System Audit Panel:** Real-time platform health dashboard with checks across infrastructure, data, intelligence, and compliance.
- **Sirius Tool Extensions:** Integrated tools like `run_investment_rule`, `run_funding_analysis`, and `run_platform_audit`.
- **Outreach Hub:** AI-personalized outreach campaign generation with bulk recipient handling and SMTP sending.
- **Sirius Brain:** Persistent business memory with user profiles, facts, goals, and AI actions (deep_profile, scan_for_me, pitch_strategy, revenue_map).
- **Deep Research:** Multi-step web research with structured reports and sources using OpenAI's `web_search_preview` tool.
- **Extreme Environment Materials Intelligence:** Advanced material generator with expert knowledge in various high-performance material categories.
- **Concept-to-Product Flow:** Automated chaining of research, brief writing, spec generation, material selection, manufacturing workflows, business case, and visual rendering from a concept.
- **Document Intelligence:** Upload and AI-powered Q&A for PDFs, TXT, CSV, Markdown, JSON files.

**UI/UX Decisions (FitStack CRM):**
- **Marketing Landing Page:** Features hero section, product features, pricing, testimonials, FAQ, and footer.
- **Stripe Integration:** For subscription checkout and payment verification.

## External Dependencies
- **PostgreSQL:** Primary database for all application data.
- **OpenAI API:**
    - `gpt-4o`: Used for general chat completions, memory extraction, technical document analysis, deep research, and various AI actions.
    - Responses API `web_search_preview`: For real-time web search capabilities.
- **Stripe:** For processing subscriptions and payments within FitStack CRM.
- **Spotify API:** For "Now Playing" widget functionality (requires OAuth connector `conn_spotify_01KKW2ZR1Q51QT871RHEDRVYPP`).
- **Google Cloud Storage (GCS):** For storing CAD files.
- **SMTP Service:** For sending personalized outreach emails (configured via environment variables or inline).
- **`pdf-parse`:** For extracting text from PDF documents in the Document Intelligence feature.