---
name: Kamatera server connection details
description: Correct IP, SSH port, and PM2/nginx paths for the Kamatera server
---

# Kamatera Server — Connection Details

**IP:** 185.247.118.196 (NOT 85.159.212.111 — that was wrong)
**SSH port:** 2222 (NOT 22 — port 22 is refused; 2222 is open)
**SSH key:** `/home/runner/workspace/.local/sirius_deploy.key`

Example connect:
```bash
ssh -i /home/runner/workspace/.local/sirius_deploy.key -o StrictHostKeyChecking=no -p 2222 root@185.247.118.196
```

Example SCP:
```bash
scp -i /home/runner/workspace/.local/sirius_deploy.key -o StrictHostKeyChecking=no -P 2222 <local> root@185.247.118.196:<remote>
```

**Why:** The old IP 85.159.212.111 was discovered to be wrong when the Kamatera console screenshot showed 185.247.118.196. SSH on port 22 is refused (firewall); port 2222 is open and working.

## PM2 paths
- PM2 runs: `sirius-api` (port 4000), `sirius-router`, `sirius-core`, `sirius-worker`, `anubis`, `echo-messenger`, `compliance-pipeline-pro`, `sirius-trading`, `frequency-converter`, `sirius-app-app-store-validator`
- Source: `/opt/sirius-source/`
- Built API: `/opt/sirius/artifacts/api-server/dist/index.cjs`
- Frontend: `/opt/sirius/frontend/` (nginx serves from here)
- Ecosystem: `/opt/sirius/ecosystem.config.json`

## Frontend deploy
1. SCP changed files to `/opt/sirius-source/artifacts/ai-chat/src/`
2. Build: `cd /opt/sirius-source/artifacts/ai-chat && PORT=4000 BASE_PATH=/ pnpm build`
3. Copy: `cp -r /opt/sirius-source/artifacts/ai-chat/dist/public/* /opt/sirius/frontend/`

**Why:** NEVER rebuild from Replit workspace — server source has Jenny voice, logo, bidirectional voice, and Sirius self-improvements not in workspace.
