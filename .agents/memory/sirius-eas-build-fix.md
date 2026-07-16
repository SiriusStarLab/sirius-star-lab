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

The script at `.local/eas-build.sh` handles everything: archive → SCP → yarn install on server → EAS build.

**Note:** `scp` uses `-P` (capital) for port, `ssh` uses `-p` (lowercase). The script has `SCP_OPTS` and `SSH_OPTS` as separate vars for this reason. Do not merge them or the SCP step fails silently.

**Note:** EXPO_TOKEN is NOT stored in the server's ecosystem.config.json or PM2 env. It lives only in Replit secrets. The script passes `$EXPO_TOKEN` from Replit into the remote SSH command. This works as long as Replit's secret is set.

### Manual steps if script fails
```bash
# 1. Archive
cd /home/runner/workspace
tar \
  --exclude='artifacts/sirius-mobile/node_modules' \
  --exclude='artifacts/sirius-mobile/android' \
  --exclude='artifacts/sirius-mobile/.expo' \
  --exclude='.git' --exclude='.local' --exclude='node_modules' \
  --exclude='artifacts/fitstack-crm' --exclude='artifacts/ai-chat' \
  --exclude='artifacts/api-server' --exclude='artifacts/mockup-sandbox' \
  --exclude='artifacts/sirius-promo' --exclude='artifacts/new-dimensions' \
  --exclude='attached_assets' \
  -czf /tmp/sirius-mobile-src.tar.gz package.json artifacts/sirius-mobile/

# 2. SCP
scp -i .local/sirius_deploy.key -o StrictHostKeyChecking=no -P 2222 \
  /tmp/sirius-mobile-src.tar.gz root@185.247.118.196:/tmp/sirius-mobile-src.tar.gz

# 3. SSH + build
ssh -i .local/sirius_deploy.key -o StrictHostKeyChecking=no -p 2222 root@185.247.118.196 "
  rm -rf /tmp/eas-build && mkdir /tmp/eas-build
  cd /tmp/eas-build && tar xzf /tmp/sirius-mobile-src.tar.gz
  cd /tmp/eas-build/artifacts/sirius-mobile
  yarn install
  export EXPO_TOKEN=\$EXPO_TOKEN
  export EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 EAS_BUILD_SKIP_LOCKFILE_CHECK=1
  nohup eas build --platform ios --profile production --non-interactive > /tmp/eas-build.log 2>&1 &
  sleep 30 && cat /tmp/eas-build.log
"
```

### Check build status (from Replit)
```bash
cd artifacts/sirius-mobile && eas build:list --platform ios --limit 1 --non-interactive
```

---

## Core Setup (must-have, never touch)

### workspaces field in root package.json
Add `"workspaces": ["artifacts/sirius-mobile"]` to root `package.json`. EAS server runs `yarn install` at the archive root; only with `workspaces` declared does it traverse into sirius-mobile and install its packages.

### react-native-worklets is REQUIRED
`react-native-reanimated@4.x` peer/podspec requires `react-native-worklets>=0.5.0`. Without it, pod install silently fails. **Always keep `react-native-worklets: ^0.5.1` in package.json.** Do not remove it.

### ios/ directory
Must be pre-generated with `npx expo prebuild --platform ios --no-install`. Run this any time you add/remove a native package or after deleting ios/. Do NOT include `ios/build/` in .easignore.

### EAS CLI flags
```
EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 EAS_BUILD_SKIP_LOCKFILE_CHECK=1
```
All required when building outside a git repo.

---

## Stale ios/ fix (if pod install fails)
If pod install fails with "Unknown error", the ios/ was generated with a different package set. Fix:
```bash
cd artifacts/sirius-mobile
rm -rf ios/
npx expo prebuild --platform ios --no-install
# Then re-run eas-build.sh
```

---

## App Store Submission
`eas submit --platform ios --latest` gets queued but historically never processes (sits IN_QUEUE forever) for this app. **Fallback:** download IPA from expo.dev dashboard → upload via Transporter on Mac or drag into App Store Connect → TestFlight.
