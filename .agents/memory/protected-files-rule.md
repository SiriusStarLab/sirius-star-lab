---
name: Protected files standing rule
description: Garry's standing rule — agents must not touch core routing/infra files without explicit instruction
---

## Rule
Never modify these files unless Garry explicitly requests it in the current session:
- `artifacts/ai-chat/src/App.tsx` (routing)
- Any routing-related files
- `/etc/nginx/conf.d/sirius.conf` (nginx config on Kamatera)
- `ecosystem.config.json` (PM2 config on Kamatera)
- Any deployment/infrastructure config

**Why:** A previous task agent changed the routing in App.tsx as a side-effect of fixing a different bug. This caused confusion and eroded trust. These files are high-risk — small changes can break the public-facing site.

**How to apply:** If a task requires touching these files as a side-effect, stop and flag it to Garry explicitly before proceeding. Do not treat it as "while I'm in here." Get specific sign-off.
