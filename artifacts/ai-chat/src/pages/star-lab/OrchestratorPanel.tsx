import React from "react";
import { Zap, Sparkles, CheckCircle2, AlertCircle, Send } from "lucide-react";
import type { NavMode } from "./types";

type OrchStage = "parse" | "create" | "research" | "analyse" | "build" | "fund" | "market" | "complete";
type OrchStageStatus = "idle" | "running" | "done" | "skipped" | "error";
type OrchStageState = { status: OrchStageStatus; messages: string[]; reason?: string };
type OrchEvent =
  | { type: "stage_start";  stage: OrchStage; label: string; detail: string }
  | { type: "stage_done";   stage: OrchStage; label: string }
  | { type: "stage_skip";   stage: OrchStage; label: string; reason: string }
  | { type: "stage_error";  stage: OrchStage; label: string; error: string }
  | { type: "message";      stage: OrchStage; text: string }
  | { type: "complete";     projectId: number; projectName: string; summary: string; isLinked: boolean }
  | { type: "fatal";        error: string };

const ORCH_STAGES: { id: OrchStage; label: string; icon: React.ReactNode; detail: string }[] = [
  { id: "parse",    label: "Understanding command",    icon: <Sparkles className="w-3.5 h-3.5" />,    detail: "Analysing intent" },
  { id: "create",   label: "Creating project",         icon: <span className="w-3.5 h-3.5 text-xs">📁</span>, detail: "Star Lab Projects" },
  { id: "research", label: "Brief & research",         icon: <span className="w-3.5 h-3.5 text-xs">📖</span>, detail: "Deep Research" },
  { id: "analyse",  label: "AI Architecture",          icon: <span className="w-3.5 h-3.5 text-xs">⚙️</span>, detail: "Tech stack & roadmap" },
  { id: "build",    label: "App Builder",              icon: <span className="w-3.5 h-3.5 text-xs">🚀</span>, detail: "6-agent pipeline" },
  { id: "fund",     label: "Funding Radar",            icon: <span className="w-3.5 h-3.5 text-xs">✅</span>, detail: "UK & global schemes" },
  { id: "market",   label: "Sales & Marketing Plan",   icon: <span className="w-3.5 h-3.5 text-xs">📈</span>, detail: "Unit economics & GTM" },
  { id: "complete", label: "Complete",                 icon: <CheckCircle2 className="w-3.5 h-3.5" />, detail: "Project ready" },
];

const EXAMPLE_COMMANDS = [
  "Build me a SaaS platform for oil & gas asset inspection using AI and computer vision",
  "Create a CRM bot for dental practices with appointment booking and NHS billing",
  "Build an AI-powered hydrogen safety monitoring system for industrial facilities",
  "Create a medical device regulatory compliance tracker for NHS procurement teams",
  "Build an AI pricing calculator for digital services with instant quote generation and Stripe integration",
];

