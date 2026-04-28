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