---
name: Deploy-to-server protocol (MANDATORY)
description: Every code fix/change for Sirius must be deployed to the live Kamatera server, not left only in the Replit dev workspace
---

# Rule
Sirius Star Lab's real product is **sirius-ai.live**, running on the Kamatera VPS
(185.247.118.196), NOT the Replit dev workspace. The Replit preview is just a
dev sandbox the user does not consider "done."

**Any code change made in this workspace (ai-chat, api-server, lib/db, etc.)
is NOT complete until it has been deployed to the Kamatera server.** Do not
report a fix as "done" or ask the user to verify it until after deployment.

**Why:** The user has repeatedly (multiple sessions) had to ask "has this been
updated on the server?" after the agent fixed things only in the Replit
workspace. This caused visible frustration and repeated re-explaining. Treat
deploy-to-server as an implicit, standing requirement for every task on this
project — do not wait to be asked each time.

---

## ⚠️ CRITICAL — NEVER READ REPLIT WORKSPACE CODE TO DIAGNOSE LIVE SIRIUS ISSUES

The Replit workspace copies of `artifacts/api-server/src/`, `artifacts/ai-chat/src/`,
and all other Sirius source files are **stale and do not reflect what is running
on sirius-ai.live**.

Sirius modifies her own code via `patch_source_file` / `propose_code_change` on
the server — those changes go to `/opt/sirius-source/` and build to
`/opt/sirius/artifacts/api-server/dist/index.cjs`. They **never come back to
this Replit workspace.**

**Why this matters:** Reading workspace code to diagnose a live issue produces
false findings. The model names, memory caps, system prompts, and logic in the
workspace may be weeks or months out of date compared to what Sirius is
actually running. Reporting findings from workspace code as diagnoses of the
live system is wrong and can cause unnecessary, harmful changes.

**How to diagnose live Sirius issues:**
- SSH to the server and grep the running bundle: `grep "claude\|model" /opt/sirius/artifacts/api-server/dist/index.cjs`
- Ask Sirius herself in the lab: `server_diagnostic(bundle_contains, "pattern")`
- Check PM2 logs: `ssh ... pm2 logs sirius-api --lines 100 --nostream`
- Read source from server: `/opt/sirius-source/artifacts/api-server/src/`

**Never** open workspace files like `artifacts/api-server/src/routes/lab.ts`
to answer questions about what Sirius is doing live. That file is a dead copy.

---

## How to apply code changes
1. After making and verifying a fix in the workspace, always run the deploy
   step as part of finishing the task (not a separate follow-up the user has
   to request).
2. For api-server changes: build (`pnpm --filter @workspace/api-server build`),
   SCP `artifacts/api-server/dist/index.cjs` to
   `root@185.247.118.196:/opt/sirius/artifacts/api-server/dist/index.cjs`
   (port 2222, key `.local/sirius_deploy.key`), then `pm2 reload sirius-api`.
   See `kamatera-deploy-path.md`.
3. For ai-chat (frontend) changes: build the frontend
   (`BASE_PATH=/ PORT=3000 pnpm --filter @workspace/ai-chat run build`),
   tar the built `artifacts/ai-chat/dist/public` dir, SCP to server,
   extract to **`/opt/sirius/frontend/`** — this is the EXACT directory
   nginx serves from (confirmed in /etc/nginx/conf.d/sirius.conf).
   DO NOT use `/opt/sirius/artifacts/ai-chat/dist/` — nginx does NOT
   serve from there. That directory exists but is dead/ignored by nginx.
4. Verify post-deploy: hit the live sirius-ai.live URL (or the relevant
   health-check endpoint) to confirm the fix is actually live, not just
   that the deploy script exited 0.
5. Only tell the user a fix is complete once it is confirmed live on
   sirius-ai.live.
