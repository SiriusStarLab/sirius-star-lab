---
name: Sirius model names — Anthropic vs OpenRouter format
description: Critical difference in model ID format between Anthropic direct API and OpenRouter
---

## The rule

`ANTHROPIC_API_KEY` IS set in sirius-api's PM2 env → ai-client routes to Anthropic directly.

Anthropic direct API requires: `claude-sonnet-4-5` (dashes, no prefix)  
OpenRouter requires: `anthropic/claude-sonnet-4.5` (dots, with prefix)

Source code uses OpenRouter format (`anthropic/claude-sonnet-4.5`).

**The ai-client Proxy in `lib/ai-client/src/index.ts` handles this automatically:**
- Strips `anthropic/` prefix
- Converts dots → dashes in version numbers
- Result: `claude-sonnet-4-5` sent to Anthropic ✅

**Why:** OpenRouter retired model IDs with dashes (4-5 format) in favour of dots (4.5 format). Anthropic's own API has always used dashes. The normaliseModel proxy bridges this.

**How to apply:** Always write model names in OpenRouter dot-format (`anthropic/claude-sonnet-4.5`) in source code. The Proxy handles the rest. If you see `404 model: claude-sonnet-4.5`, the Proxy's dot→dash conversion is missing or broken.

## Current valid model IDs (OpenRouter dot-format, as of July 2026)
- `anthropic/claude-opus-4.8` — main Sirius model (ecosystem.config.json AI_INTEGRATIONS_OPENAI_MODEL)
- `anthropic/claude-opus-4.8-fast` — faster/cheaper opus variant
- `anthropic/claude-opus-4.7` — previous opus
- `anthropic/claude-haiku-4.5` — fast/cheap tasks

## Recurring failure pattern — ecosystem.config.json model name
When Sirius stops responding entirely, first check: `grep OPENAI_MODEL /opt/sirius/ecosystem.config.json`
Then verify against live OpenRouter: `curl -s https://openrouter.ai/api/v1/models | python3 -c "import sys,json; [print(m['id']) for m in json.load(sys.stdin)['data'] if 'opus' in m['id']]"`
Fix: `sed -i 's/old-name/new-name/g' /opt/sirius/ecosystem.config.json` then `cd /opt/sirius && pm2 reload ecosystem.config.json --only sirius-api,sirius-worker`

## History
- Original source: `anthropic/claude-sonnet-4-5` (dashes) — worked for Anthropic direct, failed on OpenRouter
- Mass-replaced to dots July 2026
- `anthropic/claude-opus-4-8` → `anthropic/claude-opus-4.8` (dash→dot) July 15 2026 — caused complete silence
- normaliseModel updated to strip prefix AND convert dots→dashes for Anthropic
