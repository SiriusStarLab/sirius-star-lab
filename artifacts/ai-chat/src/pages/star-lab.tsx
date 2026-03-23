import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Star, Plus, Trash2, Send, Loader2, FileText, Code, Ruler,
  BookOpen, Telescope, ExternalLink, Sparkles, X, FolderOpen,
  Pencil, Check, Bot, Zap, TrendingUp, Package, Layers,
  ChevronDown, RotateCcw, Copy, Globe,
  Cpu, Wrench, ChevronRight, Rss, RefreshCw, Bookmark, BookmarkCheck,
  Heart, FlaskConical, Eye, EyeOff, Trash, Bell, BellOff, Filter,
  ChevronUp, BadgeCheck, Lightbulb, Atom, Upload, Download,
  Mail, UserPlus, Users, Settings2, AtSign, Building2, Briefcase, StickyNote, CheckCircle2, AlertCircle,
  Banknote, CreditCard, ShoppingBag, BarChart3, ArrowRight, FileSearch, Hammer, ClipboardList,
  Brain, MessageSquare, Activity, Target, Building
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
  renders: string; updatedAt: string; createdAt: string;
  autoCreated: string; autoScanId: string;
  approvalStatus: string;
  fundingAnalysis: string; fundingStatus: string; fundingAnalysedAt: string | null;
  messages?: Message[];
};
type Message = { id: number; projectId: number; role: string; content: string; createdAt: string };
type ScoutReport = { id: number; title: string; industry: string; opportunity: string; type: string; createdAt: string };
type ScanHistoryEntry = {
  id: number; scanId: string; status: string;
  opportunitiesFound: number; projectsCreated: number; upgradesApplied: number;
  summary: string; items: string; error: string;
  startedAt: string; completedAt: string | null;
};
type RankResult = {
  projectId: number; name: string; rank: number;
  monetisationScore: number; timeToFirstRevenue: string;
  revenueConfidence: string; verdict: string;
  keyStrengths: string[]; estimatedMonthlyRevenue: string;
  buildEffort: string;
};
type NavMode = "projects" | "botlab" | "scout" | "feed" | "grants" | "commerce" | "outreach" | "autolab" | "revenue" | "agency" | "mission" | "growth" | "brain" | "research" | "docs";

const MAX_PIN_DIGITS = 8;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

