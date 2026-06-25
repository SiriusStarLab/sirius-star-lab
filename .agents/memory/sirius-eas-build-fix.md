---
name: Sirius EAS build fix — pnpm monorepo
description: Root cause of all EAS build failures for sirius-mobile in the pnpm monorepo, and the fixes that made builds 58 and 59 succeed.
---

# EAS Build Fix for pnpm monorepo

## The Core Problem
EAS detects the uploaded archive as a "yarn workspace" and runs `yarn install --frozen-lockfile` from the workspace root. Without a `workspaces` field in root `package.json`, yarn only installs the 4 root-level devDeps (prettier, typescript, etc.). `expo` is never installed. All subsequent phases fail: `expo config`, `expo doctor`, and `expo prebuild`.

## The Fix That Worked
Add `"workspaces": ["artifacts/sirius-mobile"]` to root `package.json`. This tells yarn to install sirius-mobile's dependencies (including expo) when running from the workspace root. Builds 58 and 59 both succeeded with `Status: FINISHED, Duration: ~5min`.

**Why:** EAS server runs `yarn install` at the archive root. Only with `workspaces` declared does yarn traverse into `artifacts/sirius-mobile/` and install its packages.

**How to apply:** The field already exists in root `package.json`. Never remove it. If adding new Expo apps to the monorepo, add their path to this array too.

## Supporting Fixes (all still needed)
- `"main": "./expo-entry.js"` in `sirius-mobile/package.json` — prevents expo-router auto-registration in PREPARE_PROJECT phase
- `expo-entry.js` at `artifacts/sirius-mobile/expo-entry.js` — contains `import 'expo-router/entry'`
- `ios/` directory pre-generated locally via `expo prebuild --platform ios --no-install` and NOT excluded in `.easignore` — EAS server reuses it via "reusing /ios"
- `EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1` flags needed when running `eas build` from Replit (no git repo)
- Root `preinstall` script bypasses pnpm check when `EAS_BUILD=true`

## EAS Submit Issue (unresolved as of build 59)
`eas submit --platform ios --profile production --latest` fails consistently with:
"Something went wrong when submitting your app to Apple App Store Connect."

- Fails for builds 58 and 59
- Fails with both old and new eas-cli (npx eas-cli@20.3.0)
- Not a duplicate binary issue (fresh build numbers)
- NOT resolved by upgrading EAS CLI
- Likely cause: App Store Connect version state (app was rejected; version may need manual action) OR ASC API key LP8276AT5Z revoked/expired

**Workaround:** Download IPA from EAS dashboard and upload via Transporter on Mac, OR manually attach build in App Store Connect UI.

## Build commands (from Replit workspace root)
```bash
cd artifacts/sirius-mobile
EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile production --non-interactive
```
