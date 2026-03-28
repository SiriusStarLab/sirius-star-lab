import app from "./app";
import { startScheduledSweeps } from "./routes/intelligence-sweep.js";
import { startLabAutoScanner } from "./lib/lab-auto-scan.js";
import { startAiArchSweep } from "./lib/ai-arch-sweep.js";
import { startProjectPipeline } from "./lib/project-pipeline.js";
import { tickAutomations } from "./lib/sirius-automation.js";
import { runInvestmentRule } from "./lib/investment-rule.js";
import { startProactiveEngine } from "./lib/sirius-proactive.js";

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
  startScheduledSweeps(6);
  startLabAutoScanner(24);
  startAiArchSweep(24);
  startProjectPipeline();
  // Investment rule — auto-archive projects over £10,000 investment
  const runRule = () => runInvestmentRule().catch(e => console.error("[Investment Rule] Error:", e));
  setTimeout(runRule, 30_000); // first run 30s after boot
  setInterval(runRule, 6 * 60 * 60 * 1000); // then every 6 hours
  console.log("[Investment Rule] Auto-archive rule started — projects >£10,000 investment archived automatically");
  // Sirius self-management — run automations she has created
  setInterval(() => tickAutomations(), 60_000);
  console.log("[Sirius Automations] Self-management engine started — checking every 60 seconds");
  // Sirius proactive engine — autonomously completes projects without being asked
  startProactiveEngine(15);
});