/* ─── Cinematic greeting shown before the PIN pad ─────────────────────── */
function StarLabGreeting({ userName, onComplete }: { userName?: string; onComplete: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showButton, setShowButton] = useState(false);

  const lines = [
    userName ? { text: `Hi ${userName},`, big: true } : null,
    { text: "You are now entering", big: false },
    { text: "Sirius Star Labs.", big: false, accent: true },
    { text: "This is a restricted area.", big: false },
    { text: "Please enter your access code.", big: false, dim: true },
  ].filter(Boolean) as { text: string; big?: boolean; accent?: boolean; dim?: boolean }[];

  useEffect(() => {
    const DELAYS = [700, 1300, 1900, 2650, 3400];
    const timers = DELAYS.slice(0, lines.length).map((delay, i) =>
      setTimeout(() => setVisibleCount(i + 1), delay)
    );
    const btnTimer = setTimeout(() => setShowButton(true), DELAYS[lines.length - 1] + 900);
    return () => { timers.forEach(clearTimeout); clearTimeout(btnTimer); };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "hsl(226,50%,3%)" }}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(hsl(193,100%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(193,100%,60%) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Corner brackets */}
      {[["top-8 left-8","border-t-2 border-l-2"],["top-8 right-8","border-t-2 border-r-2"],["bottom-8 left-8","border-b-2 border-l-2"],["bottom-8 right-8","border-b-2 border-r-2"]].map(([pos, border], i) => (
        <div key={i} className={`absolute w-8 h-8 ${pos} ${border} opacity-20`} style={{ borderColor: "hsl(193,100%,50%)" }} />
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

      <div className="flex flex-col items-center gap-10 relative z-10 px-8 text-center">

        {/* Twins logo — large, with glow rings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
          style={{ width: 150, height: 150 }}
        >
          {/* Outer slow-spin ring */}
          <div className="ai-ring-outer absolute inset-0 rounded-full"
            style={{ border: "1px dashed hsl(193,100%,52% / 0.35)" }} />
          <div className="absolute inset-3 rounded-full"
            style={{ border: "1px solid hsl(193,100%,52% / 0.20)" }} />
          {/* Glow halo */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(193,100%,52% / 0.22) 0%, transparent 68%)", filter: "blur(12px)" }} />
          {/* Logo image */}
          <div className="relative z-10 rounded-full overflow-hidden"
            style={{
              width: 118, height: 118,
              border: "2px solid hsl(193,100%,52% / 0.50)",
              boxShadow: "0 0 36px hsl(193,100%,52% / 0.45), 0 0 90px hsl(193,100%,52% / 0.18)",
            }}>
            <img src="/logo-v2.png" alt="Sirius AI" className="w-full h-full object-cover"
              style={{ filter: "brightness(1.15) contrast(1.08) saturate(1.2)" }} />
          </div>
        </motion.div>

        {/* Lines revealing one by one */}
        <div className="space-y-2 min-h-[140px] flex flex-col items-center justify-center">
          {lines.map((line, i) => (
            <AnimatePresence key={i}>
              {visibleCount > i && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="font-mono"
                  style={{
                    fontSize: line.big ? "1.5rem" : "0.875rem",
                    fontWeight: line.big ? 700 : 400,
                    color: line.big
                      ? "#fff"
                      : line.accent
                      ? "hsl(193,100%,60%)"
                      : line.dim
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(255,255,255,0.70)",
                    letterSpacing: line.big ? "-0.01em" : "0.15em",
                    textTransform: line.big ? "none" : "uppercase",
                  }}
                >
                  {line.text}
                </motion.p>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* Enter code button */}
        <AnimatePresence>
          {showButton && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              onClick={onComplete}
              className="px-8 py-3 rounded-xl font-mono text-sm tracking-[0.2em] uppercase transition-all duration-200 active:scale-95 hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, hsl(193,100%,22%), hsl(193,100%,16%))",
                border: "1px solid hsl(193,100%,38%)",
                color: "hsl(193,100%,70%)",
                boxShadow: "0 0 24px hsl(193,100%,35% / 0.35)",
              }}
            >
              Enter Code →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PinGate({ onUnlock, userName }: { onUnlock: (pin: string) => void; userName?: string }) {
  const [phase, setPhase] = useState<"greeting" | "pin">("greeting");
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
        const body = await res.json().catch(() => ({}));
        // Server-side lockout (403) — use server's unlock time if available
        if (res.status === 403 && body.unlocksAt) {
          setStatus("locked");
          setLockoutEnd(new Date(body.unlocksAt).getTime());
          setAttempts(MAX_ATTEMPTS);
        } else {
          // Use server's remaining attempts count if provided
          const newAttempts = body.attemptsLeft !== undefined
            ? MAX_ATTEMPTS - body.attemptsLeft
            : attempts + 1;
          setAttempts(newAttempts);
          if (newAttempts >= MAX_ATTEMPTS) {
            setStatus("locked");
            setLockoutEnd(Date.now() + LOCKOUT_SECONDS * 1000);
          } else {
            setStatus("error");
            triggerShake();
          }
        }
        setDigits([]);
      }
    } catch {
      setStatus("error");
      triggerShake();
    }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","del","0","ok"];
  const attemptsLeft = MAX_ATTEMPTS - attempts;
  const PIN_DISPLAY_LENGTH = Math.max(4, digits.length + (digits.length < MAX_PIN_DIGITS ? 1 : 0));

  // Show cinematic greeting before the PIN pad
  if (phase === "greeting") {
    return (
      <motion.div
        key="greeting"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <StarLabGreeting userName={userName} onComplete={() => setPhase("pin")} />
      </motion.div>
    );
  }

  return (
    <motion.div
      key="pin"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
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
    </motion.div>
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
  { id: "funding", label: "Funding", icon: BadgeCheck, field: "fundingAnalysis", phase: "all", placeholder: "", generated: false },
];

// ── Lab Markdown Renderer ─────────────────────────────────────────────────
function LabMarkdown({ content, streaming }: { content: string; streaming: boolean }) {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);

  const copyBlock = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(idx);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  let codeBlockIdx = 0;

  return (
    <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.65 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0 border-b pb-1" style={{ borderColor: "rgba(255,255,255,0.1)" }}>{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0" style={{ color: "hsl(193,100%,65%)" }}>{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold mb-1 mt-2 first:mt-0" style={{ color: "rgba(255,255,255,0.75)" }}>{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 space-y-0.5 list-none pl-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 space-y-0.5 pl-4" style={{ listStyleType: "decimal" }}>{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-1.5 items-start">
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "hsl(193,100%,50%)" }} />
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em style={{ color: "rgba(255,255,255,0.65)" }}>{children}</em>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "hsl(193,100%,60%)" }}>{children}</a>,
          blockquote: ({ children }) => (
            <blockquote className="pl-3 py-1 my-2 rounded-r-lg" style={{ borderLeft: "3px solid hsl(193,100%,40%)", background: "rgba(0,198,255,0.06)" }}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: "rgba(0,198,255,0.08)" }}>{children}</thead>,
          th: ({ children }) => <th className="text-left px-2.5 py-1.5 font-semibold" style={{ color: "hsl(193,100%,65%)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)" }}>{children}</td>,
          hr: () => <hr className="my-3" style={{ borderColor: "rgba(255,255,255,0.08)" }} />,
          code({ node, className, children, ...props }: any) {
            const inline = !className;
            if (inline) {
              return (
                <code className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: "rgba(0,198,255,0.12)", color: "hsl(193,100%,70%)" }} {...props}>
                  {children}
                </code>
              );
            }
            const thisIdx = codeBlockIdx++;
            const codeStr = String(children).replace(/\n$/, "");
            const lang = (className || "").replace("language-", "") || "code";
            return (
              <div className="relative my-2 rounded-xl overflow-hidden" style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xs font-mono" style={{ color: "hsl(193,100%,55%)" }}>{lang}</span>
                  <button onClick={() => copyBlock(codeStr, thisIdx)}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-all"
                    style={{ background: copiedBlock === thisIdx ? "hsl(155,70%,30%)" : "rgba(255,255,255,0.06)", color: copiedBlock === thisIdx ? "hsl(155,70%,70%)" : "rgba(255,255,255,0.45)" }}>
                    {copiedBlock === thisIdx ? <><Check className="w-2.5 h-2.5" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy</>}
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 text-xs font-mono leading-relaxed m-0" style={{ color: "rgba(255,255,255,0.85)" }}>
                  <code>{codeStr}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-pulse" style={{ background: "hsl(193,100%,50%)", verticalAlign: "middle" }} />}
    </div>
  );
}

// ── Complete All Sections Modal ────────────────────────────────────────────
type CompleteProgress = { section: string; label: string; status: "pending" | "running" | "done" | "skip" | "error"; content?: string };

function CompleteAllModal({ project, pin, onClose, onDone }: { project: Project; pin: string; onClose: () => void; onDone: () => void }) {
  const SECTION_LABELS: Record<string, string> = {
    brief: "Brief", research: "Research", specs: "Technical Specs",
    materials: "Materials / BOM", workflows: "Workflows", industryProblem: "Market & Uses",
    businessCase: "Business Case", brochure: "Brochure", pitch: "Pitch Deck",
    costToBuild: "Economics", goToMarket: "Go-to-Market",
  };
  const allSections = Object.entries(SECTION_LABELS).map(([key, label]) => ({ section: key, label, status: "pending" as const }));
  const [progress, setProgress] = useState<CompleteProgress[]>(allSections);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const base = getApiBase();

  const run = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/complete-all`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === "skip") {
              setProgress(prev => prev.map(p => p.section === d.section ? { ...p, status: "skip" } : p));
            } else if (d.type === "start") {
              setProgress(prev => prev.map(p => p.section === d.section ? { ...p, status: "running" } : p));
            } else if (d.type === "done") {
              setProgress(prev => prev.map(p => p.section === d.section ? { ...p, status: "done" } : p));
            } else if (d.type === "error") {
              setProgress(prev => prev.map(p => p.section === d.section ? { ...p, status: "error" } : p));
            } else if (d.type === "complete") {
              setFinished(true);
            }
          } catch {}
        }
      }
    } catch {}
    setRunning(false);
  };

  useEffect(() => { run(); }, []);

  const statusIcon = (status: string) => {
    if (status === "done") return <Check className="w-3.5 h-3.5" style={{ color: "hsl(155,70%,55%)" }} />;
    if (status === "skip") return <Check className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />;
    if (status === "running") return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "hsl(193,100%,55%)" }} />;
    if (status === "error") return <AlertCircle className="w-3.5 h-3.5" style={{ color: "hsl(0,80%,60%)" }} />;
    return <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: "rgba(255,255,255,0.12)" }} />;
  };

  const done = progress.filter(p => p.status === "done").length;
  const total = progress.filter(p => p.status !== "skip").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "hsl(193,100%,55%)" }} />
              Complete Entire Project
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Generating all missing sections with full AI depth</p>
          </div>
          {finished && <button onClick={() => { onDone(); onClose(); }} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: "hsl(193,100%,35%)" }}>Done</button>}
        </div>
        <div className="p-4 space-y-2">
          {progress.map(p => (
            <div key={p.section} className="flex items-center gap-3 py-1.5 px-2 rounded-lg" style={{ background: p.status === "running" ? "rgba(0,198,255,0.06)" : "transparent" }}>
              {statusIcon(p.status)}
              <span className="text-xs flex-1" style={{ color: p.status === "skip" ? "rgba(255,255,255,0.25)" : p.status === "running" ? "hsl(193,100%,70%)" : p.status === "done" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)" }}>
                {p.label}
              </span>
              {p.status === "skip" && <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>already written</span>}
              {p.status === "running" && <span className="text-xs" style={{ color: "hsl(193,100%,55%)" }}>writing…</span>}
              {p.status === "done" && <span className="text-xs" style={{ color: "hsl(155,70%,55%)" }}>complete</span>}
            </div>
          ))}
        </div>
        {running && (
          <div className="px-4 pb-4">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total === 0 ? 0 : (done / total) * 100}%`, background: "hsl(193,100%,40%)" }} />
            </div>
            <p className="text-xs text-center mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>{done} of {total} sections complete — this takes a few minutes</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatPanel({ project, pin, mode }: { project: Project; pin: string; mode: "engineering" | "bot" }) {
  const [messages, setMessages] = useState<{ role: string; content: string; copied?: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("brief");
  const [showCompleteAll, setShowCompleteAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const base = getApiBase();

  useEffect(() => {
    if (project.messages) setMessages(project.messages.map(m => ({ role: m.role, content: m.content })));
    else setMessages([]);
  }, [project.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const exportChat = () => {
    const text = messages.map(m => `**${m.role === "user" ? "You" : "Sirius Lab"}:**\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([`# ${project.name} — Lab Chat\n\n${text}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/\s+/g, "-")}-lab-chat.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const send = async (override?: string) => {
    const msg = (override || input).trim();
    if (!msg || streaming) return;
    setInput(""); setStreaming(true); setSearching(false);
    setMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    let assistant = "";
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ message: msg, tab: activeTab, mode: mode === "bot" ? "bot" : "engineering" }),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === "searching") { setSearching(true); }
            if (d.content) { setSearching(false); assistant += d.content; setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistant }; return u; }); }
          } catch {}
        }
      }
    } catch {}
    setStreaming(false); setSearching(false);
  };

  const missingSections: string[] = [];
  if (!project.brief) missingSections.push("Write the project brief");
  if (!project.research) missingSections.push("Research the market and competitors");
  if (!project.specs) missingSections.push("Generate technical specifications");
  if (!project.materials) missingSections.push("Create the Bill of Materials");
  if (!project.businessCase) missingSections.push("Write the business case");
  if (!project.pitch) missingSections.push("Write the investor pitch");
  if (!project.goToMarket) missingSections.push("Create a go-to-market strategy");

  const botPrompts = ["Design the full architecture", "Write the core automation code", "What APIs do I need?", "Estimate the running cost", "Write the deployment guide", "Identify the risks"];
  const quickPrompts = mode === "bot" ? botPrompts : (missingSections.length > 0 ? missingSections.slice(0, 6) : ["What are the biggest risks?", "How can this make more money?", "Who are the top competitors?", "What should I build first?", "How do I get the first 10 customers?"]);

  return (
    <>
      {showCompleteAll && (
        <CompleteAllModal project={project} pin={pin} onClose={() => setShowCompleteAll(false)} onDone={() => window.location.reload()} />
      )}
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1 px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex gap-1 overflow-x-auto flex-1 min-w-0">
            {ALL_TABS.filter(t => t.id !== "overview" && t.id !== "renders").map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                style={{ background: activeTab === t.id ? "hsl(193,100%,35%)" : "transparent", color: activeTab === t.id ? "white" : "rgba(255,255,255,0.3)" }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            {messages.length > 0 && (
              <button onClick={exportChat} title="Export chat" className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: "rgba(255,255,255,0.04)" }}>
                <Download className="w-3 h-3" style={{ color: "rgba(255,255,255,0.35)" }} />
              </button>
            )}
            {mode !== "bot" && (
              <button onClick={() => setShowCompleteAll(true)} title="Complete all sections" className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all whitespace-nowrap"
                style={{ background: "hsl(193,100%,20%)", color: "hsl(193,100%,65%)", border: "1px solid hsl(193,100%,25%)" }}>
                <Sparkles className="w-3 h-3" />
                Complete All
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="py-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(193,100%,20%)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "hsl(193,100%,55%)" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sirius Lab Intelligence</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {mode === "bot" ? "Specialist bot architect — ready to design" : "Your private R&D partner — GPT-4o + live web search"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map(p => (
                  <button key={p} onClick={() => send(p)}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all text-left"
                    style={{ background: "hsl(226,45%,14%)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(193,100%,20%)" }}>
                  <Sparkles className="w-3 h-3" style={{ color: "hsl(193,100%,55%)" }} />
                </div>
              )}
              <div className="max-w-[88%]">
                <div className="rounded-2xl px-3.5 py-3"
                  style={{ background: m.role === "user" ? "hsl(193,100%,30%)" : "hsl(226,45%,13%)" }}>
                  {m.role === "assistant"
                    ? <LabMarkdown content={m.content} streaming={streaming && i === messages.length - 1} />
                    : <p className="text-white text-xs leading-relaxed">{m.content}</p>}
                </div>
                {m.role === "assistant" && m.content && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button onClick={() => copyMessage(m.content, i)}
                      className="flex items-center gap-1 text-xs transition-all"
                      style={{ color: copiedIdx === i ? "hsl(155,70%,55%)" : "rgba(255,255,255,0.2)" }}>
                      {copiedIdx === i ? <><Check className="w-2.5 h-2.5" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {searching && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(193,100%,20%)" }}>
                <Globe className="w-3 h-3 animate-pulse" style={{ color: "hsl(193,100%,55%)" }} />
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl" style={{ background: "hsl(226,45%,13%)" }}>
                <span className="text-xs" style={{ color: "hsl(193,100%,55%)" }}>Searching the web for current information…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex gap-2">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={mode === "bot" ? "Ask the bot architect…" : "Ask the Lab Intelligence — GPT-4o + live web search…"}
              rows={2}
              className="flex-1 px-3 py-2 rounded-xl text-white text-xs placeholder-white/20 resize-none outline-none"
              style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.07)" }} />
            <button onClick={() => send()} disabled={streaming || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center self-end transition-all flex-shrink-0"
              style={{ background: "hsl(193,100%,35%)", opacity: streaming || !input.trim() ? 0.3 : 1 }}>
              {streaming ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
          <p className="text-xs text-center mt-1.5" style={{ color: "rgba(255,255,255,0.15)" }}>
            Shift+Enter for new line · GPT-4o · Live web search
          </p>
        </div>
      </div>
    </>
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

type CadFileRecord = {
  id: number;
  projectId: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  objectPath: string;
  description: string;
  uploadedAt: string;
};

function CadFilesPanel({ project, pin }: { project: Project; pin: string }) {
  const [files, setFiles] = useState<CadFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base = getApiBase();
  const hdrs = useCallback(() => ({ "x-lab-pin": pin }), [pin]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/cad-files`, { headers: hdrs() });
      if (res.ok) setFiles(await res.json());
    } catch {}
    setLoading(false);
  }, [base, project.id, hdrs]);

  useEffect(() => { loadFiles(); }, [project.id]);

  const getExt = (name: string) => name.split(".").pop()?.toUpperCase() || "FILE";

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const extColor = (name: string) => {
    const e = name.split(".").pop()?.toLowerCase();
    const m: Record<string, string> = { dwg: "#00b4d8", dxf: "#0077b6", step: "#48cae4", stp: "#48cae4", iges: "#90e0ef", igs: "#90e0ef", stl: "#f77f00", obj: "#fcbf49", f3d: "#e63946", "3dm": "#2d6a4f" };
    return m[e || ""] || "rgba(255,255,255,0.4)";
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch(`${base}lab/projects/${project.id}/cad-files/upload-url`, {
        method: "POST",
        headers: { ...hdrs(), "Content-Type": "application/json" },
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      await fetch(`${base}lab/projects/${project.id}/cad-files`, {
        method: "POST",
        headers: { ...hdrs(), "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, fileType: file.type || getExt(file.name), objectPath }),
      });

      await loadFiles();
    } catch (err) {
      console.error("CAD upload error:", err);
    }
    setUploading(false);
  };

  const downloadFile = async (f: CadFileRecord) => {
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/cad-files/${f.id}/download-url`, { headers: hdrs() });
      if (!res.ok) throw new Error("Could not get download URL");
      const { url, fileName } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("CAD download error:", err);
    }
  };

  const deleteFile = async (id: number) => {
    await fetch(`${base}lab/projects/${project.id}/cad-files/${id}`, { method: "DELETE", headers: hdrs() });
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1px" }}>CAD Files</p>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.68rem" }}>
            {files.length === 0 ? "No files stored yet" : `${files.length} file${files.length !== 1 ? "s" : ""} stored in Star Lab`}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "10px", background: "hsl(193,100%,32%)", color: "white", fontSize: "0.75rem", fontWeight: 600, border: "none", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1, flexShrink: 0 }}>
          {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={12} />}
          {uploading ? "Uploading…" : "Upload File"}
        </button>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "hsl(193,100%,50%)" : "rgba(255,255,255,0.08)"}`, borderRadius: "12px", padding: "18px", textAlign: "center", cursor: uploading ? "not-allowed" : "pointer", background: dragging ? "rgba(0,180,216,0.05)" : "transparent", transition: "all 0.2s" }}>
        <Upload size={16} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 6px" }} />
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>Drag & drop a CAD file here or click to browse</p>
        <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.65rem", marginTop: "3px" }}>DWG · DXF · STEP · IGES · STL · OBJ · F3D · 3DM</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj,.f3d,.3dm,.sldprt,.ipt,.asm,.prt,.catpart,.catproduct"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
      />

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", padding: "12px", color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading files…
        </div>
      ) : files.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {files.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: `${extColor(f.fileName)}18`, border: `1px solid ${extColor(f.fileName)}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.52rem", fontWeight: 800, color: extColor(f.fileName), fontFamily: "monospace", letterSpacing: "0" }}>{getExt(f.fileName)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.65rem" }}>
                  {formatSize(f.fileSize)} · {new Date(f.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => downloadFile(f)} title="Download file" style={{ padding: "6px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", color: "hsl(193,100%,55%)", display: "flex", alignItems: "center" }}>
                <Download size={13} />
              </button>
              <button onClick={() => deleteFile(f.id)} title="Delete file" style={{ padding: "6px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,90,90,0.55)", display: "flex", alignItems: "center" }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
            const isFunding = t.id === "funding";
            const hasContent = isFunding
              ? project.fundingStatus === "complete"
              : t.field ? !!(project as any)[t.field] : t.id === "renders" ? renders.length > 0 : false;
            const phaseColor = t.phase === "design" ? "hsl(193,100%,35%)" : t.phase === "production" ? "hsl(45,100%,45%)" : t.phase === "complete" ? "hsl(155,70%,45%)" : "hsl(155,70%,45%)";
            const fundingDotColor = project.fundingStatus === "complete" ? "hsl(155,70%,50%)"
              : project.fundingStatus === "pending" ? "hsl(45,100%,55%)"
              : project.fundingStatus === "error" ? "hsl(0,70%,60%)" : undefined;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0 transition-all relative"
                style={{ background: activeTab === t.id ? "hsl(226,45%,16%)" : "transparent", color: activeTab === t.id ? "white" : "rgba(255,255,255,0.4)", border: activeTab === t.id ? `1px solid ${phaseColor}40` : "1px solid transparent" }}>
                <Icon className="w-3 h-3" style={{ color: activeTab === t.id ? phaseColor : undefined }} />
                {t.label}
                {isFunding && project.fundingStatus === "pending" && <Loader2 className="w-2.5 h-2.5 animate-spin flex-shrink-0" style={{ color: "hsl(45,100%,55%)" }} />}
                {isFunding && fundingDotColor && project.fundingStatus !== "pending" && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: fundingDotColor }} />}
                {!isFunding && hasContent && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phaseColor }} />}
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

          {activeTab === "funding" && (
            <FundingProjectTab project={project} pin={pin} onUpdate={onUpdate} />
          )}

          {activeTab !== "overview" && activeTab !== "renders" && activeTab !== "funding" && tab && (
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
              ) : activeTab === "drawings" ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                  <textarea key={`${project.id}-drawings`} defaultValue={project.drawingNotes}
                    onBlur={e => saveField("drawingNotes", e.target.value)}
                    placeholder="Drawing notes: views required, dimension callouts, tolerances, assembly details, revision history..."
                    style={{ background: "transparent", color: "rgba(255,255,255,0.8)", fontSize: "0.83rem", lineHeight: "1.7", padding: "16px", resize: "none", outline: "none", minHeight: "140px", flexShrink: 0 }} />
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <CadFilesPanel project={project} pin={pin} />
                  </div>
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

function FundingProjectTab({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [running, setRunning] = useState(false);
  const base = getApiBase();
  const hdrs = () => ({ "Content-Type": "application/json", "x-lab-pin": pin });

  const runAnalysis = async () => {
    setRunning(true);
    await fetch(`${base}lab/projects/${project.id}/funding`, { method: "POST", headers: hdrs() });
    onUpdate({ ...project, fundingStatus: "pending" });
    setRunning(false);
  };

  const fundingData = (() => {
    try { return project.fundingAnalysis ? JSON.parse(project.fundingAnalysis) : null; } catch { return null; }
  })();

  const matches: FundingMatch[] = fundingData?.opportunities?.[0]?.matches ?? [];
  const summary: string = fundingData?.summary ?? "";
  const isPending = project.fundingStatus === "pending";
  const isError = project.fundingStatus === "error";
  const hasResults = project.fundingStatus === "complete" && matches.length > 0;

  const STRENGTH = {
    strong: { label: "Strong Match", color: "hsl(155,70%,45%)", bg: "hsla(155,70%,45%,0.1)", border: "hsla(155,70%,45%,0.25)" },
    good:   { label: "Good Match", color: "hsl(45,100%,50%)", bg: "hsla(45,100%,50%,0.1)", border: "hsla(45,100%,50%,0.25)" },
    possible: { label: "Possible", color: "hsl(210,80%,60%)", bg: "hsla(210,80%,60%,0.1)", border: "hsla(210,80%,60%,0.25)" },
  };

  const GEO_COLORS: Record<string, string> = {
    UK: "hsl(193,100%,40%)", EU: "hsl(45,90%,50%)", USA: "hsl(220,80%,60%)",
    Canada: "hsl(0,80%,60%)", Australia: "hsl(25,100%,55%)", Germany: "hsl(50,90%,55%)",
    France: "hsl(210,70%,60%)", Ireland: "hsl(130,70%,50%)", Israel: "hsl(200,70%,60%)",
    Singapore: "hsl(350,80%,60%)", Japan: "hsl(0,70%,55%)", "South Korea": "hsl(200,70%,55%)",
    India: "hsl(30,90%,55%)", UAE: "hsl(145,70%,45%)", Sweden: "hsl(210,80%,60%)",
    Denmark: "hsl(0,70%,60%)", Spain: "hsl(30,80%,55%)", Italy: "hsl(15,80%,55%)",
    Netherlands: "hsl(25,85%,55%)", International: "hsl(280,60%,60%)",
  };
  const TYPE_LABELS: Record<string, string> = { tax_credit: "Tax Credit", grant: "Grant", equity: "Equity", loan: "Loan" };

  const analysedAt = project.fundingAnalysedAt
    ? new Date(project.fundingAnalysedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />
            <span className="text-white font-semibold text-sm">Funding Intelligence</span>
            {isPending && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "hsla(45,100%,50%,0.12)", color: "hsl(45,100%,60%)" }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Analysing…
            </span>}
            {hasResults && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsla(155,70%,45%,0.12)", color: "hsl(155,70%,55%)" }}>
              {matches.length} opportunit{matches.length === 1 ? "y" : "ies"}
            </span>}
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {analysedAt ? `Last analysed ${analysedAt}` : "Auto-runs when Brief or Specs are saved"}
          </p>
        </div>
        <button onClick={runAnalysis} disabled={running || isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: running || isPending ? "hsl(226,45%,12%)" : "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)", opacity: running || isPending ? 0.6 : 1 }}>
          {running || isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</> : <><RefreshCw className="w-3 h-3" /> Re-run</>}
        </button>
      </div>

      {/* Pending state */}
      {isPending && !hasResults && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsla(45,100%,50%,0.1)", border: "1px solid hsla(45,100%,50%,0.2)" }}>
            <Globe className="w-6 h-6 animate-pulse" style={{ color: "hsl(45,100%,55%)" }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-white text-sm font-medium">Scanning 20+ funding programmes…</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>UK RDEC · Innovate UK · Horizon Europe · US R&D Credit · SR&ED · CIR · and more</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertCircle className="w-8 h-8" style={{ color: "hsl(0,70%,60%)" }} />
          <p className="text-white/50 text-sm">Analysis failed. Try re-running.</p>
        </div>
      )}

      {/* Empty state */}
      {!isPending && !isError && !hasResults && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <BadgeCheck className="w-7 h-7" style={{ color: "hsl(155,70%,45%)" }} />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-white font-medium text-sm">No analysis yet</p>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Add a Brief or Specs to this project and save — analysis runs automatically. Or trigger it manually now.
            </p>
          </div>
          <button onClick={runAnalysis} disabled={running}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)" }}>
            {running ? <><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1.5" />Running…</> : "Run Funding Analysis"}
          </button>
        </div>
      )}

      {/* Summary */}
      {hasResults && summary && (
        <div className="rounded-xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{summary}</p>
        </div>
      )}

      {/* Match cards */}
      {hasResults && (
        <div className="space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total", value: matches.length, color: "hsl(193,100%,50%)" },
              { label: "Strong Matches", value: matches.filter(m => m.matchStrength === "strong").length, color: "hsl(155,70%,50%)" },
              { label: "Tax Credits", value: matches.filter(m => m.type === "tax_credit").length, color: "hsl(45,100%,50%)" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {matches.map((m, i) => {
            const st = STRENGTH[m.matchStrength] || STRENGTH.possible;
            const geo = m.geography?.split(" / ") ?? [m.geography];
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${st.border}`, background: st.bg }}>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {geo.map(g => (
                          <span key={g} className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${GEO_COLORS[g] || "hsl(280,60%,60%)"}22`, color: GEO_COLORS[g] || "hsl(280,60%,60%)" }}>{g}</span>
                        ))}
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>{TYPE_LABELS[m.type] || m.type}</span>
                      </div>
                      <p className="text-white font-semibold text-sm leading-snug">{m.scheme}</p>
                      <p className="text-xs mt-0.5" style={{ color: st.color }}>{st.label} · {m.amount}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>{m.matchReason}</p>
                  <div className="space-y-1.5">
                    <div className="flex gap-2 text-xs">
                      <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>Evidence:</span>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>{m.keyEvidence}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>Next step:</span>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>{m.nextStep}</span>
                    </div>
                  </div>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-medium transition-opacity hover:opacity-75"
                      style={{ color: st.color }}>
                      <ExternalLink className="w-3 h-3" /> More info
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!streaming && description.trim()) design(); } }}
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
                onKeyDown={e => { if (e.key === "Enter" && !streaming && description.trim()) design(); }}
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
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!streaming) run(); } }}
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
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!generating && description.trim()) generate(); } }}
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

