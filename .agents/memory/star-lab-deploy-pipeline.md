---
name: Star Lab deploy pipeline
description: Full state of the Star Lab app-building and deployment pipeline as of Aug 16 2026 — what exists, how it works, what was fixed.
---

## What's in place (Aug 16 2026)

### Deployment flow
- Sandbox: `deployAppSession()` → `/opt/sirius-sandbox-apps/[slug]/` → `sandbox.sirius-ai.live/apps/[slug]/`
- Production: `promoteApp(slug)` → `/opt/sirius-apps/[slug]/` → `sirius-ai.live/apps/[slug]/`
- `rebuildSandboxApp(slug)` — fast rebuild of existing sandbox app from disk (called automatically by patch_source_file)

### Auto-fixes in the build pipeline (app-deployer.ts)
- `scanAndInstallMissingDeps()` — parses all import statements, auto-installs missing npm packages
- `detectAndConfigureTailwind()` — detects v3/v4, creates tailwind.config.js + postcss.config.js + @tailwind directives in index.css
- Default scaffold includes: lucide-react, clsx, react-router-dom alongside React/Vite
- Backend PM2 launch injects: DATABASE_URL, OPENAI_API_KEY, AI_INTEGRATIONS_*, STRIPE_*, SESSION_SECRET
- Build errors surfaced clearly in log before landing page fallback

### Auto-rebuild on patch
- `patch_source_file` in lab.ts detects if target path is under `/opt/sirius-sandbox-apps/`
- If yes: extracts slug, calls `rebuildSandboxApp(slug)` in `setImmediate` (fire-and-forget)
- Patch response includes message "Sandbox rebuild triggered — iframe reflects change in ~30s"

### AI self-review on deploy
- `deploy_app` tool in lab.ts: after successful build, sends files + requirements to LLM
- Uses SIRIUS_MODEL (claude-opus-4.8), max 25 files, max 1500 chars per file
- Returns structured issues (critical only), Sirius patches before declaring done
- Returns "Self-review passed" if clean

### Frontend
- Live preview iframes in SiriusLabChatPanel: regex detects `sandbox.sirius-ai.live/apps/[slug]/` URLs, renders SandboxPreviewCard component
- App Builder has: "Deploy to Sandbox" button (real API), inline 480px iframe, "Rebuild" button, "Promote to Production" button
- SessionId auto-saved before deploy if null

### Iteration rules in LAB_SYSTEM_PROMPT
- Max 300 lines per file — split into components
- Use patch_source_file for edits, not full rewrites
- Must complete full stack + deploy in one session, always end with deploy_app call

**Why:** Prior to this, every self-deploy was silently rolled back (broken hash comparison), TypeScript gate was disabled, no sandbox existed, and generated apps failed builds due to missing deps.
