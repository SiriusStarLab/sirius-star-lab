import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Loader2, Sparkles, Check, Bot, Package, Copy, CheckCircle2, AlertCircle, Banknote, CreditCard, ShoppingBag, BarChart3, ArrowRight, FileSearch, Hammer, ClipboardList, X, Plus, ChevronDown, Download, Send, Zap, Trash2 } from 'lucide-react';
import { getApiBase } from '@/lib/api-base';
import { type Project } from './types';
import { LabMarkdown } from './LabMarkdown';

// ─── Revenue Hub Panel ──────────────────────────────────────────────────────

export type RevenueTab = "dashboard" | "reports" | "commissions" | "blueprints";
type RevenueStats = {
  grandTotalGBP: string;
  reports: { totalGBP: string; count: number };
  commissions: { totalGBP: string; count: number };
  blueprints: { totalGBP: string; count: number };
  recentReports: any[];
  recentCommissions: any[];
};
type CommissionEstimate = {
  feasible: boolean; summary: string; timeline: string;
  depositAmount: number; totalEstimate: number; depositPercent: number;
  deliverables: string[]; techStack: string[]; risks: string[]; notes: string;
};

export function RevenuePanel({ pin, projects, initialTab, pendingReportSession, pendingCommissionSession }: {
  pin: string;
  projects: Project[];
  initialTab?: RevenueTab;
  pendingReportSession?: string;
  pendingCommissionSession?: string;
}) {
  const base = getApiBase();
  const [tab, setTab] = useState<RevenueTab>(initialTab || "dashboard");
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Report form
  const [repSector, setRepSector] = useState("");
  const [repQuestion, setRepQuestion] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repLoading, setRepLoading] = useState(false);
  const [repError, setRepError] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Report delivery (after Stripe redirect)
  const [deliverySession, setDeliverySession] = useState(pendingReportSession || "");
  const [deliveryContent, setDeliveryContent] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  // Commission form
  const [comStep, setComStep] = useState<"form" | "estimate" | "done">("form");
  const [comName, setComName] = useState("");
  const [comEmail, setComEmail] = useState("");
  const [comTitle, setComTitle] = useState("");
  const [comDesc, setComDesc] = useState("");
  const [comType, setComType] = useState("software");
  const [comEstimate, setComEstimate] = useState<CommissionEstimate | null>(null);
  const [comEstimating, setComEstimating] = useState(false);
  const [comCheckoutLoading, setComCheckoutLoading] = useState(false);
  const [comError, setComError] = useState("");
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);

  // Blueprint form
  const [bpProjectId, setBpProjectId] = useState<number | null>(null);
  const [bpTitle, setBpTitle] = useState("");
  const [bpDesc, setBpDesc] = useState("");
  const [bpCategory, setBpCategory] = useState("General");
  const [bpPrice, setBpPrice] = useState("199");
  const [bpListing, setBpListing] = useState(false);
  const [bpError, setBpError] = useState("");
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);
  const [bpCheckoutLoading, setBpCheckoutLoading] = useState<number | null>(null);

  const headers = { "Content-Type": "application/json", "x-lab-pin": pin };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${base}lab/revenue/stats`, { headers });
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
    setStatsLoading(false);
  }, [base, pin]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(`${base}lab/revenue/report/list`, { headers });
      if (res.ok) setReports(await res.json());
    } catch { /* ignore */ }
    setReportsLoading(false);
  }, [base, pin]);

  const loadCommissions = useCallback(async () => {
    setCommissionsLoading(true);
    try {
      const res = await fetch(`${base}lab/revenue/commissions`, { headers });
      if (res.ok) setCommissions(await res.json());
    } catch { /* ignore */ }
    setCommissionsLoading(false);
  }, [base, pin]);

  const loadBlueprints = useCallback(async () => {
    setBlueprintsLoading(true);
    try {
      const res = await fetch(`${base}lab/revenue/blueprints`, { headers });
      if (res.ok) setBlueprints(await res.json());
    } catch { /* ignore */ }
    setBlueprintsLoading(false);
  }, [base, pin]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === "reports") loadReports(); }, [tab, loadReports]);
  useEffect(() => { if (tab === "commissions") loadCommissions(); }, [tab, loadCommissions]);
  useEffect(() => { if (tab === "blueprints") loadBlueprints(); }, [tab, loadBlueprints]);

  // Auto-deliver report if arriving from Stripe
  useEffect(() => {
    if (pendingReportSession && !delivering && !deliveryContent) {
      setTab("reports");
      setDeliverySession(pendingReportSession);
      deliverReport(pendingReportSession);
    }
  }, [pendingReportSession]);

  // Auto-confirm commission if arriving from Stripe
  useEffect(() => {
    if (pendingCommissionSession) {
      setTab("commissions");
      confirmCommission(pendingCommissionSession);
    }
  }, [pendingCommissionSession]);

  const deliverReport = async (sessionId: string) => {
    if (delivering) return;
    setDelivering(true);
    setDeliveryContent("");
    setDeliveryError("");
    try {
      const res = await fetch(`${base}lab/revenue/report/deliver?session_id=${sessionId}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDeliveryError(err.error || "Failed to deliver report");
        setDelivering(false);
        return;
      }
      // Check if it's SSE stream or cached JSON
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setDeliveryContent(data.report || "");
        loadStats(); loadReports();
        setDelivering(false);
        return;
      }
      // SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.text) setDeliveryContent(prev => prev + msg.text);
            if (msg.done) { loadStats(); loadReports(); }
            if (msg.error) setDeliveryError(msg.error);
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) { setDeliveryError(e.message); }
    setDelivering(false);
  };

  const confirmCommission = async (sessionId: string) => {
    try {
      await fetch(`${base}lab/revenue/commission/confirm?session_id=${sessionId}`, { headers });
      loadCommissions(); loadStats();
    } catch { /* ignore */ }
  };

  const buyReport = async () => {
    if (!repSector.trim() || !repQuestion.trim()) { setRepError("Please fill in sector and question"); return; }
    setRepLoading(true); setRepError("");
    try {
      const res = await fetch(`${base}lab/revenue/report/checkout`, {
        method: "POST", headers,
        body: JSON.stringify({ sector: repSector, question: repQuestion, email: repEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setRepError(data.error || "Failed to create checkout"); setRepLoading(false); return; }
      window.location.href = data.checkoutUrl;
    } catch (e: any) { setRepError(e.message); setRepLoading(false); }
  };

  const getEstimate = async () => {
    if (!comTitle.trim() || !comDesc.trim()) { setComError("Please fill in title and description"); return; }
    setComEstimating(true); setComError("");
    try {
      const res = await fetch(`${base}lab/revenue/commission/estimate`, {
        method: "POST", headers,
        body: JSON.stringify({ title: comTitle, description: comDesc, type: comType }),
      });
      const data = await res.json();
      if (!res.ok) { setComError(data.error || "Estimation failed"); setComEstimating(false); return; }
      setComEstimate(data);
      setComStep("estimate");
    } catch (e: any) { setComError(e.message); }
    setComEstimating(false);
  };

  const payDeposit = async () => {
    if (!comEstimate || !comName.trim() || !comEmail.trim()) { setComError("Name and email required"); return; }
    setComCheckoutLoading(true); setComError("");
    try {
      const res = await fetch(`${base}lab/revenue/commission/checkout`, {
        method: "POST", headers,
        body: JSON.stringify({
          customerName: comName, customerEmail: comEmail,
          title: comTitle, description: comDesc, type: comType,
          depositAmount: comEstimate.depositAmount,
          totalEstimate: comEstimate.totalEstimate,
          aiEstimate: JSON.stringify(comEstimate),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setComError(data.error || "Checkout failed"); setComCheckoutLoading(false); return; }
      window.location.href = data.checkoutUrl;
    } catch (e: any) { setComError(e.message); setComCheckoutLoading(false); }
  };

  const listBlueprint = async () => {
    if (!bpProjectId || !bpTitle.trim() || !bpDesc.trim()) { setBpError("Fill in all fields"); return; }
    const priceAmount = Math.round(parseFloat(bpPrice) * 100);
    if (isNaN(priceAmount) || priceAmount < 19900 || priceAmount > 99900) { setBpError("Price must be £199–£999"); return; }
    setBpListing(true); setBpError("");
    try {
      const res = await fetch(`${base}lab/revenue/blueprints`, {
        method: "POST", headers,
        body: JSON.stringify({ labProjectId: bpProjectId, title: bpTitle, description: bpDesc, category: bpCategory, priceAmount }),
      });
      const data = await res.json();
      if (!res.ok) { setBpError(data.error || "Failed to list blueprint"); setBpListing(false); return; }
      setBpProjectId(null); setBpTitle(""); setBpDesc(""); setBpPrice("199");
      loadBlueprints();
    } catch (e: any) { setBpError(e.message); }
    setBpListing(false);
  };

  const buyBlueprint = async (blueprintId: number) => {
    setBpCheckoutLoading(blueprintId);
    try {
      const res = await fetch(`${base}lab/revenue/blueprints/${blueprintId}/checkout`, {
        method: "POST", headers, body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) return;
      window.location.href = data.checkoutUrl;
    } catch { /* ignore */ }
    setBpCheckoutLoading(null);
  };

  const statusColor = (s: string) => {
    if (s === "delivered" || s === "paid") return "hsl(155,70%,45%)";
    if (s === "pending") return "hsl(45,100%,50%)";
    if (s === "failed" || s === "cancelled") return "hsl(0,70%,55%)";
    return "rgba(15,23,42,0.45)";
  };

  const TABS = [
    { id: "dashboard" as RevenueTab, label: "Dashboard", icon: BarChart3 },
    { id: "reports" as RevenueTab, label: "Intelligence Reports", icon: FileSearch },
    { id: "commissions" as RevenueTab, label: "Commission a Build", icon: Hammer },
    { id: "blueprints" as RevenueTab, label: "Blueprint Store", icon: ClipboardList },
  ];

  const approvedProjects = projects.filter(p => p.approvalStatus === "approved" || !p.autoCreated);

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(155,70%,30%), hsl(155,70%,45%))" }}>
            <Banknote className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-lg leading-none">Revenue Hub</h2>
            <p className="text-slate-400 text-xs mt-0.5">Three live income streams — funding the mission</p>
          </div>
          {!statsLoading && stats && (
            <div className="ml-auto text-right">
              <p className="text-slate-800 font-bold text-xl leading-none">£{stats.grandTotalGBP}</p>
              <p className="text-slate-400 text-[10px] mt-0.5 font-mono">TOTAL EARNED</p>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? "hsla(155,70%,45%,0.15)" : "transparent",
                  color: active ? "hsl(155,70%,50%)" : "rgba(15,23,42,0.4)",
                  border: `1px solid ${active ? "hsla(155,70%,45%,0.3)" : "transparent"}`,
                }}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="space-y-6 max-w-2xl">
            {statsLoading ? (
              <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading revenue data…</span></div>
            ) : stats ? (
              <>
                {/* Revenue cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Intelligence Reports", amount: `£${stats.reports.totalGBP}`, count: stats.reports.count, color: "hsl(280,70%,55%)", icon: FileSearch, desc: "£49 per report" },
                    { label: "Commissions", amount: `£${stats.commissions.totalGBP}`, count: stats.commissions.count, color: "hsl(45,100%,50%)", icon: Hammer, desc: "Deposit payments" },
                    { label: "Blueprints", amount: `£${stats.blueprints.totalGBP}`, count: stats.blueprints.count, color: "hsl(193,100%,45%)", icon: ClipboardList, desc: "£199–£999 each" },
                  ].map(card => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className="rounded-2xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}20` }}>
                          <Icon className="w-4 h-4" style={{ color: card.color }} />
                        </div>
                        <p className="text-slate-800 font-bold text-2xl leading-none">{card.amount}</p>
                        <p className="text-slate-500 text-xs mt-1">{card.count} sale{card.count !== 1 ? "s" : ""}</p>
                        <p className="text-slate-300 text-[10px] mt-2 font-mono">{card.label.toUpperCase()}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Income stream quick-launch */}
                <div>
                  <p className="text-slate-300 text-[10px] font-mono mb-3 tracking-widest">LAUNCH AN INCOME STREAM</p>
                  <div className="space-y-2">
                    {[
                      { label: "Sell a Market Intelligence Report", sub: "£49 per report — AI generates in 90 seconds, zero delivery cost", tab: "reports" as RevenueTab, color: "hsl(280,70%,55%)" },
                      { label: "Take a Commission", sub: "Client describes what they want built, pays 50% deposit upfront", tab: "commissions" as RevenueTab, color: "hsl(45,100%,50%)" },
                      { label: "List a Blueprint for Sale", sub: "Package an approved Lab project as a £199–£999 digital product", tab: "blueprints" as RevenueTab, color: "hsl(193,100%,45%)" },
                    ].map(item => (
                      <button key={item.tab} onClick={() => setTab(item.tab)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                        style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-800 font-semibold text-sm">{item.label}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{item.sub}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent activity */}
                {(stats.recentReports.length > 0 || stats.recentCommissions.length > 0) && (
                  <div>
                    <p className="text-slate-300 text-[10px] font-mono mb-3 tracking-widest">RECENT ACTIVITY</p>
                    <div className="space-y-2">
                      {[...stats.recentReports.map((r: any) => ({ type: "Report", label: r.sector, status: r.status, amount: "£49", date: r.createdAt })),
                        ...stats.recentCommissions.map((c: any) => ({ type: "Commission", label: c.projectTitle, status: c.status, amount: `£${(c.depositAmount / 100).toFixed(0)}`, date: c.createdAt }))]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 6)
                        .map((item, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.6)" }}>{item.type}</span>
                            <span className="text-slate-500 text-sm flex-1 truncate">{item.label}</span>
                            <span className="text-xs font-mono" style={{ color: statusColor(item.status) }}>{item.status}</span>
                            <span className="text-slate-800 font-semibold text-sm">{item.amount}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-sm">Could not load revenue data.</p>
            )}
          </div>
        )}

        {/* ── INTELLIGENCE REPORTS ── */}
        {tab === "reports" && (
          <div className="space-y-6 max-w-2xl">
            {/* Delivered report content */}
            {(delivering || deliveryContent || deliveryError) && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "#F1F5F9", border: "1px solid hsla(280,70%,55%,0.2)" }}>
                <div className="flex items-center gap-2">
                  {delivering && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(280,70%,55%)" }} />}
                  {!delivering && deliveryContent && <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />}
                  {!delivering && deliveryError && <AlertCircle className="w-4 h-4" style={{ color: "hsl(0,70%,55%)" }} />}
                  <span className="text-slate-800 font-semibold text-sm">
                    {delivering ? "Generating your report…" : deliveryError ? "Report error" : "Report delivered"}
                  </span>
                  {deliveryContent && (
                    <button onClick={() => { navigator.clipboard.writeText(deliveryContent); }}
                      className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-500 transition-colors">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
                {deliveryError && <p className="text-sm" style={{ color: "hsl(0,70%,55%)" }}>{deliveryError}</p>}
                {deliveryContent && (
                  <div className="max-h-[50vh] overflow-y-auto pr-2 prose prose-invert prose-sm max-w-none text-slate-700 text-sm leading-relaxed">
                    <LabMarkdown content={deliveryContent} streaming={false} />
                  </div>
                )}
              </div>
            )}

            {/* New report form */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div>
                <p className="text-slate-800 font-bold text-base">Sell a Market Intelligence Report</p>
                <p className="text-slate-400 text-sm mt-1">Customer pays £49. Sirius generates a comprehensive 15-page AI market analysis in 90 seconds. Zero marginal cost.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block font-mono">SECTOR / MARKET</label>
                  <input value={repSector} onChange={e => setRepSector(e.target.value)} placeholder="e.g. Hydrogen fuel cell maintenance, UK dental software, precision machining for aerospace…"
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
                    style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block font-mono">RESEARCH QUESTION</label>
                  <textarea value={repQuestion} onChange={e => setRepQuestion(e.target.value)} rows={3}
                    placeholder="What specific question does this report need to answer? e.g. 'What are the top 5 gaps in UK hydrogen maintenance software and who are the likely buyers?'"
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all resize-none"
                    style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block font-mono">CUSTOMER EMAIL (OPTIONAL)</label>
                  <input value={repEmail} onChange={e => setRepEmail(e.target.value)} type="email" placeholder="customer@company.com"
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
                    style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                </div>
                {repError && <p className="text-sm" style={{ color: "hsl(0,70%,55%)" }}>{repError}</p>}
                <button onClick={buyReport} disabled={repLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(280,70%,45%), hsl(280,70%,35%))", color: "white" }}>
                  {repLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {repLoading ? "Creating checkout…" : "Buy Intelligence Report — £49"}
                </button>
              </div>
            </div>

            {/* Past reports */}
            <div>
              <p className="text-slate-300 text-[10px] font-mono mb-3 tracking-widest">REPORT SALES</p>
              {reportsLoading ? (
                <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
              ) : reports.length === 0 ? (
                <p className="text-slate-300 text-sm">No reports sold yet. Your first sale will appear here.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 text-sm font-medium truncate">{r.sector}</p>
                        <p className="text-slate-400 text-xs truncate mt-0.5">{r.question}</p>
                      </div>
                      <span className="text-xs font-mono" style={{ color: statusColor(r.status) }}>{r.status}</span>
                      <span className="text-slate-800 font-semibold text-sm">£49</span>
                      {r.status === "paid" && (
                        <button onClick={() => { setDeliverySession(r.stripeSessionId); deliverReport(r.stripeSessionId); }}
                          className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "hsla(280,70%,55%,0.15)", color: "hsl(280,70%,65%)" }}>
                          Generate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMMISSIONS ── */}
        {tab === "commissions" && (
          <div className="space-y-6 max-w-2xl">
            {/* Commission form */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div>
                <p className="text-slate-800 font-bold text-base">Commission a Build</p>
                <p className="text-slate-400 text-sm mt-1">Client describes what they want. Sirius estimates scope and cost. They pay 50% deposit. You deliver. Project enters Star Lab automatically.</p>
              </div>

              {comStep === "form" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block font-mono">CLIENT NAME</label>
                      <input value={comName} onChange={e => setComName(e.target.value)} placeholder="Jane Smith"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none"
                        style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block font-mono">CLIENT EMAIL</label>
                      <input value={comEmail} onChange={e => setComEmail(e.target.value)} type="email" placeholder="client@company.com"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none"
                        style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block font-mono">PROJECT TITLE</label>
                    <input value={comTitle} onChange={e => setComTitle(e.target.value)} placeholder="e.g. Custom inventory bot for Shopify"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none"
                      style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block font-mono">PROJECT TYPE</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["software", "bot", "engineering", "research"].map(t => (
                        <button key={t} onClick={() => setComType(t)}
                          className="py-2 rounded-xl text-xs font-medium capitalize transition-all"
                          style={{
                            background: comType === t ? "hsla(45,100%,50%,0.15)" : "#EEF2F8",
                            color: comType === t ? "hsl(45,100%,55%)" : "rgba(15,23,42,0.45)",
                            border: `1px solid ${comType === t ? "hsla(45,100%,50%,0.3)" : "rgba(15,23,42,0.1)"}`,
                          }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block font-mono">PROJECT DESCRIPTION</label>
                    <textarea value={comDesc} onChange={e => setComDesc(e.target.value)} rows={4}
                      placeholder="Describe exactly what needs to be built. The more detail, the better the AI estimate…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none resize-none"
                      style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                  </div>
                  {comError && <p className="text-sm" style={{ color: "hsl(0,70%,55%)" }}>{comError}</p>}
                  <button onClick={getEstimate} disabled={comEstimating}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, hsl(45,90%,45%), hsl(30,90%,40%))", color: "white" }}>
                    {comEstimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {comEstimating ? "Sirius is estimating scope…" : "Get AI Estimate"}
                  </button>
                </div>
              )}

              {comStep === "estimate" && comEstimate && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4 space-y-3" style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }}>
                    <p className="text-slate-600 text-sm leading-relaxed">{comEstimate.summary}</p>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {[
                        { label: "Timeline", value: comEstimate.timeline },
                        { label: "Deposit (50%)", value: `£${(comEstimate.depositAmount / 100).toFixed(0)}` },
                        { label: "Total Estimate", value: `£${(comEstimate.totalEstimate / 100).toFixed(0)}` },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <p className="text-slate-800 font-bold text-lg">{item.value}</p>
                          <p className="text-slate-400 text-[10px] font-mono mt-0.5">{item.label.toUpperCase()}</p>
                        </div>
                      ))}
                    </div>
                    {comEstimate.deliverables?.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-[10px] font-mono mb-2">DELIVERABLES</p>
                        <div className="space-y-1">
                          {comEstimate.deliverables.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "hsl(155,70%,45%)" }} />
                              {d}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {comEstimate.notes && (
                      <p className="text-xs text-slate-400 italic border-t pt-3" style={{ borderColor: "rgba(15,23,42,0.07)" }}>{comEstimate.notes}</p>
                    )}
                  </div>
                  {comError && <p className="text-sm" style={{ color: "hsl(0,70%,55%)" }}>{comError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => { setComStep("form"); setComEstimate(null); setComError(""); }}
                      className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-500 transition-colors"
                      style={{ background: "#EEF2F8" }}>
                      ← Edit
                    </button>
                    <button onClick={payDeposit} disabled={comCheckoutLoading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, hsl(155,70%,35%), hsl(155,70%,28%))", color: "white" }}>
                      {comCheckoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      {comCheckoutLoading ? "Creating checkout…" : `Client Pays Deposit — £${(comEstimate.depositAmount / 100).toFixed(0)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active commissions */}
            <div>
              <p className="text-slate-300 text-[10px] font-mono mb-3 tracking-widest">ACTIVE COMMISSIONS</p>
              {commissionsLoading ? (
                <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
              ) : commissions.length === 0 ? (
                <p className="text-slate-300 text-sm">No commissions yet. Your first paid project will appear here.</p>
              ) : (
                <div className="space-y-2">
                  {commissions.map(c => (
                    <div key={c.id} className="p-4 rounded-xl" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-800 font-semibold text-sm">{c.projectTitle}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{c.customerName} · {c.customerEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-slate-800 font-bold">£{(c.depositAmount / 100).toFixed(0)}</p>
                          <p className="text-[10px] text-slate-300 font-mono">deposit</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${statusColor(c.status)}20`, color: statusColor(c.status) }}>{c.status.toUpperCase()}</span>
                        {c.labProjectId > 0 && <span className="text-[10px] text-slate-300">→ Lab Project #{c.labProjectId}</span>}
                        <div className="ml-auto flex gap-2">
                          {["paid", "in_progress", "delivered"].filter(s => s !== c.status).map(ns => (
                            <button key={ns} onClick={async () => {
                              await fetch(`${base}lab/revenue/commissions/${c.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: ns }) });
                              loadCommissions();
                            }} className="text-[10px] px-2 py-1 rounded-lg transition-all hover:opacity-80 capitalize"
                              style={{ background: "#EEF2F8", color: "rgba(15,23,42,0.4)" }}>
                              → {ns.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BLUEPRINT STORE ── */}
        {tab === "blueprints" && (
          <div className="space-y-6 max-w-2xl">
            {/* List new blueprint */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div>
                <p className="text-slate-800 font-bold text-base">List a Blueprint for Sale</p>
                <p className="text-slate-400 text-sm mt-1">Package an approved Lab project as a digital product. Buyer receives the complete architecture, code, and documentation. £199–£999.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block font-mono">SOURCE PROJECT</label>
                  <select value={bpProjectId || ""} onChange={e => {
                    const id = parseInt(e.target.value);
                    setBpProjectId(id || null);
                    const p = approvedProjects.find(p => p.id === id);
                    if (p) { setBpTitle(p.name); setBpDesc(p.brief?.slice(0, 200) || ""); }
                  }} className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 outline-none"
                    style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }}>
                    <option value="">Select a project…</option>
                    {approvedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block font-mono">LISTING TITLE</label>
                  <input value={bpTitle} onChange={e => setBpTitle(e.target.value)} placeholder="How it appears in the store"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none"
                    style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block font-mono">DESCRIPTION</label>
                  <textarea value={bpDesc} onChange={e => setBpDesc(e.target.value)} rows={3} placeholder="What does the buyer get? What problem does it solve?"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none resize-none"
                    style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block font-mono">CATEGORY</label>
                    <select value={bpCategory} onChange={e => setBpCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 outline-none"
                      style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }}>
                      {["Bot", "SaaS", "Engineering", "Research", "General"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block font-mono">PRICE (£)</label>
                    <input value={bpPrice} onChange={e => setBpPrice(e.target.value)} type="number" min="199" max="999" step="50"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-800 outline-none"
                      style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.1)" }} />
                  </div>
                </div>
                {bpError && <p className="text-sm" style={{ color: "hsl(0,70%,55%)" }}>{bpError}</p>}
                <button onClick={listBlueprint} disabled={bpListing}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(193,100%,28%))", color: "white" }}>
                  {bpListing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                  {bpListing ? "Creating Stripe product…" : `List Blueprint for £${bpPrice}`}
                </button>
              </div>
            </div>

            {/* Active blueprints */}
            <div>
              <p className="text-slate-300 text-[10px] font-mono mb-3 tracking-widest">ACTIVE LISTINGS</p>
              {blueprintsLoading ? (
                <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
              ) : blueprints.length === 0 ? (
                <p className="text-slate-300 text-sm">No blueprints listed yet. Package your first approved project above.</p>
              ) : (
                <div className="space-y-3">
                  {blueprints.map(bp => (
                    <div key={bp.id} className="p-4 rounded-xl" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.06)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-slate-800 font-semibold text-sm">{bp.title}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.6)" }}>{bp.category}</span>
                          </div>
                          <p className="text-slate-400 text-xs leading-relaxed">{bp.description}</p>
                          <p className="text-slate-300 text-[10px] mt-2">{bp.salesCount} sale{bp.salesCount !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-slate-800 font-bold text-lg">£{(bp.priceAmount / 100).toFixed(0)}</p>
                          <button onClick={() => buyBlueprint(bp.id)} disabled={bpCheckoutLoading === bp.id}
                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                            style={{ background: "hsla(193,100%,40%,0.15)", color: "hsl(193,100%,50%)", border: "1px solid hsla(193,100%,40%,0.2)" }}>
                            {bpCheckoutLoading === bp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                            Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