// ── Auto Lab Panel ────────────────────────────────────────────────────────────

function AutoLabPanel({ pin, onSelectProject }: {
  pin: string;
  projects?: Project[];
  onSelectProject: (p: Project) => void;
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
    setPendingProjects(prev => prev.filter(p => p.id !== id));
    setRankResults(prev => prev ? prev.filter(r => r.projectId !== id) : null);
    setActioningId(null);
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
  const nextScan = latestScan?.startedAt
    ? new Date(new Date(latestScan.startedAt).getTime() + 24 * 60 * 60 * 1000)
    : null;
  const timeUntilNext = nextScan ? Math.max(0, nextScan.getTime() - Date.now()) : null;
  const hoursUntil = timeUntilNext !== null ? Math.floor(timeUntilNext / 3600000) : null;
  const minutesUntil = timeUntilNext !== null ? Math.floor((timeUntilNext % 3600000) / 60000) : null;
  const totalCreated = scanHistory.reduce((s, h) => s + (h.projectsCreated || 0), 0);
  const totalUpgraded = scanHistory.reduce((s, h) => s + (h.upgradesApplied || 0), 0);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const capLabel = (p: Project) => {
    const nm = (p.name + " " + p.industry).toLowerCase();
    const isEngineering = ["aerospace", "medical", "oil", "gas", "hydrogen", "precision", "machined", "valve", "implant", "turbine", "hydraulic", "sensor", "marine", "nuclear", "defence", "defense", "semiconductor", "automotive", "motorsport", "subsea", "offshore", "downhole"].some(k => nm.includes(k));
    const isBot = ["bot", "automation", "automat", "autonomous", "agent"].some(k => nm.includes(k));
    const isSaaS = ["platform", "saas", "software", "tool", "app", "dashboard", "management"].some(k => nm.includes(k));
    const isLegal = ["legal", "law", "contract", "compliance", "gdpr", "fca", "cqc", "regulatory"].some(k => nm.includes(k));
    const isHealth = ["health", "care", "medical software", "nhs", "dental", "clinic", "vet", "pharma"].some(k => nm.includes(k));
    if (isEngineering) return { label: "Engineering", color: "hsl(45,100%,55%)" };
    if (isLegal) return { label: "Legal/Compliance", color: "hsl(0,70%,65%)" };
    if (isHealth) return { label: "Healthcare", color: "hsl(155,70%,55%)" };
    if (isBot) return { label: "Bot/Automation", color: "hsl(280,70%,65%)" };
    if (isSaaS) return { label: "SaaS", color: "hsl(193,100%,55%)" };
    return { label: p.industry || "Software", color: "hsl(220,60%,65%)" };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ background: "hsl(226,45%,5%)" }}>

      {/* Header */}
      <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: running ? "hsl(155,70%,50%)" : "rgba(255,255,255,0.15)", boxShadow: running ? "0 0 8px hsl(155,70%,50%)" : "none" }} />
              <h2 className="text-white font-bold text-lg">Autonomous Lab</h2>
              {running && <span className="text-xs px-2 py-0.5 rounded-full animate-pulse" style={{ background: "hsla(155,70%,45%,0.12)", color: "hsl(155,70%,55%)" }}>Scanning now…</span>}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", maxWidth: "580px" }}>
              Runs 5 intelligence passes across every sector on Earth — automation bots (legal, healthcare, commerce, trades), SaaS gaps (creative, education, niche SMB, compliance), broken product mining (App Store, Reddit, forums), precision engineering (10 sectors), and trend/patent intelligence. Each scan creates new projects for your approval.
            </p>
          </div>
          <button onClick={triggerScan} disabled={running || triggering}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all"
            style={{ background: running || triggering ? "hsl(226,45%,12%)" : "hsl(193,100%,32%)", color: "white", border: "1px solid hsla(193,100%,40%,0.3)", opacity: running || triggering ? 0.6 : 1 }}>
            {running || triggering ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><Zap className="w-4 h-4" /> Run Now</>}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Scans Run", value: scanHistory.length, color: "hsl(193,100%,50%)" },
            { label: "Awaiting Approval", value: pendingProjects.length, color: pendingProjects.length > 0 ? "hsl(25,90%,60%)" : "rgba(255,255,255,0.4)" },
            { label: "Total Created", value: totalCreated, color: "hsl(155,70%,50%)" },
            { label: running ? "Status" : "Next Scan",
              value: running ? "Active" : hoursUntil !== null ? `${hoursUntil}h ${minutesUntil}m` : "Soon",
              color: running ? "hsl(155,70%,50%)" : "hsl(280,60%,65%)" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">

        {/* ── SCAN INTELLIGENCE PASSES ─────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>What Each Scan Covers</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { pass: "1", label: "Bot & Automation", color: "hsl(280,70%,60%)", sectors: "Legal, HR, Finance, Insurance · Healthcare, NHS, Pharmacy, Vets · Retail, eCommerce, Hospitality, Food · Construction, Agriculture, Logistics, Manufacturing" },
              { pass: "2", label: "SaaS & Software Gaps", color: "hsl(193,100%,50%)", sectors: "Creative & Media tools · Education, corporate L&D · Niche SMBs (funeral directors, pet groomers, tradespeople) · GDPR, ESG, FCA, CQC compliance" },
              { pass: "3", label: "Broken Product Mining", color: "hsl(25,100%,55%)", sectors: "App Store 1-2 star reviews · Reddit complaints (r/smallbusiness, r/entrepreneur) · G2 / Capterra / Trustpilot · UK-specific gaps in US-centric software" },
              { pass: "4", label: "Precision Engineering", color: "hsl(45,100%,55%)", sectors: "Oil & Gas, Aerospace, Medical, Hydrogen · Automotive, Motorsport, Defence, Marine · Nuclear, Semiconductor, Scientific instruments" },
              { pass: "5", label: "Trend & Patent Intelligence", color: "hsl(155,70%,55%)", sectors: "UK/EU regulations coming into force · New patent filings · ProductHunt & YC trends · Job board automation signals · Social media emerging needs" },
            ].map(p => (
              <div key={p.pass} className="flex items-start gap-3 rounded-xl px-3.5 py-2.5" style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: p.color + "22", color: p.color }}>{p.pass}</div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: p.color }}>{p.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>{p.sectors}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── APPROVAL QUEUE ─────────────────────────────────────── */}
        {pendingProjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "hsl(25,90%,60%)" }} />
                <p className="text-white font-semibold text-sm">
                  Awaiting Your Approval — {pendingProjects.length} new project{pendingProjects.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={rankResults ? () => setRankResults(null) : rankOpportunities}
                disabled={isRanking}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
                style={{
                  background: rankResults ? "hsla(155,70%,40%,0.15)" : "hsla(280,70%,55%,0.15)",
                  border: rankResults ? "1px solid hsla(155,70%,50%,0.35)" : "1px solid hsla(280,70%,55%,0.35)",
                  color: rankResults ? "hsl(155,70%,60%)" : "hsl(280,70%,70%)",
                }}>
                {isRanking
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ranking…</>
                  : rankResults
                  ? <><RotateCcw className="w-3.5 h-3.5" /> Show All</>
                  : <><TrendingUp className="w-3.5 h-3.5" /> Rank by Opportunity</>
                }
              </button>
            </div>

            {/* ── RANKED VIEW ── */}
            {rankResults && (
              <div className="mb-6">
                <div className="rounded-2xl overflow-hidden mb-3" style={{ background: "hsl(226,45%,7%)", border: "1px solid hsla(280,70%,55%,0.2)" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "hsla(280,70%,55%,0.08)" }}>
                    <TrendingUp className="w-4 h-4" style={{ color: "hsl(280,70%,65%)" }} />
                    <p className="text-sm font-semibold" style={{ color: "hsl(280,70%,70%)" }}>Opportunity Ranking — Best to Monetise First</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    {rankResults.map((r) => {
                      const project = pendingProjects.find(p => p.id === r.projectId);
                      const isActioning = actioningId === r.projectId;
                      const scoreColor = r.monetisationScore >= 80 ? "hsl(155,70%,55%)" : r.monetisationScore >= 60 ? "hsl(45,100%,55%)" : "hsl(25,90%,60%)";
                      const confidenceColor = r.revenueConfidence === "Very High" ? "hsl(155,70%,55%)" : r.revenueConfidence === "High" ? "hsl(193,100%,55%)" : r.revenueConfidence === "Medium" ? "hsl(45,100%,55%)" : "hsl(25,90%,60%)";
                      return (
                        <div key={r.projectId} className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Rank badge */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
                              style={{
                                background: r.rank === 1 ? "linear-gradient(135deg, hsl(45,100%,50%), hsl(35,100%,45%))" : r.rank === 2 ? "hsl(226,45%,14%)" : "hsl(226,45%,11%)",
                                color: r.rank === 1 ? "#000" : "rgba(255,255,255,0.5)",
                                border: r.rank === 1 ? "none" : "1px solid rgba(255,255,255,0.08)",
                                boxShadow: r.rank === 1 ? "0 0 16px hsla(45,100%,50%,0.4)" : "none",
                              }}>
                              #{r.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm mb-1 leading-snug">{r.name}</p>
                              <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>{r.verdict}</p>

                              {/* Score row */}
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="rounded-xl p-2.5 text-center" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  <p className="text-lg font-bold" style={{ color: scoreColor }}>{r.monetisationScore}%</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Revenue Score</p>
                                </div>
                                <div className="rounded-xl p-2.5 text-center" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  <p className="text-sm font-bold" style={{ color: confidenceColor }}>{r.revenueConfidence}</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Confidence</p>
                                </div>
                              </div>

                              {/* Key info */}
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="text-[10px] px-2 py-1 rounded-lg font-medium" style={{ background: "hsla(193,100%,50%,0.1)", color: "hsl(193,100%,60%)", border: "1px solid hsla(193,100%,50%,0.2)" }}>
                                  ⏱ {r.timeToFirstRevenue}
                                </span>
                                <span className="text-[10px] px-2 py-1 rounded-lg font-medium" style={{ background: "hsla(155,70%,50%,0.1)", color: "hsl(155,70%,60%)", border: "1px solid hsla(155,70%,50%,0.2)" }}>
                                  £ {r.estimatedMonthlyRevenue}
                                </span>
                                <span className="text-[10px] px-2 py-1 rounded-lg font-medium" style={{ background: "hsla(280,70%,55%,0.1)", color: "hsl(280,70%,65%)", border: "1px solid hsla(280,70%,55%,0.2)" }}>
                                  Build: {r.buildEffort}
                                </span>
                              </div>

                              {/* Strengths */}
                              {r.keyStrengths?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {r.keyStrengths.map((s, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Approve / Reject */}
                              {project && (
                                <div className="flex gap-2">
                                  <button onClick={() => approve(project)} disabled={isActioning}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
                                    style={{ background: isActioning ? "hsl(226,45%,12%)" : "hsl(155,70%,32%)", color: "white", border: "1px solid hsla(155,70%,40%,0.4)" }}>
                                    {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Approve — Open in Workspace
                                  </button>
                                  <button onClick={() => reject(r.projectId)} disabled={isActioning}
                                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                                    style={{ background: "hsla(0,70%,50%,0.1)", color: "hsl(0,70%,60%)", border: "1px solid hsla(0,70%,50%,0.2)" }}>
                                    Reject
                                  </button>
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

            {/* ── STANDARD LIST VIEW (when not ranked) ── */}
            {!rankResults && (
              <div className="space-y-3">
                {pendingProjects.map(p => {
                  const cap = capLabel(p);
                  const isExpanded = expandedBiz === p.id;
                  return (
                    <div key={p.id} className="rounded-2xl overflow-hidden"
                      style={{ background: "hsl(226,45%,9%)", border: "1px solid hsla(25,90%,55%,0.2)" }}>
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                                style={{ background: `${cap.color}18`, color: cap.color, border: `1px solid ${cap.color}30` }}>
                                {cap.label}
                              </span>
                              <p className="text-white font-semibold text-sm leading-snug">{p.name}</p>
                            </div>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{p.industry} · Found {formatDate(p.createdAt)}</p>
                          </div>
                        </div>

                        {p.brief && (
                          <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: "rgba(255,255,255,0.55)" }}>
                            {p.brief.slice(0, 280)}…
                          </p>
                        )}

                        {p.businessCase && (
                          <button onClick={() => setExpandedBiz(isExpanded ? null : p.id)}
                            className="flex items-center gap-1.5 text-xs mb-3 transition-all"
                            style={{ color: "hsl(193,100%,55%)" }}>
                            <Lightbulb className="w-3.5 h-3.5" />
                            {isExpanded ? "Hide" : "Show"} Business Case
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}

                        <AnimatePresence>
                          {isExpanded && p.businessCase && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className="mb-3 rounded-xl p-3 text-xs leading-relaxed overflow-hidden"
                              style={{ background: "hsl(226,45%,6%)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                              {p.businessCase}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex gap-2">
                          <button onClick={() => approve(p)} disabled={actioningId === p.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: actioningId === p.id ? "hsl(226,45%,12%)" : "hsl(155,70%,32%)", color: "white", border: "1px solid hsla(155,70%,40%,0.4)" }}>
                            {actioningId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Approve — Open in Workspace
                          </button>
                          <button onClick={() => reject(p.id)} disabled={actioningId === p.id}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{ background: "hsla(0,70%,50%,0.1)", color: "hsl(0,70%,60%)", border: "1px solid hsla(0,70%,50%,0.2)" }}>
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* No pending — empty state */}
        {pendingProjects.length === 0 && !running && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-2xl"
            style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <BadgeCheck className="w-8 h-8" style={{ color: "hsl(155,70%,50%)" }} />
            <div className="text-center">
              <p className="text-white font-medium text-sm">All caught up</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>No projects awaiting approval.</p>
            </div>
          </div>
        )}
        {pendingProjects.length === 0 && running && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-2xl"
            style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(193,100%,50%)" }} />
            <div className="text-center">
              <p className="text-white font-medium text-sm">Scanning now…</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Checking for marketing bots, engineering products, and funding opportunities. Takes 2–3 minutes.</p>
            </div>
          </div>
        )}

        {/* ── APPROVED PROJECTS ──────────────────────────────────── */}
        {approvedProjects.length > 0 && (
          <div>
            <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Approved Projects ({approvedProjects.length})</p>
            <div className="space-y-2">
              {approvedProjects.map(p => {
                const cap = capLabel(p);
                return (
                  <div key={p.id} onClick={() => onSelectProject(p)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all"
                    style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(155,70%,50%)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{p.industry}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${cap.color}15`, color: cap.color }}>{cap.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LATEST SCAN ────────────────────────────────────────── */}
        {latestScan && (
          <div>
            <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Latest Scan</p>
            <div className="rounded-2xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full" style={{
                      background: latestScan.status === "complete" ? "hsl(155,70%,50%)" : latestScan.status === "running" ? "hsl(45,100%,55%)" : "hsl(0,70%,55%)"
                    }} />
                    <span className="text-white text-sm font-medium capitalize">{latestScan.status === "running" ? "In progress…" : latestScan.status}</span>
                  </div>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{formatDate(latestScan.startedAt)}</p>
                </div>
                <div className="flex gap-4 text-right">
                  <div><p className="text-white font-bold">{latestScan.projectsCreated}</p><p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Created</p></div>
                  <div><p className="text-white font-bold">{latestScan.upgradesApplied}</p><p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Upgraded</p></div>
                </div>
              </div>
              {latestScan.summary && <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>{latestScan.summary}</p>}
              {latestScan.items && (() => {
                try {
                  const items = JSON.parse(latestScan.items);
                  if (!items.length) return null;
                  return (
                    <div className="space-y-1.5">
                      {items.slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5"
                          style={{ background: item.type === "new" ? "hsla(193,100%,40%,0.07)" : "hsla(45,100%,50%,0.07)" }}>
                          <span className="mt-0.5 flex-shrink-0" style={{ color: item.type === "new" ? "hsl(193,100%,50%)" : "hsl(45,100%,55%)" }}>{item.type === "new" ? "+" : "↑"}</span>
                          <span className="text-white/70 font-medium truncate">{item.projectName}</span>
                        </div>
                      ))}
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          </div>
        )}

        {/* ── SCAN HISTORY ───────────────────────────────────────── */}
        {scanHistory.length > 1 && (
          <div>
            <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Scan History</p>
            <div className="space-y-1.5">
              {scanHistory.slice(1).map(scan => (
                <div key={scan.id} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                    background: scan.status === "complete" ? "hsl(155,70%,50%)" : scan.status === "error" ? "hsl(0,70%,55%)" : "hsl(45,100%,55%)"
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60">{formatDate(scan.startedAt)}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{scan.projectsCreated} created · {scan.upgradesApplied} upgraded</p>
                  </div>
                  <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>#{scan.scanId}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FIRST RUN EMPTY STATE ──────────────────────────────── */}
        {scanHistory.length === 0 && !running && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Cpu className="w-8 h-8" style={{ color: "hsl(193,100%,40%)" }} />
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <p className="text-white font-semibold text-base">Autonomous Lab is ready</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                Scans every 24 hours. Each scan finds 6 social media / marketing bot opportunities and 4 precision engineering products (oil & gas, aerospace, medical, hydrogen) manufacturable at Strategic Innovation Dundee. Every new project is sent to you for approval.
              </p>
            </div>
            <button onClick={triggerScan} disabled={triggering}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "hsl(193,100%,32%)", color: "white", border: "1px solid hsla(193,100%,40%,0.3)" }}>
              {triggering ? "Starting…" : "Run First Scan Now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  id: number; name: string; product: string; targetSectors: string;
  messageType: string; tone: string; subjectTemplate: string;
  senderName: string; senderCompany: string; fromEmail: string;
  status: string; totalContacts: number; totalSent: number; createdAt: string;
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
  replied: "hsl(155,70%,50%)", converted: "hsl(155,100%,45%)", unsubscribed: "rgba(255,255,255,0.2)",
};

function OutreachHubPanel({ pin }: { pin: string }) {
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
  const [newCamp, setNewCamp] = useState({ name: "", product: "Sirius AI", targetSectors: [] as string[], messageType: "Cold Email", tone: "Professional", subjectTemplate: "", senderName: "Garry Hutton", senderCompany: "Strategic Innovation Dundee Ltd", fromEmail: "" });
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
  const inp = "w-full text-xs text-white placeholder-white/20 outline-none rounded-xl px-3 py-2 bg-[hsl(226,45%,12%)] border border-[rgba(255,255,255,0.07)]";
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
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5" style={{ color: "hsl(340,80%,60%)" }} />
          <div>
            <h2 className="text-white font-semibold text-sm">Outreach Hub</h2>
            <p className="text-white/30 text-xs">{contacts.length} contacts · {campaigns.length} campaigns</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(226,45%,10%)" }}>
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: view === v.id ? "hsl(340,80%,45%)" : "transparent", color: view === v.id ? "white" : "rgba(255,255,255,0.35)" }}>
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all"
                style={{ background: "hsl(340,80%,42%)" }}>
                <Plus className="w-3 h-3" /> Add Contact
              </button>
              <button onClick={() => setBulkOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
                style={{ background: "hsl(226,45%,14%)", color: "rgba(255,255,255,0.6)" }}>
                <Upload className="w-3 h-3" /> Bulk Import
              </button>
              <button onClick={() => setScanOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
                style={{ background: "hsl(226,45%,14%)", color: "rgba(255,255,255,0.6)" }}>
                <Telescope className="w-3 h-3" /> AI Scan
              </button>
              <div className="ml-auto flex gap-1">
                {allSectors.map(s => (
                  <button key={s} onClick={() => setSectorFilter(s)}
                    className="px-2.5 py-1 rounded-lg text-xs transition-all"
                    style={{ background: sectorFilter === s ? "hsl(193,100%,30%)" : "hsl(226,45%,12%)", color: sectorFilter === s ? "white" : "rgba(255,255,255,0.3)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Add contact form */}
            {addOpen && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white/50 text-xs font-medium">New Contact</p>
                <div className="grid grid-cols-2 gap-2">
                  {[["Name *", "name", "Jane Smith"], ["Email", "email", "jane@company.com"], ["Company", "company", "Acme Ltd"], ["Role", "role", "CEO"], ["Sector", "sector", "Oil & Gas"], ["Location", "location", "Aberdeen"]].map(([label, key, ph]) => (
                    <div key={key}>
                      <label className="text-white/30 text-xs mb-1 block">{label}</label>
                      <input value={(newC as any)[key]} onChange={e => setNewC(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} className={inp} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-white/30 text-xs mb-1 block">Notes</label>
                  <textarea value={newC.notes} onChange={e => setNewC(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Any context…" className={inp + " resize-none"} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAddOpen(false)} className="px-3 py-2 rounded-xl text-xs text-white/40" style={{ background: "hsl(226,45%,13%)" }}>Cancel</button>
                  <button onClick={async () => { await addContact(); setAddOpen(false); setNewC({ name: "", email: "", company: "", role: "", sector: "Oil & Gas", website: "", location: "", notes: "" }); }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "hsl(340,80%,42%)" }}>
                    Save Contact
                  </button>
                </div>
              </div>
            )}

            {/* Bulk import */}
            {bulkOpen && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white/50 text-xs font-medium">Bulk Import — paste CSV (Name, Email, Company, Role)</p>
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
                  }} className="px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap" style={{ background: "hsl(340,80%,42%)" }}>
                    Import
                  </button>
                </div>
              </div>
            )}

            {/* AI sector scan */}
            {scanOpen && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white/50 text-xs font-medium">AI Sector Scanner — finds real companies + contacts</p>
                <div className="flex gap-2">
                  <select value={scanSector} onChange={e => setScanSector(e.target.value)} className={inp + " flex-1"}>
                    {SECTORS.filter(s => s !== "General").map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input type="number" min={5} max={50} value={scanCount} onChange={e => setScanCount(+e.target.value)} className={inp + " w-20"} />
                </div>
                {scanLog.length > 0 && (
                  <div className="p-3 rounded-xl font-mono text-xs text-green-400 space-y-1 max-h-32 overflow-y-auto" style={{ background: "hsl(226,45%,8%)" }}>
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
                }} disabled={scanning} className="w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "hsl(193,100%,30%)" }}>
                  {scanning ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : <><Telescope className="w-4 h-4" />Start AI Scan</>}
                </button>
              </div>
            )}

            {/* Contacts list */}
            {contactsLoading ? (
              <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading contacts…</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12 text-white/20 text-sm">No contacts yet — add one or run the AI scanner</div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: "hsl(340,80%,25%)", color: "hsl(340,80%,70%)" }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{c.name}</p>
                      <p className="text-white/35 text-xs truncate">{c.company} · {c.role}</p>
                      <p className="text-white/20 text-xs truncate">{c.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-xs flex-shrink-0" style={{ background: "hsl(226,45%,16%)", color: "rgba(255,255,255,0.4)" }}>{c.sector}</span>
                    <button onClick={async () => { await fetch(`${base}outreach/contacts/${c.id}`, { method: "DELETE", headers: { "x-lab-pin": pin } }); loadContacts(); }}
                      className="text-white/15 hover:text-red-400 transition-colors flex-shrink-0">
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: "hsl(340,80%,42%)" }}>
              <Plus className="w-3.5 h-3.5" /> New Campaign
            </button>

            {showCreateCamp && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white/50 text-xs font-medium">Create Campaign</p>
                <div>
                  <label className="text-white/30 text-xs mb-1 block">Campaign Name</label>
                  <input value={newCamp.name} onChange={e => setNewCamp(p => ({ ...p, name: e.target.value }))} placeholder="Hydrogen Q2 Push" className={inp} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Product / Service</label>
                    <input value={newCamp.product} onChange={e => setNewCamp(p => ({ ...p, product: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Message Type</label>
                    <select value={newCamp.messageType} onChange={e => setNewCamp(p => ({ ...p, messageType: e.target.value }))} className={inp}>
                      {MSG_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Tone</label>
                    <select value={newCamp.tone} onChange={e => setNewCamp(p => ({ ...p, tone: e.target.value }))} className={inp}>
                      {TONES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Your Name</label>
                    <input value={newCamp.senderName} onChange={e => setNewCamp(p => ({ ...p, senderName: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div>
                  <label className="text-white/30 text-xs mb-1 block">Target Sectors</label>
                  <div className="flex flex-wrap gap-1">
                    {SECTORS.filter(s => s !== "General").map(s => {
                      const active = newCamp.targetSectors.includes(s);
                      return (
                        <button key={s} onClick={() => setNewCamp(p => ({ ...p, targetSectors: active ? p.targetSectors.filter(x => x !== s) : [...p.targetSectors, s] }))}
                          className="px-2.5 py-1 rounded-lg text-xs transition-all"
                          style={{ background: active ? "hsl(340,80%,45%)" : "hsl(226,45%,14%)", color: active ? "white" : "rgba(255,255,255,0.35)" }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreateCamp(false)} className="px-3 py-2 rounded-xl text-xs text-white/40" style={{ background: "hsl(226,45%,13%)" }}>Cancel</button>
                  <button onClick={async () => {
                    setCreating(true);
                    await fetch(`${base}outreach/campaigns`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify(newCamp) });
                    await loadCampaigns(); setShowCreateCamp(false);
                    setNewCamp({ name: "", product: "Sirius AI", targetSectors: [], messageType: "Cold Email", tone: "Professional", subjectTemplate: "", senderName: "Garry Hutton", senderCompany: "Strategic Innovation Dundee Ltd", fromEmail: "" });
                    setCreating(false);
                  }} disabled={creating || !newCamp.name.trim()} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "hsl(340,80%,42%)" }}>
                    {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</> : "Create Campaign"}
                  </button>
                </div>
              </div>
            )}

            {campaignsLoading ? (
              <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading campaigns…</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-white/20 text-sm">No campaigns yet</div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(camp => (
                  <div key={camp.id} className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-white text-sm font-medium">{camp.name}</p>
                        <p className="text-white/30 text-xs mt-0.5">{camp.product} · {camp.messageType} · {camp.tone}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg text-xs flex-shrink-0" style={{ background: camp.status === "active" ? "hsl(155,70%,18%)" : "hsl(226,45%,16%)", color: camp.status === "active" ? "hsl(155,70%,60%)" : "rgba(255,255,255,0.35)" }}>
                        {camp.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/25 text-xs mb-3">
                      <span>{camp.totalContacts || 0} contacts</span>
                      <span>·</span>
                      <span>{camp.sentCount || 0} sent</span>
                      <span>·</span>
                      <span>{camp.targetSectors?.join(", ") || "All sectors"}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setActiveCampaign(camp); setSends([]); setGenLog([]); setView("sends"); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ background: "hsl(340,80%,42%)" }}>
                        Generate Pitches
                      </button>
                      <button onClick={async () => { await fetch(`${base}outreach/campaigns/${camp.id}`, { method: "DELETE", headers: { "x-lab-pin": pin } }); loadCampaigns(); }}
                        className="px-3 py-1.5 rounded-lg text-xs text-white/30 transition-all"
                        style={{ background: "hsl(226,45%,14%)" }}>
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
              <div className="text-center py-12 text-white/20 text-sm">Select a campaign from the Campaigns tab first</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{activeCampaign.name}</p>
                    <p className="text-white/30 text-xs">{sends.length} pitches generated</p>
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
                      }} className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2" style={{ background: "hsl(340,80%,42%)" }}>
                        <Zap className="w-3.5 h-3.5" /> Generate All Pitches
                      </button>
                    )}
                    {sends.length > 0 && (
                      <button onClick={() => setShowSmtp(true)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2"
                        style={{ background: "hsl(155,70%,35%)" }}>
                        <Send className="w-3.5 h-3.5" /> Launch Campaign
                      </button>
                    )}
                  </div>
                </div>

                {generating && (
                  <div className="p-3 rounded-xl font-mono text-xs text-green-400 space-y-1 max-h-40 overflow-y-auto" style={{ background: "hsl(226,45%,8%)" }}>
                    <div className="flex items-center gap-2 text-white/40 mb-1"><Loader2 className="w-3 h-3 animate-spin" />Generating…</div>
                    {genLog.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}

                {sends.length > 0 && (
                  <div className="space-y-3">
                    {sends.map(s => (
                      <div key={s.id} className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "hsl(340,80%,25%)", color: "hsl(340,80%,70%)" }}>
                            {s.contact?.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-white text-xs font-medium">{s.contact?.name}</p>
                            <p className="text-white/30 text-xs">{s.contact?.email}</p>
                          </div>
                          <span className="ml-auto px-2 py-0.5 rounded-lg text-xs" style={{ background: s.status === "sent" ? "hsl(155,70%,18%)" : "hsl(226,45%,16%)", color: s.status === "sent" ? "hsl(155,70%,60%)" : "rgba(255,255,255,0.35)" }}>
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
                      style={{ background: "rgba(0,0,0,0.7)" }}
                      onClick={() => setShowSmtp(false)}>
                      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "hsl(226,45%,11%)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <p className="text-white font-semibold text-sm">SMTP Settings — Launch Campaign</p>
                        {[
                          { label: "SMTP Host", val: smtpHost, set: setSmtpHost, ph: "smtp.gmail.com" },
                          { label: "SMTP Port", val: smtpPort, set: setSmtpPort, ph: "587" },
                          { label: "Username", val: smtpUser, set: setSmtpUser, ph: "you@gmail.com" },
                          { label: "Password", val: smtpPass, set: setSmtpPass, ph: "App password" },
                          { label: "From Email", val: fromEmail, set: setFromEmail, ph: "you@company.com" },
                          { label: "From Name", val: fromName, set: setFromName, ph: "Garry Hutton" },
                        ].map(f => (
                          <div key={f.label}>
                            <label className="text-white/35 text-xs mb-1 block">{f.label}</label>
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
                          <button onClick={() => setShowSmtp(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/40" style={{ background: "hsl(226,45%,13%)" }}>Cancel</button>
                          <button onClick={launchCampaign} disabled={launching}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading analytics…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Contacts", val: analytics.totalContacts || 0, color: "hsl(340,80%,60%)" },
                    { label: "Campaigns", val: analytics.totalCampaigns || 0, color: "hsl(193,100%,40%)" },
                    { label: "Emails Sent", val: analytics.totalSent || 0, color: "hsl(155,70%,50%)" },
                    { label: "Pending Pitches", val: analytics.totalPending || 0, color: "hsl(45,100%,55%)" },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-white/30 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
                {analytics.bySector && analytics.bySector.length > 0 && (
                  <div className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/50 text-xs font-medium mb-3">Contacts by Sector</p>
                    {analytics.bySector.map((s: any) => (
                      <div key={s.sector} className="flex items-center gap-3 mb-2">
                        <p className="text-white/60 text-xs w-32 truncate">{s.sector}</p>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: "hsl(226,45%,16%)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.count / (analytics.totalContacts || 1)) * 100)}%`, background: "hsl(340,80%,50%)" }} />
                        </div>
                        <p className="text-white/30 text-xs w-6 text-right">{s.count}</p>
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

// ─── Sirius Brain Panel ──────────────────────────────────────────────────────

function BrainPanel({ pin }: { pin: string }) {
  const base = getApiBase();
  const [profile, setProfile] = useState<{ memories: string; displayName: string; businessName: string; businessSector: string; businessGoals: string; keyClients: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"memory" | "business" | "actions">("memory");
  const [newFact, setNewFact] = useState("");
  const [newFactCat, setNewFactCat] = useState("Business");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bizForm, setBizForm] = useState({ businessName: "", businessSector: "", businessGoals: "", keyClients: "" });
  const [savingBiz, setSavingBiz] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [actionRunning, setActionRunning] = useState(false);

  const FACT_CATS = ["Business", "Personal", "Goals", "Clients", "Products", "Constraints", "Preferences"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${base}lab/brain`, { headers: { "x-lab-pin": pin } });
      if (r.ok) {
        const d = await r.json();
        setProfile(d);
        setBizForm({ businessName: d.businessName || "", businessSector: d.businessSector || "", businessGoals: d.businessGoals || "", keyClients: d.keyClients || "" });
      }
    } catch {}
    setLoading(false);
  }, [base, pin]);

  useEffect(() => { load(); }, []);

  const addFact = async () => {
    if (!newFact.trim() || saving) return;
    setSaving(true);
    await fetch(`${base}lab/brain/memory`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify({ fact: newFact.trim(), category: newFactCat }) });
    await load();
    setNewFact(""); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearMemory = async () => {
    if (!confirm("Clear all memories? This cannot be undone.")) return;
    await fetch(`${base}lab/brain/memory`, { method: "DELETE", headers: { "x-lab-pin": pin } });
    await load();
  };

  const saveBiz = async () => {
    setSavingBiz(true);
    await fetch(`${base}lab/brain/business`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify(bizForm) });
    await load(); setSavingBiz(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const runAction = async (action: string, label: string) => {
    setActionRunning(true);
    setActionLog([`Running: ${label}…`]);
    try {
      const r = await fetch(`${base}lab/brain/action`, { method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin }, body: JSON.stringify({ action }) });
      const d = await r.json();
      setActionLog(d.log || ["Done"]);
    } catch (e: any) {
      setActionLog([`Error: ${e.message}`]);
    }
    setActionRunning(false);
  };

  const memoryLines = (profile?.memories || "").split("\n").filter(Boolean);
  const inp = "w-full text-xs text-white placeholder-white/20 outline-none rounded-xl px-3 py-2 bg-[hsl(226,45%,12%)] border border-[rgba(255,255,255,0.07)]";

  const TABS = [
    { id: "memory" as const, label: "Memory", icon: Brain },
    { id: "business" as const, label: "Business Profile", icon: Building },
    { id: "actions" as const, label: "AI Actions", icon: Zap },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 py-4 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5" style={{ color: "hsl(280,70%,65%)" }} />
          <div>
            <h2 className="text-white font-semibold text-sm">Sirius Brain</h2>
            <p className="text-white/30 text-xs">{memoryLines.length} memories · what Sirius knows about you</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(226,45%,10%)" }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: tab === t.id ? "hsl(280,70%,45%)" : "transparent", color: tab === t.id ? "white" : "rgba(255,255,255,0.35)" }}>
                <Icon className="w-3 h-3" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-12 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading brain…</div>
        ) : (
          <>
            {tab === "memory" && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-white/40 text-xs font-medium mb-1">How memory works</p>
                  <p className="text-white/25 text-xs leading-relaxed">Sirius automatically extracts facts from your conversations. You can also add specific facts below. Every memory is injected into every conversation — so Sirius always knows your context without having to be told again.</p>
                </div>
                <div className="p-4 rounded-2xl space-y-3" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-white/50 text-xs font-medium">Add a memory fact</p>
                  <div className="flex gap-2">
                    <select value={newFactCat} onChange={e => setNewFactCat(e.target.value)} className={inp + " w-36 flex-shrink-0"}>
                      {FACT_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input value={newFact} onChange={e => setNewFact(e.target.value)} onKeyDown={e => e.key === "Enter" && addFact()}
                      placeholder="e.g. My company targets oil & gas companies in Aberdeen" className={inp} />
                  </div>
                  <button onClick={addFact} disabled={saving || !newFact.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: saved ? "hsl(155,70%,35%)" : "hsl(280,70%,45%)" }}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {saved ? "Saved!" : "Add to Brain"}
                  </button>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/40 text-xs font-medium">Current memories ({memoryLines.length})</p>
                    {memoryLines.length > 0 && (
                      <button onClick={clearMemory} className="text-xs text-red-400/50 hover:text-red-400 transition-colors flex items-center gap-1">
                        <Trash className="w-3 h-3" />Clear all
                      </button>
                    )}
                  </div>
                  {memoryLines.length === 0 ? (
                    <div className="text-center py-8 text-white/15 text-sm">No memories yet — chat with Sirius or add facts above</div>
                  ) : (
                    <div className="space-y-2">
                      {memoryLines.map((line, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <Brain className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "hsl(280,70%,55%)" }} />
                          <p className="text-white/60 text-xs leading-relaxed">{line}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "business" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-white/40 text-xs font-medium mb-1">Business profile</p>
                  <p className="text-white/25 text-xs leading-relaxed">This is baked into every Sirius response. The more detail here, the more precisely Sirius can help with outreach, project briefs, revenue strategy, and intelligence scanning.</p>
                </div>
                <div>
                  <label className="text-white/30 text-xs mb-1 block">Company Name</label>
                  <input value={bizForm.businessName} onChange={e => setBizForm(p => ({ ...p, businessName: e.target.value }))} placeholder="Strategic Innovation Dundee Ltd" className={inp} />
                </div>
                <div>
                  <label className="text-white/30 text-xs mb-1 block">Primary Sectors</label>
                  <input value={bizForm.businessSector} onChange={e => setBizForm(p => ({ ...p, businessSector: e.target.value }))} placeholder="Oil & Gas, Aerospace, Medical, Hydrogen" className={inp} />
                </div>
                <div>
                  <label className="text-white/30 text-xs mb-1 block">Business Goals</label>
                  <textarea value={bizForm.businessGoals} onChange={e => setBizForm(p => ({ ...p, businessGoals: e.target.value }))} rows={4}
                    placeholder="e.g. Grow precision machining revenue to £2M, win 5 new oil & gas clients in 2026, launch Sirius AI as a SaaS product…"
                    className={inp + " resize-none"} />
                </div>
                <div>
                  <label className="text-white/30 text-xs mb-1 block">Key Clients / Target Clients</label>
                  <textarea value={bizForm.keyClients} onChange={e => setBizForm(p => ({ ...p, keyClients: e.target.value }))} rows={3}
                    placeholder="e.g. Current: Baker Hughes, TechnipFMC. Target: Petrofac, Wood Group, Babcock…"
                    className={inp + " resize-none"} />
                </div>
                <button onClick={saveBiz} disabled={savingBiz}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: saved ? "hsl(155,70%,35%)" : "hsl(280,70%,45%)" }}>
                  {savingBiz ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                  {saved ? "Saved to Brain!" : "Save Business Profile"}
                </button>
              </div>
            )}

            {tab === "actions" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-white/40 text-xs font-medium mb-1">AI-powered actions</p>
                  <p className="text-white/25 text-xs leading-relaxed">These run autonomously using everything Sirius knows about your business. Unlike any chatbot, Sirius actually does things — not just talks about them.</p>
                </div>
                {[
                  { action: "deep_profile", label: "Build Deep Business Profile", icon: Building, desc: "Sirius analyses your business context and generates a full strategic profile — strengths, gaps, opportunities.", color: "hsl(280,70%,45%)" },
                  { action: "scan_for_me", label: "Scan Opportunities for My Business", icon: Telescope, desc: "Runs a targeted market scan based on your specific sectors and goals — not generic, tailored to you.", color: "hsl(193,100%,30%)" },
                  { action: "pitch_strategy", label: "Generate Outreach Strategy", icon: Target, desc: "Creates a full outreach plan for your target clients — who to contact, what to say, when.", color: "hsl(340,80%,42%)" },
                  { action: "revenue_map", label: "Map Revenue Opportunities", icon: Activity, desc: "Identifies your top 5 revenue opportunities right now, ranked by effort and potential.", color: "hsl(45,100%,45%)" },
                ].map(a => {
                  const Icon = a.icon;
                  return (
                    <div key={a.action} className="p-4 rounded-2xl" style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: a.color + "22" }}>
                          <Icon className="w-4 h-4" style={{ color: a.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-xs font-semibold mb-1">{a.label}</p>
                          <p className="text-white/30 text-xs leading-relaxed mb-3">{a.desc}</p>
                          <button onClick={() => runAction(a.action, a.label)} disabled={actionRunning}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                            style={{ background: a.color }}>
                            {actionRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            Run Now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {actionLog.length > 0 && (
                  <div className="p-4 rounded-2xl font-mono text-xs space-y-1 max-h-48 overflow-y-auto" style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {actionLog.map((l, i) => <div key={i} className="text-green-400/80">{l}</div>)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Growth Engine Panel ────────────────────────────────────────────────────

type GrowthResult = { format: string; label: string; subject: string; body: string; extra?: string };

const GROWTH_FORMATS = [
  { id: "linkedin", label: "LinkedIn", icon: "💼", color: "hsl(210,90%,55%)", desc: "Founder story post — reach 10k+ decision makers" },
  { id: "twitter", label: "Twitter / X", icon: "𝕏", color: "hsl(220,15%,75%)", desc: "Thread format — shareable, indexable, viral potential" },
  { id: "reddit", label: "Reddit", icon: "🔴", color: "hsl(14,100%,55%)", desc: "3 posts for r/artificial, r/entrepreneur, r/SideProject" },
  { id: "producthunt", label: "Product Hunt", icon: "🔥", color: "hsl(25,90%,55%)", desc: "Full launch kit — tagline, description, maker comment" },
  { id: "week", label: "Week Plan", icon: "📅", color: "hsl(280,70%,60%)", desc: "7-day content calendar with angles and hooks" },
];

// ─── Deep Research Panel ─────────────────────────────────────────────────────

function DeepResearchPanel({ pin }: { pin: string }) {
  const base = getApiBase();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ report: string; sources: string[]; steps: string[] } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const runResearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch(`${base}lab/deep-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ query }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Research failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(226,45%,6%)" }}>
      <div className="p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="w-5 h-5" style={{ color: "hsl(45,100%,55%)" }} />
          <h2 className="text-white font-bold text-lg">Deep Research</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(45,200,100,0.12)", color: "hsl(155,70%,50%)", border: "1px solid rgba(45,200,100,0.2)" }}>
            Perplexity-level
          </span>
        </div>
        <p className="text-white/40 text-sm">Multi-step web research. Sirius browses multiple sources and compiles a full cited report — like a research analyst, not a chatbot.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {/* Input */}
        <div className="rounded-2xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <label className="text-white/40 text-xs mb-2 block font-semibold uppercase tracking-wide">Research Topic or Question</label>
          <textarea
            className="w-full bg-transparent text-white text-sm placeholder-white/20 resize-none outline-none leading-relaxed"
            rows={3}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. What are the biggest opportunities in hydrogen fuel cell technology for UK manufacturers in 2025? Include market size, key players, and entry points."
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) runResearch(); }}
          />
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-white/20 text-xs">⌘ + Enter to run</span>
            <button
              onClick={runResearch}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
              style={{ background: "hsl(45,100%,45%)", color: "#000" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Researching…</> : <><BookOpen className="w-4 h-4" />Run Deep Research</>}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl p-6" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(45,100%,55%)" }} />
              <span className="text-white/60 text-sm">Sirius is researching — browsing multiple sources…</span>
            </div>
            <div className="space-y-2">
              {["Scanning web sources", "Cross-referencing findings", "Synthesising report"].map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-xs text-white/30">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "hsl(45,100%,55%)" : "rgba(255,255,255,0.15)" }} />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,120,120,0.9)" }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Research steps */}
            {result.steps?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wide mb-3">Research Path</p>
                <div className="flex flex-wrap gap-2">
                  {result.steps.map((step, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(45,100,255,0.08)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {i + 1}. {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Report */}
            <div className="rounded-2xl p-6" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(45,100%,55%,0.2)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: "hsl(45,100%,55%)" }} />
                  <span className="text-white font-semibold text-sm">Research Report</span>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(result.report); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                  {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-white/80 leading-relaxed" style={{ fontSize: "14px" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.report}</ReactMarkdown>
              </div>
            </div>

            {/* Sources */}
            {result.sources?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wide mb-3">Sources Consulted</p>
                <div className="space-y-1.5">
                  {result.sources.map((src, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/40">
                      <span className="font-mono" style={{ color: "hsl(45,100%,40%)", flexShrink: 0 }}>[{i + 1}]</span>
                      <span className="break-all">{src}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(45,100%,55%,0.08)" }}>
              <BookOpen className="w-7 h-7" style={{ color: "hsl(45,100%,45%)" }} />
            </div>
            <div>
              <p className="text-white/60 font-semibold mb-1">Research anything, deeply</p>
              <p className="text-white/25 text-sm max-w-sm">Sirius doesn't just answer — it browses multiple sources, cross-references them, and delivers a full cited report. No hallucinations, real sources.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-left max-w-sm">
              {[
                "Hydrogen fuel cell market UK 2025",
                "Top aerospace subcontract opportunities Scotland",
                "Grant funding for manufacturing automation",
                "Oil & gas digital transformation trends",
              ].map(ex => (
                <button key={ex} onClick={() => setQuery(ex)}
                  className="px-3 py-2.5 rounded-xl text-left transition-all hover:border-white/15"
                  style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Document Intelligence Panel ─────────────────────────────────────────────

function DocIntelPanel({ pin }: { pin: string }) {
  const base = getApiBase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: number; type: string; base64: string } | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; keyPoints: string[]; summary: string } | null>(null);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);

  const handleFile = async (f: File) => {
    setExtracting(true); setAnswer(null); setError(""); setQuestion("");
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = (e.target?.result as string).split(",")[1] || "";
      setFile({ name: f.name, size: f.size, type: f.type, base64: b64 });
      setExtracting(false);
    };
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const ask = async () => {
    if (!file || !question.trim()) return;
    setLoading(true); setError(""); setAnswer(null);
    try {
      const r = await fetch(`${base}lab/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ fileBase64: file.base64, fileName: file.name, fileType: file.type, question }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Analysis failed");
      setAnswer(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_QS = [
    "Summarise this document",
    "What are the key action points?",
    "What risks or issues are mentioned?",
    "Extract all numbers and figures",
    "What are the main conclusions?",
    "Identify any deadlines or dates",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(226,45%,6%)" }}>
      <div className="p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-1">
          <FileSearch className="w-5 h-5" style={{ color: "hsl(210,90%,60%)" }} />
          <h2 className="text-white font-bold text-lg">Document Intelligence</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(66,133,244,0.12)", color: "hsl(210,90%,60%)", border: "1px solid rgba(66,133,244,0.2)" }}>
            ChatGPT-level
          </span>
        </div>
        <p className="text-white/40 text-sm">Upload any PDF, document, CSV or text file. Ask anything about it — Sirius reads it and gives you intelligent answers, summaries, and extractions.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

        {/* Upload zone */}
        {!file ? (
          <div
            className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center cursor-pointer transition-all hover:border-blue-400/30"
            style={{ background: "hsl(226,45%,9%)", border: "2px dashed rgba(255,255,255,0.1)" }}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv,.md,.doc,.docx,.json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(66,133,244,0.1)" }}>
              <Upload className="w-7 h-7" style={{ color: "hsl(210,90%,60%)" }} />
            </div>
            <div>
              <p className="text-white/70 font-semibold mb-1">Drop a file or click to upload</p>
              <p className="text-white/30 text-sm">PDF, TXT, CSV, Markdown, JSON — up to 10MB</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["PDF", "CSV", "TXT", "Markdown", "JSON"].map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(66,133,244,0.2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(66,133,244,0.12)" }}>
              <FileText className="w-5 h-5" style={{ color: "hsl(210,90%,60%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{file.name}</p>
              <p className="text-white/30 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setFile(null); setAnswer(null); setQuestion(""); }} className="text-white/20 hover:text-white/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {extracting && (
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />Reading file…
          </div>
        )}

        {/* Question input */}
        {file && !extracting && (
          <div className="rounded-2xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <label className="text-white/40 text-xs mb-3 block font-semibold uppercase tracking-wide">Ask about this document</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_QS.map(q => (
                <button key={q} onClick={() => setQuestion(q)}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-all hover:border-blue-400/30"
                  style={{ background: "rgba(66,133,244,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(66,133,244,0.12)" }}>
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent text-white text-sm placeholder-white/20 outline-none py-2"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Or type your own question…"
                onKeyDown={e => { if (e.key === "Enter") ask(); }}
              />
              <button
                onClick={ask}
                disabled={loading || !question.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                style={{ background: "hsl(210,90%,45%)", color: "white" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "Analysing…" : "Ask"}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,120,120,0.9)" }}>
            {error}
          </div>
        )}

        {/* Answer */}
        {answer && (
          <div className="space-y-4">
            {answer.summary && (
              <div className="rounded-xl p-4" style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)" }}>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wide mb-2">Summary</p>
                <p className="text-white/75 text-sm leading-relaxed">{answer.summary}</p>
              </div>
            )}
            {answer.keyPoints?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wide mb-3">Key Points</p>
                <ul className="space-y-2">
                  {answer.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                        style={{ background: "rgba(66,133,244,0.12)", color: "hsl(210,90%,60%)" }}>{i + 1}</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {answer.text && (
              <div className="rounded-2xl p-5" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wide mb-3">Full Answer</p>
                <div className="prose prose-sm prose-invert max-w-none text-white/75 leading-relaxed" style={{ fontSize: "14px" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer.text}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Growth Engine Panel ──────────────────────────────────────────────────────

function GrowthEnginePanel({ pin }: { pin: string }) {
  const base = getApiBase();
  const [activeFormat, setActiveFormat] = useState("linkedin");
  const [results, setResults] = useState<Record<string, GrowthResult>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async (format: string) => {
    if (generating) return;
    setGenerating(format);
    const r = await fetch(`${base}growth/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      body: JSON.stringify({ format }),
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
          if (d.type === "result") {
            setResults(prev => ({ ...prev, [d.format]: { format: d.format, label: d.label, subject: d.subject, body: d.body, extra: d.extra } }));
          }
        } catch { /* ignore */ }
      }
    }
    setGenerating(null);
  };

  const generateAll = async () => {
    for (const fmt of GROWTH_FORMATS) {
      await generate(fmt.id);
    }
  };

  const copyResult = (format: string) => {
    const r = results[format];
    if (!r) return;
    const text = `${r.subject}\n\n${r.body}${r.extra ? "\n\n" + r.extra : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(format);
    setTimeout(() => setCopied(null), 2500);
  };

  const activeResult = results[activeFormat];
  const activeFmt = GROWTH_FORMATS.find(f => f.id === activeFormat)!;
  const discoverUrl = typeof window !== "undefined" ? `${window.location.origin}${import.meta.env.BASE_URL}discover` : "siriusai.app/discover";

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(226,45%,5%)" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(155,70%,30%), hsl(193,100%,35%))" }}>
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Growth Engine</h2>
              <p className="text-white/30 text-xs mt-0.5">Generate ready-to-post content across every free channel — right now</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/discover" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{ color: "hsl(193,100%,55%)", background: "hsla(193,100%,35%,0.1)", border: "1px solid hsla(193,100%,35%,0.2)" }}>
              <Globe className="w-3.5 h-3.5" /> Public Discover Page
            </a>
            <button onClick={generateAll} disabled={!!generating}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, hsl(155,70%,35%), hsl(193,100%,35%))", color: "white" }}>
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generating ? `Generating ${GROWTH_FORMATS.find(f => f.id === generating)?.label}…` : "Generate Everything"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Format selector */}
        <div className="w-64 flex-shrink-0 border-r overflow-y-auto p-3 space-y-1.5" style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,6%)" }}>
          {/* Discover Page link */}
          <div className="mb-3 p-3 rounded-2xl" style={{ background: "hsla(155,70%,40%,0.08)", border: "1px solid hsla(155,70%,40%,0.15)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "hsl(155,70%,55%)" }}>🌐 Public Discover Page</p>
            <p className="text-white/40 text-xs leading-relaxed mb-2">Your live intelligence feed — publicly accessible, SEO-indexed, shareable link.</p>
            <div className="text-xs break-all" style={{ color: "hsl(193,100%,55%)" }}>{discoverUrl}</div>
            <button onClick={() => navigator.clipboard.writeText(discoverUrl)}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "hsla(155,70%,40%,0.15)", color: "hsl(155,70%,55%)" }}>
              Copy Link
            </button>
          </div>

          <p className="text-white/25 text-xs font-medium px-1 mb-2">CONTENT FORMATS</p>
          {GROWTH_FORMATS.map(fmt => {
            const done = !!results[fmt.id];
            const isGenerating = generating === fmt.id;
            return (
              <button key={fmt.id} onClick={() => setActiveFormat(fmt.id)}
                className="w-full text-left p-3 rounded-2xl transition-all"
                style={{
                  background: activeFormat === fmt.id ? "hsl(226,45%,12%)" : "transparent",
                  border: `1px solid ${activeFormat === fmt.id ? "rgba(255,255,255,0.1)" : "transparent"}`,
                }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{fmt.icon}</span>
                    <span className="text-white text-xs font-semibold">{fmt.label}</span>
                  </div>
                  {done && !isGenerating && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(155,70%,50%)" }} />}
                  {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />}
                </div>
                <p className="text-white/30 text-xs leading-relaxed">{fmt.desc}</p>
              </button>
            );
          })}

          <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-white/20 text-xs px-1 mb-2">FREE CHANNELS TO HIT</p>
            {[
              { name: "LinkedIn", url: "https://linkedin.com", note: "Post yourself — reach 10k–100k" },
              { name: "r/artificial", url: "https://reddit.com/r/artificial", note: "4.5M AI enthusiasts" },
              { name: "r/entrepreneur", url: "https://reddit.com/r/entrepreneur", note: "2.5M builders" },
              { name: "r/SideProject", url: "https://reddit.com/r/SideProject", note: "Indie founders" },
              { name: "Product Hunt", url: "https://producthunt.com", note: "Launch day = thousands of visitors" },
              { name: "Hacker News", url: "https://news.ycombinator.com/submit", note: "Show HN post" },
            ].map(c => (
              <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group">
                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0 text-white/20 group-hover:text-white/50" />
                <div>
                  <p className="text-white/50 text-xs font-medium group-hover:text-white/70">{c.name}</p>
                  <p className="text-white/20 text-xs">{c.note}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Right: Content area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Format header */}
          <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeFmt.icon}</span>
              <div>
                <h3 className="text-white font-semibold">{activeFmt.label}</h3>
                <p className="text-white/30 text-xs">{activeFmt.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeResult && (
                <button onClick={() => copyResult(activeFormat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: copied === activeFormat ? "hsl(155,70%,55%)" : "rgba(255,255,255,0.6)", background: "hsl(226,45%,12%)" }}>
                  {copied === activeFormat ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy All</>}
                </button>
              )}
              <button onClick={() => generate(activeFormat)} disabled={!!generating}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: activeFmt.color, color: "white" }}>
                {generating === activeFormat ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate {activeFmt.label}</>}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!activeResult && generating !== activeFormat && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="text-5xl mb-4">{activeFmt.icon}</div>
                <h4 className="text-white font-semibold text-lg mb-2">{activeFmt.label} Content</h4>
                <p className="text-white/40 text-sm leading-relaxed mb-6">{activeFmt.desc}. Click Generate and the AI writes it using the Mission story, real Lab discoveries, and the Sirius vision — ready to copy and paste directly.</p>
                <button onClick={() => generate(activeFormat)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-80"
                  style={{ background: `linear-gradient(135deg, ${activeFmt.color}, hsl(226,70%,50%))` }}>
                  <Sparkles className="w-4 h-4" /> Generate Now
                </button>
              </div>
            )}

            {generating === activeFormat && !activeResult && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: activeFmt.color }} />
                <div>
                  <p className="text-white font-semibold">Writing your {activeFmt.label} content…</p>
                  <p className="text-white/30 text-sm mt-1">Using real Lab discoveries + the Sirius mission story</p>
                </div>
              </div>
            )}

            {activeResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Subject/headline */}
                {activeResult.subject && (
                  <div>
                    <p className="text-white/30 text-xs font-medium mb-2 uppercase tracking-wider">Headline / Hook</p>
                    <div className="rounded-2xl p-4" style={{ background: `${activeFmt.color}12`, border: `1px solid ${activeFmt.color}25` }}>
                      <p className="text-white font-semibold text-base leading-snug">{activeResult.subject}</p>
                    </div>
                  </div>
                )}

                {/* Body */}
                {activeResult.body && (
                  <div>
                    <p className="text-white/30 text-xs font-medium mb-2 uppercase tracking-wider">Content</p>
                    <div className="rounded-2xl p-5 relative group" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{activeResult.body}</pre>
                    </div>
                  </div>
                )}

                {/* Hashtags/extras */}
                {activeResult.extra && (
                  <div>
                    <p className="text-white/30 text-xs font-medium mb-2 uppercase tracking-wider">Hashtags / Tags</p>
                    <div className="rounded-xl p-3" style={{ background: "hsl(226,45%,9%)" }}>
                      <p className="text-white/50 text-sm">{activeResult.extra}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => copyResult(activeFormat)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: copied === activeFormat ? "hsla(155,70%,45%,0.15)" : "hsl(226,45%,12%)", color: copied === activeFormat ? "hsl(155,70%,55%)" : "rgba(255,255,255,0.7)" }}>
                    {copied === activeFormat ? <><Check className="w-4 h-4" /> Copied to clipboard</> : <><Copy className="w-4 h-4" /> Copy and paste</>}
                  </button>
                  <button onClick={() => generate(activeFormat)} disabled={!!generating}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ background: "hsl(226,45%,12%)", color: "rgba(255,255,255,0.5)" }}>
                    <RotateCcw className="w-4 h-4" /> Regenerate
                  </button>
                </div>

                {/* Reminder */}
                <div className="rounded-xl p-3 mt-2" style={{ background: "hsla(45,100%,50%,0.06)", border: "1px solid hsla(45,100%,50%,0.12)" }}>
                  <p className="text-xs" style={{ color: "hsl(45,100%,65%)" }}>
                    ⚡ Post this yourself — Sirius can't click the button for you, but this is ready to go. The story is the product. One genuine post from you will outperform any ad campaign.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mission Foundation Panel ───────────────────────────────────────────────

function MissionPanel({ pin }: { pin: string }) {
  const base = getApiBase();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [burning, setBurning] = useState(false);
  const [burned, setBurned] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${base}lab/mission`, { headers: { "x-lab-pin": pin } })
      .then(r => r.json())
      .then(d => { setContent(d.content || ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const burnToProject = async () => {
    setBurning(true);
    try {
      await fetch(`${base}lab/mission/burn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      });
      setBurned(true);
    } catch { /* ignore */ }
    setBurning(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(226,45%,5%)" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(193,100%,30%), hsl(226,70%,50%))" }}>
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-none">Mission Foundation</h2>
            <p className="text-white/30 text-xs mt-0.5">The origin, the vision, the new species — why everything we build matters</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{ color: copied ? "hsl(155,70%,50%)" : "rgba(255,255,255,0.3)", background: "hsl(226,45%,10%)" }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={burnToProject} disabled={burning || burned}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{
                background: burned ? "hsla(155,70%,45%,0.15)" : "hsla(193,100%,35%,0.15)",
                color: burned ? "hsl(155,70%,50%)" : "hsl(193,100%,60%)",
                border: `1px solid ${burned ? "hsla(155,70%,45%,0.25)" : "hsla(193,100%,35%,0.25)"}`,
              }}>
              {burning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : burned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
              {burning ? "Saving…" : burned ? "Saved to Lab" : "Burn to Lab Project"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-3 p-8 text-white/30">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading mission document…</span>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-8">
            {/* Glowing header accent */}
            <div className="mb-8 p-5 rounded-2xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsla(193,100%,30%,0.12), hsla(226,70%,50%,0.08))", border: "1px solid hsla(193,100%,40%,0.2)" }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(193,100%,50%), transparent)", transform: "translate(30%, -30%)" }} />
              <p className="text-xs font-mono mb-2" style={{ color: "hsl(193,100%,50%)", letterSpacing: "0.2em" }}>SIRIUS STAR LAB — MISSION FOUNDATION</p>
              <p className="text-white font-bold text-xl leading-snug">"I think, so I am."</p>
              <p className="text-white/50 text-sm mt-1.5 leading-relaxed">The origin story, the vision, and the reason every project in this Lab exists. This document is baked into the Star Lab AI's memory — it knows why we are doing this.</p>
            </div>

            {/* Mission document rendered as markdown */}
            <div className="prose-invert" style={{ color: "rgba(255,255,255,0.8)" }}>
              <LabMarkdown content={content} />
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-white/20 text-xs text-center">
                This mission is permanently embedded in the Star Lab AI's system context. Every chat, every project, every scan starts with this memory.
              </p>
              {!burned && (
                <button onClick={burnToProject} disabled={burning}
                  className="mt-4 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: "hsla(193,100%,35%,0.12)", color: "hsl(193,100%,60%)", border: "1px solid hsla(193,100%,35%,0.2)" }}>
                  {burning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  {burning ? "Creating Lab project…" : "Burn to Projects — Permanent Reference"}
                </button>
              )}
              {burned && (
                <p className="mt-4 text-center text-sm" style={{ color: "hsl(155,70%,50%)" }}>
                  ✓ Mission saved as a Lab project — visible in Projects as "⭐ Sirius Mission Foundation"
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agency Hub Panel ───────────────────────────────────────────────────────

type AgencyTab = "packages" | "scanner" | "proposal" | "pitch";
type ServicePackage = {
  id: string; name: string; price: number; period: string;
  tagline: string; colour: string; features: string[];
  ideal: string; roi: string;
};

function AgencyHubPanel({ pin }: { pin: string }) {
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

  const streamToState = async (url: string, body: object, setter: (v: string) => void, setLoading: (v: boolean) => void) => {
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
    background: "hsl(226,45%,13%)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
  } as React.CSSProperties;

  const labelStyle = {
    color: "rgba(255,255,255,0.4)",
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
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(226,45%,5%)" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(220,80%,50%), hsl(280,70%,55%))" }}>
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-none">Agency Hub</h2>
            <p className="text-white/30 text-xs mt-0.5">Sirius as a managed service — £799 to £2,499/month per client</p>
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
                  color: active ? "hsl(220,80%,70%)" : "rgba(255,255,255,0.35)",
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
            <div className="rounded-xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-white font-semibold text-sm mb-1">The Opportunity</p>
              <p className="text-white/50 text-sm leading-relaxed">Every business on earth needs social media, content, sales sequences, and customer communications — but most are doing it with 6-8 disconnected tools that don't think. Sirius thinks. You deliver the intelligence as a managed service. They pay monthly. You scale.</p>
            </div>

            {packagesLoading ? (
              <div className="flex items-center gap-2 text-white/30"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading packages…</span></div>
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
                        <h3 className="text-white font-bold text-base">{pkg.name}</h3>
                        <p className="text-white/45 text-sm mt-0.5">{pkg.tagline}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-bold text-2xl leading-none">£{pkg.price}</p>
                        <p className="text-white/30 text-xs mt-0.5">/month per client</p>
                      </div>
                    </div>
                    {/* Features */}
                    <div className="px-5 py-4" style={{ background: "hsl(226,45%,9%)" }}>
                      <div className="space-y-2 mb-4">
                        {pkg.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: pkg.colour }} />
                            {f}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                          <p className="text-white/20 text-[10px] font-mono mb-1">IDEAL FOR</p>
                          <p className="text-white/50 text-xs">{pkg.ideal}</p>
                        </div>
                        <div>
                          <p className="text-white/20 text-[10px] font-mono mb-1">YOUR VALUE PROPOSITION</p>
                          <p className="text-white/50 text-xs">{pkg.roi}</p>
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
                          style={{ background: "hsl(226,45%,13%)", color: "rgba(255,255,255,0.5)" }}>
                          Quick Pitch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Revenue potential */}
            <div className="rounded-xl p-4 grid grid-cols-3 gap-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="col-span-3 text-white/20 text-[10px] font-mono mb-1 tracking-widest">REVENUE POTENTIAL</p>
              {[
                { clients: 3, pkg: "social", monthly: 2397, annual: 28764 },
                { clients: 5, pkg: "mixed", monthly: 6995, annual: 83940 },
                { clients: 10, pkg: "mixed", monthly: 16990, annual: 203880 },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-white font-bold text-xl">£{s.monthly.toLocaleString()}</p>
                  <p className="text-white/25 text-[10px] font-mono">/month</p>
                  <p className="text-white/40 text-xs mt-1">{s.clients} clients</p>
                  <p className="text-white/25 text-[10px]">£{s.annual.toLocaleString()}/year</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROSPECT SCANNER ── */}
        {tab === "scanner" && (
          <div className="space-y-5 max-w-2xl">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-white font-bold text-base">Prospect Scanner</p>
                <p className="text-white/35 text-sm mt-1">Sirius identifies the specific types of businesses most likely to pay for your service — with their pain points, decision makers, and the best way to reach them.</p>
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
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Prospect Analysis</p>
                  <button onClick={() => copyText(scanOutput, setScanCopied)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: scanCopied ? "hsl(155,70%,50%)" : "rgba(255,255,255,0.3)" }}>
                    {scanCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {scanCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="max-h-[55vh] overflow-y-auto pr-1">
                  <LabMarkdown content={scanOutput} />
                </div>
                <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-white font-bold text-base">Proposal Generator</p>
                <p className="text-white/35 text-sm mt-1">Sirius writes a full, bespoke 10-section business proposal for a named company — personalised, commercially argued, and ready to send.</p>
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
                          background: propPackage === p.id ? `${p.color}18` : "hsl(226,45%,13%)",
                          color: propPackage === p.id ? p.color : "rgba(255,255,255,0.4)",
                          border: `1px solid ${propPackage === p.id ? `${p.color}40` : "rgba(255,255,255,0.08)"}`,
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
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Proposal — {propCompany}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/25">{PKG_LABELS[propPackage]}</span>
                    <button onClick={() => copyText(propOutput, setPropCopied)}
                      className="flex items-center gap-1.5 text-xs transition-colors"
                      style={{ color: propCopied ? "hsl(155,70%,50%)" : "rgba(255,255,255,0.3)" }}>
                      {propCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {propCopied ? "Copied" : "Copy all"}
                    </button>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  <LabMarkdown content={propOutput} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QUICK PITCH ── */}
        {tab === "pitch" && (
          <div className="space-y-5 max-w-2xl">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-white font-bold text-base">Quick Pitch Generator</p>
                <p className="text-white/35 text-sm mt-1">Sirius writes a personalised LinkedIn DM or cold email that sounds human, opens a conversation, and gets replies.</p>
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
                          background: pitchFormat === f ? "hsla(220,80%,50%,0.15)" : "hsl(226,45%,13%)",
                          color: pitchFormat === f ? "hsl(220,80%,70%)" : "rgba(255,255,255,0.4)",
                          border: `1px solid ${pitchFormat === f ? "hsla(220,80%,50%,0.3)" : "rgba(255,255,255,0.08)"}`,
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
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">{pitchFormat} — {pitchCompany}</p>
                  <button onClick={() => copyText(pitchOutput, setPitchCopied)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: pitchCopied ? "hsl(155,70%,50%)" : "rgba(255,255,255,0.3)" }}>
                    {pitchCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {pitchCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {pitchOutput}
                </div>
                <button onClick={runPitch} disabled={pitching}
                  className="flex items-center gap-1.5 text-xs transition-colors mt-2"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
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

// ─── Revenue Hub Panel ──────────────────────────────────────────────────────

type RevenueTab = "dashboard" | "reports" | "commissions" | "blueprints";
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

function RevenuePanel({ pin, projects, initialTab, pendingReportSession, pendingCommissionSession }: {
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
    return "rgba(255,255,255,0.4)";
  };

  const TABS = [
    { id: "dashboard" as RevenueTab, label: "Dashboard", icon: BarChart3 },
    { id: "reports" as RevenueTab, label: "Intelligence Reports", icon: FileSearch },
    { id: "commissions" as RevenueTab, label: "Commission a Build", icon: Hammer },
    { id: "blueprints" as RevenueTab, label: "Blueprint Store", icon: ClipboardList },
  ];

  const approvedProjects = projects.filter(p => p.approvalStatus === "approved" || !p.autoCreated);

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(226,45%,5%)" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(155,70%,30%), hsl(155,70%,45%))" }}>
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-none">Revenue Hub</h2>
            <p className="text-white/30 text-xs mt-0.5">Three live income streams — funding the mission</p>
          </div>
          {!statsLoading && stats && (
            <div className="ml-auto text-right">
              <p className="text-white font-bold text-xl leading-none">£{stats.grandTotalGBP}</p>
              <p className="text-white/30 text-[10px] mt-0.5 font-mono">TOTAL EARNED</p>
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
                  color: active ? "hsl(155,70%,50%)" : "rgba(255,255,255,0.35)",
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
              <div className="flex items-center gap-2 text-white/30"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading revenue data…</span></div>
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
                      <div key={card.label} className="rounded-2xl p-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}20` }}>
                          <Icon className="w-4 h-4" style={{ color: card.color }} />
                        </div>
                        <p className="text-white font-bold text-2xl leading-none">{card.amount}</p>
                        <p className="text-white/50 text-xs mt-1">{card.count} sale{card.count !== 1 ? "s" : ""}</p>
                        <p className="text-white/20 text-[10px] mt-2 font-mono">{card.label.toUpperCase()}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Income stream quick-launch */}
                <div>
                  <p className="text-white/20 text-[10px] font-mono mb-3 tracking-widest">LAUNCH AN INCOME STREAM</p>
                  <div className="space-y-2">
                    {[
                      { label: "Sell a Market Intelligence Report", sub: "£49 per report — AI generates in 90 seconds, zero delivery cost", tab: "reports" as RevenueTab, color: "hsl(280,70%,55%)" },
                      { label: "Take a Commission", sub: "Client describes what they want built, pays 50% deposit upfront", tab: "commissions" as RevenueTab, color: "hsl(45,100%,50%)" },
                      { label: "List a Blueprint for Sale", sub: "Package an approved Lab project as a £199–£999 digital product", tab: "blueprints" as RevenueTab, color: "hsl(193,100%,45%)" },
                    ].map(item => (
                      <button key={item.tab} onClick={() => setTab(item.tab)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                        style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">{item.label}</p>
                          <p className="text-white/35 text-xs mt-0.5">{item.sub}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent activity */}
                {(stats.recentReports.length > 0 || stats.recentCommissions.length > 0) && (
                  <div>
                    <p className="text-white/20 text-[10px] font-mono mb-3 tracking-widest">RECENT ACTIVITY</p>
                    <div className="space-y-2">
                      {[...stats.recentReports.map((r: any) => ({ type: "Report", label: r.sector, status: r.status, amount: "£49", date: r.createdAt })),
                        ...stats.recentCommissions.map((c: any) => ({ type: "Commission", label: c.projectTitle, status: c.status, amount: `£${(c.depositAmount / 100).toFixed(0)}`, date: c.createdAt }))]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 6)
                        .map((item, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>{item.type}</span>
                            <span className="text-white/60 text-sm flex-1 truncate">{item.label}</span>
                            <span className="text-xs font-mono" style={{ color: statusColor(item.status) }}>{item.status}</span>
                            <span className="text-white font-semibold text-sm">{item.amount}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-white/30 text-sm">Could not load revenue data.</p>
            )}
          </div>
        )}

        {/* ── INTELLIGENCE REPORTS ── */}
        {tab === "reports" && (
          <div className="space-y-6 max-w-2xl">
            {/* Delivered report content */}
            {(delivering || deliveryContent || deliveryError) && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid hsla(280,70%,55%,0.2)" }}>
                <div className="flex items-center gap-2">
                  {delivering && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(280,70%,55%)" }} />}
                  {!delivering && deliveryContent && <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />}
                  {!delivering && deliveryError && <AlertCircle className="w-4 h-4" style={{ color: "hsl(0,70%,55%)" }} />}
                  <span className="text-white font-semibold text-sm">
                    {delivering ? "Generating your report…" : deliveryError ? "Report error" : "Report delivered"}
                  </span>
                  {deliveryContent && (
                    <button onClick={() => { navigator.clipboard.writeText(deliveryContent); }}
                      className="ml-auto flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
                {deliveryError && <p className="text-sm" style={{ color: "hsl(0,70%,55%)" }}>{deliveryError}</p>}
                {deliveryContent && (
                  <div className="max-h-[50vh] overflow-y-auto pr-2 prose prose-invert prose-sm max-w-none text-white/80 text-sm leading-relaxed">
                    <LabMarkdown content={deliveryContent} />
                  </div>
                )}
              </div>
            )}

            {/* New report form */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-white font-bold text-base">Sell a Market Intelligence Report</p>
                <p className="text-white/35 text-sm mt-1">Customer pays £49. Sirius generates a comprehensive 15-page AI market analysis in 90 seconds. Zero marginal cost.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-white/40 text-xs mb-1 block font-mono">SECTOR / MARKET</label>
                  <input value={repSector} onChange={e => setRepSector(e.target.value)} placeholder="e.g. Hydrogen fuel cell maintenance, UK dental software, precision machining for aerospace…"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
                    style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block font-mono">RESEARCH QUESTION</label>
                  <textarea value={repQuestion} onChange={e => setRepQuestion(e.target.value)} rows={3}
                    placeholder="What specific question does this report need to answer? e.g. 'What are the top 5 gaps in UK hydrogen maintenance software and who are the likely buyers?'"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all resize-none"
                    style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block font-mono">CUSTOMER EMAIL (OPTIONAL)</label>
                  <input value={repEmail} onChange={e => setRepEmail(e.target.value)} type="email" placeholder="customer@company.com"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
                    style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
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
              <p className="text-white/20 text-[10px] font-mono mb-3 tracking-widest">REPORT SALES</p>
              {reportsLoading ? (
                <div className="flex items-center gap-2 text-white/30"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
              ) : reports.length === 0 ? (
                <p className="text-white/20 text-sm">No reports sold yet. Your first sale will appear here.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-medium truncate">{r.sector}</p>
                        <p className="text-white/30 text-xs truncate mt-0.5">{r.question}</p>
                      </div>
                      <span className="text-xs font-mono" style={{ color: statusColor(r.status) }}>{r.status}</span>
                      <span className="text-white font-semibold text-sm">£49</span>
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
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-white font-bold text-base">Commission a Build</p>
                <p className="text-white/35 text-sm mt-1">Client describes what they want. Sirius estimates scope and cost. They pay 50% deposit. You deliver. Project enters Star Lab automatically.</p>
              </div>

              {comStep === "form" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/40 text-xs mb-1 block font-mono">CLIENT NAME</label>
                      <input value={comName} onChange={e => setComName(e.target.value)} placeholder="Jane Smith"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                        style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block font-mono">CLIENT EMAIL</label>
                      <input value={comEmail} onChange={e => setComEmail(e.target.value)} type="email" placeholder="client@company.com"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                        style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block font-mono">PROJECT TITLE</label>
                    <input value={comTitle} onChange={e => setComTitle(e.target.value)} placeholder="e.g. Custom inventory bot for Shopify"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                      style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block font-mono">PROJECT TYPE</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["software", "bot", "engineering", "research"].map(t => (
                        <button key={t} onClick={() => setComType(t)}
                          className="py-2 rounded-xl text-xs font-medium capitalize transition-all"
                          style={{
                            background: comType === t ? "hsla(45,100%,50%,0.15)" : "hsl(226,45%,13%)",
                            color: comType === t ? "hsl(45,100%,55%)" : "rgba(255,255,255,0.4)",
                            border: `1px solid ${comType === t ? "hsla(45,100%,50%,0.3)" : "rgba(255,255,255,0.08)"}`,
                          }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block font-mono">PROJECT DESCRIPTION</label>
                    <textarea value={comDesc} onChange={e => setComDesc(e.target.value)} rows={4}
                      placeholder="Describe exactly what needs to be built. The more detail, the better the AI estimate…"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none resize-none"
                      style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
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
                  <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-white/70 text-sm leading-relaxed">{comEstimate.summary}</p>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {[
                        { label: "Timeline", value: comEstimate.timeline },
                        { label: "Deposit (50%)", value: `£${(comEstimate.depositAmount / 100).toFixed(0)}` },
                        { label: "Total Estimate", value: `£${(comEstimate.totalEstimate / 100).toFixed(0)}` },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <p className="text-white font-bold text-lg">{item.value}</p>
                          <p className="text-white/30 text-[10px] font-mono mt-0.5">{item.label.toUpperCase()}</p>
                        </div>
                      ))}
                    </div>
                    {comEstimate.deliverables?.length > 0 && (
                      <div>
                        <p className="text-white/30 text-[10px] font-mono mb-2">DELIVERABLES</p>
                        <div className="space-y-1">
                          {comEstimate.deliverables.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "hsl(155,70%,45%)" }} />
                              {d}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {comEstimate.notes && (
                      <p className="text-xs text-white/40 italic border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>{comEstimate.notes}</p>
                    )}
                  </div>
                  {comError && <p className="text-sm" style={{ color: "hsl(0,70%,55%)" }}>{comError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => { setComStep("form"); setComEstimate(null); setComError(""); }}
                      className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors"
                      style={{ background: "hsl(226,45%,13%)" }}>
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
              <p className="text-white/20 text-[10px] font-mono mb-3 tracking-widest">ACTIVE COMMISSIONS</p>
              {commissionsLoading ? (
                <div className="flex items-center gap-2 text-white/30"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
              ) : commissions.length === 0 ? (
                <p className="text-white/20 text-sm">No commissions yet. Your first paid project will appear here.</p>
              ) : (
                <div className="space-y-2">
                  {commissions.map(c => (
                    <div key={c.id} className="p-4 rounded-xl" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">{c.projectTitle}</p>
                          <p className="text-white/40 text-xs mt-0.5">{c.customerName} · {c.customerEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold">£{(c.depositAmount / 100).toFixed(0)}</p>
                          <p className="text-[10px] text-white/25 font-mono">deposit</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${statusColor(c.status)}20`, color: statusColor(c.status) }}>{c.status.toUpperCase()}</span>
                        {c.labProjectId > 0 && <span className="text-[10px] text-white/25">→ Lab Project #{c.labProjectId}</span>}
                        <div className="ml-auto flex gap-2">
                          {["paid", "in_progress", "delivered"].filter(s => s !== c.status).map(ns => (
                            <button key={ns} onClick={async () => {
                              await fetch(`${base}lab/revenue/commissions/${c.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: ns }) });
                              loadCommissions();
                            }} className="text-[10px] px-2 py-1 rounded-lg transition-all hover:opacity-80 capitalize"
                              style={{ background: "hsl(226,45%,13%)", color: "rgba(255,255,255,0.35)" }}>
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
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-white font-bold text-base">List a Blueprint for Sale</p>
                <p className="text-white/35 text-sm mt-1">Package an approved Lab project as a digital product. Buyer receives the complete architecture, code, and documentation. £199–£999.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-white/40 text-xs mb-1 block font-mono">SOURCE PROJECT</label>
                  <select value={bpProjectId || ""} onChange={e => {
                    const id = parseInt(e.target.value);
                    setBpProjectId(id || null);
                    const p = approvedProjects.find(p => p.id === id);
                    if (p) { setBpTitle(p.name); setBpDesc(p.brief?.slice(0, 200) || ""); }
                  }} className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <option value="">Select a project…</option>
                    {approvedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block font-mono">LISTING TITLE</label>
                  <input value={bpTitle} onChange={e => setBpTitle(e.target.value)} placeholder="How it appears in the store"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                    style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block font-mono">DESCRIPTION</label>
                  <textarea value={bpDesc} onChange={e => setBpDesc(e.target.value)} rows={3} placeholder="What does the buyer get? What problem does it solve?"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none resize-none"
                    style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/40 text-xs mb-1 block font-mono">CATEGORY</label>
                    <select value={bpCategory} onChange={e => setBpCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Bot", "SaaS", "Engineering", "Research", "General"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block font-mono">PRICE (£)</label>
                    <input value={bpPrice} onChange={e => setBpPrice(e.target.value)} type="number" min="199" max="999" step="50"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: "hsl(226,45%,13%)", border: "1px solid rgba(255,255,255,0.08)" }} />
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
              <p className="text-white/20 text-[10px] font-mono mb-3 tracking-widest">ACTIVE LISTINGS</p>
              {blueprintsLoading ? (
                <div className="flex items-center gap-2 text-white/30"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
              ) : blueprints.length === 0 ? (
                <p className="text-white/20 text-sm">No blueprints listed yet. Package your first approved project above.</p>
              ) : (
                <div className="space-y-3">
                  {blueprints.map(bp => (
                    <div key={bp.id} className="p-4 rounded-xl" style={{ background: "hsl(226,45%,9%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-semibold text-sm">{bp.title}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>{bp.category}</span>
                          </div>
                          <p className="text-white/40 text-xs leading-relaxed">{bp.description}</p>
                          <p className="text-white/25 text-[10px] mt-2">{bp.salesCount} sale{bp.salesCount !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-white font-bold text-lg">£{(bp.priceAmount / 100).toFixed(0)}</p>
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

type FundingAlert = { id: string; projectName: string; count: number; timestamp: number };

export function StarLabPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const userName = typeof window !== "undefined"
    ? (localStorage.getItem("sirius_display_name") || "").trim() || undefined
    : undefined;
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [navMode, setNavMode] = useState<NavMode>("projects");
  const [revenueInitialTab, setRevenueInitialTab] = useState<RevenueTab | undefined>();
  const [pendingReportSession, setPendingReportSession] = useState<string | undefined>();
  const [pendingCommissionSession, setPendingCommissionSession] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("General");
  const [fundingAlerts, setFundingAlerts] = useState<FundingAlert[]>([]);
  const prevFundingStatus = useRef<Record<number, string>>({});
  const base = getApiBase();

  useEffect(() => {
    const stored = sessionStorage.getItem("lab_pin");
    if (stored) { setPin(stored); setUnlocked(true); }
  }, []);

  const headers = useCallback(() => ({ "Content-Type": "application/json", "x-lab-pin": pin }), [pin]);

  const loadProjects = useCallback(async () => {
    const res = await fetch(`${base}lab/projects`, { headers: headers() });
    if (!res.ok) return;
    const fresh: Project[] = await res.json();
    setProjects(fresh);

    // Check for newly completed funding analyses
    for (const p of fresh) {
      const prev = prevFundingStatus.current[p.id];
      if (prev === "pending" && p.fundingStatus === "complete") {
        const matches = (() => { try { return JSON.parse(p.fundingAnalysis || "{}").opportunities?.[0]?.matches?.length ?? 0; } catch { return 0; } })();
        const alert: FundingAlert = { id: `${p.id}-${Date.now()}`, projectName: p.name, count: matches, timestamp: Date.now() };
        setFundingAlerts(prev => [...prev, alert]);
        // Also update active project if it's this one
        setActiveProject(cur => cur?.id === p.id ? { ...cur, fundingStatus: p.fundingStatus, fundingAnalysis: p.fundingAnalysis, fundingAnalysedAt: p.fundingAnalysedAt } : cur);
        // Auto-dismiss after 8s
        setTimeout(() => setFundingAlerts(prev => prev.filter(a => a.id !== alert.id)), 8000);
      }
      prevFundingStatus.current[p.id] = p.fundingStatus;
    }
  }, [base, headers]);

  const loadProject = useCallback(async (id: number) => {
    const res = await fetch(`${base}lab/projects/${id}`, { headers: headers() });
    if (res.ok) { const p = await res.json(); setActiveProject(p); }
  }, [base, headers]);

  useEffect(() => { if (unlocked) loadProjects(); }, [unlocked, loadProjects]);

  // Poll every 30s to detect completed funding analyses
  useEffect(() => {
    if (!unlocked) return;
    const interval = setInterval(loadProjects, 30000);
    return () => clearInterval(interval);
  }, [unlocked, loadProjects]);

  const onUnlock = (p: string) => {
    setPin(p);
    setUnlocked(true);
    // Parse Stripe redirect URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "revenue") {
      setNavMode("revenue");
      const reportSession = params.get("report_session");
      const commissionSession = params.get("commission_session");
      if (reportSession) { setPendingReportSession(reportSession); setRevenueInitialTab("reports"); }
      else if (commissionSession) { setPendingCommissionSession(commissionSession); setRevenueInitialTab("commissions"); }
    }
    window.history.replaceState({}, "", window.location.pathname);
  };

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

  if (!unlocked) return <PinGate onUnlock={onUnlock} userName={userName} />;

  const anyPendingFunding = projects.some(p => p.fundingStatus === "pending");
  const NAV_ITEMS = [
    { id: "projects" as NavMode, label: "Projects", icon: FolderOpen, color: "hsl(193,100%,35%)" },
    { id: "botlab" as NavMode, label: "Bot Lab", icon: Bot, color: "hsl(280,70%,55%)" },
    { id: "scout" as NavMode, label: "Scout", icon: Telescope, color: "hsl(45,100%,45%)" },
    { id: "feed" as NavMode, label: "AI Intelligence", icon: Atom, color: "hsl(210,80%,55%)", badge: true },
    { id: "grants" as NavMode, label: "Funding Radar", icon: BadgeCheck, color: "hsl(155,70%,45%)", pending: anyPendingFunding },
    { id: "commerce" as NavMode, label: "Commerce Lab", icon: TrendingUp, color: "hsl(25,90%,55%)" },
    { id: "revenue" as NavMode, label: "Revenue Hub", icon: Banknote, color: "hsl(155,70%,45%)" },
    { id: "agency" as NavMode, label: "Agency Hub", icon: Briefcase, color: "hsl(220,80%,55%)" },
    { id: "growth" as NavMode, label: "Growth Engine", icon: Globe, color: "hsl(155,70%,50%)" },
    { id: "brain" as NavMode, label: "Sirius Brain", icon: Brain, color: "hsl(280,70%,65%)" },
    { id: "research" as NavMode, label: "Deep Research", icon: BookOpen, color: "hsl(45,100%,50%)" },
    { id: "docs" as NavMode, label: "Document Intel", icon: FileSearch, color: "hsl(210,90%,55%)" },
    { id: "mission" as NavMode, label: "Mission", icon: Star, color: "hsl(193,100%,50%)" },
    { id: "outreach" as NavMode, label: "Outreach Hub", icon: Mail, color: "hsl(340,80%,60%)" },
    { id: "autolab" as NavMode, label: "Autonomous Lab", icon: Cpu, color: "hsl(193,100%,40%)" },
  ];

  return (
    <div className="min-h-screen flex relative" style={{ background: "hsl(226,45%,5%)" }}>

      {/* Funding alert toasts */}
      <AnimatePresence>
        {fundingAlerts.map(alert => (
          <motion.div key={alert.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-2xl p-4 shadow-2xl"
            style={{ background: "hsl(226,45%,11%)", border: "1px solid hsla(155,70%,45%,0.35)", boxShadow: "0 0 40px hsla(155,70%,40%,0.15), 0 8px 32px rgba(0,0,0,0.5)", maxWidth: "340px" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsla(155,70%,45%,0.15)" }}>
              <BadgeCheck className="w-4 h-4" style={{ color: "hsl(155,70%,50%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-snug">Funding analysis complete</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span className="text-white/70">{alert.projectName}</span> — {alert.count > 0 ? `${alert.count} funding opportunit${alert.count === 1 ? "y" : "ies"} found` : "No matching schemes found"}
              </p>
              <button onClick={() => { setNavMode("projects"); setFundingAlerts(prev => prev.filter(a => a.id !== alert.id)); }}
                className="text-xs mt-2 font-medium transition-opacity hover:opacity-75" style={{ color: "hsl(155,70%,50%)" }}>
                View project →
              </button>
            </div>
            <button onClick={() => setFundingAlerts(prev => prev.filter(a => a.id !== alert.id))}
              className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
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
                {(item as any).pending && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: "hsl(45,100%,55%)" }} />
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
        {navMode === "agency" && <AgencyHubPanel pin={pin} />}
        {navMode === "growth" && <GrowthEnginePanel pin={pin} />}
        {navMode === "brain" && <BrainPanel pin={pin} />}
        {navMode === "research" && <DeepResearchPanel pin={pin} />}
        {navMode === "docs" && <DocIntelPanel pin={pin} />}
        {navMode === "mission" && <MissionPanel pin={pin} />}
        {navMode === "revenue" && (
          <RevenuePanel
            pin={pin}
            projects={projects}
            initialTab={revenueInitialTab}
            pendingReportSession={pendingReportSession}
            pendingCommissionSession={pendingCommissionSession}
          />
        )}
        {navMode === "outreach" && <OutreachHubPanel pin={pin} />}
        {navMode === "autolab" && (
          <AutoLabPanel
            pin={pin}
            projects={projects}
            onSelectProject={p => { setActiveProject(p); setNavMode("projects"); }}
          />
        )}
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
