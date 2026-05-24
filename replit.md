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

## ★ PRIME DIRECTIVE — KAMATERA DEPLOYMENT (NON-NEGOTIABLE) ★

**ALL production traffic runs on the Kamatera VPS at 185.247.118.196:2222, NOT Replit.**
**Never tell Garry to "republish on Replit" — that is not production.**
**After EVERY code change session, run the three commands below. No exceptions.**

```bash
# 1. Build API server
pnpm --filter @workspace/api-server run build

# 2. Build frontend (PORT and BASE_PATH are required by vite.config.ts)
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/ai-chat run build

# 3. Tell Kamatera to pull both builds and restart PM2
ssh -i /home/runner/workspace/.local/sirius_deploy.key -p 2222 -o StrictHostKeyChecking=no root@185.247.118.196 \
  "curl -sfL \"https://${REPLIT_DEV_DOMAIN}/api/deploy/install.sh?token=${DEPLOY_TOKEN}\" | bash"
```

**How it works:** The install.sh script (served by the running dev api-server) downloads the freshly built
`dist/index.cjs` and `dist/public/` from Replit, copies them into `/opt/sirius/`, and does `pm2 restart sirius-api`.

- SSH key: `/home/runner/workspace/.local/sirius_deploy.key`
- Server: `root@185.247.118.196` port `2222`
- PM2 process: `sirius-api` — app root: `/opt/sirius/`
- Production URL: `https://sirius-ai.live`
- Deploy token: `$DEPLOY_TOKEN` env secret
- **nginx root on Kamatera: `/opt/sirius/frontend/public`** — the vite build outputs into `dist/public/` and the tarball preserves that subfolder. If nginx ever shows 403, check this path first.

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