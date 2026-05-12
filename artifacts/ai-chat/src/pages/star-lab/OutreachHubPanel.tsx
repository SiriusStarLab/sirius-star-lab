import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Send, Loader2, Telescope, X, Zap, Upload, Mail, Users, BarChart3, Target, ChevronDown, ChevronUp, Trash2, Check, RefreshCw, Eye, AlertCircle, CheckCircle2, AtSign } from 'lucide-react';
import { getApiBase } from '@/lib/api-base';

// ─── Outreach Hub ────────────────────────────────────────────────────
type Recipient = { id: string; name: string; email: string; company: string; role: string; notes: string };
type GeneratedMessage = { recipientId: string; subject: string; body: string; status: "pending" | "generating" | "done" | "error"; error?: string };

// ─── Types for Outreach Engine ───────────────────────────────────────────────
type OContact = {
  id: number; name: string; email: string; company: string; role: string;
  sector: string; website: string; location: string; companySize: string;
  notes: string; source: string; status: string; createdAt: string;
};
type OCampaign = {
  id: number; name: string; product: string; targetSectors: string[];
  messageType: string; tone: string; subjectTemplate: string;
  senderName: string; senderCompany: string; fromEmail: string;
  status: string; totalContacts: number; totalSent: number; sentCount?: number; createdAt: string;
};
type OSend = {
  id: number; campaignId: number; contactId: number;
  subject: string; body: string; status: string; contact?: OContact;
};

const SECTORS = ["Oil & Gas", "Aerospace", "Medical Devices", "Hydrogen", "SaaS", "Professional Services", "Manufacturing", "Construction", "Retail", "Finance", "Legal", "Marketing Agencies"];
const MSG_TYPES = ["Cold Email", "Follow-Up", "Product Launch", "Partnership Offer", "Case Study"];
const TONES = ["Professional", "Friendly", "Bold", "Concise", "Warm"];

const STATUS_COLOR: Record<string, string> = {
  prospect: "hsl(210,70%,55%)", contacted: "hsl(45,100%,55%)",
  replied: "hsl(155,70%,50%)", converted: "hsl(155,100%,45%)", unsubscribed: "rgba(15,23,42,0.45)",
};

