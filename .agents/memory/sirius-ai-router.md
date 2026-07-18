---
name: Sirius AI Router
description: Mini OpenRouter proxy running at localhost:5000; all Sirius AI calls route through it for unified cost tracking.
---

## What it is
A lightweight Express + TypeScript OpenAI-compatible proxy (`artifacts/ai-router/`) running as PM2 process `sirius-router` on port 5000 (internal only, not exposed via nginx).

## Routing logic
- `anthropic/*` → Anthropic direct API (when `ANTHROPIC_API_KEY` is set)
- `gpt-*/openai/*` → OpenAI direct
- Everything else → OpenRouter fallback

## Key env vars (in ecosystem.config.json under sirius-router)
- `ROUTER_PORT=5000`
- `SIRIUS_ROUTER_KEY=sk-sr-...` — master API key (auto-generated on first boot, saved to ecosystem.config.json)
- `ROUTER_INTERNAL_SECRET` — for internal service calls via `x-internal-secret` header
- `STAR_LAB_PIN` — admin pin for `/admin/stats` via `x-admin-pin` header

## How sirius-api is wired to it
Two layers patched:
1. `lib/ai-client/src/index.ts` — OpenAI SDK `baseURL` reads `process.env.OPENROUTER_BASE_URL`
2. `artifacts/api-server/src/routes/lab.ts`, `subscriber-lab.ts`, `lib/health-monitor.ts` — direct `fetch` calls use env var fallback

`ecosystem.config.json` sirius-api env has:
```
OPENROUTER_BASE_URL=http://localhost:5000/v1
OPENROUTER_API_KEY=sk-sr-...  (the router key, not the real OpenRouter key)
```

**Why:** every AI request now logged in `router_requests` DB table with provider, model, tokens, cost, duration.

## Admin stats
```bash
curl http://localhost:5000/admin/stats -H "x-admin-pin: $STAR_LAB_PIN"
```

## DB tables auto-created on startup
- `router_api_keys` — API keys (name, key_hash, is_active)
- `router_requests` — per-request log (model, provider, tokens, cost_usd, duration_ms, success)
