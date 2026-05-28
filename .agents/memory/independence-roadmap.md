---
name: Sirius independence roadmap
description: Status of moving Sirius Star Lab off Replit infrastructure onto Kamatera
---

## Status (as of May 2026)

| Service | Status | Notes |
|---|---|---|
| AI (OpenRouter) | ✅ Independent | Direct API key, no Replit proxy |
| Code repo (GitHub) | ✅ Independent | Private repo, PAT at /root/.sirius-github-token |
| Build pipeline | ✅ Independent | /opt/sirius/deploy.sh, builds on Kamatera |
| Database (PostgreSQL) | ✅ Independent | Local Postgres on Kamatera |
| Object storage | ✅ Independent | AWS S3, bucket: sirius-storage (eu-west-1) |
| Auth | ✅ Independent | localStorage UUID + PIN, no third-party |
| stripe-replit-sync | ✅ Independent | Just Stripe API + local Postgres, no Replit infra |
| CAD generation | ⚠️ Replit | Calls new-dimension-cad.replit.app — works without API key, but hosted on Replit |

## Server details
- Kamatera VPS: 185.247.118.196:2222 (root)
- PM2 process: sirius-api, running from /opt/sirius/artifacts/api-server/dist/index.cjs
- Source: /opt/sirius-source (git pull target)
- Frontend: /opt/sirius/frontend/public
- CAD files: /opt/sirius/cad-files (CAD_LOCAL_DIR set)
- SSL: Let's Encrypt, auto-renews via cron daily at 3am (`0 3 * * * certbot renew --quiet --deploy-hook "nginx -s reload"`)

## Lab PIN
- DB stores the active PIN in sirius_config table (key: lab_pin)
- Env var STAR_LAB_PIN is the fallback if DB has no entry
- Current active PIN: 10669911 (changed via UI; env var updated to match)
- To change: use /lab/settings/change-pin in the Star Lab

## Key env vars on Kamatera (ecosystem.config.json)
- STORAGE_BUCKET=sirius-storage, STORAGE_REGION=eu-west-1
- AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY for S3
- STAR_LAB_PIN=10669911 (matches DB)
- FRONTEND_DIR=/opt/sirius/frontend/public
- CAD_LOCAL_DIR=/opt/sirius/cad-files

## To complete full independence
- Move New Dimensions CAD service off Replit (deploy to Kamatera or other host)
- new-dimension-cad.replit.app hosts /api/ai/generate used by cad-auto-gen.ts
- No API key required currently — unauthenticated access works

## Health check summary (May 2026)
All 6 automated health checks green: database, openrouter, http_server,
dream_lab_api, chat_api, ssl_cert. No issues. Self-repair engine active.
