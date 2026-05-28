---
name: Lab.ts agentic loop
description: Sirius's real chat route, the hardcoded fallback bug that was fixed, and current loop configuration.
---

# Lab.ts Agentic Loop

## Real Sirius route
Sirius runs in `artifacts/api-server/src/routes/lab.ts` at `/lab/chat`.
**NOT** `src/routes/openai/index.ts` — that's a different endpoint. All system prompt and loop changes must go in `lab.ts`.

## Hardcoded fallback bug (fixed)
The phrase *"All done — checks complete. What would you like to know from what I found?"* was a **hardcoded string** at line ~7419, sent whenever `finalText` was empty (model hit round limit without producing a text response). It was never the model's words.

**Fix applied:** Replaced with a forced synthesis round — injects a user message asking her to write the full report, makes one more streaming API call, streams the result. Falls back to an honest "hit round limit" message only if the synthesis call also produces nothing.

## Current loop config
- `MAX_TOOL_ROUNDS`: 16 (was 6)
- `max_tokens`: 8000 (was 4096)
- Model: `anthropic/claude-sonnet-4.6`

## System prompt location
DIAGNOSTIC REPORTING EXCEPTION is added to the Star Lab system prompt inside `lab.ts` around line ~6998. This overrides the "short and direct" default behavior for capability reports.

## Mnemosyne status
`loadCrossSessionContext` exists in `src/lib/mnemosyne.ts` but is NOT yet wired into the lab/chat handler. The function signature: `loadCrossSessionContext(userId, limit, excludeConversationId)`. This is the next pending task.
