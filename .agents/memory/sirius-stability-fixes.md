---
name: Sirius stability fixes
description: Key lessons from the June 2026 stability/quality pass on sirius-ai.live
---

## Self-repair interval override
`startSelfRepairEngine(5)` is hardcoded in `index.ts` — changing the default in `self-repair.ts` alone is not enough. Must fix the call-site in `index.ts`.

**Why:** The caller passes an explicit argument, overriding any default.

**How to apply:** Grep `startSelfRepairEngine` in both files when adjusting intervals.

## Health monitor checks (production)
After the quality pass, production health checks are at `/api/health/full` (returns `{cached, history: [{overall, checks}]}`). Checks include: database, anthropic (direct), ai_response (real LLM call), http_server, dream_lab_api, ssl_cert.

**Why:** Old check was `checkOpenRouter` which was redundant since OpenRouter was cut. Now tests actual Anthropic API directly.

## Telegram chat ID auto-discovery
`telegram.ts` now auto-discovers the chat ID from `telegram_messages` table (last row) if `TELEGRAM_CHAT_ID` env var is not set. When Garry first messages the bot, it stores the chat ID and subsequent Telegram alerts will work automatically.

**Why:** TELEGRAM_CHAT_ID was never added to ecosystem.config.json.

## Sirius-mobile pnpm workspace conflict
`artifacts/sirius-mobile/` had its own `pnpm-workspace.yaml` (packages: ["."]) which blocked the root-level `--filter` from finding the package. Removed it — the root workspace `artifacts/*` already covers it.

**Why:** Nested pnpm workspace files create isolated workspace scopes that override the root workspace for filter commands.

## Sirius-mobile Expo dev workflow
The Expo Metro bundler is too resource-intensive to start within Replit's 60-second workflow timeout when 7 workflows are running simultaneously. The workflow shows "failed" but Metro IS running (timed out waiting for port). Real users use EAS-built apps, not the Replit dev server. This is expected behavior.

`react-native-purchases` was in `app.json` plugins but has no `app.plugin.js` — must be removed from plugins array to start Metro.

## Heredoc shell injection
Python heredocs in SSH sessions get shell-interpolated — `${...}`, backticks, and emoji bytes all get mangled. Always write complex files locally and SCP them to the server instead.

## Health monitor Telegram alert
Telegram alert is added to health monitor `runHealthCheck()`. It fires when `overall === "down"`. Uses `sendTelegram()` from `telegram.ts` which auto-discovers the chat ID from DB.
