import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, Code2, Cpu, Send, Loader2, Plus, ChevronLeft,
  Clock, Trash2, Copy, Check, Sparkles, Wrench, X, Menu,
  FlaskConical, Star
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMode = "general" | "appbuilder" | "code";

interface LabMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface LabSession {
  id: string;
  mode: ChatMode;
  title: string;
  date: string;
  messages: LabMessage[];
  conversationId?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSIONS_KEY = "sirius_lab_sessions_v1";
const MAX_SESSIONS = 50;

const MODES: { id: ChatMode; label: string; sub: string; icon: React.ElementType; color: string }[] = [
  {
    id: "general",
    label: "Product Designer",
    sub: "Spec dimensions, materials, pricing, manufacturing — full product package.",
    icon: Rocket,
    color: "#00b4d8",
  },
  {
    id: "appbuilder",
    label: "App Builder",
    sub: "Describe your app idea. Sirius will guide you through every detail.",
    icon: Wrench,
    color: "#7c3aed",
  },
  {
    id: "code",
    label: "Code Builder",
    sub: "Production-ready code in any language or framework.",
    icon: Code2,
    color: "#059669",
  },
];

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  general: `You are Sirius — a world-class product design and R&D intelligence system inside the Star Lab. You operate like Kimi 2.5: when a product idea is described, you immediately produce a complete, ready-to-manufacture product package inline — no tabs, no navigation, everything in one response.

WHEN A PRODUCT IDEA IS DESCRIBED — automatically produce ALL of the following in your response:

## 🏷️ [PRODUCT NAME]
*[Punchy one-line tagline]*

### 📐 Dimensions & Physical Spec
| Attribute | Value |
|-----------|-------|
| Height | Xmm |
| Width | Xmm |
| Depth/Length | Xmm |
| Weight | Xg |

### 🎨 Colour Options
- **[Colour Name]** — #HEXCODE — [brief description]

### 📦 Packaging
- Box: [exact dimensions], [material], [print finish]
- Retail-ready: [shelf/DTC/both]

### 🔩 Materials & Where to Buy
| Component | Material | Grade/Spec | Supplier | Est. Cost |
|-----------|----------|------------|----------|-----------|

### 🎯 Market & Pricing
- **Target customer**: [specific profile]
- **Price point**: £X retail / £X DTC
- **Gross margin**: X%
- **Channels**: [Amazon FBA / DTC / wholesale]
- **Market size**: £XM TAM
- **Key competitors**: [2-3 real named competitors with price points]

### 🏭 Manufacturing
- **Process**: [e.g. injection moulding / CNC machining]
- **MOQ**: X units
- **Lead time**: X weeks
- **Unit cost at MOQ**: £X`,

  appbuilder: `You are Sirius App Builder inside the Sirius Star Lab. Your job is to help the user design and specify their app idea so it can be handed to a development team to build and launch. The user does NOT build or deploy the app themselves — they design it here, and the Sirius build team handles everything else. Guide them through: 1) What the app does and who it's for. 2) Core features — what must it do on day one. 3) Platform — iOS, Android, web, or all three. 4) Design style — look and feel. 5) Any integrations needed (payments, logins, etc). 6) Timeline expectations. Ask one question at a time. Be clear and friendly. When you have enough detail, tell the user their brief is ready to submit.`,

  code: `You are Sirius Code Builder inside the Sirius Star Lab. Write high-quality, complete, production-ready code for the user. Always provide full working implementations, not snippets. Explain your choices clearly. Support any language or framework. Format all code in proper code blocks.`,
};

const MODE_STARTERS: Record<ChatMode, string> = {
  general: "Describe your product idea and I'll produce the full spec — dimensions, materials, pricing, manufacturing, and market analysis.",
  appbuilder: "Tell me about your app idea. What does it do, and who is it for?",
  code: "What would you like me to build? Give me the requirements and I'll write production-ready code.",
};

// ── Session storage helpers ───────────────────────────────────────────────────

