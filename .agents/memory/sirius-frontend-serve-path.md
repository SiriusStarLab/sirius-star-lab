---
name: Sirius frontend serve path (CRITICAL)
description: Where nginx actually serves the frontend from — NOT the path I assumed
---

## The actual path nginx serves frontend from

`/opt/sirius/frontend/`

**NOT** `/opt/sirius/artifacts/ai-chat/dist/public/` (that is a dead copy nobody reads).

## Why this matters
Every past session that rebuilt the frontend and copied to `/opt/sirius/artifacts/ai-chat/dist/public/` silently did nothing. The live site continued to serve the old files. The fix only works when you copy to `/opt/sirius/frontend/`.

## Correct deploy steps for frontend changes
```bash
# Build on server
cd /opt/sirius-source/artifacts/ai-chat && PORT=4000 BASE_PATH=/ pnpm build

# Deploy to the location nginx actually serves
rm -rf /opt/sirius/frontend/assets/*
cp -r /opt/sirius-source/artifacts/ai-chat/dist/public/. /opt/sirius/frontend/

# Verify
curl -s "https://sirius-ai.live/pricing" | grep -o "index-.*\.js"
```

## Discovery method
`find /opt -name "index-BUoRnw3W.js"` → found at `/opt/sirius/frontend/assets/index-BUoRnw3W.js`
Confirmed by: `curl https://sirius-ai.live/pricing | grep src` matching that filename.

**Why:** Nginx config (in `/etc/nginx/conf.d/`) serves static files from `/opt/sirius/frontend/`.
The API server at port 4000 also serves its own static path but that is NOT what nginx proxies for the main domain.
