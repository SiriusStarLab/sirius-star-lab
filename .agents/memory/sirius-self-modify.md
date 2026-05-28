---
name: Sirius Self-Modification System
description: How Sirius's autonomous code-change pipeline works — review gate, protected files, deploy flow, and tool names
---

## The Pipeline

propose_code_change tool → AI review (GPT-4o-mini, separate model) → TypeScript check → build → backup dist → copy to prod → PM2 reload after 3s delay

**Why separate model:** Generator uses Claude; reviewer uses GPT-4o-mini. Different training = different blind spots = better coverage.

## Protected Files (hard-blocked, never modify autonomously)
- src/app.ts
- src/middlewares/security.ts
- src/lib/lab-auth.ts
- build.ts
- src/index.ts
- src/routes/index.ts

## Key Paths (server)
- Source: /opt/sirius-source/artifacts/api-server/
- Prod dist: /opt/sirius/artifacts/api-server/dist/index.cjs
- Backups: /opt/sirius-backups/index-{timestamp}.cjs
- Build dist: /opt/sirius-source/artifacts/api-server/dist/index.cjs

## Tools in Star Lab (PROJECT_CHAT_TOOLS)
- read_source_file — reads from /opt/sirius-source
- execute_code — Docker sandbox (node:22-alpine / python:3.12-alpine), no network, 128MB, 20s timeout
- propose_code_change — full review+deploy pipeline

## Critical: Use fetch, not openai npm package
The api-server does NOT have `openai` in package.json. Use native fetch for OpenRouter calls everywhere. Build will fail with "Could not resolve openai" otherwise.

## Self-Modify Routes
Mounted at /lab/self/* behind authMiddleware:
- POST /lab/self/read-file
- GET  /lab/self/list-files
- POST /lab/self/execute
- POST /lab/self/propose
- POST /lab/self/rollback

## Deploy Lock
`deployLock` boolean in self-deploy.ts prevents concurrent deploys. Released in finally block.
