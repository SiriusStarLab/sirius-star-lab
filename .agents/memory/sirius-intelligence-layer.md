---
name: Sirius Intelligence Layer
description: Architecture of the sirius-intelligence Docker service, deployment pattern, and integration decisions
---

# Sirius Intelligence Layer

## Architecture Decision
Built a dedicated `sirius-intelligence` service (port 3001) running as a Docker container on Kamatera, separate from `sirius-api` (PM2, port 4000). Redis runs as a Docker container (port 6379, bound to 127.0.0.1).

**Why:** Clean separation — intelligence layer handles memory, context, briefings, proactive analysis independently from the main API. New capabilities don't pollute the existing 8,676-line lab.ts.

## Server Details
- Kamatera: 185.247.118.196:2222, AlmaLinux 9.7, Node.js 22.22.3
- sirius-api: PM2, port 4000, `/opt/sirius/artifacts/api-server/dist/index.cjs`
- sirius-intelligence: Docker `--network host`, port 3001, `/opt/sirius-docker/intelligence/`
- sirius-redis: Docker `sirius-net`, port 6379 (127.0.0.1 only)
- PostgreSQL: host, port 5432, user=sirius, db=siriusdb
- Docker daemon: enabled on boot (`systemctl enable docker`)

## Deploy Pattern for sirius-intelligence
1. Build: `pnpm --filter @workspace/sirius-intelligence run build`
2. SCP: `artifacts/sirius-intelligence/dist/index.cjs` → `/opt/sirius-docker/intelligence/index.cjs`
3. Rebuild image: `docker build -t sirius-intelligence:latest .`
4. Restart: `docker rm -f sirius-intelligence && docker run -d --name sirius-intelligence --network host ...`
5. Dockerfile: `COPY index.cjs ./index.cjs` (NOT `dist/index.cjs` — file is copied flat)

## Database Tables Added
- `sirius_context` — unified context snapshots per user/source
- `sirius_memory` — structured memory (type, key, value, confidence, observation_count)
- `sirius_briefings` — daily briefing per user (UNIQUE user_id + briefing_date)
- `sirius_events` — event log

## Garry's UserId
Garry's user_id in user_profiles is `"garry"` (literal string, not a UUID).
Star Lab context syncs use `"garry"` as the fixed userId (Star Lab is Garry-only).

## Intelligence Client in sirius-api
`artifacts/api-server/src/lib/intelligence-client.ts` — fire-and-forget HTTP client.
All calls use `AbortSignal.timeout(3000)` and `.catch(() => {})` — never blocks the main request.

## Context Sync Hooks Added
- `routes/openai/index.ts:1146` — syncs chat → intelligence after each assistant response
- `routes/lab.ts:947` — syncs star_lab → intelligence after each lab assistant response

## Proxy Routes (in sirius-api)
`routes/intelligence-proxy.ts` registered in `routes/index.ts`.
Exposes: `/api/intelligence/briefing/:userId`, `/api/intelligence/insights/:userId`, `/api/intelligence/context/:userId`, `/api/intelligence/health`

## Morning Briefing
- Cron: `30 7 * * *` → `curl -X POST http://127.0.0.1:3001/briefing/garry/generate`
- Log: `/var/log/sirius-briefing.log`
- GET endpoint caches today's briefing; POST /generate forces fresh generation

## How to Apply
- Adding new intelligence features: add routes to `artifacts/sirius-intelligence/src/routes/`
- Exposing them to frontend: add proxy route to `artifacts/api-server/src/routes/intelligence-proxy.ts`
- Never call intelligence service directly from frontend (internal only, port 3001)
