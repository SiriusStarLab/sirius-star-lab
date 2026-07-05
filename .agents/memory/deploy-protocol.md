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

## How to apply
1. After making and verifying a fix in the workspace, always run the deploy
   step as part of finishing the task (not a separate follow-up the user has
   to request).
2. For api-server changes: build (`pnpm --filter @workspace/api-server build`),
   SCP `artifacts/api-server/dist/index.cjs` to
   `root@185.247.118.196:/opt/sirius/artifacts/api-server/dist/index.cjs`
   (port 2222, key `.local/sirius_deploy.key`), then `pm2 reload sirius-api`.
   See `kamatera-deploy-path.md`.
3. For ai-chat (frontend) changes: build the frontend
   (`pnpm --filter @workspace/ai-chat build`), package/sync the built
   `dist/public` output to the server's frontend directory
   (`/opt/sirius/frontend` or wherever `app.ts` serves
   `artifacts/ai-chat/dist/public` from — check server-update.sh /
   deploy.sh / app.ts's self-update endpoints for the current mechanism),
   then restart/reload `sirius-api` so it picks up the new static build.
4. Verify post-deploy: hit the live sirius-ai.live URL (or the relevant
   health-check endpoint) to confirm the fix is actually live, not just
   that the deploy script exited 0.
5. Only tell the user a fix is complete once it is confirmed live on
   sirius-ai.live.
