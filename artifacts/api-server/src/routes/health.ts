import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { runHealthCheck, getLastReport, getHistory } from "../lib/health-monitor.js";
import { runRegressionSuite, getRecentRuns, type RegressionRun, type TestResult } from "../lib/regression-runner.js";

const router: IRouter = Router();

// /health and /healthz — both return ok (mobile app + monitoring use /health)
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/full", async (_req, res) => {
  const last = getLastReport();
  if (last) {
    res.json({ cached: true, history: getHistory().slice(0, 10), latest: last });
  } else {
    const report = await runHealthCheck();
    res.json({ cached: false, history: getHistory().slice(0, 10), latest: report });
  }
});

router.get("/health/run", async (_req, res) => {
  try {
    const report = await runHealthCheck();
    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Regression endpoints ──────────────────────────────────────────────────────

/** GET /health/regression — last N runs as JSON */
router.get("/health/regression", async (_req, res) => {
  try {
    const runs = await getRecentRuns(20);
    res.json({ ok: true, runs });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** POST /health/regression/run?token=… — trigger a run (secured) */
router.post("/health/regression/run", async (req: Request, res: Response) => {
  if (!DEPLOY_TOKEN || req.query.token !== DEPLOY_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const trigger = (req.query.trigger as string) || "manual";
    const result = await runRegressionSuite(trigger);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

/** GET /health/status?token=… — bookmarkable HTML dashboard */
router.get("/health/status", async (req: Request, res: Response) => {
  if (!DEPLOY_TOKEN || req.query.token !== DEPLOY_TOKEN) {
    return res.status(403).send("<h1>403 Forbidden</h1>");
  }

  let runs: RegressionRun[] = [];
  try { runs = await getRecentRuns(30); } catch {}

  const latest = runs[0];

  function badge(passed: boolean, critical = false) {
    return passed
      ? `<span class="badge ok">✓ PASS</span>`
      : `<span class="badge ${critical ? "crit" : "fail"}">✗ ${critical ? "CRITICAL" : "FAIL"}</span>`;
  }

  function overallIcon(run: RegressionRun) {
    if (run.failed === 0) return "✅";
    if (run.results.some((r: TestResult) => r.critical && !r.passed)) return "🔴";
    return "🟡";
  }

  function ago(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  const latestCards = latest
    ? latest.results
        .map(
          (r: TestResult) => `
      <div class="card ${r.passed ? "card-ok" : r.critical ? "card-crit" : "card-fail"}">
        <div class="card-header">
          ${badge(r.passed, r.critical)}
          <span class="test-name">${r.name}</span>
          <span class="timing">${r.durationMs}ms</span>
        </div>
        <div class="card-detail">${escHtml(r.detail || "")}</div>
        ${r.error ? `<div class="card-error">${escHtml(r.error)}</div>` : ""}
      </div>`
        )
        .join("")
    : `<div class="no-data">No regression runs yet. Click Run Tests to start.</div>`;

  const historyRows = runs
    .map(
      (r, i) => `
    <tr class="${r.failed > 0 ? (r.results.some((t: TestResult) => t.critical && !t.passed) ? "row-crit" : "row-fail") : "row-ok"}">
      <td>${overallIcon(r)} ${r.failed === 0 ? "All passed" : `${r.failed} failed`}</td>
      <td>${r.passed}/${r.total}</td>
      <td>${(r.durationMs / 1000).toFixed(1)}s</td>
      <td>${ago(r.runAt)}</td>
      <td class="trigger-cell">${escHtml(r.trigger)}</td>
    </tr>`
    )
    .join("");

  // Sparkline: last 30 runs, left=oldest, right=newest
  const sparkDots = runs
    .slice()
    .reverse()
    .map((r) => {
      const pct = ((r.passed / r.total) * 100).toFixed(0);
      const col = r.failed === 0 ? "#22c55e" : r.results.some((t: TestResult) => t.critical && !t.passed) ? "#ef4444" : "#f59e0b";
      return `<div class="spark-bar" style="height:${pct}%;background:${col}" title="${r.passed}/${r.total} — ${ago(r.runAt)}"></div>`;
    })
    .join("");

  const overallStatus = !latest
    ? { label: "No data", color: "#6b7280", icon: "⚪" }
    : latest.failed === 0
    ? { label: "All systems go", color: "#22c55e", icon: "✅" }
    : latest.results.some((r: TestResult) => r.critical && !r.passed)
    ? { label: "Critical failure", color: "#ef4444", icon: "🔴" }
    : { label: "Degraded", color: "#f59e0b", icon: "🟡" };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sirius — Regression Dashboard</title>
<style>
  :root { --bg:#080c1a; --surface:#0f1629; --border:#1e2d50; --text:#e2e8f0; --muted:#64748b; --ok:#22c55e; --warn:#f59e0b; --crit:#ef4444; --blue:#3b82f6; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;padding:24px}
  a{color:var(--blue);text-decoration:none}

  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:12px}
  .header-left h1{font-size:1.4rem;font-weight:700;letter-spacing:-.01em}
  .header-left p{color:var(--muted);font-size:.85rem;margin-top:4px}
  .status-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;border:1px solid;font-weight:600;font-size:.9rem}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:32px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;transition:border-color .2s}
  .card-ok{border-left:3px solid var(--ok)}
  .card-fail{border-left:3px solid var(--warn)}
  .card-crit{border-left:3px solid var(--crit)}
  .card-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
  .test-name{font-weight:600;font-size:.9rem;flex:1}
  .timing{color:var(--muted);font-size:.75rem;font-family:monospace}
  .card-detail{color:var(--muted);font-size:.8rem;font-family:monospace;word-break:break-all;line-height:1.5}
  .card-error{color:var(--crit);font-size:.75rem;font-family:monospace;margin-top:6px;word-break:break-all}

  .badge{font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:.05em}
  .badge.ok{background:#14532d;color:#86efac}
  .badge.fail{background:#451a03;color:#fbbf24}
  .badge.crit{background:#450a0a;color:#fca5a5}

  .section{margin-bottom:32px}
  .section-title{font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}

  .spark{display:flex;align-items:flex-end;gap:3px;height:48px;padding:0 2px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px}
  .spark-bar{flex:1;border-radius:2px;min-height:4px;transition:opacity .2s}
  .spark-bar:hover{opacity:.7}

  table{width:100%;border-collapse:collapse;font-size:.85rem}
  th{text-align:left;color:var(--muted);font-size:.75rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:8px 12px;border-bottom:1px solid var(--border)}
  td{padding:8px 12px;border-bottom:1px solid var(--border)}
  .row-ok td{opacity:.75}
  .row-fail td{background:#1c1205}
  .row-crit td{background:#1a0505}
  .trigger-cell{font-family:monospace;font-size:.75rem;color:var(--muted)}

  .run-btn{background:#1d4ed8;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:.9rem;font-weight:600;cursor:pointer;transition:background .15s}
  .run-btn:hover{background:#2563eb}
  .run-btn:disabled{opacity:.5;cursor:not-allowed}

  .meta{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:24px}
  .meta-item{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 16px}
  .meta-item .val{font-size:1.4rem;font-weight:700}
  .meta-item .lbl{font-size:.75rem;color:var(--muted);margin-top:2px}

  .refresh-note{color:var(--muted);font-size:.75rem;margin-top:24px}
  .no-data{color:var(--muted);font-style:italic;padding:16px}
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>🛸 Sirius Regression Dashboard</h1>
    <p>${latest ? `Last run: ${ago(latest.runAt)} — ${latest.trigger}` : "No runs recorded yet"}</p>
  </div>
  <span class="status-pill" style="border-color:${overallStatus.color};color:${overallStatus.color}">
    ${overallStatus.icon} ${overallStatus.label}
  </span>
</div>

${latest ? `
<div class="meta">
  <div class="meta-item"><div class="val" style="color:var(--ok)">${latest.passed}</div><div class="lbl">Passed</div></div>
  <div class="meta-item"><div class="val" style="color:${latest.failed > 0 ? "var(--crit)" : "var(--muted)"}">${latest.failed}</div><div class="lbl">Failed</div></div>
  <div class="meta-item"><div class="val">${(latest.durationMs / 1000).toFixed(1)}s</div><div class="lbl">Duration</div></div>
  <div class="meta-item"><div class="val">${runs.length}</div><div class="lbl">Total runs</div></div>
</div>` : ""}

<div class="section">
  <div class="section-title">Latest run — test results</div>
  <div class="grid">${latestCards}</div>
</div>

<div class="section">
  <div class="section-title">Pass rate — last ${runs.length} runs</div>
  <div class="spark">${sparkDots || '<span style="color:var(--muted);font-size:.8rem">No history yet</span>'}</div>
</div>

<div class="section">
  <div class="section-title">Run history</div>
  ${runs.length > 0 ? `
  <table>
    <thead><tr><th>Result</th><th>Score</th><th>Duration</th><th>When</th><th>Trigger</th></tr></thead>
    <tbody>${historyRows}</tbody>
  </table>` : '<div class="no-data">No runs yet.</div>'}
</div>

<div class="section">
  <div class="section-title">Manual trigger</div>
  <button class="run-btn" id="runBtn" onclick="runTests()">▶ Run Tests Now</button>
  <div id="runStatus" style="margin-top:12px;color:var(--muted);font-size:.85rem"></div>
</div>

<p class="refresh-note">Auto-refreshes every 60 seconds. Token stays in the URL.</p>

<script>
function runTests() {
  const btn = document.getElementById('runBtn');
  const status = document.getElementById('runStatus');
  btn.disabled = true;
  btn.textContent = '⏳ Running…';
  status.textContent = 'Tests in progress — this takes about 90 seconds…';

  const token = new URLSearchParams(window.location.search).get('token') || '';
  fetch('/health/regression/run?token=' + encodeURIComponent(token) + '&trigger=manual', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
      status.textContent = d.passed + '/' + d.total + ' passed in ' + (d.durationMs/1000).toFixed(1) + 's. Refreshing…';
      setTimeout(() => location.reload(), 1500);
    })
    .catch(e => {
      status.textContent = 'Error: ' + e.message;
      btn.disabled = false;
      btn.textContent = '▶ Run Tests Now';
    });
}

// Auto-refresh every 60s
let countdown = 60;
setInterval(() => {
  countdown--;
  if (countdown <= 0) location.reload();
}, 1000);
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default router;
