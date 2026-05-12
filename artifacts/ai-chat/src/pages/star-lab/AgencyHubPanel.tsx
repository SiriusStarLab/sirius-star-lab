import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, FileText, Telescope, Check, Zap, Package, RotateCcw, Copy, Briefcase, CheckCircle2, ShoppingBag, Target, X, Plus, ChevronDown, AlertCircle, Star, Download, Send } from 'lucide-react';
import { getApiBase } from '@/lib/api-base';
import { LabMarkdown } from './LabMarkdown';

// ─── Agency Hub Panel ───────────────────────────────────────────────────────

type AgencyTab = "packages" | "scanner" | "proposal" | "pitch";
type ServicePackage = {
  id: string; name: string; price: number; period: string;
  tagline: string; colour: string; features: string[];
  ideal: string; roi: string;
};

export function AgencyHubPanel({ pin }: { pin: string }) {
  const base = getApiBase();
  const [tab, setTab] = useState<AgencyTab>("packages");
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  // Scanner state
  const [scanSector, setScanSector] = useState("digital agencies and e-commerce brands");
  const [scanRegion, setScanRegion] = useState("UK");
  const [scanFocus, setScanFocus] = useState("social media management AI");
  const [scanOutput, setScanOutput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanCopied, setScanCopied] = useState(false);

  // Proposal state
  const [propCompany, setPropCompany] = useState("");
  const [propWebsite, setPropWebsite] = useState("");
  const [propSector, setPropSector] = useState("");
  const [propSize, setPropSize] = useState("");
  const [propTools, setPropTools] = useState("");
  const [propPains, setPropPains] = useState("");
  const [propPackage, setPropPackage] = useState("fullstack");
  const [propOutput, setPropOutput] = useState("");
  const [proposing, setProposing] = useState(false);
  const [propCopied, setPropCopied] = useState(false);

  // Pitch state
  const [pitchCompany, setPitchCompany] = useState("");
  const [pitchContact, setPitchContact] = useState("");
  const [pitchRole, setPitchRole] = useState("");
  const [pitchSector, setPitchSector] = useState("");
  const [pitchFormat, setPitchFormat] = useState("LinkedIn DM");
  const [pitchObservation, setPitchObservation] = useState("");
  const [pitchOutput, setPitchOutput] = useState("");
  const [pitching, setPitching] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);

  const headers = { "Content-Type": "application/json", "x-lab-pin": pin };

  useEffect(() => {
    fetch(`${base}lab/agency/packages`, { headers: { "x-lab-pin": pin } })
      .then(r => r.json()).then(setPackages).catch(() => {})
      .finally(() => setPackagesLoading(false));
  }, []);

  const streamToState = async (url: string, body: object, setter: React.Dispatch<React.SetStateAction<string>>, setLoading: (v: boolean) => void) => {
    setLoading(true);
    setter("");
    try {
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok || !res.body) { setLoading(false); return; }
      const reader = res.body.getReader();
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
            if (msg.delta) setter(prev => prev + msg.delta);
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const runScan = () => streamToState(
    `${base}lab/agency/scan`, { sector: scanSector, region: scanRegion, focus: scanFocus },
    setScanOutput, setScanning
  );

  const runProposal = () => {
    if (!propCompany.trim()) return;
    streamToState(
      `${base}lab/agency/proposal`,
      { companyName: propCompany, website: propWebsite, sector: propSector, size: propSize, currentTools: propTools, painPoints: propPains, package: propPackage },
      setPropOutput, setProposing
    );
  };

  const runPitch = () => {
    if (!pitchCompany.trim()) return;
    streamToState(
      `${base}lab/agency/pitch`,
      { companyName: pitchCompany, contactName: pitchContact, contactRole: pitchRole, sector: pitchSector, format: pitchFormat, observation: pitchObservation },
      setPitchOutput, setPitching
    );
  };

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const inputStyle = {
    background: "#EEF2F8",
    border: "1px solid rgba(15,23,42,0.1)",
    color: "rgba(15,23,42,0.85)",
  } as React.CSSProperties;

  const labelStyle = {
    color: "rgba(15,23,42,0.45)",
    fontSize: "10px",
    fontFamily: "monospace",
    letterSpacing: "0.12em",
    display: "block",
    marginBottom: "4px",
  } as React.CSSProperties;

  const TABS: { id: AgencyTab; label: string; icon: React.ElementType }[] = [
    { id: "packages", label: "Service Packages", icon: ShoppingBag },
    { id: "scanner", label: "Prospect Scanner", icon: Telescope },
    { id: "proposal", label: "Proposal Generator", icon: FileText },
    { id: "pitch", label: "Quick Pitch", icon: Zap },
  ];

  const PKG_LABELS: Record<string, string> = { social: "Sirius Social AI", sales: "Sirius Sales Intelligence", fullstack: "Sirius Full Operations" };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(220,80%,50%), hsl(280,70%,55%))" }}>
            <Briefcase className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-lg leading-none">Agency Hub</h2>
            <p className="text-slate-400 text-xs mt-0.5">Sirius as a managed service — £799 to £2,499/month per client</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "hsla(155,70%,45%,0.1)", border: "1px solid hsla(155,70%,45%,0.2)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(155,70%,50%)" }} />
            <span className="text-xs font-mono" style={{ color: "hsl(155,70%,50%)" }}>LIVE SERVICE</span>
          </div>
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
                  background: active ? "hsla(220,80%,50%,0.15)" : "transparent",
                  color: active ? "hsl(220,80%,70%)" : "rgba(15,23,42,0.4)",
                  border: `1px solid ${active ? "hsla(220,80%,50%,0.3)" : "transparent"}`,
                }}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── SERVICE PACKAGES ── */}
        {tab === "packages" && (
          <div className="space-y-5 max-w-3xl">
            <div className="rounded-xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <p className="text-slate-800 font-semibold text-sm mb-1">The Opportunity</p>
              <p className="text-slate-500 text-sm leading-relaxed">Every business on earth needs social media, content, sales sequences, and customer communications — but most are doing it with 6-8 disconnected tools that don't think. Sirius thinks. You deliver the intelligence as a managed service. They pay monthly. You scale.</p>
            </div>

            {packagesLoading ? (
              <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading packages…</span></div>
            ) : (
              <div className="space-y-4">
                {packages.map(pkg => (
                  <div key={pkg.id} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${pkg.colour}30` }}>
                    {/* Package header */}
                    <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ background: `linear-gradient(135deg, ${pkg.colour}15, ${pkg.colour}08)` }}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${pkg.colour}20`, color: pkg.colour }}>
                            {pkg.id.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-slate-800 font-bold text-base">{pkg.name}</h3>
                        <p className="text-slate-800/45 text-sm mt-0.5">{pkg.tagline}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-800 font-bold text-2xl leading-none">£{pkg.price}</p>
                        <p className="text-slate-400 text-xs mt-0.5">/month per client</p>
                      </div>
                    </div>
                    {/* Features */}
                    <div className="px-5 py-4" style={{ background: "#F1F5F9" }}>
                      <div className="space-y-2 mb-4">
                        {pkg.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-slate-500">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: pkg.colour }} />
                            {f}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                        <div>
                          <p className="text-slate-300 text-[10px] font-mono mb-1">IDEAL FOR</p>
                          <p className="text-slate-500 text-xs">{pkg.ideal}</p>
                        </div>
                        <div>
                          <p className="text-slate-300 text-[10px] font-mono mb-1">YOUR VALUE PROPOSITION</p>
                          <p className="text-slate-500 text-xs">{pkg.roi}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => { setTab("proposal"); setPropPackage(pkg.id); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                          style={{ background: `${pkg.colour}20`, color: pkg.colour, border: `1px solid ${pkg.colour}30` }}>
                          <FileText className="w-3.5 h-3.5" />
                          Generate Proposal
                        </button>
                        <button onClick={() => { setTab("pitch"); }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                          style={{ background: "#EEF2F8", color: "rgba(15,23,42,0.55)" }}>
                          Quick Pitch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Revenue potential */}
            <div className="rounded-xl p-4 grid grid-cols-3 gap-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <p className="col-span-3 text-slate-300 text-[10px] font-mono mb-1 tracking-widest">REVENUE POTENTIAL</p>
              {[
                { clients: 3, pkg: "social", monthly: 2397, annual: 28764 },
                { clients: 5, pkg: "mixed", monthly: 6995, annual: 83940 },
                { clients: 10, pkg: "mixed", monthly: 16990, annual: 203880 },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-slate-800 font-bold text-xl">£{s.monthly.toLocaleString()}</p>
                  <p className="text-slate-300 text-[10px] font-mono">/month</p>
                  <p className="text-slate-400 text-xs mt-1">{s.clients} clients</p>
                  <p className="text-slate-300 text-[10px]">£{s.annual.toLocaleString()}/year</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROSPECT SCANNER ── */}
        {tab === "scanner" && (
          <div className="space-y-5 max-w-2xl">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div>
                <p className="text-slate-800 font-bold text-base">Prospect Scanner</p>
                <p className="text-slate-400 text-sm mt-1">Sirius identifies the specific types of businesses most likely to pay for your service — with their pain points, decision makers, and the best way to reach them.</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>TARGET SECTOR</label>
                    <input value={scanSector} onChange={e => setScanSector(e.target.value)}
                      placeholder="e.g. digital agencies, e-commerce brands…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>REGION</label>
                    <input value={scanRegion} onChange={e => setScanRegion(e.target.value)}
                      placeholder="UK, Scotland, USA, Global…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>SPECIFIC FOCUS</label>
                  <input value={scanFocus} onChange={e => setScanFocus(e.target.value)}
                    placeholder="social media AI, sales automation, content marketing…"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <button onClick={runScan} disabled={scanning}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(220,80%,45%), hsl(280,70%,40%))", color: "white" }}>
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Telescope className="w-4 h-4" />}
                  {scanning ? "Scanning for prospects…" : "Find Target Prospects"}
                </button>
              </div>
            </div>

            {scanOutput && (
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-slate-800 font-semibold text-sm">Prospect Analysis</p>
                  <button onClick={() => copyText(scanOutput, setScanCopied)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: scanCopied ? "hsl(155,70%,50%)" : "rgba(15,23,42,0.6)" }}>
                    {scanCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {scanCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="max-h-[55vh] overflow-y-auto pr-1">
                  <LabMarkdown content={scanOutput} streaming={false} />
                </div>
                <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                  <button onClick={() => { setTab("proposal"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                    style={{ background: "hsla(220,80%,50%,0.12)", color: "hsl(220,80%,65%)" }}>
                    <FileText className="w-3 h-3" /> Generate Proposal →
                  </button>
                  <button onClick={() => { setTab("pitch"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                    style={{ background: "hsla(45,100%,50%,0.12)", color: "hsl(45,100%,60%)" }}>
                    <Zap className="w-3 h-3" /> Write Quick Pitch →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROPOSAL GENERATOR ── */}
        {tab === "proposal" && (
          <div className="space-y-5 max-w-2xl">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div>
                <p className="text-slate-800 font-bold text-base">Proposal Generator</p>
                <p className="text-slate-400 text-sm mt-1">Sirius writes a full, bespoke 10-section business proposal for a named company — personalised, commercially argued, and ready to send.</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>COMPANY NAME *</label>
                    <input value={propCompany} onChange={e => setPropCompany(e.target.value)} placeholder="Acme Digital Ltd"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>WEBSITE (OPTIONAL)</label>
                    <input value={propWebsite} onChange={e => setPropWebsite(e.target.value)} placeholder="acmedigital.co.uk"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>SECTOR</label>
                    <input value={propSector} onChange={e => setPropSector(e.target.value)} placeholder="E-commerce, Digital Agency, SaaS…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>COMPANY SIZE</label>
                    <input value={propSize} onChange={e => setPropSize(e.target.value)} placeholder="10 staff, £2M revenue…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>CURRENT TOOLS (IF KNOWN)</label>
                  <input value={propTools} onChange={e => setPropTools(e.target.value)} placeholder="Hootsuite, Mailchimp, HubSpot…"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>KNOWN PAIN POINTS</label>
                  <textarea value={propPains} onChange={e => setPropPains(e.target.value)} rows={2}
                    placeholder="Low social engagement, no time for content, sales team overwhelmed…"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>RECOMMENDED PACKAGE</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "social", label: "Social AI", price: "£799/mo", color: "hsl(280,70%,55%)" },
                      { id: "sales", label: "Sales Intel", price: "£1,299/mo", color: "hsl(45,100%,50%)" },
                      { id: "fullstack", label: "Full Ops", price: "£2,499/mo", color: "hsl(155,70%,45%)" },
                    ].map(p => (
                      <button key={p.id} onClick={() => setPropPackage(p.id)}
                        className="py-2.5 rounded-xl text-xs transition-all"
                        style={{
                          background: propPackage === p.id ? `${p.color}18` : "#EEF2F8",
                          color: propPackage === p.id ? p.color : "rgba(15,23,42,0.45)",
                          border: `1px solid ${propPackage === p.id ? `${p.color}40` : "rgba(15,23,42,0.1)"}`,
                        }}>
                        <div className="font-semibold">{p.label}</div>
                        <div style={{ fontSize: "10px", opacity: 0.7 }}>{p.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={runProposal} disabled={proposing || !propCompany.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(220,80%,45%), hsl(220,80%,35%))", color: "white" }}>
                  {proposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {proposing ? `Writing proposal for ${propCompany}…` : "Generate Bespoke Proposal"}
                </button>
              </div>
            </div>

            {propOutput && (
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-slate-800 font-semibold text-sm">Proposal — {propCompany}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">{PKG_LABELS[propPackage]}</span>
                    <button onClick={() => copyText(propOutput, setPropCopied)}
                      className="flex items-center gap-1.5 text-xs transition-colors"
                      style={{ color: propCopied ? "hsl(155,70%,50%)" : "rgba(15,23,42,0.6)" }}>
                      {propCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {propCopied ? "Copied" : "Copy all"}
                    </button>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  <LabMarkdown content={propOutput} streaming={false} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QUICK PITCH ── */}
        {tab === "pitch" && (
          <div className="space-y-5 max-w-2xl">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div>
                <p className="text-slate-800 font-bold text-base">Quick Pitch Generator</p>
                <p className="text-slate-400 text-sm mt-1">Sirius writes a personalised LinkedIn DM or cold email that sounds human, opens a conversation, and gets replies.</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>COMPANY NAME *</label>
                    <input value={pitchCompany} onChange={e => setPitchCompany(e.target.value)} placeholder="Acme Digital Ltd"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>CONTACT NAME</label>
                    <input value={pitchContact} onChange={e => setPitchContact(e.target.value)} placeholder="Jane Smith"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>CONTACT ROLE</label>
                    <input value={pitchRole} onChange={e => setPitchRole(e.target.value)} placeholder="Head of Marketing, CEO…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>THEIR SECTOR</label>
                    <input value={pitchSector} onChange={e => setPitchSector(e.target.value)} placeholder="E-commerce, SaaS, Hospitality…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>FORMAT</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["LinkedIn DM", "cold email"].map(f => (
                      <button key={f} onClick={() => setPitchFormat(f)}
                        className="py-2 rounded-xl text-xs font-medium transition-all capitalize"
                        style={{
                          background: pitchFormat === f ? "hsla(220,80%,50%,0.15)" : "#EEF2F8",
                          color: pitchFormat === f ? "hsl(220,80%,70%)" : "rgba(15,23,42,0.45)",
                          border: `1px solid ${pitchFormat === f ? "hsla(220,80%,50%,0.3)" : "rgba(15,23,42,0.1)"}`,
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>SPECIFIC OBSERVATION (OPTIONAL)</label>
                  <textarea value={pitchObservation} onChange={e => setPitchObservation(e.target.value)} rows={2}
                    placeholder="Something specific you noticed — their posts get low engagement, they just hired a marketing manager, they post inconsistently…"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <button onClick={runPitch} disabled={pitching || !pitchCompany.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(45,90%,45%), hsl(30,90%,40%))", color: "white" }}>
                  {pitching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {pitching ? "Writing pitch…" : `Write ${pitchFormat}`}
                </button>
              </div>
            </div>

            {pitchOutput && (
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-slate-800 font-semibold text-sm">{pitchFormat} — {pitchCompany}</p>
                  <button onClick={() => copyText(pitchOutput, setPitchCopied)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: pitchCopied ? "hsl(155,70%,50%)" : "rgba(15,23,42,0.6)" }}>
                    {pitchCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {pitchCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "rgba(15,23,42,0.76)" }}>
                  {pitchOutput}
                </div>
                <button onClick={runPitch} disabled={pitching}
                  className="flex items-center gap-1.5 text-xs transition-colors mt-2"
                  style={{ color: "rgba(15,23,42,0.6)" }}>
                  <RotateCcw className="w-3 h-3" /> Regenerate
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
