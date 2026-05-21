import React from "react";
import { Plus, RefreshCw, Zap, Check, Package, Loader2 } from "lucide-react";
import { getApiBase } from "@/lib/api-base";

type SiriusUpgradeRow = {
  id: number;
  name: string;
  category: string;
  description: string;
  whyNeeded: string;
  estimatedCost: string | null;
  purchaseUrl: string | null;
  priority: string;
  status: string;
  identifiedBy: string;
  notes: string | null;
  isFree: boolean;
  approvalNeeded: boolean;
  proposalText: string | null;
  implementationNotes: string | null;
  discoveredAt: string;
  updatedAt: string;
};

const UPGRADE_STATUS_TABS = [
  { key: "awaiting_approval", label: "Proposals" },
  { key: "implementing",      label: "Implementing" },
  { key: "wanted",            label: "Wanted" },
  { key: "ordered",           label: "Ordered" },
  { key: "purchased",         label: "Purchased" },
  { key: "installed",         label: "Installed" },
  { key: "declined",          label: "Declined" },
  { key: "dismissed",         label: "Dismissed" },
];

const UPGRADE_PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626", high: "#ea580c", medium: "#ca8a04", low: "#16a34a",
};

const UPGRADE_CATEGORY_COLORS: Record<string, string> = {
  software: "#6366f1", hardware: "#0891b2", api: "#7c3aed",
  service: "#0d9488", knowledge: "#be185d", tool: "#b45309", other: "#6b7280",
};

