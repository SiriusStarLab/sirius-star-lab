// Backup System — triggers periodic DB + config backups
import { exec } from "child_process";

export async function startBackupSystem(intervalHours = 24): Promise<void> {
  const runBackup = () => {
    exec("/opt/sirius/backup/s3_backup.sh >> /var/log/sirius_backup.log 2>&1", (err) => {
      if (err) console.error("[BackupSystem] Backup failed:", err.message);
      else console.log("[BackupSystem] Backup completed");
    });
  };
  // Run first backup after 1 hour, then on interval
  setTimeout(runBackup, 60 * 60 * 1000);
  setInterval(runBackup, intervalHours * 60 * 60 * 1000);
  console.log(`[BackupSystem] Started — backing up every ${intervalHours} hours`);
}
