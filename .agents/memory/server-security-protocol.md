---
name: Server Security Protocol
description: 4-layer security protocol Garry requires before any server action. MUST be checked at the start of every Sirius session.
---

# Server Security Protocol (Garry's explicit requirement)

## Layer 1 — Agent Approval Gate (ALWAYS ASK FIRST)
Before executing ANY of these, explicitly ask Garry for confirmation:
- `ssh` commands that modify files, restart services, or delete anything
- `scp` / file transfers to the server
- `rm`, `rm -rf` on any server path
- `pm2 restart`, `pm2 reload`, `pm2 delete`, `pm2 stop`
- Any write to `/opt/sirius/`, `/opt/sirius-source/`, `/opt/sirius-apps/`

**Safe without asking (read-only):** `ssh ... cat`, `ssh ... ls`, `ssh ... grep`, `curl` health checks.

## Layer 2 — Deploy Script Only
- API deploys: ONLY via `/opt/sirius/scripts/deploy-bundle.sh [reason]`
- Frontend deploys: build on server from `/opt/sirius-source/artifacts/ai-chat/`, copy to `/opt/sirius/frontend/`, then run `/opt/sirius/scripts/lock-frontend.sh` to chmod a-w
- No ad-hoc pm2 restarts without Garry approval

## Layer 3 — Pre-Flight Checks (in deploy-bundle.sh v2)
Script now runs BEFORE touching any live file:
1. `tsc --noEmit` — TypeScript must be clean
2. Route file sync check — required source files listed in script must exist
3. Post-deploy health check — auto-rollback if /api/health ≠ 200
4. SHA-256 hash verification — deployed bundle must match expected hash

## Layer 4 — Git Gate (pending task #7)
Target: all changes via GitHub PR, server pulls from approved branch only.
Until then: SCP permitted but requires Layer 1 approval.

**Why:** Garry discovered that ad-hoc SCP without checks caused missing files to break all API routing (served HTML instead of JSON for every endpoint). The pre-flight checks and approval gate prevent this class of incident.

**How to apply:** At the start of ANY Sirius session involving server changes, re-read this file and enforce all four layers for that session.