export function UpgradesPanel({ pin }: { pin: string }) {
  const API = getApiBase();
  const [upgrades, setUpgrades] = React.useState<SiriusUpgradeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string>("awaiting_approval");
  const [scanning, setScanning] = React.useState(false);
  const [scanDone, setScanDone] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [addForm, setAddForm] = React.useState({ name: "", category: "software", description: "", whyNeeded: "", estimatedCost: "", purchaseUrl: "", priority: "medium" });
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = React.useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = React.useState<Set<number>>(new Set());

  const fetchUpgrades = async () => {
    try {
      const r = await fetch(`${API}lab/upgrades`, { headers: { "x-lab-pin": pin } });
      if (r.ok) setUpgrades(await r.json());
    } catch { }
    setLoading(false);
  };

  React.useEffect(() => { fetchUpgrades(); }, []);

  const filtered = upgrades.filter(u => u.status === activeTab);

  const patchUpgrade = async (id: number, body: Record<string, string>) => {
    try {
      const r = await fetch(`${API}lab/upgrades/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify(body) });
      if (r.ok) {
        const updated = await r.json();
        setUpgrades(prev => prev.map(u => u.id === id ? updated : u));
        setStatusMsg(body.status ? `Marked as "${body.status}"` : "Updated");
        setTimeout(() => setStatusMsg(null), 2000);
      }
    } catch { }
  };

  const approveUpgrade = async (id: number) => {
    setActionLoading(prev => new Set(prev).add(id));
    try {
      const r = await fetch(`${API}lab/upgrades/${id}/approve`, { method: "POST", headers: { "x-lab-pin": pin } });
      if (r.ok) {
        const updated = await r.json();
        setUpgrades(prev => prev.map(u => u.id === id ? updated : u));
        setStatusMsg("Approved — Sirius will proceed.");
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch { }
    setActionLoading(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const declineUpgrade = async (id: number) => {
    setActionLoading(prev => new Set(prev).add(id));
    try {
      const r = await fetch(`${API}lab/upgrades/${id}/decline`, { method: "POST", headers: { "x-lab-pin": pin } });
      if (r.ok) {
        const updated = await r.json();
        setUpgrades(prev => prev.map(u => u.id === id ? updated : u));
        setStatusMsg("Declined.");
        setTimeout(() => setStatusMsg(null), 2000);
      }
    } catch { }
    setActionLoading(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const deleteUpgrade = async (id: number) => {
    if (!confirm("Delete this upgrade?")) return;
    try {
      await fetch(`${API}lab/upgrades/${id}`, { method: "DELETE", headers: { "x-lab-pin": pin } });
      setUpgrades(prev => prev.filter(u => u.id !== id));
    } catch { }
  };

  const triggerScan = async () => {
    setScanning(true); setScanDone(false);
    try {
      const r = await fetch(`${API}lab/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ message: "Run a full autonomous upgrade cycle now: first use scan_free_upgrades to find everything free you can activate immediately, then self_implement_upgrade each one. Then use scan_for_upgrades to find the best paid upgrades, add each with add_upgrade_wish, and immediately create a proposal for each with propose_paid_upgrade. Work autonomously — don't ask me questions, just act and report what you've done.", stream: false }),
      });
      if (r.ok) {
        setScanDone(true);
        setTimeout(async () => { await fetchUpgrades(); setScanDone(false); setScanning(false); }, 2000);
        return;
      }
    } catch { }
    setScanning(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}lab/upgrades`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify(addForm) });
      if (r.ok) {
        const row = await r.json();
        setUpgrades(prev => [row, ...prev]);
        setAddForm({ name: "", category: "software", description: "", whyNeeded: "", estimatedCost: "", purchaseUrl: "", priority: "medium" });
        setShowAdd(false);
      }
    } catch { }
    setAdding(false);
  };

  const toggleNotes = (id: number) => {
    setExpandedNotes(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const proposalCount = upgrades.filter(u => u.status === "awaiting_approval").length;
  const implementingCount = upgrades.filter(u => u.status === "implementing").length;
  const countsMap = Object.fromEntries(UPGRADE_STATUS_TABS.map(t => [t.key, upgrades.filter(u => u.status === t.key).length]));

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#F8FAFC" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "hsl(280,80%,58%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Sirius Upgrades</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Sirius finds, proposes, and self-implements her own growth</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => setShowAdd(v => !v)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Add
            </button>
            <button onClick={triggerScan} disabled={scanning} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "hsl(280,80%,58%)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: scanning ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: scanning ? 0.7 : 1 }}>
              {scanning ? (scanDone ? <Check size={14} /> : <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />) : <Zap size={14} />}
              {scanning ? (scanDone ? "Done!" : "Working…") : "Run Autonomous Scan"}
            </button>
          </div>
        </div>

        {proposalCount > 0 && activeTab !== "awaiting_approval" && (
          <div onClick={() => setActiveTab("awaiting_approval")} style={{ background: "hsl(280,80%,96%)", border: "1px solid hsl(280,80%,80%)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={14} color="hsl(280,80%,45%)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(280,80%,35%)" }}>Sirius has {proposalCount} upgrade proposal{proposalCount !== 1 ? "s" : ""} waiting for your decision</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "hsl(280,80%,50%)" }}>View →</span>
          </div>
        )}
        {implementingCount > 0 && activeTab !== "implementing" && (
          <div onClick={() => setActiveTab("implementing")} style={{ background: "hsl(155,70%,96%)", border: "1px solid hsl(155,70%,75%)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={14} color="hsl(155,70%,35%)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(155,70%,25%)" }}>{implementingCount} upgrade{implementingCount !== 1 ? "s" : ""} in progress — needs one API key from you</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "hsl(155,70%,40%)" }}>View →</span>
          </div>
        )}

        {statusMsg && (
          <div style={{ background: "hsl(155,70%,95%)", border: "1px solid hsl(155,70%,75%)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "hsl(155,60%,30%)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> {statusMsg}
          </div>
        )}

        {showAdd && (
          <form onSubmit={handleAddSubmit} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>Add Upgrade Manually</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input required value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Upgrade name *" style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, gridColumn: "1/-1" }} />
              <select value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))} style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }}>
                {Object.keys(UPGRADE_CATEGORY_COLORS).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <select value={addForm.priority} onChange={e => setAddForm(p => ({ ...p, priority: e.target.value }))} style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }}>
                {["critical","high","medium","low"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <input value={addForm.estimatedCost} onChange={e => setAddForm(p => ({ ...p, estimatedCost: e.target.value }))} placeholder="Estimated cost (e.g. £20/mo)" style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <input value={addForm.purchaseUrl} onChange={e => setAddForm(p => ({ ...p, purchaseUrl: e.target.value }))} placeholder="Purchase URL" style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <textarea value={addForm.whyNeeded} onChange={e => setAddForm(p => ({ ...p, whyNeeded: e.target.value }))} placeholder="Why is this needed?" rows={2} style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, gridColumn: "1/-1", resize: "vertical" }} />
              <textarea value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={2} style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, gridColumn: "1/-1", resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="submit" disabled={adding} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "hsl(280,80%,58%)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer" }}>
                {adding ? "Adding…" : "Add Upgrade"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#6b7280", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {UPGRADE_STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid", borderColor: activeTab === tab.key ? "hsl(280,80%,58%)" : "#e2e8f0", background: activeTab === tab.key ? "hsl(280,80%,96%)" : "#fff", color: activeTab === tab.key ? "hsl(280,80%,45%)" : "#374151", fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500, cursor: "pointer" }}>
              {tab.label} {countsMap[tab.key] > 0 && <span style={{ marginLeft: 4, background: activeTab === tab.key ? "hsl(280,80%,58%)" : "#e2e8f0", color: activeTab === tab.key ? "#fff" : "#374151", borderRadius: 10, padding: "0 5px", fontSize: 10 }}>{countsMap[tab.key]}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#94a3b8" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 14 }}>
            No {UPGRADE_STATUS_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} upgrades
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(u => (
              <div key={u.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{u.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: `${UPGRADE_CATEGORY_COLORS[u.category] ?? "#6b7280"}18`, color: UPGRADE_CATEGORY_COLORS[u.category] ?? "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{u.category}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: `${UPGRADE_PRIORITY_COLORS[u.priority] ?? "#6b7280"}18`, color: UPGRADE_PRIORITY_COLORS[u.priority] ?? "#6b7280" }}>{u.priority}</span>
                      {u.isFree && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#f0fdf4", color: "#16a34a" }}>FREE</span>}
                    </div>
                    {u.description && <p style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>{u.description}</p>}
                    {u.whyNeeded && <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}><strong>Why:</strong> {u.whyNeeded}</p>}
                    {u.proposalText && (
                      <div style={{ background: "hsl(280,80%,97%)", border: "1px solid hsl(280,80%,88%)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(280,80%,45%)", marginBottom: 4 }}>PROPOSAL FROM SIRIUS</div>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{u.proposalText}</p>
                      </div>
                    )}
                    {u.implementationNotes && expandedNotes.has(u.id) && (
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                        <p style={{ fontSize: 12, color: "#475569" }}>{u.implementationNotes}</p>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {u.estimatedCost && <span style={{ fontSize: 11, color: "#64748b" }}>💰 {u.estimatedCost}</span>}
                      {u.purchaseUrl && <a href={u.purchaseUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "hsl(193,100%,40%)", textDecoration: "none" }}>🔗 Purchase</a>}
                      {u.implementationNotes && (
                        <button onClick={() => toggleNotes(u.id)} style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          {expandedNotes.has(u.id) ? "Hide notes ▲" : "Show notes ▼"}
                        </button>
                      )}
                      <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: "auto" }}>{new Date(u.discoveredAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    {u.status === "awaiting_approval" && (
                      <>
                        <button onClick={() => approveUpgrade(u.id)} disabled={actionLoading.has(u.id)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #86efac", background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 700, cursor: actionLoading.has(u.id) ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                          {actionLoading.has(u.id) ? "…" : "✓ Approve"}
                        </button>
                        <button onClick={() => declineUpgrade(u.id)} disabled={actionLoading.has(u.id)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: actionLoading.has(u.id) ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>Decline</button>
                      </>
                    )}
                    {u.status === "wanted" && (
                      <>
                        <button onClick={() => patchUpgrade(u.id, { status: "ordered" })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#374151", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Mark Ordered</button>
                        <button onClick={() => patchUpgrade(u.id, { status: "purchased" })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#374151", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Purchased</button>
                        <button onClick={() => patchUpgrade(u.id, { status: "dismissed" })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #fef2f2", background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Dismiss</button>
                      </>
                    )}
                    {u.status === "ordered" && <button onClick={() => patchUpgrade(u.id, { status: "purchased" })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Arrived / Purchased</button>}
                    {u.status === "purchased" && <button onClick={() => patchUpgrade(u.id, { status: "installed" })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Mark Installed</button>}
                    {u.status === "implementing" && <button onClick={() => patchUpgrade(u.id, { status: "installed" })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Mark Installed</button>}
                    {(u.status === "installed" || u.status === "dismissed" || u.status === "declined") && <button onClick={() => patchUpgrade(u.id, { status: "wanted" })} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#374151", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Restore</button>}
                    <button onClick={() => deleteUpgrade(u.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "transparent", color: "#cbd5e1", fontSize: 11, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
