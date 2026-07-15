---
name: Sirius app-deployer stub generation rules
description: How the app-deployer.ts builds Sirius-generated React apps — workspace stripping, named-export stubs, base URL, callable defaults
---

## Rule 1: Strip npm workspaces before install
Sirius-generated apps often have a root `package.json` with `"workspaces": ["frontend","backend","ml-service"]`. The `ml-service` dir rarely exists, so npm workspace install fails and vite never lands in `node_modules`. Fix: delete `rootPkgData.workspaces` before running `npm install` in `feDir`.

**Why:** workspace hoisting means npm tries to resolve all workspace packages; missing one breaks the whole install.

## Rule 2: Stubs must export callable default + named exports
Rollup's `MISSING_EXPORT` error fires when a stub file exports `{} as any` (not callable) and the importing file does `import { AuthProvider } from './contexts/AuthContext'`. Two requirements:
1. Default export must be a callable component: `const _d: any = ({ children, ...p }: any): any => children ?? null; export default _d;`
2. Named exports must match exactly what's imported — scan all source files for `import { X, Y } from '...<stubname>'` and emit `export const X: any = ...` for each.

**Why:** Rollup performs static export analysis; `export default {} as any` fails named-import validation even when the stub file exists.

**How to apply:** `createNamedExportStub()` helper in deployer scans `feDir` for all named imports, generates proper exports. Also handle `MISSING_EXPORT` errors in the retry loop (add named export on each retry).

## Rule 3: Vite base URL must match the nginx sub-path
Apps served at `/apps/<slug>/` must be built with `base: '/apps/<slug>/'` in vite.config. Without this, `index.html` references `/assets/...` (root) but nginx serves the app under a prefix → JS returns 22-byte API error → blank React app.

**Why:** vite's default `base: '/'` generates absolute asset paths; CSR apps under nginx sub-paths break.

**How to apply:** `scaffoldViteProject()` reads `appDir` basename as slug and injects `base: '/apps/${appSlug}/'` into the generated/patched vite.config.js.

## Rule 4: React Router needs `basename` to match the sub-path
If App.tsx uses `<BrowserRouter>` with no `basename`, React Router matches routes against the full URL (including `/apps/cashflow-prophet/`). Add `basename="/apps/<slug>"` to avoid route mismatches.

**Why:** React Router strips the basename from URL before matching routes; without it, all routes fail on sub-path deployment.

**How to apply:** This is a source-level change — Sirius should generate it, or the deployer should patch App.tsx if it finds a `<BrowserRouter>` without `basename`.

## Rule 5: Screenshot tool does not wait for React paint
External screenshot service captures before React's first render cycle on CSR apps. Blank screenshot ≠ broken app. Verify via nginx access log: look for the JS file request size (should be 100KB+) and URL redirect (React Router redirects prove JS executed).

## Rule 6: Python heredoc / bash escaping gotchas
When running Python via SSH heredoc, avoid: backticks, `${}`, `\s` in strings, regex patterns with quotes. Always SCP Python fix scripts to `/tmp/` and run them directly — avoids all escaping issues.
