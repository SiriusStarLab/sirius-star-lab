import app from "./app";
import { startPaymentExpiryJob } from "./lib/payment-expiry.js";
import { startHealthMonitor } from "./lib/health-monitor.js";
import { startSelfRepairEngine, restoreCustomToolsIfEmpty, backupCustomTools } from "./lib/self-repair.js";
import { startDependencyMonitor } from "./lib/dependency-monitor.js";
import { startBackupSystem } from "./lib/backup-system.js";

// Global crash protection — log unhandled errors instead of silently crashing
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  setTimeout(() => process.exit(1), 500);
});

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);

  // Payment expiry — downgrade unconfirmed bank transfer subscribers after 48 hours
  startPaymentExpiryJob();
  console.log("[Payment Expiry] Watching for unconfirmed payments — auto-expire after 48 hours");

  // Health monitor — alerts if server/DB/endpoints go down
  startHealthMonitor(10);

  // Self-repair — crash recovery, custom tool backup/restore
  startSelfRepairEngine(20);
  restoreCustomToolsIfEmpty().catch(e => console.error("[SelfRepair] Restore failed:", e.message));
  setInterval(() => backupCustomTools(), 6 * 60 * 60 * 1000);

  // Dependency monitor — checks external APIs are reachable
  startDependencyMonitor(60).catch(e => console.error("[Dependency Monitor] Startup failed:", e));

  // Backup system — database and config backed up every 24 hours
  startBackupSystem(24).catch(e => console.error("[Backup System] Startup failed:", e));

  // Pipeline, automations, investment rule, and Anubis bridge are NOT auto-started.
  // They run only when explicitly triggered via chat or Star Lab.
  console.log("[Sirius] Ready — pipeline/automations/scans run on request only.");
});
