import React, { useState, useEffect } from "react";
import { Users, UserPlus, Copy, CheckCheck, Loader2, Trash2, RefreshCw } from "lucide-react";
import { getApiBase } from "@/lib/api-base";

const SHARED_PASSWORD = "SiriusTester2026!";

type Tester = { id: number; email: string; createdAt: string };

export function TeamPanel({ pin }: { pin: string }) {
  const API = getApiBase();
  const [testers, setTesters] = useState<Tester[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const headers = { "Content-Type": "application/json", "x-lab-pin": pin };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}auth/testers`, { headers });
      const d = await r.json();
      setTesters(Array.isArray(d) ? d : []);
    } catch { setTesters([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const create = async () => {
    if (!email.trim()) return;
    setCreating(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}auth/create-tester`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ type: "err", text: d.error ?? "Failed to create account." }); }
      else {
        setMsg({ type: "ok", text: `Account created for ${d.email}` });
        setEmail("");
        load();
      }
    } catch { setMsg({ type: "err", text: "Network error. Please try again." }); }
    setCreating(false);
  };

  return (
    <div style={{ padding: "28px 24px", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,198,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={22} style={{ color: "#00C6FF" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Team Access</h1>
          <p style={{ fontSize: 13, color: "rgba(15,23,42,0.5)", margin: 0 }}>Create tester accounts for your team — they can't change their password</p>
        </div>
      </div>

      {/* Shared password card */}
      <div style={{ borderRadius: 16, background: "rgba(0,198,255,0.06)", border: "1.5px solid rgba(0,198,255,0.2)", padding: "18px 20px", marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(15,23,42,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Shared tester password</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "0.04em" }}>{SHARED_PASSWORD}</span>
          <button
            onClick={() => copy(SHARED_PASSWORD, "pw")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(0,198,255,0.3)", background: "rgba(0,198,255,0.08)", cursor: "pointer", color: "#00C6FF", fontSize: 13, fontWeight: 600 }}
          >
            {copied === "pw" ? <><CheckCheck size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "rgba(15,23,42,0.4)", marginTop: 10, lineHeight: 1.6 }}>
          All team testers use this same password. Share it with them alongside their email. They can log in at <strong>sirius-ai.live</strong> — there's no way to change the password from the app.
        </p>
      </div>

      {/* Add tester */}
      <div style={{ borderRadius: 16, background: "#fff", border: "1.5px solid rgba(15,23,42,0.08)", padding: "20px", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <UserPlus size={16} style={{ color: "#00C6FF" }} /> Add team member
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="email"
            placeholder="team.member@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && create()}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(15,23,42,0.1)", fontSize: 14, outline: "none", color: "#0f172a" }}
          />
          <button
            onClick={create}
            disabled={creating || !email.trim()}
            style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: creating || !email.trim() ? "rgba(0,198,255,0.2)" : "#00C6FF", color: creating || !email.trim() ? "#00C6FF" : "#fff", fontSize: 14, fontWeight: 700, cursor: creating || !email.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
          >
            {creating ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creating…</> : "Create account"}
          </button>
        </div>
        {msg && (
          <p style={{ fontSize: 13, marginTop: 10, color: msg.type === "ok" ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
            {msg.type === "ok" ? "✓ " : "✗ "}{msg.text}
          </p>
        )}
      </div>

      {/* Tester list */}
      <div style={{ borderRadius: 16, background: "#fff", border: "1.5px solid rgba(15,23,42,0.08)", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            All accounts ({testers.length})
          </p>
          <button onClick={load} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(15,23,42,0.4)", fontSize: 13 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading…
          </div>
        ) : testers.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(15,23,42,0.4)", textAlign: "center", padding: "16px 0" }}>No accounts yet. Add team members above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {testers.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.06)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{t.email}</p>
                  <p style={{ fontSize: 11, color: "rgba(15,23,42,0.35)", margin: 0 }}>
                    acct_{t.id} · Created {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => copy(t.email, `email-${t.id}`)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: copied === `email-${t.id}` ? "#00C6FF" : "rgba(15,23,42,0.3)", padding: 4 }}
                  title="Copy email"
                >
                  {copied === `email-${t.id}` ? <CheckCheck size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
