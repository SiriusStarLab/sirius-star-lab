---
name: Sirius disk fill pattern
description: How the server disk fills up and permanent fix applied
---

## The pattern
The nightly S3 backup cron (`/opt/sirius/backup/s3_backup.sh`, runs at 2am) creates a
temp directory + tar file in `/tmp`. If the S3 upload fails or any step exits early,
`set -euo pipefail` causes the script to abort BEFORE the `rm -rf "$TEMP_DIR"` cleanup.
Result: 5–7 GB left in /tmp. Next night another 5–7 GB. Disk fills. Postgres crashes
with "No space left on device". Everything dependent on the DB stops working.

## Fix applied
Added `trap 'rm -rf "$TEMP_DIR" "/tmp/${BACKUP_NAME:-}" 2>/dev/null || true' EXIT`
immediately after `set -euo pipefail`. The trap runs on ANY exit — success, failure,
or signal — so /tmp is always cleaned.

## If disk fills again
1. Check `/tmp` first: `du -sh /tmp/*`
2. Clear obviously large stale files: `rm -rf /tmp/sirius_backup_* /tmp/*.tar.gz /tmp/*.dump`
3. Restart postgres: `systemctl start postgresql`
4. Reload sirius-api: `pm2 reload sirius-api`

**Why:** The DB going down cascades into every Sirius feature stopping — TTS, Lab chat,
image renders, memory, everything. Disk space is the single-point-of-failure.

## Watch the disk
`df -h /` — keep above 3GB free. 49GB total disk. Danger zone is < 2GB free.
