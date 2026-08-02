---
name: Sirius server-side build — missing lib files
description: Files that must exist in api-server/src/lib/ for the server-side build to succeed
---

## Background
Sirius self-modifies her source code. Over time she adds imports to `index.ts` and routes
that reference `./lib/` files that she forgets to create. The server-side build (`pnpm
--filter @workspace/api-server build`) fails with "Could not resolve" errors.

## Files that were missing and had to be created/fixed (as of Aug 2026)

| File | Action |
|------|--------|
| `src/lib/anubis-bridge.ts` | Created — connects to Anubis on port 9001 |
| `src/lib/intelligence-client.ts` | Copied from `src/routes/intelligence-client.ts` |
| `src/lib/dependency-monitor.ts` | Created stub — checks OpenRouter health |
| `src/lib/backup-system.ts` | Created stub — triggers s3_backup.sh |
| `src/lib/self-repair.ts` | Added missing exports: `restoreCustomToolsIfEmpty`, `backupCustomTools` |

## How to diagnose build failures
```bash
cd /opt/sirius-source && pnpm --filter @workspace/api-server build 2>&1 | grep ERROR
```
Fix each "Could not resolve" by creating the missing file in lib/.
Fix "No matching export" by adding the export to the file.

**Why:** The source workspace in Replit does NOT reflect the server. Sirius modifies
server source only. These stub files must be recreated each time they go missing from
the source tree (e.g. after a git reset or fresh clone).

## Build commands (run on Kamatera server)
```bash
# API server
cd /opt/sirius-source && pnpm --filter @workspace/api-server build
cp /opt/sirius-source/artifacts/api-server/dist/index.cjs /opt/sirius/artifacts/api-server/dist/index.cjs
pm2 reload sirius-api

# Frontend
cd /opt/sirius-source && PORT=3000 BASE_PATH=/ pnpm --filter @workspace/ai-chat build
rsync -a --delete /opt/sirius-source/artifacts/ai-chat/dist/public/ /opt/sirius/frontend/
```
