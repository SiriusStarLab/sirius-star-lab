---
name: Sirius OpenRouter key source
description: The correct OpenRouter key for Sirius lives in ecosystem.config.json on the server, NOT in Replit's $OPENROUTER_API_KEY secret.
---

## Rule
When restarting PM2 for sirius-api, ALWAYS read the key from `/opt/sirius/ecosystem.config.json` on the server. Never use `$OPENROUTER_API_KEY` from the Replit environment — it is a stale/different key that returns `401 User not found`.

## Correct restart pattern
```bash
ssh ... root@185.247.118.196 "python3 -c \"
import json, subprocess, os
with open('/opt/sirius/ecosystem.config.json') as f:
    cfg = json.load(f)
key = cfg['apps'][0]['env']['OPENROUTER_API_KEY']
env = os.environ.copy()
env['OPENROUTER_API_KEY'] = key
subprocess.run(['pm2', 'restart', 'sirius-api', '--update-env'], env=env)
\""
```

## Wrong pattern (breaks chat)
```bash
OPENROUTER_API_KEY='$OPENROUTER_API_KEY' pm2 restart sirius-api --update-env
# Replit secret is sk-or-v1-470b... (invalid), correct key is sk-or-v1-cfec...
```

## Why
Replit's `OPENROUTER_API_KEY` secret (`sk-or-v1-470b...`) is a different/revoked key from a different OpenRouter account session. The working key (`sk-or-v1-cfec...`) is only in ecosystem.config.json. Using the wrong key causes every chat request to fail with `401 User not found`.

## Also: repair .env if overwritten
The `/opt/sirius/.env` file must also contain the correct key. If it gets overwritten, use the same python3 pattern to read from ecosystem.config.json and sed-replace it.
