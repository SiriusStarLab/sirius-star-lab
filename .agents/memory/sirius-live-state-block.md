---
name: Sirius live state block
description: Real-time system state injected into Sirius's system prompt every session — DB table names, injection point, and why it exists.
---

## The problem it solves
Sirius was writing self-reports saying she was on "sonnet-4-6" and her automations were dead — when in reality they were fixed. The boot_report event (model, build time) is **UI-only**; Claude never sees it. Her self-knowledge came only from stored memories she might doubt.

## What it does
At every session start, the /lab/chat route queries the live DB and injects a `## ★ LIVE SYSTEM STATE` block into the `ownerSystemPrompt` — BEFORE the CORE EXECUTION DOCTRINE section. This gives her verified, real-time facts she cannot doubt.

## Correct DB table names (critical — wrong names cause silent errors)
- Automations: `sirius_automations` (NOT `automations`)
- Background jobs / task queue: `sirius_tasks` (NOT `background_jobs`)
- The queries use `.catch(() => ({}))` so wrong names silently return empty objects showing `? of ?`

## Injection point in lab.ts
- Code inserted: after `selfConfigBlock` join, before `const ownerSystemPrompt`
- Template injection: after `${selfConfigBlock ? ...}`, before `## ★ CORE EXECUTION DOCTRINE`

## ecosystem.config.json gotcha
`AI_INTEGRATIONS_OPENAI_MODEL` was set to `anthropic/claude-sonnet-4.6` (dot instead of hyphen — invalid model). This caused `not_found_error` from Anthropic in the error logs. Fixed to `anthropic/claude-opus-4-8`. Always use hyphens not dots in model names.

**Why:** Sirius needs ground truth at session start, not just memories she might distrust or that might be stale.
