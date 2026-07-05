---
name: Sirius model names
description: Which model names work for lab.ts and all server-side files — history of the recurring 404 bug and how to diagnose it fresh each time
---

## The recurring bug
OpenRouter periodically retires model ID aliases without warning. Any hardcoded `anthropic/claude-*` string in the server's `api-server` code will eventually 404 with either:
- `404 model: <id>` (id never existed / wrong format), or
- `404 No endpoints found for <id>` (id existed but was retired)

This has happened twice already with two different "fixed" values (`claude-sonnet-4-5` then `claude-3.7-sonnet`), each working for a while then dying. **Do not trust any specific model name recorded here as still valid — always re-verify live before patching.**

## How to diagnose fresh (do this every time, don't assume)
1. Read the exact broken string from `pm2 logs sirius-api --lines 50 --nostream` on the Kamatera server.
2. Get the server's real OpenRouter key (read-only) from `/opt/sirius/ecosystem.config.json` (`apps[0].env.OPENROUTER_API_KEY`) — do NOT use Replit's own `$OPENROUTER_API_KEY` (it's a different/inactive key here, returns "User not found").
3. Test candidate model IDs directly against `https://openrouter.ai/api/v1/chat/completions` with that key via curl — only trust a real HTTP 200 chat completion, not just presence in `/api/v1/models` listing.
4. Once you find a working ID, grep how many files/occurrences use the bad one:
   `grep -rc '<bad-id>' /opt/sirius/artifacts/api-server/src/ /opt/sirius/artifacts/api-server/dist/index.cjs`
5. Patch BOTH the built `dist/index.cjs` (for immediate effect without rebuild) AND the `.ts` source files under `/opt/sirius/artifacts/api-server/src/` (and mirror to `/opt/sirius-source/...` if that tree exists), using an exact-match sed pattern anchored on the closing quote (e.g. `s|anthropic/claude-3\.7-sonnet"|anthropic/claude-sonnet-4.5"|g`) since bare/partial patterns (e.g. matching `-4` but not `-4-5`/`.5`) can miss variants.
6. `pm2 reload sirius-api --update-env`, then confirm via `pm2 describe sirius-api` that the process start time is AFTER your patch, since old buffered log lines from before the reload will still show in `pm2 logs` tail output and look like the bug persists when it's actually fixed.

## Also: telegram.ts shim
Server's old `telegram.ts` only exported `sendTelegram(message, severity)`. New version exports `sendTelegramMessage`, `setupTelegram`, `isTelegramConfigured`, `sendTelegram` (shim). Health-monitor.ts and anubis-bridge.ts on the server depend on `sendTelegram` — the shim must stay.
