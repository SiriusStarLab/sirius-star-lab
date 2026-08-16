---
name: Kamatera PM2 deploy path
description: Correct SCP destination for api-server bundle on the Kamatera VPS (185.247.118.196)
---

# Correct deploy path

PM2 script path: `/opt/sirius/artifacts/api-server/dist/index.cjs`

**Wrong path (do NOT use):** `/opt/sirius/dist/index.cjs` — this file exists but PM2 ignores it.

## Full deploy sequence

```bash
# 1. Build
pnpm --filter @workspace/api-server build

# 2. SCP to the CORRECT path
scp -i .local/sirius_deploy.key -P 2222 -o StrictHostKeyChecking=no \
  artifacts/api-server/dist/index.cjs \
  root@185.247.118.196:/opt/sirius/artifacts/api-server/dist/index.cjs

# 3. Restart
ssh -i .local/sirius_deploy.key -p 2222 -o StrictHostKeyChecking=no root@185.247.118.196 \
  "set -a && source /opt/sirius/.env && set +a && pm2 restart sirius-api --update-env"
```

**Why:** PM2 exec cwd is `/opt/sirius/artifacts/api-server`, script is `dist/index.cjs` relative to that.
Every deploy that went to `/opt/sirius/dist/index.cjs` (the other copy) had zero effect.

**How to verify:** `pm2 show sirius-api | grep 'script path'` — must show `/opt/sirius/artifacts/api-server/dist/index.cjs`
