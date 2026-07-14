---
name: Sirius EAS build fix — pnpm monorepo
description: Root cause of all EAS build failures for sirius-mobile in the pnpm monorepo, and the fixes that made builds succeed.
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
- **NEVER run without ios/ directory** — pod install will fail trying to generate codegen from scratch on EAS

## react-native-worklets is REQUIRED (do not remove)
`react-native-reanimated@4.x` has `react-native-worklets>=0.5.0` as a peer dependency AND a Podspec dependency. If worklets is not in package.json, pod install fails with "Unknown error. See logs of the Install pods build phase." Even yarn only shows a warning, CocoaPods actually errors. **Always keep `react-native-worklets: ^0.5.1` in package.json.**

## Stale ios/build/generated/ios/ causes pod install failure
If `ios/build/generated/ios/` was generated with react-native-worklets installed and then worklets is removed (or vice versa), the stale codegen files cause pod install to fail. Fix: delete `ios/` and run `npx expo prebuild --platform ios --no-install` to regenerate cleanly.

## Running EAS from Replit vs Kamatera server
- Running from Replit: Archive is 327MB (node_modules included despite .easignore). Compression takes >2 minutes, hitting tool timeout. Background processes (nohup, setsid) die when shell exits.
- **Running from Kamatera server (recommended):** Archive is 6.8MB (node_modules excluded by EAS default). Uploads in 1 second. Reliable.

### Kamatera build command
```bash
# 1. Create clean archive on Replit
cd /home/runner/workspace && tar \
  --exclude='artifacts/sirius-mobile/node_modules' \
  --exclude='artifacts/sirius-mobile/android' \
  --exclude='artifacts/sirius-mobile/.expo' \
  --exclude='.git' --exclude='.local' --exclude='node_modules' \
  --exclude='artifacts/fitstack-crm' --exclude='artifacts/ai-chat' \
  --exclude='artifacts/api-server' --exclude='artifacts/mockup-sandbox' \
  --exclude='artifacts/sirius-promo' --exclude='artifacts/new-dimensions' \
  --exclude='attached_assets' \
  -czf /tmp/sirius-mobile-src.tar.gz package.json artifacts/sirius-mobile/

# 2. SCP to server
scp -i .local/sirius_deploy.key -o StrictHostKeyChecking=no -P 2222 \
  /tmp/sirius-mobile-src.tar.gz root@185.247.118.196:/tmp/sirius-mobile-src.tar.gz

# 3. SSH in and run
ssh -i .local/sirius_deploy.key -o StrictHostKeyChecking=no -p 2222 root@185.247.118.196 "
  rm -rf /tmp/eas-build && mkdir -p /tmp/eas-build
  cd /tmp/eas-build && tar xzf /tmp/sirius-mobile-src.tar.gz
  cd /tmp/eas-build/artifacts/sirius-mobile
  yarn install
  export EXPO_TOKEN=\$EXPO_TOKEN  # interpolated on Replit side
  export EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 EAS_BUILD_SKIP_LOCKFILE_CHECK=1
  nohup eas build --platform ios --profile production --non-interactive > /tmp/eas-build.log 2>&1 &
"
```

## EAS Submit Issue (unresolved as of build 59)
`eas submit --platform ios --profile production --latest` fails consistently with:
"Something went wrong when submitting your app to Apple App Store Connect."

**Workaround:** Download IPA from EAS dashboard and upload via Transporter on Mac, OR manually attach build in App Store Connect UI.

## Build commands (from Replit workspace root)
```bash
cd artifacts/sirius-mobile
EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile production --non-interactive
```
