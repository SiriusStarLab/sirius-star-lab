import app from "./app";
import { startProjectPipeline, advanceCadPendingWithNotes } from "./lib/project-pipeline.js";
import { tickAutomations } from "./lib/sirius-automation.js";
import { runInvestmentRule } from "./lib/investment-rule.js";
import { startPaymentExpiryJob } from "./lib/payment-expiry.js";
import { startHealthMonitor } from "./lib/health-monitor.js";
import { startSelfRepairEngine } from "./lib/self-repair.js";

// Global crash protection — log unhandled errors instead of silently crashing
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  // Give the logger a moment to flush, then exit so the process manager can restart
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
  console.log("[Sirius] Lean mode active — market scans & proactive enrichment are manual-only. Use chat commands to trigger.");
  // Payment expiry — downgrade unconfirmed subscribers after 48 hours
  startPaymentExpiryJob();
  console.log("[Payment Expiry] Watching for unconfirmed payments — auto-expire after 48 hours");
  startHealthMonitor(30);
  // Autonomous self-repair — watches PM2 logs, probes endpoints, restarts if needed, notifies Garry
  startSelfRepairEngine(5);
});
