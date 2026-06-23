---
name: Sirius model names
description: Which model names work for lab.ts and all server-side files — history of the 404 bug
---

## The Bug
`anthropic/claude-sonnet-4-5` returns **404 not_found_error** on OpenRouter. This caused every `/lab/chat` request to fail mid-conversation — the agentic loop's first API call threw, ending the conversation immediately.

## Working model names (June 2026)
- **OpenRouter** (lab.ts and all files using the `openai` client pointing to OpenRouter):  
  `anthropic/claude-3.7-sonnet`
- **Direct Anthropic SDK** (files using `ANTHROPIC_API_KEY`):  
  `claude-3-7-sonnet-20250219`

## Why
The model `claude-sonnet-4-5` was used as if it were an Anthropic release but was not a valid OpenRouter model alias at the time of investigation.

## How to apply
If Sirius self-modifies to change the model name back, or if a new deploy introduces `claude-sonnet-4-5`, search ALL src files:
`grep -rl 'claude-sonnet-4-5' /opt/sirius/artifacts/api-server/src/`
18 files are affected, spread across routes/ and lib/. Patch server-side with:
`find /opt/sirius/artifacts/api-server/src -name '*.ts' | xargs sed -i 's|"anthropic/claude-sonnet-4-5"|"anthropic/claude-3.7-sonnet"|g; s|"claude-sonnet-4-5"|"claude-3-7-sonnet-20250219"|g'`
Then rebuild + pm2 restart.

## Also: telegram.ts shim
Server's old `telegram.ts` only exported `sendTelegram(message, severity)`. New version exports `sendTelegramMessage`, `setupTelegram`, `isTelegramConfigured`, `sendTelegram` (shim). Health-monitor.ts and anubis-bridge.ts on the server depend on `sendTelegram` — the shim must stay.
