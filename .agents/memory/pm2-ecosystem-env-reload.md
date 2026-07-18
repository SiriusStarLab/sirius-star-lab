---
name: PM2 ecosystem env reload
description: pm2 restart --update-env reads from PM2's saved dump, NOT the ecosystem.config.json file — new env vars won't appear without a full stop/delete/start cycle.
---

## The rule
To pick up new env vars added to `ecosystem.config.json`, you must do a full stop/delete/start:

```bash
cd /opt/sirius
pm2 stop sirius-api
pm2 delete sirius-api
pm2 start ecosystem.config.json --only sirius-api
```

`pm2 restart sirius-api --update-env` does NOT work for new keys — it reloads from PM2's internal dump which was captured at the last `pm2 start` call, not from the file.

**Why:** Discovered when adding `OPENROUTER_BASE_URL` — the key was in `ecosystem.config.json` but `/proc/$PID/environ` showed it missing after `pm2 restart --update-env`. A stop/delete/start from the file fixed it immediately.

**How to verify:** After restart, check `cat /proc/$(pm2 pid <name>)/environ | tr "\0" "\n" | grep <VAR>`.

## Exception
`pm2 reload ecosystem.config.json --update-env` (with the file path, not the app name) DOES re-read the file and applies graceful reload. Use this for zero-downtime restarts when the file has changed.
