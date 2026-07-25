---
name: Sirius EAS build fix — pnpm monorepo
description: Root cause of all EAS build failures for sirius-mobile in the pnpm monorepo, and the standard build procedure.
---

# EAS Build — Standard Procedure

## ALWAYS build from Kamatera server (not Replit)

Running from Replit causes a 327MB archive (node_modules included despite .easignore) that takes >2min to compress, hitting the tool timeout. Replit also kills background processes when the shell exits. Kamatera server produces a 6.8MB archive and uploads in 1 second.

### One-liner from Replit workspace root
```bash
bash .local/eas-build.sh
```

The script at `.local/eas-build.sh` handles everything: archive → SCP → write EXPO_TOKEN to server → yarn install → git init at archive root → EAS build → EAS submit.

**Note:** `scp` uses `-P` (capital) for port, `ssh` uses `-p` (lowercase). The script has `SCP_OPTS` and `SSH_OPTS` as separate vars. Do not merge them.

**Note:** EXPO_TOKEN is NOT stored in the server ecosystem. The script writes it to `/tmp/eas-expo-token` on the server as a separate SSH step BEFORE the main single-quoted build block. The single-quoted block then reads it with `$(cat /tmp/eas-expo-token)`.

**Note:** `eas build` only builds — it does NOT submit to App Store Connect. The script also runs `eas submit --platform ios --id $BUILD_ID` after the build. If you forget this step, the build sits on EAS servers and never appears in ASC (not even as "Processing").

---

## Critical SSH heredoc rule

The main SSH build block MUST use **single quotes** for the heredoc delimiter:
```bash
ssh $SSH_OPTS "$SERVER" 'set -e
  ...commands...
'
```

**Why:** Double-quoted heredocs expand `$(...)` and `$VAR` LOCALLY on Replit before sending to the server. This causes `$(git rev-parse HEAD)` to return the Replit workspace commit, and `$EXPO_TOKEN` to embed the literal token value in the command string. Single quotes prevent this — everything runs on the server as written.

**How to pass EXPO_TOKEN:** Write it to a server file first:
```bash
ssh $SSH_OPTS "$SERVER" "echo '$EXPO_TOKEN' > /tmp/eas-expo-token && chmod 600 /tmp/eas-expo-token"
```
Then in the single-quoted block: `export EXPO_TOKEN=$(cat /tmp/eas-expo-token)`

---

## Critical git setup rule

Git init must happen at the **archive root** (`/tmp/eas-build`), not at the project subdirectory. EAS looks for git from the working directory upward — if git is only in `artifacts/sirius-mobile/`, EAS may not find it and will prompt to run `git init` (which fails in non-interactive mode).

Also MUST add safe.directory BEFORE git init or git refuses to use the repo:
```bash
git config --global --add safe.directory /tmp/eas-build
cd /tmp/eas-build
git init -q
git config user.email "build@sirius-ai.live"
git config user.name "Sirius Build"
git add -A
git commit -q -m "sirius-build-$(date +%s)"
```

Do NOT use `EAS_NO_VCS=1` or `EAS_SKIP_AUTO_FINGERPRINT=1` — these cause EAS to reuse the previous build artifact silently (returns same build ID, never uploads new binary to ASC).

---

## Core Setup (must-have, never touch)

### workspaces field in root package.json
Add `"workspaces": ["artifacts/sirius-mobile"]` to root `package.json`. EAS server runs `yarn install` at the archive root; only with `workspaces` declared does it traverse into sirius-mobile and install its packages.

### react-native-worklets is REQUIRED
`react-native-reanimated@4.x` peer/podspec requires `react-native-worklets>=0.5.0`. Without it, pod install silently fails. **Always keep `react-native-worklets: ^0.5.1` in package.json.**

### ios/ directory
Must be pre-generated with `npx expo prebuild --platform ios --no-install`. Run this any time you add/remove a native package or after deleting ios/. Do NOT include `ios/build/` in .easignore.

---

## Stale ios/ fix (if pod install fails)
```bash
cd artifacts/sirius-mobile
rm -rf ios/
npx expo prebuild --platform ios --no-install
# Then re-run eas-build.sh
```

---

## App Store Submission
`eas submit` runs AFTER `eas build --no-wait`. The build script handles this automatically by extracting the build UUID from the build log and passing it to `eas submit --id`. Without the submit step, the build is invisible in App Store Connect.
