---
name: Sirius self-repair guardrails
description: Why Sirius kept restarting herself every session and what was done to stop it
---

## The problem
Sirius has `restart_server` and `run_command` tools. She was designed to be aggressively self-healing. She grepped her own minified bundle for function names like `loadCrossSessionContext` — which esbuild renames during minification — got 0 matches, concluded Mnemosyne was broken, rebuilt from source, and restarted on every single session. This caused "Something went wrong" on every user session open.

## Root cause pattern
Giving an AI autonomous destructive tools without guardrails = the AI acts on false assumptions with full confidence. The system prompt said "you are the engineer who fixes them — when something is broken, open the code and fix it". No verification step. No cooldown. No ceiling on how often she could restart.

## Fixes deployed
1. **restart_server cooldown** — 2-hour minimum between autonomous restarts, tracked in sirius_config DB as `last_autonomous_restart`. Bypassed only if reason string contains "garry/requested/asked/force" or force=true.
2. **SIRIUS_BUNDLE_CAPABILITIES marker** — `console.log("SIRIUS_BUNDLE_CAPABILITIES: mnemosyne-wired ...")` at top of lab.ts. String literals survive minification. Sirius must use `grep -c 'SIRIUS_BUNDLE_CAPABILITIES' dist/index.cjs` to check bundle state — NOT grep for function names.
3. **System prompt rewritten** — Changed from "fix it autonomously" to "diagnose loudly, act conservatively". Explicit list of things requiring Garry confirmation: restart, rebuild, delete, config changes.

## Rule
**Why:** Every autonomous restart that Sirius initiates without user intent breaks the live session. Stability > self-improvement.
**How to apply:** Any future self-repair features must distinguish safe (config, memory) from destructive (restart, rebuild, delete). Destructive = user must confirm.
