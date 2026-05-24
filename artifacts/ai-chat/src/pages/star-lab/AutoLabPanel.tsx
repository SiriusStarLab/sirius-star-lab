import { useState, useEffect } from "react";
import { Loader2, Zap, Check, TrendingUp, ChevronLeft, ChevronRight, RotateCcw, Cpu } from "lucide-react";
import { getApiBase } from "@/lib/api-base";
import { type Project, type ScanHistoryEntry, type RankResult } from "./types";

export function AutoLabPanel({ pin, onSelectProject, onFocusProject }: {
  pin: string;
  projects?: Project[];
  onSelectProject: (p: Project) => void;
  onFocusProject?: (p: Project | null) => void;
}) {
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [approvedProjects, setApprovedProjects] = useState<Project[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [expandedBiz, setExpandedBiz] = useState<number | null>(null);
  const [rankResults, setRankResults] = useState<RankResult[] | null>(null);
  const [isRanking, setIsRanking] = useState(false);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const base = getApiBase();
  const hdrs = () => ({ "Content-Type": "application/json", "x-lab-pin": pin });

  const loadAll = async () => {
    const [pendRes, histRes, statusRes] = await Promise.all([
      fetch(`${base}lab/projects/pending-approval`, { headers: hdrs() }),
      fetch(`${base}lab/scan-history`, { headers: hdrs() }),
      fetch(`${base}lab/auto-scan/status`, { headers: hdrs() }),
    ]);
    if (pendRes.ok) setPendingProjects(await pendRes.json());
    if (histRes.ok) setScanHistory(await histRes.json());
    if (statusRes.ok) { const s = await statusRes.json(); setRunning(s.running); }
  };

  const loadApproved = async () => {
    const res = await fetch(`${base}lab/projects`, { headers: hdrs() });
    if (res.ok) {
      const all: Project[] = await res.json();
      setApprovedProjects(all.filter(p => p.autoCreated === "auto" && p.approvalStatus === "approved")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    }
  };

  useEffect(() => {
    loadAll();
    loadApproved();
    const iv = setInterval(() => { loadAll(); }, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (pendingProjects.length > 0 && focusedId === null) {
      focusProject(pendingProjects[0]);
    }
  }, [pendingProjects.length]);

  const triggerScan = async () => {
    setTriggering(true);
    const res = await fetch(`${base}lab/auto-scan/trigger`, { method: "POST", headers: hdrs() });
    if (res.ok) { setRunning(true); await loadAll(); }
    setTriggering(false);
  };

  const approve = async (project: Project) => {
    setActioningId(project.id);
    await fetch(`${base}lab/projects/${project.id}/approve`, { method: "POST", headers: hdrs() });
    setPendingProjects(prev => prev.filter(p => p.id !== project.id));
    setApprovedProjects(prev => [{ ...project, approvalStatus: "approved" }, ...prev]);
    setActioningId(null);
    onSelectProject({ ...project, approvalStatus: "approved" });
  };

  const reject = async (id: number) => {
    setActioningId(id);
    await fetch(`${base}lab/projects/${id}/reject`, { method: "POST", headers: hdrs() });
    setPendingProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (focusedId === id && updated.length > 0) {
        const oldIdx = prev.findIndex(p => p.id === id);
        const nextProject = updated[Math.min(oldIdx, updated.length - 1)];
        setFocusedId(nextProject.id);
        onFocusProject?.(nextProject);
      } else if (focusedId === id) {
        setFocusedId(null);
        onFocusProject?.(null);
      }
      return updated;
    });
    setRankResults(prev => prev ? prev.filter(r => r.projectId !== id) : null);
    setActioningId(null);
  };

  const focusProject = (p: Project) => {
    setFocusedId(p.id);
    setExpandedBiz(p.id);
    onFocusProject?.(p);
  };

  const navigatePending = (dir: -1 | 1) => {
    if (pendingProjects.length === 0) return;
    const currentIdx = pendingProjects.findIndex(p => p.id === focusedId);
    let nextIdx: number;
    if (currentIdx === -1) {
      nextIdx = dir === 1 ? 0 : pendingProjects.length - 1;
    } else {
      nextIdx = (currentIdx + dir + pendingProjects.length) % pendingProjects.length;
    }
    focusProject(pendingProjects[nextIdx]);
  };

  const rankOpportunities = async () => {
    setIsRanking(true);
    try {
      const res = await fetch(`${base}lab/rank-opportunities`, { method: "POST", headers: hdrs() });
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.rankings || []).sort((a: RankResult, b: RankResult) => a.rank - b.rank);
        setRankResults(sorted);
      }
    } finally {
      setIsRanking(false);
    }
  };

  const latestScan = scanHistory[0];
  const nextScan = latestScan?.startedAt ? new Date(new Date(latestScan.startedAt).getTime() + 24 * 60 * 60 * 1000) : null;
  const timeUntilNext = nextScan ? Math.max(0, nextScan.getTime() - Date.now()) : null;
  const hoursUntil = timeUntilNext !== null ? Math.floor(timeUntilNext / 3600000) : null;
  const minutesUntil = timeUntilNext !== null ? Math.floor((timeUntilNext % 3600000) / 60000) : null;
  const totalCreated = scanHistory.reduce((s, h) => s + (h.projectsCreated || 0), 0);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const capLabel = (p: Project) => {
    const nm = (p.name + " " + p.industry).toLowerCase();
    const isEngineering = ["aerospace","medical","oil","gas","hydrogen","precision","machined","valve","implant","turbine","hydraulic","sensor","marine","nuclear","defence","defense","semiconductor","automotive","motorsport","subsea","offshore","downhole"].some(k => nm.includes(k));
    const isBot = ["bot","automation","automat","autonomous","agent"].some(k => nm.includes(k));
    const isSaaS = ["platform","saas","software","tool","app","dashboard","management"].some(k => nm.includes(k));
    const isLegal = ["legal","law","contract","compliance","gdpr","fca","cqc","regulatory"].some(k => nm.includes(k));
    const isHealth = ["health","care","medical software","nhs","dental","clinic","vet","pharma"].some(k => nm.includes(k));
    if (isEngineering) return { label: "Engineering", color: "hsl(45,100%,55%)" };
    if (isLegal) return { label: "Legal/Compliance", color: "hsl(0,70%,65%)" };
    if (isHealth) return { label: "Healthcare", color: "hsl(155,70%,55%)" };
    if (isBot) return { label: "Bot/Automation", color: "hsl(280,70%,65%)" };
    if (isSaaS) return { label: "SaaS", color: "hsl(193,100%,55%)" };
    return { label: p.industry || "Software", color: "hsl(220,60%,65%)" };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ background: "#F8FAFC" }}>
      <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: running ? "hsl(155,70%,50%)" : "rgba(15,23,42,0.15)", boxShadow: running ? "0 0 8px hsl(155,70%,50%)" : "none" }} />
              <h2 className="text-slate-800 font-bold text-lg">Autonomous Lab</h2>
              {running && <span className="text-xs px-2 py-0.5 rounded-full animate-pulse" style={{ background: "hsla(155,70%,45%,0.12)", color: "hsl(155,70%,55%)" }}>Scanning now…</span>}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.4)", maxWidth: "580px" }}>
              Runs 5 intelligence passes across every sector on Earth — automation bots (legal, healthcare, commerce, trades), SaaS gaps (creative, education, niche SMB, compliance), broken product mining (App Store, Reddit, forums), emerging markets (AI agents, creator economy, climate tech, mental health, Web3), and trend/patent intelligence. Each scan creates new projects for your approval.
            </p>
          </div>
          <button onClick={triggerScan} disabled={running || triggering} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all" style={{ background: running || triggering ? "#F1F5F9" : "hsl(193,100%,32%)", color: "white", border: "1px solid hsla(193,100%,40%,0.3)", opacity: running || triggering ? 0.6 : 1 }}>
            {running || triggering ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><Zap className="w-4 h-4" /> Run Now</>}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Scans Run", value: scanHistory.length, color: "hsl(193,100%,50%)" },
            { label: "Awaiting Approval", value: pendingProjects.length, color: pendingProjects.length > 0 ? "hsl(25,90%,60%)" : "rgba(15,23,42,0.45)" },
            { label: "Total Created", value: totalCreated, color: "hsl(155,70%,50%)" },
            { label: running ? "Status" : "Next Scan", value: running ? "Active" : hoursUntil !== null ? `${hoursUntil}h ${minutesUntil}m` : "Soon", color: running ? "hsl(155,70%,50%)" : "hsl(280,60%,65%)" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.07)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.6)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "rgba(15,23,42,0.5)" }}>What Each Scan Covers</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { pass: "1", label: "Bot & Automation", color: "hsl(280,70%,60%)", sectors: "Legal, HR, Finance, Insurance · Healthcare, NHS, Pharmacy, Vets · Retail, eCommerce, Hospitality, Food · Construction, Agriculture, Logistics, Manufacturing" },
              { pass: "2", label: "SaaS & Software Gaps", color: "hsl(193,100%,50%)", sectors: "Creative & Media tools · Education, corporate L&D · Niche SMBs (funeral directors, pet groomers, tradespeople) · GDPR, ESG, FCA, CQC compliance" },
              { pass: "3", label: "Broken Product Mining", color: "hsl(25,100%,55%)", sectors: "App Store 1-2 star reviews · Reddit complaints (r/smallbusiness, r/entrepreneur) · G2 / Capterra / Trustpilot · UK-specific gaps in US-centric software" },
              { pass: "4", label: "Emerging Markets", color: "hsl(45,100%,55%)", sectors: "AI agent tools · Creator economy · Climate tech · Mental health tech · Web3 infrastructure · Remote work enablement" },
              { pass: "5", label: "Trend & Patent Intelligence", color: "hsl(155,70%,55%)", sectors: "UK/EU regulations coming into force · New patent filings · ProductHunt & YC trends · Job board automation signals · Social media emerging needs" },
            ].map(p => (
              <div key={p.pass} className="flex items-start gap-3 rounded-xl px-3.5 py-2.5" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: p.color + "22", color: p.color }}>{p.pass}</div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: p.color }}>{p.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.6)" }}>{p.sectors}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {pendingProjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "hsl(25,90%,60%)" }} />
                <p className="text-slate-800 font-semibold text-sm">Awaiting Your Approval — {pendingProjects.length} project{pendingProjects.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {pendingProjects.length > 1 && !rankResults && (() => {
                  const currentIdx = pendingProjects.findIndex(p => p.id === focusedId);
                  return (
                    <div className="flex items-center gap-1 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,0.1)" }}>
                      <button onClick={() => navigatePending(-1)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-slate-100" style={{ color: "rgba(15,23,42,0.6)", background: "white" }} title="Previous project"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <span className="px-2 text-xs font-semibold" style={{ color: "rgba(15,23,42,0.5)", background: "white", borderLeft: "1px solid rgba(15,23,42,0.08)", borderRight: "1px solid rgba(15,23,42,0.08)" }}>{currentIdx === -1 ? "—" : currentIdx + 1} / {pendingProjects.length}</span>
                      <button onClick={() => navigatePending(1)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-slate-100" style={{ color: "rgba(15,23,42,0.6)", background: "white" }} title="Next project"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })()}
                <button onClick={rankResults ? () => setRankResults(null) : rankOpportunities} disabled={isRanking} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0" style={{ background: rankResults ? "hsla(155,70%,40%,0.15)" : "hsla(280,70%,55%,0.15)", border: rankResults ? "1px solid hsla(155,70%,50%,0.35)" : "1px solid hsla(280,70%,55%,0.35)", color: rankResults ? "hsl(155,70%,60%)" : "hsl(280,70%,70%)" }}>
                  {isRanking ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ranking…</> : rankResults ? <><RotateCcw className="w-3.5 h-3.5" /> Show All</> : <><TrendingUp className="w-3.5 h-3.5" /> Rank by Opportunity</>}
                </button>
              </div>
            </div>

            {rankResults && (
              <div className="mb-6">
                <div className="rounded-2xl overflow-hidden mb-3" style={{ background: "#FFFFFF", border: "1px solid hsla(280,70%,55%,0.2)" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)", background: "hsla(280,70%,55%,0.08)" }}>
                    <TrendingUp className="w-4 h-4" style={{ color: "hsl(280,70%,65%)" }} />
                    <p className="text-sm font-semibold" style={{ color: "hsl(280,70%,70%)" }}>Opportunity Ranking — Best to Monetise First</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
                    {rankResults.map((r) => {
                      const project = pendingProjects.find(p => p.id === r.projectId);
                      const isActioning = actioningId === r.projectId;
                      const scoreColor = r.monetisationScore >= 80 ? "hsl(155,70%,55%)" : r.monetisationScore >= 60 ? "hsl(45,100%,55%)" : "hsl(25,90%,60%)";
                      const confidenceColor = r.revenueConfidence === "Very High" ? "hsl(155,70%,55%)" : r.revenueConfidence === "High" ? "hsl(193,100%,55%)" : r.revenueConfidence === "Medium" ? "hsl(45,100%,55%)" : "hsl(25,90%,60%)";
                      return (
                        <div key={r.projectId} className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: r.rank === 1 ? "linear-gradient(135deg, hsl(45,100%,50%), hsl(35,100%,45%))" : r.rank === 2 ? "#E8EEF5" : "#F8FAFC", color: r.rank === 1 ? "#000" : "rgba(15,23,42,0.55)", border: r.rank === 1 ? "none" : "1px solid rgba(15,23,42,0.1)", boxShadow: r.rank === 1 ? "0 0 16px hsla(45,100%,50%,0.4)" : "none" }}>#{r.rank}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-800 font-semibold text-sm mb-1 leading-snug">{r.name}</p>
                              <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(15,23,42,0.55)" }}>{r.verdict}</p>
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="rounded-xl p-2.5 text-center" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}>
                                  <p className="text-lg font-bold" style={{ color: scoreColor }}>{r.monetisationScore}%</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(15,23,42,0.6)" }}>Revenue Score</p>
                                </div>
                                <div className="rounded-xl p-2.5 text-center" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}>
                                  <p className="text-sm font-bold" style={{ color: confidenceColor }}>{r.revenueConfidence}</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(15,23,42,0.6)" }}>Confidence</p>
                                </div>
                              </div>
                              {r.keyStrengths?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {r.keyStrengths.map((s: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.45)" }}>{s}</span>)}
                                </div>
                              )}
                              {project && (
                                <div className="flex gap-2">
                                  <button onClick={() => approve(project)} disabled={isActioning} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: isActioning ? "#F1F5F9" : "hsl(155,70%,32%)", color: "white", border: "1px solid hsla(155,70%,40%,0.4)" }}>
                                    {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Approve — Open in Workspace
                                  </button>
                                  <button onClick={() => reject(r.projectId)} disabled={isActioning} className="px-3 py-2 rounded-xl text-xs font-medium transition-all" style={{ background: "hsla(0,70%,50%,0.1)", color: "hsl(0,70%,60%)", border: "1px solid hsla(0,70%,50%,0.2)" }}>Reject</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {!rankResults && (
              <div className="space-y-3">
                {pendingProjects.map(p => {
                  const cap = capLabel(p);
                  const isFocused = focusedId === p.id;
                  const isActioning = actioningId === p.id;
                  return (
                    <div key={p.id} onClick={() => focusProject(p)} className="rounded-2xl overflow-hidden cursor-pointer transition-all" style={{ background: isFocused ? "#FFFFFF" : "#F1F5F9", border: isFocused ? "2px solid hsl(25,90%,60%)" : "1px solid hsla(25,90%,55%,0.2)", boxShadow: isFocused ? "0 0 0 3px hsla(25,90%,60%,0.12)" : "none" }}>
                      <div className="p-4">
                        {isFocused && (
                          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg" style={{ background: "hsla(25,90%,60%,0.1)", border: "1px solid hsla(25,90%,60%,0.2)" }}>
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "hsl(25,90%,60%)" }} />
                            <span className="text-xs font-semibold" style={{ color: "hsl(25,90%,50%)" }}>Reviewing — {pendingProjects.findIndex(x => x.id === p.id) + 1} of {pendingProjects.length}</span>
                            <span className="text-xs ml-auto" style={{ color: "rgba(15,23,42,0.4)" }}>Click ‹ › to navigate</span>
                          </div>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-slate-800 font-semibold text-sm leading-snug">{p.name}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: cap.color + "22", color: cap.color }}>{cap.label}</span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.55)" }}>{p.brief}</p>
                          </div>
                        </div>
                        {isFocused && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={e => { e.stopPropagation(); approve(p); }} disabled={isActioning} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold" style={{ background: isActioning ? "#F1F5F9" : "hsl(155,70%,32%)", color: "white", border: "1px solid hsla(155,70%,40%,0.4)" }}>
                              {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              Approve — Open Workspace
                            </button>
                            <button onClick={e => { e.stopPropagation(); reject(p.id); }} disabled={isActioning} className="px-4 py-2.5 rounded-xl text-xs font-medium" style={{ background: "hsla(0,70%,50%,0.08)", color: "hsl(0,70%,55%)", border: "1px solid hsla(0,70%,50%,0.15)" }}>Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {scanHistory.length > 1 && (
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Scan History</p>
            <div className="space-y-1.5">
              {scanHistory.slice(1).map(scan => (
                <div key={scan.id} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: scan.status === "complete" ? "hsl(155,70%,50%)" : scan.status === "error" ? "hsl(0,70%,55%)" : "hsl(45,100%,55%)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">{formatDate(scan.startedAt)}</p>
                    <p className="text-xs" style={{ color: "rgba(15,23,42,0.6)" }}>{scan.projectsCreated} created · {scan.upgradesApplied} upgraded</p>
                  </div>
                  <span className="text-xs font-mono" style={{ color: "rgba(15,23,42,0.45)" }}>#{scan.scanId}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {scanHistory.length === 0 && !running && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
              <Cpu className="w-8 h-8" style={{ color: "hsl(193,100%,40%)" }} />
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <p className="text-slate-800 font-semibold text-base">Autonomous Lab is ready</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.6)" }}>Scans every 24 hours across 5 intelligence passes — automation bots, SaaS gaps, broken products, emerging markets, and trend intelligence. Every new project found is sent to you for approval.</p>
            </div>
            <button onClick={triggerScan} disabled={triggering} className="px-6 py-3 rounded-xl font-semibold text-sm transition-all" style={{ background: "hsl(193,100%,32%)", color: "white", border: "1px solid hsla(193,100%,40%,0.3)" }}>
              {triggering ? "Starting…" : "Run First Scan Now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