export function OutreachHubPanel({ pin }: { pin: string }) {
  const base = getApiBase();
  const [view, setView] = useState<"contacts" | "campaigns" | "sends" | "analytics">("contacts");

  // --- Contacts state ---
  const [contacts, setContacts] = useState<OContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanSector, setScanSector] = useState("Oil & Gas");
  const [scanCount, setScanCount] = useState(10);
  const [scanning, setScanning] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [bulkSector, setBulkSector] = useState("General");
  const [newC, setNewC] = useState({ name: "", email: "", company: "", role: "", sector: "Oil & Gas", website: "", location: "", notes: "" });

  // --- Campaigns state ---
  const [campaigns, setCampaigns] = useState<OCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [newCamp, setNewCamp] = useState({ name: "", product: "Sirius Star Lab", targetSectors: [] as string[], messageType: "Cold Email", tone: "Professional", subjectTemplate: "", senderName: "Garry Hutton", senderCompany: "Sirius Star Lab", fromEmail: "" });
  const [creating, setCreating] = useState(false);
  const [showCreateCamp, setShowCreateCamp] = useState(false);

  // --- Campaign sends (drill-in) ---
  const [activeCampaign, setActiveCampaign] = useState<OCampaign | null>(null);
  const [sends, setSends] = useState<OSend[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState<string[]>([]);
  const [editSend, setEditSend] = useState<{ [id: number]: { subject: string; body: string } }>({});

  // --- SMTP send modal ---
  const [showSmtp, setShowSmtp] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ sent: number; failed: number } | null>(null);

  // --- Analytics ---
  const [analytics, setAnalytics] = useState<any>(null);

  // Load contacts
  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const r = await fetch(`${base}outreach/contacts`, { headers: { "x-lab-pin": pin } });
      setContacts(await r.json());
    } catch { /* ignore */ }
    setContactsLoading(false);
  }, [base, pin]);

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const r = await fetch(`${base}outreach/campaigns`, { headers: { "x-lab-pin": pin } });
      setCampaigns(await r.json());
    } catch { /* ignore */ }
    setCampaignsLoading(false);
  }, [base, pin]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const r = await fetch(`${base}outreach/analytics`, { headers: { "x-lab-pin": pin } });
      setAnalytics(await r.json());
    } catch { /* ignore */ }
  }, [base, pin]);

  useEffect(() => { loadContacts(); loadCampaigns(); }, []);
  useEffect(() => { if (view === "analytics") loadAnalytics(); }, [view]);

  // Add contact
  const addContact = async () => {
    if (!newC.name.trim()) return;
    const r = await fetch(`${base}outreach/contacts`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      body: JSON.stringify(newC),
    });
    const c = await r.json();
    setContacts(prev => [c, ...prev]);
    setNewC({ name: "", email: "", company: "", role: "", sector: "Oil & Gas", website: "", location: "", notes: "" });
    setAddOpen(false);
  };

  // Delete contact
  const deleteContact = async (id: number) => {
    await fetch(`${base}outreach/contacts/${id}`, { method: "DELETE", headers: { "x-lab-pin": pin } });
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // Sector scan
  const runSectorScan = async () => {
    setScanning(true); setScanLog([]);
    const r = await fetch(`${base}outreach/contacts/scan-sector`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      body: JSON.stringify({ sector: scanSector, count: scanCount }),
    });
    const reader = r.body!.getReader(); const dec = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.type === "contact" && d.contact) { setContacts(prev => [d.contact, ...prev]); setScanLog(prev => [...prev, `✓ ${d.contact.name} — ${d.contact.company}`]); }
          if (d.type === "done") setScanLog(prev => [...prev, `\nDone — ${d.count} contacts added`]);
          if (d.error) setScanLog(prev => [...prev, `Error: ${d.error}`]);
        } catch { /* ignore */ }
      }
    }
    setScanning(false);
  };

  // Bulk import
  const runBulkImport = async () => {
    if (!bulkText.trim()) return;
    const r = await fetch(`${base}outreach/contacts/import`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      body: JSON.stringify({ text: bulkText, sector: bulkSector }),
    });
    const d = await r.json();
    if (d.contacts) setContacts(prev => [...d.contacts, ...prev]);
    setBulkText(""); setBulkOpen(false);
  };

  // Create campaign
  const createCampaign = async () => {
    if (!newCamp.name.trim()) return;
    setCreating(true);
    const r = await fetch(`${base}outreach/campaigns`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      body: JSON.stringify(newCamp),
    });
    const c = await r.json();
    setCampaigns(prev => [c, ...prev]);
    setShowCreateCamp(false);
    setCreating(false);
    openCampaign(c);
  };

  // Open campaign (drill in)
  const openCampaign = async (camp: OCampaign) => {
    setActiveCampaign(camp); setView("sends"); setSends([]); setGenLog([]);
    const r = await fetch(`${base}outreach/campaigns/${camp.id}/sends`, { headers: { "x-lab-pin": pin } });
    setSends(await r.json());
  };

  // Generate pitches for campaign
  const generatePitches = async () => {
    if (!activeCampaign || generating) return;
    setGenerating(true); setSends([]); setGenLog(["Starting AI pitch generation…"]);
    const r = await fetch(`${base}outreach/campaigns/${activeCampaign.id}/generate`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: "{}",
    });
    const reader = r.body!.getReader(); const dec = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.type === "start") setGenLog(prev => [...prev, `Generating pitches for ${d.total} contacts…`]);
          if (d.type === "pitch" && d.send) { setSends(prev => [...prev, d.send]); setGenLog(prev => [...prev, `✓ ${d.send.contact?.name || "Contact"} — pitch ready`]); }
          if (d.type === "done") setGenLog(prev => [...prev, `\n✓ All ${d.total} pitches generated. Review and launch.`]);
          if (d.error) setGenLog(prev => [...prev, `Error: ${d.error}`]);
        } catch { /* ignore */ }
      }
    }
    setGenerating(false);
    loadCampaigns();
  };

  // Launch campaign
  const launchCampaign = async () => {
    if (!activeCampaign) return;
    setLaunching(true); setLaunchResult(null);
    const r = await fetch(`${base}outreach/campaigns/${activeCampaign.id}/launch`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      body: JSON.stringify({ smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName }),
    });
    const d = await r.json();
    setLaunchResult({ sent: d.sent || 0, failed: d.failed || 0 });
    setLaunching(false); setShowSmtp(false);
    loadCampaigns();
  };

  // ─── COMPUTED ────────────────────────────────────────────────────────────────
  const inp = "w-full text-xs text-slate-800 placeholder-slate-400 outline-none rounded-xl px-3 py-2 bg-[#F1F5F9] border border-[rgba(15,23,42,0.09)]";
  const filteredContacts = sectorFilter === "All" ? contacts : contacts.filter(c => c.sector === sectorFilter);
  const allSectors = ["All", ...Array.from(new Set(contacts.map(c => c.sector)))];

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  const VIEWS = [
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "campaigns", label: "Campaigns", icon: Mail },
    { id: "sends", label: "Pitches", icon: Send },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ] as const;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5" style={{ color: "hsl(340,80%,60%)" }} />
          <div>
            <h2 className="text-slate-800 font-semibold text-sm">Outreach Hub</h2>
            <p className="text-slate-400 text-xs">{contacts.length} contacts · {campaigns.length} campaigns</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#FFFFFF" }}>
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: view === v.id ? "hsl(340,80%,45%)" : "transparent", color: view === v.id ? "white" : "rgba(15,23,42,0.4)" }}>
                <Icon className="w-3 h-3" />{v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">

        {/* ── CONTACTS ── */}
        {view === "contacts" && (
          <div className="space-y-4">
            {/* Actions bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setAddOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-800 transition-all"
                style={{ background: "hsl(340,80%,42%)" }}>
                <Plus className="w-3 h-3" /> Add Contact
              </button>
              <button onClick={() => setBulkOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
                style={{ background: "#E8EEF5", color: "rgba(15,23,42,0.62)" }}>
                <Upload className="w-3 h-3" /> Bulk Import
              </button>
              <button onClick={() => setScanOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
                style={{ background: "#E8EEF5", color: "rgba(15,23,42,0.62)" }}>
                <Telescope className="w-3 h-3" /> AI Scan
              </button>
              <div className="ml-auto flex gap-1">
                {allSectors.map(s => (
                  <button key={s} onClick={() => setSectorFilter(s)}
                    className="px-2.5 py-1 rounded-lg text-xs transition-all"
                    style={{ background: sectorFilter === s ? "hsl(193,100%,30%)" : "#F1F5F9", color: sectorFilter === s ? "white" : "rgba(15,23,42,0.6)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Add contact form */}
            {addOpen && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
                <p className="text-slate-500 text-xs font-medium">New Contact</p>
                <div className="grid grid-cols-2 gap-2">
                  {[["Name *", "name", "Jane Smith"], ["Email", "email", "jane@company.com"], ["Company", "company", "Acme Ltd"], ["Role", "role", "CEO"], ["Sector", "sector", "Oil & Gas"], ["Location", "location", "Aberdeen"]].map(([label, key, ph]) => (
                    <div key={key}>
                      <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                      <input value={(newC as any)[key]} onChange={e => setNewC(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} className={inp} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Notes</label>
                  <textarea value={newC.notes} onChange={e => setNewC(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Any context…" className={inp + " resize-none"} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAddOpen(false)} className="px-3 py-2 rounded-xl text-xs text-slate-400" style={{ background: "#EEF2F8" }}>Cancel</button>
                  <button onClick={async () => { await addContact(); setAddOpen(false); setNewC({ name: "", email: "", company: "", role: "", sector: "Oil & Gas", website: "", location: "", notes: "" }); }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-800" style={{ background: "hsl(340,80%,42%)" }}>
                    Save Contact
                  </button>
                </div>
              </div>
            )}

            {/* Bulk import */}
            {bulkOpen && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
                <p className="text-slate-500 text-xs font-medium">Bulk Import — paste CSV (Name, Email, Company, Role)</p>
                <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={5} placeholder={"Jane Smith, jane@co.com, Acme, CEO\nBob Jones, bob@firm.com, Firm Ltd, CFO"} className={inp + " resize-none font-mono"} />
                <div className="flex gap-2 items-center">
                  <select value={bulkSector} onChange={e => setBulkSector(e.target.value)} className={inp + " w-auto"}>
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={async () => {
                    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
                    for (const line of lines) {
                      const p = line.split(/,|\t/).map(x => x.trim());
                      if (p[0] && p[1]?.includes("@")) {
                        await fetch(`${base}outreach/contacts`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify({ name: p[0], email: p[1], company: p[2] || "", role: p[3] || "", sector: bulkSector }) });
                      }
                    }
                    await loadContacts(); setBulkText(""); setBulkOpen(false);
                  }} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 whitespace-nowrap" style={{ background: "hsl(340,80%,42%)" }}>
                    Import
                  </button>
                </div>
              </div>
            )}

            {/* AI sector scan */}
            {scanOpen && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
                <p className="text-slate-500 text-xs font-medium">AI Sector Scanner — finds real companies + contacts</p>
                <div className="flex gap-2">
                  <select value={scanSector} onChange={e => setScanSector(e.target.value)} className={inp + " flex-1"}>
                    {SECTORS.filter(s => s !== "General").map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input type="number" min={5} max={50} value={scanCount} onChange={e => setScanCount(+e.target.value)} className={inp + " w-20"} />
                </div>
                {scanLog.length > 0 && (
                  <div className="p-3 rounded-xl font-mono text-xs text-green-400 space-y-1 max-h-32 overflow-y-auto" style={{ background: "#F8FAFC" }}>
                    {scanLog.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}
                <button onClick={async () => {
                  setScanning(true); setScanLog(["Scanning for companies…"]);
                  const r = await fetch(`${base}outreach/scan`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify({ sector: scanSector, count: scanCount }) });
                  const reader = r.body!.getReader(); const dec = new TextDecoder(); let buf = "";
                  while (true) {
                    const { done, value } = await reader.read(); if (done) break;
                    buf += dec.decode(value, { stream: true });
                    const lines = buf.split("\n"); buf = lines.pop() || "";
                    for (const line of lines) {
                      if (!line.startsWith("data: ")) continue;
                      try { const d = JSON.parse(line.slice(6)); if (d.log) setScanLog(p => [...p, d.log]); if (d.done) { await loadContacts(); setScanOpen(false); } } catch {}
                    }
                  }
                  setScanning(false);
                }} disabled={scanning} className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "hsl(193,100%,30%)" }}>
                  {scanning ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : <><Telescope className="w-4 h-4" />Start AI Scan</>}
                </button>
              </div>
            )}

            {/* Contacts list */}
            {contactsLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading contacts…</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12 text-slate-300 text-sm">No contacts yet — add one or run the AI scanner</div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.06)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: "hsl(340,80%,25%)", color: "hsl(340,80%,70%)" }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-xs font-medium truncate">{c.name}</p>
                      <p className="text-slate-400 text-xs truncate">{c.company} · {c.role}</p>
                      <p className="text-slate-300 text-xs truncate">{c.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-xs flex-shrink-0" style={{ background: "#DCE4F0", color: "rgba(15,23,42,0.45)" }}>{c.sector}</span>
                    <button onClick={async () => { await fetch(`${base}outreach/contacts/${c.id}`, { method: "DELETE", headers: { "x-lab-pin": pin } }); loadContacts(); }}
                      className="text-slate-800/15 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CAMPAIGNS ── */}
        {view === "campaigns" && (
          <div className="space-y-4">
            <button onClick={() => setShowCreateCamp(o => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-800"
              style={{ background: "hsl(340,80%,42%)" }}>
              <Plus className="w-3.5 h-3.5" /> New Campaign
            </button>

            {showCreateCamp && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
                <p className="text-slate-500 text-xs font-medium">Create Campaign</p>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Campaign Name</label>
                  <input value={newCamp.name} onChange={e => setNewCamp(p => ({ ...p, name: e.target.value }))} placeholder="Hydrogen Q2 Push" className={inp} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Product / Service</label>
                    <input value={newCamp.product} onChange={e => setNewCamp(p => ({ ...p, product: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Message Type</label>
                    <select value={newCamp.messageType} onChange={e => setNewCamp(p => ({ ...p, messageType: e.target.value }))} className={inp}>
                      {MSG_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Tone</label>
                    <select value={newCamp.tone} onChange={e => setNewCamp(p => ({ ...p, tone: e.target.value }))} className={inp}>
                      {TONES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Your Name</label>
                    <input value={newCamp.senderName} onChange={e => setNewCamp(p => ({ ...p, senderName: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Target Sectors</label>
                  <div className="flex flex-wrap gap-1">
                    {SECTORS.filter(s => s !== "General").map(s => {
                      const active = newCamp.targetSectors.includes(s);
                      return (
                        <button key={s} onClick={() => setNewCamp(p => ({ ...p, targetSectors: active ? p.targetSectors.filter(x => x !== s) : [...p.targetSectors, s] }))}
                          className="px-2.5 py-1 rounded-lg text-xs transition-all"
                          style={{ background: active ? "hsl(340,80%,45%)" : "#E8EEF5", color: active ? "white" : "rgba(15,23,42,0.4)" }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreateCamp(false)} className="px-3 py-2 rounded-xl text-xs text-slate-400" style={{ background: "#EEF2F8" }}>Cancel</button>
                  <button onClick={async () => {
                    setCreating(true);
                    await fetch(`${base}outreach/campaigns`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify(newCamp) });
                    await loadCampaigns(); setShowCreateCamp(false);
                    setNewCamp({ name: "", product: "Sirius Star Lab", targetSectors: [], messageType: "Cold Email", tone: "Professional", subjectTemplate: "", senderName: "Garry Hutton", senderCompany: "Sirius Star Lab", fromEmail: "" });
                    setCreating(false);
                  }} disabled={creating || !newCamp.name.trim()} className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "hsl(340,80%,42%)" }}>
                    {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</> : "Create Campaign"}
                  </button>
                </div>
              </div>
            )}

            {campaignsLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading campaigns…</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-slate-300 text-sm">No campaigns yet</div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(camp => (
                  <div key={camp.id} className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-slate-800 text-sm font-medium">{camp.name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{camp.product} · {camp.messageType} · {camp.tone}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg text-xs flex-shrink-0" style={{ background: camp.status === "active" ? "hsl(155,70%,18%)" : "#DCE4F0", color: camp.status === "active" ? "hsl(155,70%,60%)" : "rgba(15,23,42,0.4)" }}>
                        {camp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-xs mb-3">
                      <span>{camp.totalContacts || 0} contacts</span>
                      <span>·</span>
                      <span>{camp.sentCount || 0} sent</span>
                      <span>·</span>
                      <span>{camp.targetSectors?.join(", ") || "All sectors"}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setActiveCampaign(camp); setSends([]); setGenLog([]); setView("sends"); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 transition-all"
                        style={{ background: "hsl(340,80%,42%)" }}>
                        Generate Pitches
                      </button>
                      <button onClick={async () => { await fetch(`${base}outreach/campaigns/${camp.id}`, { method: "DELETE", headers: { "x-lab-pin": pin } }); loadCampaigns(); }}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 transition-all"
                        style={{ background: "#E8EEF5" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SENDS / PITCHES ── */}
        {view === "sends" && (
          <div className="space-y-4">
            {!activeCampaign ? (
              <div className="text-center py-12 text-slate-300 text-sm">Select a campaign from the Campaigns tab first</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-800 font-medium text-sm">{activeCampaign.name}</p>
                    <p className="text-slate-400 text-xs">{sends.length} pitches generated</p>
                  </div>
                  <div className="flex gap-2">
                    {sends.length === 0 && !generating && (
                      <button onClick={async () => {
                        setGenerating(true); setGenLog(["Starting pitch generation…"]);
                        const r = await fetch(`${base}outreach/campaigns/${activeCampaign.id}/generate`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: "{}" });
                        const reader = r.body!.getReader(); const dec = new TextDecoder(); let buf = "";
                        while (true) {
                          const { done, value } = await reader.read(); if (done) break;
                          buf += dec.decode(value, { stream: true });
                          const lines = buf.split("\n"); buf = lines.pop() || "";
                          for (const line of lines) {
                            if (!line.startsWith("data: ")) continue;
                            try {
                              const d = JSON.parse(line.slice(6));
                              if (d.type === "start") setGenLog(p => [...p, `Generating for ${d.total} contacts…`]);
                              if (d.type === "pitch" && d.send) { setSends(p => [...p, d.send]); setGenLog(p => [...p, `✓ ${d.send.contact?.name || "Contact"}`]); }
                              if (d.type === "done") setGenLog(p => [...p, `✓ Done — ${d.total} pitches ready`]);
                            } catch {}
                          }
                        }
                        setGenerating(false);
                      }} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2" style={{ background: "hsl(340,80%,42%)" }}>
                        <Zap className="w-3.5 h-3.5" /> Generate All Pitches
                      </button>
                    )}
                    {sends.length > 0 && (
                      <button onClick={() => setShowSmtp(true)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2"
                        style={{ background: "hsl(155,70%,35%)" }}>
                        <Send className="w-3.5 h-3.5" /> Launch Campaign
                      </button>
                    )}
                  </div>
                </div>

                {generating && (
                  <div className="p-3 rounded-xl font-mono text-xs text-green-400 space-y-1 max-h-40 overflow-y-auto" style={{ background: "#F8FAFC" }}>
                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Loader2 className="w-3 h-3 animate-spin" />Generating…</div>
                    {genLog.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}

                {sends.length > 0 && (
                  <div className="space-y-3">
                    {sends.map(s => (
                      <div key={s.id} className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "hsl(340,80%,25%)", color: "hsl(340,80%,70%)" }}>
                            {s.contact?.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-slate-800 text-xs font-medium">{s.contact?.name}</p>
                            <p className="text-slate-400 text-xs">{s.contact?.email}</p>
                          </div>
                          <span className="ml-auto px-2 py-0.5 rounded-lg text-xs" style={{ background: s.status === "sent" ? "hsl(155,70%,18%)" : "#DCE4F0", color: s.status === "sent" ? "hsl(155,70%,60%)" : "rgba(15,23,42,0.4)" }}>
                            {s.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <input value={editSend[s.id]?.subject ?? s.subject ?? ""} onChange={e => setEditSend(p => ({ ...p, [s.id]: { ...p[s.id], subject: e.target.value } }))}
                            placeholder="Subject line…" className={inp} />
                          <textarea value={editSend[s.id]?.body ?? s.body ?? ""} onChange={e => setEditSend(p => ({ ...p, [s.id]: { ...p[s.id], body: e.target.value } }))}
                            rows={6} className={inp + " resize-none"} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SMTP Launch Modal */}
                <AnimatePresence>
                  {showSmtp && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-6"
                      style={{ background: "rgba(0,0,0,0.08)" }}
                      onClick={() => setShowSmtp(false)}>
                      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.12)" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-slate-800 font-semibold text-sm">SMTP Settings — Launch Campaign</p>
                          <button onClick={() => setShowSmtp(false)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-slate-100">
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                        {[
                          { label: "SMTP Host", val: smtpHost, set: setSmtpHost, ph: "smtp.gmail.com" },
                          { label: "SMTP Port", val: smtpPort, set: setSmtpPort, ph: "587" },
                          { label: "Username", val: smtpUser, set: setSmtpUser, ph: "you@gmail.com" },
                          { label: "Password", val: smtpPass, set: setSmtpPass, ph: "App password" },
                          { label: "From Email", val: fromEmail, set: setFromEmail, ph: "you@company.com" },
                          { label: "From Name", val: fromName, set: setFromName, ph: "Garry Hutton" },
                        ].map(f => (
                          <div key={f.label}>
                            <label className="text-slate-400 text-xs mb-1 block">{f.label}</label>
                            <input type={f.label === "Password" ? "password" : "text"} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className={inp} />
                          </div>
                        ))}
                        {launchResult && (
                          <div className="p-3 rounded-xl" style={{ background: launchResult.failed ? "rgba(220,50,50,0.1)" : "rgba(50,180,100,0.1)" }}>
                            <p className="text-xs" style={{ color: launchResult.failed ? "#f87171" : "#4ade80" }}>
                              {launchResult.sent} sent{launchResult.failed > 0 ? `, ${launchResult.failed} failed` : " successfully"}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <button onClick={() => setShowSmtp(false)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400" style={{ background: "#EEF2F8" }}>Cancel</button>
                          <button onClick={launchCampaign} disabled={launching}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-800 flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "hsl(155,70%,35%)" }}>
                            {launching ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><Send className="w-4 h-4" />Send {sends.length} Emails</>}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {view === "analytics" && (
          <div className="space-y-4">
            {!analytics ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading analytics…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Contacts", val: analytics.totalContacts || 0, color: "hsl(340,80%,60%)" },
                    { label: "Campaigns", val: analytics.totalCampaigns || 0, color: "hsl(193,100%,40%)" },
                    { label: "Emails Sent", val: analytics.totalSent || 0, color: "hsl(155,70%,50%)" },
                    { label: "Pending Pitches", val: analytics.totalPending || 0, color: "hsl(45,100%,55%)" },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                      <p className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-slate-400 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
                {analytics.bySector && analytics.bySector.length > 0 && (
                  <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                    <p className="text-slate-500 text-xs font-medium mb-3">Contacts by Sector</p>
                    {analytics.bySector.map((s: any) => (
                      <div key={s.sector} className="flex items-center gap-3 mb-2">
                        <p className="text-slate-500 text-xs w-32 truncate">{s.sector}</p>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: "#DCE4F0" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.count / (analytics.totalContacts || 1)) * 100)}%`, background: "hsl(340,80%,50%)" }} />
                        </div>
                        <p className="text-slate-400 text-xs w-6 text-right">{s.count}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

