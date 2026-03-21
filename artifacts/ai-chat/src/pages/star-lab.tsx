import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Star, Plus, Trash2, Send, Loader2, FileText, Code, Ruler,
  BookOpen, Telescope, ExternalLink, Sparkles, X, FolderOpen,
  Pencil, Check, Bot, Zap, TrendingUp, Package, Layers,
  ChevronDown, RotateCcw, Copy, Globe,
  Cpu, Wrench, ChevronRight, Rss, RefreshCw, Bookmark, BookmarkCheck,
  Heart, FlaskConical, Eye, EyeOff, Trash, Bell, BellOff, Filter,
  ChevronUp, BadgeCheck, Lightbulb, Atom
} from "lucide-react";
import { getApiBase } from "@/lib/api-base";

const INDUSTRIES = [
  "Aerospace", "Agriculture", "AI & ML", "Automotive", "Construction",
  "Consumer Electronics", "Defence", "Education", "Energy", "Finance",
  "Food & Hospitality", "Healthcare", "HR & Recruitment", "Industrial",
  "Insurance", "IoT", "Legal", "Logistics", "Manufacturing", "Marine",
  "Media & Content", "Medical Devices", "Pharmaceutical", "Property",
  "Retail & eCommerce", "Robotics", "Social Media", "Software / SaaS",
  "Space Tech", "Telecoms", "General"
];

const SCOUT_MODES = [
  { id: "full", label: "Full Scan", icon: Globe, color: "hsl(193,100%,35%)", desc: "Broad scan across all industries and opportunity types" },
  { id: "bots", label: "Bot Opportunities", icon: Bot, color: "hsl(280,70%,55%)", desc: "Find tasks ripe for automation across all sectors" },
  { id: "improve", label: "Improve Existing", icon: Wrench, color: "hsl(25,100%,50%)", desc: "Find broken products with fixable problems" },
  { id: "gaps", label: "Market Gaps", icon: Package, color: "hsl(155,70%,40%)", desc: "Find underserved needs with no good solution" },
  { id: "trends", label: "Trend Plays", icon: TrendingUp, color: "hsl(45,100%,45%)", desc: "New opportunities created by recent changes" },
];

type Project = {
  id: number; name: string; industry: string; phase: string; status: string;
  brief: string; research: string; specs: string; code: string;
  drawingNotes: string; cadUrl: string; materials: string;
  workflows: string; industryProblem: string; uses: string;
  brochure: string; pitch: string; costToBuild: string; profitMargin: string;
  businessCase: string; goToMarket: string;
  renders: string; updatedAt: string;
  messages?: Message[];
};
type Message = { id: number; projectId: number; role: string; content: string; createdAt: string };
type ScoutReport = { id: number; title: string; industry: string; opportunity: string; type: string; createdAt: string };
type NavMode = "projects" | "botlab" | "scout" | "feed" | "grants" | "commerce";

