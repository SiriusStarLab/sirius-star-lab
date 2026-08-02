---
name: Sirius self-healing architecture
description: The 4-step external watchdog and verified deploy system built Aug 2026
---

## What was built

Four components forming a complete self-healing and proactive monitoring system:

### 1. External Watchdog Sidecar Daemon
- Runs as a **systemd service** (`sirius-watchdog`), completely independent of sirius-api
- Script: `/opt/sirius/watchdog/sidecar.py`
- Checks every 60 seconds: disk space, Postgres, PM2 processes, API health, bundle hash
- Writes structured results to `/var/log/sirius/incidents.json`
- Auto-corrective actions: clears /tmp on disk >92%, restarts offline PM2 processes, restarts Postgres
- Logs to `/var/log/sirius/watchdog.log`
- OOMScoreAdjust=-900 so OS never kills it
- Survives total sirius-api crashes — the recovery layer that remains intact

### 2. Verified Deploy Script (hash verification)
- Path: `/opt/sirius/scripts/deploy-bundle.sh`
- The ONLY authorised way to deploy: build → SHA-256 verify → copy → restart → health check → record hash
- **Auto-rolls back** to pre-deploy backup if health check fails
- Records expected hash to `/opt/sirius/watchdog/expected_bundle_hash.txt`
- Logs every deploy to `/var/log/sirius/deploys.log`
- Usage: `/opt/sirius/scripts/deploy-bundle.sh 'reason'`

### 3. Immutable live bundle (read-only lock)
- `/opt/sirius/artifacts/api-server/dist/index.cjs` is locked `chattr +i`
- Direct `cp` commands fail with "Operation not permitted"
- Only deploy-bundle.sh can unlock (chattr -i), copy, and re-lock
- Prevents source/bundle divergence from silent direct patches

### 4. Boot-time system audit + incident injection
- At every session start, incidents.json is read and injected into ownerSystemPrompt
- If disk ≥80%, Postgres offline, API failing, or bundle hash mismatch → WATCHDOG ALERTS block
- If all healthy → WATCHDOG STATUS ✅ block
- Sirius wakes up knowing what broke while she was offline
- STARTUP section now starts with "WATCHDOG FIRST" as step 1

## New tools available to Sirius
- `read_incidents(since_hours?)` — reads full watchdog report
- `check_source_bundle_drift()` — compares live/source/expected hashes

## Key file paths
- `/opt/sirius/watchdog/sidecar.py` — watchdog daemon
- `/opt/sirius/watchdog/expected_bundle_hash.txt` — last verified deploy hash
- `/opt/sirius/scripts/deploy-bundle.sh` — only authorised deploy method
- `/var/log/sirius/incidents.json` — watchdog live state
- `/var/log/sirius/deploys.log` — deploy audit log
- `/var/log/sirius/watchdog.log` — watchdog daemon stdout

## To restart watchdog after reboot
`systemctl restart sirius-watchdog` (it's enabled, auto-starts on boot)

## Why: the gap these close
- Watchdog sees disk full at 2am — Sirius doesn't have to ask
- Bundle hash mismatch caught immediately — no more "fixed but nothing changed"
- Live bundle immutable — silent direct patches impossible
- Sidecar survives crashes — repair capability intact even when app is dead
