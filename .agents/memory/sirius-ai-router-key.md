---
name: Sirius AI Router key architecture
description: How OpenRouter API keys are split between sirius-api and sirius-router; why direct OpenRouter calls fail.
---

## The architecture

- `sirius-router` (PM2 id 28, port 5000) holds the **real** OpenRouter key (`sk-or-v1-...`) in its own ecosystem env.
- `sirius-api` ecosystem has `OPENROUTER_API_KEY = sk-sr-1b...` — this is an **internal auth key** for the AI router proxy, NOT a real OpenRouter key.
- `OPENROUTER_BASE_URL = http://localhost:5000/v1` in sirius-api ecosystem points to the AI router.

## The rule

The ai-client (`lib/ai-client/src/index.ts`) must use `process.env.OPENROUTER_BASE_URL` as its OpenRouter baseURL, **not** the hardcoded `https://openrouter.ai/api/v1`. Using the hardcoded URL bypasses the AI router and sends the internal `sk-sr-1b...` key directly to OpenRouter → 401.

**Why:** All OpenRouter traffic from sirius-api must route through sirius-router (localhost:5000), which injects the real key. The ai-client fix: `const openrouterBase = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";`

## OPENAI_DIRECT flag

Setting `OPENAI_DIRECT=true` in ecosystem makes ai-client bypass OpenRouter entirely and use `OPENAI_API_KEY` with `https://api.openai.com/v1`. This is a fallback mode only — remove it once OpenRouter credits are restored.