const MAX_PIN_DIGITS = 8;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [digits, setDigits] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "locked">("idle");
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [shake, setShake] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const base = getApiBase();

  // Scan line animation
  useEffect(() => {
    const id = setInterval(() => setScanLine(p => (p + 1) % 100), 30);
    return () => clearInterval(id);
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000);
      if (remaining <= 0) { setStatus("idle"); setLockoutEnd(null); setAttempts(0); setCountdown(0); }
      else setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockoutEnd]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status === "locked" || status === "loading") return;
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") deleteLast();
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [digits, status]);

  const press = (d: string) => {
    if (digits.length >= MAX_PIN_DIGITS || status === "loading" || status === "locked") return;
    setDigits(prev => [...prev, d]);
    setStatus("idle");
  };

  const deleteLast = () => {
    if (status === "loading" || status === "locked") return;
    setDigits(prev => prev.slice(0, -1));
    setStatus("idle");
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => { setShake(false); setDigits([]); }, 600);
  };

  const submit = async () => {
    if (digits.length === 0 || status === "loading" || status === "locked") return;
    const pin = digits.join("");
    setStatus("loading");
    try {
      const res = await fetch(`${base}lab/auth`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        sessionStorage.setItem("lab_pin", pin);
        onUnlock(pin);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setStatus("locked");
          setLockoutEnd(Date.now() + LOCKOUT_SECONDS * 1000);
        } else {
          setStatus("error");
          triggerShake();
        }
      }
    } catch {
      setStatus("error");
      triggerShake();
    }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","del","0","ok"];
  const attemptsLeft = MAX_ATTEMPTS - attempts;
  const PIN_DISPLAY_LENGTH = Math.max(4, digits.length + (digits.length < MAX_PIN_DIGITS ? 1 : 0));

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "hsl(226,50%,3%)" }}>

      {/* Animated scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-full h-px opacity-5 transition-none"
          style={{ top: `${scanLine}%`, background: "hsl(193,100%,60%)", boxShadow: "0 0 8px hsl(193,100%,60%)" }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(hsl(193,100%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(193,100%,60%) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Corner brackets */}
      {[["top-8 left-8", "border-t-2 border-l-2"], ["top-8 right-8", "border-t-2 border-r-2"], ["bottom-8 left-8", "border-b-2 border-l-2"], ["bottom-8 right-8", "border-b-2 border-r-2"]].map(([pos, border], i) => (
        <div key={i} className={`absolute w-8 h-8 ${pos} ${border} opacity-20`}
          style={{ borderColor: "hsl(193,100%,50%)" }} />
      ))}

      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 text-xs font-mono"
        style={{ color: "hsl(193,100%,40%)", borderBottom: "1px solid rgba(0,255,200,0.05)" }}>
        <span>SIRIUS STAR LAB</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(193,100%,50%)" }} />
          SECURE TERMINAL v2.0
        </span>
        <span>{new Date().toLocaleTimeString("en-GB", { hour12: false })}</span>
      </div>

      <motion.div
        animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="flex flex-col items-center gap-7 w-80 relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(226,50%,10%), hsl(226,50%,8%))", border: "1px solid rgba(0,200,180,0.15)", boxShadow: "0 0 60px hsla(193,100%,35%,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
              <FlaskConical className="w-9 h-9" style={{ color: "hsl(193,100%,55%)" }} />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
              style={{ background: "hsl(193,100%,50%)", boxShadow: "0 0 8px hsl(193,100%,50%)" }} />
          </div>
          <div className="text-center">
            <p className="font-mono text-xs mb-1" style={{ color: "hsl(193,100%,40%)", letterSpacing: "0.25em" }}>CLASSIFIED ACCESS</p>
            <h1 className="text-white text-xl font-bold tracking-tight">Sirius Star Lab</h1>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Private R&D Intelligence</p>
          </div>
        </div>

        {/* PIN dots */}
        <div className="w-full px-4">
          <div className="flex items-center justify-center gap-3 py-5 px-6 rounded-2xl"
            style={{ background: "hsl(226,50%,6%)", border: `1px solid ${status === "error" ? "hsla(0,70%,50%,0.4)" : status === "locked" ? "hsla(0,70%,50%,0.3)" : "rgba(0,200,180,0.1)"}`, boxShadow: status === "error" ? "0 0 20px hsla(0,70%,50%,0.1)" : "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
            {status === "locked" ? (
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4" style={{ color: "hsl(0,70%,55%)" }} />
                <span className="font-mono text-sm font-semibold" style={{ color: "hsl(0,70%,60%)" }}>
                  Locked — {countdown}s
                </span>
              </div>
            ) : (
              Array.from({ length: Math.max(4, digits.length + (digits.length < MAX_PIN_DIGITS ? 1 : 0)) }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full transition-all duration-150"
                  style={{
                    background: i < digits.length
                      ? status === "error" ? "hsl(0,70%,55%)" : "hsl(193,100%,55%)"
                      : i === digits.length
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(255,255,255,0.06)",
                    boxShadow: i < digits.length && status !== "error"
                      ? "0 0 8px hsl(193,100%,55%)"
                      : "none",
                    transform: i === digits.length ? "scale(0.7)" : "scale(1)",
                  }} />
              ))
            )}
          </div>

          {/* Attempt warning */}
          {status === "error" && attempts > 0 && attempts < MAX_ATTEMPTS && (
            <p className="text-center text-xs mt-2 font-mono" style={{ color: "hsl(25,90%,60%)" }}>
              Access denied — {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
            </p>
          )}
          {status === "locked" && (
            <p className="text-center text-xs mt-2 font-mono" style={{ color: "hsl(0,70%,55%)" }}>
              Terminal locked after {MAX_ATTEMPTS} failed attempts
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full px-4">
          {KEYS.map(key => {
            const isOk = key === "ok";
            const isDel = key === "del";
            const isDisabled = status === "locked" || (status === "loading");
            return (
              <button
                key={key}
                onClick={() => { if (isOk) submit(); else if (isDel) deleteLast(); else press(key); }}
                disabled={isDisabled || (isOk && digits.length === 0)}
                className="h-14 rounded-xl flex items-center justify-center transition-all active:scale-95 select-none"
                style={{
                  background: isOk
                    ? digits.length > 0 && !isDisabled
                      ? "linear-gradient(135deg, hsl(193,100%,28%), hsl(193,100%,22%))"
                      : "hsl(226,50%,10%)"
                    : isDel
                    ? "hsl(226,50%,10%)"
                    : "hsl(226,50%,9%)",
                  border: isOk
                    ? digits.length > 0 && !isDisabled
                      ? "1px solid hsl(193,100%,35%)"
                      : "1px solid rgba(255,255,255,0.05)"
                    : "1px solid rgba(255,255,255,0.05)",
                  boxShadow: isOk && digits.length > 0 && !isDisabled
                    ? "0 0 20px hsla(193,100%,35%,0.3)"
                    : "inset 0 1px 0 rgba(255,255,255,0.03)",
                  opacity: isDisabled || (isOk && digits.length === 0) ? 0.3 : 1,
                  color: isOk ? "hsl(193,100%,70%)" : "rgba(255,255,255,0.8)",
                }}>
                {isOk
                  ? status === "loading"
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(193,100%,60%)" }} />
                    : <Check className="w-5 h-5" />
                  : isDel
                  ? <span className="text-lg font-light" style={{ color: "rgba(255,255,255,0.4)" }}>⌫</span>
                  : <span className="text-lg font-semibold" style={{ fontFamily: "monospace", letterSpacing: "-0.02em" }}>{key}</span>
                }
              </button>
            );
          })}
        </div>

        <p className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.1)", letterSpacing: "0.15em" }}>
          AUTHORISED PERSONNEL ONLY
        </p>
      </motion.div>
    </div>
  );
}

const PHASE_CONFIG = {
  design: { label: "Design Phase", color: "hsl(193,100%,35%)", next: "production" },
  production: { label: "Production Phase", color: "hsl(45,100%,45%)", next: "complete" },
  complete: { label: "Complete", color: "hsl(155,70%,45%)", next: null },
};

const ALL_TABS = [
  { id: "overview", label: "Overview", icon: Layers, field: null, phase: "all", placeholder: "", generated: false },
  { id: "brief", label: "Brief", icon: FileText, field: "brief", phase: "design", placeholder: "Product concept, problem solved, target market, key objectives...", generated: false },
  { id: "research", label: "Research", icon: BookOpen, field: "research", phase: "design", placeholder: "Market research, competitor analysis, regulatory requirements, material options...", generated: false },
  { id: "specs", label: "Specs", icon: Ruler, field: "specs", phase: "design", placeholder: "Technical specifications: dimensions, tolerances, performance requirements, standards...", generated: false },
  { id: "materials", label: "Materials", icon: Package, field: "materials", phase: "design", placeholder: "Materials list with specifications, suppliers, part numbers, costs...", generated: true },
  { id: "code", label: "Code", icon: Code, field: "code", phase: "design", placeholder: "Production-ready code...", generated: false },
  { id: "drawings", label: "Drawings", icon: Layers, field: "drawingNotes", phase: "design", placeholder: "CAD drawing instructions: views, dimensions, callouts, assembly details...", generated: false },
  { id: "workflows", label: "Workflows", icon: Zap, field: "workflows", phase: "production", placeholder: "Manufacturing and deployment workflow steps...", generated: true },
  { id: "market", label: "Market & Uses", icon: Globe, field: "industryProblem", phase: "production", placeholder: "Industry analysis, problem solved, use cases across sectors...", generated: true },
  { id: "businessCase", label: "Business Case", icon: BadgeCheck, field: "businessCase", phase: "production", placeholder: "Why build this, competitive displacement strategy, AI advantage, investment justification...", generated: true },
  { id: "renders", label: "Renders", icon: Cpu, field: null, phase: "complete", placeholder: "", generated: false },
  { id: "brochure", label: "Brochure", icon: FileText, field: "brochure", phase: "complete", placeholder: "Product brochure content...", generated: true },
  { id: "pitch", label: "Pitch", icon: TrendingUp, field: "pitch", phase: "complete", placeholder: "Investor/client pitch deck content...", generated: true },
  { id: "economics", label: "Economics", icon: Package, field: "costToBuild", phase: "complete", placeholder: "Cost to build, pricing, profit margin analysis...", generated: true },
  { id: "goToMarket", label: "Go-to-Market", icon: Globe, field: "goToMarket", phase: "complete", placeholder: "Launch strategy, channels, pricing, 90-day plan, KPIs...", generated: true },
];

function StreamingText({ content, streaming }: { content: string; streaming: boolean }) {
  return (
    <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.85)" }}>
      {content}
      {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 rounded-sm animate-pulse" style={{ background: "hsl(193,100%,50%)", verticalAlign: "middle" }} />}
    </div>
  );
}

function ChatPanel({ project, pin, mode }: { project: Project; pin: string; mode: "engineering" | "bot" }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("brief");
  const bottomRef = useRef<HTMLDivElement>(null);
  const base = getApiBase();

  useEffect(() => {
    if (project.messages) setMessages(project.messages.map(m => ({ role: m.role, content: m.content })));
    else setMessages([]);
  }, [project.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim(); setInput(""); setStreaming(true); setSearching(false);
    setMessages(prev => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    let assistant = "";
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ message: userMsg, tab: activeTab, mode: mode === "bot" ? "bot" : "engineering" }),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === "searching") { setSearching(true); }
              if (d.content) { setSearching(false); assistant += d.content; setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistant }; return u; }); }
            } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false); setSearching(false);
  };

  const quickPrompts = mode === "bot"
    ? ["Design the full architecture", "Write the core code", "What APIs do I need?", "Estimate the build cost", "Deployment instructions"]
    : ["Help me write the brief", "Generate technical specs", "What materials should I use?", "Write the code", "Create a BOM"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-3 py-2 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {ALL_TABS.filter(t => t.id !== "overview" && t.id !== "renders").map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="text-xs px-2.5 py-1 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
            style={{ background: activeTab === t.id ? "hsl(193,100%,35%)" : "transparent", color: activeTab === t.id ? "white" : "rgba(255,255,255,0.35)" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="py-8">
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map(p => (
                <button key={p} onClick={() => { setInput(p); }}
                  className="text-xs px-3 py-1.5 rounded-xl transition-all"
                  style={{ background: "hsl(226,45%,14%)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[90%] rounded-2xl px-3 py-2.5"
              style={{ background: m.role === "user" ? "hsl(193,100%,32%)" : "hsl(226,45%,13%)" }}>
              {m.role === "assistant"
                ? <StreamingText content={m.content} streaming={streaming && i === messages.length - 1} />
                : <p className="text-white text-xs leading-relaxed">{m.content}</p>}
            </div>
          </div>
        ))}
        {searching && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: "hsl(226,45%,13%)" }}>
              <Globe className="w-3 h-3 animate-pulse" style={{ color: "hsl(193,100%,55%)" }} />
              <span className="text-xs" style={{ color: "hsl(193,100%,55%)" }}>Searching the web…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask the Lab AI..." rows={2}
            className="flex-1 px-3 py-2 rounded-xl text-white text-xs placeholder-white/25 resize-none outline-none"
            style={{ background: "hsl(226,45%,12%)", border: "1px solid rgba(255,255,255,0.07)" }} />
          <button onClick={send} disabled={streaming || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center self-end transition-all flex-shrink-0"
            style={{ background: "hsl(193,100%,35%)", opacity: streaming || !input.trim() ? 0.35 : 1 }}>
            {streaming ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

type Render = { url: string; label: string; type: string; angle: string; generatedAt: string };

type Completeness = { checks: { key: string; label: string; phase: string; filled: boolean }[]; filled: number; total: number; pct: number };

function RendersTab({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [generating, setGenerating] = useState(false);
  const [renderType, setRenderType] = useState("3d");
  const [renderAngle, setRenderAngle] = useState("perspective");
  const [selected, setSelected] = useState<Render | null>(null);
  const base = getApiBase();

  const renders: Render[] = (() => { try { return JSON.parse(project.renders || "[]"); } catch { return []; } })();

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/render`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ type: renderType, angle: renderAngle }),
      });
      if (res.ok) {
        const { renders: updated } = await res.json();
        onUpdate({ ...project, renders: JSON.stringify(updated) });
      }
    } catch {}
    setGenerating(false);
  };

  const deleteRender = (idx: number) => {
    const updated = renders.filter((_, i) => i !== idx);
    const updated2 = { ...project, renders: JSON.stringify(updated) };
    fetch(`${base}lab/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify(updated2) });
    onUpdate(updated2);
  };

  const RENDER_TYPES = [
    { id: "3d", label: "3D Render", desc: "Photorealistic product render" },
    { id: "2d", label: "2D Technical", desc: "Orthographic technical drawing" },
    { id: "exploded", label: "Exploded View", desc: "Component breakdown diagram" },
    { id: "lifestyle", label: "Lifestyle", desc: "Product in real-world context" },
  ];

  const ANGLES = {
    "3d": ["perspective", "front", "side", "top", "isometric"],
    "2d": ["front", "side", "top", "three-view"],
    "exploded": ["isometric"],
    "lifestyle": ["environment"],
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-y-auto">
      <div className="flex-1 p-5">
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setSelected(null)}>
            <div className="relative max-w-3xl w-full mx-4">
              <img src={selected.url} alt={selected.label} className="w-full rounded-2xl" />
              <p className="text-white/60 text-xs text-center mt-2">{selected.label}</p>
              <button onClick={() => setSelected(null)} className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {renders.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Cpu className="w-8 h-8 mx-auto mb-2 text-white/10" />
              <p className="text-white/30 text-sm">No renders yet — generate your first one</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {renders.map((r, i) => (
              <div key={i} className="relative group rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setSelected(r)}
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <img src={r.url} alt={r.label} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                  <div className="p-3 w-full flex items-center justify-between">
                    <p className="text-white text-xs font-medium">{r.label}</p>
                    <button onClick={e => { e.stopPropagation(); deleteRender(i); }}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,0,0,0.5)" }}>
                      <Trash className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-64 border-l flex-shrink-0 p-4 flex flex-col gap-4"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,7%)" }}>
        <div>
          <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Render Type</p>
          <div className="space-y-1">
            {RENDER_TYPES.map(t => (
              <button key={t.id} onClick={() => setRenderType(t.id)}
                className="w-full text-left px-3 py-2 rounded-xl transition-all"
                style={{ background: renderType === t.id ? "hsl(193,100%,32%)" : "hsl(226,45%,11%)", border: renderType === t.id ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-white text-xs font-medium">{t.label}</p>
                <p className="text-white/35 text-xs">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Angle / View</p>
          <div className="flex flex-wrap gap-1">
            {((ANGLES as any)[renderType] || ["perspective"]).map((a: string) => (
              <button key={a} onClick={() => setRenderAngle(a)}
                className="text-xs px-2.5 py-1 rounded-lg capitalize transition-all"
                style={{ background: renderAngle === a ? "hsl(193,100%,32%)" : "hsl(226,45%,12%)", color: renderAngle === a ? "white" : "rgba(255,255,255,0.45)" }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={generating}
          className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all mt-auto"
          style={{ background: "hsl(193,100%,32%)", color: "white", opacity: generating ? 0.5 : 1 }}>
          {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> Generate Render</>}
        </button>

        <p className="text-white/20 text-xs text-center">AI generates from your specs and brief. Add more detail for better results.</p>
      </div>
    </div>
  );
}

type Insight = { category: string; priority: string; icon: string; title: string; detail: string; action: string };

const INSIGHT_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  alert: Zap, lightbulb: Lightbulb, shield: BadgeCheck, trending: TrendingUp,
  wrench: Wrench, package: Package, globe: Globe, pound: Package,
  star: Star, check: Check,
};

const INSIGHT_PRIORITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "hsl(0,80%,30%)", text: "hsl(0,80%,75%)", label: "Critical" },
  high: { bg: "hsl(25,80%,28%)", text: "hsl(25,90%,65%)", label: "High" },
  medium: { bg: "hsl(45,70%,22%)", text: "hsl(45,90%,60%)", label: "Medium" },
  low: { bg: "hsl(193,60%,18%)", text: "hsl(193,90%,55%)", label: "Low" },
};

function ProjectWorkspace({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [labMode, setLabMode] = useState<"engineering" | "bot">("engineering");
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsLoaded, setInsightsLoaded] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const base = getApiBase();

  const headers = useCallback(() => ({ "Content-Type": "application/json", "x-lab-pin": pin }), [pin]);

  const loadCompleteness = useCallback(async () => {
    const res = await fetch(`${base}lab/projects/${project.id}/completeness`, { headers: { "x-lab-pin": pin } });
    if (res.ok) setCompleteness(await res.json());
  }, [base, pin, project.id]);

  const loadInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/insights`, {
        method: "POST", headers: { "x-lab-pin": pin, "Content-Type": "application/json" },
      });
      if (res.ok) { const data = await res.json(); setInsights(Array.isArray(data) ? data : []); }
    } catch {}
    setLoadingInsights(false);
    setInsightsLoaded(true);
  }, [base, pin, project.id]);

  useEffect(() => {
    setInsights([]); setInsightsLoaded(false);
    loadCompleteness();
    // Auto-load insights for any project that has at least a name
    loadInsights();
  }, [project.id]);

  const saveField = async (field: string, value: string) => {
    setSaving(true);
    const updated = { ...project, [field]: value };
    await fetch(`${base}lab/projects/${project.id}`, { method: "PUT", headers: headers(), body: JSON.stringify({ [field]: value }) });
    onUpdate(updated);
    setSaving(false);
    loadCompleteness();
  };

  const setPhase = async (phase: string) => {
    const updated = { ...project, phase };
    await fetch(`${base}lab/projects/${project.id}`, { method: "PUT", headers: headers(), body: JSON.stringify({ phase }) });
    onUpdate(updated);
  };

  const saveProjectName = async () => {
    if (!editName.trim()) return;
    await saveField("name", editName.trim());
    setEditingName(false);
  };

  const generateSection = async (section: string) => {
    if (generating) return;
    setGenerating(true);
    let result = "";
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/generate`, {
        method: "POST", headers: headers(), body: JSON.stringify({ section }),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.content) {
                result += d.content;
                const fieldMap: Record<string, string> = { materials: "materials", workflows: "workflows", market: "industryProblem", brochure: "brochure", pitch: "pitch", cost: "costToBuild", economics: "costToBuild" };
                const field = fieldMap[section];
                if (field) onUpdate({ ...project, [field]: result });
              }
            } catch {}
          }
        }
      }
    } catch {}
    setGenerating(false);
    loadCompleteness();
  };

  const getTabContent = (tabId: string): string => {
    const map: Record<string, string> = {
      brief: project.brief, research: project.research, specs: project.specs,
      materials: project.materials, code: project.code, drawings: project.drawingNotes,
      workflows: project.workflows, market: project.industryProblem,
      brochure: project.brochure, pitch: project.pitch, economics: project.costToBuild,
      businessCase: project.businessCase, goToMarket: project.goToMarket,
    };
    return map[tabId] || "";
  };

  const getTabField = (tabId: string): string => {
    const map: Record<string, string> = {
      brief: "brief", research: "research", specs: "specs", materials: "materials",
      code: "code", drawings: "drawingNotes", workflows: "workflows", market: "industryProblem",
      brochure: "brochure", pitch: "pitch", economics: "costToBuild",
      businessCase: "businessCase", goToMarket: "goToMarket",
    };
    return map[tabId] || tabId;
  };

  const openCad = () => {
    const url = `https://www.newdimensionscad.com?project=${encodeURIComponent(project.name)}&specs=${encodeURIComponent((project.specs || "").slice(0, 500))}&notes=${encodeURIComponent((project.drawingNotes || "").slice(0, 500))}`;
    window.open(url, "_blank");
  };

  const phase = (project.phase || "design") as keyof typeof PHASE_CONFIG;
  const phaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG.design;
  const tab = ALL_TABS.find(t => t.id === activeTab);
  const isCode = activeTab === "code";
  const renders: Render[] = (() => { try { return JSON.parse(project.renders || "[]"); } catch { return []; } })();

  const PHASE_TABS = [
    { id: "all", label: "All" },
    { id: "design", label: "Design" },
    { id: "production", label: "Production" },
    { id: "complete", label: "Complete" },
  ];
  const [phaseFilter, setPhaseFilter] = useState("all");
  const visibleTabs = ALL_TABS.filter(t => phaseFilter === "all" || t.phase === phaseFilter || t.phase === "all");

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveProjectName(); if (e.key === "Escape") setEditingName(false); }}
              className="bg-transparent text-white font-bold text-sm outline-none border-b border-white/30 flex-1" />
            <button onClick={saveProjectName}><Check className="w-4 h-4 text-green-400" /></button>
            <button onClick={() => setEditingName(false)}><X className="w-4 h-4 text-white/30" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-white font-bold text-sm truncate">{project.name}</h1>
            <button onClick={() => { setEditName(project.name); setEditingName(true); }}>
              <Pencil className="w-3 h-3 text-white/20 hover:text-white/50 transition-colors" />
            </button>
            <span className="text-white/25 text-xs hidden sm:block">· {project.industry}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && <span className="text-white/25 text-xs">Saving...</span>}

          {/* Phase selector */}
          <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: "hsl(226,45%,11%)" }}>
            {(["design", "production", "complete"] as const).map(p => (
              <button key={p} onClick={() => setPhase(p)}
                className="px-2.5 py-1 rounded-lg text-xs transition-all capitalize"
                style={{ background: phase === p ? phaseConfig.color : "transparent", color: phase === p ? "white" : "rgba(255,255,255,0.3)", fontWeight: phase === p ? "600" : "400" }}>
                {p}
              </button>
            ))}
          </div>

          {completeness && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${completeness.pct}%`, background: completeness.pct === 100 ? "hsl(155,70%,45%)" : phaseConfig.color }} />
              </div>
              <span className="text-white/30 text-xs">{completeness.pct}%</span>
            </div>
          )}

          <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "hsl(226,45%,12%)" }}>
            <button onClick={() => setLabMode("engineering")}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all"
              style={{ background: labMode === "engineering" ? "hsl(193,100%,35%)" : "transparent", color: labMode === "engineering" ? "white" : "rgba(255,255,255,0.35)" }}>
              <Cpu className="w-3 h-3" /> Engineering
            </button>
            <button onClick={() => setLabMode("bot")}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all"
              style={{ background: labMode === "bot" ? "hsl(280,70%,55%)" : "transparent", color: labMode === "bot" ? "white" : "rgba(255,255,255,0.35)" }}>
              <Bot className="w-3 h-3" /> Bot
            </button>
          </div>

          <button onClick={openCad}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: "hsl(226,45%,14%)", color: "hsl(193,100%,60%)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <ExternalLink className="w-3 h-3" /> CAD
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
          {PHASE_TABS.map(pt => (
            <button key={pt.id} onClick={() => setPhaseFilter(pt.id)}
              className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 transition-all"
              style={{ background: phaseFilter === pt.id ? "rgba(255,255,255,0.1)" : "transparent", color: phaseFilter === pt.id ? "white" : "rgba(255,255,255,0.3)" }}>
              {pt.label}
            </button>
          ))}
          <div className="w-px h-4 flex-shrink-0 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />
          {visibleTabs.map(t => {
            const Icon = t.icon;
            const hasContent = t.field ? !!(project as any)[t.field] : t.id === "renders" ? renders.length > 0 : false;
            const phaseColor = t.phase === "design" ? "hsl(193,100%,35%)" : t.phase === "production" ? "hsl(45,100%,45%)" : t.phase === "complete" ? "hsl(155,70%,45%)" : "rgba(255,255,255,0.5)";
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0 transition-all relative"
                style={{ background: activeTab === t.id ? "hsl(226,45%,16%)" : "transparent", color: activeTab === t.id ? "white" : "rgba(255,255,255,0.4)", border: activeTab === t.id ? `1px solid ${phaseColor}40` : "1px solid transparent" }}>
                <Icon className="w-3 h-3" style={{ color: activeTab === t.id ? phaseColor : undefined }} />
                {t.label}
                {hasContent && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phaseColor }} />}
              </button>
            );
          })}
          <button onClick={() => navigator.clipboard.writeText(getTabContent(activeTab))} title="Copy" className="ml-auto flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <Copy className="w-3.5 h-3.5 text-white/25" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto">

          {activeTab === "overview" && (
            <div className="p-5 space-y-5">
              {/* Phase progress */}
              <div className="rounded-2xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white/40 text-xs mb-3 uppercase tracking-wider">Project Phase</p>
                <div className="flex items-center gap-2">
                  {(["design", "production", "complete"] as const).map((p, i) => {
                    const cfg = PHASE_CONFIG[p];
                    const done = ["design", "production", "complete"].indexOf(phase) >= i;
                    return (
                      <React.Fragment key={p}>
                        <div className="flex-1">
                          <button onClick={() => setPhase(p)} className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: phase === p ? cfg.color : done ? cfg.color + "30" : "hsl(226,45%,12%)", color: done ? "white" : "rgba(255,255,255,0.3)" }}>
                            {cfg.label}
                          </button>
                        </div>
                        {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Completeness */}
              {completeness && (
                <div className="rounded-2xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Completeness</p>
                    <span className="text-white font-bold">{completeness.pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${completeness.pct}%`, background: completeness.pct === 100 ? "hsl(155,70%,45%)" : "hsl(193,100%,35%)" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {completeness.checks.map(c => {
                      const color = c.phase === "design" ? "hsl(193,100%,35%)" : c.phase === "production" ? "hsl(45,100%,45%)" : "hsl(155,70%,45%)";
                      return (
                        <div key={c.key} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: c.filled ? color : "rgba(255,255,255,0.1)" }}>
                            {c.filled && <Check className="w-1.5 h-1.5 text-white" />}
                          </div>
                          <span style={{ color: c.filled ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Latest render */}
              {renders.length > 0 && (
                <div className="rounded-2xl overflow-hidden cursor-pointer" onClick={() => setActiveTab("renders")}
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <img src={renders[0].url} alt={renders[0].label} className="w-full aspect-video object-cover" />
                  <div className="p-3 flex items-center justify-between" style={{ background: "hsl(226,45%,9%)" }}>
                    <p className="text-white text-xs font-medium">{renders[0].label}</p>
                    <span className="text-white/30 text-xs">{renders.length} render{renders.length !== 1 ? "s" : ""} · View all</span>
                  </div>
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Industry", value: project.industry },
                  { label: "Phase", value: PHASE_CONFIG[phase]?.label || phase },
                  { label: "Renders", value: String(renders.length) },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white text-sm font-semibold truncate">{s.value}</p>
                    <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Sirius Insights */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Atom className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,55%)" }} />
                    <p className="text-white text-xs font-semibold">Sirius Insights</p>
                    {insights.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: "hsl(193,100%,20%)", color: "hsl(193,100%,65%)" }}>
                        {insights.length}
                      </span>
                    )}
                  </div>
                  <button onClick={loadInsights} disabled={loadingInsights}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{ background: "hsl(226,45%,14%)", color: "rgba(255,255,255,0.4)" }}>
                    {loadingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {loadingInsights ? "Analysing..." : "Refresh"}
                  </button>
                </div>

                {loadingInsights && insights.length === 0 && (
                  <div className="rounded-2xl p-5 text-center" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" style={{ color: "hsl(193,100%,50%)" }} />
                    <p className="text-white/40 text-xs">Sirius is analysing your project...</p>
                  </div>
                )}

                {!loadingInsights && insightsLoaded && insights.length === 0 && (
                  <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-white/30 text-xs">No insights generated. Click Refresh to try again.</p>
                  </div>
                )}

                {insights.length > 0 && (
                  <div className="space-y-2">
                    {insights.map((insight, i) => {
                      const pStyle = INSIGHT_PRIORITY_STYLE[insight.priority] || INSIGHT_PRIORITY_STYLE.low;
                      const IconComp = INSIGHT_ICON_MAP[insight.icon] || Lightbulb;
                      const isExpanded = expandedInsight === i;
                      return (
                        <div key={i} className="rounded-xl overflow-hidden cursor-pointer transition-all"
                          style={{ background: "hsl(226,45%,10%)", border: `1px solid rgba(255,255,255,0.07)` }}
                          onClick={() => setExpandedInsight(isExpanded ? null : i)}>
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: pStyle.bg }}>
                              <IconComp className="w-3.5 h-3.5" style={{ color: pStyle.text }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: pStyle.bg, color: pStyle.text }}>
                                  {pStyle.label}
                                </span>
                                <span className="text-white/35 text-xs truncate">{insight.category}</span>
                              </div>
                              <p className="text-white text-xs font-medium leading-snug">{insight.title}</p>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform text-white/30"
                              style={{ transform: isExpanded ? "rotate(180deg)" : "none" }} />
                          </div>
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                              <p className="text-white/60 text-xs leading-relaxed mt-2 mb-3">{insight.detail}</p>
                              <div className="flex items-start gap-2 rounded-lg p-2.5"
                                style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <Zap className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "hsl(193,100%,55%)" }} />
                                <p className="text-white/80 text-xs font-medium leading-snug">{insight.action}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick generate actions */}
              <div>
                <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Quick Generate</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Materials Spec", section: "materials", tab: "materials" },
                    { label: "Workflows", section: "workflows", tab: "workflows" },
                    { label: "Market Analysis", section: "market", tab: "market" },
                    { label: "Business Case", section: "businessCase", tab: "businessCase" },
                    { label: "Go-to-Market Plan", section: "goToMarket", tab: "goToMarket" },
                    { label: "Design Brochure", section: "brochure", tab: "brochure" },
                    { label: "Pitch Deck", section: "pitch", tab: "pitch" },
                    { label: "Cost Analysis", section: "cost", tab: "economics" },
                  ].map(a => (
                    <button key={a.section} onClick={() => { generateSection(a.section); setActiveTab(a.tab); }}
                      disabled={generating}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left"
                      style={{ background: "hsl(226,45%,12%)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.07)", opacity: generating ? 0.5 : 1 }}>
                      <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(193,100%,50%)" }} />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "renders" && (
            <RendersTab project={project} pin={pin} onUpdate={onUpdate} />
          )}

          {activeTab !== "overview" && activeTab !== "renders" && tab && (
            <div className="flex flex-col h-full">
              {tab.generated && (
                <div className="px-4 py-2 border-b flex items-center justify-between flex-shrink-0"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="text-white/30 text-xs">
                    {activeTab === "market" ? "Market analysis + use cases" : activeTab === "economics" ? "Cost to build + profit margins" : tab.label}
                  </span>
                  <button onClick={() => generateSection(activeTab)} disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{ background: "hsl(193,100%,32%)", color: "white", opacity: generating ? 0.5 : 1 }}>
                    {generating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</> : <><Sparkles className="w-3 h-3" /> Generate with AI</>}
                  </button>
                </div>
              )}
              {activeTab === "market" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <textarea key={`${project.id}-market`} defaultValue={project.industryProblem}
                    onBlur={e => saveField("industryProblem", e.target.value)}
                    placeholder="Industry problem analysis, market sizing, competitor landscape, use cases..."
                    className="flex-1 p-4 resize-none outline-none leading-relaxed"
                    style={{ background: "transparent", color: "rgba(255,255,255,0.8)", fontSize: "0.83rem", lineHeight: "1.7" }} />
                </div>
              ) : activeTab === "economics" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <textarea key={`${project.id}-economics`} defaultValue={project.costToBuild}
                    onBlur={e => saveField("costToBuild", e.target.value)}
                    placeholder="Cost to build breakdown, BOM, manufacturing costs, pricing strategy, profit margin analysis..."
                    className="flex-1 p-4 resize-none outline-none leading-relaxed"
                    style={{ background: "transparent", color: "rgba(255,255,255,0.8)", fontSize: "0.83rem", lineHeight: "1.7" }} />
                </div>
              ) : (
                <textarea key={`${project.id}-${activeTab}`} defaultValue={getTabContent(activeTab)}
                  onBlur={e => saveField(getTabField(activeTab), e.target.value)}
                  placeholder={tab.placeholder}
                  className="flex-1 p-4 resize-none outline-none leading-relaxed"
                  style={{
                    background: "transparent", color: "rgba(255,255,255,0.8)",
                    fontFamily: isCode ? "'Fira Code','Cascadia Code','Consolas',monospace" : "inherit",
                    fontSize: isCode ? "0.75rem" : "0.83rem", lineHeight: isCode ? "1.6" : "1.7",
                  }} />
              )}
            </div>
          )}
        </div>

        {/* AI Panel */}
        <div className="w-64 border-l flex flex-col min-h-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,6%)" }}>
          <div className="px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1.5">
              {labMode === "bot"
                ? <Bot className="w-3.5 h-3.5" style={{ color: "hsl(280,70%,65%)" }} />
                : <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,50%)" }} />}
              <span className="text-white text-xs font-medium">{labMode === "bot" ? "Bot Architect" : "Lab AI"}</span>
              <span className="text-white/20 text-xs ml-auto">GPT-5.2</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel project={project} pin={pin} mode={labMode} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BotLabPanel({ pin }: { pin: string }) {
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("General");
  const [platforms, setPlatforms] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const base = getApiBase();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [output]);

  const BOT_EXAMPLES = [
    "A bot that monitors competitor websites daily and emails a summary of price changes and new products",
    "An email triage bot that reads incoming support emails and auto-responds to common queries using AI",
    "A social media scheduler that scrapes trending content in my niche and suggests optimal posting times",
    "A bot that monitors job boards for specific roles and sends daily digest with match scores",
    "An invoice processing bot that reads PDFs from email and auto-enters data into Xero",
    "A lead enrichment bot that takes a company name and returns full contact info, LinkedIn profiles, and firmographics",
    "A compliance monitoring bot that watches regulatory announcements and alerts the team to relevant changes",
    "A bot that monitors Amazon reviews for competitor products and identifies recurring complaints",
  ];

  const design = async () => {
    if (!description.trim() || streaming) return;
    setStreaming(true); setOutput("");
    let result = "";
    try {
      const res = await fetch(`${base}lab/bot-design`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ description, industry, platforms }),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try { const d = JSON.parse(line.slice(6)); if (d.content) { result += d.content; setOutput(result); } } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
  };

  const copyOutput = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Config */}
      <div className="w-80 border-r flex-shrink-0 flex flex-col"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,6%)" }}>
        <div className="p-5 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(280,70%,50%), hsl(220,70%,50%))" }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Bot Lab</h2>
              <p className="text-white/35 text-xs">Design any automation bot</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Describe the bot</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                placeholder="What should this bot do? Be specific about inputs, outputs, and triggers..."
                className="w-full px-3 py-2.5 rounded-xl text-white text-xs placeholder-white/20 resize-none outline-none"
                style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.07)" }} />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-white text-xs outline-none"
                style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {INDUSTRIES.map(i => <option key={i} value={i} style={{ background: "hsl(226,45%,11%)" }}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Platforms / Systems involved</label>
              <input value={platforms} onChange={e => setPlatforms(e.target.value)}
                placeholder="e.g. Gmail, Xero, Slack, Shopify..."
                className="w-full px-3 py-2 rounded-xl text-white text-xs placeholder-white/20 outline-none"
                style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.07)" }} />
            </div>
            <button onClick={design} disabled={streaming || !description.trim()}
              className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(280,70%,50%), hsl(220,70%,50%))", color: "white", opacity: streaming || !description.trim() ? 0.4 : 1 }}>
              {streaming ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Designing...</> : <><Zap className="w-3.5 h-3.5" /> Design This Bot</>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-white/25 text-xs mb-3">Try these examples:</p>
          <div className="space-y-2">
            {BOT_EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setDescription(ex)}
                className="w-full text-left text-xs p-2.5 rounded-xl transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.45)", lineHeight: "1.5" }}>
                <ChevronRight className="w-3 h-3 inline mr-1 flex-shrink-0" style={{ color: "hsl(280,70%,65%)" }} />
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 flex flex-col min-h-0 p-5 overflow-y-auto">
        {output ? (
          <>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-white/40 text-xs">Bot Architecture</span>
              <div className="flex gap-2">
                <button onClick={() => { setOutput(""); setDescription(""); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "hsl(226,45%,12%)", color: "rgba(255,255,255,0.4)" }}>
                  <RotateCcw className="w-3 h-3" /> New
                </button>
                <button onClick={copyOutput}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: copied ? "hsl(155,70%,40%)" : "hsl(226,45%,12%)", color: copied ? "white" : "rgba(255,255,255,0.4)" }}>
                  <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy all"}
                </button>
              </div>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <StreamingText content={output} streaming={streaming} />
            </div>
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-xs">
              <Bot className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm font-medium mb-2">Bot Architecture Designer</p>
              <p className="text-white/20 text-xs leading-relaxed">Describe any automation task and get a complete, production-ready bot design with code, architecture, APIs, costs, and deployment instructions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoutPanel({ pin }: { pin: string }) {
  const [query, setQuery] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [focus, setFocus] = useState("full");
  const [streaming, setStreaming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [output, setOutput] = useState("");
  const [reports, setReports] = useState<ScoutReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const base = getApiBase();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [output]);

  const loadReports = useCallback(async () => {
    const res = await fetch(`${base}lab/scout/reports`, { headers: { "x-lab-pin": pin } });
    if (res.ok) setReports(await res.json());
  }, [base, pin]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const run = async () => {
    setStreaming(true); setSearching(false); setOutput(""); let result = "";
    try {
      const res = await fetch(`${base}lab/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ query, industries, focus }),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === "searching") { setSearching(true); }
              if (d.content) { setSearching(false); result += d.content; setOutput(result); }
            } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false); setSearching(false);
    loadReports();
  };

  const toggleIndustry = (ind: string) => setIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  const focusMode = SCOUT_MODES.find(m => m.id === focus)!;

  return (
    <div className="flex-1 flex min-h-0">
      {/* Config */}
      <div className="w-80 border-r flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,6%)" }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${focusMode.color}, hsl(226,70%,50%))` }}>
              <Telescope className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Opportunity Scout</h2>
              <p className="text-white/35 text-xs">Find what's worth building</p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="space-y-1.5 mb-4">
            <label className="text-white/40 text-xs mb-2 block">Scan type</label>
            {SCOUT_MODES.map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => setFocus(m.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{
                    background: focus === m.id ? "hsl(226,45%,14%)" : "transparent",
                    border: focus === m.id ? `1px solid ${m.color}40` : "1px solid transparent"
                  }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: focus === m.id ? m.color : "hsl(226,45%,12%)" }}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">{m.label}</p>
                    <p className="text-white/30 text-xs">{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Specific focus (optional)</label>
              <textarea value={query} onChange={e => setQuery(e.target.value)} rows={2}
                placeholder="e.g. 'automation bots for accountants' or 'gaps in veterinary software'..."
                className="w-full px-3 py-2 rounded-xl text-white text-xs placeholder-white/20 resize-none outline-none"
                style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.07)" }} />
            </div>

            <div>
              <label className="text-white/40 text-xs mb-2 block">Target industries (optional)</label>
              <div className="flex flex-wrap gap-1">
                {INDUSTRIES.slice(0, 16).map(ind => (
                  <button key={ind} onClick={() => toggleIndustry(ind)}
                    className="text-xs px-2 py-0.5 rounded-full transition-all"
                    style={{
                      background: industries.includes(ind) ? focusMode.color : "hsl(226,45%,12%)",
                      color: industries.includes(ind) ? "white" : "rgba(255,255,255,0.4)",
                      border: industries.includes(ind) ? "none" : "1px solid rgba(255,255,255,0.07)"
                    }}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={run} disabled={streaming}
              className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: focusMode.color, color: "white", opacity: streaming ? 0.5 : 1 }}>
              {streaming ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scouting...</> : <><Telescope className="w-3.5 h-3.5" /> Run Scout</>}
            </button>
          </div>

          {reports.length > 0 && (
            <div className="mt-5">
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-white/30 text-xs w-full hover:text-white/50 transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                History ({reports.length})
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1">
                  {reports.map(r => (
                    <button key={r.id} onClick={() => setOutput(r.opportunity)}
                      className="w-full text-left px-3 py-2 rounded-xl transition-all hover:bg-white/5"
                      style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p className="text-white/60 text-xs font-medium truncate">{r.title}</p>
                      <p className="text-white/25 text-xs">{new Date(r.createdAt).toLocaleDateString("en-GB")}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5">
        {searching && !output && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Globe className="w-8 h-8 animate-pulse" style={{ color: "hsl(193,100%,55%)" }} />
              <p className="text-xs font-medium" style={{ color: "hsl(193,100%,55%)" }}>Searching the web…</p>
            </div>
          </div>
        )}
        {output ? (
          <>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">{focusMode.label} results</span>
                {searching && <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(193,100%,55%)" }}><Globe className="w-3 h-3 animate-pulse" /> Searching…</span>}
              </div>
              <button onClick={() => setOutput("")}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "hsl(226,45%,12%)", color: "rgba(255,255,255,0.4)" }}>
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>
            <div className="rounded-2xl p-5 leading-relaxed"
              style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <StreamingText content={output} streaming={streaming} />
            </div>
            <div ref={bottomRef} />
          </>
        ) : !searching ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Telescope className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm font-medium mb-2">Ready to Scout</p>
              <p className="text-white/20 text-xs leading-relaxed">Choose a scan type, optionally add a focus or industries, then run. The Scout searches across social media, forums, market data, patent databases, and product reviews to find real, evidence-based opportunities.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type Discovery = {
  id: number; sweepId: string; category: string; title: string;
  summary: string; detail: string; source: string; sourceType: string;
  applicability: string; isRead: boolean; isSaved: boolean; discoveredAt: string;
};

type FeedStats = {
  total: number; unread: number; saved: boolean; sweepRunning: boolean;
  lastSweep: { startedAt: string; status: string; itemsFound: string } | null;
  categories: Record<string, number>;
};

const CATEGORY_COLORS: Record<string, string> = {
  Healthcare: "hsl(340,70%,55%)", Engineering: "hsl(193,100%,35%)",
  Robotics: "hsl(280,70%,55%)", Language: "hsl(210,80%,55%)",
  Vision: "hsl(155,70%,45%)", Creative: "hsl(300,60%,55%)",
  Science: "hsl(45,100%,45%)", Finance: "hsl(25,100%,50%)",
  Legal: "hsl(0,60%,55%)", Education: "hsl(180,70%,40%)",
  Security: "hsl(0,80%,45%)", Agriculture: "hsl(90,65%,40%)",
  Energy: "hsl(55,90%,45%)", Retail: "hsl(320,65%,50%)",
  "Research Breakthrough": "hsl(240,80%,65%)", "New Application": "hsl(170,70%,45%)",
  "Platform Release": "hsl(215,80%,60%)",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  university_research: "University Research", industry_deployment: "Industry Deployment",
  product_release: "Product Release", patent: "Patent Filing",
  breakthrough: "Research Breakthrough", use_case: "New Use Case",
};

function DiscoveryCard({ d, pin, onUpdate, onDelete }: {
  d: Discovery; pin: string; onUpdate: (id: number, updates: Partial<Discovery>) => void; onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const base = getApiBase();
  const catColor = CATEGORY_COLORS[d.category] || "hsl(193,100%,35%)";

  const patch = async (updates: Partial<Discovery>) => {
    await fetch(`${base}feed/discoveries/${d.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      body: JSON.stringify(updates)
    });
    onUpdate(d.id, updates);
  };

  const handleExpand = () => {
    if (!d.isRead) patch({ isRead: true });
    setExpanded(!expanded);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden transition-all"
      style={{ background: "hsl(226,45%,9%)", border: `1px solid ${d.isRead ? "rgba(255,255,255,0.06)" : catColor + "40"}`, opacity: d.isRead ? 0.85 : 1 }}>
      <div className="p-4 cursor-pointer" onClick={handleExpand}>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: d.isRead ? "rgba(255,255,255,0.15)" : catColor }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: catColor + "25", color: catColor }}>{d.category}</span>
              {d.sourceType && <span className="text-xs text-white/25">{SOURCE_TYPE_LABELS[d.sourceType] || d.sourceType}</span>}
              {!d.isRead && <span className="text-xs text-white/40 italic">New</span>}
            </div>
            <h3 className="text-white text-sm font-semibold leading-tight mb-1">{d.title}</h3>
            <p className="text-white/50 text-xs leading-relaxed">{d.summary}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/25" /> : <ChevronRight className="w-3.5 h-3.5 text-white/25" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}>
            <div className="px-4 pb-4 space-y-3">
              <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

              {d.detail && (
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-1.5">Detail</p>
                  <p className="text-white/70 text-xs leading-relaxed">{d.detail}</p>
                </div>
              )}

              {d.applicability && (
                <div className="rounded-xl p-3" style={{ background: catColor + "12", border: `1px solid ${catColor}25` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3 h-3" style={{ color: catColor }} />
                    <p className="text-xs font-medium" style={{ color: catColor }}>How Sirius can use this</p>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">{d.applicability}</p>
                </div>
              )}

              {d.source && (
                <p className="text-white/25 text-xs">Source: {d.source}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => patch({ isSaved: !d.isSaved })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: d.isSaved ? catColor + "25" : "hsl(226,45%,14%)", color: d.isSaved ? catColor : "rgba(255,255,255,0.4)" }}>
                  {d.isSaved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                  {d.isSaved ? "Saved" : "Save"}
                </button>
                <button onClick={() => patch({ isRead: !d.isRead })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "hsl(226,45%,14%)", color: "rgba(255,255,255,0.4)" }}>
                  {d.isRead ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {d.isRead ? "Mark unread" : "Mark read"}
                </button>
                <button onClick={() => onDelete(d.id)}
                  className="ml-auto flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all"
                  style={{ color: "rgba(255,255,255,0.2)" }}>
                  <Trash className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FeedPanel({ pin }: { pin: string }) {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepLog, setSweepLog] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSaved, setFilterSaved] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [showSweepLog, setShowSweepLog] = useState(false);
  const sweepLogRef = useRef<HTMLDivElement>(null);
  const base = getApiBase();
  const headers = useCallback((): Record<string, string> => ({ "x-lab-pin": pin }), [pin]);

  const loadAll = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterCategory !== "all") params.set("category", filterCategory);
    if (filterUnread) params.set("unread", "true");
    if (filterSaved) params.set("saved", "true");

    const [discRes, statsRes] = await Promise.all([
      fetch(`${base}feed/discoveries?${params}&limit=100`, { headers: headers() }),
      fetch(`${base}feed/stats`, { headers: headers() }),
    ]);
    if (discRes.ok) setDiscoveries(await discRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, [base, headers, filterCategory, filterUnread, filterSaved]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (sweepLogRef.current) sweepLogRef.current.scrollTop = sweepLogRef.current.scrollHeight;
  }, [sweepLog]);

  const runSweep = async () => {
    setSweeping(true);
    setSweepLog(["Initialising sweep..."]);
    setShowSweepLog(true);

    try {
      const res = await fetch(`${base}feed/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin }
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.phase === "searching") setSweepLog(prev => [...prev, `🔍 ${d.content}`]);
              else if (d.phase === "streaming" && d.content?.includes("TITLE:")) {
                setSweepLog(prev => [...prev, `📡 Receiving discoveries...`]);
              }
              if (d.done) {
                setSweepLog(prev => [...prev, `✅ Sweep complete — ${d.itemsFound} new discoveries found`]);
                loadAll();
              }
              if (d.error) setSweepLog(prev => [...prev, `❌ Error: ${d.error}`]);
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setSweepLog(prev => [...prev, `❌ ${err.message}`]);
    }

    setSweeping(false);
  };

  const markAllRead = async () => {
    await fetch(`${base}feed/mark-all-read`, { method: "PATCH", headers: headers() });
    loadAll();
  };

  const updateDiscovery = (id: number, updates: Partial<Discovery>) => {
    setDiscoveries(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (stats) setStats({ ...stats, unread: updates.isRead ? Math.max(0, stats.unread - 1) : stats.unread + 1 });
  };

  const deleteDiscovery = async (id: number) => {
    await fetch(`${base}feed/discoveries/${id}`, { method: "DELETE", headers: headers() });
    setDiscoveries(prev => prev.filter(d => d.id !== id));
  };

  const categories = stats ? Object.keys(stats.categories).sort() : [];

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: controls */}
      <div className="w-64 border-r flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,6%)" }}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(210,80%,55%), hsl(280,70%,50%))" }}>
              <Atom className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">AI Intelligence</h2>
              <p className="text-white/35 text-xs">Live discovery feed</p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Total", value: stats.total, color: "rgba(255,255,255,0.5)" },
                { label: "Unread", value: stats.unread, color: "hsl(45,100%,55%)" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-2.5 text-center"
                  style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="font-bold text-lg leading-none" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sweep controls */}
          <button onClick={runSweep} disabled={sweeping}
            className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all mb-2"
            style={{ background: "linear-gradient(135deg, hsl(210,80%,50%), hsl(280,70%,50%))", color: "white", opacity: sweeping ? 0.5 : 1 }}>
            {sweeping ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sweeping...</> : <><RefreshCw className="w-3.5 h-3.5" /> Run AI Sweep Now</>}
          </button>

          {stats?.lastSweep && (
            <p className="text-white/20 text-xs text-center mb-4">
              Last: {new Date(stats.lastSweep.startedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {" · "}{stats.lastSweep.itemsFound} found
            </p>
          )}

          {showSweepLog && sweepLog.length > 0 && (
            <div ref={sweepLogRef}
              className="rounded-xl p-3 mb-4 max-h-32 overflow-y-auto space-y-1"
              style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {sweepLog.map((l, i) => (
                <p key={i} className="text-white/50 text-xs leading-relaxed">{l}</p>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <p className="text-white/25 text-xs uppercase tracking-wider">Filter</p>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: filterSaved ? "Saved ✓" : "Saved", active: filterSaved, action: () => setFilterSaved(!filterSaved) },
                { label: filterUnread ? "Unread ✓" : "Unread", active: filterUnread, action: () => setFilterUnread(!filterUnread) },
              ].map(f => (
                <button key={f.label} onClick={f.action}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{ background: f.active ? "hsl(210,80%,50%)" : "hsl(226,45%,12%)", color: f.active ? "white" : "rgba(255,255,255,0.4)", border: f.active ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div>
              <p className="text-white/25 text-xs mb-1.5">Category</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setFilterCategory("all")}
                  className="text-xs px-2 py-0.5 rounded-full transition-all"
                  style={{ background: filterCategory === "all" ? "rgba(255,255,255,0.15)" : "transparent", color: filterCategory === "all" ? "white" : "rgba(255,255,255,0.35)" }}>
                  All
                </button>
                {categories.map(cat => {
                  const color = CATEGORY_COLORS[cat] || "hsl(193,100%,35%)";
                  return (
                    <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                      className="text-xs px-2 py-0.5 rounded-full transition-all"
                      style={{
                        background: filterCategory === cat ? color + "30" : "transparent",
                        color: filterCategory === cat ? color : "rgba(255,255,255,0.35)",
                        border: filterCategory === cat ? `1px solid ${color}50` : "1px solid transparent"
                      }}>
                      {cat}
                      <span className="ml-1 text-white/20">{stats?.categories[cat]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {discoveries.length > 0 && stats && stats.unread > 0 && (
            <button onClick={markAllRead} className="w-full mt-4 py-1.5 rounded-xl text-xs text-white/30 transition-all hover:text-white/50"
              style={{ background: "hsl(226,45%,10%)" }}>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Right: feed */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-white/30">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading feed...</span>
            </div>
          </div>
        ) : discoveries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Atom className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm font-medium mb-2">No discoveries yet</p>
              <p className="text-white/15 text-xs leading-relaxed mb-5">The sweep runs every 6 hours automatically, scanning universities, research labs, and industry sources for new AI developments. You can also trigger it manually above.</p>
              <button onClick={runSweep} disabled={sweeping}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                style={{ background: "linear-gradient(135deg, hsl(210,80%,50%), hsl(280,70%,50%))", opacity: sweeping ? 0.5 : 1 }}>
                {sweeping ? "Running sweep..." : "Run First Sweep"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <p className="text-white/30 text-xs">{discoveries.length} discoveries{filterCategory !== "all" ? ` · ${filterCategory}` : ""}</p>
              <p className="text-white/20 text-xs">Auto-updates every 6 hours</p>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {discoveries.map(d => (
                  <DiscoveryCard key={d.id} d={d} pin={pin} onUpdate={updateDiscovery} onDelete={deleteDiscovery} />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const COMMERCE_TOOLS = [
  { id: "listings",   label: "Product Listings",  icon: Package,    color: "hsl(25,90%,55%)",   desc: "Amazon, Shopify & Etsy listings — titles, bullets, A+ content, SEO meta" },
  { id: "adcopy",     label: "Ad Copy",           icon: Zap,        color: "hsl(280,70%,60%)",  desc: "Meta, Google & TikTok ads — complete creative with targeting briefs" },
  { id: "email",      label: "Email Sequence",    icon: Send,       color: "hsl(193,100%,45%)", desc: "7-email welcome/nurture/convert/win-back flow with subject lines" },
  { id: "seo",        label: "SEO Content Brief", icon: Telescope,  color: "hsl(155,70%,45%)",  desc: "Keyword strategy, page structure, meta, E-E-A-T & 90-day roadmap" },
  { id: "social",     label: "Social Calendar",   icon: Globe,      color: "hsl(330,75%,60%)",  desc: "30-day Instagram/TikTok/LinkedIn calendar with hooks, copy & hashtags" },
  { id: "conversion", label: "Conversion Audit",  icon: TrendingUp, color: "hsl(45,100%,50%)",  desc: "Full CRO analysis — page structure, A/B roadmap, checkout friction" },
] as const;
type CommerceToolId = typeof COMMERCE_TOOLS[number]["id"];

const PLATFORM_OPTIONS: Record<CommerceToolId, string[]> = {
  listings:   ["Amazon", "Shopify", "Etsy", "TikTok Shop", "eBay", "All platforms"],
  adcopy:     ["Meta (Facebook + Instagram)", "Google Ads", "TikTok Ads", "LinkedIn Ads", "Pinterest Ads", "All platforms"],
  email:      ["Klaviyo", "Mailchimp", "ActiveCampaign", "HubSpot", "Generic / Any ESP"],
  seo:        ["WordPress", "Shopify", "Webflow", "Squarespace", "General / Any CMS"],
  social:     ["Instagram + TikTok", "LinkedIn", "X (Twitter)", "Facebook", "All platforms"],
  conversion: ["Shopify", "WooCommerce", "Webflow Landing Page", "Unbounce", "General landing page"],
};

const TONE_OPTIONS = ["Professional & confident", "Conversational & friendly", "Luxury & aspirational", "Bold & direct", "Playful & fun", "Authoritative & technical"];

function CommerceLabPanel({ pin }: { pin: string }) {
  const [activeTool, setActiveTool] = useState<CommerceToolId>("listings");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const base = getApiBase();

  const tool = COMMERCE_TOOLS.find(t => t.id === activeTool)!;

  const generate = async () => {
    if (!description.trim() || generating) return;
    setGenerating(true); setOutput(""); setCopied(false);
    try {
      const res = await fetch(`${base}lab/commerce`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ type: activeTool, description, platform, tone }),
      });
      if (!res.ok || !res.body) { setGenerating(false); return; }

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
            if (msg.type === "searching") { setSearching(true); }
            if (msg.delta) { setSearching(false); setOutput(prev => prev + msg.delta); }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
    setGenerating(false); setSearching(false);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(226,45%,5%)" }}>
      {/* Tool selector */}
      <div className="border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="px-4 py-3">
          <p className="text-[10px] font-mono mb-2.5" style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>COMMERCE LAB — SELECT TOOL</p>
          <div className="grid grid-cols-3 gap-2">
            {COMMERCE_TOOLS.map(t => {
              const Icon = t.icon;
              const active = activeTool === t.id;
              return (
                <button key={t.id} onClick={() => { setActiveTool(t.id); setOutput(""); setPlatform(""); }}
                  className="flex flex-col gap-1.5 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? "hsl(226,45%,12%)" : "hsl(226,45%,8%)",
                    border: `1px solid ${active ? t.color + "50" : "rgba(255,255,255,0.06)"}`,
                    boxShadow: active ? `0 0 16px ${t.color}20` : "none",
                  }}>
                  <Icon className="w-4 h-4" style={{ color: active ? t.color : "rgba(255,255,255,0.3)" }} />
                  <span className="text-xs font-semibold leading-tight" style={{ color: active ? "white" : "rgba(255,255,255,0.5)" }}>{t.label}</span>
                  <span className="text-[10px] leading-tight" style={{ color: active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Input panel + output side by side */}
      <div className="flex-1 flex min-h-0">
        {/* Left: inputs */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r p-4 gap-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,7%)" }}>
          <div>
            <label className="text-[10px] font-mono mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>
              PRODUCT / BRAND / URL *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={
                activeTool === "listings" ? "e.g. Bamboo travel water bottle, 500ml, keeps drinks cold 24hrs, leak-proof lid, includes infuser..."
                : activeTool === "adcopy" ? "e.g. Online fitness coaching app for busy professionals. 12-week transformation programme, £47/month..."
                : activeTool === "email" ? "e.g. Handmade soy candles — Northwick Candle Co. Luxury scents, sustainable packaging, £18-£35..."
                : activeTool === "seo" ? "e.g. 'best noise cancelling headphones under £100' — review/buyer guide page for a tech accessories site..."
                : activeTool === "social" ? "e.g. Sustainable fashion brand for women 25-40. Slow fashion, ethical production, based in Manchester..."
                : "e.g. Shopify store selling premium pet accessories. Current conversion rate ~1.2%. Target audience: dog owners 28-45..."
              }
              rows={6}
              className="w-full rounded-xl p-3 text-sm resize-none outline-none leading-relaxed"
              style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", fontSize: "0.78rem" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>
              PLATFORM
            </label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-xs outline-none appearance-none"
              style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.08)", color: platform ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)" }}>
              <option value="">Auto-select best platform</option>
              {PLATFORM_OPTIONS[activeTool].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>
              TONE
            </label>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-xs outline-none appearance-none"
              style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.08)", color: tone ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)" }}>
              <option value="">Auto-match to product</option>
              {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button onClick={generate} disabled={!description.trim() || generating}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: !description.trim() || generating ? "hsl(226,45%,12%)" : `linear-gradient(135deg, ${tool.color}cc, ${tool.color}88)`,
              border: `1px solid ${tool.color}40`,
              color: !description.trim() ? "rgba(255,255,255,0.2)" : "white",
              boxShadow: description.trim() && !generating ? `0 0 20px ${tool.color}30` : "none",
            }}>
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Sparkles className="w-4 h-4" /> Generate {tool.label}</>
            }
          </button>

          {output && (
            <div className="text-xs space-y-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              <p className="font-mono" style={{ fontSize: "10px", letterSpacing: "0.1em" }}>OUTPUT STATS</p>
              <p>{output.split(" ").length.toLocaleString()} words</p>
              <p>{output.length.toLocaleString()} characters</p>
            </div>
          )}
        </div>

        {/* Right: output */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Output toolbar */}
          {output && (
            <div className="px-4 py-2.5 border-b flex-shrink-0 flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,6%)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: tool.color }} />
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>{tool.label}</span>
                {searching && <span className="flex items-center gap-1 text-[10px] font-mono animate-pulse" style={{ color: "hsl(193,100%,55%)" }}><Globe className="w-3 h-3" /> Searching…</span>}
                {generating && !searching && <span className="text-[10px] font-mono animate-pulse" style={{ color: tool.color }}>● LIVE</span>}
              </div>
              <button onClick={copyOutput}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: copied ? "hsla(155,70%,35%,0.2)" : "hsl(226,45%,12%)", color: copied ? "hsl(155,70%,55%)" : "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy all</>}
              </button>
            </div>
          )}

          {/* Output content */}
          <div className="flex-1 overflow-y-auto">
            {!output && !generating && (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {React.createElement(tool.icon, { className: "w-7 h-7", style: { color: tool.color } })}
                </div>
                <div className="text-center space-y-1.5 max-w-xs">
                  <p className="text-white font-semibold text-sm">{tool.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>{tool.desc}</p>
                </div>
              </div>
            )}

            {(output || generating) && (
              <div className="p-5">
                <div className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "rgba(255,255,255,0.82)", fontFamily: "inherit", lineHeight: "1.75" }}>
                  {output}
                  {generating && <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse" style={{ background: tool.color, verticalAlign: "middle" }} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type FundingMatch = {
  scheme: string; type: "tax_credit" | "grant" | "equity" | "loan";
  geography: string; amount: string; matchStrength: "strong" | "good" | "possible";
  matchReason: string; keyEvidence: string; nextStep: string; url: string;
};
type FundingOpportunity = { projectId: number; projectName: string; matches: FundingMatch[] };
type FundingResult = { opportunities: FundingOpportunity[]; summary: string };

function FundingRadarPanel({ pin }: { pin: string }) {
  const [result, setResult] = useState<FundingResult | null>(null);
  const [running, setRunning] = useState(false);
  const [searching, setSearching] = useState(false);
  const [rawStream, setRawStream] = useState("");
  const [filter, setFilter] = useState<"all" | "UK" | "EU" | "International">("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const base = getApiBase();

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const runAnalysis = async () => {
    setRunning(true); setSearching(false); setResult(null); setRawStream(""); setExpandedCards(new Set());
    try {
      const res = await fetch(`${base}lab/funding`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({}),
      });
      if (!res.ok || !res.body) { setRunning(false); return; }

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
            if (msg.type === "searching") { setSearching(true); }
            if (msg.delta) { setSearching(false); setRawStream(prev => prev + msg.delta); }
            if (msg.done && msg.content) {
              try {
                const parsed = JSON.parse(msg.content) as FundingResult;
                setResult(parsed);
              } catch { /* ignore parse error */ }
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
    setRunning(false); setSearching(false);
  };

  const STRENGTH_CONFIG = {
    strong: { label: "Strong Match", color: "hsl(155,70%,45%)", bg: "hsla(155,70%,45%,0.1)", border: "hsla(155,70%,45%,0.25)" },
    good:   { label: "Good Match",   color: "hsl(45,100%,50%)", bg: "hsla(45,100%,50%,0.1)", border: "hsla(45,100%,50%,0.25)" },
    possible: { label: "Possible",   color: "hsl(210,80%,60%)", bg: "hsla(210,80%,60%,0.1)", border: "hsla(210,80%,60%,0.25)" },
  };

  const TYPE_LABELS: Record<string, string> = { tax_credit: "Tax Credit", grant: "Grant", equity: "Equity", loan: "Loan" };
  const GEO_COLORS: Record<string, string> = { UK: "hsl(193,100%,40%)", EU: "hsl(45,90%,50%)", International: "hsl(280,60%,60%)" };

  const filteredOpportunities = result?.opportunities.map(opp => ({
    ...opp,
    matches: filter === "all" ? opp.matches : opp.matches.filter(m => m.geography.includes(filter)),
  })).filter(opp => opp.matches.length > 0) ?? [];

  const totalMatches = result?.opportunities.reduce((sum, o) => sum + o.matches.length, 0) ?? 0;
  const strongMatches = result?.opportunities.reduce((sum, o) => sum + o.matches.filter(m => m.matchStrength === "strong").length, 0) ?? 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ background: "hsl(226,45%,5%)" }}>
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck className="w-5 h-5" style={{ color: "hsl(155,70%,45%)" }} />
              <h2 className="text-white font-bold text-lg">Funding Radar</h2>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", maxWidth: "480px" }}>
              Scans every project in your Lab against real, active UK and international R&D grant schemes, tax incentives, and innovation funding programmes. Only genuine opportunities — no speculation.
            </p>
          </div>
          <button onClick={runAnalysis} disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all"
            style={{ background: running ? "hsl(226,45%,12%)" : "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)", opacity: running ? 0.7 : 1 }}>
            {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><RefreshCw className="w-4 h-4" /> Run Analysis</>}
          </button>
        </div>

        {result && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Total Opportunities", value: totalMatches, color: "hsl(193,100%,50%)" },
              { label: "Strong Matches", value: strongMatches, color: "hsl(155,70%,50%)" },
              { label: "Projects Analysed", value: result.opportunities.length, color: "hsl(45,100%,50%)" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {!result && !running && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <BadgeCheck className="w-8 h-8" style={{ color: "hsl(155,70%,45%)" }} />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-white font-semibold text-base">Find funding for your projects</p>
              <p className="text-xs max-w-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                Analyses every project in your Lab against UK RDEC, Innovate UK, Horizon Europe, DASA, sector-specific funds, and international tax incentives. Projects with a Brief or Specs get the most relevant results.
              </p>
            </div>
            <button onClick={runAnalysis}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)", boxShadow: "0 0 24px hsla(155,70%,38%,0.2)" }}>
              Run Funding Analysis
            </button>
          </div>
        )}

        {running && !result && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            {searching ? (
              <Globe className="w-8 h-8 animate-pulse" style={{ color: "hsl(193,100%,55%)" }} />
            ) : (
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(155,70%,45%)" }} />
            )}
            <p className="text-sm" style={{ color: searching ? "hsl(193,100%,65%)" : "rgba(255,255,255,0.5)" }}>
              {searching ? "Searching the web for live funding data…" : "Analysing projects against funding databases..."}
            </p>
            {rawStream && (
              <div className="max-w-md w-full rounded-xl p-4 font-mono text-xs leading-relaxed"
                style={{ background: "hsl(226,45%,8%)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)", maxHeight: "120px", overflow: "hidden" }}>
                {rawStream.slice(-400)}
              </div>
            )}
          </div>
        )}

        {result && (
          <>
            {/* Summary */}
            {result.summary && (
              <div className="rounded-xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid hsla(155,70%,45%,0.2)" }}>
                <p className="text-xs font-mono mb-1.5" style={{ color: "hsl(155,70%,45%)", letterSpacing: "0.1em" }}>PORTFOLIO SUMMARY</p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{result.summary}</p>
              </div>
            )}

            {/* Geography filter */}
            <div className="flex items-center gap-2">
              {(["all", "UK", "EU", "International"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: filter === f ? "hsl(226,45%,14%)" : "transparent",
                    border: filter === f ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                    color: filter === f ? "white" : "rgba(255,255,255,0.35)",
                  }}>
                  {f === "all" ? "All Regions" : f}
                </button>
              ))}
              <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                {filteredOpportunities.reduce((s, o) => s + o.matches.length, 0)} opportunities shown
              </span>
            </div>

            {/* Opportunities by project */}
            {filteredOpportunities.length === 0 && (
              <p className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                No opportunities found for the selected region filter.
              </p>
            )}

            {filteredOpportunities.map(opp => (
              <div key={opp.projectId} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,45%)" }} />
                  <span className="text-sm font-semibold text-white">{opp.projectName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsla(193,100%,35%,0.15)", color: "hsl(193,100%,55%)", border: "1px solid hsla(193,100%,35%,0.2)" }}>
                    {opp.matches.length} opportunit{opp.matches.length !== 1 ? "ies" : "y"}
                  </span>
                </div>

                {opp.matches.map((match, idx) => {
                  const strength = STRENGTH_CONFIG[match.matchStrength] || STRENGTH_CONFIG.possible;
                  const cardKey = `${opp.projectId}-${idx}`;
                  const expanded = expandedCards.has(cardKey);
                  const geo = match.geography.split("+")[0].trim();
                  const geoColor = GEO_COLORS[geo] || "hsl(193,100%,40%)";

                  return (
                    <div key={idx} className="rounded-xl overflow-hidden transition-all"
                      style={{ background: "hsl(226,45%,8%)", border: `1px solid ${strength.border}` }}>
                      {/* Card header — always visible */}
                      <button onClick={() => toggleCard(cardKey)} className="w-full text-left p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-sm font-semibold text-white">{match.scheme}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Match strength */}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: strength.bg, color: strength.color, border: `1px solid ${strength.border}` }}>
                                {strength.label}
                              </span>
                              {/* Type */}
                              <span className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: "hsl(226,45%,12%)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                {TYPE_LABELS[match.type] || match.type}
                              </span>
                              {/* Geography */}
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                                style={{ background: `${geoColor}15`, color: geoColor, border: `1px solid ${geoColor}30` }}>
                                {match.geography}
                              </span>
                              {/* Amount */}
                              <span className="text-[10px] font-semibold" style={{ color: "hsl(45,100%,55%)" }}>
                                {match.amount}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform mt-0.5"
                            style={{ color: "rgba(255,255,255,0.3)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                        </div>
                        {/* Match reason — always shown */}
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {match.matchReason}
                        </p>
                      </button>

                      {/* Expanded detail */}
                      {expanded && (
                        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                          <div className="pt-3 space-y-3">
                            <div className="rounded-lg p-3" style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <p className="text-[10px] font-mono mb-1" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>EVIDENCE NEEDED</p>
                              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{match.keyEvidence}</p>
                            </div>
                            <div className="rounded-lg p-3" style={{ background: "hsla(155,70%,35%,0.08)", border: "1px solid hsla(155,70%,35%,0.2)" }}>
                              <p className="text-[10px] font-mono mb-1" style={{ color: "hsl(155,70%,45%)", letterSpacing: "0.1em" }}>NEXT STEP</p>
                              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{match.nextStep}</p>
                            </div>
                            {match.url && (
                              <a href={match.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs transition-all"
                                style={{ color: "hsl(193,100%,55%)" }}
                                onMouseEnter={e => e.currentTarget.style.color = "hsl(193,100%,70%)"}
                                onMouseLeave={e => e.currentTarget.style.color = "hsl(193,100%,55%)"}>
                                <ExternalLink className="w-3 h-3" />
                                {match.url}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function StarLabPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [navMode, setNavMode] = useState<NavMode>("projects");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("General");
  const base = getApiBase();

  useEffect(() => {
    const stored = sessionStorage.getItem("lab_pin");
    if (stored) { setPin(stored); setUnlocked(true); }
  }, []);

  const headers = useCallback(() => ({ "Content-Type": "application/json", "x-lab-pin": pin }), [pin]);

  const loadProjects = useCallback(async () => {
    const res = await fetch(`${base}lab/projects`, { headers: headers() });
    if (res.ok) setProjects(await res.json());
  }, [base, headers]);

  const loadProject = useCallback(async (id: number) => {
    const res = await fetch(`${base}lab/projects/${id}`, { headers: headers() });
    if (res.ok) { const p = await res.json(); setActiveProject(p); }
  }, [base, headers]);

  useEffect(() => { if (unlocked) loadProjects(); }, [unlocked, loadProjects]);

  const onUnlock = (p: string) => { setPin(p); setUnlocked(true); };

  const createProject = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`${base}lab/projects`, { method: "POST", headers: headers(), body: JSON.stringify({ name: newName.trim(), industry: newIndustry }) });
    if (res.ok) {
      const p = await res.json();
      setCreating(false); setNewName(""); setNewIndustry("General");
      await loadProjects(); await loadProject(p.id);
      setNavMode("projects");
    }
  };

  const deleteProject = async (id: number) => {
    if (!confirm("Delete this project permanently?")) return;
    await fetch(`${base}lab/projects/${id}`, { method: "DELETE", headers: headers() });
    if (activeProject?.id === id) setActiveProject(null);
    loadProjects();
  };

  if (!unlocked) return <PinGate onUnlock={onUnlock} />;

  const NAV_ITEMS = [
    { id: "projects" as NavMode, label: "Projects", icon: FolderOpen, color: "hsl(193,100%,35%)" },
    { id: "botlab" as NavMode, label: "Bot Lab", icon: Bot, color: "hsl(280,70%,55%)" },
    { id: "scout" as NavMode, label: "Scout", icon: Telescope, color: "hsl(45,100%,45%)" },
    { id: "feed" as NavMode, label: "AI Intelligence", icon: Atom, color: "hsl(210,80%,55%)", badge: true },
    { id: "grants" as NavMode, label: "Funding Radar", icon: BadgeCheck, color: "hsl(155,70%,45%)" },
    { id: "commerce" as NavMode, label: "Commerce Lab", icon: TrendingUp, color: "hsl(25,90%,55%)" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(226,45%,5%)" }}>
      {/* SIDEBAR */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,7%)" }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(193,100%,30%), hsl(226,70%,45%))" }}>
              <Star className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Star Lab</p>
              <p className="text-white/30 text-xs mt-0.5">Private R&D</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="p-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setNavMode(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 transition-all text-left"
                style={{
                  background: navMode === item.id ? "hsl(226,45%,12%)" : "transparent",
                  border: navMode === item.id ? `1px solid ${item.color}30` : "1px solid transparent"
                }}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: navMode === item.id ? item.color : "rgba(255,255,255,0.3)" }} />
                <span className="text-sm flex-1" style={{ color: navMode === item.id ? "white" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
                {(item as any).badge && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Projects list */}
        {navMode === "projects" && (
          <>
            <div className="p-3">
              <button onClick={() => setCreating(true)}
                className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-all"
                style={{ background: "hsl(193,100%,32%)", color: "white" }}>
                <Plus className="w-3.5 h-3.5" /> New Project
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <AnimatePresence>
                {creating && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="rounded-xl p-3 mb-1.5" style={{ background: "hsl(226,45%,12%)", border: "1px solid hsl(193,100%,35%,0.5)" }}>
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && createProject()}
                      placeholder="Project name" className="w-full bg-transparent text-white text-xs outline-none placeholder-white/30 mb-2" />
                    <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)}
                      className="w-full text-white/60 text-xs outline-none mb-2.5 px-1 py-1 rounded-lg"
                      style={{ background: "hsl(226,45%,15%)" }}>
                      {INDUSTRIES.map(i => <option key={i} value={i} style={{ background: "hsl(226,45%,15%)" }}>{i}</option>)}
                    </select>
                    <div className="flex gap-1.5">
                      <button onClick={createProject} className="flex-1 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: "hsl(193,100%,35%)" }}>Create</button>
                      <button onClick={() => setCreating(false)} className="py-1.5 px-2.5 rounded-lg text-xs text-white/40">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {projects.map(p => (
                <div key={p.id} onClick={() => { loadProject(p.id); }}
                  className="group flex items-center gap-2 rounded-xl px-2.5 py-2 mb-0.5 cursor-pointer transition-all"
                  style={{ background: activeProject?.id === p.id ? "hsl(226,45%,14%)" : "transparent", border: activeProject?.id === p.id ? "1px solid rgba(255,255,255,0.09)" : "1px solid transparent" }}>
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(193,100%,45%)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{p.name}</p>
                    <p className="text-white/25 text-xs truncate">{p.industry}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Trash2 className="w-3 h-3 text-red-400/50 hover:text-red-400" />
                  </button>
                </div>
              ))}

              {projects.length === 0 && !creating && (
                <p className="text-white/20 text-xs text-center py-6">No projects yet</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {navMode === "feed" && <FeedPanel pin={pin} />}
        {navMode === "scout" && <ScoutPanel pin={pin} />}
        {navMode === "botlab" && <BotLabPanel pin={pin} />}
        {navMode === "grants" && <FundingRadarPanel pin={pin} />}
        {navMode === "commerce" && <CommerceLabPanel pin={pin} />}
        {navMode === "projects" && (
          activeProject
            ? <ProjectWorkspace project={activeProject} pin={pin} onUpdate={p => setActiveProject(p)} />
            : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md px-8">
                  <Star className="w-12 h-12 mx-auto mb-4 text-white/8" />
                  <h2 className="text-white/30 font-bold text-lg mb-2">Sirius Star Lab</h2>
                  <p className="text-white/15 text-sm leading-relaxed mb-6">Select a project from the sidebar, or create a new one. Each project has its own workspace — Brief, Research, Specs, Code, and Drawings — with a dedicated AI partner that knows the full context of your work.</p>
                  <div className="flex gap-3 justify-center">
                    {[
                      { icon: Bot, label: "Bot Lab", action: () => setNavMode("botlab"), color: "hsl(280,70%,55%)" },
                      { icon: Telescope, label: "Scout", action: () => setNavMode("scout"), color: "hsl(45,100%,45%)" },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.label} onClick={item.action}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
                          style={{ background: "hsl(226,45%,12%)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <Icon className="w-4 h-4" style={{ color: item.color }} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
}
