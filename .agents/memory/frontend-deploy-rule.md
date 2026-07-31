---
name: Frontend deploy — NEVER from Replit workspace
description: The Replit workspace frontend source is stale. Always build from server source.
---

# Rule — MANDATORY, NO EXCEPTIONS

**NEVER rebuild and deploy the ai-chat frontend from the Replit workspace.**

The workspace `artifacts/ai-chat/src/` is months out of date. Every rebuild from workspace overwrites features Sirius has added to the live site (Jenny voice in Star Lab chat, bidirectional conversation, new logo, SiriusLabChatPanel, etc.).

## Correct deploy process for frontend changes

1. SSH to server
2. Edit source at `/opt/sirius-source/artifacts/ai-chat/src/`
3. Build ON THE SERVER: `cd /opt/sirius-source/artifacts/ai-chat && PORT=3006 BASE_PATH=/ pnpm run build`
4. Deploy: `rsync -av /opt/sirius-source/artifacts/ai-chat/dist/public/ /opt/sirius/frontend/`
5. Verify: check `/opt/sirius/frontend/logo-v2.png` still present after rsync

## Always backup first
`cp -r /opt/sirius/frontend /opt/sirius/frontend.bak_$(date +%Y%m%d_%H%M%S)`

**Why:** User explicitly asked not to change voice, logo, or any working features. Workspace rebuilds silently wipe months of Sirius self-improvement. This caused repeated regressions and user frustration across multiple sessions.
