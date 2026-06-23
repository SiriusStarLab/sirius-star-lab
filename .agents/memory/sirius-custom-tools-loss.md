---
name: Sirius custom tools data loss root cause
description: Why sirius_custom_tools was empty and how it's now protected
---

## Root cause
The `sirius_custom_tools` table on Kamatera had `sequence is_called: false` — meaning no row was ever inserted in the current DB instance. The user's tools (mind mapping, virtual test rig, web connection) existed in a previous database that was replaced during the Kamatera server migration. Self-repair.ts has NO DELETE operations and was NOT the cause.

## Fix deployed
- `backupCustomTools()` in self-repair.ts: exports to `/opt/sirius/backups/custom-tools.json` every 6 hours
- `restoreCustomToolsIfEmpty()`: called on startup — reads backup and re-inserts if table is empty
- Credit balance errors, memory failures, Dependency Monitor added to BENIGN patterns to prevent false self-repair restart triggers

**Why:** Any future DB migration or reset will automatically restore tools from the JSON backup on next startup.

**How to apply:** If tools go missing again, check `/opt/sirius/backups/custom-tools.json` first. If the file has data, restart the server — restore runs automatically.