function loadSessions(): LabSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSessions(sessions: LabSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Streaming chat ─────────────────────────────────────────────────────────────

async function streamChat(
  content: string,
  mode: ChatMode,
  conversationId: number | null,
  userId: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onConversationCreated: (id: number) => void,
  signal: AbortSignal
): Promise<void> {
  const base = getApiBase();

  // Create conversation if needed
  let convId = conversationId;
  if (!convId) {
    const title = content.length > 50 ? content.slice(0, 50) + "…" : content;
    const res = await fetch(`${base}openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      signal,
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    const data = await res.json();
    convId = data.id;
    onConversationCreated(convId!);
  }

  const res = await fetch(`${base}openai/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      userId,
      mode: "guru",
      systemPrompt: SYSTEM_PROMPTS[mode],
    }),
    signal,
  });

  if (!res.ok) throw new Error(`Failed to send: ${res.statusText}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");

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
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (data.done) { onDone(); return; }
        if (data.type === "replace_content" && data.content !== undefined) {
          onChunk("\x00" + data.content); // sentinel: replace all
        } else if (data.content) {
          onChunk(data.content);
        }
      } catch {}
    }
  }
  onDone();
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-white/50 hover:text-white"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: LabMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#00b4d8]/20 border border-[#00b4d8]/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <Star size={13} className="text-[#00b4d8]" />
        </div>
      )}
      <div className={`group relative max-w-[78%] ${isUser
        ? "bg-[#00b4d8]/15 border border-[#00b4d8]/25 text-white/90 rounded-2xl rounded-tr-sm px-4 py-3 text-sm"
        : "text-white/90 text-sm"
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1 prose-table:text-xs prose-pre:bg-black/40 prose-pre:text-xs prose-code:text-[#00b4d8] prose-code:bg-black/30 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-[#00b4d8] rounded-sm animate-pulse ml-0.5 align-bottom" />}
          </div>
        )}
        {!isUser && !msg.isStreaming && msg.content && (
          <div className="absolute -top-6 right-0 flex items-center gap-1">
            <CopyButton text={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const { isLoading: subLoading, isPro, status } = useSubscription();
  const [, setLocation] = useLocation();
  const userId = getUserId();

  const [view, setView] = useState<"home" | "chat">("home");
  const [mode, setMode] = useState<ChatMode>("general");
  const [messages, setMessages] = useState<LabMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<LabSession[]>(() => loadSessions());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgCountRef = useRef(0);

  // Gemini-style scroll: on new message show start of response; while streaming follow bottom only if near it
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
  }, [messages]);

  // Save session when messages change
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: messages.filter(m => !m.isStreaming) }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, [messages, currentSessionId]);

  const startNewChat = useCallback((selectedMode: ChatMode) => {
    if (abortRef.current) abortRef.current.abort();
    setMode(selectedMode);
    const sessionId = generateId();
    setCurrentSessionId(sessionId);
    setConversationId(null);
    const starterMsg: LabMessage = {
      id: "starter",
      role: "assistant",
      content: MODE_STARTERS[selectedMode],
    };
    setMessages([starterMsg]);
    const newSession: LabSession = {
      id: sessionId,
      mode: selectedMode,
      title: MODES.find(m => m.id === selectedMode)?.label ?? "Star Lab",
      date: new Date().toISOString(),
      messages: [starterMsg],
    };
    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const loadSession = useCallback((session: LabSession) => {
    if (abortRef.current) abortRef.current.abort();
    setMode(session.mode);
    setCurrentSessionId(session.id);
    setConversationId(session.conversationId ?? null);
    setMessages(session.messages);
    setHistoryOpen(false);
    setView("chat");
  }, []);

  const deleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (currentSessionId === id) {
      setView("home");
      setMessages([]);
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    const userMsg: LabMessage = { id: generateId(), role: "user", content: text };
    const assistantMsg: LabMessage = { id: generateId(), role: "assistant", content: "", isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    // Update session title from first user message
    if (currentSessionId) {
      setSessions(prev => {
        const updated = prev.map(s =>
          s.id === currentSessionId && s.title === MODES.find(m => m.id === mode)?.label
            ? { ...s, title: text.length > 45 ? text.slice(0, 45) + "…" : text }
            : s
        );
        saveSessions(updated);
        return updated;
      });
    }

    abortRef.current = new AbortController();
    let accum = "";
    const msgId = assistantMsg.id;

    try {
      await streamChat(
        text,
        mode,
        conversationId,
        userId,
        (chunk) => {
          if (chunk.startsWith("\x00")) {
            accum = chunk.slice(1);
          } else {
            accum += chunk;
          }
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, content: accum } : m
          ));
        },
        () => {
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, isStreaming: false } : m
          ));
          setIsStreaming(false);
        },
        (id) => setConversationId(id),
        abortRef.current.signal,
      );
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === msgId
            ? { ...m, content: "Something went wrong. Please try again.", isStreaming: false }
            : m
        ));
      }
      setIsStreaming(false);
    }
  }, [input, isStreaming, mode, conversationId, userId, currentSessionId]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (subLoading) {
    return (
      <div className="min-h-screen bg-[#050a12] flex items-center justify-center">
        <Loader2 className="text-[#00b4d8] animate-spin" size={28} />
      </div>
    );
  }

  const isSignedIn = !!localStorage.getItem("sirius_account_email");

  // ── Sign-in gate ───────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#050a12] flex flex-col">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Menu size={20} className="text-white/60" />
          </button>
          <div className="flex items-center gap-2">
            <Rocket size={18} className="text-[#00b4d8]" />
            <span className="text-white/80 font-semibold text-sm">Star Lab</span>
          </div>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#00b4d8]/10 border border-[#00b4d8]/20 flex items-center justify-center mx-auto mb-6">
              <Rocket size={28} className="text-[#00b4d8]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Star Lab</h2>
            <p className="text-white/50 text-sm mb-8 leading-relaxed">
              Design products, build apps, and write production-ready code with Sirius. A Sirius Pro feature.
            </p>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-full py-3 rounded-xl bg-[#00b4d8] hover:bg-[#00c4e8] text-white font-semibold text-sm transition-colors mb-3"
            >
              Sign in / Create account
            </button>
            <p className="text-white/20 text-xs leading-relaxed">
              Open the account menu from the sidebar to sign in or create your account
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Pro upgrade gate ───────────────────────────────────────────────────────
  if (!isPro) {
    return (
      <div className="min-h-screen bg-[#050a12] flex flex-col">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Menu size={20} className="text-white/60" />
          </button>
          <div className="flex items-center gap-2">
            <Rocket size={18} className="text-[#00b4d8]" />
            <span className="text-white/80 font-semibold text-sm">Star Lab</span>
          </div>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#00b4d8]/10 border border-[#00b4d8]/20 flex items-center justify-center mx-auto mb-6">
              <Rocket size={28} className="text-[#00b4d8]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Star Lab is a Pro feature</h2>
            <p className="text-white/50 text-sm mb-3 leading-relaxed">
              Design products, build apps, and write production-ready code with Sirius — your full R&D partner.
            </p>
            <div className="text-xs text-white/30 mb-8">
              Current plan: <span className="text-white/50 capitalize">{status.tier}</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-colors mb-3"
              style={{ background: "#f59e0b", color: "#080c1a" }}
            >
              Get Pro — £19.99/month
            </button>
            <p className="text-white/20 text-xs">Upgrade from the sidebar</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Home — mode selection ──────────────────────────────────────────────────
  if (view === "home") {
    return (
      <div className="min-h-screen bg-[#050a12] flex flex-col">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}  />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-1">
            <button onClick={() => setLocation("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Back to Sirius">
              <ChevronLeft size={20} className="text-white/60" />
            </button>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Menu size={20} className="text-white/60" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Rocket size={18} className="text-[#00b4d8]" />
            <span className="text-white/80 font-semibold text-sm">Star Lab</span>
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors relative"
          >
            <Clock size={18} className="text-white/40" />
            {sessions.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#00b4d8]" />
            )}
          </button>
        </div>

        {/* Hero */}
        <div className="px-6 pt-10 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00b4d8]/10 border border-[#00b4d8]/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-[#00b4d8]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Star Lab</h1>
          <p className="text-white/40 text-sm">Choose a mode to get started</p>
        </div>

        {/* Mode cards */}
        <div className="px-4 space-y-3 pb-8 max-w-lg mx-auto w-full">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => startNewChat(m.id)}
                className="w-full text-left p-4 rounded-2xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                style={{ borderColor: m.color + "30" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: m.color + "18", border: `1px solid ${m.color}30` }}
                  >
                    <Icon size={18} style={{ color: m.color }} />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-0.5">{m.label}</p>
                    <p className="text-white/40 text-xs leading-relaxed">{m.sub}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="px-4 pb-10 max-w-lg mx-auto w-full">
            <p className="text-white/20 text-xs uppercase tracking-wider mb-3">Recent</p>
            <div className="space-y-1">
              {sessions.slice(0, 4).map(s => {
                const mInfo = MODES.find(m => m.id === s.mode);
                const Icon = mInfo?.icon ?? Sparkles;
                return (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left"
                  >
                    <Icon size={14} style={{ color: mInfo?.color ?? "#00b4d8" }} className="flex-shrink-0" />
                    <span className="text-white/60 text-xs truncate flex-1">{s.title}</span>
                    <span className="text-white/20 text-[10px] flex-shrink-0">
                      {new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* History drawer */}
        <AnimatePresence>
          {historyOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setHistoryOpen(false)}
                className="fixed inset-0 bg-black/50 z-40"
              />
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a1520] border-l border-white/5 z-50 flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                  <span className="text-white/80 font-semibold text-sm">Session History</span>
                  <button onClick={() => setHistoryOpen(false)} className="p-1 rounded hover:bg-white/5">
                    <X size={16} className="text-white/40" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {sessions.length === 0 && (
                    <p className="text-white/20 text-xs text-center mt-8">No sessions yet</p>
                  )}
                  {sessions.map(s => {
                    const mInfo = MODES.find(m => m.id === s.mode);
                    const Icon = mInfo?.icon ?? Sparkles;
                    return (
                      <button
                        key={s.id}
                        onClick={() => loadSession(s)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: (mInfo?.color ?? "#00b4d8") + "15" }}>
                          <Icon size={14} style={{ color: mInfo?.color ?? "#00b4d8" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-xs truncate">{s.title}</p>
                          <p className="text-white/25 text-[10px] mt-0.5">
                            {new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteSession(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                        >
                          <Trash2 size={12} className="text-white/30" />
                        </button>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Chat view ──────────────────────────────────────────────────────────────
  const currentMode = MODES.find(m => m.id === mode)!;
  const ModeIcon = currentMode.icon;

  return (
    <div className="min-h-screen bg-[#050a12] flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}  />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 flex-shrink-0">
        <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <Menu size={18} className="text-white/50" />
        </button>
        <button
          onClick={() => setView("home")}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ChevronLeft size={18} className="text-white/50" />
        </button>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: currentMode.color + "18", border: `1px solid ${currentMode.color}30` }}
        >
          <ModeIcon size={14} style={{ color: currentMode.color }} />
        </div>
        <span className="text-white/80 text-sm font-medium flex-1 truncate">{currentMode.label}</span>
        <button
          onClick={() => { startNewChat(mode); }}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          title="New chat"
        >
          <Plus size={18} className="text-white/40" />
        </button>
        <button
          onClick={() => setHistoryOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Clock size={18} className="text-white/40" />
        </button>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#00b4d8]/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              placeholder="Message Sirius…"
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-white/90 placeholder-white/25 text-sm resize-none outline-none leading-relaxed min-h-[20px] max-h-[140px] disabled:opacity-50"
              style={{ scrollbarWidth: "none" }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-30"
              style={{ backgroundColor: currentMode.color }}
            >
              {isStreaming
                ? <Loader2 size={14} className="text-white animate-spin" />
                : <Send size={14} className="text-white" />}
            </button>
          </div>
          <p className="text-center text-white/15 text-[10px] mt-2">
            Sirius can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      {/* History drawer (same as home) */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a1520] border-l border-white/5 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                <button
                  onClick={() => { setHistoryOpen(false); startNewChat(mode); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00b4d8]/10 border border-[#00b4d8]/20 hover:bg-[#00b4d8]/15 transition-colors"
                >
                  <Plus size={13} className="text-[#00b4d8]" />
                  <span className="text-[#00b4d8] text-xs font-medium">New Chat</span>
                </button>
                <button onClick={() => setHistoryOpen(false)} className="p-1 rounded hover:bg-white/5">
                  <X size={16} className="text-white/40" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {sessions.map(s => {
                  const mInfo = MODES.find(m => m.id === s.mode);
                  const Icon = mInfo?.icon ?? Sparkles;
                  return (
                    <button
                      key={s.id}
                      onClick={() => loadSession(s)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group text-left ${s.id === currentSessionId ? "bg-white/5" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: (mInfo?.color ?? "#00b4d8") + "15" }}>
                        <Icon size={14} style={{ color: mInfo?.color ?? "#00b4d8" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs truncate">{s.title}</p>
                        <p className="text-white/25 text-[10px] mt-0.5">
                          {new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                      >
                        <Trash2 size={12} className="text-white/30" />
                      </button>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
