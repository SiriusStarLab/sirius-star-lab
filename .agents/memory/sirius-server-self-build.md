---
name: Sirius server self-build pipeline
description: What was broken in the VPS self-build and the fixes applied so `pnpm --filter @workspace/api-server run build` works on the server.
---

# Server Self-Build Pipeline

## The problem (root causes)
The server has two source trees:
- `/opt/sirius-source/artifacts/api-server/src/` — where SCP deploys land
- `/opt/sirius/artifacts/api-server/src/` — where the build actually runs from

These diverged. The build tree was missing ~10 lib files and the `lib/ai-client` workspace package.

**Specific missing pieces (fixed):**
- `src/lib/memory.ts`, `lab-auth.ts`, `intelligence-client.ts`, `code-reviewer.ts`, `code-sandbox.ts`, `health-monitor.ts`, `self-deploy.ts`, `self-repair.ts` — rsynced from sirius-source
- `src/routes/intelligence-proxy.ts` — SCP'd from Replit
- `/opt/sirius/lib/ai-client/` — rsynced from `/opt/sirius-source/lib/ai-client/`
- `openai`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` — installed via `pnpm add` in the api-server directory on the server

## build.ts fixes
- Removed `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, and `openai` from the allowlist — they cannot be bundled reliably when resolving through workspace aliases
- Added `alwaysExternal` array containing those three packages — ensures they're always marked external regardless of package.json
- Added esbuild `alias` entries for `@workspace/ai-client` → `../../lib/ai-client/src/index.ts` (only when that path exists) — handles VPS where pnpm symlinks aren't created

**Why:** pnpm workspace symlinks don't get created when you rsync source files; esbuild needs explicit alias entries to resolve `@workspace/*` packages from a path that isn't in node_modules.

**How to apply:** After any major source sync to the server, run `cd /opt/sirius && pnpm --filter @workspace/api-server run build`. If new `@workspace/*` packages appear, add them to the alias block in `build.ts`.

## Ongoing sync command
To keep build tree in sync with sirius-source:
```bash
rsync -av /opt/sirius-source/artifacts/api-server/src/ /opt/sirius/artifacts/api-server/src/
rsync -av /opt/sirius-source/lib/ai-client/ /opt/sirius/lib/ai-client/
```
