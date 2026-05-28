---
name: Kamatera PM2 deploy path
description: Correct SCP destination for api-server bundle on the Kamatera VPS (185.247.118.196)
---

# Correct deploy path

PM2 script path: `/opt/sirius/artifacts/api-server/dist/index.cjs`

`/opt/sirius/dist/index.cjs` is now a **symlink** to the above — both paths resolve to the same file.
SCP to either works, but the canonical target is `artifacts/api-server/dist/index.cjs`.

## Full deploy sequence

```bash
# 1. Build
pnpm --filter @workspace/api-server build

# 2. SCP to the canonical path
scp -i .local/sirius_deploy.key -P 2222 -o StrictHostKeyChecking=no \
  artifacts/api-server/dist/index.cjs \
  root@185.247.118.196:/opt/sirius/artifacts/api-server/dist/index.cjs

# 3. Reload (hot-swap, no restart loop risk)
ssh -i .local/sirius_deploy.key -p 2222 -o StrictHostKeyChecking=no root@185.247.118.196 \
  "pm2 reload sirius-api --update-env"
```

**Why symlink:** She triggered `restart_server` → PM2 tried to boot from `artifacts/api-server/dist/index.cjs` → file didn't exist → 66-restart crash loop. Symlink prevents this divergence.

**Why reload not restart:** `pm2 reload` hot-swaps without losing the process; `pm2 restart` (or process.exit) re-reads the script path from the stored config, which must exist.

**How to verify:** `pm2 show sirius-api | grep 'script path'` — must show `/opt/sirius/artifacts/api-server/dist/index.cjs`
