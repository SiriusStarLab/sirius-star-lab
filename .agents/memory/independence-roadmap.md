---
name: Sirius independence roadmap
description: Status of moving Sirius off Replit infrastructure onto own Kamatera server + GitHub
---

## Current status (as of 2026-05-28)

### Done ✅
- **AI calls**: `lib/ai-client` package replaces `@workspace/integrations-openai-ai-server`. Uses `OPENROUTER_API_KEY` directly at `https://openrouter.ai/api/v1`. 21 files updated. No more Replit modelfarm proxy.
- **Code repo**: Pushed to `https://github.com/SiriusStarLab/sirius-star-lab` (private). PAT stored at `/root/.sirius-github-token` on Kamatera.
- **Build pipeline**: Kamatera has pnpm 10.33.1 + Node 20. Source cloned to `/opt/sirius-source`. Deploy script at `/opt/sirius/deploy.sh` — pulls from GitHub, builds, copies artifact, restarts PM2.
- **Database**: Always been on Kamatera PostgreSQL ✅
- **API serving**: Always been on Kamatera PM2 ✅
- **Backups**: Nightly S3 backup to `sirius-backup-primary` bucket via `/opt/sirius/backup/s3_backup.sh` (includes pg_dump + codebase, excludes node_modules)

### Still on Replit ⏳
- **Object storage**: `DEFAULT_OBJECT_STORAGE_BUCKET_ID` = Replit's S3 bucket. Move to own AWS S3 bucket (credentials already exist from backup setup).
- **Clerk auth**: Replit-managed Clerk tenant. Move to own Clerk account or self-hosted auth (Auth.js/Lucia). Most complex migration.
- **stripe-replit-sync**: Still a dependency in api-server — review whether it uses Replit APIs.

## Deploy process (current)
From Replit: `pnpm build` → Replit auto-commits → push to GitHub manually or via checkpoint
On Kamatera: `bash /opt/sirius/deploy.sh` — pulls, builds, restarts

**Why:** Kamatera can now build itself. Replit is only needed for code editing, not serving.
