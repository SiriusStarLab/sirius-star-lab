import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, Plus, X, Send, Loader2, ChevronRight, Settings, ArrowLeft, Mic, Edit3, Check, Zap, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

// ── Types ─────────────────────────────────────────────────────────────────────

type DreamProfile = {
  id: number; userId: string; displayName: string; personality: string;
  lifestyle: string; coreValues: string; bigDream: string;
  manifestationStyle: string; colourTheme: string;
};

type Dream = {
  id: number; userId: string; title: string; description: string;
  category: string; status: string; affirmations: string;
  siriusInsights: string; energyLevel: number; pinned: boolean;
  colour: string; emoji: string; createdAt: string;
};

type ChatMsg = { id?: number; role: "user" | "assistant"; content: string; createdAt?: string };

// ── Theme ─────────────────────────────────────────────────────────────────────

type ThemeKey = "ocean" | "cosmic" | "forest" | "ember" | "slate";
type Theme = {
  bg: string; sidebar: string; card: string; cardHover: string; cardActive: string;
  border: string; borderActive: string; accent: string; accentGreen: string;
  text: string; textMid: string; textFaint: string; msgBg: string; inputBg: string;
};
const THEMES: Record<ThemeKey, Theme> = {
  ocean: {
    bg: "#16243E", sidebar: "#111D34", card: "rgba(255,255,255,0.07)",
    cardHover: "rgba(255,255,255,0.11)", cardActive: "rgba(0,196,255,0.13)",
    border: "rgba(180,210,255,0.12)", borderActive: "rgba(0,196,255,0.35)",
    accent: "#00C4FF", accentGreen: "#00E5A0", text: "#EDF4FF",
    textMid: "rgba(190,215,245,0.75)", textFaint: "rgba(140,170,210,0.55)",
    msgBg: "rgba(255,255,255,0.08)", inputBg: "rgba(0,0,0,0.18)",
  },
  cosmic: {
    bg: "#1A1230", sidebar: "#140D28", card: "rgba(255,255,255,0.07)",
    cardHover: "rgba(255,255,255,0.11)", cardActive: "rgba(168,85,247,0.13)",
    border: "rgba(200,180,255,0.12)", borderActive: "rgba(168,85,247,0.4)",
    accent: "#C084FC", accentGreen: "#A78BFA", text: "#F0EAFF",
    textMid: "rgba(210,195,245,0.75)", textFaint: "rgba(160,140,210,0.55)",
    msgBg: "rgba(255,255,255,0.07)", inputBg: "rgba(0,0,0,0.22)",
  },
  forest: {
    bg: "#0F2019", sidebar: "#0A1A12", card: "rgba(255,255,255,0.07)",
    cardHover: "rgba(255,255,255,0.10)", cardActive: "rgba(52,211,153,0.12)",
    border: "rgba(150,220,180,0.12)", borderActive: "rgba(52,211,153,0.4)",
    accent: "#34D399", accentGreen: "#6EE7B7", text: "#EDFAF4",
    textMid: "rgba(180,240,210,0.70)", textFaint: "rgba(110,170,140,0.55)",
    msgBg: "rgba(255,255,255,0.07)", inputBg: "rgba(0,0,0,0.22)",
  },
  ember: {
    bg: "#201408", sidebar: "#190F05", card: "rgba(255,255,255,0.07)",
    cardHover: "rgba(255,255,255,0.10)", cardActive: "rgba(251,146,60,0.12)",
    border: "rgba(255,200,140,0.12)", borderActive: "rgba(251,146,60,0.4)",
    accent: "#FB923C", accentGreen: "#FBBF24", text: "#FFF7ED",
    textMid: "rgba(255,220,180,0.75)", textFaint: "rgba(180,140,90,0.55)",
    msgBg: "rgba(255,255,255,0.07)", inputBg: "rgba(0,0,0,0.24)",
  },
  slate: {
    bg: "#1A1F2E", sidebar: "#141924", card: "rgba(255,255,255,0.07)",
    cardHover: "rgba(255,255,255,0.10)", cardActive: "rgba(99,102,241,0.12)",
    border: "rgba(180,185,220,0.12)", borderActive: "rgba(99,102,241,0.4)",
    accent: "#818CF8", accentGreen: "#6EE7B7", text: "#EEF0FF",
    textMid: "rgba(190,195,235,0.75)", textFaint: "rgba(130,135,180,0.55)",
    msgBg: "rgba(255,255,255,0.07)", inputBg: "rgba(0,0,0,0.22)",
  },
};
const THEME_SWATCHES: { key: ThemeKey; label: string; dot: string }[] = [
  { key: "ocean",  label: "Ocean",  dot: "#00C4FF" },
  { key: "cosmic", label: "Cosmic", dot: "#C084FC" },
  { key: "forest", label: "Forest", dot: "#34D399" },
  { key: "ember",  label: "Ember",  dot: "#FB923C" },
  { key: "slate",  label: "Slate",  dot: "#818CF8" },
];
let T: Theme = THEMES[((): ThemeKey => { try { return (localStorage.getItem("dream_theme") as ThemeKey) || "ocean"; } catch { return "ocean"; } })()];

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  seed:       { label: "🌱 Seed",      color: "rgba(34,197,94,0.8)",   glow: "rgba(34,197,94,0.15)" },
  growing:    { label: "🌿 Growing",   color: "rgba(6,182,212,0.8)",   glow: "rgba(6,182,212,0.15)" },
  blooming:   { label: "🌸 Blooming",  color: "rgba(168,85,247,0.8)",  glow: "rgba(168,85,247,0.15)" },
  manifested: { label: "⭐ Manifested", color: "rgba(245,158,11,0.8)", glow: "rgba(245,158,11,0.15)" },
};