export function OrchestratorPanel({ pin, onOpenProject }: {
  pin: string;
  onOpenProject: (projectId: number) => void;
}) {
  const [command, setCommand] = React.useState("");
  const [phase, setPhase] = React.useState<"idle" | "running" | "complete" | "error">("idle");
  const [stages, setStages] = React.useState<Record<OrchStage, OrchStageState>>(() => {
    const init: Partial<Record<OrchStage, OrchStageState>> = {};
    ORCH_STAGES.forEach(s => { init[s.id] = { status: "idle", messages: [] }; });
    return init as Record<OrchStage, OrchStageState>;
  });
  const [activeStage, setActiveStage] = React.useState<OrchStage | null>(null);
  const [activeDetail, setActiveDetail] = React.useState("");
  const [result, setResult] = React.useState<{ projectId: number; projectName: string; summary: string; isLinked: boolean } | null>(null);
  const [fatalError, setFatalError] = React.useState("");
  const logRef = React.useRef<HTMLDivElement>(null);

  const resetState = () => {
    setPhase("idle");
    setActiveStage(null);
    setActiveDetail("");
    setResult(null);
    setFatalError("");
    const init: Partial<Record<OrchStage, OrchStageState>> = {};
    ORCH_STAGES.forEach(s => { init[s.id] = { status: "idle", messages: [] }; });
    setStages(init as Record<OrchStage, OrchStageState>);
  };

  const updateStage = (stage: OrchStage, patch: Partial<OrchStageState>) => {
    setStages(prev => ({ ...prev, [stage]: { ...prev[stage], ...patch } }));
  };

  const addMessage = (stage: OrchStage, text: string) => {
    setStages(prev => ({ ...prev, [stage]: { ...prev[stage], messages: [...prev[stage].messages, text] } }));
    setTimeout(() => { logRef.current?.scrollTo({ top: 9999, behavior: "smooth" }); }, 50);
  };

  const handleRun = async () => {
    if (!command.trim() || phase === "running") return;
    resetState();
    setCommand(prev => prev);
    setPhase("running");

    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}api/lab/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ command: command.trim() }),
      });
      if (!resp.ok || !resp.body) throw new Error("Server error — could not start orchestration");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw) as OrchEvent;
            if (event.type === "stage_start") {
              setActiveStage(event.stage); setActiveDetail(event.detail);
              updateStage(event.stage, { status: "running" });
            } else if (event.type === "stage_done") {
              updateStage(event.stage, { status: "done" });
            } else if (event.type === "stage_skip") {
              updateStage(event.stage, { status: "skipped", reason: event.reason });
            } else if (event.type === "stage_error") {
              updateStage(event.stage, { status: "error" });
            } else if (event.type === "message") {
              addMessage(event.stage, event.text);
            } else if (event.type === "complete") {
              setResult({ projectId: event.projectId, projectName: event.projectName, summary: event.summary, isLinked: event.isLinked });
              setPhase("complete");
              updateStage("complete", { status: "done" });
            } else if (event.type === "fatal") {
              setFatalError(event.error);
              setPhase("error");
            }
          } catch { }
        }
      }
    } catch (err: any) {
      setFatalError(err.message ?? "Orchestration failed");
      setPhase("error");
    }
  };

  const stageColor = (status: OrchStageStatus, isActive: boolean) => {
    if (status === "done") return "hsl(155,65%,42%)";
    if (status === "error") return "hsl(0,75%,55%)";
    if (status === "skipped") return "hsl(210,15%,60%)";
    if (isActive || status === "running") return "hsl(193,100%,45%)";
    return "hsl(215,20%,75%)";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#F8FAFC" }}>
      <div className="flex-shrink-0 px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(193,100%,45%), hsl(193,100%,35%))" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Command Centre</h2>
            <p className="text-xs text-slate-500">One command — the twin executes the full pipeline</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {phase === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(193,100%,92%), hsl(193,100%,85%))", border: "2px solid hsl(193,100%,75%)" }}>
                <Sparkles className="w-8 h-8" style={{ color: "hsl(193,100%,35%)" }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(155,65%,42%)" }}>
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">Tell Sirius what to build.</h1>
            <p className="text-sm text-slate-500 text-center mb-8 max-w-md leading-relaxed">
              One command — the twin creates the project, writes the research, analyses the architecture, builds the app with 6 autonomous agents, and finds funding. All in one go.
            </p>
            <div className="w-full max-w-2xl mb-6">
              <div className="relative">
                <textarea
                  className="w-full rounded-xl text-sm text-slate-800 resize-none outline-none px-5 py-4 pr-14 leading-relaxed"
                  style={{ background: "#fff", border: "1.5px solid rgba(15,23,42,0.12)", minHeight: 90, boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}
                  placeholder="Build me a SaaS platform for…"
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleRun(); }}
                />
                <button onClick={handleRun} disabled={!command.trim()} className="absolute right-3 bottom-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: command.trim() ? "linear-gradient(135deg, hsl(193,100%,45%), hsl(193,100%,35%))" : "rgba(15,23,42,0.07)" }}>
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">Ctrl+Enter to run</p>
            </div>
            <div className="w-full max-w-2xl">
              <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider">Example commands</p>
              <div className="flex flex-col gap-2">
                {EXAMPLE_COMMANDS.map((ex, i) => (
                  <button key={i} onClick={() => setCommand(ex)} className="text-left text-xs px-4 py-3 rounded-lg transition-all hover:border-opacity-40" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)", color: "rgba(15,23,42,0.55)" }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(phase === "running" || phase === "complete" || phase === "error") && (
          <div className="flex-1 overflow-hidden flex gap-0">
            <div className="flex-shrink-0 w-64 flex flex-col overflow-y-auto px-6 py-6" style={{ borderRight: "1px solid rgba(15,23,42,0.07)" }}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Pipeline</p>
              <div className="flex flex-col gap-1">
                {ORCH_STAGES.map((stg, idx) => {
                  const state = stages[stg.id];
                  const isActive = activeStage === stg.id;
                  const color = stageColor(state.status, isActive);
                  return (
                    <div key={stg.id}>
                      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all" style={{ background: isActive ? "hsla(193,100%,45%,0.06)" : state.status === "done" ? "hsla(155,65%,42%,0.04)" : "transparent", border: isActive ? "1px solid hsla(193,100%,45%,0.2)" : "1px solid transparent" }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all" style={{ background: state.status === "done" ? "hsl(155,65%,42%)" : isActive ? "hsl(193,100%,45%)" : state.status === "error" ? "hsl(0,75%,55%)" : state.status === "skipped" ? "rgba(15,23,42,0.1)" : "rgba(15,23,42,0.07)" }}>
                          {state.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            : state.status === "running" || isActive ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            : state.status === "error" ? <span className="text-white text-xs font-bold">!</span>
                            : state.status === "skipped" ? <span style={{ color: "rgba(15,23,42,0.3)", fontSize: 10 }}>—</span>
                            : <span className="text-xs font-medium" style={{ color: "rgba(15,23,42,0.3)" }}>{idx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color }}>{stg.label}</p>
                          {isActive && activeDetail && <p className="text-xs text-slate-400 truncate mt-0.5">{activeDetail}</p>}
                          {state.status === "skipped" && state.reason && <p className="text-xs text-slate-400 truncate mt-0.5">{state.reason}</p>}
                        </div>
                      </div>
                      {idx < ORCH_STAGES.length - 1 && <div className="ml-6 w-px h-2 my-0.5" style={{ background: "rgba(15,23,42,0.08)" }} />}
                    </div>
                  );
                })}
              </div>
              {phase === "complete" && result && (
                <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                  <button onClick={() => onOpenProject(result.projectId)} className="w-full py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, hsl(193,100%,42%), hsl(193,100%,32%))" }}>Open Project →</button>
                  <button onClick={() => { resetState(); }} className="w-full py-2 rounded-lg text-xs font-medium mt-2 transition-all hover:bg-slate-100" style={{ color: "rgba(15,23,42,0.45)" }}>New Command</button>
                </div>
              )}
              {phase === "error" && (
                <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                  <button onClick={() => { resetState(); }} className="w-full py-2.5 rounded-lg text-xs font-semibold transition-all" style={{ background: "hsla(0,75%,55%,0.08)", color: "hsl(0,75%,45%)", border: "1px solid hsla(0,75%,55%,0.2)" }}>Try Again</button>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-6 py-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                <div className="flex items-center gap-2">
                  {phase === "running" && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(193,100%,45%)" }} />}
                  {phase === "complete" && <div className="w-2 h-2 rounded-full" style={{ background: "hsl(155,65%,42%)" }} />}
                  {phase === "error" && <div className="w-2 h-2 rounded-full" style={{ background: "hsl(0,75%,55%)" }} />}
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {phase === "running" ? "Live Output" : phase === "complete" ? "Complete" : "Error"}
                  </p>
                </div>
                {command && <p className="text-xs text-slate-400 mt-1 italic truncate max-w-xl">"{command}"</p>}
              </div>

              <div ref={logRef} className="flex-1 overflow-y-auto px-6 py-4">
                {fatalError && (
                  <div className="flex items-start gap-3 p-4 rounded-lg mb-4" style={{ background: "hsla(0,75%,55%,0.06)", border: "1px solid hsla(0,75%,55%,0.15)" }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(0,75%,55%)" }} />
                    <p className="text-sm text-red-700">{fatalError}</p>
                  </div>
                )}
                {phase === "complete" && result && (
                  <div className="flex items-start gap-3 p-4 rounded-lg mb-6" style={{ background: "hsla(155,65%,42%,0.06)", border: "1px solid hsla(155,65%,42%,0.2)" }}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(155,65%,42%)" }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">"{result.projectName}" is ready</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{result.summary}</p>
                    </div>
                  </div>
                )}
                {ORCH_STAGES.map(stg => {
                  const state = stages[stg.id];
                  if (state.status === "idle") return null;
                  const isRunning = state.status === "running" || activeStage === stg.id;
                  return (
                    <div key={stg.id} className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-4 h-4 rounded flex-shrink-0" style={{ color: state.status === "done" ? "hsl(155,65%,42%)" : state.status === "error" ? "hsl(0,75%,55%)" : state.status === "skipped" ? "rgba(15,23,42,0.3)" : "hsl(193,100%,45%)" }}>
                          {stg.icon}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: state.status === "done" ? "hsl(155,65%,42%)" : state.status === "error" ? "hsl(0,75%,55%)" : state.status === "skipped" ? "rgba(15,23,42,0.3)" : "hsl(193,100%,45%)" }}>
                          {stg.label}{state.status === "skipped" ? " — skipped" : state.status === "error" ? " — error" : state.status === "done" ? " ✓" : ""}
                        </p>
                        {isRunning && <div className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" style={{ color: "hsl(193,100%,45%)" }} />}
                      </div>
                      {state.messages.map((msg, i) => (
                        <div key={i} className="flex items-start gap-2 ml-6 mb-1">
                          <span className="text-xs" style={{ color: "rgba(15,23,42,0.25)", marginTop: 2 }}>›</span>
                          <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.6)" }}>{msg}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {phase === "running" && (
                  <div className="flex items-center gap-2 mt-2 ml-6">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(193,100%,45%)", animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                    <span className="text-xs" style={{ color: "rgba(15,23,42,0.4)" }}>Sirius is working…</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
