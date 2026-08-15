import app from "./app";
import { startPaymentExpiryJob } from "./lib/payment-expiry.js";
import { startHealthMonitor } from "./lib/health-monitor.js";
import { startSelfRepairEngine, restoreCustomToolsIfEmpty, backupCustomTools } from "./lib/self-repair.js";
import { startDependencyMonitor } from "./lib/dependency-monitor.js";
import { startBackupSystem } from "./lib/backup-system.js";
import { startAnubisbridge } from "./lib/anubis-bridge.js";
import { startLabAutoScanner } from "./lib/lab-auto-scan.js";
import { migrateAutomationsTable } from "./lib/sirius-automation.js";
import { startAiArchSweep } from "./lib/ai-arch-sweep.js";
import { startScheduledSweeps } from "./lib/intelligence-sweep.js";

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
  startProjectPipeline();
  // Unblock any cad-pending projects that already have drawing notes
  advanceCadPendingWithNotes().catch(e => console.error("[Pipeline] Migration failed:", e));
  // Investment rule — auto-archive projects over £10,000 investment
  const runRule = () => runInvestmentRule().catch(e => console.error("[Investment Rule] Error:", e));
  setTimeout(runRule, 30_000); // first run 30s after boot
  setInterval(runRule, 6 * 60 * 60 * 1000); // then every 6 hours
  console.log("[Investment Rule] Auto-archive rule started — projects >£10,000 investment archived automatically");
  // Sirius self-management — run automations she has created
  setInterval(() => tickAutomations(), 60_000);
  console.log("[Sirius Automations] Self-management engine started — checking every 60 seconds");
  // Payment expiry — downgrade unconfirmed subscribers after 48 hours
  startPaymentExpiryJob();
  console.log("[Payment Expiry] Watching for unconfirmed payments — auto-expire after 48 hours");
  startHealthMonitor(30);
  // Autonomous self-repair — watches PM2 logs, probes endpoints, restarts if needed, notifies Garry
  startSelfRepairEngine(20);
  restoreCustomToolsIfEmpty().catch(e => console.error("[SelfRepair] Restore failed:", e.message));
  setInterval(() => backupCustomTools(), 6 * 60 * 60 * 1000);
  // Proactive dependency monitor — checks API health every 60 minutes
  startDependencyMonitor(60).catch(e => console.error("[Dependency Monitor] Startup failed:", e));
  // Automated backup system — backs up database and config every 24 hours
  startBackupSystem(24).catch(e => console.error("[Backup System] Startup failed:", e));
  // Sirius-Anubis Intelligence Bridge — predictive failure detection and prevention
  startAnubisbridge();
  // Run DB migration for automations table — adds any missing columns
  migrateAutomationsTable().catch(e => console.error("[Migrations] Automations table:", e));
  // Autonomous Lab Scanner — finds new project opportunities every 24 hours
  // startLabAutoScanner(24); // DISABLED — manual trigger only
  // AI Architecture Sweep — analyses existing projects for AI integration every 24 hours
  // startAiArchSweep(24); // DISABLED — manual trigger only
  // Opportunity Scout / Intelligence Sweep — scans AI landscape every 6 hours
  // startScheduledSweeps(6); // DISABLED — manual trigger only
  console.log("[Sirius] All autonomous scanners active: Lab Auto-Scan, AI Architecture Sweep, Intelligence/Opportunity Scout");
});
