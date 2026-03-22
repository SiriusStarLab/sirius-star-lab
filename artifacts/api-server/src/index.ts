import app from "./app";
import { startScheduledSweeps } from "./routes/intelligence-sweep.js";
import { startLabAutoScanner } from "./lib/lab-auto-scan.js";

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
});