const STATUSES = ["seed", "growing", "blooming", "manifested"];

// ── API helper ────────────────────────────────────────────────────────────────

function useApi() {
  const base = getApiBase();
  const userId = getUserId();
  const headers = { "Content-Type": "application/json", "x-dream-user": userId };
  return {
    get: (path: string) => fetch(`${base}${path}`, { headers }),
    post: (path: string, body?: any) => fetch(`${base}${path}`, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined }),
    put: (path: string, body?: any) => fetch(`${base}${path}`, { method: "PUT", headers, body: body ? JSON.stringify(body) : undefined }),
    del: (path: string) => fetch(`${base}${path}`, { method: "DELETE", headers }),
  };
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.seed;
  return (
    <span style={{
      fontSize: small ? "0.6rem" : "0.65rem",
      fontWeight: 600,
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: "20px",
      color: s.color,
      background: s.glow,
      letterSpacing: "0.03em",
      whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

// ── DreamSidebar ──────────────────────────────────────────────────────────────

function DreamSidebar({
  dreams, selectedId, onSelect, onNewDream, profile, themeKey, onThemeChange,
}: {
  dreams: Dream[]; selectedId: number | null;
  onSelect: (d: Dream) => void; onNewDream: () => void; profile: DreamProfile | null;
  themeKey: ThemeKey; onThemeChange: (k: ThemeKey) => void;
}) {
  const sorted = [...dreams].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div style={{
      width: "260px",
      flexShrink: 0,
      background: T.sidebar,
      borderRight: `1px solid ${T.border}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Sidebar header */}
      <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.15em", color: T.textFaint, textTransform: "uppercase", fontWeight: 600 }}>
            My Dreams
          </p>
          {profile?.displayName && (
            <span style={{ fontSize: "0.65rem", color: T.textMid }}>{profile.displayName}</span>
          )}
        </div>
        <button
          onClick={onNewDream}
          style={{
            width: "100%",
            background: "rgba(0,196,255,0.08)",
            border: "1px dashed rgba(0,196,255,0.25)",
            borderRadius: "10px",
            color: T.accent,
            fontSize: "0.78rem",
            fontWeight: 500,
            padding: "9px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            letterSpacing: "0.02em",
            transition: "all 0.2s",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Plant a new dream
        </button>
      </div>

      {/* Dream list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {sorted.length === 0 && (
          <div style={{ padding: "24px 12px", textAlign: "center" }}>
            <p style={{ fontSize: "0.75rem", color: T.textFaint, lineHeight: 1.6 }}>
              No dreams yet.<br />Plant your first one above.
            </p>
          </div>
        )}
        {sorted.map(d => {
          const isActive = d.id === selectedId;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d)}
              style={{
                width: "100%",
                background: isActive ? T.cardActive : "transparent",
                border: `1px solid ${isActive ? T.borderActive : "transparent"}`,
                borderRadius: "10px",
                padding: "10px 12px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "3px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = T.cardHover; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>

                <span style={{ fontSize: "1rem", flexShrink: 0, lineHeight: 1.2 }}>{d.emoji || "✨"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "0.8rem", fontWeight: isActive ? 600 : 400,
                    color: isActive ? T.text : "rgba(200,220,240,0.8)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    marginBottom: "4px", lineHeight: 1.3,
                  }}>{d.title}</p>
                  <StatusBadge status={d.status} small />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Theme picker */}
      <div style={{
        padding: "10px 14px 12px",
        borderTop: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <p style={{ fontSize: "0.6rem", color: T.textFaint, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>Theme</p>
        <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
          {THEME_SWATCHES.map(s => (
            <button
              key={s.key}
              title={s.label}
              onClick={() => onThemeChange(s.key)}
              style={{
                width: 20, height: 20,
                borderRadius: "50%",
                background: s.dot,
                border: themeKey === s.key ? `2px solid ${T.text}` : "2px solid transparent",
                cursor: "pointer",
                padding: 0,
                boxShadow: themeKey === s.key ? `0 0 0 2px ${s.dot}55` : "none",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── NewDreamForm ──────────────────────────────────────────────────────────────

function NewDreamForm({ onCreated, onCancel }: { onCreated: (d: Dream) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const api = useApi();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const r = await api.post("dream-lab/ideas", {
        title: title.trim(),
        description: desc.trim(),
        category: "dream",
        energyLevel: 7,
      });
      if (r.ok) {
        const d = await r.json();
        onCreated(d);
      }
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "480px",
        background: T.sidebar,
        border: `1px solid ${T.borderActive}`,
        borderRadius: "20px",
        padding: "32px 28px",
        boxShadow: "0 0 60px rgba(0,196,255,0.08)",
      }}>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #00C4FF, #00E5A0)", borderRadius: "2px", marginBottom: "24px" }} />
        <h2 style={{ fontSize: "1.1rem", fontWeight: 300, color: T.text, marginBottom: "6px", letterSpacing: "-0.01em" }}>
          Plant a new dream
        </h2>
        <p style={{ fontSize: "0.78rem", color: T.textMid, marginBottom: "22px" }}>
          Give it a name — Sirius will help you grow it from here.
        </p>

        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && submit()}
          placeholder="Name your dream…"
          style={{
            width: "100%", background: T.inputBg, border: `1px solid ${T.border}`,
            borderRadius: "10px", color: T.text, fontSize: "0.9rem",
            padding: "12px 14px", outline: "none", marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="A little more detail… (optional)"
          rows={3}
          style={{
            width: "100%", background: T.inputBg, border: `1px solid ${T.border}`,
            borderRadius: "10px", color: T.text, fontSize: "0.82rem",
            padding: "10px 14px", outline: "none", resize: "none", marginBottom: "20px",
            boxSizing: "border-box", lineHeight: 1.6,
          }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{
            flex: 1, background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: "10px", color: T.textMid, fontSize: "0.82rem",
            padding: "11px", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={submit} disabled={!title.trim() || saving} style={{
            flex: 2,
            background: title.trim() ? "linear-gradient(135deg, #00C4FF, #00E5A0)" : T.card,
            border: "none", borderRadius: "10px",
            color: title.trim() ? "#0B0F19" : T.textFaint,
            fontSize: "0.82rem", fontWeight: 700,
            padding: "11px", cursor: title.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}>
            {saving ? "Planting…" : "Plant dream"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── DreamConversation ─────────────────────────────────────────────────────────

function DreamConversation({
  dream, profile, onDreamUpdated, onBack,
}: {
  dream: Dream; profile: DreamProfile | null;
  onDreamUpdated: (d: Dream) => void; onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(dream.title);
  const [statusSuggestion, setStatusSuggestion] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const msgCountRef = useRef(0);
  const voiceRef = useRef<any>(null);
  const api = useApi();
  const base = getApiBase();
  const userId = getUserId();

  useEffect(() => { setTitleDraft(dream.title); }, [dream.id, dream.title]);

  // Load messages from DB when dream changes; auto-initiate if none exist
  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setLoading(true);
    setStatusSuggestion(null);
    setChips([]);

    api.get(`dream-lab/dreams/${dream.id}/messages`).then(async r => {
      if (!r.ok || cancelled) return;
      const data = await r.json();
      if (data.length > 0) {
        setMessages(data);
        setLoading(false);
      } else {
        // No messages yet — Sirius generates a real opening
        setLoading(false);
        if (cancelled) return;
        const assistantMsg: ChatMsg = { role: "assistant", content: "" };
        setMessages([assistantMsg]);
        setStreaming(true);
        try {
          const res = await fetch(`${base}dream-lab/dreams/${dream.id}/initiate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-dream-user": userId },
          });
          if (!res.body || cancelled) { setStreaming(false); return; }
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          let reply = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done || cancelled) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const d = JSON.parse(line.slice(6));
                if (d.text) {
                  reply += d.text;
                  if (!cancelled) setMessages([{ role: "assistant", content: reply }]);
                }
              } catch {}
            }
          }
          if (!cancelled && reply) setChips(buildChips(reply));
        } catch {} finally {
          if (!cancelled) setStreaming(false);
        }
      }
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [dream.id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNew = messages.length !== msgCountRef.current;
    msgCountRef.current = messages.length;
    if (isNew) {
      setTimeout(() => {
        const c = containerRef.current;
        if (!c) return;
        c.scrollTo({ top: Math.max(0, c.scrollHeight - c.clientHeight * 1.15), behavior: "smooth" });
      }, 40);
      return;
    }
    const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (dist < 120) container.scrollTop = container.scrollHeight;
  }, [messages, streaming]);

  const detectStatusSuggestion = (text: string) => {
    const lower = text.toLowerCase();
    const currentIdx = STATUSES.indexOf(dream.status);
    const nextStatus = STATUSES[currentIdx + 1];
    if (!nextStatus) return;

    const growKeywords = ["ready to grow", "ready to move", "time to move", "graduating", "next stage", "next phase", "level up", "moving forward", "growing phase", "mark this as growing", "mark this as blooming", "mark this as manifested"];
    if (growKeywords.some(k => lower.includes(k))) {
      setStatusSuggestion(nextStatus);
    }
  };

  const buildChips = (text: string): string[] => {
    const lower = text.toLowerCase();
    const out: string[] = [];
    if (lower.includes("fear") || lower.includes("block") || lower.includes("stuck")) out.push("What's really holding me back?");
    if (lower.includes("step") || lower.includes("action") || lower.includes("plan")) out.push("Help me plan the first 30 days");
    if (lower.includes("affirmation") || lower.includes("manifest")) out.push("Create affirmations for this");
    if (lower.includes("money") || lower.includes("revenue") || lower.includes("income")) out.push("How do I make this financially real?");
    if (lower.includes("timeline") || lower.includes("goal") || lower.includes("target")) out.push("What does success look like in 90 days?");
    const fallbacks = [
      "Tell me more about the vision",
      "What would I regret not doing?",
      "Give me a challenge for this week",
      "What's the boldest version of this dream?",
    ];
    for (const f of fallbacks) {
      if (out.length >= 3) break;
      if (!out.includes(f)) out.push(f);
    }
    return out.slice(0, 3);
  };

  const send = async (override?: string) => {
    const msg = (override || input).trim();
    if (!msg || streaming) return;
    setInput("");
    setChips([]);
    setStatusSuggestion(null);

    const userMsg: ChatMsg = { role: "user", content: msg };
    const assistantMsg: ChatMsg = { role: "assistant", content: "" };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch(`${base}dream-lab/dreams/${dream.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dream-user": userId },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.text) {
              reply += d.text;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: reply };
                return copy;
              });
            }
            if (d.suggestStage) {
              setStatusSuggestion(d.suggestStage);
            }
          } catch {}
        }
      }

      if (!statusSuggestion) detectStatusSuggestion(reply);
      setChips(buildChips(reply));
    } finally {
      setStreaming(false);
    }
  };

  const upgradeStatus = async () => {
    if (!statusSuggestion) return;
    const r = await api.put(`dream-lab/ideas/${dream.id}`, { status: statusSuggestion });
    if (r.ok) {
      const updated = await r.json();
      onDreamUpdated(updated);
      setStatusSuggestion(null);
    }
  };

  const saveTitle = async () => {
    if (!titleDraft.trim()) return;
    const r = await api.put(`dream-lab/ideas/${dream.id}`, { title: titleDraft.trim() });
    if (r.ok) {
      const updated = await r.json();
      onDreamUpdated(updated);
    }
    setEditingTitle(false);
  };

  const startVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec || voiceActive) return;
    const rec = new SpeechRec();
    voiceRef.current = rec;
    rec.lang = "en-GB"; rec.continuous = false; rec.interimResults = false;
    rec.onstart = () => setVoiceActive(true);
    rec.onerror = () => setVoiceActive(false);
    rec.onend = () => setVoiceActive(false);
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript?.trim() || "";
      if (text) { setVoiceActive(false); rec.stop(); setInput(text); }
    };
    rec.start();
  };

  const stopVoice = () => {
    try { voiceRef.current?.stop(); } catch {}
    voiceRef.current = null;
    setVoiceActive(false);
  };

  const sc = STATUS_CONFIG[dream.status] || STATUS_CONFIG.seed;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <Sparkles style={{ color: T.accent, opacity: 0.4, animation: "spin 2s linear infinite" }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden", position: "relative" }}>

      {/* Dream header */}
      <div style={{
        padding: "12px 20px",
        borderBottom: `1px solid ${T.border}`,
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          <button onClick={onBack} style={{
            background: "transparent", border: "none", color: T.textMid,
            cursor: "pointer", padding: "4px", display: "flex", alignItems: "center",
            flexShrink: 0,
          }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{dream.emoji}</span>

          {editingTitle ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
              <input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                autoFocus
                style={{
                  flex: 1, background: T.inputBg, border: `1px solid ${T.borderActive}`,
                  borderRadius: "8px", color: T.text, fontSize: "0.9rem",
                  padding: "6px 10px", outline: "none",
                }}
              />
              <button onClick={saveTitle} style={{ background: "transparent", border: "none", color: T.accent, cursor: "pointer" }}>
                <Check style={{ width: 16, height: 16 }} />
              </button>
              <button onClick={() => setEditingTitle(false)} style={{ background: "transparent", border: "none", color: T.textFaint, cursor: "pointer" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingTitle(true)} style={{
              background: "transparent", border: "none", color: T.text,
              fontSize: "0.9rem", fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
              textAlign: "left", minWidth: 0,
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dream.title}</span>
              <Edit3 style={{ width: 12, height: 12, color: T.textFaint, flexShrink: 0 }} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <StatusBadge status={dream.status} />
        </div>
      </div>

      {/* Status upgrade suggestion */}
      <AnimatePresence>
        {statusSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: "10px 20px",
              background: "rgba(0,229,160,0.06)",
              borderBottom: "1px solid rgba(0,229,160,0.15)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "rgba(0,229,160,0.8)" }}>
              <TrendingUp style={{ width: 12, height: 12, display: "inline", marginRight: 6 }} />
              Sirius thinks this dream is ready to move to {STATUS_CONFIG[statusSuggestion]?.label}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={upgradeStatus} style={{
                background: "rgba(0,229,160,0.15)", border: "1px solid rgba(0,229,160,0.3)",
                borderRadius: "8px", color: "rgba(0,229,160,0.9)", fontSize: "0.72rem",
                fontWeight: 600, padding: "4px 12px", cursor: "pointer",
              }}>Move up ✓</button>
              <button onClick={() => setStatusSuggestion(null)} style={{
                background: "transparent", border: "none", color: T.textFaint, cursor: "pointer",
              }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: "10px" }}
          >
            {msg.role === "assistant" && (
              <div style={{
                width: 32, height: 32, borderRadius: "10px", flexShrink: 0,
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentGreen})`,
                display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2,
              }}>
                <Sparkles style={{ width: 14, height: 14, color: "#0B0F19" }} />
              </div>
            )}
            <div style={{ maxWidth: "78%" }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                background: msg.role === "user"
                  ? `linear-gradient(135deg, ${T.accent}CC, ${T.accentGreen}AA)`
                  : T.msgBg,
                border: msg.role === "assistant" ? `1px solid ${T.border}` : "none",
                color: msg.role === "user" ? "#0B0F19" : T.text,
                fontSize: "0.85rem",
                lineHeight: 1.65,
              }}>
                {streaming && i === messages.length - 1 && msg.role === "assistant" && !msg.content ? (
                  <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
                    {[0,1,2].map(d => (
                      <span key={d} style={{
                        width: 6, height: 6, borderRadius: "50%", background: T.accent, display: "inline-block",
                        animation: `dlb 1.1s ease-in-out infinite`, animationDelay: `${d * 0.18}s`,
                      }} />
                    ))}
                  </div>
                ) : (
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                    {msg.content}
                    {streaming && i === messages.length - 1 && msg.role === "assistant" && msg.content && (
                      <span style={{ opacity: 0.7, animation: "pulse 1s infinite" }}>▊</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Quick reply chips */}
        {!streaming && chips.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingLeft: "42px" }}
          >
            {chips.map((c, i) => (
              <button
                key={i}
                onClick={() => { setChips([]); send(c); }}
                style={{
                  background: T.msgBg, border: `1px solid ${T.border}`,
                  borderRadius: "20px", color: T.accent, fontSize: "0.75rem",
                  padding: "6px 14px", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }}
              >{c}</button>
            ))}
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: "12px 20px 16px", borderTop: `1px solid ${T.border}`, background: "rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <button
            onClick={voiceActive ? stopVoice : startVoice}
            disabled={streaming}
            style={{
              width: 40, height: 40, borderRadius: "12px", flexShrink: 0,
              background: voiceActive ? "#e53e3e" : T.card,
              border: `1px solid ${voiceActive ? "transparent" : T.border}`,
              color: voiceActive ? "#fff" : T.accent,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              opacity: streaming ? 0.4 : 1,
            }}
          >
            {voiceActive ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Mic style={{ width: 15, height: 15 }} />}
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Share anything about this dream — your thoughts, fears, ideas, progress…"
            rows={1}
            style={{
              flex: 1, background: T.inputBg, border: `1px solid ${T.border}`,
              borderRadius: "14px", color: T.text, fontSize: "0.85rem",
              padding: "10px 14px", outline: "none", resize: "none",
              minHeight: 42, maxHeight: 200, lineHeight: 1.5,
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            style={{
              width: 40, height: 40, borderRadius: "12px", flexShrink: 0,
              background: streaming || !input.trim() ? T.card : `linear-gradient(135deg, ${T.accent}, ${T.accentGreen})`,
              border: "none", cursor: !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {streaming
              ? <Loader2 style={{ width: 15, height: 15, color: T.accent, animation: "spin 1s linear infinite" }} />
              : <Send style={{ width: 15, height: 15, color: input.trim() ? "#0B0F19" : T.textFaint }} />}
          </button>
        </div>
        <p style={{ fontSize: "0.65rem", color: T.textFaint, textAlign: "center", marginTop: "8px" }}>
          Sirius remembers everything — this conversation never gets lost
        </p>
      </div>

      <style>{`
        @keyframes dlb { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

// ── WelcomeView ────────────────────────────────────────────────────────────────

function WelcomeView({ profile, onNewDream }: { profile: DreamProfile | null; onNewDream: () => void }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: T.bg, padding: "40px 24px",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "16px",
        background: `linear-gradient(135deg, rgba(0,196,255,0.15), rgba(0,229,160,0.1))`,
        border: `1px solid rgba(0,196,255,0.2)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "20px",
        boxShadow: "0 0 40px rgba(0,196,255,0.08)",
      }}>
        <Sparkles style={{ width: 24, height: 24, color: T.accent }} />
      </div>

      <h2 style={{
        fontSize: "1.4rem", fontWeight: 300, color: T.text,
        letterSpacing: "-0.01em", textAlign: "center", marginBottom: "10px",
      }}>
        {profile?.displayName ? `What shall we build today, ${profile.displayName}?` : "What dream shall we build together?"}
      </h2>
      <p style={{
        fontSize: "0.85rem", color: T.textMid, textAlign: "center",
        maxWidth: "360px", lineHeight: 1.7, marginBottom: "32px",
      }}>
        Each dream gets its own space. Sirius will remember every conversation, coach you through every stage, and help you turn ideas into reality.
      </p>

      <button
        onClick={onNewDream}
        style={{
          background: "linear-gradient(135deg, rgba(0,196,255,0.12), rgba(0,229,160,0.08))",
          border: "1px dashed rgba(0,196,255,0.35)",
          borderRadius: "14px",
          color: T.accent,
          fontSize: "0.85rem",
          fontWeight: 500,
          padding: "14px 28px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "all 0.2s",
          letterSpacing: "0.02em",
        }}
      >
        <Plus style={{ width: 16, height: 16 }} />
        Plant your first dream
      </button>

      <div style={{ marginTop: "48px", display: "flex", gap: "32px", opacity: 0.4 }}>
        {["Dream it", "Build it", "Live it"].map((step, i) => (
          <div key={step} style={{ textAlign: "center" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i === 0 ? T.accent : i === 1 ? T.accentGreen : "rgba(168,85,247,0.8)",
              margin: "0 auto 6px",
            }} />
            <p style={{ fontSize: "0.65rem", color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.12em" }}>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── OnboardingView ─────────────────────────────────────────────────────────────

function OnboardingView({ onComplete }: { onComplete: (p: DreamProfile) => void }) {
  const [name, setName] = useState("");
  const [bigDream, setBigDream] = useState("");
  const [saving, setSaving] = useState(false);
  const api = useApi();

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const r = await api.post("dream-lab/profile", {
        displayName: name.trim(),
        bigDream: bigDream.trim(),
        colourTheme: "cosmic",
        personality: "", lifestyle: "", coreValues: "", manifestationStyle: "",
      });
      if (r.ok) {
        const p = await r.json();
        onComplete(p);
      }
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: T.bg, padding: "40px 24px",
    }}>
      <div style={{
        width: "100%", maxWidth: "440px",
        background: "#0D1526",
        border: `1px solid ${T.borderActive}`,
        borderRadius: "24px",
        padding: "36px 32px",
        boxShadow: "0 0 80px rgba(0,196,255,0.06)",
      }}>
        <div style={{ height: "2px", background: "linear-gradient(90deg, #00C4FF, #00E5A0)", borderRadius: "2px", marginBottom: "28px" }} />
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "14px",
            background: "rgba(0,196,255,0.1)", border: "1px solid rgba(0,196,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Star style={{ width: 22, height: 22, color: T.accent }} />
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 300, color: T.text, marginBottom: "8px" }}>
            Welcome to Dream Lab
          </h2>
          <p style={{ fontSize: "0.82rem", color: T.textMid, lineHeight: 1.6 }}>
            This is your private space with Sirius. Let's set it up.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: T.textMid, letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
              What's your name?
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name…"
              autoFocus
              style={{
                width: "100%", background: T.inputBg, border: `1px solid ${T.border}`,
                borderRadius: "10px", color: T.text, fontSize: "0.88rem",
                padding: "11px 14px", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: T.textMid, letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
              What's the big dream you're working toward? (optional)
            </label>
            <textarea
              value={bigDream}
              onChange={e => setBigDream(e.target.value)}
              placeholder="Describe it freely — a sentence or a paragraph…"
              rows={3}
              style={{
                width: "100%", background: T.inputBg, border: `1px solid ${T.border}`,
                borderRadius: "10px", color: T.text, fontSize: "0.82rem",
                padding: "10px 14px", outline: "none", resize: "none",
                boxSizing: "border-box", lineHeight: 1.6, fontFamily: "inherit",
              }}
            />
          </div>
          <button
            onClick={submit}
            disabled={!name.trim() || saving}
            style={{
              background: name.trim() ? "linear-gradient(135deg, #00C4FF, #00E5A0)" : T.card,
              border: "none", borderRadius: "12px",
              color: name.trim() ? "#0B0F19" : T.textFaint,
              fontSize: "0.88rem", fontWeight: 700,
              padding: "13px", cursor: name.trim() ? "pointer" : "not-allowed",
              marginTop: "4px", transition: "all 0.2s",
            }}
          >
            {saving ? "Setting up…" : "Enter Dream Lab →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DreamLabPage (main) ────────────────────────────────────────────────────────

export function DreamLabPage() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewDream, setShowNewDream] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    try { return (localStorage.getItem("dream_theme") as ThemeKey) || "ocean"; } catch { return "ocean"; }
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  T = THEMES[themeKey];
  const api = useApi();

  const handleThemeChange = (k: ThemeKey) => {
    try { localStorage.setItem("dream_theme", k); } catch { /* */ }
    setThemeKey(k);
  };

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([
        api.get("dream-lab/profile"),
        api.get("dream-lab/ideas"),
      ]);
      if (pRes.ok) {
        const p = await pRes.json();
        if (p) {
          setProfile(p);
          setOnboarding(false);
        } else {
          setOnboarding(true);
        }
      } else {
        setOnboarding(true);
      }
      if (dRes.status === 403) {
        setUpgradeRequired(true);
      } else if (dRes.ok) {
        const d = await dRes.json();
        setDreams(d);
        if (d.length > 0 && !selectedDream) {
          setSelectedDream(d[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDreamCreated = (d: Dream) => {
    setDreams(prev => [d, ...prev]);
    setSelectedDream(d);
    setShowNewDream(false);
  };

  const handleDreamUpdated = (updated: Dream) => {
    setDreams(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDream(updated);
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Sparkles style={{ color: T.accent, opacity: 0.5, animation: "spin 2s linear infinite" }} />
          <p style={{ fontSize: "0.8rem", color: T.textFaint }}>Loading Dream Lab…</p>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const isSignedIn = !!localStorage.getItem("sirius_account_email");

  if (!isSignedIn) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #04081a 0%, #070d20 55%, #050e1b 100%)",
        color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", padding: "32px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🌱</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10, lineHeight: 1.2 }}>Dream Lab</h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 380, lineHeight: 1.65, marginBottom: 32 }}>
          Build and track your dreams with Sirius — full memory, stage progression, and a dedicated space for every goal. Sign in or create an account to get started.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          <button
            onClick={() => setLocation("/")}
            style={{
              padding: "14px 32px", borderRadius: 12, border: "none",
              background: "hsl(193,100%,45%)", color: "#04081a",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>
            Sign in / Create account
          </button>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.5, margin: 0 }}>
            Open the account menu from the sidebar after signing in
          </p>
        </div>
        <button onClick={() => setLocation("/")} style={{
          marginTop: 20, background: "none", border: "none", color: "rgba(255,255,255,0.3)",
          fontSize: 13, cursor: "pointer",
        }}>← Back to Sirius</button>
      </div>
    );
  }

  if (upgradeRequired) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #04081a 0%, #070d20 55%, #050e1b 100%)",
        color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", padding: "32px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🌱</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10, lineHeight: 1.2 }}>Dream Lab is a Plus feature</h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 380, lineHeight: 1.65, marginBottom: 32 }}>
          Dream Lab is where Sirius helps you build and track your dreams — with full memory, stage progression, and a dedicated space for every goal. Available on Plus and Pro.
        </p>
        <button
          onClick={() => setLocation("/pricing")}
          style={{
            padding: "14px 32px", borderRadius: 12, border: "none",
            background: "hsl(193,100%,45%)", color: "#04081a",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>
          Upgrade to Plus — £9.99/month
        </button>
        <button onClick={() => setLocation("/")} style={{
          marginTop: 14, background: "none", border: "none", color: "rgba(255,255,255,0.3)",
          fontSize: 13, cursor: "pointer",
        }}>← Back to Sirius</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>

      {/* Top header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 18px", flexShrink: 0,
        borderBottom: `1px solid ${T.border}`,
        background: "rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setLocation("/")} style={{
            background: "transparent", border: "none", color: T.textMid,
            cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
            fontSize: "0.75rem",
          }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
          <div style={{ width: 1, height: 14, background: T.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "8px",
              background: `linear-gradient(135deg, ${T.accent}22, ${T.accentGreen}18)`,
              border: `1px solid rgba(0,196,255,0.2)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Star style={{ width: 12, height: 12, color: T.accent }} />
            </div>
            <span style={{ fontSize: "0.82rem", fontWeight: 500, color: T.text }}>Dream Lab</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.68rem", color: T.textFaint, letterSpacing: "0.05em" }}>
            {profile?.displayName || ""}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {onboarding ? (
          <OnboardingView onComplete={p => { setProfile(p); setOnboarding(false); }} />
        ) : (
          <>
            {/* Sidebar + main area */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Hide sidebar on mobile when a dream is open */}
              {(!isMobile || !selectedDream) && (
                <DreamSidebar
                  dreams={dreams}
                  selectedId={selectedDream?.id ?? null}
                  onSelect={setSelectedDream}
                  onNewDream={() => setShowNewDream(true)}
                  profile={profile}
                  themeKey={themeKey}
                  onThemeChange={handleThemeChange}
                />
              )}

              {selectedDream ? (
                <DreamConversation
                  key={selectedDream.id}
                  dream={selectedDream}
                  profile={profile}
                  onDreamUpdated={handleDreamUpdated}
                  onBack={() => setSelectedDream(null)}
                />
              ) : (
                <WelcomeView profile={profile} onNewDream={() => setShowNewDream(true)} />
              )}
            </div>

            <AnimatePresence>
              {showNewDream && (
                <NewDreamForm
                  onCreated={handleDreamCreated}
                  onCancel={() => setShowNewDream(false)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
