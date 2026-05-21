import React from "react";
import { getApiBase } from "@/lib/api-base";

type AuditStatus = "idle" | "running" | "pass" | "warn" | "fail";
interface AuditCheck {
  id: string;
  label: string;
  group: "infrastructure" | "data" | "intelligence" | "compliance";
  status: AuditStatus;
  detail: string;
  ms?: number;
}

export function SystemAuditPanel({ pin }: { pin: string }) {
  const API = getApiBase();
  const [checks, setChecks] = React.useState<AuditCheck[]>([
    { id: "api",        label: "API Server",              group: "infrastructure", status: "idle", detail: "Not tested" },
    { id: "pipeline",   label: "Build Pipeline",           group: "infrastructure", status: "idle", detail: "Not tested" },
    { id: "autoscan",   label: "Auto-Scan",                group: "infrastructure", status: "idle", detail: "Not tested" },
    { id: "projects",   label: "Projects Database",        group: "data",           status: "idle", detail: "Not tested" },
    { id: "brain",      label: "Sirius Brain",             group: "data",           status: "idle", detail: "Not tested" },
    { id: "errors",     label: "Error Log",                group: "data",           status: "idle", detail: "Not tested" },
    { id: "aiarch",     label: "AI Architecture Sweep",    group: "intelligence",   status: "idle", detail: "Not tested" },
    { id: "funding",    label: "Funding Radar",            group: "intelligence",   status: "idle", detail: "Not tested" },
    { id: "investment", label: "Investment Rule (£10k)",   group: "compliance",     status: "idle", detail: "Not tested" },
    { id: "appbuilder", label: "App Builder",              group: "intelligence",   status: "idle", detail: "Not tested" },
  ]);
  const [running, setRunning] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<Date | null>(null);
  const [expandedGroup, setExpandedGroup] = React.useState<string | null>(null);

  const updateCheck = React.useCallback((id: string, patch: Partial<AuditCheck>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const runAudit = React.useCallback(async () => {
    if (running) return;
    setRunning(true);
    setChecks(prev => prev.map(c => ({ ...c, status: "running" as AuditStatus, detail: "Checking…", ms: undefined })));

    const headers = { "x-lab-pin": pin, "Content-Type": "application/json" };

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/pipeline/status`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) updateCheck("api", { status: "pass", detail: `Responding — ${ms}ms`, ms });
        else updateCheck("api", { status: "fail", detail: `HTTP ${r.status} — ${ms}ms`, ms });
      } catch { updateCheck("api", { status: "fail", detail: "Unreachable" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/pipeline/status`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const current = d.currentlyBuilding?.name ?? "idle";
          const queued = d.queued ?? 0;
          const ready = Array.isArray(d.launchReady) ? d.launchReady.length : 0;
          updateCheck("pipeline", { status: "pass", detail: `Building: ${current} | Queued: ${queued} | Launch-ready: ${ready}`, ms });
        } else {
          updateCheck("pipeline", { status: "fail", detail: `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("pipeline", { status: "fail", detail: "Pipeline unreachable" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/auto-scan/status`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const isRunning = d.running ?? d.active ?? false;
          updateCheck("autoscan", { status: isRunning ? "pass" : "warn", detail: isRunning ? "Auto-scan running — scanning continuously every 24 hours" : "Auto-scan stopped", ms });
        } else {
          updateCheck("autoscan", { status: "warn", detail: `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("autoscan", { status: "warn", detail: "Could not reach auto-scan" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/projects?limit=2000&offset=0`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const all = Array.isArray(d) ? d : [];
          const total = all.length;
          const archived = all.filter((p: any) => p.status === "archived").length;
          const launchReady = all.filter((p: any) => p.launchStatus === "launch-ready").length;
          updateCheck("projects", { status: "pass", detail: `${total.toLocaleString()} total | ${launchReady} launch-ready | ${archived} archived`, ms });
        } else {
          updateCheck("projects", { status: "fail", detail: `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("projects", { status: "fail", detail: "Database unreachable" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/brain`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const memCount = typeof d.memories === "string"
            ? d.memories.split("\n").filter(Boolean).length
            : (d.memoryCount ?? "?");
          updateCheck("brain", { status: "pass", detail: `Accessible — ${memCount} memories stored`, ms });
        } else {
          updateCheck("brain", { status: "fail", detail: `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("brain", { status: "fail", detail: "Brain unreachable" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/sirius-errors`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const errors = Array.isArray(d) ? d : (d.errors ?? []);
          const unresolved = errors.filter((e: any) => !e.resolved).length;
          updateCheck("errors", {
            status: unresolved === 0 ? "pass" : unresolved < 5 ? "warn" : "fail",
            detail: unresolved === 0 ? "No unresolved errors" : `${unresolved} unresolved error${unresolved === 1 ? "" : "s"}`,
            ms,
          });
        } else {
          updateCheck("errors", { status: "warn", detail: `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("errors", { status: "warn", detail: "Could not read error log" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/ai-arch-sweep/status`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const linked = d.linked ?? "?";
          const total = d.total ?? "?";
          const unswept = d.unswept ?? 0;
          const lastSweep = d.lastSweepAt ? new Date(d.lastSweepAt).toLocaleString("en-GB") : "Never";
          updateCheck("aiarch", { status: "pass", detail: `${linked}/${total} projects linked | ${unswept} unswept — last sweep: ${lastSweep}`, ms });
        } else {
          updateCheck("aiarch", { status: "warn", detail: `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("aiarch", { status: "warn", detail: "Sweep status unavailable" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/projects?limit=200&offset=0`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const all = Array.isArray(d) ? d : (d.projects ?? []);
          const withFunding = all.filter((p: any) => p.fundingAnalysis).length;
          const missing = all.filter((p: any) => !p.fundingAnalysis && p.status !== "archived").length;
          updateCheck("funding", {
            status: missing > 20 ? "warn" : "pass",
            detail: `${withFunding} analysed | ${missing} active projects not yet analysed`,
            ms,
          });
        } else {
          updateCheck("funding", { status: "warn", detail: `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("funding", { status: "warn", detail: "Funding data unavailable" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/investment-rule/run`, {
          method: "POST",
          headers,
          body: JSON.stringify({ dry_run: true }),
        });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          updateCheck("investment", {
            status: "pass",
            detail: `Assessed: ${d.assessed ?? "?"} | Archived: ${d.archived ?? 0} | Skipped (no cost yet): ${d.skipped ?? "?"}`,
            ms,
          });
        } else {
          updateCheck("investment", { status: "warn", detail: `Rule returned HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("investment", { status: "warn", detail: "Could not reach investment rule" }); }
    })();

    await (async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${API}lab/app-builder/sessions`, { headers });
        const ms = Date.now() - t0;
        if (r.ok) {
          const d = await r.json();
          const sessions = Array.isArray(d) ? d : (d.sessions ?? []);
          const active = sessions.filter((s: any) => s.status === "building" || s.status === "pending").length;
          updateCheck("appbuilder", { status: "pass", detail: `${sessions.length} sessions total | ${active} currently active`, ms });
        } else {
          updateCheck("appbuilder", { status: r.status === 404 ? "pass" : "warn", detail: r.status === 404 ? "No sessions yet — builder ready" : `HTTP ${r.status}`, ms });
        }
      } catch { updateCheck("appbuilder", { status: "warn", detail: "Builder status unavailable" }); }
    })();

    setRunning(false);
    setLastRun(new Date());
  }, [running, pin, API, updateCheck]);

  React.useEffect(() => { runAudit(); }, []);

  const passed = checks.filter(c => c.status === "pass").length;
  const warned = checks.filter(c => c.status === "warn").length;
  const failed = checks.filter(c => c.status === "fail").length;
  const done = checks.filter(c => c.status !== "running" && c.status !== "idle").length;
  const score = done > 0 ? Math.round((passed / done) * 100) : null;

  const groups: { id: string; label: string; icon: string; color: string }[] = [
    { id: "infrastructure", label: "Infrastructure", icon: "🖥️", color: "hsl(220,80%,55%)" },
    { id: "data",           label: "Data & Memory",  icon: "🧠", color: "hsl(280,70%,55%)" },
    { id: "intelligence",   label: "Intelligence",    icon: "🔭", color: "hsl(155,70%,42%)" },
    { id: "compliance",     label: "Compliance",      icon: "⚖️", color: "hsl(25,90%,55%)" },
  ];

  const statusColor: Record<AuditStatus, string> = {
    idle: "#94a3b8", running: "#60a5fa", pass: "#22c55e", warn: "#f59e0b", fail: "#ef4444",
  };
  const statusIcon: Record<AuditStatus, string> = {
    idle: "○", running: "…", pass: "✓", warn: "⚠", fail: "✗",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>System Audit</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Live health check across every Sirius Star Lab subsystem
            {lastRun && (
              <span style={{ marginLeft: 10, color: "#94a3b8" }}>
                Last run: {lastRun.toLocaleTimeString("en-GB")}
              </span>
            )}
          </p>
        </div>
        <button onClick={runAudit} disabled={running} style={{ background: running ? "#e2e8f0" : "hsl(220,80%,55%)", color: running ? "#94a3b8" : "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
          {running ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>↻</span>Running…</> : "↻ Run Audit"}
        </button>
      </div>

      {score !== null && (
        <div style={{ background: score >= 80 ? "hsl(155,60%,97%)" : score >= 60 ? "hsl(45,100%,97%)" : "hsl(0,80%,97%)", border: `1.5px solid ${score >= 80 ? "hsl(155,70%,42%)" : score >= 60 ? "hsl(45,90%,55%)" : "hsl(0,75%,55%)"}`, borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: score >= 80 ? "hsl(155,70%,42%)" : score >= 60 ? "hsl(45,90%,55%)" : "hsl(0,75%,55%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", flexShrink: 0 }}>
            {score}%
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>
              {score >= 80 ? "All systems operational" : score >= 60 ? "Minor issues detected" : "Attention required"}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <span style={{ color: "#22c55e" }}>✓ {passed} passed</span>
              {warned > 0 && <span style={{ color: "#f59e0b" }}>⚠ {warned} warnings</span>}
              {failed > 0 && <span style={{ color: "#ef4444" }}>✗ {failed} failed</span>}
              {running && <span style={{ color: "#60a5fa" }}>… checking {checks.filter(c => c.status === "running").length} more</span>}
            </div>
          </div>
          <div style={{ width: 120, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
            <div style={{ width: `${score}%`, height: "100%", background: score >= 80 ? "hsl(155,70%,42%)" : score >= 60 ? "hsl(45,90%,55%)" : "hsl(0,75%,55%)", transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}

      {groups.map(group => {
        const groupChecks = checks.filter(c => c.group === group.id);
        const groupPassed = groupChecks.filter(c => c.status === "pass").length;
        const groupFailed = groupChecks.filter(c => c.status === "fail").length;
        const groupWarn = groupChecks.filter(c => c.status === "warn").length;
        const allDone = groupChecks.every(c => c.status !== "running" && c.status !== "idle");
        const groupColor = groupFailed > 0 ? "#ef4444" : groupWarn > 0 ? "#f59e0b" : allDone ? "#22c55e" : "#94a3b8";
        const isExpanded = expandedGroup === group.id || groupFailed > 0 || groupWarn > 0;
        return (
          <div key={group.id} style={{ marginBottom: 12, border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "white" }}>
            <button onClick={() => setExpandedGroup(prev => prev === group.id ? null : group.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>{group.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", flex: 1 }}>{group.label}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{allDone ? `${groupPassed}/${groupChecks.length} passed` : "Checking…"}</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: groupColor, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{isExpanded ? "▲" : "▼"}</span>
            </button>
            {isExpanded && (
              <div style={{ borderTop: "1px solid #f1f5f9" }}>
                {groupChecks.map((check, idx) => (
                  <div key={check.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 48px", borderTop: idx > 0 ? "1px solid #f8fafc" : undefined, background: check.status === "fail" ? "hsl(0,80%,99%)" : check.status === "warn" ? "hsl(45,100%,99%)" : "white" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: statusColor[check.status], width: 16, textAlign: "center", animation: check.status === "running" ? "pulse 1.2s ease-in-out infinite" : undefined }}>{statusIcon[check.status]}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", flex: 1 }}>{check.label}</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{check.detail}</span>
                    {check.ms !== undefined && <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{check.ms}ms</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 20, padding: "16px 20px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Run Investment Rule", onClick: () => {
              fetch(`${API}lab/investment-rule/run`, { method: "POST", headers: { "x-lab-pin": pin, "Content-Type": "application/json" } })
                .then(r => r.json()).then(d => alert(`Investment rule complete — assessed: ${d.assessed}, archived: ${d.archived}, skipped: ${d.skipped}`))
                .catch(() => alert("Investment rule failed"));
            }},
            { label: "Re-run Audit", onClick: runAudit },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
