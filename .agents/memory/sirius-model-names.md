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
- `anthropic/claude-sonnet-4.5` — main Sirius model
- `anthropic/claude-haiku-4.5` — fast/cheap tasks
- `anthropic/claude-opus-4` — heavy reasoning (lab-app-builder)
- `anthropic/claude-sonnet-4.6`, `anthropic/claude-sonnet-5` — also available

## History
- Original source: `anthropic/claude-sonnet-4-5` (dashes) — worked for Anthropic direct, failed on OpenRouter
- Mass-replaced to dots July 2026
- normaliseModel updated to strip prefix AND convert dots→dashes for Anthropic
