---
name: Sirius server build — missing files pattern
description: Files that exist in the Replit workspace but were never SCP'd to the server, causing build failures when new routes import them.
---

# Sirius Server Build — Missing Files Pattern

## Root cause
The Replit workspace is the editing environment. Files are only on the server if they were explicitly SCP'd there. Any new file added to the workspace must be manually transferred before the server can build.

## Files confirmed missing on server (now fixed)
- `src/routes/auth.ts` — email/password auth routes (signup, login, logout, me, reset)
- `src/routes/subscriber-lab.ts` — subscriber lab router
- `src/lib/sandbox-manager.ts` — required by subscriber-lab.ts
- `src/lib/telegram.ts` — required by app.ts (dynamic import)
- `src/worker.ts` — worker process (NOT needed on Kamatera; PM2 only runs index.cjs)

## `pg` package — must be alwaysExternal on server
`pg` was in the `allowlist` (bundled), but the server can't find it to bundle since it's installed as a native system package, not a pnpm package. Fix: add `"pg"` to `alwaysExternal` in `build.ts` on the server.

**Why:** `pg` is a native C++ addon. esbuild can't bundle native addons — it requires the package be installed where the process runs, not where it builds. `alwaysExternal` marks it as a runtime dependency.

## worker.ts — skip on server
`worker.ts` imports `siriusTasks` from the DB schema which doesn't exist on the Kamatera server. The worker is never started by PM2 anyway (only `index.cjs` runs). The server's `build.ts` has the worker build step commented out. **Never re-add it without fixing the schema first.**

## GET /health vs GET /healthz
The mobile app and uptime monitors call `/api/health`. The route only had `/healthz`. Fixed: added `GET /health` alias that returns `{"status":"ok"}` directly (no Zod parse).

**How to apply:** Any time a new workspace file is added that gets imported by existing server routes, SCP it before attempting a server build. Run `pnpm --filter @workspace/api-server build 2>&1 | grep ERROR` to surface missing file errors before deploying.
