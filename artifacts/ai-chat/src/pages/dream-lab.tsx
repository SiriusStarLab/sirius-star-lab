import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, Flame, Heart, Lightbulb, BookOpen, Plus, X,
  ChevronRight, ChevronDown, Send, Loader2, Trash2, Pin, PinOff,
  Settings, ArrowLeft, Zap, Moon, Sun, Target, TrendingUp, Smile,
  Globe, RefreshCw, Edit3, Check, Wand2
} from "lucide-react";
import { useLocation } from "wouter";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

// ── Types ─────────────────────────────────────────────────────────────────────

type DreamProfile = {
  id: number;
  userId: string;
  displayName: string;
  personality: string;
  lifestyle: string;
  coreValues: string;
  bigDream: string;
  manifestationStyle: string;
  colourTheme: string;
};

type Idea = {
  id: number;
  userId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  affirmations: string;
  siriusInsights: string;
  energyLevel: number;
  pinned: boolean;
  colour: string;
  emoji: string;
  createdAt: string;
};

type Manifestation = {
  id: number;
  text: string;
  type: string;
  frequency: string;
  createdAt: string;
};

type JournalEntry = {
  id: number;
  title: string;
  content: string;
  mood: string;
  tags: string;
  createdAt: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

// ── Colour themes ─────────────────────────────────────────────────────────────

const THEMES: Record<string, { bg: string; gradient: string; accent: string; soft: string; text: string; border: string }> = {
  cosmic:  { bg: "#0f0a1e", gradient: "linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #0f0a1e 100%)", accent: "#a855f7", soft: "rgba(168,85,247,0.12)", text: "#e2d9f3", border: "rgba(168,85,247,0.2)" },
  golden:  { bg: "#1a1200", gradient: "linear-gradient(135deg, #2a1a00 0%, #1a1200 50%, #0f0d00 100%)", accent: "#f59e0b", soft: "rgba(245,158,11,0.12)", text: "#fef3c7", border: "rgba(245,158,11,0.2)" },
  ocean:   { bg: "#001a2e", gradient: "linear-gradient(135deg, #002244 0%, #001a2e 50%, #000f1a 100%)", accent: "#06b6d4", soft: "rgba(6,182,212,0.12)", text: "#cffafe", border: "rgba(6,182,212,0.2)" },
  forest:  { bg: "#051a08", gradient: "linear-gradient(135deg, #0a2e0f 0%, #051a08 50%, #010f03 100%)", accent: "#22c55e", soft: "rgba(34,197,94,0.12)", text: "#dcfce7", border: "rgba(34,197,94,0.2)" },
  rose:    { bg: "#1a0010", gradient: "linear-gradient(135deg, #2e001a 0%, #1a0010 50%, #0f0009 100%)", accent: "#f43f5e", soft: "rgba(244,63,94,0.12)", text: "#ffe4e6", border: "rgba(244,63,94,0.2)" },
  pearl:   { bg: "#F8FAFC", gradient: "linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 50%, #E2E8F0 100%)", accent: "#6d28d9", soft: "rgba(109,40,217,0.08)", text: "#1e1b4b", border: "rgba(109,40,217,0.15)" },
};

const IDEA_COLOURS: Record<string, string> = {
  violet: "#a855f7",
  blue:   "#3b82f6",
  cyan:   "#06b6d4",
  green:  "#22c55e",
  amber:  "#f59e0b",
  rose:   "#f43f5e",
  pink:   "#ec4899",
  indigo: "#6366f1",
};

const CATEGORIES = [
  { id: "idea",       label: "Idea",        emoji: "💡" },
  { id: "business",  label: "Business",     emoji: "🚀" },
  { id: "personal",  label: "Personal",     emoji: "🌱" },
  { id: "creative",  label: "Creative",     emoji: "🎨" },
  { id: "health",    label: "Health",       emoji: "💚" },
  { id: "finance",   label: "Finance",      emoji: "💰" },
  { id: "relationship", label: "Relationships", emoji: "❤️" },
  { id: "spiritual", label: "Spiritual",    emoji: "✨" },
];

const MOODS = [
  { id: "inspired",  emoji: "✨", label: "Inspired"  },
  { id: "grateful",  emoji: "🙏", label: "Grateful"  },
  { id: "excited",   emoji: "⚡", label: "Excited"   },
  { id: "peaceful",  emoji: "🌿", label: "Peaceful"  },
  { id: "focused",   emoji: "🎯", label: "Focused"   },
  { id: "hopeful",   emoji: "🌅", label: "Hopeful"   },
  { id: "joyful",    emoji: "😊", label: "Joyful"    },
  { id: "reflective", emoji: "🌙", label: "Reflective" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function useApiHeaders() {
  const userId = getUserId();
  return { "Content-Type": "application/json", "x-dream-user": userId };
}

function useApi() {
  const base = getApiBase();
  const userId = getUserId();
  const h = () => ({ "Content-Type": "application/json", "x-dream-user": userId });
  const get = (path: string) => fetch(`${base}${path}`, { headers: { "x-dream-user": userId } });
  const post = (path: string, body?: any) => fetch(`${base}${path}`, { method: "POST", headers: h(), body: JSON.stringify(body) });
  const put = (path: string, body?: any) => fetch(`${base}${path}`, { method: "PUT", headers: h(), body: JSON.stringify(body) });
  const del = (path: string) => fetch(`${base}${path}`, { method: "DELETE", headers: { "x-dream-user": userId } });
  return { get, post, put, del };
}

// ── Main Component ────────────────────────────────────────────────────────────

type DreamView = "board" | "idea-detail" | "manifestations" | "journal" | "settings" | "chat" | "onboard";

export function DreamLabPage() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<DreamView>("board");
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [theme, setTheme] = useState<string>("cosmic");
  const api = useApi();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const r = await api.get("dream-lab/profile");
      if (r.ok) {
        const p = await r.json();
        if (p) {
          setProfile(p);
          setTheme(p.colourTheme || "cosmic");
          setView("board");
        } else {
          setView("onboard");
        }
      } else {
        setView("onboard");
      }
    } catch {
      setView("onboard");
    } finally {
      setLoading(false);
    }
  };

  const T = THEMES[theme] || THEMES.cosmic;
  const isPearl = theme === "pearl";

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: THEMES.cosmic.gradient }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.2)" }}>
            <Sparkles className="w-8 h-8 animate-pulse" style={{ color: "#a855f7" }} />
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Loading your Dream Lab…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: T.gradient }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${T.border}`, background: `rgba(0,0,0,${isPearl ? "0.03" : "0.3"})`, backdropFilter: "blur(20px)" }}>

        <div className="flex items-center gap-3">
          {(view === "board" || view === "onboard") ? (
            <button onClick={() => setLocation("/")}
              title="Back to Sirius"
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: T.soft, color: T.accent }}>
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => { setView("board"); setSelectedIdea(null); }}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: T.soft, color: T.accent }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.accent}88)` }}>
              <Star className="w-4 h-4" style={{ color: isPearl ? "#fff" : "#fff" }} />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none" style={{ color: T.text }}>Dream Lab</h1>
              <p className="text-[10px] mt-0.5" style={{ color: `${T.text}80` }}>
                {profile?.displayName ? `${profile.displayName}'s space` : "Your personal space"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setView("chat")} title="Chat with Sirius"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: view === "chat" ? T.accent : T.soft, color: view === "chat" ? "#fff" : T.accent }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sirius</span>
          </button>
          <button onClick={() => setView("manifestations")} title="Manifestations"
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
            style={{ background: view === "manifestations" ? T.accent : T.soft, color: view === "manifestations" ? "#fff" : T.accent }}>
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView("journal")} title="Dream Journal"
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
            style={{ background: view === "journal" ? T.accent : T.soft, color: view === "journal" ? "#fff" : T.accent }}>
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView("settings")} title="Personalise"
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
            style={{ background: view === "settings" ? T.accent : T.soft, color: view === "settings" ? "#fff" : T.accent }}>
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "onboard" && (
            <motion.div key="onboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full">
              <OnboardView T={T} theme={theme} onComplete={(p) => { setProfile(p); setTheme(p.colourTheme); setView("board"); }} />
            </motion.div>
          )}
          {view === "board" && (
            <motion.div key="board" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="h-full">
              <BoardView T={T} profile={profile} theme={theme} onSelectIdea={(idea) => { setSelectedIdea(idea); setView("idea-detail"); }} />
            </motion.div>
          )}
          {view === "idea-detail" && selectedIdea && (
            <motion.div key="idea-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="h-full">
              <IdeaDetailView T={T} idea={selectedIdea} onBack={() => { setView("board"); setSelectedIdea(null); }}
                onUpdate={(updated) => setSelectedIdea(updated)} />
            </motion.div>
          )}
          {view === "manifestations" && (
            <motion.div key="manifestations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="h-full">
              <ManifestationsView T={T} />
            </motion.div>
          )}
          {view === "journal" && (
            <motion.div key="journal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="h-full">
              <JournalView T={T} />
            </motion.div>
          )}
          {view === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="h-full">
              <SiriusChatView T={T} profile={profile} />
            </motion.div>
          )}
          {view === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="h-full">
              <SettingsView T={T} profile={profile} theme={theme}
                onSave={(p) => { setProfile(p); setTheme(p.colourTheme); setView("board"); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Onboard View ──────────────────────────────────────────────────────────────

function OnboardView({ T, theme, onComplete }: { T: typeof THEMES.cosmic; theme: string; onComplete: (p: DreamProfile) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    displayName: "", personality: "", lifestyle: "", coreValues: "", bigDream: "",
    manifestationStyle: "", colourTheme: theme,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const api = useApi();

  const STEPS = [
    {
      title: "Welcome to your Dream Lab",
      subtitle: "This is your private space to grow ideas, manifest visions, and build the life you imagine. Let's personalise it for you.",
      field: null,
      icon: Sparkles,
    },
    {
      title: "What's your name?",
      subtitle: "How should Sirius address you in your Dream Lab?",
      field: "displayName",
      placeholder: "Your name or how you'd like to be called…",
      icon: Heart,
    },
    {
      title: "Describe your personality",
      subtitle: "Tell Sirius who you are — your energy, how you think, what lights you up.",
      field: "personality",
      placeholder: "e.g. Creative, driven, big-picture thinker who loves connecting ideas across different worlds…",
      multiline: true,
      icon: Star,
    },
    {
      title: "How do you live?",
      subtitle: "Your lifestyle, your values, what matters most to how you live each day.",
      field: "lifestyle",
      placeholder: "e.g. Building a family business while staying grounded in spirituality, health, and creativity…",
      multiline: true,
      icon: Globe,
    },
    {
      title: "What do you stand for?",
      subtitle: "Your core values — the principles that guide everything you do.",
      field: "coreValues",
      placeholder: "e.g. Integrity, innovation, human connection, contribution, freedom…",
      multiline: true,
      icon: Target,
    },
    {
      title: "Your biggest dream",
      subtitle: "The vision that excites you most. Don't hold back — dream out loud.",
      field: "bigDream",
      placeholder: "e.g. Building a portfolio of AI-powered businesses that genuinely help people live better lives…",
      multiline: true,
      icon: Flame,
    },
    {
      title: "How do you manifest?",
      subtitle: "What feels most natural for you when calling in what you want?",
      field: "manifestationStyle",
      placeholder: "e.g. Journalling, visualisation, affirmations in the morning, vision boards, prayer…",
      multiline: true,
      icon: Wand2,
    },
    {
      title: "Choose your space",
      subtitle: "Pick the visual energy that feels right for your Dream Lab.",
      field: "colourTheme",
      icon: Moon,
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isPearl = form.colourTheme === "pearl";
  const curT = THEMES[form.colourTheme] || T;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const r = await api.post("dream-lab/profile", form);
      if (!r.ok) {
        const d = await r.json();
        setError(d.error || "Failed to save");
        return;
      }
      const p = await r.json();
      onComplete(p);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{ background: curT.gradient }}>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-lg">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${curT.accent}40, ${curT.accent}20)`, border: `1px solid ${curT.border}` }}>
            <current.icon className="w-7 h-7" style={{ color: curT.accent }} />
          </div>
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: curT.text }}>
          {current.title}
        </h2>
        <p className="text-center text-sm mb-8 leading-relaxed" style={{ color: `${curT.text}80` }}>
          {current.subtitle}
        </p>

        {/* Input */}
        {current.field && current.field !== "colourTheme" && (
          current.multiline ? (
            <textarea
              value={(form as any)[current.field]}
              onChange={e => setForm(f => ({ ...f, [current.field!]: e.target.value }))}
              placeholder={current.placeholder}
              rows={4}
              className="w-full rounded-2xl p-4 text-sm mb-6 resize-none outline-none transition-all"
              style={{
                background: isPearl ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)",
                border: `1px solid ${curT.border}`,
                color: curT.text,
                lineHeight: 1.7,
              }}
              autoFocus
            />
          ) : (
            <input
              value={(form as any)[current.field]}
              onChange={e => setForm(f => ({ ...f, [current.field!]: e.target.value }))}
              placeholder={current.placeholder}
              className="w-full rounded-2xl p-4 text-sm mb-6 outline-none transition-all"
              style={{
                background: isPearl ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)",
                border: `1px solid ${curT.border}`,
                color: curT.text,
              }}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter" && !isLast) setStep(s => s + 1); }}
            />
          )
        )}

        {/* Theme picker */}
        {current.field === "colourTheme" && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {Object.entries(THEMES).map(([key, th]) => (
              <button
                key={key}
                onClick={() => setForm(f => ({ ...f, colourTheme: key }))}
                className="relative h-20 rounded-2xl overflow-hidden transition-all flex flex-col items-center justify-center gap-1.5"
                style={{
                  background: th.gradient,
                  border: form.colourTheme === key ? `2px solid ${th.accent}` : `1px solid ${th.border}`,
                  boxShadow: form.colourTheme === key ? `0 0 20px ${th.accent}40` : "none",
                }}>
                {form.colourTheme === key && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: th.accent }}>
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <div className="w-6 h-6 rounded-full" style={{ background: th.accent }} />
                <span className="text-[10px] font-bold capitalize" style={{ color: th.text }}>{key}</span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-center text-sm mb-4 px-4 py-2 rounded-xl" style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-2xl font-medium text-sm transition-all"
              style={{ background: curT.soft, color: curT.accent }}>
              Back
            </button>
          )}
          <button
            onClick={() => isLast ? handleSave() : setStep(s => s + 1)}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${curT.accent}, ${curT.accent}cc)`, color: "#fff" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isLast ? (saving ? "Creating your space…" : "Enter your Dream Lab ✨") : step === 0 ? "Let's begin" : "Continue"}
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? curT.accent : i < step ? `${curT.accent}60` : `${curT.text}20`,
              }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Board View ─────────────────────────────────────────────────────────────────

function BoardView({ T, profile, theme, onSelectIdea }: { T: typeof THEMES.cosmic; profile: DreamProfile | null; theme: string; onSelectIdea: (i: Idea) => void }) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("idea");
  const [newColour, setNewColour] = useState("violet");
  const [newEmoji, setNewEmoji] = useState("✨");
  const [newEnergy, setNewEnergy] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const api = useApi();
  const isPearl = theme === "pearl";

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("dream-lab/ideas");
      if (r.ok) setIdeas(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadIdeas(); }, [loadIdeas]);

  const createIdea = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    setError("");
    try {
      const r = await api.post("dream-lab/ideas", {
        title: newTitle, description: newDesc, category: newCategory,
        colour: newColour, emoji: newEmoji, energyLevel: newEnergy,
      });
      if (!r.ok) { const d = await r.json(); setError(d.error || "Failed"); return; }
      const idea = await r.json();
      setIdeas(prev => [idea, ...prev]);
      setCreating(false);
      setNewTitle(""); setNewDesc(""); setNewCategory("idea"); setNewColour("violet"); setNewEmoji("✨"); setNewEnergy(7);
    } catch (err: any) {
      setError(err?.message || "Failed to create");
    } finally { setSaving(false); }
  };

  const togglePin = async (idea: Idea, e: React.MouseEvent) => {
    e.stopPropagation();
    const r = await api.put(`dream-lab/ideas/${idea.id}`, { ...idea, pinned: !idea.pinned });
    if (r.ok) setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, pinned: !i.pinned } : i)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned)));
  };

  const deleteIdea = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.del(`dream-lab/ideas/${id}`);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const STATUS_LABELS: Record<string, string> = {
    seed: "🌱 Seed",
    growing: "🌿 Growing",
    blooming: "🌸 Blooming",
    manifested: "⭐ Manifested",
  };

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-5">

      {/* Greeting */}
      {profile && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-1" style={{ color: T.text }}>
            {getDayGreeting()}, {profile.displayName || "Dreamer"} ✨
          </h2>
          {profile.bigDream && (
            <p className="text-sm" style={{ color: `${T.text}70` }}>
              Manifesting: {profile.bigDream.slice(0, 80)}{profile.bigDream.length > 80 ? "…" : ""}
            </p>
          )}
        </div>
      )}

      {/* Add idea button */}
      <button
        onClick={() => setCreating(true)}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm mb-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.accent}bb)`, color: "#fff", boxShadow: `0 4px 20px ${T.accent}40` }}>
        <Plus className="w-4 h-4" />
        Add a new dream or idea
      </button>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            className="rounded-2xl p-5 mb-6"
            style={{ background: isPearl ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.07)", border: `1px solid ${T.border}` }}>

            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm" style={{ color: T.text }}>New Dream or Idea</span>
              <button onClick={() => setCreating(false)} style={{ color: `${T.text}50` }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category */}
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setNewCategory(c.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: newCategory === c.id ? T.accent : T.soft,
                    color: newCategory === c.id ? "#fff" : T.text,
                  }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {/* Colour */}
            <div className="flex gap-2 mb-4">
              {Object.entries(IDEA_COLOURS).map(([key, hex]) => (
                <button key={key} onClick={() => setNewColour(key)}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: hex,
                    transform: newColour === key ? "scale(1.25)" : "scale(1)",
                    boxShadow: newColour === key ? `0 0 0 2px ${isPearl ? "#fff" : "#000"}, 0 0 0 4px ${hex}` : "none",
                  }} />
              ))}
            </div>

            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Your dream or idea…"
              className="w-full rounded-xl p-3 text-sm mb-3 outline-none"
              style={{ background: T.soft, color: T.text, border: `1px solid ${T.border}` }}
              autoFocus
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Describe it — what's the vision? What excites you about this? (optional)"
              rows={3}
              className="w-full rounded-xl p-3 text-sm mb-4 outline-none resize-none"
              style={{ background: T.soft, color: T.text, border: `1px solid ${T.border}`, lineHeight: 1.6 }}
            />

            {/* Energy slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: `${T.text}80` }}>Energy level</span>
                <span className="text-xs font-bold" style={{ color: T.accent }}>{newEnergy}/10 {newEnergy >= 8 ? "🔥" : newEnergy >= 5 ? "⚡" : "🌱"}</span>
              </div>
              <input type="range" min={1} max={10} value={newEnergy} onChange={e => setNewEnergy(parseInt(e.target.value))}
                className="w-full" style={{ accentColor: T.accent }} />
            </div>

            {error && <p className="text-xs mb-3 px-3 py-2 rounded-xl" style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e" }}>{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setCreating(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: T.soft, color: T.text }}>
                Cancel
              </button>
              <button onClick={createIdea} disabled={saving || !newTitle.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: T.accent, color: "#fff", opacity: !newTitle.trim() ? 0.5 : 1 }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Plant this dream
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ideas grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.accent }} />
        </div>
      ) : ideas.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: T.soft, border: `1px solid ${T.border}` }}>
            <Lightbulb className="w-9 h-9" style={{ color: T.accent }} />
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: T.text }}>Your Dream Lab is ready</p>
            <p className="text-sm" style={{ color: `${T.text}60` }}>
              Add your first idea, vision, or dream — Sirius will help you grow it.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map(idea => {
            const colour = IDEA_COLOURS[idea.colour] || T.accent;
            const cat = CATEGORIES.find(c => c.id === idea.category);
            return (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onSelectIdea(idea)}
                className="group relative rounded-2xl p-4 cursor-pointer transition-all"
                style={{
                  background: isPearl ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${colour}30`,
                  boxShadow: idea.pinned ? `0 0 20px ${colour}20` : "none",
                }}
                whileHover={{ y: -3, boxShadow: `0 8px 30px ${colour}25` }}>

                {/* Pin indicator */}
                {idea.pinned && (
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full"
                    style={{ background: colour }} />
                )}

                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => togglePin(idea, e)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: T.soft, color: idea.pinned ? colour : `${T.text}50` }}>
                    {idea.pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                  </button>
                  <button onClick={e => deleteIdea(idea.id, e)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e" }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Emoji + category */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{idea.emoji || cat?.emoji || "💡"}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${colour}20`, color: colour }}>
                    {cat?.label || idea.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm mb-1 leading-snug" style={{ color: T.text }}>
                  {idea.title}
                </h3>

                {/* Description */}
                {idea.description && (
                  <p className="text-xs mb-3 leading-relaxed line-clamp-2" style={{ color: `${T.text}70` }}>
                    {idea.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ background: T.soft, width: 60 }}>
                      <div className="h-full rounded-full" style={{ width: `${idea.energyLevel * 10}%`, background: colour }} />
                    </div>
                    <span className="text-[9px]" style={{ color: `${T.text}50` }}>{idea.energyLevel}/10</span>
                  </div>
                  <span className="text-[10px]" style={{ color: `${T.text}40` }}>
                    {STATUS_LABELS[idea.status] || idea.status}
                  </span>
                </div>

                {/* Sirius insight indicator */}
                {idea.siriusInsights && (
                  <div className="mt-2 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" style={{ color: colour }} />
                    <span className="text-[9px] font-medium" style={{ color: colour }}>Sirius has insights</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Idea Detail View ───────────────────────────────────────────────────────────

function IdeaDetailView({ T, idea, onBack, onUpdate }: { T: typeof THEMES.cosmic; idea: Idea; onBack: () => void; onUpdate: (i: Idea) => void }) {
  const [insights, setInsights] = useState(idea.siriusInsights || "");
  const [streaming, setStreaming] = useState(false);
  const [editDesc, setEditDesc] = useState(idea.description);
  const [editStatus, setEditStatus] = useState(idea.status);
  const [saving, setSaving] = useState(false);
  const colour = IDEA_COLOURS[idea.colour] || T.accent;
  const cat = CATEGORIES.find(c => c.id === idea.category);
  const api = useApi();
  const base = getApiBase();
  const userId = getUserId();

  const askSirius = async () => {
    setStreaming(true);
    setInsights("");
    try {
      const res = await fetch(`${base}dream-lab/ideas/${idea.id}/sirius`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dream-user": userId },
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
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
            if (d.text) setInsights(prev => prev + d.text);
          } catch {}
        }
      }
    } finally { setStreaming(false); }
  };

  const saveChanges = async () => {
    setSaving(true);
    const r = await api.put(`dream-lab/ideas/${idea.id}`, { ...idea, description: editDesc, status: editStatus });
    if (r.ok) { const updated = await r.json(); onUpdate(updated); }
    setSaving(false);
  };

  const STATUS_OPTIONS = [
    { id: "seed",       label: "🌱 Seed",      desc: "Just planted" },
    { id: "growing",    label: "🌿 Growing",   desc: "Taking shape" },
    { id: "blooming",   label: "🌸 Blooming",  desc: "Really developing" },
    { id: "manifested", label: "⭐ Manifested", desc: "Brought to life" },
  ];

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-5">

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="text-3xl">{idea.emoji || cat?.emoji || "💡"}</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold leading-tight" style={{ color: T.text }}>{idea.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${colour}20`, color: colour }}>
              {cat?.label || idea.category}
            </span>
            <span className="text-[10px]" style={{ color: `${T.text}50` }}>
              {new Date(idea.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </span>
          </div>
        </div>
      </div>

      {/* Description edit */}
      <div className="mb-5">
        <label className="text-xs font-semibold mb-2 block" style={{ color: `${T.text}70` }}>Your vision</label>
        <textarea
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          placeholder="Describe this idea in more detail — what's the vision? What does it look like when it's real?"
          rows={4}
          className="w-full rounded-2xl p-4 text-sm outline-none resize-none"
          style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.border}`, color: T.text, lineHeight: 1.7 }}
        />
      </div>

      {/* Status */}
      <div className="mb-5">
        <label className="text-xs font-semibold mb-3 block" style={{ color: `${T.text}70` }}>Status</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_OPTIONS.map(s => (
            <button key={s.id} onClick={() => setEditStatus(s.id)}
              className="py-2 px-3 rounded-xl text-xs font-medium text-center transition-all"
              style={{
                background: editStatus === s.id ? `${colour}25` : "rgba(255,255,255,0.05)",
                border: `1px solid ${editStatus === s.id ? colour : T.border}`,
                color: editStatus === s.id ? colour : `${T.text}70`,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button onClick={saveChanges} disabled={saving}
        className="w-full py-3 rounded-2xl text-sm font-semibold mb-6 flex items-center justify-center gap-2"
        style={{ background: `${colour}25`, border: `1px solid ${colour}50`, color: colour }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save changes
      </button>

      {/* Sirius section */}
      <div className="rounded-2xl p-5 mb-5"
        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: colour }} />
            <span className="font-semibold text-sm" style={{ color: T.text }}>Sirius Insights</span>
          </div>
          <button onClick={askSirius} disabled={streaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: streaming ? "rgba(255,255,255,0.05)" : colour, color: streaming ? `${T.text}50` : "#fff" }}>
            {streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {insights ? "Refresh" : "Ask Sirius"}
          </button>
        </div>

        {insights ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: `${T.text}90` }}>
            {insights}
            {streaming && <span className="animate-pulse">▊</span>}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm" style={{ color: `${T.text}50` }}>
              {streaming ? "Sirius is thinking about your idea…" : "Ask Sirius to analyse this idea, suggest affirmations, and reveal its hidden potential."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manifestations View ────────────────────────────────────────────────────────

function ManifestationsView({ T }: { T: typeof THEMES.cosmic }) {
  const [items, setItems] = useState<Manifestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [theme, setTheme] = useState("");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState("affirmation");
  const [generated, setGenerated] = useState<string[]>([]);
  const api = useApi();

  useEffect(() => {
    api.get("dream-lab/manifestations").then(async r => {
      if (r.ok) setItems(await r.json());
    }).finally(() => setLoading(false));
  }, []);

  const generateAffirmations = async () => {
    setGenerating(true);
    setGenerated([]);
    try {
      const r = await api.post("dream-lab/generate-affirmations", { theme, count: 6 });
      if (r.ok) { const d = await r.json(); setGenerated(d.affirmations || []); }
    } finally { setGenerating(false); }
  };

  const addManifestation = async (text: string, type: string = "affirmation") => {
    const r = await api.post("dream-lab/manifestations", { text, type, frequency: "daily" });
    if (r.ok) { const item = await r.json(); setItems(prev => [item, ...prev]); }
  };

  const deleteItem = async (id: number) => {
    await api.del(`dream-lab/manifestations/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
    affirmation: { label: "Affirmation", emoji: "✨" },
    intention:   { label: "Intention",   emoji: "🎯" },
    gratitude:   { label: "Gratitude",   emoji: "🙏" },
    vision:      { label: "Vision",      emoji: "🌟" },
  };

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-5">
      <h2 className="text-xl font-bold mb-2" style={{ color: T.text }}>Manifestations</h2>
      <p className="text-sm mb-6" style={{ color: `${T.text}60` }}>Your affirmations, intentions, and daily practices.</p>

      {/* Sirius generator */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4" style={{ color: T.accent }} />
          <span className="font-semibold text-sm" style={{ color: T.text }}>Generate with Sirius</span>
        </div>
        <input value={theme} onChange={e => setTheme(e.target.value)}
          placeholder="Theme e.g. abundance, confidence, love, my business… (optional)"
          className="w-full rounded-xl p-3 text-sm mb-3 outline-none"
          style={{ background: T.soft, border: `1px solid ${T.border}`, color: T.text }}
        />
        <button onClick={generateAffirmations} disabled={generating}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: T.accent, color: "#fff" }}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating…" : "Generate personalised affirmations"}
        </button>

        {/* Generated results */}
        <AnimatePresence>
          {generated.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
              {generated.map((aff, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: T.soft, border: `1px solid ${T.border}` }}>
                  <p className="text-sm flex-1 leading-relaxed" style={{ color: T.text }}>{aff}</p>
                  <button onClick={() => addManifestation(aff)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: T.accent, color: "#fff" }}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add manually */}
      <button onClick={() => setAdding(a => !a)}
        className="flex items-center gap-2 mb-4 text-sm font-medium"
        style={{ color: T.accent }}>
        <Plus className="w-4 h-4" />
        Add your own
      </button>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-5 rounded-2xl p-4 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.border}` }}>
            <div className="flex gap-2 mb-3">
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setNewType(k)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: newType === k ? T.accent : T.soft, color: newType === k ? "#fff" : T.text }}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
            <textarea value={newText} onChange={e => setNewText(e.target.value)}
              placeholder="Write your affirmation or intention…"
              rows={2} className="w-full rounded-xl p-3 text-sm mb-3 outline-none resize-none"
              style={{ background: T.soft, border: `1px solid ${T.border}`, color: T.text, lineHeight: 1.6 }}
            />
            <button onClick={() => { if (newText.trim()) { addManifestation(newText, newType); setNewText(""); setAdding(false); } }}
              className="w-full py-2 rounded-xl text-sm font-semibold"
              style={{ background: T.accent, color: "#fff" }}>
              Add to my practice
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: T.accent }} /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm" style={{ color: `${T.text}50` }}>No affirmations yet — generate some with Sirius or add your own.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const meta = TYPE_LABELS[item.type] || { label: item.type, emoji: "✨" };
            return (
              <motion.div key={item.id} layout
                className="group flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}` }}>
                <span className="text-lg flex-shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed" style={{ color: T.text }}>{item.text}</p>
                  <span className="text-[10px] mt-1 block" style={{ color: `${T.text}40` }}>{meta.label} · Daily</span>
                </div>
                <button onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: "rgba(244,63,94,0.6)" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Journal View ───────────────────────────────────────────────────────────────

function JournalView({ T }: { T: typeof THEMES.cosmic }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("inspired");
  const [saving, setSaving] = useState(false);
  const api = useApi();

  useEffect(() => {
    api.get("dream-lab/journal").then(async r => {
      if (r.ok) setEntries(await r.json());
    }).finally(() => setLoading(false));
  }, []);

  const saveEntry = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const r = await api.post("dream-lab/journal", { title, content, mood });
      if (r.ok) {
        const entry = await r.json();
        setEntries(prev => [entry, ...prev]);
        setWriting(false); setTitle(""); setContent(""); setMood("inspired");
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold" style={{ color: T.text }}>Dream Journal</h2>
        <button onClick={() => setWriting(w => !w)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: writing ? T.soft : T.accent, color: writing ? T.text : "#fff" }}>
          <Edit3 className="w-3.5 h-3.5" />
          {writing ? "Cancel" : "New entry"}
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: `${T.text}60` }}>Capture your thoughts, reflections, and visions.</p>

      <AnimatePresence>
        {writing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-5 mb-6"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${T.border}` }}>

            {/* Mood */}
            <div className="flex flex-wrap gap-2 mb-4">
              {MOODS.map(m => (
                <button key={m.id} onClick={() => setMood(m.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: mood === m.id ? T.accent : T.soft, color: mood === m.id ? "#fff" : T.text }}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>

            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full rounded-xl p-3 text-sm mb-3 outline-none"
              style={{ background: T.soft, border: `1px solid ${T.border}`, color: T.text }}
            />
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write freely… What are you thinking about? What are you grateful for? What's your vision today?"
              rows={6} autoFocus
              className="w-full rounded-xl p-4 text-sm mb-4 outline-none resize-none"
              style={{ background: T.soft, border: `1px solid ${T.border}`, color: T.text, lineHeight: 1.8 }}
            />
            <button onClick={saveEntry} disabled={saving || !content.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: T.accent, color: "#fff", opacity: !content.trim() ? 0.5 : 1 }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Save entry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: T.accent }} /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm" style={{ color: `${T.text}50` }}>Your journal is empty — write your first entry.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const moodMeta = MOODS.find(m => m.id === entry.mood);
            return (
              <div key={entry.id} className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {entry.title && <h4 className="font-semibold text-sm mb-0.5" style={{ color: T.text }}>{entry.title}</h4>}
                    <div className="flex items-center gap-2">
                      {moodMeta && <span className="text-xs" style={{ color: `${T.text}60` }}>{moodMeta.emoji} {moodMeta.label}</span>}
                      <span className="text-[10px]" style={{ color: `${T.text}40` }}>
                        {new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: `${T.text}85` }}>
                  {entry.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sirius Chat View ───────────────────────────────────────────────────────────

function SiriusChatView({ T, profile }: { T: typeof THEMES.cosmic; profile: DreamProfile | null }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: profile
      ? `Hello ${profile.displayName || ""}! I'm here in your Dream Lab to help you grow your ideas, develop your vision, and build the life you're imagining. What would you like to explore together today?`
      : "Welcome to your Dream Lab! I'm Sirius, your intelligence partner. What dream or idea shall we work on together?" }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const base = getApiBase();
  const userId = getUserId();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setStreaming(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${base}dream-lab/sirius-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dream-user": userId },
        body: JSON.stringify({ message: msg, history }),
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let reply = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
          } catch {}
        }
      }
    } finally { setStreaming(false); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.accent}aa)` }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="max-w-[80%] rounded-2xl px-4 py-3"
              style={{
                background: msg.role === "user" ? `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)` : "rgba(255,255,255,0.08)",
                border: msg.role === "assistant" ? `1px solid ${T.border}` : "none",
                color: T.text,
              }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                  <span className="animate-pulse ml-0.5">▊</span>
                )}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-5 pt-3"
        style={{ borderTop: `1px solid ${T.border}` }}>
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Sirius anything about your dreams, ideas, or vision…"
            rows={1}
            className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: `1px solid ${T.border}`,
              color: T.text,
              minHeight: 48,
              maxHeight: 120,
            }}
          />
          <button onClick={send} disabled={streaming || !input.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: streaming || !input.trim() ? T.soft : T.accent, color: "#fff" }}>
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings View ──────────────────────────────────────────────────────────────

function SettingsView({ T, profile, theme, onSave }: { T: typeof THEMES.cosmic; profile: DreamProfile | null; theme: string; onSave: (p: DreamProfile) => void }) {
  const [form, setForm] = useState({
    displayName: profile?.displayName || "",
    personality: profile?.personality || "",
    lifestyle: profile?.lifestyle || "",
    coreValues: profile?.coreValues || "",
    bigDream: profile?.bigDream || "",
    manifestationStyle: profile?.manifestationStyle || "",
    colourTheme: profile?.colourTheme || theme,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const api = useApi();

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const r = await api.post("dream-lab/profile", form);
      if (!r.ok) { const d = await r.json(); setError(d.error || "Failed"); return; }
      const p = await r.json();
      onSave(p);
    } catch (err: any) {
      setError(err?.message || "Failed");
    } finally { setSaving(false); }
  };

  const curT = THEMES[form.colourTheme] || T;

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-5" style={{ background: curT.gradient }}>
      <h2 className="text-xl font-bold mb-2" style={{ color: curT.text }}>Personalise your Dream Lab</h2>
      <p className="text-sm mb-6" style={{ color: `${curT.text}60` }}>Help Sirius understand you better — the more context, the more personalised the experience.</p>

      {[
        { field: "displayName",        label: "Your name",           placeholder: "How should Sirius call you?",                          multi: false },
        { field: "personality",        label: "Your personality",    placeholder: "How would you describe yourself, your energy, your thinking style?", multi: true },
        { field: "lifestyle",          label: "Your lifestyle",      placeholder: "How you live, what matters day-to-day…",              multi: true },
        { field: "coreValues",         label: "Core values",         placeholder: "The principles that guide you…",                      multi: true },
        { field: "bigDream",           label: "Your biggest dream",  placeholder: "The vision that excites you most…",                   multi: true },
        { field: "manifestationStyle", label: "How you manifest",    placeholder: "Journalling, affirmations, visualisation, prayer…",   multi: true },
      ].map(({ field, label, placeholder, multi }) => (
        <div key={field} className="mb-5">
          <label className="text-xs font-semibold mb-2 block" style={{ color: `${curT.text}70` }}>{label}</label>
          {multi ? (
            <textarea value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder} rows={3}
              className="w-full rounded-2xl p-4 text-sm outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${curT.border}`, color: curT.text, lineHeight: 1.7 }}
            />
          ) : (
            <input value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded-2xl p-4 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${curT.border}`, color: curT.text }}
            />
          )}
        </div>
      ))}

      {/* Theme */}
      <div className="mb-6">
        <label className="text-xs font-semibold mb-3 block" style={{ color: `${curT.text}70` }}>Space theme</label>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(THEMES).map(([key, th]) => (
            <button key={key} onClick={() => setForm(f => ({ ...f, colourTheme: key }))}
              className="relative h-16 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-1 transition-all"
              style={{
                background: th.gradient,
                border: form.colourTheme === key ? `2px solid ${th.accent}` : `1px solid ${th.border}`,
                boxShadow: form.colourTheme === key ? `0 0 16px ${th.accent}40` : "none",
              }}>
              {form.colourTheme === key && (
                <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: th.accent }}>
                  <Check className="w-2 h-2 text-white" />
                </div>
              )}
              <div className="w-4 h-4 rounded-full" style={{ background: th.accent }} />
              <span className="text-[9px] font-bold capitalize" style={{ color: th.text }}>{key}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm mb-4 px-4 py-2 rounded-xl" style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e" }}>{error}</p>}

      <button onClick={save} disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
        style={{ background: `linear-gradient(135deg, ${curT.accent}, ${curT.accent}cc)`, color: "#fff" }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? "Saving…" : "Save my Dream Lab"}
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
