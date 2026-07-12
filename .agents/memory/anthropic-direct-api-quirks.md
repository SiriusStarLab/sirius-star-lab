---
name: Anthropic direct API quirks
description: Gotchas when using Anthropic API directly (not via OpenRouter) — response_format, piper stdout, loop timeouts.
---

# Anthropic Direct API — Key Quirks

The server uses `ANTHROPIC_API_KEY` to call Anthropic's API directly (switched June 2026 to cut OpenRouter fees). The `@workspace/ai-client` proxy strips the `anthropic/` prefix from model IDs transparently.

## response_format NEVER supported on Anthropic API

`response_format: { type: "json_object" }` is an OpenAI-specific parameter. Anthropic's API returns `400 response_format.type: Input should be 'json_schema'`. **Never use it.** Instead, instruct the model via system prompt to return JSON only, and strip markdown fences from the response before parsing:

```ts
const raw = response.choices[0]?.message?.content || "{}";
const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
JSON.parse(clean);
```

This was the root cause of Investment Rule flooding PM2 logs with 400 errors every ~60s, consuming API quota and masking real errors.

**Why:** Anthropic API ≠ OpenAI API despite the compatible SDK interface.

**How to apply:** Any time you add a new `openai.chat.completions.create()` call, never include `response_format: { type: "json_object" }`. Use system-prompt JSON instructions only.

## Piper TTS stdout deadlock

`spawn("/opt/piper/piper", [...])` without `piper.stdout.resume()` deadlocks when piper's stdout buffer fills (long texts). Always add `piper.stdout.resume()` immediately after spawn. The 30s timeout is a safety net, not a fix.

## Agentic loop timeouts

- Round 1: 30s (context load + cold API latency can exceed 15s)
- Subsequent rounds: 45s (tool results can be large)
- Inter-chunk (stream idle): 30s
