---
name: Sirius OpenRouter key source
description: The correct OpenRouter key for Sirius lives in ecosystem.config.json on the server, NOT in Replit's $OPENROUTER_API_KEY secret.
---

## Rule
When restarting PM2 for sirius-api, ALWAYS read the key from `/opt/sirius/ecosystem.config.json` on the server. Never use `$OPENROUTER_API_KEY` from the Replit environment — it is a stale/different key that returns `401 User not found`.

**Why:** The Replit secret was rotated/differs from the live working key stored in ecosystem.config.json. Using the Replit secret breaks every chat request.

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
# DO NOT do this — Replit $OPENROUTER_API_KEY is a different/revoked key
OPENROUTER_API_KEY='$OPENROUTER_API_KEY' pm2 restart sirius-api --update-env
```

## How to apply
Any time you need to restart sirius-api on Kamatera (after deploying a new bundle, after any PM2 restart). Always source the key from ecosystem.config.json, not from the shell environment.
