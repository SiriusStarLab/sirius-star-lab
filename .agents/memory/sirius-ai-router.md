---
name: Sirius AI Router
description: Multi-tenant AI routing proxy at localhost:5000; public at sirius-ai.live/router/; customer dashboard at sirius-ai.live/dashboard/
---

## What it is
Full multi-tenant SaaS AI router (`artifacts/ai-router/`) running as PM2 process `sirius-router` on port 5000, proxied publicly at `sirius-ai.live/router/`. Customer dashboard (static React SPA) at `sirius-ai.live/dashboard/`.

## Internal wiring (sirius-api → router)
Two layers patched:
1. `lib/ai-client/src/index.ts` — OpenAI SDK `baseURL` reads `process.env.OPENROUTER_BASE_URL`
2. `artifacts/api-server/src/routes/lab.ts`, `subscriber-lab.ts`, `lib/health-monitor.ts` — direct fetch calls use env var fallback

`ecosystem.config.json` sirius-api env has:
```
OPENROUTER_BASE_URL=http://localhost:5000/v1
OPENROUTER_API_KEY=sk-sr-...  (the router key, not the real OpenRouter key)
```

## Public endpoints
- Health: https://sirius-ai.live/router/health
- API base: https://sirius-ai.live/router/v1  (OpenAI-compatible)
- Dashboard: https://sirius-ai.live/dashboard/
- Signup: POST https://sirius-ai.live/router/auth/signup

## Source locations
- Router: `artifacts/ai-router/src/` (built to `dist/index.cjs`)
- Dashboard: `artifacts/ai-router-dashboard/` (static SPA, deploy to `/var/www/sirius-dashboard/`)

## Deploy recipe
```bash
# Router
cd artifacts/ai-router && node --import tsx/esm build.ts
scp -P 2222 -i .local/sirius_deploy.key dist/index.cjs root@185.247.118.196:/opt/sirius/artifacts/ai-router/dist/index.cjs
ssh ... 'cd /opt/sirius && pm2 stop sirius-router && pm2 delete sirius-router && pm2 start ecosystem.config.json --only sirius-router'
# NEVER use pm2 restart --update-env — reads PM2 dump, NOT ecosystem.config.json

# Dashboard
cd artifacts/ai-router-dashboard && VITE_ROUTER_API=https://sirius-ai.live/router pnpm run build
tar -czf /tmp/dash.tar.gz -C dist . && scp -P 2222 ... /tmp/dash.tar.gz root@...:/tmp/
ssh ... 'rm -rf /var/www/sirius-dashboard/* && cd /var/www/sirius-dashboard && tar -xzf /tmp/dash.tar.gz'
```

## DB migration gotcha (CRITICAL)
ALTER TABLE (add columns) MUST run BEFORE CREATE INDEX on those columns. If `router_requests` existed from v1 without `customer_id`, the index creation fails with "column does not exist". Migration in `src/index.ts` is now correct (columns first, indexes after).

## Stripe
- Lazy init: Stripe client only created when STRIPE_SECRET_KEY is present (no crash on module load)
- Keys copied from sirius-api env to sirius-router env in ecosystem.config.json
- Webhook: STRIPE_WEBHOOK_SECRET (shared key)
- Credit packs: $10/$25/$50/$100 | Plans: dev (free), pro ($49), business ($199)
- Markup: 25% (ROUTER_MARKUP_PCT env, default 25)

## nginx config (`/etc/nginx/conf.d/sirius.conf`)
- `/router/` → proxy_pass http://localhost:5000/ (strips prefix — OpenAI-compatible)
- `/dashboard/` → alias /var/www/sirius-dashboard/ with SPA try_files fallback
- `/api/` → proxy_pass http://localhost:4000/api/ (sirius-api, unchanged)

## Key env vars (ecosystem.config.json sirius-router block)
- `ROUTER_PORT=5000`
- `SIRIUS_ROUTER_KEY=sk-sr-...` — master API key (auto-generated on first boot)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — copied from sirius-api
- `ROUTER_DASHBOARD_URL=https://sirius-ai.live` — Stripe redirect base

## Admin stats
```bash
curl http://localhost:5000/admin/stats -H "x-admin-pin: $STAR_LAB_PIN"
```

## DB tables
- `router_customers` — accounts (email, passwordHash, plan, balanceUsd, stripeCustomerId)
- `router_api_keys` — per-customer named keys (keyHash, keyPrefix, rpmLimit, label)
- `router_requests` — per-request log (model, tokens, costUsd, chargedUsd, cached, fallbackUsed)
- `router_cache` — response cache (cacheKey, response JSONB, expiresAt, hitCount)
- `router_aliases` — model aliases per customer
- `router_fallbacks` — fallback chains per customer
- `router_stripe_events` — Stripe webhook idempotency
