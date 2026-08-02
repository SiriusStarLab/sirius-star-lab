---
name: sirius-core config and restart
description: How sirius-core starts, its DB credentials, and why it was crash-looping
---

## Location
- Script: `/opt/sirius/core/dist/server.js`
- CWD: `/opt/sirius/core`
- Port: 8766
- **NOT in the main ecosystem.config.json** — has its own `/opt/sirius/core/.env`

## DB credentials (fixed Aug 2026)
The `.env` originally had `postgres:postgres@localhost/sirius_core` — both wrong.
Correct credentials:
```
DATABASE_URL=postgresql://sirius:Sirius2026Secure!@127.0.0.1:5432/siriusdb
SIRIUS_CORE_DB_URL=postgresql://sirius:Sirius2026Secure!@127.0.0.1:5432/siriusdb
```
The database `sirius_core` does not exist — it runs on `siriusdb`.

## Helmet crash loop (fixed Aug 2026)
Was crashing 8,000+ times/day with `Cannot find module 'helmet'`.
Fix: `NODE_PATH=/opt/sirius/core/node_modules` must be set when starting via pm2.
The dist/server.js was also patched to use the absolute path `/opt/sirius/core/node_modules/helmet`.

## How to restart correctly
```bash
pm2 stop sirius-core && pm2 delete sirius-core
pm2 start /opt/sirius/core/dist/server.js \
  --name sirius-core \
  --cwd /opt/sirius/core \
  --node-args '--preserve-symlinks' \
  --env NODE_PATH=/opt/sirius/core/node_modules
pm2 save
```

## Healthy startup log signature
```
[SIRIUS CORE] Database initialized — 8 tables ready
[Mnemosyne] ✅ Deep memory layer initialised
[SIRIUS CORE] ✅ Running on port 8766
[SIRIUS CORE] Intuition Engine: ACTIVE
[SIRIUS CORE] Partnership Protocol: ACTIVE
[SIRIUS CORE] This is ours.
```
