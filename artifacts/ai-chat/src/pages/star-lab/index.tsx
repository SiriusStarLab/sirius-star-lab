import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Star, Plus, Trash2, Send, Loader2, FileText, Code, Ruler,
  BookOpen, Telescope, ExternalLink, Sparkles, X, FolderOpen,
  Pencil, Check, Bot, Zap, TrendingUp, Package, Layers,
  ChevronDown, RotateCcw, Copy, Globe,
  Cpu, Wrench, ChevronRight, ChevronLeft, Rss, RefreshCw, Bookmark, BookmarkCheck,
  Heart, FlaskConical, Eye, EyeOff, Trash, Bell, BellOff, Filter,
  ChevronUp, BadgeCheck, Lightbulb, Atom, Upload, Download,
  Mail, UserPlus, Users, Settings2, AtSign, Building2, Briefcase, StickyNote, CheckCircle2, AlertCircle,
  Banknote, CreditCard, ShoppingBag, BarChart3, ArrowRight, FileSearch, Hammer, ClipboardList,
  Brain, MessageSquare, Activity, Target, Building, Mic, MicOff, ShieldAlert, Rocket,
  LayoutDashboard, ArrowLeft, Clock, Award, Layers3, Share, Keyboard, CornerDownLeft, Search,
  Archive, Paperclip, Image
} from "lucide-react";
import { useLocation } from "wouter";
import { getApiBase } from "@/lib/api-base";
import { type Project, type Message, type ScoutReport, type ScanHistoryEntry, type RankResult, type NavMode, type AccessRole } from './types';
import { AppBuilderPanel } from './AppBuilderPanel';
import { OutreachHubPanel } from './OutreachHubPanel';
import { AgencyHubPanel } from './AgencyHubPanel';
import { RevenuePanel, type RevenueTab } from './RevenuePanel';
import { AiArchContent } from "@/pages/ai-architecture";
import { AutoLabPanel } from './AutoLabPanel';
import { SystemAuditPanel } from './SystemAuditPanel';
import { NotificationBell } from './NotificationBell';
import { UpgradesPanel } from './UpgradesPanel';
import { TasksPanel } from './TasksPanel';
import { TeamPanel } from './TeamPanel';
import { OrchestratorPanel } from './OrchestratorPanel';
import { LabMarkdown } from "./LabMarkdown";

const NAV_LABELS: Record<NavMode, string> = {
  orchestrate: "Command Centre",
  dashboard:   "Dashboard",
  labchat:     "Chat with Sirius",
  sysaudit:    "System Audit",
  upgrades:    "Sirius Upgrades",
  tasks:       "Background Tasks",
  mission:     "Mission",
  appbuilder:  "App Builder",
  projects:    "Projects",
  botlab:      "Bot Lab",
  autolab:     "Autonomous Lab",
  "ai-arch":   "AI Architecture",
  scout:       "Scout",
  feed:        "AI Intelligence",
  research:    "Deep Research",
  docs:        "Document Intel",
  brain:       "Sirius Brain",
  revenue:     "Revenue Hub",
  commerce:    "Commerce Lab",
  grants:      "Funding Radar",
  agency:      "Agency Hub",
  growth:      "Growth Engine",
  outreach:    "Outreach Hub",
  team:        "Team Access",
};
import { speakText, parseSpokenPin, unlockAudio } from "./voice-utils";
import { LabFloatingChat } from "./LabFloatingChat";
import { SiriusLabChatPanel } from "./SiriusLabChatPanel";

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


const MAX_PIN_DIGITS = 8;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

/* ─── Cinematic greeting shown before the PIN pad ─────────────────────── */
function StarLabGreeting({ userName, onComplete }: { userName?: string; onComplete: () => void }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechDone, setSpeechDone] = useState(false);
  const [waveTick, setWaveTick] = useState(0);
  const [captionIdx, setCaptionIdx] = useState(-1);
  const hasSpoken = useRef(false);
  const completedRef = useRef(false);

  const greetingText = `Hi ${userName || "Garry"}, welcome back to Star Lab. Please enter your PIN to continue.`;

  const captions = [
    `Hi ${userName || "there"},`,
    "Welcome to Sirius Star Lab.",
    "You are entering a restricted area.",
    "Please key in your PIN number.",
  ];

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpeechDone(true);
    setCaptionIdx(captions.length - 1);
    setTimeout(onComplete, 400);
  };

  // Waveform ticker
  useEffect(() => {
    const id = setInterval(() => setWaveTick(t => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  // Auto-speak on mount
  useEffect(() => {
    if (hasSpoken.current) return;
    hasSpoken.current = true;
    const startSpeak = () => {
      setIsSpeaking(true);
      const delays = [0, 900, 2000, 3200];
      delays.forEach((d, i) => setTimeout(() => setCaptionIdx(i), d));
      speakText(greetingText, () => {
        setIsSpeaking(false);
        setSpeechDone(true);
        setTimeout(finish, 600);
      });
    };
    const t = setTimeout(startSpeak, 400);
    // Safari safety net — speechSynthesis.onend often never fires on Safari/iOS
    const safetyTimer = setTimeout(finish, 9000);
    return () => { clearTimeout(t); clearTimeout(safetyTimer); window.speechSynthesis?.cancel(); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "#F8FAFC" }}>
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

      <div className="flex flex-col items-center gap-8 relative z-10 px-8 text-center">
        {/* Twin avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
          style={{ width: 160, height: 160 }}
        >
          <div className="ai-ring-outer absolute inset-0 rounded-full"
            style={{ border: "1px dashed hsla(193,100%,52%,0.35)" }} />
          <div className="absolute inset-3 rounded-full"
            style={{ border: "1px solid hsla(193,100%,52%,0.2)" }} />
          <div className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsla(193,100%,52%,0.22) 0%, transparent 68%)", filter: "blur(12px)" }} />
          <div className="relative z-10 rounded-full overflow-hidden"
            style={{ width: 118, height: 118, border: "2px solid hsla(193,100%,52%,0.5)", boxShadow: "0 0 36px hsla(193,100%,52%,0.45), 0 0 90px hsla(193,100%,52%,0.18)" }}>
            <img src="/logo-v2.png" alt="Sirius Star Lab" className="w-full h-full object-cover"
              style={{ filter: "brightness(1.15) contrast(1.08) saturate(1.2)" }} />
          </div>
        </motion.div>

        {/* Captions */}
        <div className="space-y-1.5 min-h-[100px] flex flex-col items-center justify-center">
          {captions.map((line, i) => (
            <AnimatePresence key={i}>
              {captionIdx >= i && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className={i === 0 ? "font-sans" : "font-mono"}
                  style={{
                    fontSize: i === 0 ? "1.3rem" : "0.875rem",
                    fontWeight: i === 0 ? 700 : 400,
                    color: i === 0 ? "#0F172A" : i === 1 ? "hsl(193,100%,30%)" : i === 3 ? "rgba(15,23,42,0.4)" : "rgba(15,23,42,0.65)",
                    letterSpacing: i === 0 ? "-0.02em" : "0.12em",
                    textTransform: i === 0 ? "none" : "uppercase",
                  }}>
                  {line}
                </motion.p>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* Voice waveform */}
        <div className="flex items-center gap-0.5 h-8">
          {Array.from({ length: 18 }).map((_, i) => {
            const active = isSpeaking;
            const height = active
              ? 8 + Math.abs(Math.sin((waveTick * 0.35 + i * 0.7))) * 22
              : speechDone ? 3 : 3;
            return (
              <div key={i} className="rounded-full transition-all duration-75"
                style={{
                  width: 3,
                  height,
                  background: active
                    ? `hsla(193,100%,${45 + Math.round(Math.abs(Math.sin(waveTick * 0.2 + i * 0.5)) * 30)}%,${0.5 + Math.abs(Math.sin(i * 0.8)) * 0.5})`
                    : "rgba(15,23,42,0.1)",
                  boxShadow: active ? "0 0 4px hsla(193,100%,55%,0.4)" : "none",
                }} />
            );
          })}
        </div>
        <p className="font-mono text-xs" style={{ color: isSpeaking ? "hsl(193,100%,35%)" : "rgba(15,23,42,0.3)", letterSpacing: "0.2em", transition: "color 0.4s" }}>
          {isSpeaking ? "SIRIUS SPEAKING" : speechDone ? "ENTERING PIN…" : "INITIALISING"}
        </p>

        {/* Tap to skip */}
        <button
          onClick={finish}
          className="font-mono text-xs px-4 py-2 rounded-lg transition-all hover:opacity-100"
          style={{ color: "rgba(15,23,42,0.35)", letterSpacing: "0.15em", border: "1px solid rgba(15,23,42,0.1)", background: "transparent", marginTop: 4 }}>
          TAP TO CONTINUE
        </button>
      </div>
    </div>
  );
}


function PinGate({ onUnlock, userName }: { onUnlock: (pin: string, role: AccessRole) => void; userName?: string }) {
  const [phase, setPhase] = useState<"greeting" | "pin">("greeting");
  const [digits, setDigits] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "locked">("idle");
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [shake, setShake] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "processing">("idle");
  const [voiceHint, setVoiceHint] = useState("");
  const [waveTick, setWaveTick] = useState(0);
  const recognitionRef = useRef<any>(null);
  const voiceActiveRef = useRef(false);
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
      if (status === "locked" || status === "loading" || phase !== "pin") return;
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") deleteLast();
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [digits, status, phase]);

  // Wave tick for voice animation
  useEffect(() => {
    const id = setInterval(() => setWaveTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const mapWordsToDigits = (text: string): string => {
    const wordMap: Record<string, string> = {
      zero: "0", one: "1", two: "2", three: "3", four: "4",
      five: "5", six: "6", seven: "7", eight: "8", nine: "9",
      oh: "0", to: "2", for: "4", ate: "8",
    };
    return text.toLowerCase().split(/[\s\-]+/).map(w => wordMap[w] ?? w).join("");
  };

  const stopListening = () => {
    voiceActiveRef.current = false;
    setVoiceStatus("idle");
    setVoiceHint("");
    try { recognitionRef.current?.stop(); } catch {}
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || status === "locked" || status === "loading") return;
    stopListening();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    voiceActiveRef.current = true;
    setVoiceStatus("listening");
    setVoiceHint("Say your PIN digits clearly…");
    recognition.onresult = (e: any) => {
      setVoiceStatus("processing");
      const transcript = e.results[0][0].transcript.replace(/\s+/g, "");
      const mapped = mapWordsToDigits(transcript);
      const ds = mapped.split("").filter(c => /\d/.test(c)).slice(0, MAX_PIN_DIGITS);
      if (ds.length > 0) {
        setDigits(ds);
        setVoiceHint(`Heard: ${ds.join(" ")} — submitting…`);
        setTimeout(() => submitPin(ds), 500);
      } else {
        setVoiceHint("Didn't catch that — tap digits instead");
      }
      setTimeout(stopListening, 1500);
    };
    recognition.onerror = () => { setVoiceHint("Mic error — tap digits instead"); stopListening(); };
    recognition.onend = () => { if (voiceActiveRef.current) stopListening(); };
    recognition.start();
  };

  const press = (d: string) => {
    if (digits.length >= MAX_PIN_DIGITS || status === "loading" || status === "locked") return;
    unlockAudio(); // prime browser audio during real user gesture so audio.play() works later
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

  const submitPin = async (ds: string[]) => {
    if (ds.length === 0 || status === "loading" || status === "locked") return;
    const pin = ds.join("");
    setStatus("loading");

    const loadingGuard = setTimeout(() => { setStatus("idle"); setDigits([]); }, 8000);
    const clearGuard = () => clearTimeout(loadingGuard);

    try {
      const res = await fetch(`${base}lab/auth`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        clearGuard();
        const body = await res.json().catch(() => ({}));
        const role: AccessRole = body.role === "guest" ? "guest" : "owner";
        sessionStorage.setItem("lab_pin", pin);
        sessionStorage.setItem("lab_role", role);
        // Permanently link this device's chat sessions to the owner profile so Sirius remembers across sessions
        if (role === "owner") localStorage.setItem("sirius_user_id", "garry");
        speakText("Access granted. Welcome to Star Lab.", () => onUnlock(pin, role));
        setTimeout(() => onUnlock(pin, role), 3500);
      } else {
        clearGuard();
        const body = await res.json().catch(() => ({}));
        if (res.status === 403 && body.unlocksAt) {
          setStatus("locked");
          setLockoutEnd(new Date(body.unlocksAt).getTime());
          setAttempts(MAX_ATTEMPTS);
          speakText("Terminal locked. Too many failed attempts. Please wait.");
        } else {
          const newAttempts = body.attemptsLeft !== undefined ? MAX_ATTEMPTS - body.attemptsLeft : attempts + 1;
          setAttempts(newAttempts);
          if (newAttempts >= MAX_ATTEMPTS) {
            setStatus("locked");
            setLockoutEnd(Date.now() + LOCKOUT_SECONDS * 1000);
            speakText("Terminal locked. Too many failed attempts.");
          } else {
            setStatus("idle");
            triggerShake();
            setDigits([]);
            speakText(`Access denied. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? "s" : ""} remaining.`);
          }
        }
      }
    } catch {
      clearGuard();
      setStatus("idle");
      triggerShake();
      setDigits([]);
    }
  };

  const submit = async () => submitPin(digits);

  const KEYS = ["1","2","3","4","5","6","7","8","9","del","0","ok"];
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  // Show cinematic greeting before the PIN pad
  if (phase === "greeting") {
    return (
      <motion.div key="greeting" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
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
      style={{ background: "#F8FAFC" }}>

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
              style={{ background: "linear-gradient(135deg, #FFFFFF, #F8FAFC)", border: "1px solid rgba(0,200,180,0.15)", boxShadow: "0 0 60px hsla(193,100%,35%,0.15), inset 0 1px 0 rgba(15,23,42,0.06)" }}>
              <FlaskConical className="w-9 h-9" style={{ color: "hsl(193,100%,55%)" }} />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
              style={{ background: "hsl(193,100%,50%)", boxShadow: "0 0 8px hsl(193,100%,50%)" }} />
          </div>
          <div className="text-center">
            <p className="font-mono text-xs mb-1" style={{ color: "hsl(193,100%,40%)", letterSpacing: "0.25em" }}>CLASSIFIED ACCESS</p>
            <h1 className="text-slate-800 text-xl font-bold tracking-tight">Sirius Star Lab</h1>
            <p className="text-xs mt-1" style={{ color: "rgba(15,23,42,0.6)" }}>Private R&D Intelligence</p>
          </div>
        </div>

        {/* PIN dots */}
        <div className="w-full px-4">
          <div className="flex items-center justify-center gap-3 py-5 px-6 rounded-2xl"
            style={{ background: "#F5F7FF", border: `1px solid ${status === "error" ? "hsla(0,70%,50%,0.4)" : status === "locked" ? "hsla(0,70%,50%,0.3)" : "rgba(0,200,180,0.1)"}`, boxShadow: status === "error" ? "0 0 20px hsla(0,70%,50%,0.1)" : "inset 0 1px 0 rgba(15,23,42,0.04)" }}>
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
                      ? "rgba(15,23,42,0.13)"
                      : "rgba(15,23,42,0.07)",
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
                      ? "linear-gradient(135deg, hsl(193,100%,35%), hsl(193,100%,27%))"
                      : "#FFFFFF"
                    : isDel
                    ? "#FFFFFF"
                    : "#F1F5F9",
                  border: isOk
                    ? digits.length > 0 && !isDisabled
                      ? "1px solid hsl(193,100%,42%)"
                      : "1px solid rgba(15,23,42,0.06)"
                    : "1px solid rgba(15,23,42,0.06)",
                  boxShadow: isOk && digits.length > 0 && !isDisabled
                    ? "0 4px 20px hsla(193,100%,35%,0.35)"
                    : "inset 0 1px 0 rgba(15,23,42,0.04)",
                  opacity: isDisabled || (isOk && digits.length === 0) ? 0.3 : 1,
                  color: isOk && digits.length > 0 ? "#fff" : "rgba(15,23,42,0.8)",
                }}>
                {isOk
                  ? status === "loading"
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(193,100%,60%)" }} />
                    : <Check className="w-5 h-5" />
                  : isDel
                  ? <span className="text-lg font-light" style={{ color: "rgba(15,23,42,0.45)" }}>⌫</span>
                  : <span className="text-lg font-semibold" style={{ fontFamily: "monospace", letterSpacing: "-0.02em" }}>{key}</span>
                }
              </button>
            );
          })}
        </div>

        {/* Voice listening indicator */}
        {voiceStatus !== "idle" && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-0.5 h-6">
              {Array.from({ length: 12 }).map((_, i) => {
                const h = voiceStatus === "listening"
                  ? 4 + Math.abs(Math.sin(waveTick * 0.4 + i * 0.8)) * 16
                  : 4;
                return <div key={i} className="rounded-full transition-all duration-75"
                  style={{ width: 3, height: h, background: `hsla(193,100%,55%,${0.5 + Math.abs(Math.sin(i * 0.9)) * 0.5})`, boxShadow: "0 0 4px hsla(193,100%,55%,0.4)" }} />;
              })}
            </div>
            <p className="font-mono text-xs animate-pulse" style={{ color: "hsl(193,100%,35%)", letterSpacing: "0.18em" }}>
              {voiceStatus === "listening" ? "LISTENING…" : "PROCESSING…"}
            </p>
            {voiceHint && <p className="text-xs text-center" style={{ color: "rgba(15,23,42,0.55)", maxWidth: 220 }}>{voiceHint}</p>}
          </div>
        )}

        {/* Speak PIN button */}
        {voiceStatus === "idle" && status !== "locked" && (
          <button
            onClick={startListening}
            className="flex items-center gap-2 font-mono text-xs px-4 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(193,100%,27%))", color: "#fff", border: "1px solid hsl(193,100%,42%)", boxShadow: "0 4px 16px hsla(193,100%,35%,0.3)", letterSpacing: "0.12em" }}>
            <Mic className="w-3.5 h-3.5" />
            SPEAK YOUR PIN
          </button>
        )}

        <p className="font-mono text-xs" style={{ color: "rgba(15,23,42,0.45)", letterSpacing: "0.15em" }}>
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
  { id: "specs", label: "Specs", icon: Ruler, field: "specs", phase: "design", placeholder: "Technical specifications: dimensions, tolerances, performance requirements, standards...", generated: true },
  { id: "materials", label: "Materials", icon: Package, field: "materials", phase: "design", placeholder: "Materials list with specifications, suppliers, part numbers, costs...", generated: true },
  { id: "code", label: "Code", icon: Code, field: "code", phase: "design", placeholder: "Production-ready code...", generated: false },
  { id: "drawings", label: "Drawings", icon: Layers, field: "drawingNotes", phase: "design", placeholder: "CAD drawing instructions: views, dimensions, callouts, assembly details...", generated: true },
  { id: "workflows", label: "Workflows", icon: Zap, field: "workflows", phase: "production", placeholder: "Manufacturing and deployment workflow steps...", generated: true },
  { id: "market", label: "Market & Uses", icon: Globe, field: "industryProblem", phase: "production", placeholder: "Industry analysis, problem solved, use cases across sectors...", generated: true },
  { id: "businessCase", label: "Business Case", icon: BadgeCheck, field: "businessCase", phase: "production", placeholder: "Why build this, competitive displacement strategy, AI advantage, investment justification...", generated: true },
  { id: "renders", label: "Renders", icon: Cpu, field: null, phase: "complete", placeholder: "", generated: false },
  { id: "brochure", label: "Brochure", icon: FileText, field: "brochure", phase: "complete", placeholder: "Product brochure content...", generated: true },
  { id: "pitch", label: "Pitch", icon: TrendingUp, field: "pitch", phase: "complete", placeholder: "Investor/client pitch deck content...", generated: true },
  { id: "economics", label: "Economics", icon: Package, field: "costToBuild", phase: "complete", placeholder: "Cost to build, pricing, profit margin analysis...", generated: true },
  { id: "goToMarket", label: "Go-to-Market", icon: Globe, field: "goToMarket", phase: "complete", placeholder: "Launch strategy, channels, pricing, 90-day plan, KPIs...", generated: true },
  { id: "funding", label: "Funding", icon: BadgeCheck, field: "fundingAnalysis", phase: "all", placeholder: "", generated: false },
  { id: "sales-plan", label: "Sales Plan", icon: TrendingUp, field: null, phase: "all", placeholder: "", generated: false },
  { id: "ai-arch", label: "AI Architecture", icon: Layers, field: null, phase: "all", placeholder: "", generated: false },
  { id: "launch", label: "Launch", icon: Send, field: null, phase: "all", placeholder: "", generated: false },
  { id: "package", label: "Package", icon: Globe, field: null, phase: "all", placeholder: "", generated: false },
  { id: "files", label: "Files & Media", icon: Paperclip, field: null, phase: "all", placeholder: "", generated: false },
];


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
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/complete-all`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        signal: ctrl.signal,
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

  useEffect(() => { run(); return () => { abortRef.current?.abort(); }; }, []);

  const statusIcon = (status: string) => {
    if (status === "done") return <Check className="w-3.5 h-3.5" style={{ color: "hsl(155,70%,55%)" }} />;
    if (status === "skip") return <Check className="w-3.5 h-3.5" style={{ color: "rgba(15,23,42,0.5)" }} />;
    if (status === "running") return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "hsl(193,100%,55%)" }} />;
    if (status === "error") return <AlertCircle className="w-3.5 h-3.5" style={{ color: "hsl(0,80%,60%)" }} />;
    return <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: "rgba(15,23,42,0.13)" }} />;
  };

  const done = progress.filter(p => p.status === "done").length;
  const total = progress.filter(p => p.status !== "skip").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.09)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)" }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "hsl(193,100%,55%)" }} />
              Complete Entire Project
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.45)" }}>Generating all missing sections with full AI depth</p>
          </div>
          <div className="flex items-center gap-2">
            {finished && <button onClick={() => { onDone(); onClose(); }} className="text-xs px-3 py-1.5 rounded-lg text-slate-800" style={{ background: "hsl(193,100%,35%)" }}>Done</button>}
            <button onClick={() => { abortRef.current?.abort(); onClose(); }} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-slate-100" title="Cancel and close">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {progress.map(p => (
            <div key={p.section} className="flex items-center gap-3 py-1.5 px-2 rounded-lg" style={{ background: p.status === "running" ? "rgba(0,198,255,0.06)" : "transparent" }}>
              {statusIcon(p.status)}
              <span className="text-xs flex-1" style={{ color: p.status === "skip" ? "rgba(15,23,42,0.5)" : p.status === "running" ? "hsl(193,100%,70%)" : p.status === "done" ? "rgba(15,23,42,0.8)" : "rgba(15,23,42,0.5)" }}>
                {p.label}
              </span>
              {p.status === "skip" && <span className="text-xs" style={{ color: "rgba(15,23,42,0.45)" }}>already written</span>}
              {p.status === "running" && <span className="text-xs" style={{ color: "hsl(193,100%,55%)" }}>writing…</span>}
              {p.status === "done" && <span className="text-xs" style={{ color: "hsl(155,70%,55%)" }}>complete</span>}
            </div>
          ))}
        </div>
        {running && (
          <div className="px-4 pb-4">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(15,23,42,0.07)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total === 0 ? 0 : (done / total) * 100}%`, background: "hsl(193,100%,40%)" }} />
            </div>
            <p className="text-xs text-center mt-2" style={{ color: "rgba(15,23,42,0.6)" }}>{done} of {total} sections complete — this takes a few minutes</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatPanel({ project, pin, mode, onUpdate }: { project: Project; pin: string; mode: "engineering" | "bot"; onUpdate?: (p: Project) => void }) {
  const [messages, setMessages] = useState<{ role: string; content: string; attachedImageUrl?: string; copied?: boolean; savedFields?: string[] }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("brief");
  const [showCompleteAll, setShowCompleteAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<{ field: string; label: string } | null>(null);
  const [voicePhase, setVoicePhase] = useState<"idle" | "listening">("idle");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachedMime, setAttachedMime] = useState<string | null>(null);
  const voiceRecRef = useRef<any>(null);
  const projectRef = useRef(project);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base = getApiBase();

  const startVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec || voicePhase === "listening") return;
    const rec = new SpeechRec();
    voiceRecRef.current = rec;
    rec.lang = "en-GB"; rec.continuous = false; rec.interimResults = false;
    rec.onstart = () => setVoicePhase("listening");
    rec.onerror = () => { setVoicePhase("idle"); };
    rec.onend = () => setVoicePhase("idle");
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript?.trim() || "";
      if (text.length > 1) {
        setVoicePhase("idle");
        rec.stop();
        // Drop transcript into input box — user reviews and presses Send
        setInput(text);
      }
    };
    rec.start();
  };

  const stopVoice = () => {
    try { voiceRecRef.current?.stop(); } catch {}
    voiceRecRef.current = null;
    setVoicePhase("idle");
  };

  useEffect(() => { projectRef.current = project; }, [project]);

  useEffect(() => {
    setMessages([]);
    const API = getApiBase();
    fetch(`${API}lab/projects/${project.id}/messages`, { headers: { "x-lab-pin": pin } })
      .then(r => r.ok ? r.json() : [])
      .then((msgs: { role: string; content: string }[]) =>
        setMessages(msgs.map(m => ({ role: m.role, content: m.content }))))
      .catch(() => {});
  }, [project.id, pin]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setAttachedFile(ev.target?.result as string);
      setAttachedName(file.name);
      setAttachedMime(file.type || "application/octet-stream");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearAttachment = () => { setAttachedFile(null); setAttachedName(null); setAttachedMime(null); };

  const isImageMime = (mime: string | null) => !!(mime && mime.startsWith("image/"));

  const send = async (override?: string) => {
    const msg = (override || input).trim();
    if (!msg && !attachedFile || streaming) return;
    const imgForDisplay = attachedFile && isImageMime(attachedMime) ? attachedFile : undefined;
    const imgB64 = attachedFile && isImageMime(attachedMime) ? attachedFile : undefined;
    const docB64 = attachedFile && !isImageMime(attachedMime) ? attachedFile : undefined;
    const docName = attachedName && !isImageMime(attachedMime) ? attachedName : undefined;
    setInput(""); clearAttachment(); setStreaming(true); setSearching(false);
    setMessages(prev => [...prev, { role: "user", content: msg, attachedImageUrl: imgForDisplay }, { role: "assistant", content: "" }]);
    let assistant = "";
    const savedFieldLabels: string[] = [];
    try {
      const body: any = { message: msg, tab: activeTab, mode: mode === "bot" ? "bot" : "engineering" };
      if (imgB64) body.imageBase64 = imgB64;
      if (docB64) { body.documentBase64 = docB64; body.documentName = docName; }
      const res = await fetch(`${base}lab/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify(body),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      let buf = ""; let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === "searching") { setSearching(true); setSearchQuery(d.query || ""); }
            if (d.type === "search_done") { setSearching(false); setSearchQuery(""); }
            if (d.content) {
              setSearching(false); assistant += d.content;
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistant }; return u; });
            }
            if (d.type === "field_saved" && d.field && d.label) {
              savedFieldLabels.push(d.label);
              setLastSaved({ field: d.field, label: d.label });
              setTimeout(() => setLastSaved(null), 3000);
              // Update the parent project state so the tab shows updated content
              if (onUpdate && d.preview !== undefined) {
                onUpdate({ ...projectRef.current, [d.field]: d.preview + "…(saved)" });
              }
            }
            if (d.type === "render_queued") {
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistant + "\n\n🎨 Render queued — check the Renders tab in ~30 seconds." }; return u; });
            }
            if (d.type === "image" && d.url) {
              assistant += `\n\n![Generated image](${d.url})\n\n`;
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistant }; return u; });
            }
            if (d.done) { streamDone = true; }
          } catch {}
        }
      }
      reader.cancel().catch(() => {});
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
        <div className="flex items-center gap-1 px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
          <div className="flex gap-1 overflow-x-auto flex-1 min-w-0">
            {ALL_TABS.filter(t => t.id !== "overview" && t.id !== "renders").map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                style={{ background: activeTab === t.id ? "hsl(193,100%,35%)" : "transparent", color: activeTab === t.id ? "white" : "rgba(15,23,42,0.6)" }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            {messages.length > 0 && (
              <button onClick={exportChat} title="Export chat" className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: "rgba(15,23,42,0.05)" }}>
                <Download className="w-3 h-3" style={{ color: "rgba(15,23,42,0.4)" }} />
              </button>
            )}
            <a href={`${getApiBase()}lab/projects/${project.id}/export`}
              download
              title="Download project as HTML export pack"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all whitespace-nowrap"
              style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.5)", border: "1px solid rgba(15,23,42,0.08)", textDecoration: "none" }}>
              <Download className="w-3 h-3" /> Export
            </a>
            {mode !== "bot" && !project.brief && !project.specs && (
              <button
                onClick={() => send("Concept: " + project.name + " — " + (project.industry || "product") + ". Design this from scratch: research the market, write a full product brief, generate detailed technical specs with real materials for the application, create the bill of materials, manufacturing workflows, and business case. Start now.")}
                disabled={streaming}
                title="Full concept-to-product design flow"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all whitespace-nowrap"
                style={{ background: "hsl(280,70%,25%)", color: "hsl(280,70%,75%)", border: "1px solid hsl(280,70%,30%)" }}>
                <Sparkles className="w-3 h-3" />
                Design from Concept
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
                  <p className="text-xs font-semibold text-slate-800">Sirius Lab Intelligence</p>
                  <p className="text-xs" style={{ color: "rgba(15,23,42,0.4)" }}>
                    {mode === "bot" ? "Specialist bot architect — ready to design" : "Your private R&D partner — GPT-4o + live web search"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map(p => (
                  <button key={p} onClick={() => send(p)}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all text-left"
                    style={{ background: "#E8EEF5", color: "rgba(15,23,42,0.58)", border: "1px solid rgba(15,23,42,0.09)" }}>
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
                  style={{ background: m.role === "user" ? "hsl(193,100%,30%)" : "#EEF2F8" }}>
                  {m.role === "assistant"
                    ? (streaming && i === messages.length - 1 && !m.content)
                      ? (
                        <div className="flex items-center gap-1 py-0.5">
                          {[0, 1, 2].map(d => (
                            <span key={d} className="w-2 h-2 rounded-full"
                              style={{ background: "hsl(193,100%,45%)", display: "inline-block",
                                animation: "thinkBounce 1.1s ease-in-out infinite",
                                animationDelay: `${d * 0.18}s` }} />
                          ))}
                          <style>{`@keyframes thinkBounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }`}</style>
                        </div>
                      )
                      : <LabMarkdown content={m.content} streaming={streaming && i === messages.length - 1} />
                    : (
                      <div>
                        {m.attachedImageUrl && (
                          <img src={m.attachedImageUrl} alt="Attached" className="rounded-xl mb-2 max-w-full" style={{ maxHeight: "240px", objectFit: "contain" }} />
                        )}
                        {m.content && <p className="text-white text-xs leading-relaxed">{m.content}</p>}
                      </div>
                    )}
                </div>
                {m.role === "assistant" && m.content && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button onClick={() => copyMessage(m.content, i)}
                      className="flex items-center gap-1 text-xs transition-all"
                      style={{ color: copiedIdx === i ? "hsl(155,70%,55%)" : "rgba(15,23,42,0.45)" }}>
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
              <div className="flex flex-col px-3.5 py-2 rounded-2xl" style={{ background: "#EEF2F8" }}>
                <span className="text-xs font-semibold" style={{ color: "hsl(193,100%,45%)" }}>Searching the web…</span>
                {searchQuery && <span className="text-xs mt-0.5" style={{ color: "#6B7280" }}>"{searchQuery}"</span>}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {lastSaved && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-t text-xs" style={{ borderColor: "rgba(15,23,42,0.06)", background: "hsl(155,70%,97%)" }}>
            <Check className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(155,70%,45%)" }} />
            <span style={{ color: "hsl(155,60%,35%)" }}>Saved to <strong>{lastSaved.label}</strong></span>
          </div>
        )}
        <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
          {/* Attachment preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-xl" style={{ background: "rgba(0,198,255,0.08)", border: "1px solid rgba(0,198,255,0.2)" }}>
              {isImageMime(attachedMime) ? (
                <img src={attachedFile} alt="preview" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,198,255,0.15)" }}>
                  <Paperclip className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,40%)" }} />
                </div>
              )}
              <span className="text-xs font-medium flex-1 truncate" style={{ color: "hsl(193,100%,35%)" }}>{attachedName}</span>
              <button onClick={clearAttachment} className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(15,23,42,0.08)" }}>
                <X className="w-3 h-3" style={{ color: "rgba(15,23,42,0.5)" }} />
              </button>
            </div>
          )}
          <div className="flex gap-2 mb-2">
            {/* Voice button */}
            <button
              onClick={voicePhase === "listening" ? stopVoice : startVoice}
              disabled={streaming}
              title={voicePhase === "listening" ? "Stop listening" : "Speak to Sirius"}
              className="w-9 h-9 rounded-xl flex items-center justify-center self-end transition-all flex-shrink-0"
              style={{
                background: voicePhase === "listening" ? "hsl(0,80%,55%)" : "rgba(15,23,42,0.07)",
                border: voicePhase === "listening" ? "none" : "1px solid rgba(15,23,42,0.1)",
                opacity: streaming ? 0.4 : 1,
              }}>
              {voicePhase === "listening"
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Mic className="w-3.5 h-3.5" style={{ color: "rgba(15,23,42,0.5)" }} />}
            </button>
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              title="Attach image or document"
              className="w-9 h-9 rounded-xl flex items-center justify-center self-end transition-all flex-shrink-0"
              style={{
                background: attachedFile ? "rgba(0,198,255,0.15)" : "rgba(15,23,42,0.07)",
                border: attachedFile ? "1px solid rgba(0,198,255,0.4)" : "1px solid rgba(15,23,42,0.1)",
                opacity: streaming ? 0.4 : 1,
              }}>
              <Paperclip className="w-3.5 h-3.5" style={{ color: attachedFile ? "hsl(193,100%,40%)" : "rgba(15,23,42,0.5)" }} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.docx,.doc,.txt,.csv,.md,.json,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,text/markdown,application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={voicePhase === "listening" ? "Listening…" : mode === "bot" ? "Ask the bot architect…" : "Type or tap mic · attach image/doc · ask anything…"}
              rows={2}
              className="flex-1 px-3 py-2 rounded-xl text-xs placeholder-slate-400 resize-none outline-none"
              style={{ background: voicePhase === "listening" ? "hsla(0,80%,55%,0.05)" : "#F8FAFC", border: `1px solid ${voicePhase === "listening" ? "hsla(0,80%,55%,0.3)" : "rgba(15,23,42,0.09)"}`, color: "#0F172A" }} />
            <button onClick={() => send()} disabled={streaming || (!input.trim() && !attachedFile)}
              className="w-9 h-9 rounded-xl flex items-center justify-center self-end transition-all flex-shrink-0"
              style={{ background: "hsl(193,100%,35%)", opacity: streaming || (!input.trim() && !attachedFile) ? 0.3 : 1 }}>
              {streaming ? <Loader2 className="w-3.5 h-3.5 text-slate-800 animate-spin" /> : <Send className="w-3.5 h-3.5 text-slate-800" />}
            </button>
          </div>
          <p className="text-xs text-center" style={{ color: "rgba(15,23,42,0.35)" }}>
            🎤 Speak or type · 📎 attach images, PDFs, docs · Sirius writes &amp; saves
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
              <p className="text-slate-500 text-xs text-center mt-2">{selected.label}</p>
              <button onClick={() => setSelected(null)} className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-slate-900/10 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-800" />
              </button>
            </div>
          </div>
        )}

        {renders.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p className="text-slate-400 text-sm">No renders yet — generate your first one</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {renders.map((r, i) => (
              <div key={i} className="relative group rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setSelected(r)}
                style={{ border: "1px solid rgba(15,23,42,0.1)" }}>
                <img src={r.url} alt={r.label} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.09), transparent)" }}>
                  <div className="p-3 w-full flex items-center justify-between">
                    <p className="text-slate-800 text-xs font-medium">{r.label}</p>
                    <button onClick={e => { e.stopPropagation(); deleteRender(i); }}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,0,0,0.5)" }}>
                      <Trash className="w-3 h-3 text-slate-800" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-64 border-l flex-shrink-0 p-4 flex flex-col gap-4"
        style={{ borderColor: "rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
        <div>
          <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Render Type</p>
          <div className="space-y-1">
            {RENDER_TYPES.map(t => (
              <button key={t.id} onClick={() => setRenderType(t.id)}
                className="w-full text-left px-3 py-2 rounded-xl transition-all"
                style={{ background: renderType === t.id ? "hsl(193,100%,32%)" : "#F8FAFC", border: renderType === t.id ? "none" : "1px solid rgba(15,23,42,0.07)" }}>
                <p className="text-slate-800 text-xs font-medium">{t.label}</p>
                <p className="text-slate-400 text-xs">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Angle / View</p>
          <div className="flex flex-wrap gap-1">
            {((ANGLES as any)[renderType] || ["perspective"]).map((a: string) => (
              <button key={a} onClick={() => setRenderAngle(a)}
                className="text-xs px-2.5 py-1 rounded-lg capitalize transition-all"
                style={{ background: renderAngle === a ? "hsl(193,100%,32%)" : "#F1F5F9", color: renderAngle === a ? "white" : "rgba(15,23,42,0.5)" }}>
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

        <p className="text-slate-300 text-xs text-center">AI generates from your specs and brief. Add more detail for better results.</p>
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

type TechDocRecord = {
  id: number;
  projectId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  objectPath: string;
  docType: string;
  description: string;
  analysisStatus: string;
  analysisContent: string;
  uploadedAt: string;
};

const DOC_TYPES = [
  { value: "drawing", label: "Technical Drawing" },
  { value: "spec", label: "Specification Sheet" },
  { value: "datasheet", label: "Material Datasheet" },
  { value: "photo", label: "Product Photo / Render" },
  { value: "concept", label: "Concept Sketch" },
  { value: "other", label: "Other Document" },
];

function TechDocsPanel({ project, pin }: { project: Project; pin: string }) {
  const [docs, setDocs] = useState<TechDocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("drawing");
  const [streamText, setStreamText] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base = getApiBase();
  const hdrs = useCallback(() => ({ "x-lab-pin": pin }), [pin]);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/tech-docs`, { headers: hdrs() });
      if (res.ok) setDocs(await res.json());
    } catch {}
    setLoading(false);
  }, [base, project.id, hdrs]);

  useEffect(() => { loadDocs(); }, [project.id]);

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const docTypeColor = (t: string) => {
    const m: Record<string, string> = { drawing: "#0077b6", spec: "#2d6a4f", datasheet: "#e63946", photo: "#f77f00", concept: "#7b2d8b", other: "rgba(15,23,42,0.45)" };
    return m[t] || "rgba(15,23,42,0.45)";
  };

  const docTypeIcon = (t: string) => {
    const m: Record<string, string> = { drawing: "📐", spec: "📋", datasheet: "📄", photo: "🖼️", concept: "💡", other: "📎" };
    return m[t] || "📎";
  };

  const isAnalysable = (doc: TechDocRecord) => {
    return /^image\//i.test(doc.mimeType) || /\.(jpg|jpeg|png|gif|webp|bmp|pdf)$/i.test(doc.fileName);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch(`${base}lab/projects/${project.id}/tech-docs/upload-url`, {
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

      await fetch(`${base}lab/projects/${project.id}/tech-docs`, {
        method: "POST",
        headers: { ...hdrs(), "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type || "", objectPath, docType: selectedDocType }),
      });

      await loadDocs();
    } catch (err) { console.error("Tech doc upload error:", err); }
    setUploading(false);
  };

  const analyzeDoc = async (doc: TechDocRecord) => {
    setAnalyzing(doc.id);
    setStreamText(prev => ({ ...prev, [doc.id]: "" }));
    setExpandedDoc(doc.id);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/tech-docs/${doc.id}/analyze`, {
        method: "POST",
        headers: { ...hdrs(), "Content-Type": "application/json" },
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.type === "chunk" && ev.delta) {
              setStreamText(prev => ({ ...prev, [doc.id]: (prev[doc.id] || "") + ev.delta }));
            } else if (ev.type === "complete") {
              await loadDocs();
            }
          } catch {}
        }
      }
    } catch (err) { console.error("Analysis error:", err); }
    setAnalyzing(null);
  };

  const downloadDoc = async (doc: TechDocRecord) => {
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/tech-docs/${doc.id}/download-url`, { headers: hdrs() });
      if (!res.ok) throw new Error();
      const { url, fileName } = await res.json();
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch {}
  };

  const deleteDoc = async (id: number) => {
    await fetch(`${base}lab/projects/${project.id}/tech-docs/${id}`, { method: "DELETE", headers: hdrs() });
    setDocs(prev => prev.filter(d => d.id !== id));
    setExpandedDoc(prev => prev === id ? null : prev);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "rgba(15,23,42,0.67)", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1px" }}>Technical Documents</p>
          <p style={{ color: "rgba(15,23,42,0.5)", fontSize: "0.68rem" }}>
            {docs.length === 0 ? "Upload drawings, specs, datasheets, and photos for Sirius to analyse" : `${docs.length} document${docs.length !== 1 ? "s" : ""} — Sirius can analyse images and PDFs`}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "10px", background: "hsl(193,100%,32%)", color: "white", fontSize: "0.75rem", fontWeight: 600, border: "none", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1, flexShrink: 0 }}>
          {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={12} />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {/* Doc type selector */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {DOC_TYPES.map(dt => (
          <button key={dt.value} onClick={() => setSelectedDocType(dt.value)}
            style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 600, border: `1.5px solid ${selectedDocType === dt.value ? docTypeColor(dt.value) : "rgba(15,23,42,0.1)"}`, background: selectedDocType === dt.value ? `${docTypeColor(dt.value)}12` : "transparent", color: selectedDocType === dt.value ? docTypeColor(dt.value) : "rgba(15,23,42,0.5)", cursor: "pointer" }}>
            {dt.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "hsl(193,100%,50%)" : "rgba(15,23,42,0.1)"}`, borderRadius: "12px", padding: "18px", textAlign: "center", cursor: uploading ? "not-allowed" : "pointer", background: dragging ? "rgba(0,180,216,0.05)" : "transparent", transition: "all 0.2s" }}>
        <Upload size={16} style={{ color: "rgba(15,23,42,0.45)", margin: "0 auto 6px" }} />
        <p style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.75rem" }}>Drag & drop a document here, or click to browse</p>
        <p style={{ color: "rgba(15,23,42,0.45)", fontSize: "0.65rem", marginTop: "3px" }}>PNG · JPG · PDF · WebP — images analysed with full GPT-4o vision</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
      />

      {/* Document list */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", padding: "12px", color: "rgba(15,23,42,0.45)", fontSize: "0.75rem" }}>
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading…
        </div>
      ) : docs.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {docs.map(doc => {
            const isExpanded = expandedDoc === doc.id;
            const isAnalysing = analyzing === doc.id;
            const hasAnalysis = doc.analysisStatus === "complete" || (streamText[doc.id] && streamText[doc.id].length > 0);
            const analysisText = streamText[doc.id] || doc.analysisContent || "";
            const canAnalyse = isAnalysable(doc) && !isAnalysing && analyzing === null;
            const color = docTypeColor(doc.docType);

            return (
              <div key={doc.id} style={{ borderRadius: "12px", background: "#F8FAFC", border: `1px solid ${isExpanded ? color + "30" : "rgba(15,23,42,0.07)"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
                {/* Doc row */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: `${color}15`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {docTypeIcon(doc.docType)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "rgba(15,23,42,0.85)", fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: color, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{DOC_TYPES.find(dt => dt.value === doc.docType)?.label || doc.docType}</span>
                      <span style={{ color: "rgba(15,23,42,0.4)", fontSize: "0.65rem" }}>{formatSize(doc.fileSize)} · {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      {doc.analysisStatus === "complete" && <span style={{ color: "#2d6a4f", fontSize: "0.6rem", fontWeight: 700 }}>✓ Analysed</span>}
                      {doc.analysisStatus === "pending" && <span style={{ color: "#f77f00", fontSize: "0.6rem", fontWeight: 700 }}>⟳ Analysing…</span>}
                    </div>
                  </div>
                  {/* Action buttons */}
                  {canAnalyse && (
                    <button onClick={() => analyzeDoc(doc)} title="Analyse with Sirius"
                      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "8px", background: "hsl(193,100%,32%)", color: "white", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>
                      <span>🔍</span> Analyse
                    </button>
                  )}
                  {isAnalysing && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "8px", background: "rgba(0,180,216,0.1)", color: "hsl(193,100%,32%)", fontSize: "0.68rem", fontWeight: 700 }}>
                      <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Analysing…
                    </div>
                  )}
                  {hasAnalysis && (
                    <button onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                      style={{ padding: "5px 9px", borderRadius: "8px", background: isExpanded ? `${color}15` : "transparent", border: `1px solid ${color}30`, color: color, cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>
                      {isExpanded ? "▲ Hide" : "▼ Analysis"}
                    </button>
                  )}
                  <button onClick={() => downloadDoc(doc)} title="Download"
                    style={{ padding: "6px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", color: "hsl(193,100%,55%)", display: "flex", alignItems: "center" }}>
                    <Download size={13} />
                  </button>
                  <button onClick={() => deleteDoc(doc.id)} title="Delete"
                    style={{ padding: "6px", borderRadius: "6px", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,90,90,0.55)", display: "flex", alignItems: "center" }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Analysis panel */}
                {isExpanded && analysisText && (
                  <div style={{ borderTop: `1px solid ${color}20`, padding: "14px 16px", background: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: color, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sirius Analysis</span>
                      {isAnalysing && <Loader2 size={10} style={{ animation: "spin 1s linear infinite", color }} />}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(15,23,42,0.8)", lineHeight: "1.7", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                      {analysisText}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

function NewDimensionsCadButton({ project, pin }: { project: Project; pin: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "pending" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const base = getApiBase();
  const hdrs = useCallback(() => ({ "x-lab-pin": pin, "Content-Type": "application/json" }), [pin]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${base}lab/projects/${project.id}/cad-status`, { headers: { "x-lab-pin": pin } })
      .then(r => r.json())
      .then(d => {
        if (d.status === "pending") { setStatus("pending"); setMessage("Drawing in progress — NewDimensions is working on it…"); startPolling(); }
        else if (d.status === "complete") { setStatus("complete"); setMessage("Drawing complete and stored in CAD Files below."); }
        else if (d.status === "error") { setStatus("error"); setMessage(d.error || "An error occurred."); }
      }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [project.id]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${base}lab/projects/${project.id}/cad-status`, { headers: { "x-lab-pin": pin } });
        const d = await r.json();
        if (d.status === "complete") {
          setStatus("complete"); setMessage("Drawing complete and stored in CAD Files below.");
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        } else if (d.status === "error") {
          setStatus("error"); setMessage(d.error || "An error occurred.");
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch {}
    }, 5000);
  };

  const sendToCAD = async () => {
    if (!project.drawingNotes?.trim() && !project.specs?.trim()) {
      setStatus("error"); setMessage("Generate drawing notes first before sending to CAD."); return;
    }
    setStatus("sending"); setMessage("");
    try {
      const r = await fetch(`${base}lab/projects/${project.id}/send-to-cad`, { method: "POST", headers: hdrs() });
      const d = await r.json();
      if (!r.ok) { setStatus("error"); setMessage(d.error || "Failed to send to NewDimensions."); return; }
      if (d.status === "complete") { setStatus("complete"); setMessage("Drawing received and stored in CAD Files below."); }
      else { setStatus("pending"); setMessage("Sent to NewDimensions — drawing in progress. This panel will update automatically when complete."); startPolling(); }
    } catch (e: any) {
      setStatus("error"); setMessage(e.message || "Network error.");
    }
  };

  const hasContent = !!(project.drawingNotes?.trim() || project.specs?.trim());

  const markDone = async () => {
    try {
      const r = await fetch(`${base}lab/projects/${project.id}/cad-complete`, { method: "POST", headers: hdrs() });
      if (r.ok) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setStatus("complete"); setMessage("Drawing marked as complete.");
      }
    } catch {}
  };

  return (
    <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, rgba(0,140,186,0.04) 0%, rgba(60,100,200,0.04) 100%)", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: "rgba(15,23,42,0.8)", fontSize: "0.78rem", fontWeight: 700, marginBottom: "1px", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "0.9rem" }}>🔷</span> NewDimensions CAD
          </p>
          <p style={{ color: "rgba(15,23,42,0.45)", fontSize: "0.68rem", lineHeight: "1.4" }}>
            {status === "idle" && (hasContent ? "Send drawing spec to NewDimensions — the completed drawing returns automatically." : "Generate drawing notes first, then send to NewDimensions.")}
            {status === "sending" && "Sending to NewDimensions…"}
            {status === "pending" && <span>{message} <span style={{ opacity: 0.7 }}>— If done, click Mark Complete.</span></span>}
            {status === "complete" && <span style={{ color: "hsl(142,70%,35%)", fontWeight: 600 }}>✓ {message}</span>}
            {status === "error" && <span style={{ color: "hsl(0,70%,50%)" }}>⚠ {message}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {status === "pending" && (
            <button
              onClick={markDone}
              style={{
                padding: "7px 12px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700,
                border: "1px solid hsl(142,60%,40%)", cursor: "pointer",
                background: "transparent", color: "hsl(142,60%,35%)", whiteSpace: "nowrap",
              }}>
              ✓ Mark Complete
            </button>
          )}
          <button
            onClick={sendToCAD}
            disabled={status === "sending" || status === "pending" || !hasContent}
            style={{
              padding: "7px 14px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700,
              border: "none", cursor: (status === "sending" || status === "pending" || !hasContent) ? "not-allowed" : "pointer",
              background: status === "complete" ? "hsl(142,60%,40%)" : status === "pending" ? "hsl(38,90%,50%)" : "hsl(193,100%,32%)",
              color: "white", opacity: (status === "sending" || !hasContent) ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap",
            }}>
            {status === "sending" && <span style={{ display: "inline-block", width: "10px", height: "10px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
            {status === "pending" ? "⏳ Pending…" : status === "complete" ? "✓ Done" : "Send to CAD →"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    return m[e || ""] || "rgba(15,23,42,0.45)";
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
          <p style={{ color: "rgba(15,23,42,0.67)", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1px" }}>CAD Files</p>
          <p style={{ color: "rgba(15,23,42,0.5)", fontSize: "0.68rem" }}>
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
        style={{ border: `2px dashed ${dragging ? "hsl(193,100%,50%)" : "rgba(15,23,42,0.1)"}`, borderRadius: "12px", padding: "18px", textAlign: "center", cursor: uploading ? "not-allowed" : "pointer", background: dragging ? "rgba(0,180,216,0.05)" : "transparent", transition: "all 0.2s" }}>
        <Upload size={16} style={{ color: "rgba(15,23,42,0.45)", margin: "0 auto 6px" }} />
        <p style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.75rem" }}>Drag & drop a CAD file here or click to browse</p>
        <p style={{ color: "rgba(15,23,42,0.45)", fontSize: "0.65rem", marginTop: "3px" }}>DWG · DXF · STEP · IGES · STL · OBJ · F3D · 3DM</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj,.f3d,.3dm,.sldprt,.ipt,.asm,.prt,.catpart,.catproduct"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
      />

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", padding: "12px", color: "rgba(15,23,42,0.45)", fontSize: "0.75rem" }}>
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading files…
        </div>
      ) : files.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {files.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: `${extColor(f.fileName)}18`, border: `1px solid ${extColor(f.fileName)}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.52rem", fontWeight: 800, color: extColor(f.fileName), fontFamily: "monospace", letterSpacing: "0" }}>{getExt(f.fileName)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "rgba(15,23,42,0.8)", fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</p>
                <p style={{ color: "rgba(15,23,42,0.5)", fontSize: "0.65rem" }}>
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

function ProjectWorkspace({ project, pin, onUpdate, onBack, allProjects, onNavigateProject }: {
  project: Project; pin: string; onUpdate: (p: Project) => void; onBack: () => void;
  allProjects?: Project[]; onNavigateProject?: (id: number) => void;
}) {
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
  const [genVersion, setGenVersion] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<"all" | "launch-ready" | "cad-pending">("all");
  const [techDocs, setTechDocs] = useState<any[]>([]);
  const [techDocsLoading, setTechDocsLoading] = useState(false);
  const [techDocUrls, setTechDocUrls] = useState<Record<number, string>>({});
  const [lightboxId, setLightboxId] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base = getApiBase();

  const headers = useCallback(() => ({ "Content-Type": "application/json", "x-lab-pin": pin }), [pin]);

  // Build the review nav list from allProjects filtered by reviewFilter
  const reviewList = useMemo(() => {
    if (!allProjects) return [];
    const pool = allProjects.filter(p => p.status !== "archived");
    if (reviewFilter === "launch-ready") return pool.filter(p => p.launchStatus === "launch-ready");
    if (reviewFilter === "cad-pending") return pool.filter(p => p.launchStatus === "cad-pending");
    return pool;
  }, [allProjects, reviewFilter]);

  const currentIdx = reviewList.findIndex(p => p.id === project.id);
  const prevProject = currentIdx > 0 ? reviewList[currentIdx - 1] : null;
  const nextProject = currentIdx < reviewList.length - 1 ? reviewList[currentIdx + 1] : null;

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

  const loadTechDocs = useCallback(async () => {
    setTechDocsLoading(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/tech-docs`, { headers: { "x-lab-pin": pin } });
      if (res.ok) {
        const docs = await res.json();
        setTechDocs(docs);
        const urls: Record<number, string> = {};
        await Promise.all(docs.map(async (doc: any) => {
          if (doc.mimeType?.startsWith("image/")) {
            try {
              const r = await fetch(`${base}lab/projects/${project.id}/tech-docs/${doc.id}/download-url`, { headers: { "x-lab-pin": pin } });
              if (r.ok) { const d = await r.json(); urls[doc.id] = d.url; }
            } catch {}
          }
        }));
        setTechDocUrls(urls);
      }
    } catch {}
    setTechDocsLoading(false);
  }, [base, pin, project.id]);

  const uploadTechDoc = async (file: File) => {
    setUploadingFile(true);
    setUploadError("");
    try {
      const r1 = await fetch(`${base}lab/projects/${project.id}/tech-docs/upload-url`, { method: "POST", headers: { "x-lab-pin": pin } });
      if (!r1.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await r1.json();
      const r2 = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!r2.ok) throw new Error("Upload failed");
      const docType = file.type.startsWith("image/") ? "photo" : /\.pdf$/i.test(file.name) ? "spec" : /\.(dwg|dxf)$/i.test(file.name) ? "drawing" : "other";
      await fetch(`${base}lab/projects/${project.id}/tech-docs`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type || "application/octet-stream", objectPath, docType }),
      });
      await loadTechDocs();
    } catch (e: any) { setUploadError(e.message || "Upload failed — please try again."); }
    setUploadingFile(false);
  };

  const deleteTechDoc = async (docId: number) => {
    await fetch(`${base}lab/projects/${project.id}/tech-docs/${docId}`, { method: "DELETE", headers: { "x-lab-pin": pin } });
    setTechDocs(d => d.filter(doc => doc.id !== docId));
    setTechDocUrls(u => { const n = { ...u }; delete n[docId]; return n; });
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/export-pdf`, { headers: { "x-lab-pin": pin } });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch {}
    setExportingPdf(false);
  };

  useEffect(() => {
    setInsights([]); setInsightsLoaded(false);
    setTechDocs([]); setTechDocUrls({}); setLightboxId(null);
    loadCompleteness();
    loadInsights();
  }, [project.id]);

  useEffect(() => {
    if (activeTab === "files") loadTechDocs();
  }, [activeTab, project.id]);

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
                const fieldMap: Record<string, string> = {
                  specs: "specs", materials: "materials", workflows: "workflows",
                  market: "industryProblem", brochure: "brochure",
                  pitch: "pitch", cost: "costToBuild", economics: "costToBuild",
                  businessCase: "businessCase", goToMarket: "goToMarket",
                  drawings: "drawingNotes",
                };
                const field = fieldMap[section];
                if (field) onUpdate({ ...project, [field]: result });
              }
            } catch {}
          }
        }
      }
    } catch {}
    setGenerating(false);
    setGenVersion(v => v + 1);
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
    setActiveTab("drawings");
  };

  const phase = (project.phase || "design") as keyof typeof PHASE_CONFIG;
  const phaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG.design;
  const tab = ALL_TABS.find(t => t.id === activeTab);
  const isCode = activeTab === "code";

  const MFG_PROCESSES = [
    { group: "— Not Applicable —", options: [""] },
    { group: "Machining", options: ["CNC Turning", "CNC Milling (3-Axis)", "CNC Milling (4/5-Axis)", "Mill-Turn Combined", "Wire EDM", "Sinker EDM", "Cylindrical Grinding", "Surface Grinding"] },
    { group: "Sheet & Plate", options: ["Laser Cutting", "Sheet Metal Fabrication (Laser + Press Brake + Weld)", "Waterjet Cutting", "Plasma Cutting", "Stamping / Blanking", "Roll Forming", "Tube Bending"] },
    { group: "Fabrication & Welding", options: ["Welded Fabrication (MIG/TIG)", "Structural Steelwork", "Pressure Vessel / Coded Welding"] },
    { group: "Casting", options: ["Investment Casting / Lost-Wax", "Die Casting (Aluminium/Zinc)", "Sand Casting", "Gravity Die Casting"] },
    { group: "Moulding", options: ["Injection Moulding", "Blow Moulding", "Vacuum Forming", "Rotational Moulding"] },
    { group: "Additive / 3D Printing", options: ["3D Printing — FDM", "3D Printing — SLS / MJF (Nylon)", "3D Printing — DMLS / SLM (Metal)", "3D Printing — SLA / DLP (Resin)"] },
    { group: "Composite & Specialist", options: ["Composite / GRP Layup", "CFRP / Carbon Fibre", "Forging (Open-Die)", "Forging (Closed-Die)", "Aluminium Extrusion"] },
    { group: "Electronics", options: ["PCB Design & Manufacture", "Electronics Assembly (SMT)", "Embedded Systems"] },
  ];

  const saveProcess = async (proc: string) => {
    onUpdate({ ...project, manufacturingProcess: proc });
    await fetch(`${base}lab/projects/${project.id}`, {
      method: "PUT", headers: headers(),
      body: JSON.stringify({ manufacturingProcess: proc }),
    });
  };
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
        style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        {/* Back button */}
        <button onClick={onBack} title="Back to projects"
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-slate-900/8"
          style={{ border: "1px solid rgba(15,23,42,0.1)" }}>
          <ChevronRight className="w-3.5 h-3.5 rotate-180" style={{ color: "rgba(15,23,42,0.4)" }} />
        </button>

        {/* Prev / Next review navigation */}
        {onNavigateProject && reviewList.length > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Filter pill */}
            <div className="flex p-0.5 rounded-lg mr-1" style={{ background: "rgba(15,23,42,0.05)" }}>
              {(["all", "launch-ready", "cad-pending"] as const).map(f => (
                <button key={f} onClick={() => setReviewFilter(f)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all capitalize"
                  style={{
                    background: reviewFilter === f ? "white" : "transparent",
                    color: reviewFilter === f ? "rgba(15,23,42,0.75)" : "rgba(15,23,42,0.38)",
                    boxShadow: reviewFilter === f ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}>
                  {f === "all" ? `All (${allProjects?.filter(p => p.status !== "archived").length ?? 0})` : f === "launch-ready" ? `🚀 Ready (${allProjects?.filter(p => p.launchStatus === "launch-ready").length ?? 0})` : `📐 CAD (${allProjects?.filter(p => p.launchStatus === "cad-pending").length ?? 0})`}
                </button>
              ))}
            </div>
            {/* Prev */}
            <button onClick={() => prevProject && onNavigateProject(prevProject.id)} disabled={!prevProject}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-25"
              style={{ background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.08)" }}
              title={prevProject ? `← ${prevProject.name}` : "First project"}>
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: "rgba(15,23,42,0.6)" }} />
            </button>
            {/* Counter */}
            <span className="text-[10px] font-semibold tabular-nums px-1.5"
              style={{ color: "rgba(15,23,42,0.45)", minWidth: 36, textAlign: "center" }}>
              {currentIdx >= 0 ? `${currentIdx + 1}/${reviewList.length}` : `?/${reviewList.length}`}
            </span>
            {/* Next */}
            <button onClick={() => nextProject && onNavigateProject(nextProject.id)} disabled={!nextProject}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-25"
              style={{ background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.08)" }}
              title={nextProject ? `${nextProject.name} →` : "Last project"}>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "rgba(15,23,42,0.6)" }} />
            </button>
          </div>
        )}
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveProjectName(); if (e.key === "Escape") setEditingName(false); }}
              className="bg-transparent text-slate-800 font-bold text-sm outline-none border-b border-white/30 flex-1" />
            <button onClick={saveProjectName}><Check className="w-4 h-4 text-green-400" /></button>
            <button onClick={() => setEditingName(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-slate-800 font-bold text-sm truncate">{project.name}</h1>
            <button onClick={() => { setEditName(project.name); setEditingName(true); }}>
              <Pencil className="w-3 h-3 text-slate-300 hover:text-slate-500 transition-colors" />
            </button>
            <span className="text-slate-300 text-xs hidden sm:block">· {project.industry}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && <span className="text-slate-300 text-xs">Saving...</span>}

          {/* Phase selector */}
          <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: "#F8FAFC" }}>
            {(["design", "production", "complete"] as const).map(p => (
              <button key={p} onClick={() => setPhase(p)}
                className="px-2.5 py-1 rounded-lg text-xs transition-all capitalize"
                style={{ background: phase === p ? phaseConfig.color : "transparent", color: phase === p ? "white" : "rgba(15,23,42,0.6)", fontWeight: phase === p ? "600" : "400" }}>
                {p}
              </button>
            ))}
          </div>

          {completeness && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(15,23,42,0.08)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${completeness.pct}%`, background: completeness.pct === 100 ? "hsl(155,70%,45%)" : phaseConfig.color }} />
              </div>
              <span className="text-slate-400 text-xs">{completeness.pct}%</span>
            </div>
          )}

          <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "#F1F5F9" }}>
            <button onClick={() => setLabMode("engineering")}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all"
              style={{ background: labMode === "engineering" ? "hsl(193,100%,35%)" : "transparent", color: labMode === "engineering" ? "white" : "rgba(15,23,42,0.4)" }}>
              <Cpu className="w-3 h-3" /> Engineering
            </button>
            <button onClick={() => setLabMode("bot")}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all"
              style={{ background: labMode === "bot" ? "hsl(280,70%,55%)" : "transparent", color: labMode === "bot" ? "white" : "rgba(15,23,42,0.4)" }}>
              <Bot className="w-3 h-3" /> Bot
            </button>
          </div>

          <button onClick={openCad}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: "#E8EEF5", color: "hsl(193,100%,60%)", border: "1px solid rgba(15,23,42,0.09)" }}>
            <Cpu className="w-3 h-3" /> Drawings
          </button>
          <button onClick={exportPdf} disabled={exportingPdf}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: "#E8EEF5", color: "hsl(155,70%,40%)", border: "1px solid rgba(15,23,42,0.09)", opacity: exportingPdf ? 0.6 : 1 }}>
            {exportingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {exportingPdf ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
          {PHASE_TABS.map(pt => (
            <button key={pt.id} onClick={() => setPhaseFilter(pt.id)}
              className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 transition-all"
              style={{ background: phaseFilter === pt.id ? "rgba(15,23,42,0.1)" : "transparent", color: phaseFilter === pt.id ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.6)" }}>
              {pt.label}
            </button>
          ))}
          <div className="w-px h-4 flex-shrink-0 mx-1" style={{ background: "rgba(15,23,42,0.1)" }} />
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
                style={{ background: activeTab === t.id ? "#DCE4F0" : "transparent", color: activeTab === t.id ? "rgba(15,23,42,0.85)" : "rgba(15,23,42,0.45)", border: activeTab === t.id ? `1px solid ${phaseColor}40` : "1px solid transparent" }}>
                <Icon className="w-3 h-3" style={{ color: activeTab === t.id ? phaseColor : undefined }} />
                {t.label}
                {isFunding && project.fundingStatus === "pending" && <Loader2 className="w-2.5 h-2.5 animate-spin flex-shrink-0" style={{ color: "hsl(45,100%,55%)" }} />}
                {isFunding && fundingDotColor && project.fundingStatus !== "pending" && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: fundingDotColor }} />}
                {!isFunding && hasContent && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phaseColor }} />}
              </button>
            );
          })}
          <button onClick={() => navigator.clipboard.writeText(getTabContent(activeTab))} title="Copy" className="ml-auto flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-900/5 transition-colors">
            <Copy className="w-3.5 h-3.5 text-slate-300" />
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
              <div className="rounded-2xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
                <p className="text-slate-400 text-xs mb-3 uppercase tracking-wider">Project Phase</p>
                <div className="flex items-center gap-2">
                  {(["design", "production", "complete"] as const).map((p, i) => {
                    const cfg = PHASE_CONFIG[p];
                    const done = ["design", "production", "complete"].indexOf(phase) >= i;
                    return (
                      <React.Fragment key={p}>
                        <div className="flex-1">
                          <button onClick={() => setPhase(p)} className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: phase === p ? cfg.color : done ? cfg.color + "30" : "#F1F5F9", color: done ? "white" : "rgba(15,23,42,0.6)" }}>
                            {cfg.label}
                          </button>
                        </div>
                        {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Completeness */}
              {completeness && (
                <div className="rounded-2xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-xs uppercase tracking-wider">Completeness</p>
                    <span className="text-slate-800 font-bold">{completeness.pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(15,23,42,0.07)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${completeness.pct}%`, background: completeness.pct === 100 ? "hsl(155,70%,45%)" : "hsl(193,100%,35%)" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {completeness.checks.map(c => {
                      const color = c.phase === "design" ? "hsl(193,100%,35%)" : c.phase === "production" ? "hsl(45,100%,45%)" : "hsl(155,70%,45%)";
                      return (
                        <div key={c.key} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: c.filled ? color : "rgba(15,23,42,0.1)" }}>
                            {c.filled && <Check className="w-1.5 h-1.5 text-slate-800" />}
                          </div>
                          <span style={{ color: c.filled ? "rgba(15,23,42,0.72)" : "rgba(15,23,42,0.5)" }}>{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Latest render */}
              {renders.length > 0 && (
                <div className="rounded-2xl overflow-hidden cursor-pointer" onClick={() => setActiveTab("renders")}
                  style={{ border: "1px solid rgba(15,23,42,0.09)" }}>
                  <img src={renders[0].url} alt={renders[0].label} className="w-full aspect-video object-cover" />
                  <div className="p-3 flex items-center justify-between" style={{ background: "#F1F5F9" }}>
                    <p className="text-slate-800 text-xs font-medium">{renders[0].label}</p>
                    <span className="text-slate-400 text-xs">{renders.length} render{renders.length !== 1 ? "s" : ""} · View all</span>
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
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                    <p className="text-slate-800 text-sm font-semibold truncate">{s.value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Sirius Insights */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Atom className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,55%)" }} />
                    <p className="text-slate-800 text-xs font-semibold">Sirius Insights</p>
                    {insights.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: "hsl(193,100%,20%)", color: "hsl(193,100%,65%)" }}>
                        {insights.length}
                      </span>
                    )}
                  </div>
                  <button onClick={loadInsights} disabled={loadingInsights}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{ background: "#E8EEF5", color: "rgba(15,23,42,0.45)" }}>
                    {loadingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {loadingInsights ? "Analysing..." : "Refresh"}
                  </button>
                </div>

                {loadingInsights && insights.length === 0 && (
                  <div className="rounded-2xl p-5 text-center" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
                    <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" style={{ color: "hsl(193,100%,50%)" }} />
                    <p className="text-slate-400 text-xs">Sirius is analysing your project...</p>
                  </div>
                )}

                {!loadingInsights && insightsLoaded && insights.length === 0 && (
                  <div className="rounded-2xl p-4 text-center" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
                    <p className="text-slate-400 text-xs">No insights generated. Click Refresh to try again.</p>
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
                          style={{ background: "#FFFFFF", border: `1px solid rgba(15,23,42,0.09)` }}
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
                                <span className="text-slate-400 text-xs truncate">{insight.category}</span>
                              </div>
                              <p className="text-slate-800 text-xs font-medium leading-snug">{insight.title}</p>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform text-slate-400"
                              style={{ transform: isExpanded ? "rotate(180deg)" : "none" }} />
                          </div>
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
                              <p className="text-slate-500 text-xs leading-relaxed mt-2 mb-3">{insight.detail}</p>
                              <div className="flex items-start gap-2 rounded-lg p-2.5"
                                style={{ background: "#EEF2F8", border: "1px solid rgba(15,23,42,0.09)" }}>
                                <Zap className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "hsl(193,100%,55%)" }} />
                                <p className="text-slate-700 text-xs font-medium leading-snug">{insight.action}</p>
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
                <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Quick Generate</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Drawing Package", section: "drawings", tab: "drawings" },
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
                      style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.62)", border: "1px solid rgba(15,23,42,0.09)", opacity: generating ? 0.5 : 1 }}>
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

          {activeTab === "files" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto relative">
              {/* Lightbox */}
              {lightboxId !== null && (() => {
                const doc = techDocs.find(d => d.id === lightboxId);
                const url = techDocUrls[lightboxId];
                return doc ? (
                  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.88)" }}
                    onClick={() => setLightboxId(null)}>
                    <button className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.15)" }}
                      onClick={() => setLightboxId(null)}>
                      <X className="w-4 h-4 text-white" />
                    </button>
                    {url ? (
                      <img src={url} alt={doc.fileName}
                        className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
                        onClick={e => e.stopPropagation()} />
                    ) : (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    )}
                    <p className="absolute bottom-6 text-white/50 text-xs">{doc.fileName}</p>
                  </div>
                ) : null;
              })()}

              <div className="p-5 space-y-4">
                {/* Header + upload */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-slate-800 font-semibold text-sm">Files &amp; Media</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.4)" }}>
                      Photos, drawings, PDFs and any visual references for this project
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={loadTechDocs} disabled={techDocsLoading}
                      className="p-1.5 rounded-lg transition-all hover:bg-slate-900/5"
                      title="Refresh">
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${techDocsLoading ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={{ background: "hsl(193,100%,35%)", color: "white", opacity: uploadingFile ? 0.7 : 1 }}>
                      {uploadingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {uploadingFile ? "Uploading…" : "Upload File"}
                    </button>
                    <input ref={fileInputRef} type="file"
                      accept="image/*,.pdf,.dwg,.dxf,.step,.stp,.iges,.stl"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { uploadTechDoc(f); e.target.value = ""; } }} />
                  </div>
                </div>

                {uploadError && (
                  <div className="rounded-xl p-3 text-xs" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                    {uploadError}
                  </div>
                )}

                {techDocsLoading && techDocs.length === 0 && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                  </div>
                )}

                {!techDocsLoading && techDocs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.08)" }}>
                      <Image className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">No files yet</p>
                    <p className="text-xs mt-1.5 max-w-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.35)" }}>
                      Upload product photos, concept sketches, engineering drawings, PDFs — anything that helps describe what you're building
                    </p>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.55)", border: "1px solid rgba(15,23,42,0.09)" }}>
                      <Upload className="w-3 h-3" /> Upload your first file
                    </button>
                  </div>
                )}

                {techDocs.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {techDocs.map(doc => {
                      const isImage = doc.mimeType?.startsWith("image/");
                      const url = techDocUrls[doc.id];
                      const TYPE_STYLE: Record<string, { bg: string; text: string }> = {
                        photo:   { bg: "hsla(193,100%,20%,0.7)", text: "hsl(193,100%,65%)" },
                        drawing: { bg: "hsla(155,70%,15%,0.7)",  text: "hsl(155,70%,50%)"  },
                        concept: { bg: "hsla(280,70%,20%,0.7)",  text: "hsl(280,70%,65%)"  },
                        spec:    { bg: "hsla(45,100%,15%,0.7)",  text: "hsl(45,100%,55%)"  },
                        other:   { bg: "rgba(15,23,42,0.08)",    text: "rgba(15,23,42,0.45)" },
                      };
                      const ts = TYPE_STYLE[doc.docType] || TYPE_STYLE.other;
                      return (
                        <div key={doc.id} className="rounded-xl overflow-hidden group relative"
                          style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                          {/* Thumbnail */}
                          {isImage && url ? (
                            <div className="aspect-[4/3] cursor-pointer overflow-hidden bg-slate-50"
                              onClick={() => setLightboxId(doc.id)}>
                              <img src={url} alt={doc.fileName}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            </div>
                          ) : (
                            <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2"
                              style={{ background: "#F8FAFC" }}>
                              <Paperclip className="w-7 h-7 text-slate-200" />
                              <span className="text-xs text-slate-300 px-3 text-center truncate w-full">{doc.fileName}</span>
                            </div>
                          )}
                          {/* Info */}
                          <div className="px-3 py-2.5">
                            <p className="text-slate-700 text-xs font-medium truncate">{doc.fileName}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: ts.bg, color: ts.text }}>
                                {doc.docType}
                              </span>
                              <button onClick={() => deleteTechDoc(doc.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all"
                                style={{ color: "#EF4444" }}
                                title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {doc.description && (
                              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "rgba(15,23,42,0.45)" }}>{doc.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {techDocs.length > 0 && (
                  <p className="text-center text-xs" style={{ color: "rgba(15,23,42,0.3)" }}>
                    {techDocs.length} file{techDocs.length !== 1 ? "s" : ""} · These are also included when you Export PDF
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "funding" && (
            <FundingProjectTab project={project} pin={pin} onUpdate={onUpdate} />
          )}

          {activeTab === "sales-plan" && (
            <SalesPlanProjectTab project={project} />
          )}

          {activeTab === "ai-arch" && (
            <AiArchProjectTab project={project} pin={pin} onUpdate={onUpdate} />
          )}

          {activeTab === "launch" && (
            <LaunchPanel project={project} pin={pin} onUpdate={onUpdate} />
          )}

          {activeTab === "package" && (
            <ProductPackageTab project={project} pin={pin} onUpdate={onUpdate} />
          )}

          {activeTab !== "overview" && activeTab !== "renders" && activeTab !== "funding" && activeTab !== "sales-plan" && activeTab !== "ai-arch" && activeTab !== "launch" && activeTab !== "package" && tab && (
            <div className="flex flex-col h-full">
              {["specs", "drawings", "workflows"].includes(activeTab) && (
                <div className="px-4 py-2 border-b flex items-center gap-2 flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F8FAFC" }}>
                  <Cpu className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(193,100%,35%)" }} />
                  <span className="text-xs font-medium" style={{ color: "rgba(15,23,42,0.5)", flexShrink: 0 }}>Manufacturing Process</span>
                  <select
                    value={project.manufacturingProcess || ""}
                    onChange={e => saveProcess(e.target.value)}
                    className="flex-1 text-xs rounded-md border px-2 py-1 outline-none cursor-pointer"
                    style={{ borderColor: "rgba(15,23,42,0.12)", color: project.manufacturingProcess ? "rgba(15,23,42,0.8)" : "rgba(15,23,42,0.35)", background: "white", maxWidth: "280px" }}>
                    <option value="">Not applicable — digital / software</option>
                    {MFG_PROCESSES.filter(g => g.group !== "— Not Applicable —").map(grp => (
                      <optgroup key={grp.group} label={grp.group}>
                        {grp.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {project.manufacturingProcess && (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "hsl(193,100%,92%)", color: "hsl(193,100%,28%)" }}>
                      Process set
                    </span>
                  )}
                </div>
              )}
              {tab.generated && (
                <div className="px-4 py-2 border-b flex items-center justify-between flex-shrink-0"
                  style={{ borderColor: "rgba(15,23,42,0.07)" }}>
                  <span className="text-slate-400 text-xs">
                    {activeTab === "market" ? "Market analysis + use cases" : activeTab === "economics" ? "Cost to build + profit margins" : activeTab === "drawings" ? "Engineering drawing package · standards-aware" : activeTab === "specs" ? (project.manufacturingProcess ? `Specs for ${project.manufacturingProcess}` : "Technical specifications") : activeTab === "workflows" ? (project.manufacturingProcess ? `Factory workflow for ${project.manufacturingProcess}` : "Manufacturing / deployment workflow") : tab.label}
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
                  <textarea key={`${project.id}-market-${genVersion}`} defaultValue={project.industryProblem}
                    onBlur={e => saveField("industryProblem", e.target.value)}
                    placeholder="Industry problem analysis, market sizing, competitor landscape, use cases..."
                    className="flex-1 p-4 resize-none outline-none leading-relaxed"
                    style={{ background: "transparent", color: "rgba(15,23,42,0.8)", fontSize: "0.83rem", lineHeight: "1.7" }} />
                </div>
              ) : activeTab === "economics" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <textarea key={`${project.id}-economics-${genVersion}`} defaultValue={project.costToBuild}
                    onBlur={e => saveField("costToBuild", e.target.value)}
                    placeholder="Cost to build breakdown, BOM, manufacturing costs, pricing strategy, profit margin analysis..."
                    className="flex-1 p-4 resize-none outline-none leading-relaxed"
                    style={{ background: "transparent", color: "rgba(15,23,42,0.8)", fontSize: "0.83rem", lineHeight: "1.7" }} />
                </div>
              ) : activeTab === "drawings" ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                  <textarea key={`${project.id}-drawings-${genVersion}`} defaultValue={project.drawingNotes}
                    onBlur={e => saveField("drawingNotes", e.target.value)}
                    placeholder="Drawing notes: views required, dimension callouts, tolerances, assembly details, revision history..."
                    style={{ background: "transparent", color: "rgba(15,23,42,0.8)", fontSize: "0.83rem", lineHeight: "1.7", padding: "16px", resize: "none", outline: "none", minHeight: "140px", flexShrink: 0 }} />
                  <NewDimensionsCadButton project={project} pin={pin} />
                  <div style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                    <TechDocsPanel project={project} pin={pin} />
                  </div>
                  <div style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                    <CadFilesPanel project={project} pin={pin} />
                  </div>
                </div>
              ) : (
                <textarea key={`${project.id}-${activeTab}-${genVersion}`} defaultValue={getTabContent(activeTab)}
                  onBlur={e => saveField(getTabField(activeTab), e.target.value)}
                  placeholder={tab.placeholder}
                  className="flex-1 p-4 resize-none outline-none leading-relaxed"
                  style={{
                    background: "transparent", color: "rgba(15,23,42,0.8)",
                    fontFamily: isCode ? "'Fira Code','Cascadia Code','Consolas',monospace" : "inherit",
                    fontSize: isCode ? "0.75rem" : "0.83rem", lineHeight: isCode ? "1.6" : "1.7",
                  }} />
              )}
            </div>
          )}
        </div>

        {/* AI Panel */}
        <div className="w-64 border-l flex flex-col min-h-0"
          style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F5F7FF" }}>
          <div className="px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
            <div className="flex items-center gap-1.5">
              {labMode === "bot"
                ? <Bot className="w-3.5 h-3.5" style={{ color: "hsl(280,70%,65%)" }} />
                : <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,50%)" }} />}
              <span className="text-slate-800 text-xs font-medium">{labMode === "bot" ? "Bot Architect" : "Lab AI"}</span>
              <span className="text-slate-300 text-xs ml-auto">GPT-5.2</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel project={project} pin={pin} mode={labMode} onUpdate={onUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}

type AiArchInsights = {
  needsAppDev: boolean;
  techStack: string[];
  buildRoadmap: { step: number; title: string; detail: string }[];
  marketReadinessScore: number;
  missingElements: string[];
  nextAction: string;
  estimatedBuildWeeks: number | null;
  architectureNotes: string;
  sweptAt: string;
};

function ProductPackageTab({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [copied, setCopied] = useState<"landing" | "embed" | null>(null);
  const [generating, setGenerating] = useState(false);
  const base = getApiBase();

  const copy = async (text: string, type: "landing" | "embed") => {
    try { await navigator.clipboard.writeText(text); setCopied(type); setTimeout(() => setCopied(null), 2500); } catch {}
  };

  const previewLanding = () => {
    if (!project.landingPage) return;
    const blob = new Blob([project.landingPage], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/generate-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      });
      if (res.ok) {
        const reader = res.body?.getReader(); const dec = new TextDecoder(); let buf = "";
        if (reader) {
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            buf += dec.decode(value, { stream: true });
          }
        }
        const updated = await fetch(`${base}lab/projects/${project.id}`, { headers: { "x-lab-pin": pin } }).then(r => r.json());
        if (updated && updated.id) onUpdate(updated);
      }
    } catch {}
    setGenerating(false);
  };

  const hasLanding = !!project.landingPage;
  const hasEmbed = !!project.embedCode;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
      <div className="flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "rgba(15,23,42,0.8)" }}>Product Package</h3>
          <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.45)" }}>Landing page + embed widget — ready to host or drop on any site</p>
        </div>
        <button onClick={generate} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0"
          style={{ background: "hsl(193,100%,32%)", color: "white", opacity: generating ? 0.6 : 1 }}>
          {generating
            ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
            : <><Sparkles className="w-3 h-3" />{hasLanding || hasEmbed ? "Regenerate" : "Generate Package"}</>}
        </button>
      </div>

      {!hasLanding && !hasEmbed && !generating && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <Globe className="w-8 h-8" style={{ color: "hsl(193,100%,55%)", opacity: 0.4 }} />
          <p className="text-sm font-medium" style={{ color: "rgba(15,23,42,0.45)" }}>No package yet</p>
          <p className="text-xs max-w-52" style={{ color: "rgba(15,23,42,0.35)" }}>
            Click <strong>Generate Package</strong> to create a landing page and embed widget for this product.
            Works best after Brief and Go-to-Market are filled in.
          </p>
        </div>
      )}

      {generating && !hasLanding && (
        <div className="flex items-center gap-2 py-6 px-4 rounded-xl" style={{ background: "hsl(193,100%,97%)", border: "1px solid hsl(193,100%,88%)" }}>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "hsl(193,100%,35%)" }} />
          <span className="text-xs" style={{ color: "hsl(193,100%,28%)" }}>Generating landing page and embed widget…</span>
        </div>
      )}

      {hasLanding && (
        <div className="rounded-xl border overflow-hidden flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.09)" }}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F8FAFC" }}>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,35%)" }} />
              <span className="text-xs font-medium" style={{ color: "rgba(15,23,42,0.65)" }}>Landing Page HTML</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "hsl(155,70%,92%)", color: "hsl(155,70%,30%)" }}>
                {Math.round(project.landingPage.length / 1024)}KB
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <a href={`${base}lab/p/${project.id}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                style={{ background: "hsl(155,70%,92%)", color: "hsl(155,60%,35%)", border: "1px solid hsl(155,70%,82%)", textDecoration: "none" }}>
                <ExternalLink className="w-3 h-3" /> Live Page
              </a>
              <button onClick={previewLanding}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all"
                style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.55)" }}>
                <ExternalLink className="w-3 h-3" /> Preview
              </button>
              <button onClick={() => copy(project.landingPage, "landing")}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all"
                style={{ background: copied === "landing" ? "hsl(155,70%,90%)" : "rgba(15,23,42,0.05)", color: copied === "landing" ? "hsl(155,70%,32%)" : "rgba(15,23,42,0.55)" }}>
                {copied === "landing" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy HTML</>}
              </button>
            </div>
          </div>
          <pre className="p-3 text-xs overflow-x-auto" style={{
            color: "rgba(15,23,42,0.45)", background: "#FAFBFC", maxHeight: "180px", overflowY: "auto",
            fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace", lineHeight: 1.55, whiteSpace: "pre-wrap", margin: 0
          }}>
            {project.landingPage.slice(0, 600)}{project.landingPage.length > 600 ? "\n…" : ""}
          </pre>
        </div>
      )}

      {hasEmbed && (
        <div className="rounded-xl border overflow-hidden flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.09)" }}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F8FAFC" }}>
            <div className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" style={{ color: "hsl(280,70%,55%)" }} />
              <span className="text-xs font-medium" style={{ color: "rgba(15,23,42,0.65)" }}>Embed Widget</span>
            </div>
            <button onClick={() => copy(project.embedCode, "embed")}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all"
              style={{ background: copied === "embed" ? "hsl(155,70%,90%)" : "rgba(15,23,42,0.05)", color: copied === "embed" ? "hsl(155,70%,32%)" : "rgba(15,23,42,0.55)" }}>
              {copied === "embed" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Snippet</>}
            </button>
          </div>
          <pre className="p-3 text-xs" style={{
            color: "rgba(15,23,42,0.55)", background: "#FAFBFC",
            fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0
          }}>
            {project.embedCode}
          </pre>
          <div className="px-3 py-2 border-t" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
            <p className="text-xs" style={{ color: "rgba(15,23,42,0.38)" }}>
              Paste anywhere on a website to promote this product. Self-contained — no dependencies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AiArchProjectTab({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [triggering, setTriggering] = useState(false);
  const base = getApiBase();
  const hdrs = () => ({ "Content-Type": "application/json", "x-lab-pin": pin });

  const insights: AiArchInsights | null = (() => {
    try { return project.aiArchInsights ? JSON.parse(project.aiArchInsights) : null; } catch { return null; }
  })();

  const isPending = project.aiArchLinked === "pending";
  const isLinked = project.aiArchLinked === "linked";
  const isNotApplicable = project.aiArchLinked === "not-applicable";
  const isUnanalysed = !project.aiArchLinked || project.aiArchLinked === "";

  const triggerAnalysis = async () => {
    setTriggering(true);
    await fetch(`${base}lab/projects/${project.id}/ai-arch/analyze`, { method: "POST", headers: hdrs() });
    onUpdate({ ...project, aiArchLinked: "pending" });
    setTriggering(false);
  };

  const sweptAtFormatted = insights?.sweptAt
    ? new Date(insights.sweptAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  const SCORE_COLOR = (s: number) =>
    s >= 8 ? "hsl(155,70%,45%)" : s >= 5 ? "hsl(45,100%,50%)" : "hsl(0,70%,55%)";

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">

      {/* Header */}
      <div className="rounded-xl p-4 flex items-start justify-between gap-4" style={{ background: "linear-gradient(135deg, hsl(210,80%,55%,0.08), hsl(155,70%,45%,0.05))", border: "1px solid hsla(210,80%,55%,0.15)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4" style={{ color: "hsl(210,80%,55%)" }} />
            <span className="text-sm font-bold text-slate-800">AI Architecture Analysis</span>
            {isLinked && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "hsla(210,80%,55%,0.1)", color: "hsl(210,80%,55%)", border: "1px solid hsla(210,80%,55%,0.2)" }}>LINKED</span>}
            {isNotApplicable && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "hsla(0,0%,50%,0.08)", color: "rgba(15,23,42,0.45)", border: "1px solid rgba(15,23,42,0.1)" }}>PHYSICAL PRODUCT</span>}
          </div>
          <p className="text-xs" style={{ color: "rgba(15,23,42,0.55)" }}>
            {isUnanalysed && "Not yet analysed — run the AI Architecture sweep to assess this project's digital requirements."}
            {isPending && "Sirius is analysing this project…"}
            {isLinked && `This project needs app development to reach market. ${sweptAtFormatted ? `Last analysed ${sweptAtFormatted}.` : ""}`}
            {isNotApplicable && `This is a physical product — no app development required. ${sweptAtFormatted ? `Last analysed ${sweptAtFormatted}.` : ""}`}
          </p>
        </div>
        <button
          onClick={triggerAnalysis}
          disabled={triggering || isPending}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: "hsl(210,80%,55%)", color: "white", opacity: triggering || isPending ? 0.5 : 1 }}>
          {triggering || isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {isPending ? "Analysing…" : isUnanalysed ? "Analyse Now" : "Re-analyse"}
        </button>
      </div>

      {isPending && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "hsla(210,80%,55%,0.05)", border: "1px solid hsla(210,80%,55%,0.1)" }}>
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "hsl(210,80%,55%)" }} />
          <div>
            <p className="text-sm font-medium text-slate-800">AI Architecture sweep in progress</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.5)" }}>Sirius is evaluating this project's digital requirements, tech stack, and market readiness. This takes about 30 seconds.</p>
          </div>
        </div>
      )}

      {isNotApplicable && !isPending && (
        <div className="p-4 rounded-xl text-center" style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.07)" }}>
          <Wrench className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(15,23,42,0.3)" }} />
          <p className="text-sm font-medium text-slate-700 mb-1">Physical / Engineering Product</p>
          <p className="text-xs" style={{ color: "rgba(15,23,42,0.5)" }}>Sirius determined this project does not require custom software or an app to reach market. If this seems wrong, click Re-analyse above.</p>
        </div>
      )}

      {isLinked && insights && (
        <>
          {/* Market Readiness Score */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 rounded-xl p-4 text-center" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div className="text-3xl font-black mb-1" style={{ color: SCORE_COLOR(insights.marketReadinessScore) }}>
                {insights.marketReadinessScore}<span className="text-lg font-medium opacity-50">/10</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Market Readiness</p>
            </div>
            {insights.estimatedBuildWeeks !== null && (
              <div className="col-span-1 rounded-xl p-4 text-center" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.07)" }}>
                <div className="text-3xl font-black mb-1" style={{ color: "hsl(210,80%,55%)" }}>
                  {insights.estimatedBuildWeeks}<span className="text-lg font-medium opacity-50">w</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Est. Build Time</p>
              </div>
            )}
            <div className="col-span-1 rounded-xl p-4 text-center" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div className="text-3xl font-black mb-1" style={{ color: "hsl(280,70%,55%)" }}>
                {insights.techStack.length}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Tech Stack Items</p>
            </div>
          </div>

          {/* Next Action */}
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, hsl(155,70%,45%,0.08), hsl(155,70%,45%,0.04))", border: "1px solid hsla(155,70%,45%,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />
              <span className="text-xs font-bold" style={{ color: "hsl(155,70%,35%)" }}>HIGHEST IMPACT NEXT ACTION</span>
            </div>
            <p className="text-sm text-slate-800 font-medium">{insights.nextAction}</p>
          </div>

          {/* Tech Stack */}
          <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.07)" }}>
            <p className="text-xs font-bold text-slate-700 mb-3">Recommended Tech Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {insights.techStack.map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "hsla(210,80%,55%,0.08)", color: "hsl(210,80%,50%)", border: "1px solid hsla(210,80%,55%,0.15)" }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Build Roadmap */}
          {insights.buildRoadmap.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.07)" }}>
              <p className="text-xs font-bold text-slate-700 mb-3">Build Roadmap to Market</p>
              <div className="space-y-2">
                {insights.buildRoadmap.map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white" style={{ background: "hsl(210,80%,55%)" }}>{s.step}</div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{s.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "rgba(15,23,42,0.55)" }}>{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Elements */}
          {insights.missingElements.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.07)" }}>
              <p className="text-xs font-bold text-slate-700 mb-3">Missing to Reach Market</p>
              <div className="space-y-1.5">
                {insights.missingElements.map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "hsl(25,90%,55%)" }} />
                    <p className="text-xs" style={{ color: "rgba(15,23,42,0.65)" }}>{m}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Architecture Notes */}
          {insights.architectureNotes && (
            <div className="rounded-xl p-4" style={{ background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.07)" }}>
              <p className="text-xs font-bold text-slate-700 mb-2">Architecture Notes</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.65)" }}>{insights.architectureNotes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sales Plan Project Tab ─────────────────────────────────────────────────

function SalesPlanProjectTab({ project }: { project: Project }) {
  const plan = React.useMemo(() => {
    if (!project.salesPlan) return null;
    try { return JSON.parse(project.salesPlan); } catch { return null; }
  }, [project.salesPlan]);

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <TrendingUp className="w-10 h-10 mx-auto mb-4" style={{ color: "rgba(15,23,42,0.12)" }} />
          <h3 className="text-slate-400 font-semibold text-sm mb-2">No Sales Plan Yet</h3>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.35)" }}>
            Use <strong>Command Centre</strong> to run the full orchestration pipeline — it will generate a complete sales and marketing plan with unit economics, target sectors, and revenue projections.
          </p>
        </div>
      </div>
    );
  }

  const urgencyColor = (u: string) =>
    u === "high" ? "hsl(155,65%,42%)" : u === "medium" ? "hsl(40,90%,50%)" : "hsl(215,20%,60%)";

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: "#F8FAFC" }}>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Unit Economics — primary hero section */}
        {plan.unitEconomics && (
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)", boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Unit Economics</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Cost to build", value: plan.unitEconomics.costToBuild, sub: "product creation cost" },
                { label: "Cost to deliver", value: plan.unitEconomics.costToDeliver, sub: "per customer" },
                { label: "Selling price", value: plan.unitEconomics.sellingPricePerUnit, sub: "per customer", highlight: true },
                { label: "Gross profit", value: plan.unitEconomics.grossProfitPerUnit, sub: "per customer", highlight: true },
              ].map(item => (
                <div key={item.label} className="rounded-lg p-3.5" style={{
                  background: item.highlight ? "hsla(155,65%,42%,0.06)" : "rgba(15,23,42,0.03)",
                  border: item.highlight ? "1px solid hsla(155,65%,42%,0.15)" : "1px solid transparent",
                }}>
                  <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                  <p className="text-lg font-bold" style={{ color: item.highlight ? "hsl(155,65%,38%)" : "rgba(15,23,42,0.8)" }}>{item.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg p-3" style={{ background: "rgba(15,23,42,0.03)" }}>
                <p className="text-xs text-slate-400 mb-1">Gross margin</p>
                <p className="text-base font-bold text-slate-800">{plan.unitEconomics.grossMarginPercent}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(15,23,42,0.03)" }}>
                <p className="text-xs text-slate-400 mb-1">Break-even customers</p>
                <p className="text-base font-bold text-slate-800">{plan.unitEconomics.breakEvenUnits}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(15,23,42,0.03)" }}>
                <p className="text-xs text-slate-400 mb-1">Break-even revenue</p>
                <p className="text-base font-bold text-slate-800">{plan.unitEconomics.breakEvenRevenue}</p>
              </div>
            </div>
            {plan.unitEconomics.notes && (
              <p className="text-xs text-slate-400 mt-3 pt-3 leading-relaxed" style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
                <span className="font-medium text-slate-500">Assumptions: </span>{plan.unitEconomics.notes}
              </p>
            )}
          </div>
        )}

        {/* Revenue Projections */}
        {plan.revenueProjections && (
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)" }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Revenue Projections</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Year 1", data: plan.revenueProjections.year1 },
                { label: "Year 2", data: plan.revenueProjections.year2 },
                { label: "Year 3", data: plan.revenueProjections.year3, highlight: true },
              ].map(yr => (
                <div key={yr.label} className="rounded-lg p-4" style={{
                  background: yr.highlight ? "linear-gradient(135deg, hsl(193,100%,95%), hsl(193,100%,92%))" : "rgba(15,23,42,0.03)",
                  border: yr.highlight ? "1px solid hsl(193,100%,80%)" : "1px solid transparent",
                }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: yr.highlight ? "hsl(193,100%,35%)" : "rgba(15,23,42,0.5)" }}>{yr.label}</p>
                  <p className="text-lg font-bold text-slate-800 mb-1">{yr.data?.revenue}</p>
                  <p className="text-xs text-slate-500 mb-2">{yr.data?.units} customers</p>
                  <div style={{ borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: 8, marginTop: 4 }}>
                    <p className="text-xs text-slate-400">Gross profit</p>
                    <p className="text-sm font-semibold" style={{ color: "hsl(155,65%,42%)" }}>{yr.data?.grossProfit}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Marketing: {yr.data?.marketingSpend}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target Sectors */}
        {plan.targetSectors?.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)" }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Target Sectors</h3>
            <div className="space-y-3">
              {plan.targetSectors.map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg" style={{ background: "rgba(15,23,42,0.025)", border: "1px solid rgba(15,23,42,0.06)" }}>
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: urgencyColor(s.urgency), marginTop: 4 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: urgencyColor(s.urgency) + "15",
                        color: urgencyColor(s.urgency),
                      }}>{s.urgency} priority</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-1">{s.description}</p>
                    <p className="text-xs" style={{ color: "rgba(15,23,42,0.4)" }}>Addressable buyers: {s.potentialCustomers}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Strategy */}
        {plan.pricingStrategy && (
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)" }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Pricing Strategy</h3>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold px-3 py-1.5 rounded-lg" style={{ background: "hsl(193,100%,92%)", color: "hsl(193,100%,30%)" }}>{plan.pricingStrategy.model}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{plan.pricingStrategy.rationale}</p>
            {plan.pricingStrategy.competitors?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-400 mb-2">Competitor pricing</p>
                <div className="flex flex-wrap gap-2">
                  {plan.pricingStrategy.competitors.map((c: any, i: number) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.08)", color: "rgba(15,23,42,0.6)" }}>
                      {c.name}: {c.price}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {plan.pricingStrategy.upsells?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Upsell opportunities</p>
                <div className="flex flex-wrap gap-2">
                  {plan.pricingStrategy.upsells.map((u: string, i: number) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "hsla(155,65%,42%,0.08)", color: "hsl(155,65%,35%)", border: "1px solid hsla(155,65%,42%,0.15)" }}>{u}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Marketing Plan */}
        {plan.marketingPlan && (
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marketing Plan</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "hsla(40,90%,50%,0.1)", color: "hsl(40,80%,40%)" }}>Budget: {plan.marketingPlan.monthlyBudget}/month</span>
            </div>
            {plan.marketingPlan.keyMessages?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-400 mb-2">Key messages</p>
                <div className="space-y-1.5">
                  {plan.marketingPlan.keyMessages.map((m: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs font-bold mt-0.5" style={{ color: "hsl(193,100%,40%)" }}>#{i + 1}</span>
                      <p className="text-xs text-slate-600">{m}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plan.marketingPlan.channels?.length > 0 && (
              <div className="space-y-2.5">
                {plan.marketingPlan.channels.map((ch: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.06)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-700">{ch.name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{ch.monthlySpend}/mo</span>
                        <span className="text-xs font-medium" style={{ color: "hsl(155,65%,42%)" }}>{ch.expectedLeadsPerMonth} leads/mo</span>
                      </div>
                    </div>
                    {ch.tactics?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ch.tactics.map((t: string, j: number) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.55)" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sales Strategy */}
        {plan.salesStrategy && (
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)" }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Sales Strategy</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-3" style={{ background: "rgba(15,23,42,0.03)" }}>
                <p className="text-xs text-slate-400 mb-1">Approach</p>
                <p className="text-sm font-semibold text-slate-800 capitalize">{plan.salesStrategy.approach}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(15,23,42,0.03)" }}>
                <p className="text-xs text-slate-400 mb-1">Sales cycle</p>
                <p className="text-sm font-semibold text-slate-800">{plan.salesStrategy.salesCycleLength}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(15,23,42,0.03)" }}>
                <p className="text-xs text-slate-400 mb-1">Conversion rate</p>
                <p className="text-sm font-semibold text-slate-800">{plan.salesStrategy.leadConversionRate}</p>
              </div>
            </div>
            {plan.salesStrategy.closingTactics?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Closing tactics</p>
                <div className="space-y-1">
                  {plan.salesStrategy.closingTactics.map((t: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "hsl(155,65%,42%)" }} />
                      <p className="text-xs text-slate-600">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Launch Plan */}
        {plan.launchPlan && (
          <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.09)" }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Launch Roadmap</h3>
            <div className="space-y-3 mb-4">
              {[
                { label: plan.launchPlan.phase1, phase: "Phase 1" },
                { label: plan.launchPlan.phase2, phase: "Phase 2" },
                { label: plan.launchPlan.phase3, phase: "Phase 3" },
              ].filter(p => p.label).map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white" style={{ background: "hsl(193,100%,40%)", fontSize: 10 }}>{i + 1}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{p.label}</p>
                </div>
              ))}
            </div>
            {plan.launchPlan.quickWins?.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: "hsla(40,90%,50%,0.06)", border: "1px solid hsla(40,90%,50%,0.15)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "hsl(40,80%,40%)" }}>Quick wins — get first customer fast</p>
                {plan.launchPlan.quickWins.map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 mt-1.5">
                    <Zap className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "hsl(40,80%,45%)" }} />
                    <p className="text-xs" style={{ color: "rgba(15,23,42,0.65)" }}>{w}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function FundingProjectTab({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [applyingScheme, setApplyingScheme] = useState<string | null>(null);
  const [applicationModal, setApplicationModal] = useState<{ scheme: string; text: string; streaming: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const base = getApiBase();
  const hdrs = () => ({ "Content-Type": "application/json", "x-lab-pin": pin });
  const appPanelRef = useRef<HTMLDivElement>(null);

  const runAnalysis = async () => {
    setRunning(true);
    setRunError("");
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/funding`, { method: "POST", headers: hdrs() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setRunError(err.error || `Error ${res.status} — please try again`);
        setRunning(false);
        return;
      }
      onUpdate({ ...project, fundingStatus: "pending" });
    } catch (e: any) {
      setRunError("Network error — please check your connection and try again");
    } finally {
      setRunning(false);
    }
  };

  const drafts: Record<string, { application: string; scheme: string; generatedAt: string }> = (() => {
    try { return project.fundingApplications ? JSON.parse(project.fundingApplications) : {}; } catch { return {}; }
  })();

  const autoApply = async (m: FundingMatch) => {
    const schemeKey = m.scheme.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    // If draft already exists, just open the modal
    if (drafts[schemeKey]) {
      setApplicationModal({ scheme: m.scheme, text: drafts[schemeKey].application, streaming: false });
      return;
    }
    setApplyingScheme(schemeKey);
    setApplicationModal({ scheme: m.scheme, text: "", streaming: true });

    try {
      const res = await fetch(`${base}lab/projects/${project.id}/apply`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ scheme: m.scheme, type: m.type, geography: m.geography, amount: m.amount, matchReason: m.matchReason, keyEvidence: m.keyEvidence, url: m.url, matchStrength: m.matchStrength }),
      });
      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.delta) { fullText += parsed.delta; setApplicationModal(prev => prev ? { ...prev, text: fullText } : null); }
            if (parsed.done) {
              setApplicationModal(prev => prev ? { ...prev, streaming: false } : null);
              // Update project with new draft
              const newDrafts = { ...drafts, [schemeKey]: { application: fullText, scheme: m.scheme, generatedAt: new Date().toISOString() } };
              onUpdate({ ...project, fundingApplications: JSON.stringify(newDrafts) });
            }
          } catch {}
        }
      }
    } catch {
      setApplicationModal(prev => prev ? { ...prev, text: (prev.text || "") + "\n\n[Error generating application — please try again]", streaming: false } : null);
    } finally {
      setApplyingScheme(null);
    }
  };

  const downloadApplication = (text: string, scheme: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scheme.replace(/[^a-zA-Z0-9]/g, "_")}_application.md`;
    a.click();
    URL.revokeObjectURL(url);
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
    strong: { label: "Strong Match", color: "hsl(155,70%,45%)", bg: "hsla(155,70%,45%,0.08)", border: "hsla(155,70%,45%,0.25)" },
    good:   { label: "Good Match", color: "hsl(45,100%,50%)", bg: "hsla(45,100%,50%,0.08)", border: "hsla(45,100%,50%,0.25)" },
    possible: { label: "Possible", color: "hsl(210,80%,60%)", bg: "hsla(210,80%,60%,0.08)", border: "hsla(210,80%,60%,0.25)" },
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

  // Auto-scroll application panel as text streams in
  useEffect(() => {
    if (applicationModal?.streaming && appPanelRef.current) {
      appPanelRef.current.scrollTop = appPanelRef.current.scrollHeight;
    }
  }, [applicationModal?.text, applicationModal?.streaming]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 relative">

      {/* Application draft modal — full-screen overlay */}
      {applicationModal && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(5,9,18,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="relative m-auto w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.12)", boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsla(155,70%,45%,0.12)" }}>
                  <FileText className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />
                </div>
                <div>
                  <p className="text-slate-800 font-semibold text-sm leading-tight">Funding Application Draft</p>
                  <p className="text-xs leading-tight" style={{ color: "rgba(15,23,42,0.4)" }}>{applicationModal.scheme}</p>
                </div>
                {applicationModal.streaming && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ml-2"
                    style={{ background: "hsla(155,70%,45%,0.1)", color: "hsl(155,70%,45%)" }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> Drafting…
                  </span>
                )}
                {!applicationModal.streaming && (
                  <span className="text-xs px-2.5 py-1 rounded-full ml-2"
                    style={{ background: "hsla(155,70%,45%,0.1)", color: "hsl(155,70%,55%)" }}>
                    ✓ Draft ready
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!applicationModal.streaming && (
                  <>
                    <button onClick={() => { navigator.clipboard.writeText(applicationModal.text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: copied ? "hsla(155,70%,45%,0.12)" : "#F1F5F9", color: copied ? "hsl(155,70%,45%)" : "rgba(15,23,42,0.65)", border: "1px solid rgba(15,23,42,0.09)" }}>
                      {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                    <button onClick={() => downloadApplication(applicationModal.text, applicationModal.scheme)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)" }}>
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </>
                )}
                <button onClick={() => setApplicationModal(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{ color: "rgba(15,23,42,0.4)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F1F5F9")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Application text */}
            <div ref={appPanelRef} className="flex-1 overflow-y-auto p-6">
              {applicationModal.text ? (
                <div className="prose prose-sm max-w-none"
                  style={{ fontFamily: "'Georgia', serif", lineHeight: 1.8, color: "rgba(15,23,42,0.85)" }}>
                  {applicationModal.text.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) return <h2 key={i} className="text-slate-800 font-bold text-base mt-6 mb-2 pb-1" style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>{line.slice(3)}</h2>;
                    if (line.startsWith("### ")) return <h3 key={i} className="text-slate-700 font-semibold text-sm mt-4 mb-1.5">{line.slice(4)}</h3>;
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-slate-800 text-sm mt-2">{line.slice(2, -2)}</p>;
                    if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm" style={{ color: "rgba(15,23,42,0.75)" }}>{line.slice(2)}</li>;
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i} className="text-sm mb-1.5" style={{ color: "rgba(15,23,42,0.75)" }}>{line}</p>;
                  })}
                  {applicationModal.streaming && <span className="animate-pulse" style={{ color: "hsl(155,70%,45%)" }}>▋</span>}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(155,70%,45%)" }} />
                  <p className="text-sm" style={{ color: "rgba(15,23,42,0.4)" }}>Generating your application…</p>
                </div>
              )}
            </div>

            {/* Footer note */}
            {!applicationModal.streaming && (
              <div className="px-5 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(15,23,42,0.06)", background: "#F8FAFC" }}>
                <p className="text-xs" style={{ color: "rgba(15,23,42,0.6)" }}>
                  This is an AI-drafted document. Review all details and consult your R&D advisor or accountant before formal submission.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />
            <span className="text-slate-800 font-semibold text-sm">Funding Intelligence</span>
            {isPending && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "hsla(45,100%,50%,0.12)", color: "hsl(45,100%,60%)" }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Analysing…
            </span>}
            {hasResults && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsla(155,70%,45%,0.12)", color: "hsl(155,70%,55%)" }}>
              {matches.length} opportunit{matches.length === 1 ? "y" : "ies"}
            </span>}
          </div>
          <p className="text-xs" style={{ color: "rgba(15,23,42,0.6)" }}>
            {analysedAt ? `Last analysed ${analysedAt}` : "Auto-runs when Brief or Specs are saved"}
          </p>
        </div>
        <button onClick={runAnalysis} disabled={running || isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: running || isPending ? "#F1F5F9" : "hsl(155,70%,38%)", color: running || isPending ? "rgba(15,23,42,0.4)" : "white", border: "1px solid hsla(155,70%,45%,0.3)", opacity: running || isPending ? 0.6 : 1 }}>
          {running || isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</> : <><RefreshCw className="w-3 h-3" /> Re-run</>}
        </button>
      </div>

      {/* API/network error from clicking Run */}
      {runError && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "hsla(0,70%,55%,0.08)", border: "1px solid hsla(0,70%,55%,0.2)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(0,70%,55%)" }} />
          <p className="text-xs" style={{ color: "hsl(0,70%,40%)" }}>{runError}</p>
        </div>
      )}

      {/* Pending state */}
      {isPending && !hasResults && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsla(45,100%,50%,0.1)", border: "1px solid hsla(45,100%,50%,0.2)" }}>
            <Globe className="w-6 h-6 animate-pulse" style={{ color: "hsl(45,100%,55%)" }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-slate-800 text-sm font-medium">Scanning 20+ funding programmes…</p>
            <p className="text-xs" style={{ color: "rgba(15,23,42,0.6)" }}>UK RDEC · Innovate UK · Horizon Europe · US R&D Credit · SR&ED · CIR · and more</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertCircle className="w-8 h-8" style={{ color: "hsl(0,70%,60%)" }} />
          <p className="text-slate-500 text-sm">Analysis failed. Try re-running.</p>
        </div>
      )}

      {/* Empty state */}
      {!isPending && !isError && !hasResults && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
            <BadgeCheck className="w-7 h-7" style={{ color: "hsl(155,70%,45%)" }} />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-slate-800 font-medium text-sm">No analysis yet</p>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: "rgba(15,23,42,0.6)" }}>
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
        <div className="rounded-xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.62)" }}>{summary}</p>
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
              { label: "Drafted", value: Object.keys(drafts).length, color: "hsl(45,100%,50%)" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.6)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {matches.map((m, i) => {
            const st = STRENGTH[m.matchStrength] || STRENGTH.possible;
            const geo = m.geography?.split(" / ") ?? [m.geography];
            const schemeKey = m.scheme.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
            const hasDraft = !!drafts[schemeKey];
            const isGenerating = applyingScheme === schemeKey;
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${st.border}`, background: st.bg }}>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {geo.map(g => (
                          <span key={g} className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${GEO_COLORS[g] || "hsl(280,60%,60%)"}22`, color: GEO_COLORS[g] || "hsl(280,60%,60%)" }}>{g}</span>
                        ))}
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(15,23,42,0.09)", color: "rgba(15,23,42,0.45)" }}>{TYPE_LABELS[m.type] || m.type}</span>
                        {hasDraft && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "hsla(155,70%,45%,0.12)", color: "hsl(155,70%,45%)" }}>✓ Draft ready</span>}
                      </div>
                      <p className="text-slate-800 font-semibold text-sm leading-snug">{m.scheme}</p>
                      <p className="text-xs mt-0.5" style={{ color: st.color }}>{st.label} · {m.amount}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed mb-2.5" style={{ color: "rgba(15,23,42,0.67)" }}>{m.matchReason}</p>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex gap-2 text-xs">
                      <span style={{ color: "rgba(15,23,42,0.6)", flexShrink: 0 }}>Evidence needed:</span>
                      <span style={{ color: "rgba(15,23,42,0.58)" }}>{m.keyEvidence}</span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
                    {/* Auto-apply button */}
                    <button onClick={() => autoApply(m)} disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: hasDraft ? "hsla(155,70%,45%,0.12)" : "hsl(155,70%,38%)", color: hasDraft ? "hsl(155,70%,45%)" : "white", border: `1px solid ${hasDraft ? "hsla(155,70%,45%,0.3)" : "hsla(155,70%,45%,0.3)"}`, opacity: isGenerating ? 0.7 : 1 }}>
                      {isGenerating ? <><Loader2 className="w-3 h-3 animate-spin" /> Drafting…</> : hasDraft ? <><FileText className="w-3 h-3" /> View Application</> : <><Zap className="w-3 h-3" /> Auto-Draft Application</>}
                    </button>

                    {m.url && (
                      <a href={m.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-75"
                        style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.55)", border: "1px solid rgba(15,23,42,0.09)" }}>
                        <ExternalLink className="w-3 h-3" /> Official site
                      </a>
                    )}
                  </div>
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
  const [savingProject, setSavingProject] = useState(false);
  const [savedProject, setSavedProject] = useState<{ id: number; name: string } | null>(null);
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

  const saveAsProject = async () => {
    setSavingProject(true);
    setSavedProject(null);
    try {
      // Extract a project name from the description (first ~6 words)
      const words = description.trim().split(/\s+/);
      const shortName = words.slice(0, 6).join(" ");
      const projectName = `Bot: ${shortName}${words.length > 6 ? "…" : ""}`;

      const res = await fetch(`${base}lab/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({
          name: projectName,
          industry: industry || "General",
          brief: `## Bot Description\n${description}\n\n## Platforms\n${platforms || "Not specified"}\n\n## Full Bot Architecture\n\n${output}`,
          phase: "design",
          status: "active",
        }),
      });
      if (res.ok) {
        const proj = await res.json();
        setSavedProject({ id: proj.id, name: proj.name });
      }
    } catch {}
    setSavingProject(false);
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Config */}
      <div className="w-80 border-r flex-shrink-0 flex flex-col"
        style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F5F7FF" }}>
        <div className="p-5 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(280,70%,50%), hsl(220,70%,50%))" }}>
              <Bot className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-sm">Bot Lab</h2>
              <p className="text-slate-400 text-xs">Design any automation bot</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Describe the bot</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!streaming && description.trim()) design(); } }}
                placeholder="What should this bot do? Be specific about inputs, outputs, and triggers..."
                className="w-full px-3 py-2.5 rounded-xl text-slate-800 text-xs placeholder-slate-400 resize-none outline-none"
                style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.09)" }} />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-slate-800 text-xs outline-none"
                style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.09)" }}>
                {INDUSTRIES.map(i => <option key={i} value={i} style={{ background: "#F8FAFC" }}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 block">Platforms / Systems involved</label>
              <input value={platforms} onChange={e => setPlatforms(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !streaming && description.trim()) design(); }}
                placeholder="e.g. Gmail, Xero, Slack, Shopify..."
                className="w-full px-3 py-2 rounded-xl text-slate-800 text-xs placeholder-slate-400 outline-none"
                style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.09)" }} />
            </div>
            <button onClick={design} disabled={streaming || !description.trim()}
              className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(280,70%,50%), hsl(220,70%,50%))", color: "white", opacity: streaming || !description.trim() ? 0.4 : 1 }}>
              {streaming ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Designing...</> : <><Zap className="w-3.5 h-3.5" /> Design This Bot</>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-slate-300 text-xs mb-3">Try these examples:</p>
          <div className="space-y-2">
            {BOT_EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setDescription(ex)}
                className="w-full text-left text-xs p-2.5 rounded-xl transition-all hover:bg-slate-900/5"
                style={{ color: "rgba(15,23,42,0.5)", lineHeight: "1.5" }}>
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
            <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-2 flex-wrap">
              <span className="text-slate-400 text-xs">Bot Architecture</span>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setOutput(""); setDescription(""); setSavedProject(null); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.45)" }}>
                  <RotateCcw className="w-3 h-3" /> New
                </button>
                <button onClick={copyOutput}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: copied ? "hsl(155,70%,40%)" : "#F1F5F9", color: copied ? "white" : "rgba(15,23,42,0.45)" }}>
                  <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy all"}
                </button>
                {savedProject ? (
                  <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "hsl(155,70%,40%)", color: "white" }}>
                    ✓ Saved as "{savedProject.name}"
                  </span>
                ) : (
                  <button onClick={saveAsProject} disabled={savingProject}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: "hsl(280,70%,50%)", color: "white", opacity: savingProject ? 0.6 : 1 }}>
                    {savingProject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    {savingProject ? "Saving…" : "Save as Project"}
                  </button>
                )}
              </div>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
              <LabMarkdown content={output} streaming={streaming} />
            </div>
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-xs">
              <Bot className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm font-medium mb-2">Bot Architecture Designer</p>
              <p className="text-slate-300 text-xs leading-relaxed">Describe any automation task and get a complete, production-ready bot design with code, architecture, APIs, costs, and deployment instructions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type SocialPosts = { linkedin?: string; twitter?: string; instagram?: string; facebook?: string; pressRelease?: string; [key: string]: string | undefined };
type MediaOutlet = { id: number; name: string; type: string; categories: string[]; url: string; submitUrl: string; region: string; description: string; audience: string };

const LAUNCH_PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", icon: "💼", charLimit: 3000 },
  { key: "twitter", label: "Twitter / X", icon: "🐦", charLimit: 280 },
  { key: "instagram", label: "Instagram", icon: "📸", charLimit: 2200 },
  { key: "facebook", label: "Facebook", icon: "👥", charLimit: 63206 },
  { key: "pressRelease", label: "Press Release", icon: "📰", charLimit: 99999 },
];

function LaunchPanel({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [posts, setPosts] = useState<SocialPosts>(() => { try { return JSON.parse(project.socialPosts || "{}"); } catch { return {}; } });
  const [platforms, setPlatforms] = useState<string[]>(() => { try { return JSON.parse(project.launchPlatforms || '["linkedin","twitter"]'); } catch { return ["linkedin","twitter"]; } });
  const [launchStatus, setLaunchStatus] = useState(project.launchStatus || "draft");
  const [generating, setGenerating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [outlets, setOutlets] = useState<MediaOutlet[]>([]);
  const [savedOutletIds, setSavedOutletIds] = useState<number[]>([]);
  const [activePost, setActivePost] = useState("linkedin");
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const base = getApiBase();

  // Payment link state
  const [paymentLink, setPaymentLink] = useState(project.stripePaymentLink || "");
  const [sellPrice, setSellPrice] = useState(project.sellPrice ? String(project.sellPrice / 100) : "");
  const [sellPriceType, setSellPriceType] = useState(project.sellPriceType || "one_time");
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [paymentLinkError, setPaymentLinkError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const generatePaymentLink = async () => {
    const priceGbp = parseFloat(sellPrice);
    if (isNaN(priceGbp) || priceGbp < 1) { setPaymentLinkError("Enter a price of at least £1"); return; }
    setPaymentLinkLoading(true); setPaymentLinkError("");
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/stripe-launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ sellPrice: Math.round(priceGbp * 100), sellPriceType }),
      });
      const data = await res.json();
      if (!res.ok) { setPaymentLinkError(data.error || "Failed to create payment link"); return; }
      setPaymentLink(data.paymentLink);
      onUpdate({ ...project, stripePaymentLink: data.paymentLink, sellPrice: data.sellPrice, sellPriceType: data.sellPriceType, stripeProductId: data.productId, stripePriceId: data.priceId });
    } catch (e: any) { setPaymentLinkError(e.message || "Network error"); }
    setPaymentLinkLoading(false);
  };

  const removePaymentLink = async () => {
    setPaymentLinkLoading(true);
    try {
      await fetch(`${base}lab/projects/${project.id}/stripe-launch`, { method: "DELETE", headers: { "x-lab-pin": pin } });
      setPaymentLink(""); setSellPrice(""); setSellPriceType("one_time");
      onUpdate({ ...project, stripePaymentLink: "", sellPrice: null, sellPriceType: "", stripeProductId: "", stripePriceId: "" });
    } catch {}
    setPaymentLinkLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
  };

  const hasPosts = Object.keys(posts).length > 0 && Object.values(posts).some(v => v && v.length > 0);

  const generatePosts = async () => {
    setGenerating(true); setError("");
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/social-posts/generate`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to generate posts"); }
      else {
        setPosts(data.posts || {}); setLaunchStatus("draft");
        onUpdate({ ...project, socialPosts: JSON.stringify(data.posts), launchStatus: "draft" });
      }
    } catch { setError("Network error — please try again"); }
    setGenerating(false);
  };

  const savePosts = async (updatedPosts: SocialPosts, updatedStatus?: string) => {
    setSaving(true);
    try {
      await fetch(`${base}lab/projects/${project.id}/social-posts`, {
        method: "PUT", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ posts: updatedPosts, platforms, launchStatus: updatedStatus ?? launchStatus }),
      });
      onUpdate({ ...project, socialPosts: JSON.stringify(updatedPosts), launchPlatforms: JSON.stringify(platforms), launchStatus: updatedStatus ?? launchStatus });
    } catch {}
    setSaving(false);
  };

  const matchOutlets = async () => {
    setMatching(true); setError("");
    try {
      const res = await fetch(`${base}lab/projects/${project.id}/media-match`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      });
      const data = await res.json();
      if (res.ok) setOutlets(Array.isArray(data) ? data : (data.outlets || []));
      else setError(data.error || "Failed to match outlets");
    } catch { setError("Network error"); }
    setMatching(false);
  };

  const copyPost = (key: string) => {
    const text = posts[key] || "";
    navigator.clipboard.writeText(text);
    setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadLaunchPack = () => {
    const lines: string[] = [`# ${project.name} — Launch Pack\n`];
    LAUNCH_PLATFORMS.forEach(p => {
      if (posts[p.key]) lines.push(`## ${p.label}\n\n${posts[p.key]}\n\n---\n`);
    });
    if (outlets.length > 0) {
      lines.push("## Matched Media Outlets\n");
      outlets.forEach(o => lines.push(`- **${o.name}** (${o.region}) — ${o.description}\n  Submit: ${o.submitUrl}\n`));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/\s+/g, "-")}-launch-pack.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const togglePlatform = (key: string) => {
    const next = platforms.includes(key) ? platforms.filter(p => p !== key) : [...platforms, key];
    setPlatforms(next);
  };

  const currentPost = posts[activePost] || "";
  const charLimit = LAUNCH_PLATFORMS.find(p => p.key === activePost)?.charLimit || 99999;
  const isOverLimit = currentPost.length > charLimit;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4" style={{ color: "hsl(193,100%,45%)" }} />
          <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>Launch Centre</span>
          {launchStatus === "approved" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "hsl(155,70%,92%)", color: "hsl(155,60%,35%)" }}>Approved</span>
          )}
          {launchStatus === "draft" && hasPosts && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsl(45,100%,95%)", color: "hsl(45,80%,35%)" }}>Draft</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs" style={{ color: "rgba(15,23,42,0.6)" }}>Saving…</span>}
          {hasPosts && (
            <>
              <button onClick={downloadLaunchPack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all" style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.6)", border: "1px solid rgba(15,23,42,0.09)" }}>
                <Download className="w-3 h-3" /> Launch Pack
              </button>
              {launchStatus !== "approved" && (
                <button onClick={() => { setLaunchStatus("approved"); savePosts(posts, "approved"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-800 transition-all"
                  style={{ background: "hsl(155,70%,42%)" }}>
                  <Check className="w-3 h-3" /> Approve All
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Go Live with Payments ────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: "rgba(15,23,42,0.07)", background: paymentLink ? "hsl(155,60%,97%)" : "#F8FAFC" }}>
        {paymentLink ? (
          /* Payment link is live */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(155,70%,42%)" }}>
                <span className="text-white text-xs">£</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">Payment Link Live</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {project.sellPriceType === "monthly" ? `£${(project.sellPrice! / 100).toFixed(2)}/month` : project.sellPriceType === "yearly" ? `£${(project.sellPrice! / 100).toFixed(2)}/year` : `£${(project.sellPrice! / 100).toFixed(2)} one-time`}
                  {" · "}{paymentLink.replace("https://", "").slice(0, 30)}…
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={copyLink}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: linkCopied ? "hsl(155,70%,92%)" : "#F1F5F9", color: linkCopied ? "hsl(155,60%,35%)" : "rgba(15,23,42,0.6)", border: "1px solid rgba(15,23,42,0.09)" }}>
                {linkCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
              </button>
              <a href={paymentLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: "hsl(155,70%,42%)", color: "white" }}>
                <ExternalLink className="w-3 h-3" /> Open
              </a>
              <button onClick={removePaymentLink} disabled={paymentLinkLoading}
                className="text-xs px-2 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.4)", border: "1px solid rgba(15,23,42,0.09)" }}>
                {paymentLinkLoading ? "…" : "Change"}
              </button>
            </div>
          </div>
        ) : (
          /* No payment link yet — show setup form */
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "hsl(45,100%,92%)" }}>
                <span className="text-sm">£</span>
              </div>
              <p className="text-xs font-semibold text-slate-700">Go Live with Payments</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(45,100%,92%)", color: "hsl(45,80%,35%)" }}>Real Stripe link</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(15,23,42,0.12)", background: "white" }}>
                <span className="px-2 text-xs text-slate-500 border-r" style={{ borderColor: "rgba(15,23,42,0.12)", lineHeight: "28px" }}>£</span>
                <input
                  type="number" min="1" step="0.01"
                  value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                  placeholder="49.00"
                  className="w-20 px-2 py-1.5 text-xs text-slate-800 outline-none bg-transparent"
                />
              </div>
              <select value={sellPriceType} onChange={e => setSellPriceType(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg outline-none text-slate-700"
                style={{ border: "1px solid rgba(15,23,42,0.12)", background: "white" }}>
                <option value="one_time">One-time</option>
                <option value="monthly">Per month</option>
                <option value="yearly">Per year</option>
              </select>
              <button onClick={generatePaymentLink} disabled={paymentLinkLoading || !sellPrice}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                style={{ background: sellPrice ? "hsl(193,100%,35%)" : "#F1F5F9", color: sellPrice ? "white" : "rgba(15,23,42,0.35)", opacity: paymentLinkLoading ? 0.6 : 1 }}>
                {paymentLinkLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Creating…</> : "Generate Stripe Link"}
              </button>
              {paymentLinkError && <span className="text-[10px]" style={{ color: "hsl(0,70%,55%)" }}>{paymentLinkError}</span>}
            </div>
            <p className="text-[10px] text-slate-300 mt-1.5">Creates a permanent, shareable Stripe checkout link. Share it anywhere — your site, email, social media.</p>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Platform selector + post editor */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {!hasPosts ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center flex-1 px-8 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(193,100%,95%)" }}>
                <Rocket className="w-7 h-7" style={{ color: "hsl(193,100%,38%)" }} />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: "#0F172A" }}>Ready to launch?</p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.45)" }}>
                  Sirius will write platform-specific posts for LinkedIn, Twitter/X, Instagram, Facebook and a full press release — tailored to {project.name}.
                </p>
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "hsl(0,100%,97%)", color: "hsl(0,70%,50%)" }}>{error}</p>}
              <button onClick={generatePosts} disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-slate-800 font-medium transition-all"
                style={{ background: "hsl(193,100%,35%)", opacity: generating ? 0.6 : 1 }}>
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating posts…</> : <><Sparkles className="w-4 h-4" /> Generate Launch Posts</>}
              </button>
              {!project.brief && !project.pitch && (
                <p className="text-xs" style={{ color: "rgba(15,23,42,0.55)" }}>Tip: Add a project brief or pitch first for best results</p>
              )}
            </div>
          ) : (
            <>
              {/* Platform tabs */}
              <div className="flex border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
                {LAUNCH_PLATFORMS.map(p => (
                  <button key={p.key} onClick={() => setActivePost(p.key)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap flex-shrink-0 border-b-2 transition-all"
                    style={{
                      borderBottomColor: activePost === p.key ? "hsl(193,100%,40%)" : "transparent",
                      color: activePost === p.key ? "hsl(193,100%,38%)" : "rgba(15,23,42,0.5)",
                      fontWeight: activePost === p.key ? 600 : 400,
                    }}>
                    <span>{p.icon}</span> {p.label}
                    {posts[p.key] && <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: "hsl(155,70%,52%)", display: "inline-block" }} />}
                  </button>
                ))}
              </div>

              {/* Post editor */}
              <div className="flex-1 flex flex-col min-h-0 p-4 gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "rgba(15,23,42,0.4)" }}>
                    {LAUNCH_PLATFORMS.find(p => p.key === activePost)?.icon} {LAUNCH_PLATFORMS.find(p => p.key === activePost)?.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: isOverLimit ? "hsl(0,70%,55%)" : "rgba(15,23,42,0.55)" }}>
                      {currentPost.length}{charLimit < 99999 ? ` / ${charLimit}` : ""}
                    </span>
                    <button onClick={() => copyPost(activePost)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all"
                      style={{ background: copiedKey === activePost ? "hsl(155,70%,92%)" : "#F1F5F9", color: copiedKey === activePost ? "hsl(155,60%,35%)" : "rgba(15,23,42,0.55)", border: "1px solid rgba(15,23,42,0.09)" }}>
                      {copiedKey === activePost ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>
                <textarea
                  value={currentPost}
                  onChange={e => { const next = { ...posts, [activePost]: e.target.value }; setPosts(next); }}
                  onBlur={() => savePosts(posts)}
                  className="flex-1 p-3 rounded-xl resize-none outline-none text-sm leading-relaxed"
                  style={{
                    background: "#F8FAFC", border: `1px solid ${isOverLimit ? "hsl(0,100%,80%)" : "rgba(15,23,42,0.09)"}`,
                    color: "#0F172A", fontFamily: activePost === "pressRelease" ? "inherit" : "inherit",
                    minHeight: "180px",
                  }}
                />
              </div>

              {/* Regenerate row */}
              <div className="px-4 pb-3 flex-shrink-0 flex items-center gap-2">
                <button onClick={generatePosts} disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.6)", border: "1px solid rgba(15,23,42,0.09)", opacity: generating ? 0.5 : 1 }}>
                  {generating ? <><Loader2 className="w-3 h-3 animate-spin" /> Regenerating…</> : <><Sparkles className="w-3 h-3" /> Regenerate All</>}
                </button>
                {error && <span className="text-xs" style={{ color: "hsl(0,70%,50%)" }}>{error}</span>}
              </div>
            </>
          )}
        </div>

        {/* Right: Media outlets panel */}
        <div className="w-60 border-l flex flex-col flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
          <div className="px-3 py-2.5 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,45%)" }} />
              <span className="text-xs font-semibold" style={{ color: "#0F172A" }}>Media Targets</span>
            </div>
            <button onClick={matchOutlets} disabled={matching}
              className="text-xs px-2 py-1 rounded-lg transition-all"
              style={{ background: "hsl(193,100%,35%)", color: "white", opacity: matching ? 0.5 : 1 }}>
              {matching ? "…" : outlets.length > 0 ? "Refresh" : "Match"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {outlets.length === 0 && !matching ? (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-2">
                <Globe className="w-6 h-6" style={{ color: "rgba(15,23,42,0.45)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.6)" }}>
                  Match relevant media outlets for {project.industry || "your industry"} — press, journals, and trade publications to pitch.
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {outlets.map(o => {
                  const saved = savedOutletIds.includes(o.id);
                  return (
                    <div key={o.id} className="p-2.5 rounded-xl" style={{ background: saved ? "hsl(193,60%,97%)" : "#F8FAFC", border: `1px solid ${saved ? "hsl(193,60%,86%)" : "rgba(15,23,42,0.07)"}` }}>
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <a href={o.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-semibold hover:underline flex-1 leading-tight"
                          style={{ color: "hsl(193,100%,35%)" }}>{o.name}</a>
                        <span className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.45)" }}>{o.region}</span>
                      </div>
                      <p className="text-xs mb-1.5 leading-snug" style={{ color: "rgba(15,23,42,0.5)" }}>{o.description}</p>
                      <div className="flex items-center justify-between">
                        <a href={o.submitUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs hover:underline"
                          style={{ color: "hsl(193,100%,40%)" }}>Submit →</a>
                        <button onClick={() => setSavedOutletIds(prev => prev.includes(o.id) ? prev.filter(x => x !== o.id) : [...prev, o.id])}
                          className="text-xs px-1.5 py-0.5 rounded-lg transition-all"
                          style={{ background: saved ? "hsl(193,100%,35%)" : "rgba(15,23,42,0.06)", color: saved ? "white" : "rgba(15,23,42,0.5)" }}>
                          {saved ? "✓" : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoutPanel({ pin }: { pin: string }) {
  const [chatInput, setChatInput] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [focus, setFocus] = useState("full");
  const [streaming, setStreaming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ScoutReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const base = getApiBase();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [output]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`${base}lab/scout/reports`, { headers: { "x-lab-pin": pin } });
      if (res.ok) setReports(await res.json());
    } catch {}
  }, [base, pin]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const run = async (overrideQuery?: string) => {
    const q = overrideQuery ?? chatInput;
    if (!q.trim() && industries.length === 0) return;
    if (streaming) return;
    setStreaming(true); setSearching(false); setOutput(""); setError(null);
    let result = "";
    try {
      const res = await fetch(`${base}lab/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ query: q, industries, focus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }
      if (!res.body) throw new Error("No response stream received");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === "searching") setSearching(true);
              if (d.content) { setSearching(false); result += d.content; setOutput(result); }
              if (d.error) throw new Error(d.error);
            } catch (parseErr: any) {
              if (parseErr.message && !parseErr.message.includes("JSON")) throw parseErr;
            }
          }
        }
      }
      if (!result) setError("Scout returned no results — try a more specific query");
    } catch (err: any) {
      setError(err.message || "Scout failed — please try again");
    }
    setStreaming(false); setSearching(false);
    loadReports();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); }
  };

  const toggleIndustry = (ind: string) => setIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  const focusMode = SCOUT_MODES.find(m => m.id === focus) ?? SCOUT_MODES[0];

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left sidebar — filters + history */}
      <div className="w-64 border-r flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F5F7FF" }}>
        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${focusMode.color}, hsl(226,70%,50%))` }}>
              <Telescope className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-xs">Opportunity Scout</h2>
              <p className="text-slate-400 text-[10px]">Find what's worth building</p>
            </div>
          </div>

          {/* Scan type */}
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-2 font-medium">Scan type</p>
          <div className="space-y-1 mb-4">
            {SCOUT_MODES.map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => setFocus(m.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left"
                  style={{
                    background: focus === m.id ? "#E8EEF5" : "transparent",
                    border: focus === m.id ? `1px solid ${m.color}40` : "1px solid transparent"
                  }}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: focus === m.id ? m.color : "#F1F5F9" }}>
                    <Icon className="w-2.5 h-2.5" style={{ color: focus === m.id ? "white" : "rgba(15,23,42,0.4)" }} />
                  </div>
                  <p className="text-slate-700 text-xs font-medium">{m.label}</p>
                </button>
              );
            })}
          </div>

          {/* Industry filters */}
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-2 w-full hover:text-slate-500 transition-colors">
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            Industries {industries.length > 0 && <span className="ml-auto bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{industries.length}</span>}
          </button>
          {showFilters && (
            <div className="flex flex-wrap gap-1 mb-4">
              {INDUSTRIES.slice(0, 16).map(ind => (
                <button key={ind} onClick={() => toggleIndustry(ind)}
                  className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                  style={{
                    background: industries.includes(ind) ? focusMode.color : "#F1F5F9",
                    color: industries.includes(ind) ? "white" : "rgba(15,23,42,0.45)",
                    border: industries.includes(ind) ? "none" : "1px solid rgba(15,23,42,0.09)"
                  }}>
                  {ind}
                </button>
              ))}
            </div>
          )}

          {/* History */}
          {reports.length > 0 && (
            <div className="mt-2">
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-medium w-full hover:text-slate-500 transition-colors">
                <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                History ({reports.length})
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1">
                  {reports.map(r => (
                    <button key={r.id} onClick={() => setOutput(r.opportunity)}
                      className="w-full text-left px-2.5 py-2 rounded-lg transition-all hover:bg-slate-900/5"
                      style={{ border: "1px solid rgba(15,23,42,0.06)" }}>
                      <p className="text-slate-500 text-[10px] font-medium truncate">{r.title}</p>
                      <p className="text-slate-300 text-[10px]">{new Date(r.createdAt).toLocaleDateString("en-GB")}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main area — results + chat input */}
      <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F8FAFC" }}>
        {/* Results scroll area */}
        <div className="flex-1 overflow-y-auto p-5">
          {searching && !output && (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <div className="flex flex-col items-center gap-3">
                <Globe className="w-8 h-8 animate-pulse" style={{ color: "hsl(193,100%,55%)" }} />
                <p className="text-xs font-medium" style={{ color: "hsl(193,100%,55%)" }}>Scouting the web…</p>
              </div>
            </div>
          )}

          {error && !streaming && (
            <div className="mb-4 px-4 py-3 rounded-xl flex items-start gap-2.5"
              style={{ background: "hsl(0,70%,96%)", border: "1px solid hsl(0,70%,88%)" }}>
              <span className="text-red-400 text-sm mt-0.5">⚠</span>
              <div>
                <p className="text-red-700 text-xs font-medium">{error}</p>
                <button onClick={() => run()} className="text-red-400 text-[10px] underline mt-1">Try again</button>
              </div>
            </div>
          )}

          {output ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs">{focusMode.label} results</span>
                <button onClick={() => { setOutput(""); setError(null); }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.45)" }}>
                  <RotateCcw className="w-3 h-3" /> New scout
                </button>
              </div>
              <div className="rounded-2xl p-5 leading-relaxed"
                style={{ background: "white", border: "1px solid rgba(15,23,42,0.07)" }}>
                <LabMarkdown content={output} streaming={streaming} />
              </div>
            </>
          ) : !searching && !error ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center max-w-sm">
                <Telescope className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 text-sm font-medium mb-2">What should I scout for?</p>
                <p className="text-slate-300 text-xs leading-relaxed">Type what you're looking for below — automation opportunities, market gaps, broken products to improve, or trend-driven plays. I'll search across forums, reviews, job boards, and market data.</p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                  {["automation bots for accountants", "gaps in vet software", "UK manufacturing pain points", "AI in emerging markets"].map(s => (
                    <button key={s} onClick={() => { setChatInput(s); run(s); }}
                      className="text-[10px] px-2.5 py-1 rounded-full transition-all"
                      style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.5)", border: "1px solid rgba(15,23,42,0.09)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {/* Chat input bar at the bottom */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2"
          style={{ borderTop: "1px solid rgba(15,23,42,0.07)", background: "white" }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.09)" }}>
            <textarea
              ref={inputRef}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              placeholder="What opportunities should I scout for? e.g. 'automation gaps in legal firms'"
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-slate-800 text-xs placeholder-slate-400 leading-relaxed"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={() => run()}
              disabled={streaming || (!chatInput.trim() && industries.length === 0)}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: (streaming || (!chatInput.trim() && industries.length === 0)) ? "#F1F5F9" : focusMode.color,
                color: (streaming || (!chatInput.trim() && industries.length === 0)) ? "rgba(15,23,42,0.25)" : "white",
              }}>
              {streaming
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-slate-300 text-[10px] mt-1.5 text-center">Shift+Enter for new line · Enter to scout</p>
        </div>
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
      style={{ background: "#F1F5F9", border: `1px solid ${d.isRead ? "rgba(15,23,42,0.07)" : catColor + "40"}`, opacity: d.isRead ? 0.85 : 1 }}>
      <div className="p-4 cursor-pointer" onClick={handleExpand}>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: d.isRead ? "rgba(15,23,42,0.15)" : catColor }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: catColor + "25", color: catColor }}>{d.category}</span>
              {d.sourceType && <span className="text-xs text-slate-300">{SOURCE_TYPE_LABELS[d.sourceType] || d.sourceType}</span>}
              {!d.isRead && <span className="text-xs text-slate-400 italic">New</span>}
            </div>
            <h3 className="text-slate-800 text-sm font-semibold leading-tight mb-1">{d.title}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{d.summary}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}>
            <div className="px-4 pb-4 space-y-3">
              <div className="h-px" style={{ background: "rgba(15,23,42,0.07)" }} />

              {d.detail && (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1.5">Detail</p>
                  <p className="text-slate-600 text-xs leading-relaxed">{d.detail}</p>
                </div>
              )}

              {d.applicability && (
                <div className="rounded-xl p-3" style={{ background: catColor + "12", border: `1px solid ${catColor}25` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3 h-3" style={{ color: catColor }} />
                    <p className="text-xs font-medium" style={{ color: catColor }}>How Sirius can use this</p>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{d.applicability}</p>
                </div>
              )}

              {d.source && (
                <p className="text-slate-300 text-xs">Source: {d.source}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => patch({ isSaved: !d.isSaved })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: d.isSaved ? catColor + "25" : "#E8EEF5", color: d.isSaved ? catColor : "rgba(15,23,42,0.45)" }}>
                  {d.isSaved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                  {d.isSaved ? "Saved" : "Save"}
                </button>
                <button onClick={() => patch({ isRead: !d.isRead })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "#E8EEF5", color: "rgba(15,23,42,0.45)" }}>
                  {d.isRead ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {d.isRead ? "Mark unread" : "Mark read"}
                </button>
                <button onClick={() => onDelete(d.id)}
                  className="ml-auto flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all"
                  style={{ color: "rgba(15,23,42,0.45)" }}>
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
        style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F5F7FF" }}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(210,80%,55%), hsl(280,70%,50%))" }}>
              <Atom className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-sm">AI Intelligence</h2>
              <p className="text-slate-400 text-xs">Live discovery feed</p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Total", value: stats.total, color: "rgba(15,23,42,0.55)" },
                { label: "Unread", value: stats.unread, color: "hsl(45,100%,55%)" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-2.5 text-center"
                  style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <p className="font-bold text-lg leading-none" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
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
            <p className="text-slate-300 text-xs text-center mb-4">
              Last: {new Date(stats.lastSweep.startedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {" · "}{stats.lastSweep.itemsFound} found
            </p>
          )}

          {showSweepLog && sweepLog.length > 0 && (
            <div ref={sweepLogRef}
              className="rounded-xl p-3 mb-4 max-h-32 overflow-y-auto space-y-1"
              style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
              {sweepLog.map((l, i) => (
                <p key={i} className="text-slate-500 text-xs leading-relaxed">{l}</p>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <p className="text-slate-300 text-xs uppercase tracking-wider">Filter</p>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: filterSaved ? "Saved ✓" : "Saved", active: filterSaved, action: () => setFilterSaved(!filterSaved) },
                { label: filterUnread ? "Unread ✓" : "Unread", active: filterUnread, action: () => setFilterUnread(!filterUnread) },
              ].map(f => (
                <button key={f.label} onClick={f.action}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{ background: f.active ? "hsl(210,80%,50%)" : "#F1F5F9", color: f.active ? "white" : "rgba(15,23,42,0.45)", border: f.active ? "none" : "1px solid rgba(15,23,42,0.07)" }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div>
              <p className="text-slate-300 text-xs mb-1.5">Category</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setFilterCategory("all")}
                  className="text-xs px-2 py-0.5 rounded-full transition-all"
                  style={{ background: filterCategory === "all" ? "rgba(15,23,42,0.1)" : "transparent", color: filterCategory === "all" ? "rgba(15,23,42,0.85)" : "rgba(15,23,42,0.5)" }}>
                  All
                </button>
                {categories.map(cat => {
                  const color = CATEGORY_COLORS[cat] || "hsl(193,100%,35%)";
                  return (
                    <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                      className="text-xs px-2 py-0.5 rounded-full transition-all"
                      style={{
                        background: filterCategory === cat ? color + "30" : "transparent",
                        color: filterCategory === cat ? color : "rgba(15,23,42,0.4)",
                        border: filterCategory === cat ? `1px solid ${color}50` : "1px solid transparent"
                      }}>
                      {cat}
                      <span className="ml-1 text-slate-300">{stats?.categories[cat]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {discoveries.length > 0 && stats && stats.unread > 0 && (
            <button onClick={markAllRead} className="w-full mt-4 py-1.5 rounded-xl text-xs text-slate-400 transition-all hover:text-slate-500"
              style={{ background: "#FFFFFF" }}>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Right: feed */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading feed...</span>
            </div>
          </div>
        ) : discoveries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Atom className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm font-medium mb-2">No discoveries yet</p>
              <p className="text-slate-800/15 text-xs leading-relaxed mb-5">The sweep runs every 6 hours automatically, scanning universities, research labs, and industry sources for new AI developments. You can also trigger it manually above.</p>
              <button onClick={runSweep} disabled={sweeping}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-800 transition-all"
                style={{ background: "linear-gradient(135deg, hsl(210,80%,50%), hsl(280,70%,50%))", opacity: sweeping ? 0.5 : 1 }}>
                {sweeping ? "Running sweep..." : "Run First Sweep"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <p className="text-slate-400 text-xs">{discoveries.length} discoveries{filterCategory !== "all" ? ` · ${filterCategory}` : ""}</p>
              <p className="text-slate-300 text-xs">Auto-updates every 6 hours</p>
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
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F8FAFC" }}>
      {/* Tool selector */}
      <div className="border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="px-4 py-3">
          <p className="text-[10px] font-mono mb-2.5" style={{ color: "rgba(15,23,42,0.5)", letterSpacing: "0.15em" }}>COMMERCE LAB — SELECT TOOL</p>
          <div className="grid grid-cols-3 gap-2">
            {COMMERCE_TOOLS.map(t => {
              const Icon = t.icon;
              const active = activeTool === t.id;
              return (
                <button key={t.id} onClick={() => { setActiveTool(t.id); setOutput(""); setPlatform(""); }}
                  className="flex flex-col gap-1.5 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? "#F1F5F9" : "#F8FAFC",
                    border: `1px solid ${active ? t.color + "50" : "rgba(15,23,42,0.07)"}`,
                    boxShadow: active ? `0 0 16px ${t.color}20` : "none",
                  }}>
                  <Icon className="w-4 h-4" style={{ color: active ? t.color : "rgba(15,23,42,0.6)" }} />
                  <span className="text-xs font-semibold leading-tight" style={{ color: active ? "rgba(15,23,42,0.85)" : "rgba(15,23,42,0.55)" }}>{t.label}</span>
                  <span className="text-[10px] leading-tight" style={{ color: active ? "rgba(15,23,42,0.5)" : "rgba(15,23,42,0.45)" }}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Input panel + output side by side */}
      <div className="flex-1 flex min-h-0">
        {/* Left: inputs */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r p-4 gap-4" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
          <div>
            <label className="text-[10px] font-mono mb-1.5 block" style={{ color: "rgba(15,23,42,0.4)", letterSpacing: "0.12em" }}>
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
              style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.1)", color: "rgba(15,23,42,0.8)", fontSize: "0.78rem" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono mb-1.5 block" style={{ color: "rgba(15,23,42,0.4)", letterSpacing: "0.12em" }}>
              PLATFORM
            </label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-xs outline-none appearance-none"
              style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.1)", color: platform ? "rgba(15,23,42,0.8)" : "rgba(15,23,42,0.6)" }}>
              <option value="">Auto-select best platform</option>
              {PLATFORM_OPTIONS[activeTool].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono mb-1.5 block" style={{ color: "rgba(15,23,42,0.4)", letterSpacing: "0.12em" }}>
              TONE
            </label>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-xs outline-none appearance-none"
              style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.1)", color: tone ? "rgba(15,23,42,0.8)" : "rgba(15,23,42,0.6)" }}>
              <option value="">Auto-match to product</option>
              {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button onClick={generate} disabled={!description.trim() || generating}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: !description.trim() || generating ? "#F1F5F9" : `linear-gradient(135deg, ${tool.color}cc, ${tool.color}88)`,
              border: `1px solid ${tool.color}40`,
              color: !description.trim() ? "rgba(15,23,42,0.25)" : "white",
              boxShadow: description.trim() && !generating ? `0 0 20px ${tool.color}30` : "none",
            }}>
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Sparkles className="w-4 h-4" /> Generate {tool.label}</>
            }
          </button>

          {output && (
            <div className="text-xs space-y-1" style={{ color: "rgba(15,23,42,0.6)" }}>
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
              style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F5F7FF" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: tool.color }} />
                <span className="text-xs font-semibold" style={{ color: "rgba(15,23,42,0.62)" }}>{tool.label}</span>
                {searching && <span className="flex items-center gap-1 text-[10px] font-mono animate-pulse" style={{ color: "hsl(193,100%,55%)" }}><Globe className="w-3 h-3" /> Searching…</span>}
                {generating && !searching && <span className="text-[10px] font-mono animate-pulse" style={{ color: tool.color }}>● LIVE</span>}
              </div>
              <button onClick={copyOutput}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: copied ? "hsla(155,70%,35%,0.2)" : "#F1F5F9", color: copied ? "hsl(155,70%,55%)" : "rgba(15,23,42,0.55)", border: "1px solid rgba(15,23,42,0.09)" }}>
                {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy all</>}
              </button>
            </div>
          )}

          {/* Output content */}
          <div className="flex-1 overflow-y-auto">
            {!output && !generating && (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
                  {React.createElement(tool.icon, { className: "w-7 h-7", style: { color: tool.color } })}
                </div>
                <div className="text-center space-y-1.5 max-w-xs">
                  <p className="text-slate-800 font-semibold text-sm">{tool.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.4)" }}>{tool.desc}</p>
                </div>
              </div>
            )}

            {(output || generating) && (
              <div className="p-5">
                <div className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "rgba(15,23,42,0.82)", fontFamily: "inherit", lineHeight: "1.75" }}>
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
// ── Star Lab Dashboard ────────────────────────────────────────────────────────

function DashboardPanel({ projects, pin, onNavigate, onOpenProject }: {
  projects: Project[];
  pin: string;
  onNavigate: (m: NavMode) => void;
  onOpenProject: (p: Project) => void;
}) {
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Compute stats from projects
  const activeProjects   = projects.filter(p => p.status === "active" || !p.status);
  const pendingApprovals = projects.filter(p => p.approvalStatus === "pending");
  const recentProjects   = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  // Aggregate funding across all projects
  const allFundingMatches: (FundingMatch & { projectName: string })[] = [];
  for (const p of projects) {
    if (!p.fundingAnalysis) continue;
    try {
      const d = JSON.parse(p.fundingAnalysis);
      const matches: FundingMatch[] = d?.opportunities?.[0]?.matches ?? [];
      matches.filter(m => m.matchStrength === "strong" || m.matchStrength === "good").forEach(m => allFundingMatches.push({ ...m, projectName: p.name }));
    } catch {}
  }
  const totalFundingOpps = allFundingMatches.length;
  const strongFunding    = allFundingMatches.filter(m => m.matchStrength === "strong").length;

  // Count drafted applications
  const totalDrafted = projects.reduce((sum, p) => {
    try { return sum + Object.keys(JSON.parse(p.fundingApplications || "{}")).length; } catch { return sum; }
  }, 0);

  // Pending funding analyses
  const pendingFunding = projects.filter(p => p.fundingStatus === "pending").length;

  // Live pipeline status — polls every 30 seconds
  const [pipelineStatus, setPipelineStatus] = useState<{
    currentlyBuilding: { id: number; name: string } | null;
    queued: number;
    launchReady: { id: number; name: string; industry: string }[];
    cadPending: number;
  } | null>(null);
  const base = getApiBase();

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const res = await fetch(`${base}lab/pipeline/status`, { headers: { "x-lab-pin": pin } });
        if (res.ok) setPipelineStatus(await res.json());
      } catch {}
    };
    fetchPipeline();
    const iv = setInterval(fetchPipeline, 30_000);
    return () => clearInterval(iv);
  }, []);

  const STATS = [
    { label: "Projects",         value: projects.length,     color: "hsl(193,100%,40%)", icon: FolderOpen,       action: () => onNavigate("projects") },
    { label: "Active",           value: activeProjects.length, color: "hsl(155,70%,45%)", icon: Activity,        action: () => onNavigate("projects") },
    { label: "Pending Approval", value: pendingApprovals.length, color: pendingApprovals.length > 0 ? "hsl(25,90%,60%)" : "rgba(15,23,42,0.55)", icon: ClipboardList, action: () => onNavigate("autolab") },
    { label: "Funding Opps",     value: totalFundingOpps,    color: "hsl(155,70%,45%)", icon: BadgeCheck,        action: () => onNavigate("grants") },
    { label: "Drafted Apps",     value: totalDrafted,        color: "hsl(45,100%,50%)", icon: FileText,          action: () => onNavigate("grants") },
  ];

  const QUICK_ACTIONS: { icon: React.ElementType; label: string; desc: string; color: string; mode: NavMode; featured?: boolean }[] = [
    { icon: Rocket,        label: "App Builder",        desc: "Build apps with AI agents",     color: "hsl(155,70%,42%)", mode: "appbuilder", featured: true },
    { icon: MessageSquare, label: "Chat with Sirius",   desc: "Your intelligence partner",     color: "hsl(193,100%,38%)", mode: "labchat"   },
    { icon: FolderOpen,    label: "Projects",            desc: "Open your R&D workspace",       color: "hsl(193,100%,32%)", mode: "projects"  },
    { icon: Telescope,     label: "Market Scout",        desc: "Scan for opportunities",         color: "hsl(45,100%,42%)", mode: "scout"     },
    { icon: BadgeCheck,    label: "Funding Radar",       desc: `${totalFundingOpps} open opps`,  color: "hsl(155,70%,45%)", mode: "grants"    },
    { icon: Cpu,           label: "Autonomous Lab",      desc: `${pendingApprovals.length} pending`, color: "hsl(193,100%,40%)", mode: "autolab" },
    { icon: Atom,          label: "AI Intelligence",     desc: "Live strategic feed",             color: "hsl(210,80%,55%)", mode: "feed"      },
    { icon: Bot,           label: "Bot Lab",             desc: "Design AI automations",           color: "hsl(280,70%,55%)", mode: "botlab"    },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "rgba(15,23,42,0.55)", letterSpacing: "0.15em" }}>{today.toUpperCase()}</p>
            <h1 className="text-slate-800 font-bold text-2xl mb-1">{timeGreet}, Garry.</h1>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(15,23,42,0.6)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(155,70%,55%)" }} />
            All systems online
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-7">
        {/* Stats row */}
        <div className="grid grid-cols-5 gap-3">
          {STATS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.label} onClick={s.action}
                className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}14` }}>
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(15,23,42,0.5)" }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: s.value > 0 ? s.color : "rgba(15,23,42,0.25)" }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.4)" }}>{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* App Builder Hero Spotlight */}
        <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, hsl(155,70%,42%) 0%, hsl(193,100%,38%) 100%)", boxShadow: "0 4px 20px hsla(155,70%,42%,0.25)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }} />
          <div className="relative px-6 py-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-sm font-bold opacity-90">App Builder</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>Code Intelligence</span>
              </div>
              <p className="text-white font-semibold text-lg leading-tight mb-1">Build any app with 9-phase AI agents</p>
              <p className="text-sm opacity-75" style={{ color: "white" }}>Live web search · checkpoints · virtual browser testing · rollback</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">9</div>
                <div className="text-[10px] opacity-60 text-white">phases</div>
              </div>
              <div className="w-px h-8 opacity-20" style={{ background: "white" }} />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">6</div>
                <div className="text-[10px] opacity-60 text-white">agents</div>
              </div>
              <div className="w-px h-8 opacity-20" style={{ background: "white" }} />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">∞</div>
                <div className="text-[10px] opacity-60 text-white">stacks</div>
              </div>
              <button onClick={() => onNavigate("appbuilder")}
                className="ml-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: "rgba(255,255,255,0.95)", color: "hsl(155,70%,35%)" }}>
                <Rocket className="w-4 h-4" /> Launch
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Recent Projects */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: "hsl(193,100%,40%)" }} />
                <span className="text-slate-800 font-semibold text-sm">Recent Projects</span>
              </div>
              <button onClick={() => onNavigate("projects")} className="text-xs transition-opacity hover:opacity-75" style={{ color: "hsl(193,100%,45%)" }}>
                View all →
              </button>
            </div>
            <div className="p-3">
              {recentProjects.length === 0 && (
                <p className="text-center py-6 text-sm" style={{ color: "rgba(15,23,42,0.55)" }}>No projects yet</p>
              )}
              {recentProjects.map(p => {
                const updatedAgo = (() => {
                  const diff = Date.now() - new Date(p.updatedAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(mins / 60);
                  const days = Math.floor(hrs / 24);
                  if (days > 0) return `${days}d ago`;
                  if (hrs > 0) return `${hrs}h ago`;
                  return `${Math.max(1, mins)}m ago`;
                })();
                const fundingCount = (() => { try { return JSON.parse(p.fundingAnalysis || "{}").opportunities?.[0]?.matches?.length ?? 0; } catch { return 0; } })();
                return (
                  <div key={p.id} onClick={() => { onOpenProject(p); onNavigate("projects"); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,23,42,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsla(193,100%,35%,0.1)" }}>
                      <FolderOpen className="w-4 h-4" style={{ color: "hsl(193,100%,40%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs truncate" style={{ color: "rgba(15,23,42,0.6)" }}>{p.industry} · {updatedAgo}</p>
                    </div>
                    {p.aiArchLinked === "linked" && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "hsla(210,80%,55%,0.1)", color: "hsl(210,80%,55%)", border: "1px solid hsla(210,80%,55%,0.2)" }}>
                        AI ARCH
                      </span>
                    )}
                    {fundingCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "hsla(155,70%,45%,0.1)", color: "hsl(155,70%,45%)" }}>
                        {fundingCount} funding
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Funding Opportunities */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />
                <span className="text-slate-800 font-semibold text-sm">Top Funding Opportunities</span>
                {strongFunding > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "hsla(155,70%,45%,0.1)", color: "hsl(155,70%,55%)" }}>{strongFunding} strong</span>
                )}
              </div>
              <button onClick={() => onNavigate("grants")} className="text-xs transition-opacity hover:opacity-75" style={{ color: "hsl(155,70%,45%)" }}>
                View all →
              </button>
            </div>
            <div className="p-3">
              {allFundingMatches.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm mb-1" style={{ color: "rgba(15,23,42,0.55)" }}>No funding data yet</p>
                  <button onClick={() => onNavigate("grants")} className="text-xs transition-opacity hover:opacity-75" style={{ color: "hsl(155,70%,45%)" }}>Run Funding Radar →</button>
                </div>
              )}
              {allFundingMatches.slice(0, 5).map((m, i) => (
                <div key={i} onClick={() => onNavigate("grants")}
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,23,42,0.07)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: m.matchStrength === "strong" ? "hsl(155,70%,55%)" : "hsl(45,100%,55%)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-xs font-semibold truncate">{m.scheme}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(15,23,42,0.6)" }}>{m.projectName} · {m.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Pipeline Status — what Sirius is building right now */}
        {pipelineStatus && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)", background: "hsla(193,100%,40%,0.03)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pipelineStatus.currentlyBuilding ? "hsl(155,70%,55%)" : "rgba(15,23,42,0.2)" }} />
                <span className="text-slate-800 font-semibold text-sm">Autonomous Build Pipeline</span>
                {pipelineStatus.currentlyBuilding && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "hsla(155,70%,42%,0.12)", color: "hsl(155,70%,38%)" }}>LIVE</span>
                )}
              </div>
              <button onClick={() => onNavigate("autolab")} className="text-xs transition-opacity hover:opacity-75" style={{ color: "hsl(193,100%,45%)" }}>
                View Lab →
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-xl p-3 text-center" style={{ background: "hsla(155,70%,42%,0.06)", border: "1px solid hsla(155,70%,42%,0.15)" }}>
                  <p className="text-lg font-bold" style={{ color: "hsl(155,70%,38%)" }}>{pipelineStatus.queued.toLocaleString()}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.5)" }}>Queued to build</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "hsla(193,100%,40%,0.06)", border: "1px solid hsla(193,100%,40%,0.15)" }}>
                  <p className="text-lg font-bold" style={{ color: "hsl(193,100%,38%)" }}>{pipelineStatus.currentlyBuilding ? 1 : 0}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.5)" }}>Building now</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "hsla(155,70%,45%,0.06)", border: "1px solid hsla(155,70%,45%,0.15)" }}>
                  <p className="text-lg font-bold" style={{ color: "hsl(155,70%,38%)" }}>{pipelineStatus.launchReady?.length ?? 0}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.5)" }}>Launch-ready</p>
                </div>
              </div>
              {pipelineStatus.currentlyBuilding ? (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsla(155,70%,42%,0.06)", border: "1px solid hsla(155,70%,42%,0.12)" }}>
                  <div className="flex-shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(155,70%,45%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Currently building</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{pipelineStatus.currentlyBuilding.name}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "hsla(155,70%,42%,0.15)", color: "hsl(155,70%,38%)" }}>AI Agents Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <Activity className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(15,23,42,0.3)" }} />
                  <p className="text-sm text-slate-400">Pipeline idle — {pipelineStatus.queued.toLocaleString()} projects queued</p>
                </div>
              )}
              {(pipelineStatus.launchReady?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-400 mb-2">Ready to launch</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pipelineStatus.launchReady.slice(0, 6).map(p => (
                      <span key={p.id} className="text-xs px-2 py-1 rounded-lg" style={{ background: "hsla(193,100%,40%,0.08)", color: "hsl(193,100%,35%)", border: "1px solid hsla(193,100%,40%,0.15)" }}>
                        {p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name}
                      </span>
                    ))}
                    {(pipelineStatus.launchReady?.length ?? 0) > 6 && (
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.5)" }}>
                        +{(pipelineStatus.launchReady?.length ?? 0) - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <p className="text-xs font-mono mb-3" style={{ color: "rgba(15,23,42,0.55)", letterSpacing: "0.15em" }}>QUICK ACTIONS</p>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <button key={a.mode} onClick={() => onNavigate(a.mode)}
                  className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${a.color}40`; (e.currentTarget as HTMLElement).style.background = `${a.color}06`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,23,42,0.07)"; (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}14` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: a.color, width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-800 font-semibold text-sm leading-tight">{a.label}</p>
                    <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: "rgba(15,23,42,0.6)" }}>{a.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pending Approvals alert */}
        {pendingApprovals.length > 0 && (
          <div onClick={() => onNavigate("autolab")}
            className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
            style={{ background: "hsla(25,90%,55%,0.07)", border: "1px solid hsla(25,90%,55%,0.2)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "hsla(25,90%,55%,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "hsla(25,90%,55%,0.07)"; }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsla(25,90%,55%,0.15)" }}>
              <ClipboardList className="w-5 h-5" style={{ color: "hsl(25,90%,55%)" }} />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-semibold text-sm">{pendingApprovals.length} project{pendingApprovals.length !== 1 ? "s" : ""} awaiting your approval</p>
              <p className="text-xs" style={{ color: "rgba(15,23,42,0.45)" }}>The Autonomous Lab has identified new opportunities — review and approve to add them to your workspace</p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(25,90%,55%)" }} />
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
  const [fundingError, setFundingError] = useState<string | null>(null);
  const base = getApiBase();

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const runAnalysis = async () => {
    setRunning(true); setSearching(false); setResult(null); setRawStream(""); setExpandedCards(new Set()); setFundingError(null);
    try {
      const res = await fetch(`${base}lab/funding`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({}),
      });
      if (!res.ok || !res.body) {
        setFundingError("Analysis failed — please try again");
        setRunning(false);
        return;
      }

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
            if (msg.error) { setFundingError(msg.error); }
            if (msg.type === "searching") { setSearching(true); }
            if (msg.delta) { setSearching(false); setRawStream(prev => prev + msg.delta); }
            if (msg.done && msg.content) {
              try {
                const parsed = JSON.parse(msg.content) as FundingResult;
                setResult(parsed);
              } catch { setFundingError("Could not parse funding results — please try again"); }
            }
          } catch { /* line parse error — skip */ }
        }
      }
    } catch (err: any) {
      setFundingError("Connection error — please check your network and try again");
    }
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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck className="w-5 h-5" style={{ color: "hsl(155,70%,45%)" }} />
              <h2 className="text-slate-800 font-bold text-lg">Funding Radar</h2>
            </div>
            <p className="text-xs" style={{ color: "rgba(15,23,42,0.45)", maxWidth: "480px" }}>
              Scans every project in your Lab against real, active UK and international R&D grant schemes, tax incentives, and innovation funding programmes. Only genuine opportunities — no speculation.
            </p>
          </div>
          <button onClick={runAnalysis} disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all"
            style={{ background: running ? "#F1F5F9" : "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)", opacity: running ? 0.7 : 1 }}>
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
                style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.07)" }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.4)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {fundingError && (
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "hsla(0,80%,50%,0.06)", border: "1px solid hsla(0,80%,50%,0.2)" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(0,80%,55%)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "hsl(0,80%,45%)" }}>Analysis failed</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(15,23,42,0.55)" }}>{fundingError}</p>
            </div>
            <button onClick={() => setFundingError(null)} className="text-xs opacity-50 hover:opacity-80">✕</button>
          </div>
        )}

        {!result && !running && !fundingError && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)" }}>
              <BadgeCheck className="w-8 h-8" style={{ color: "hsl(155,70%,45%)" }} />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-slate-800 font-semibold text-base">Find funding for your projects</p>
              <p className="text-xs max-w-sm leading-relaxed" style={{ color: "rgba(15,23,42,0.4)" }}>
                Analyses your most developed projects against UK RDEC, Innovate UK, Horizon Europe, DASA, sector-specific funds, and international tax incentives. Projects with a Brief or Specs get the most relevant results.
              </p>
            </div>
            <button onClick={runAnalysis}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)", boxShadow: "0 0 24px hsla(155,70%,38%,0.2)" }}>
              Run Funding Analysis
            </button>
          </div>
        )}

        {!result && !running && fundingError && (
          <div className="flex justify-center pt-4">
            <button onClick={runAnalysis}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "hsl(155,70%,38%)", color: "white", border: "1px solid hsla(155,70%,45%,0.3)" }}>
              Try Again
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
            <p className="text-sm" style={{ color: searching ? "hsl(193,100%,65%)" : "rgba(15,23,42,0.55)" }}>
              {searching ? "Searching the web for live funding data…" : "Analysing projects against funding databases..."}
            </p>
            {rawStream && (
              <div className="max-w-md w-full rounded-xl p-4 font-mono text-xs leading-relaxed"
                style={{ background: "#F8FAFC", color: "rgba(15,23,42,0.6)", border: "1px solid rgba(15,23,42,0.07)", maxHeight: "120px", overflow: "hidden" }}>
                {rawStream.slice(-400)}
              </div>
            )}
          </div>
        )}

        {result && (
          <>
            {/* Summary */}
            {result.summary && (
              <div className="rounded-xl p-4" style={{ background: "#F1F5F9", border: "1px solid hsla(155,70%,45%,0.2)" }}>
                <p className="text-xs font-mono mb-1.5" style={{ color: "hsl(155,70%,45%)", letterSpacing: "0.1em" }}>PORTFOLIO SUMMARY</p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(15,23,42,0.76)" }}>{result.summary}</p>
              </div>
            )}

            {/* Geography filter */}
            <div className="flex items-center gap-2">
              {(["all", "UK", "EU", "International"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: filter === f ? "#E8EEF5" : "transparent",
                    border: filter === f ? "1px solid rgba(15,23,42,0.15)" : "1px solid rgba(15,23,42,0.07)",
                    color: filter === f ? "rgba(15,23,42,0.85)" : "rgba(15,23,42,0.4)",
                  }}>
                  {f === "all" ? "All Regions" : f}
                </button>
              ))}
              <span className="ml-auto text-xs" style={{ color: "rgba(15,23,42,0.5)" }}>
                {filteredOpportunities.reduce((s, o) => s + o.matches.length, 0)} opportunities shown
              </span>
            </div>

            {/* Opportunities by project */}
            {filteredOpportunities.length === 0 && (
              <p className="text-center py-12 text-sm" style={{ color: "rgba(15,23,42,0.6)" }}>
                No opportunities found for the selected region filter.
              </p>
            )}

            {filteredOpportunities.map(opp => (
              <div key={opp.projectId} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,45%)" }} />
                  <span className="text-sm font-semibold text-slate-800">{opp.projectName}</span>
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
                      style={{ background: "#F8FAFC", border: `1px solid ${strength.border}` }}>
                      {/* Card header — always visible */}
                      <button onClick={() => toggleCard(cardKey)} className="w-full text-left p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-sm font-semibold text-slate-800">{match.scheme}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Match strength */}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: strength.bg, color: strength.color, border: `1px solid ${strength.border}` }}>
                                {strength.label}
                              </span>
                              {/* Type */}
                              <span className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.55)", border: "1px solid rgba(15,23,42,0.1)" }}>
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
                            style={{ color: "rgba(15,23,42,0.6)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                        </div>
                        {/* Match reason — always shown */}
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: "rgba(15,23,42,0.58)" }}>
                          {match.matchReason}
                        </p>
                      </button>

                      {/* Expanded detail */}
                      {expanded && (
                        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
                          <div className="pt-3 space-y-3">
                            <div className="rounded-lg p-3" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
                              <p className="text-[10px] font-mono mb-1" style={{ color: "rgba(15,23,42,0.6)", letterSpacing: "0.1em" }}>EVIDENCE NEEDED</p>
                              <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.67)" }}>{match.keyEvidence}</p>
                            </div>
                            <div className="rounded-lg p-3" style={{ background: "hsla(155,70%,35%,0.08)", border: "1px solid hsla(155,70%,35%,0.2)" }}>
                              <p className="text-[10px] font-mono mb-1" style={{ color: "hsl(155,70%,45%)", letterSpacing: "0.1em" }}>NEXT STEP</p>
                              <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.72)" }}>{match.nextStep}</p>
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
  const inp = "w-full text-xs text-slate-800 placeholder-slate-400 outline-none rounded-xl px-3 py-2 bg-[#F1F5F9] border border-[rgba(15,23,42,0.09)]";

  const TABS = [
    { id: "memory" as const, label: "Memory", icon: Brain },
    { id: "business" as const, label: "Business Profile", icon: Building },
    { id: "actions" as const, label: "AI Actions", icon: Zap },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 py-4 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5" style={{ color: "hsl(280,70%,65%)" }} />
          <div>
            <h2 className="text-slate-800 font-semibold text-sm">Sirius Brain</h2>
            <p className="text-slate-400 text-xs">{memoryLines.length} memories · what Sirius knows about you</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#FFFFFF" }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: tab === t.id ? "hsl(280,70%,45%)" : "transparent", color: tab === t.id ? "white" : "rgba(15,23,42,0.4)" }}>
                <Icon className="w-3 h-3" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading brain…</div>
        ) : (
          <>
            {tab === "memory" && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <p className="text-slate-400 text-xs font-medium mb-1">How memory works</p>
                  <p className="text-slate-300 text-xs leading-relaxed">Sirius automatically extracts facts from your conversations. You can also add specific facts below. Every memory is injected into every conversation — so Sirius always knows your context without having to be told again.</p>
                </div>
                <div className="p-4 rounded-2xl space-y-3" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <p className="text-slate-500 text-xs font-medium">Add a memory fact</p>
                  <div className="flex gap-2">
                    <select value={newFactCat} onChange={e => setNewFactCat(e.target.value)} className={inp + " w-36 flex-shrink-0"}>
                      {FACT_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input value={newFact} onChange={e => setNewFact(e.target.value)} onKeyDown={e => e.key === "Enter" && addFact()}
                      placeholder="e.g. My company targets oil & gas companies in Aberdeen" className={inp} />
                  </div>
                  <button onClick={addFact} disabled={saving || !newFact.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 disabled:opacity-40"
                    style={{ background: saved ? "hsl(155,70%,35%)" : "hsl(280,70%,45%)" }}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {saved ? "Saved!" : "Add to Brain"}
                  </button>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-xs font-medium">Current memories ({memoryLines.length})</p>
                    {memoryLines.length > 0 && (
                      <button onClick={clearMemory} className="text-xs text-red-400/50 hover:text-red-400 transition-colors flex items-center gap-1">
                        <Trash className="w-3 h-3" />Clear all
                      </button>
                    )}
                  </div>
                  {memoryLines.length === 0 ? (
                    <div className="text-center py-8 text-slate-800/15 text-sm">No memories yet — chat with Sirius or add facts above</div>
                  ) : (
                    <div className="space-y-2">
                      {memoryLines.map((line, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.06)" }}>
                          <Brain className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "hsl(280,70%,55%)" }} />
                          <p className="text-slate-500 text-xs leading-relaxed">{line}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "business" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <p className="text-slate-400 text-xs font-medium mb-1">Business profile</p>
                  <p className="text-slate-300 text-xs leading-relaxed">This is baked into every Sirius response. The more detail here, the more precisely Sirius can help with outreach, project briefs, revenue strategy, and intelligence scanning.</p>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Company Name</label>
                  <input value={bizForm.businessName} onChange={e => setBizForm(p => ({ ...p, businessName: e.target.value }))} placeholder="Sirius Star Lab" className={inp} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Primary Sectors</label>
                  <input value={bizForm.businessSector} onChange={e => setBizForm(p => ({ ...p, businessSector: e.target.value }))} placeholder="Oil & Gas, Aerospace, Medical, Hydrogen" className={inp} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Business Goals</label>
                  <textarea value={bizForm.businessGoals} onChange={e => setBizForm(p => ({ ...p, businessGoals: e.target.value }))} rows={4}
                    placeholder="e.g. Grow precision machining revenue to £2M, win 5 new oil & gas clients in 2026, launch Sirius Star Lab as a SaaS product…"
                    className={inp + " resize-none"} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Key Clients / Target Clients</label>
                  <textarea value={bizForm.keyClients} onChange={e => setBizForm(p => ({ ...p, keyClients: e.target.value }))} rows={3}
                    placeholder="e.g. Current: Baker Hughes, TechnipFMC. Target: Petrofac, Wood Group, Babcock…"
                    className={inp + " resize-none"} />
                </div>
                <button onClick={saveBiz} disabled={savingBiz}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-slate-800 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: saved ? "hsl(155,70%,35%)" : "hsl(280,70%,45%)" }}>
                  {savingBiz ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                  {saved ? "Saved to Brain!" : "Save Business Profile"}
                </button>
              </div>
            )}

            {tab === "actions" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <p className="text-slate-400 text-xs font-medium mb-1">AI-powered actions</p>
                  <p className="text-slate-300 text-xs leading-relaxed">These run autonomously using everything Sirius knows about your business. Unlike any chatbot, Sirius actually does things — not just talks about them.</p>
                </div>
                {[
                  { action: "deep_profile", label: "Build Deep Business Profile", icon: Building, desc: "Sirius analyses your business context and generates a full strategic profile — strengths, gaps, opportunities.", color: "hsl(280,70%,45%)" },
                  { action: "scan_for_me", label: "Scan Opportunities for My Business", icon: Telescope, desc: "Runs a targeted market scan based on your specific sectors and goals — not generic, tailored to you.", color: "hsl(193,100%,30%)" },
                  { action: "pitch_strategy", label: "Generate Outreach Strategy", icon: Target, desc: "Creates a full outreach plan for your target clients — who to contact, what to say, when.", color: "hsl(340,80%,42%)" },
                  { action: "revenue_map", label: "Map Revenue Opportunities", icon: Activity, desc: "Identifies your top 5 revenue opportunities right now, ranked by effort and potential.", color: "hsl(45,100%,45%)" },
                ].map(a => {
                  const Icon = a.icon;
                  return (
                    <div key={a.action} className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.07)" }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: a.color + "22" }}>
                          <Icon className="w-4 h-4" style={{ color: a.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-800 text-xs font-semibold mb-1">{a.label}</p>
                          <p className="text-slate-400 text-xs leading-relaxed mb-3">{a.desc}</p>
                          <button onClick={() => runAction(a.action, a.label)} disabled={actionRunning}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 disabled:opacity-40"
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
                  <div className="p-4 rounded-2xl font-mono text-xs space-y-1 max-h-48 overflow-y-auto" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}>
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
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F5F7FF" }}>
      <div className="p-6 border-b" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="w-5 h-5" style={{ color: "hsl(45,100%,55%)" }} />
          <h2 className="text-slate-800 font-bold text-lg">Deep Research</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(45,200,100,0.12)", color: "hsl(155,70%,50%)", border: "1px solid rgba(45,200,100,0.2)" }}>
            Perplexity-level
          </span>
        </div>
        <p className="text-slate-400 text-sm">Multi-step web research. Sirius browses multiple sources and compiles a full cited report — like a research analyst, not a chatbot.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {/* Input */}
        <div className="rounded-2xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
          <label className="text-slate-400 text-xs mb-2 block font-semibold uppercase tracking-wide">Research Topic or Question</label>
          <textarea
            className="w-full bg-transparent text-slate-800 text-sm placeholder-slate-400 resize-none outline-none leading-relaxed"
            rows={3}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. What are the biggest opportunities in hydrogen fuel cell technology for UK manufacturers in 2025? Include market size, key players, and entry points."
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) runResearch(); }}
          />
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(15,23,42,0.07)" }}>
            <span className="text-slate-300 text-xs">⌘ + Enter to run</span>
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
          <div className="rounded-2xl p-6" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(45,100%,55%)" }} />
              <span className="text-slate-500 text-sm">Sirius is researching — browsing multiple sources…</span>
            </div>
            <div className="space-y-2">
              {["Scanning web sources", "Cross-referencing findings", "Synthesising report"].map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "hsl(45,100%,55%)" : "rgba(15,23,42,0.15)" }} />
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
              <div className="rounded-xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Research Path</p>
                <div className="flex flex-wrap gap-2">
                  {result.steps.map((step, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(45,100,255,0.08)", color: "rgba(15,23,42,0.45)", border: "1px solid rgba(15,23,42,0.07)" }}>
                      {i + 1}. {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Report */}
            <div className="rounded-2xl p-6" style={{ background: "#F1F5F9", border: "1px solid rgba(45,100%,55%,0.2)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: "hsl(45,100%,55%)" }} />
                  <span className="text-slate-800 font-semibold text-sm">Research Report</span>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(result.report); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "rgba(15,23,42,0.07)", color: "rgba(15,23,42,0.55)" }}>
                  {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-slate-700 leading-relaxed" style={{ fontSize: "14px" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.report}</ReactMarkdown>
              </div>
            </div>

            {/* Sources */}
            {result.sources?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Sources Consulted</p>
                <div className="space-y-1.5">
                  {result.sources.map((src, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
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
              <p className="text-slate-500 font-semibold mb-1">Research anything, deeply</p>
              <p className="text-slate-300 text-sm max-w-sm">Sirius doesn't just answer — it browses multiple sources, cross-references them, and delivers a full cited report. No hallucinations, real sources.</p>
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
                  style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)", color: "rgba(15,23,42,0.45)" }}>
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
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F5F7FF" }}>
      <div className="p-6 border-b" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3 mb-1">
          <FileSearch className="w-5 h-5" style={{ color: "hsl(210,90%,60%)" }} />
          <h2 className="text-slate-800 font-bold text-lg">Document Intelligence</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(66,133,244,0.12)", color: "hsl(210,90%,60%)", border: "1px solid rgba(66,133,244,0.2)" }}>
            ChatGPT-level
          </span>
        </div>
        <p className="text-slate-400 text-sm">Upload any PDF, document, CSV or text file. Ask anything about it — Sirius reads it and gives you intelligent answers, summaries, and extractions.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

        {/* Upload zone */}
        {!file ? (
          <div
            className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center cursor-pointer transition-all hover:border-blue-400/30"
            style={{ background: "#F1F5F9", border: "2px dashed rgba(15,23,42,0.12)" }}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv,.md,.doc,.docx,.json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(66,133,244,0.1)" }}>
              <Upload className="w-7 h-7" style={{ color: "hsl(210,90%,60%)" }} />
            </div>
            <div>
              <p className="text-slate-600 font-semibold mb-1">Drop a file or click to upload</p>
              <p className="text-slate-400 text-sm">PDF, Word, CSV, TXT, Markdown, JSON — up to 10MB</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["PDF", "Word", "CSV", "TXT", "Markdown", "JSON"].map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.6)", border: "1px solid rgba(15,23,42,0.09)" }}>{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#F1F5F9", border: "1px solid rgba(66,133,244,0.2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(66,133,244,0.12)" }}>
              <FileText className="w-5 h-5" style={{ color: "hsl(210,90%,60%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-medium text-sm truncate">{file.name}</p>
              <p className="text-slate-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setFile(null); setAnswer(null); setQuestion(""); }} className="text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {extracting && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />Reading file…
          </div>
        )}

        {/* Question input */}
        {file && !extracting && (
          <div className="rounded-2xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
            <label className="text-slate-400 text-xs mb-3 block font-semibold uppercase tracking-wide">Ask about this document</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_QS.map(q => (
                <button key={q} onClick={() => setQuestion(q)}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-all hover:border-blue-400/30"
                  style={{ background: "rgba(66,133,244,0.06)", color: "rgba(15,23,42,0.5)", border: "1px solid rgba(66,133,244,0.12)" }}>
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent text-slate-800 text-sm placeholder-slate-400 outline-none py-2"
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
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Summary</p>
                <p className="text-slate-800/75 text-sm leading-relaxed">{answer.summary}</p>
              </div>
            )}
            {answer.keyPoints?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.07)" }}>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Key Points</p>
                <ul className="space-y-2">
                  {answer.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-800/65">
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                        style={{ background: "rgba(66,133,244,0.12)", color: "hsl(210,90%,60%)" }}>{i + 1}</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {answer.text && (
              <div className="rounded-2xl p-5" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Full Answer</p>
                <div className="prose prose-sm prose-invert max-w-none text-slate-800/75 leading-relaxed" style={{ fontSize: "14px" }}>
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
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(155,70%,30%), hsl(193,100%,35%))" }}>
              <Globe className="w-5 h-5 text-slate-800" />
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-lg leading-none">Growth Engine</h2>
              <p className="text-slate-400 text-xs mt-0.5">Generate ready-to-post content across every free channel — right now</p>
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
        <div className="w-64 flex-shrink-0 border-r overflow-y-auto p-3 space-y-1.5" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#F5F7FF" }}>
          {/* Discover Page link */}
          <div className="mb-3 p-3 rounded-2xl" style={{ background: "hsla(155,70%,40%,0.08)", border: "1px solid hsla(155,70%,40%,0.15)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "hsl(155,70%,55%)" }}>🌐 Public Discover Page</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-2">Your live intelligence feed — publicly accessible, SEO-indexed, shareable link.</p>
            <div className="text-xs break-all" style={{ color: "hsl(193,100%,55%)" }}>{discoverUrl}</div>
            <button onClick={() => navigator.clipboard.writeText(discoverUrl)}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "hsla(155,70%,40%,0.15)", color: "hsl(155,70%,55%)" }}>
              Copy Link
            </button>
          </div>

          <p className="text-slate-300 text-xs font-medium px-1 mb-2">CONTENT FORMATS</p>
          {GROWTH_FORMATS.map(fmt => {
            const done = !!results[fmt.id];
            const isGenerating = generating === fmt.id;
            return (
              <button key={fmt.id} onClick={() => setActiveFormat(fmt.id)}
                className="w-full text-left p-3 rounded-2xl transition-all"
                style={{
                  background: activeFormat === fmt.id ? "#F1F5F9" : "transparent",
                  border: `1px solid ${activeFormat === fmt.id ? "rgba(15,23,42,0.45)" : "transparent"}`,
                }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{fmt.icon}</span>
                    <span className="text-slate-800 text-xs font-semibold">{fmt.label}</span>
                  </div>
                  {done && !isGenerating && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(155,70%,50%)" }} />}
                  {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{fmt.desc}</p>
              </button>
            );
          })}

          <div className="pt-2 border-t" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
            <p className="text-slate-300 text-xs px-1 mb-2">FREE CHANNELS TO HIT</p>
            {[
              { name: "LinkedIn", url: "https://linkedin.com", note: "Post yourself — reach 10k–100k" },
              { name: "r/artificial", url: "https://reddit.com/r/artificial", note: "4.5M AI enthusiasts" },
              { name: "r/entrepreneur", url: "https://reddit.com/r/entrepreneur", note: "2.5M builders" },
              { name: "r/SideProject", url: "https://reddit.com/r/SideProject", note: "Indie founders" },
              { name: "Product Hunt", url: "https://producthunt.com", note: "Launch day = thousands of visitors" },
              { name: "Hacker News", url: "https://news.ycombinator.com/submit", note: "Show HN post" },
            ].map(c => (
              <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-900/5 transition-colors group">
                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-300 group-hover:text-slate-500" />
                <div>
                  <p className="text-slate-500 text-xs font-medium group-hover:text-slate-600">{c.name}</p>
                  <p className="text-slate-300 text-xs">{c.note}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Right: Content area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Format header */}
          <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeFmt.icon}</span>
              <div>
                <h3 className="text-slate-800 font-semibold">{activeFmt.label}</h3>
                <p className="text-slate-400 text-xs">{activeFmt.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeResult && (
                <button onClick={() => copyResult(activeFormat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: copied === activeFormat ? "hsl(155,70%,55%)" : "rgba(15,23,42,0.62)", background: "#F1F5F9" }}>
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
                <h4 className="text-slate-800 font-semibold text-lg mb-2">{activeFmt.label} Content</h4>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{activeFmt.desc}. Click Generate and the AI writes it using the Mission story, real Lab discoveries, and the Sirius vision — ready to copy and paste directly.</p>
                <button onClick={() => generate(activeFormat)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-800 transition-all hover:opacity-80"
                  style={{ background: `linear-gradient(135deg, ${activeFmt.color}, hsl(226,70%,50%))` }}>
                  <Sparkles className="w-4 h-4" /> Generate Now
                </button>
              </div>
            )}

            {generating === activeFormat && !activeResult && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: activeFmt.color }} />
                <div>
                  <p className="text-slate-800 font-semibold">Writing your {activeFmt.label} content…</p>
                  <p className="text-slate-400 text-sm mt-1">Using real Lab discoveries + the Sirius mission story</p>
                </div>
              </div>
            )}

            {activeResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Subject/headline */}
                {activeResult.subject && (
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Headline / Hook</p>
                    <div className="rounded-2xl p-4" style={{ background: `${activeFmt.color}12`, border: `1px solid ${activeFmt.color}25` }}>
                      <p className="text-slate-800 font-semibold text-base leading-snug">{activeResult.subject}</p>
                    </div>
                  </div>
                )}

                {/* Body */}
                {activeResult.body && (
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Content</p>
                    <div className="rounded-2xl p-5 relative group" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
                      <pre className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">{activeResult.body}</pre>
                    </div>
                  </div>
                )}

                {/* Hashtags/extras */}
                {activeResult.extra && (
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Hashtags / Tags</p>
                    <div className="rounded-xl p-3" style={{ background: "#F1F5F9" }}>
                      <p className="text-slate-500 text-sm">{activeResult.extra}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => copyResult(activeFormat)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: copied === activeFormat ? "hsla(155,70%,45%,0.15)" : "#F1F5F9", color: copied === activeFormat ? "hsl(155,70%,55%)" : "rgba(15,23,42,0.72)" }}>
                    {copied === activeFormat ? <><Check className="w-4 h-4" /> Copied to clipboard</> : <><Copy className="w-4 h-4" /> Copy and paste</>}
                  </button>
                  <button onClick={() => generate(activeFormat)} disabled={!!generating}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ background: "#F1F5F9", color: "rgba(15,23,42,0.55)" }}>
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
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(193,100%,30%), hsl(226,70%,50%))" }}>
            <Star className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-lg leading-none">Mission Foundation</h2>
            <p className="text-slate-400 text-xs mt-0.5">The origin, the vision, the new species — why everything we build matters</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{ color: copied ? "hsl(155,70%,50%)" : "rgba(15,23,42,0.6)", background: "#FFFFFF" }}>
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
          <div className="flex items-center gap-3 p-8 text-slate-400">
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
              <p className="text-slate-800 font-bold text-xl leading-snug">"I think, so I am."</p>
              <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">The origin story, the vision, and the reason every project in this Lab exists. This document is baked into the Star Lab AI's memory — it knows why we are doing this.</p>
            </div>

            {/* Mission document rendered as markdown */}
            <div className="prose-invert" style={{ color: "rgba(15,23,42,0.8)" }}>
              <LabMarkdown content={content} streaming={false} />
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
              <p className="text-slate-300 text-xs text-center">
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

// ─── Interactive post-login voice assistant ──────────────────────────────────
const NAV_DESTINATIONS: { mode: NavMode; label: string; icon: string; color: string; desc: string; keywords: string[] }[] = [
  { mode: "dashboard", label: "Dashboard",        icon: "🏠", color: "hsl(193,100%,45%)", desc: "Your command centre overview", keywords: ["dashboard","home","overview","summary","main","start","back","return"] },
  { mode: "labchat",  label: "Chat with Sirius", icon: "💬", color: "hsl(193,100%,38%)", desc: "Talk to me directly", keywords: ["chat","talk","speak","converse","sirius","question","ask","help","conversation"] },
  { mode: "projects", label: "Projects",          icon: "📁", color: "hsl(193,100%,32%)", desc: "Your R&D project workspace", keywords: ["project","projects","work","build","engineering","design","product"] },
  { mode: "botlab",   label: "Bot Lab",           icon: "🤖", color: "hsl(280,70%,55%)", desc: "Design AI automations", keywords: ["bot","automation","bots","automate","bot lab","workflow","script"] },
  { mode: "scout",    label: "Scout",             icon: "🔭", color: "hsl(45,100%,42%)", desc: "Market opportunity scanner", keywords: ["scout","market","scan","discover","opportunity","prospect","lead","find"] },
  { mode: "feed",     label: "AI Intelligence",   icon: "⚡", color: "hsl(210,80%,55%)", desc: "Live intelligence feed", keywords: ["feed","intelligence","news","insights","updates","ai news","latest","briefing"] },
  { mode: "research", label: "Deep Research",     icon: "📖", color: "hsl(280,70%,50%)", desc: "In-depth topic research", keywords: ["research","deep","study","investigate","learn","analyse","analyze","reading"] },
  { mode: "docs",     label: "Document Intel",    icon: "📄", color: "hsl(210,90%,55%)", desc: "Upload and analyse documents", keywords: ["document","doc","file","upload","pdf","contract","analyse document"] },
  { mode: "agency",   label: "Agency Hub",        icon: "🏢", color: "hsl(220,80%,55%)", desc: "Agency client intelligence", keywords: ["agency","client","clients","agency hub","outreach","pitch","proposal"] },
  { mode: "revenue",  label: "Revenue Hub",       icon: "💷", color: "hsl(155,70%,45%)", desc: "Sales pipeline and revenue", keywords: ["revenue","sales","money","pipeline","deals","stripe","income","earning"] },
  { mode: "commerce", label: "Commerce Lab",      icon: "🛒", color: "hsl(25,90%,55%)",  desc: "E-commerce and product lab", keywords: ["commerce","ecommerce","shop","store","product","sell","shopify"] },
  { mode: "growth",   label: "Growth Engine",     icon: "🚀", color: "hsl(155,70%,50%)", desc: "Marketing and growth tools", keywords: ["growth","marketing","grow","launch","campaign","social","content"] },
  { mode: "brain",    label: "Sirius Brain",      icon: "🧠", color: "hsl(280,70%,65%)", desc: "My memory and knowledge base", keywords: ["brain","memory","knowledge","learn","remember","know","sirius brain"] },
  { mode: "grants",   label: "Funding Radar",     icon: "💰", color: "hsl(45,100%,50%)", desc: "Grants and funding intelligence", keywords: ["funding","grant","grants","investment","fund","finance","money","investor"] },
  { mode: "outreach", label: "Outreach Hub",      icon: "✉️", color: "hsl(340,80%,60%)",  desc: "Email and contact outreach", keywords: ["outreach","email","contact","message","reach out","send","follow up"] },
  { mode: "mission",  label: "Mission",           icon: "⭐", color: "hsl(193,100%,50%)", desc: "Sirius mission and vision", keywords: ["mission","vision","goals","strategy","foundation","purpose"] },
  { mode: "autolab",  label: "Autonomous Lab",    icon: "🔬", color: "hsl(193,100%,40%)", desc: "Self-running AI analysis", keywords: ["autonomous","auto","self","automatic","lab","autolab","running"] },
  { mode: "appbuilder", label: "App Builder", icon: "🚀", color: "hsl(155,70%,42%)", desc: "Build apps with AI agents", keywords: ["build","app","builder","create app","generate app","code","develop","software","agent build","autonomous build"] },
];

// ── Continuous Voice Conversation Widget ──────────────────────────────────────
type VoiceMsg = { role: "user" | "assistant"; content: string };

function StarLabVoiceWidget({
  navMode, onNavigate, onOpenProject, activeProject, projects, pin,
}: {
  navMode: string;
  onNavigate: (mode: string) => void;
  onOpenProject?: (id: number) => void;
  activeProject: Project | null;
  projects: Project[];
  pin: string;
}) {
  const base = getApiBase();
  const [active, setActive]             = useState(false);
  const [phase, setPhase]               = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [messages, setMessages]         = useState<VoiceMsg[]>([]);
  const [liveText, setLiveText]         = useState("");
  const [siriusText, setSiriusText]     = useState("");
  const [waveTick, setWaveTick]         = useState(0);
  const [inputMode, setInputMode]       = useState<"voice" | "keyboard">("voice");
  const inputModeRef                    = useRef<"voice" | "keyboard">("voice");
  const [keyboardText, setKeyboardText] = useState("");
  const keyboardInputRef                = useRef<HTMLInputElement>(null);
  const [showFeed, setShowFeed]         = useState(false);
  const [statusText, setStatusText]     = useState("");
  type ToolEvent = { id: string; name: string; label: string; icon: string; color: string; ts: number };
  const [toolLog, setToolLog]           = useState<ToolEvent[]>([]);
  const [prevSession, setPrevSession]   = useState<{ summary: string; createdAt: string; messageCount: number } | null>(null);
  const feedRef                         = useRef<HTMLDivElement>(null);
  const autosaveTimerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recRef        = useRef<any>(null);
  const tickRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef       = useRef(false);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const audioStreamRef= useRef<MediaStream | null>(null);
  const sampleRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const emotionRef    = useRef<{ energy: string; pitch: string; pace: string; mood: string }>({ energy: "normal", pitch: "normal", pace: "normal", mood: "neutral" });
  const wordTimesRef  = useRef<number[]>([]);
  const [emotion, setEmotion] = useState<{ energy: string; pitch: string; mood: string }>({ energy: "normal", pitch: "normal", mood: "neutral" });

  // Memory / journal tracking
  const sessionKeyRef     = useRef<string | null>(null);
  const moodHistoryRef    = useRef<{ mood: string; time: number }[]>([]);
  const prevMoodRef       = useRef<string>("neutral");
  const navVisitedRef     = useRef<Set<string>>(new Set());
  const [journalSaved, setJournalSaved] = useState<"idle" | "saving" | "saved">("idle");

  // Load previous session history on mount
  useEffect(() => {
    fetch(`${base}lab/voice/history`, { headers: { "x-lab-pin": pin } })
      .then(r => r.json())
      .then(data => {
        if (data.session && data.messages?.length > 0) {
          setPrevSession({
            summary: data.session.summary,
            createdAt: data.session.createdAt,
            messageCount: data.session.messageCount,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll feed to bottom when messages or tools change
  useEffect(() => {
    if (showFeed && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, toolLog, showFeed]);

  // Auto-save messages after each exchange (debounced 2s)
  useEffect(() => {
    if (!sessionKeyRef.current || messages.length < 2) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      fetch(`${base}lab/voice/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ sessionKey: sessionKeyRef.current, messages }),
      }).catch(() => {});
    }, 2000);
  }, [messages]);

  // Startup health check — fires once per session when voice widget first activates
  const hasRunStartupRef = useRef(false);

  useEffect(() => {
    if (active) {
      tickRef.current = setInterval(() => setWaveTick(t => t + 1), 80);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [active]);

  // Auto-trigger startup maintenance check on first activation
  useEffect(() => {
    if (active && !hasRunStartupRef.current && !busyRef.current) {
      hasRunStartupRef.current = true;
      const startupTimer = setTimeout(() => {
        sendMessage("[STARTUP_CHECK] Run your startup maintenance check now. Briefly summarise the health status in your greeting — if all systems are healthy say so, if there are any issues or pending approvals tell me.");
      }, 1800);
      return () => clearTimeout(startupTimer);
    }
    return;
  }, [active]);

  // Track which Star Lab sections are visited during a voice session
  useEffect(() => {
    if (active && navMode) navVisitedRef.current.add(navMode);
  }, [navMode, active]);

  const saveJournal = async (msgs: VoiceMsg[]) => {
    if (!sessionKeyRef.current || msgs.length < 2) return;
    setJournalSaved("saving");
    try {
      const history = moodHistoryRef.current;
      const moodCounts = history.reduce((acc, { mood }) => {
        acc[mood] = (acc[mood] || 0) + 1; return acc;
      }, {} as Record<string, number>);
      const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

      const allText = msgs.map(m => m.content).join(" ").toLowerCase();
      const mentioned = projects.filter(p => allText.includes(p.name.toLowerCase())).map(p => p.name);

      await fetch(`${base}lab/voice/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({
          sessionKey: sessionKeyRef.current,
          dominantMood,
          moodProgression: JSON.stringify(history),
          navModesVisited: JSON.stringify([...navVisitedRef.current]),
          projectsMentioned: JSON.stringify(mentioned),
          messageCount: msgs.length,
          rawTranscript: JSON.stringify(msgs),
        }),
      });
      setJournalSaved("saved");
      setTimeout(() => setJournalSaved("idle"), 3500);
    } catch {
      setJournalSaved("idle");
    }
  };

  const stopAudioAnalysis = () => {
    if (sampleRef.current) { clearInterval(sampleRef.current); sampleRef.current = null; }
    try { analyserRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    try { audioStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    analyserRef.current = null;
    audioCtxRef.current = null;
    audioStreamRef.current = null;
  };

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const freqData  = new Uint8Array(analyser.frequencyBinCount);
      const timeData  = new Uint8Array(analyser.fftSize);
      const sampleRate = ctx.sampleRate;
      const binHz = sampleRate / analyser.fftSize;

      sampleRef.current = setInterval(() => {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        // RMS energy from time domain
        const rms = Math.sqrt(timeData.reduce((s, v) => s + Math.pow((v - 128) / 128, 2), 0) / timeData.length);
        const energy = rms > 0.12 ? "high" : rms > 0.04 ? "normal" : "low";

        // Dominant pitch from fundamental frequency range (80–400 Hz — human voice)
        const loIdx = Math.floor(80 / binHz);
        const hiIdx = Math.floor(400 / binHz);
        let maxAmp = 0; let maxIdx = loIdx;
        for (let i = loIdx; i <= hiIdx && i < freqData.length; i++) {
          if (freqData[i] > maxAmp) { maxAmp = freqData[i]; maxIdx = i; }
        }
        const fundamentalHz = maxIdx * binHz;
        const pitch = fundamentalHz > 260 ? "high" : fundamentalHz > 160 ? "normal" : "low";

        // Pace from word arrival rate
        const now = Date.now();
        wordTimesRef.current = wordTimesRef.current.filter(t => now - t < 5000);
        const wordsPerSec = wordTimesRef.current.length / 5;
        const pace = wordsPerSec > 2.5 ? "fast" : wordsPerSec > 1 ? "normal" : "slow";

        // Composite mood
        const mood = energy === "high" && pitch === "high" ? "excited"
          : energy === "high" && pitch === "low"  ? "stressed"
          : energy === "low"  && pitch === "low"  ? "calm"
          : energy === "low"  && pace === "slow"  ? "reflective"
          : pitch === "high"  && pace === "fast"  ? "urgent"
          : "focused";

        emotionRef.current = { energy, pitch, pace, mood };
        setEmotion({ energy, pitch, mood });

        // Journal: log mood changes (not every sample — only on change)
        if (mood !== prevMoodRef.current) {
          prevMoodRef.current = mood;
          moodHistoryRef.current.push({ mood, time: Date.now() });
        }
      }, 120);
    } catch {
      // Mic permission denied — emotional detection silently disabled
    }
  };

  const stopListening = () => {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    stopAudioAnalysis();
  };

  const startListening = () => {
    if (busyRef.current) return;
    if (inputModeRef.current === "keyboard") return;   // never open mic in keyboard mode
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    recRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onstart = () => { setPhase("listening"); wordTimesRef.current = []; startAudioAnalysis(); };
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(" ");
      setLiveText(text);
      // Track word arrivals for pace
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount > wordTimesRef.current.length) {
        for (let i = wordTimesRef.current.length; i < wordCount; i++) {
          wordTimesRef.current.push(Date.now());
        }
      }
      if (e.results[e.results.length - 1].isFinal && text.trim().length > 1) {
        stopAudioAnalysis();
        stopListening();
        sendMessage(text.trim());
      }
    };
    rec.onerror = () => { setPhase("idle"); busyRef.current = false; stopAudioAnalysis(); };
    rec.onend   = () => { if (phase === "listening") setPhase("idle"); };
    rec.start();
    setLiveText("");
  };

  const sendMessage = async (text: string) => {
    busyRef.current = true;
    setPhase("thinking");
    setLiveText("");
    const userMsg: VoiceMsg = { role: "user", content: text };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);

    try {
      const res = await fetch(`${base}lab/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({
          messages: updatedMsgs,
          context: {
            mode: navMode,
            activeTab: NAV_LABELS[navMode as NavMode] ?? navMode,
            projectName: activeProject?.name,
            projectList: projects.map(p => p.name).slice(0, 10),
            emotion: emotionRef.current,
          },
        }),
      });

      if (!res.ok || !res.body) throw new Error("Voice request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      let action: { type: string; mode?: string } | null = null;
      let spokenText = "";

      setPhase("thinking");
      setStatusText("Sirius is thinking…");
      setSiriusText("");
      setShowFeed(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.delta) {
              const clean = parsed.delta.replace(/<<[^>]+>>/g, "");
              fullResponse += parsed.delta;
              if (clean) {
                setPhase("speaking");
                setStatusText("");
              }
              setSiriusText(prev => prev + clean);
            }
            if (parsed.toolCall) {
              setToolLog(prev => [...prev, {
                id: `${Date.now()}_${Math.random()}`,
                name: parsed.toolCall.name,
                label: parsed.toolCall.label,
                icon: parsed.toolCall.icon,
                color: parsed.toolCall.color,
                ts: Date.now(),
              }]);
              setStatusText(`${parsed.toolCall.icon || "⚡"} ${parsed.toolCall.label || parsed.toolCall.name}…`);
            }
            if (parsed.type === "thinking" && parsed.text) {
              setStatusText(parsed.text);
            }
            if (parsed.type === "status" && parsed.message) {
              setStatusText(parsed.message);
            }
            if (parsed.navigate) {
              const { section, projectId } = parsed.navigate;
              if (section) onNavigate(section);
              if (projectId && onOpenProject) setTimeout(() => onOpenProject(projectId), 300);
            }
            if (parsed.done) {
              action = parsed.action;
              spokenText = parsed.spokenText || fullResponse.replace(/<<[^>]+>>/g, "").trim();
              setStatusText("");
            }
          } catch {}
        }
      }

      const assistantMsg: VoiceMsg = { role: "assistant", content: spokenText || fullResponse };
      setMessages(prev => [...prev, assistantMsg]);

      if (action?.type === "navigate" && action.mode) {
        onNavigate(action.mode);
      }

      speakText(spokenText || fullResponse.replace(/<<[^>]+>>/g, "").trim(), () => {
        busyRef.current = false;
        setPhase("idle");
        setSiriusText("");
        if (active && inputModeRef.current === "voice") setTimeout(() => startListening(), 400);
      }, 0.87, pin);

    } catch (err) {
      console.error("[Voice]", err);
      busyRef.current = false;
      setPhase("idle");
      setStatusText("");
      if (active && inputModeRef.current === "voice") setTimeout(() => startListening(), 1000);
    }
  };

  const toggleActive = () => {
    if (active) {
      stopListening();
      window.speechSynthesis?.cancel();
      busyRef.current = false;
      // Capture messages before clearing for journal save
      setMessages(prev => { saveJournal(prev); return prev; });
      setActive(false);
      setPhase("idle");
      setLiveText("");
      setSiriusText("");
    } else {
      // Reset session tracking
      sessionKeyRef.current = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      moodHistoryRef.current = [];
      prevMoodRef.current = "neutral";
      navVisitedRef.current = new Set([navMode]);
      setActive(true);
      setMessages([]);
      setTimeout(() => {
        const greeting = inputModeRef.current === "keyboard" ? "I'm ready. Type your message below." : "I'm listening. What would you like to do?";
        setSiriusText(greeting);
        speakText(greeting, () => {
          setSiriusText("");
          busyRef.current = false;
          if (inputModeRef.current === "voice") startListening();
        }, 0.87, pin);
      }, 200);
    }
  };

  const isListening = phase === "listening";
  const isThinking  = phase === "thinking";
  const isSpeaking  = phase === "speaking";

  return (
    <>
      {/* Live chat feed panel — expandable above the bubble */}
      <AnimatePresence>
        {active && showFeed && (
          <motion.div
            key="chat-feed"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ bottom: 176, left: 4, width: 320, maxHeight: 440, background: "rgba(5,9,18,0.97)", border: "1px solid rgba(0,212,255,0.15)", backdropFilter: "blur(20px)" }}>

            {/* Feed header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,55%)" }} />
                <span className="text-xs font-semibold tracking-wide" style={{ color: "hsl(193,100%,65%)" }}>Live Session Feed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>{Math.floor(messages.length / 2)} exchange{messages.length !== 2 ? "s" : ""}</span>
                <button onClick={() => setShowFeed(false)} className="w-5 h-5 rounded-md flex items-center justify-center hover:opacity-70" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <X className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />
                </button>
              </div>
            </div>

            {/* Previous session banner */}
            {prevSession && messages.length === 0 && (
              <div className="mx-3 mt-3 px-3 py-2 rounded-xl" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}>
                <p className="text-[9px] font-semibold tracking-widest mb-0.5" style={{ color: "hsl(193,100%,55%)" }}>PREVIOUS SESSION</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{prevSession.summary}</p>
                <p className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>{new Date(prevSession.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {prevSession.messageCount} messages</p>
              </div>
            )}

            {/* Message list */}
            <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ scrollbarWidth: "none" }}>
              {messages.length === 0 && !prevSession && (
                <div className="flex flex-col items-center justify-center h-24 gap-2">
                  <Activity className="w-5 h-5" style={{ color: "rgba(255,255,255,0.1)" }} />
                  <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Conversation will appear here</p>
                </div>
              )}

              {/* Render messages interleaved with tool events */}
              {(() => {
                const items: React.ReactNode[] = [];
                let toolIdx = 0;

                for (let i = 0; i < messages.length; i++) {
                  const msg = messages[i];
                  const isUser = msg.role === "user";
                  const isStartup = msg.content.startsWith("[STARTUP_CHECK]");
                  const displayContent = isStartup ? "🔍 Startup maintenance check" : msg.content;

                  // Insert any tool events that happened before this assistant message
                  if (!isUser && toolIdx < toolLog.length) {
                    const relevant = toolLog.slice(toolIdx, toolIdx + 3);
                    relevant.forEach(t => {
                      items.push(
                        <div key={t.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.05)", borderLeft: `2px solid ${t.color}`, border: `1px solid rgba(255,255,255,0.07)`, borderLeftWidth: 2 }}>
                          <span className="text-xs flex-shrink-0">{t.icon}</span>
                          <span className="text-[9px] font-semibold flex-1 truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{t.label}</span>
                          <span className="text-[8px]" style={{ color: "hsl(155,70%,55%)" }}>✓</span>
                        </div>
                      );
                      toolIdx++;
                    });
                  }

                  items.push(
                    <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl text-[10px] leading-relaxed"
                        style={{
                          background: isUser ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.06)",
                          color: isUser ? "hsl(193,100%,75%)" : "rgba(255,255,255,0.75)",
                          borderBottomRightRadius: isUser ? 4 : undefined,
                          borderBottomLeftRadius: !isUser ? 4 : undefined,
                        }}>
                        {displayContent}
                      </div>
                    </div>
                  );
                }

                // Any remaining tool events after last message
                while (toolIdx < toolLog.length) {
                  const t = toolLog[toolIdx++];
                  items.push(
                    <div key={t.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.05)", borderLeft: `2px solid ${t.color}`, border: `1px solid rgba(255,255,255,0.07)`, borderLeftWidth: 2 }}>
                      <span className="text-xs flex-shrink-0">{t.icon}</span>
                      <span className="text-[9px] font-semibold flex-1 truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{t.label}</span>
                      <span className="text-[8px]" style={{ color: "hsl(155,70%,55%)" }}>✓</span>
                    </div>
                  );
                }

                return items;
              })()}

              {/* Live thinking/status indicator */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="px-2.5 py-1.5 rounded-2xl rounded-bl-sm max-w-[90%]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,190,0,0.12)" }}>
                    {statusText ? (
                      <div className="flex items-center gap-1.5">
                        <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "hsl(45,100%,55%)" }}
                          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity }} />
                        <span className="text-[9px] leading-relaxed italic" style={{ color: "rgba(255,190,0,0.75)" }}>{statusText}</span>
                      </div>
                    ) : (
                      <div className="flex gap-1 items-center h-3">
                        {[0,1,2].map(i => (
                          <motion.span key={i} className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }}
                            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Live Sirius text while speaking */}
              {isSpeaking && siriusText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-2.5 py-1.5 rounded-2xl rounded-bl-sm text-[10px] leading-relaxed"
                    style={{ background: "rgba(155,255,180,0.07)", color: "rgba(155,255,180,0.7)", borderLeft: "2px solid hsl(155,70%,45%)" }}>
                    {siriusText}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble when active */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 left-4 z-50 rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: inputMode === "keyboard" ? 280 : 220, background: "rgba(5,9,18,0.96)", border: `1px solid ${inputMode === "keyboard" ? "rgba(255,190,0,0.25)" : "rgba(0,212,255,0.2)"}`, backdropFilter: "blur(16px)", transition: "width 0.2s ease, border-color 0.2s ease" }}>

            {/* Status bar */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: isListening ? "hsl(193,100%,55%)" : isSpeaking ? "hsl(155,70%,55%)" : isThinking ? "hsl(45,100%,55%)" : inputMode === "keyboard" ? "hsl(45,100%,55%)" : "rgba(255,255,255,0.2)", animation: isListening || isSpeaking ? "pulse 1.2s infinite" : "none" }} />
              <span className="flex-1 text-xs font-semibold tracking-wide truncate" style={{ color: isListening ? "hsl(193,100%,65%)" : isSpeaking ? "hsl(155,70%,65%)" : isThinking ? "hsl(45,100%,65%)" : inputMode === "keyboard" ? "hsl(45,100%,65%)" : "rgba(255,255,255,0.35)" }}>
                {isListening ? "LISTENING" : isSpeaking ? "SPEAKING" : isThinking ? (statusText || "THINKING…") : inputMode === "keyboard" ? "KEYBOARD" : "SIRIUS VOICE"}
              </span>
              {/* Chat log toggle */}
              <button
                title={showFeed ? "Hide chat log" : "Show live chat log"}
                onClick={() => setShowFeed(f => !f)}
                className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: showFeed ? "hsla(193,100%,55%,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${showFeed ? "hsla(193,100%,55%,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                <MessageSquare className="w-3 h-3" style={{ color: showFeed ? "hsl(193,100%,65%)" : "rgba(255,255,255,0.4)" }} />
              </button>
              {/* Voice / Keyboard toggle */}
              <button
                title={inputMode === "voice" ? "Switch to keyboard input" : "Switch to voice input"}
                onClick={() => {
                  if (inputModeRef.current === "voice") {
                    stopListening();
                    inputModeRef.current = "keyboard";
                    setInputMode("keyboard");
                    setTimeout(() => keyboardInputRef.current?.focus(), 100);
                  } else {
                    inputModeRef.current = "voice";
                    setInputMode("voice");
                    setKeyboardText("");
                    if (!busyRef.current) setTimeout(() => startListening(), 300);
                  }
                }}
                className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: inputMode === "keyboard" ? "hsla(45,100%,55%,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${inputMode === "keyboard" ? "hsla(45,100%,55%,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                {inputMode === "voice"
                  ? <Keyboard className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />
                  : <Mic className="w-3 h-3" style={{ color: "hsl(45,100%,65%)" }} />}
              </button>
            </div>

            {/* Waveform */}
            {(isListening || isSpeaking) && (
              <div className="flex items-center gap-0.5 px-3 pb-2" style={{ height: 24 }}>
                {Array.from({ length: 18 }).map((_, i) => {
                  const h = isListening
                    ? 3 + Math.abs(Math.sin(waveTick * 0.4 + i * 0.7)) * 16
                    : 2 + Math.abs(Math.sin(waveTick * 0.22 + i * 0.9)) * 10;
                  return (
                    <motion.div key={i} animate={{ height: h }} transition={{ duration: 0.08 }}
                      style={{ width: 2.5, borderRadius: 2, background: isListening ? "hsl(193,100%,55%)" : "hsl(155,70%,55%)", opacity: 0.85 }} />
                  );
                })}
              </div>
            )}

            {/* Transcript / response */}
            {(liveText || siriusText) && (
              <div className="px-3 pb-2">
                <p className="text-xs leading-relaxed" style={{ color: liveText ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.8)" }}>
                  {liveText ? `"${liveText}"` : siriusText}
                </p>
              </div>
            )}

            {/* Emotion indicator */}
            {isListening && emotion.mood && emotion.mood !== "neutral" && (
              <div className="px-3 pb-1 flex items-center gap-1.5">
                <span className="text-[9px] font-bold tracking-widest uppercase" style={{
                  color: emotion.mood === "excited" ? "hsl(45,100%,60%)"
                    : emotion.mood === "stressed" ? "hsl(0,70%,60%)"
                    : emotion.mood === "urgent"   ? "hsl(25,90%,60%)"
                    : emotion.mood === "calm"     ? "hsl(155,70%,60%)"
                    : "rgba(255,255,255,0.3)"
                }}>
                  {emotion.mood}
                </span>
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>· {emotion.pitch} pitch · {emotion.energy} energy</span>
              </div>
            )}

            {/* Keyboard input — shown when in keyboard mode */}
            {inputMode === "keyboard" && (
              <div className="px-3 pb-2">
                <div className="flex items-center gap-1.5 rounded-xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <input
                    ref={keyboardInputRef}
                    type="text"
                    value={keyboardText}
                    onChange={e => setKeyboardText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && keyboardText.trim() && !busyRef.current) {
                        const text = keyboardText.trim();
                        setKeyboardText("");
                        sendMessage(text);
                      }
                    }}
                    placeholder="Type your message…"
                    disabled={isThinking || isSpeaking}
                    className="flex-1 bg-transparent text-xs py-2 px-2.5 outline-none placeholder:opacity-30"
                    style={{ color: "rgba(255,255,255,0.85)", minWidth: 0 }}
                  />
                  <button
                    onClick={() => {
                      if (keyboardText.trim() && !busyRef.current) {
                        const text = keyboardText.trim();
                        setKeyboardText("");
                        sendMessage(text);
                      }
                    }}
                    disabled={!keyboardText.trim() || isThinking || isSpeaking}
                    className="flex-shrink-0 w-7 h-7 mr-1 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: keyboardText.trim() && !isThinking && !isSpeaking ? "rgba(0,212,255,0.2)" : "transparent",
                      opacity: keyboardText.trim() && !isThinking && !isSpeaking ? 1 : 0.3,
                    }}>
                    <CornerDownLeft className="w-3 h-3" style={{ color: "hsl(193,100%,65%)" }} />
                  </button>
                </div>
                <p className="text-[9px] mt-1.5 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Press Enter to send · Sirius still speaks her replies
                </p>
              </div>
            )}

            {/* History count + saving indicator */}
            <div className="px-3 pb-3 flex items-center justify-between">
              {messages.length > 0 && (
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{Math.floor(messages.length / 2)} exchange{messages.length > 2 ? "s" : ""}</p>
              )}
              {journalSaved === "saving" && (
                <p className="text-[9px] font-semibold tracking-widest" style={{ color: "rgba(0,212,255,0.5)" }}>SAVING…</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory saved flash — shows after session ends */}
      <AnimatePresence>
        {journalSaved === "saved" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="mx-3 mb-1.5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
            style={{ background: "hsla(155,70%,42%,0.1)", border: "1px solid hsla(155,70%,42%,0.25)" }}>
            <Brain className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(155,70%,45%)" }} />
            <span className="text-[10px] font-semibold" style={{ color: "hsl(155,70%,45%)" }}>Session saved to memory</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button — sits in sidebar bottom */}
      <button onClick={toggleActive}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
        style={{
          background: active ? "rgba(0,212,255,0.12)" : "rgba(15,23,42,0.04)",
          border: active ? "1px solid rgba(0,212,255,0.3)" : "1px solid transparent",
        }}>
        <div className="relative flex-shrink-0">
          {active && isListening && (
            <span className="absolute -inset-1 rounded-full animate-ping" style={{ background: "rgba(0,212,255,0.3)", animationDuration: "1.2s" }} />
          )}
          <div className="w-7 h-7 rounded-xl flex items-center justify-center relative"
            style={{ background: active ? "rgba(0,212,255,0.2)" : "rgba(15,23,42,0.06)" }}>
            {active
              ? <Mic className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,60%)" }} />
              : <Mic className="w-3.5 h-3.5" style={{ color: "rgba(15,23,42,0.4)" }} />}
          </div>
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: active ? (inputMode === "keyboard" ? "hsl(45,100%,45%)" : "hsl(193,100%,55%)") : "rgba(15,23,42,0.5)" }}>
            {active
              ? inputMode === "keyboard"
                ? (isThinking ? "Thinking…" : isSpeaking ? "Speaking…" : "Keyboard mode")
                : (isListening ? "Listening…" : isSpeaking ? "Speaking…" : isThinking ? "Thinking…" : "Voice On")
              : "Talk to Sirius"}
          </p>
          {!active && <p className="text-[10px]" style={{ color: "rgba(15,23,42,0.3)" }}>Voice or keyboard</p>}
        </div>
      </button>
    </>
  );
}

function matchDestination(transcript: string): typeof NAV_DESTINATIONS[0] | null {
  const lower = transcript.toLowerCase().trim();
  // Exact or strong keyword match
  for (const dest of NAV_DESTINATIONS) {
    for (const kw of dest.keywords) {
      if (lower.includes(kw)) return dest;
    }
  }
  return null;
}

function buildContextGreeting(name: string, timeGreet: string, projects: Project[]): string {
  const parts: string[] = [`${timeGreet}, ${name}.`];

  if (projects.length > 0) {
    const sorted = [...projects].sort((a, b) =>
      new Date((b as any).updatedAt || 0).getTime() - new Date((a as any).updatedAt || 0).getTime()
    );
    const last = sorted[0];
    const hoursAgo = (Date.now() - new Date((last as any).updatedAt || 0).getTime()) / 3_600_000;
    const timeRef = hoursAgo < 2 ? "just a moment ago" : hoursAgo < 24 ? "earlier today" : hoursAgo < 48 ? "yesterday" : "recently";
    parts.push(`You were last working on ${last.name} ${timeRef}.`);

    const incomplete: string[] = [];
    if (!last.specs?.trim())        incomplete.push("specifications");
    if (!last.materials?.trim())    incomplete.push("materials");
    if (!last.drawingNotes?.trim()) incomplete.push("drawings");
    if (!last.workflows?.trim())    incomplete.push("workflows");
    if (incomplete.length > 0) parts.push(`The ${incomplete[0]} section still needs attention.`);
  }

  const multiIncomplete = projects.filter(p =>
    !p.brief?.trim() || !p.specs?.trim() || !p.materials?.trim()
  ).length;
  if (multiIncomplete > 1) parts.push(`You have ${multiIncomplete} projects with open sections.`);

  const pendingFunding = projects.filter(p => (p as any).fundingStatus === "pending").length;
  if (pendingFunding > 0) parts.push(`${pendingFunding} funding analysis is still running.`);

  parts.push("Where would you like to go?");
  return parts.join(" ");
}

function LabAvatarGreeting({ userName, onNavigate, onDismiss, projects, pin }: {
  userName?: string;
  onNavigate: (mode: NavMode) => void;
  onDismiss: () => void;
  projects: Project[];
  pin?: string;
}) {
  const [visible, setVisible]           = useState(false);
  const [leaving, setLeaving]           = useState(false);
  const [phase, setPhase]               = useState<"speaking" | "listening" | "confirming" | "ready">("speaking");
  const [siriusText, setSiriusText]     = useState("");
  const [showCards, setShowCards]       = useState(false);
  const [listening, setListening]       = useState(false);
  const [transcript, setTranscript]     = useState("");
  const [matched, setMatched]           = useState<typeof NAV_DESTINATIONS[0] | null>(null);
  const [waveTick, setWaveTick]         = useState(0);
  const [showAll, setShowAll]           = useState(false);
  const recRef = useRef<any>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = userName || "Garry";

  const goTo = (dest: typeof NAV_DESTINATIONS[0]) => {
    setMatched(dest);
    setPhase("confirming");
    stopListening();
    const confirmMsg = `Taking you to ${dest.label}.`;
    setSiriusText(confirmMsg);
    speakText(confirmMsg, () => {
      setLeaving(true);
      setTimeout(() => { onNavigate(dest.mode); onDismiss(); }, 300);
    }, 0.87, pin);
  };

  const startListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    recRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onstart = () => { setListening(true); setTranscript(""); };
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(" ");
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) {
        const dest = matchDestination(text);
        if (dest) {
          goTo(dest);
        } else {
          setSiriusText(`I didn't quite catch that. You said: "${text}". Please try again or tap a card below.`);
          speakText(`I didn't catch that — please say a section name or tap a card.`, undefined, 0.87, pin);
          setListening(false);
          setTimeout(() => startListening(), 2000);
        }
      }
    };
    rec.onerror = () => { setListening(false); };
    rec.onend   = () => { setListening(false); recRef.current = null; };
    rec.start();
  };

  const stopListening = () => {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setListening(false);
  };

  // Waveform animation tick
  useEffect(() => {
    tickRef.current = setInterval(() => setWaveTick(t => t + 1), 80);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // On mount: appear, speak greeting, then start listening
  useEffect(() => {
    setTimeout(() => setVisible(true), 60);

    const greeting = buildContextGreeting(name, timeGreet, projects);
    setSiriusText(greeting);

    const speakTimer = setTimeout(() => {
      speakText(greeting, () => {
        setPhase("listening");
        setShowCards(true);
        startListening();
      }, 0.87, pin);
      setShowCards(true);
    }, 600);

    // Auto-dismiss after 15 seconds so it never blocks access to the app
    const autoDismiss = setTimeout(() => {
      stopListening();
      window.speechSynthesis?.cancel();
      setLeaving(true);
      setTimeout(() => onDismiss(), 350);
    }, 15000);

    return () => {
      clearTimeout(speakTimer);
      clearTimeout(autoDismiss);
      stopListening();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const isSpeaking = phase === "speaking" || phase === "confirming";

  return (
    <div className="fixed inset-0 z-50 flex"
      style={{
        background: "rgba(5,9,18,0.97)",
        backdropFilter: "blur(20px)",
        opacity: leaving ? 0 : visible ? 1 : 0,
        transition: "opacity 0.35s ease",
        pointerEvents: (leaving || !visible) ? "none" : "auto",
      }}>

      {/* Skip */}
      <button onClick={() => { stopListening(); window.speechSynthesis?.cancel(); setLeaving(true); setTimeout(() => { onNavigate("projects"); onDismiss(); }, 300); }}
        className="absolute top-5 right-6 text-xs transition-colors"
        style={{ color: "rgba(255,255,255,0.25)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
        Skip →
      </button>

      {/* LEFT — Avatar column */}
      <div className="flex flex-col items-center justify-center w-72 flex-shrink-0 px-8 border-r"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>

        {/* Avatar */}
        <div className="relative mb-6">
          <div className="absolute -inset-6 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${listening ? "rgba(0,212,255,0.18)" : "rgba(0,212,255,0.08)"} 0%, transparent 70%)`, transition: "all 0.4s" }} />
          {listening && (
            <div className="absolute -inset-3 rounded-full animate-ping"
              style={{ border: "1px solid rgba(0,212,255,0.35)", animationDuration: "1.5s" }} />
          )}
          <div className="relative w-40 h-40 rounded-full overflow-hidden"
            style={{ border: `2px solid ${listening ? "rgba(0,212,255,0.7)" : "rgba(0,212,255,0.3)"}`, boxShadow: `0 0 ${listening ? "60px" : "30px"} rgba(0,212,255,${listening ? "0.35" : "0.15"})`, transition: "all 0.4s" }}>
            <img src="/logo-v2.png" alt="Sirius" className="w-full h-full object-cover" />
          </div>
          {/* Status badge */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: listening ? "rgba(0,212,255,0.15)" : "rgba(155,255,200,0.1)", border: `1px solid ${listening ? "rgba(0,212,255,0.35)" : "rgba(155,255,200,0.3)"}`, color: listening ? "hsl(193,100%,60%)" : "hsl(155,70%,60%)", whiteSpace: "nowrap" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: listening ? "hsl(193,100%,55%)" : "hsl(155,70%,55%)" }} />
            {listening ? "LISTENING" : isSpeaking ? "SPEAKING" : "ONLINE"}
          </div>
        </div>

        {/* Label */}
        <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "rgba(0,212,255,0.4)", letterSpacing: "0.25em" }}>SIRIUS STAR LAB</p>

        {/* Sirius speech bubble */}
        <div className="rounded-2xl p-4 mb-4 min-h-[80px] flex items-center justify-center text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            {siriusText}
            {isSpeaking && <span className="animate-pulse ml-0.5" style={{ color: "hsl(193,100%,55%)" }}>|</span>}
          </p>
        </div>

        {/* Waveform — visible when speaking or listening */}
        {(listening || isSpeaking) && (
          <div className="flex items-center gap-0.5 mb-4" style={{ height: 32 }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const h = listening
                ? 6 + Math.abs(Math.sin(waveTick * 0.4 + i * 0.7)) * 22
                : 4 + Math.abs(Math.sin(waveTick * 0.25 + i * 0.9)) * 12;
              return (
                <motion.div key={i} animate={{ height: h }} transition={{ duration: 0.1 }}
                  style={{ width: 3, borderRadius: 3, background: listening ? "hsl(193,100%,55%)" : "rgba(0,212,255,0.35)" }} />
              );
            })}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="px-3 py-2 rounded-xl mb-3 text-center"
            style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)" }}>
            <p className="text-xs italic" style={{ color: "rgba(0,212,255,0.7)" }}>"{transcript}"</p>
          </div>
        )}

        {/* Manual listen button */}
        {!listening && phase !== "confirming" && (
          <button onClick={() => { setSiriusText("I'm listening — just say where you'd like to go."); startListening(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", color: "hsl(193,100%,65%)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,212,255,0.1)")}>
            🎤 Speak your destination
          </button>
        )}
      </div>

      {/* RIGHT — Destinations grid */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-center"
        style={{ opacity: showCards ? 1 : 0, transition: "opacity 0.5s ease 0.3s" }}>
        <p className="text-xs font-mono mb-5" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.2em" }}>WHERE WOULD YOU LIKE TO GO?</p>

        <div className="grid grid-cols-2 gap-3">
          {(showAll ? NAV_DESTINATIONS : NAV_DESTINATIONS.slice(0, 8)).map((dest, i) => (
            <motion.button key={dest.mode}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => goTo(dest)}
              className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all"
              style={{ background: matched?.mode === dest.mode ? `${dest.color}18` : "rgba(255,255,255,0.03)", border: `1px solid ${matched?.mode === dest.mode ? dest.color + "60" : "rgba(255,255,255,0.07)"}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${dest.color}10`; (e.currentTarget as HTMLElement).style.borderColor = `${dest.color}40`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = matched?.mode === dest.mode ? `${dest.color}18` : "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = matched?.mode === dest.mode ? `${dest.color}60` : "rgba(255,255,255,0.07)"; }}>
              <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{dest.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight" style={{ color: "rgba(255,255,255,0.85)" }}>{dest.label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.3)" }}>{dest.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {!showAll && NAV_DESTINATIONS.length > 8 && (
          <button onClick={() => setShowAll(true)}
            className="mt-3 text-xs transition-colors self-start"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
            Show all {NAV_DESTINATIONS.length} destinations ↓
          </button>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}


// ── AI Architecture Lab Panel ─────────────────────────────────────────────────

type AiArchSweepStatus = {
  isRunning: boolean; lastSweepAt: string | null;
  analysed: number; linked: number; skipped: number;
  total: number; unswept: number; notApplicable: number; pending: number;
};




// ── AI Architecture Lab Panel ─────────────────────────────────────────────────

function AiArchLabPanel({ pin, projects, onNavigate, onOpenProject }: {
  pin: string;
  projects: Project[];
  onNavigate: (mode: NavMode) => void;
  onOpenProject: (p: Project) => void;
}) {
  const [sweepStatus, setSweepStatus] = useState<AiArchSweepStatus | null>(null);
  const [triggering, setTriggering] = useState(false);
  const base = getApiBase();
  const hdrs = () => ({ "Content-Type": "application/json", "x-lab-pin": pin });

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${base}lab/ai-arch-sweep/status`, { headers: hdrs() });
      if (res.ok) setSweepStatus(await res.json());
    } catch {}
  }, [base, pin]);

  useEffect(() => { loadStatus(); const t = setInterval(loadStatus, 10000); return () => clearInterval(t); }, [loadStatus]);

  const triggerSweep = async () => {
    setTriggering(true);
    await fetch(`${base}lab/ai-arch-sweep/trigger`, { method: "POST", headers: hdrs() });
    setTimeout(loadStatus, 2000);
    setTriggering(false);
  };

  const linkedProjects = projects.filter(p => p.aiArchLinked === "linked");
  const pendingProjects = projects.filter(p => p.aiArchLinked === "pending");

  const lastSweepFormatted = sweepStatus?.lastSweepAt
    ? new Date(sweepStatus.lastSweepAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Never";

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Sweep Control Header */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" style={{ color: "hsl(210,80%,55%)" }} />
            <span className="text-slate-800 font-bold text-sm">Autonomous AI Architecture Sweep</span>
            {sweepStatus?.isRunning && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "hsla(155,70%,45%,0.1)", color: "hsl(155,70%,45%)" }}>
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> RUNNING
              </span>
            )}
          </div>
          <button
            onClick={triggerSweep}
            disabled={triggering || sweepStatus?.isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "hsl(210,80%,55%)", color: "white", opacity: triggering || sweepStatus?.isRunning ? 0.5 : 1 }}>
            {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Run Sweep Now
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
          {[
            { label: "Total Projects", value: sweepStatus?.total ?? projects.length, color: "hsl(210,80%,55%)" },
            { label: "AI Arch Linked", value: sweepStatus?.linked ?? linkedProjects.length, color: "hsl(155,70%,45%)" },
            { label: "Unswept", value: sweepStatus?.unswept ?? 0, color: "hsl(45,100%,50%)" },
            { label: "Last Sweep", value: lastSweepFormatted, color: "rgba(15,23,42,0.5)", small: true },
          ].map((stat, i) => (
            <div key={stat.label} className="px-5 py-4" style={{ borderRight: i < 3 ? "1px solid rgba(15,23,42,0.06)" : undefined }}>
              <p className="text-xs font-medium mb-1" style={{ color: "rgba(15,23,42,0.45)" }}>{stat.label}</p>
              <p className={(stat as any).small ? "text-sm font-bold" : "text-2xl font-black"} style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(15,23,42,0.06)", background: "rgba(15,23,42,0.02)" }}>
          <p className="text-[11px]" style={{ color: "rgba(15,23,42,0.45)" }}>
            Sirius runs this sweep every 24 hours — analysing every project to determine if it needs app development and what's needed to reach market. Results appear in each project's AI Architecture tab.
          </p>
        </div>
      </div>

      {/* Pending Sweep */}
      {pendingProjects.length > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "hsla(210,80%,55%,0.05)", border: "1px solid hsla(210,80%,55%,0.15)" }}>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "hsl(210,80%,55%)" }} />
          <p className="text-sm text-slate-700">Analysing <strong>{pendingProjects.length}</strong> project{pendingProjects.length !== 1 ? "s" : ""} right now…</p>
        </div>
      )}

      {/* Linked Projects */}
      {linkedProjects.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4" style={{ color: "hsl(155,70%,45%)" }} />
              <span className="text-slate-800 font-bold text-sm">Projects Linked to AI Architecture</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsla(155,70%,45%,0.1)", color: "hsl(155,70%,45%)" }}>{linkedProjects.length}</span>
            </div>
            <button onClick={() => onNavigate("projects")} className="text-xs font-medium" style={{ color: "hsl(193,100%,40%)" }}>View all projects →</button>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
            {linkedProjects.slice(0, 8).map(p => {
              const ins: AiArchInsights | null = (() => { try { return p.aiArchInsights ? JSON.parse(p.aiArchInsights) : null; } catch { return null; } })();
              return (
                <div key={p.id}
                  onClick={() => onOpenProject(p)}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-all hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsla(210,80%,55%,0.08)" }}>
                    <Layers className="w-4 h-4" style={{ color: "hsl(210,80%,55%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] truncate" style={{ color: "rgba(15,23,42,0.5)" }}>
                      {p.industry}
                      {ins?.techStack?.length ? ` · ${ins.techStack.slice(0, 3).join(", ")}` : ""}
                    </p>
                  </div>
                  {ins?.marketReadinessScore && (
                    <div className="flex-shrink-0 text-center">
                      <span className="text-xs font-black" style={{ color: ins.marketReadinessScore >= 7 ? "hsl(155,70%,45%)" : ins.marketReadinessScore >= 5 ? "hsl(45,100%,45%)" : "hsl(0,70%,55%)" }}>
                        {ins.marketReadinessScore}/10
                      </span>
                      <p className="text-[9px]" style={{ color: "rgba(15,23,42,0.4)" }}>readiness</p>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(15,23,42,0.3)" }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Architecture Reference Docs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: "hsl(45,100%,50%)" }} />
            <span className="text-slate-800 font-bold text-sm">AI Architecture Reference</span>
          </div>
          <p className="text-xs mt-1" style={{ color: "rgba(15,23,42,0.5)" }}>Technical reference for how AI builds software — used by Sirius when assessing your projects.</p>
        </div>
        <div className="p-5">
          <AiArchContent />
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type FundingAlert = { id: string; projectName: string; count: number; timestamp: number };

export function StarLabPage() {
  const [, setLocation] = useLocation();
  const [unlocked, setUnlocked] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [pin, setPin] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessRole>("owner");
  const [appBuilderPreload, setAppBuilderPreload] = useState<string | null>(null);

  const userName = typeof window !== "undefined"
    ? (localStorage.getItem("sirius_display_name") || "").trim() || "Garry"
    : "Garry";
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [unarchivingId, setUnarchivingId] = useState<number | null>(null);

  // Quick Wins analysis
  type QuickWinPick = {
    rank: number; projectId: number; projectName: string;
    investmentBand: string; buildTime: string; revenueStart: string;
    monthlyRevenueEstimate: string; whyWin: string; immediateAction: string;
    riskNote: string; score: number;
  };
  const [quickWinsOpen, setQuickWinsOpen] = useState(false);
  const [quickWinsRunning, setQuickWinsRunning] = useState(false);
  const [quickWinsTotal, setQuickWinsTotal] = useState(0);
  const [quickWinsScanning, setQuickWinsScanning] = useState("");
  const [quickWinsPicks, setQuickWinsPicks] = useState<QuickWinPick[]>([]);
  const [quickWinsHeadline, setQuickWinsHeadline] = useState("");
  const [quickWinsSummary, setQuickWinsSummary] = useState("");
  const [quickWinsError, setQuickWinsError] = useState("");

  const runQuickWins = async () => {
    setQuickWinsOpen(true);
    setQuickWinsRunning(true);
    setQuickWinsPicks([]);
    setQuickWinsHeadline("");
    setQuickWinsSummary("");
    setQuickWinsError("");
    setQuickWinsScanning("Starting analysis…");
    try {
      const base = getApiBase();
      const res = await fetch(`${base}lab/projects/quick-wins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
      });
      if (!res.body) throw new Error("No response body");
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
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "start") setQuickWinsTotal(evt.total);
            else if (evt.type === "scanning") setQuickWinsScanning(evt.message);
            else if (evt.type === "summary_start") setQuickWinsSummary(evt.message);
            else if (evt.type === "pick") setQuickWinsPicks(prev => {
              const exists = prev.find(p => p.rank === evt.rank);
              if (exists) return prev;
              return [...prev, evt as QuickWinPick].sort((a, b) => a.rank - b.rank);
            });
            else if (evt.type === "done") setQuickWinsHeadline(evt.headline || "");
            else if (evt.type === "complete") setQuickWinsRunning(false);
            else if (evt.type === "error") { setQuickWinsError(evt.message); setQuickWinsRunning(false); }
          } catch {}
        }
      }
    } catch (err: any) {
      setQuickWinsError(err?.message || "Analysis failed");
      setQuickWinsRunning(false);
    }
  };
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [navMode, setNavMode] = useState<NavMode>("dashboard");
  const [revenueInitialTab, setRevenueInitialTab] = useState<RevenueTab | undefined>();
  const [pendingReportSession, setPendingReportSession] = useState<string | undefined>();
  const [pendingCommissionSession, setPendingCommissionSession] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("General");
  const [fundingAlerts, setFundingAlerts] = useState<FundingAlert[]>([]);
  const prevFundingStatus = useRef<Record<number, string>>({});
  const [changePinOpen, setChangePinOpen] = useState(false);

  // ── Code Agent terminal ───────────────────────────────────────────────────
  type CodeAgentEventType = "thinking" | "tool_call" | "tool_result" | "file_change" | "message" | "complete" | "error";
  type CodeAgentEvt = { type: CodeAgentEventType; text?: string; tool?: string; args?: Record<string, any>; result?: string; error?: boolean; path?: string; action?: string; summary?: string; filesChanged?: string[]; message?: string };
  const [codeTerminalOpen, setCodeTerminalOpen] = useState(false);
  const [codeTerminalMinimised, setCodeTerminalMinimised] = useState(false);
  const [codeEvents, setCodeEvents] = useState<CodeAgentEvt[]>([]);
  const [codeAgentRunning, setCodeAgentRunning] = useState(false);
  const codeEventsEndRef = useRef<HTMLDivElement>(null);
  const codeStreamRef = useRef<EventSource | null>(null);

  const base = getApiBase();

  useEffect(() => {
    const stored = sessionStorage.getItem("lab_pin");
    const storedRole = sessionStorage.getItem("lab_role") as AccessRole | null;
    if (stored) { setPin(stored); setAccessLevel(storedRole || "owner"); setUnlocked(true); }
  }, []);

  const headers = useCallback(() => ({ "Content-Type": "application/json", "x-lab-pin": pin }), [pin]);

  // Subscribe to live Code Agent SSE stream when Star Lab is unlocked
  useEffect(() => {
    if (!unlocked || !pin) return;
    const sessionId = Math.random().toString(36).slice(2);
    let es: EventSource | null = null;
    let closed = false;
    let errorCount = 0;

    const connect = () => {
      if (closed) return;
      es = new EventSource(`${base}lab/code/stream?session=${sessionId}&pin=${encodeURIComponent(pin)}`);
      codeStreamRef.current = es;
      es.onmessage = (e) => {
        errorCount = 0;
        try {
          const event = JSON.parse(e.data) as CodeAgentEvt & { type: string };
          if ((event as any).type === "connected") return;
          if (event.type === "thinking" || event.type === "tool_call" || event.type === "tool_result" || event.type === "file_change" || event.type === "message" || event.type === "complete" || event.type === "error") {
            setCodeEvents(prev => [...prev.slice(-199), event as CodeAgentEvt]);
            if (event.type === "thinking" || event.type === "tool_call") { setCodeAgentRunning(true); setCodeTerminalOpen(true); setCodeTerminalMinimised(false); }
            if (event.type === "complete" || event.type === "error") { setCodeAgentRunning(false); }
            setTimeout(() => { codeEventsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 80);
          }
        } catch { /* ignore parse errors */ }
      };
      es.onerror = () => {
        es?.close();
        errorCount += 1;
        // Back off exponentially, cap at 60s, give up after 5 failures
        if (!closed && errorCount <= 5) {
          const delay = Math.min(2000 * Math.pow(2, errorCount - 1), 60000);
          setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => { closed = true; es?.close(); codeStreamRef.current = null; };
  }, [unlocked, pin, base]);

  const loadingRef = useRef(false);
  const loadProjects = useCallback(async (attempt = 0) => {
    if (attempt === 0) {
      if (loadingRef.current) return; // already in-flight, skip
      loadingRef.current = true;
      setProjectsLoading(true);
      setProjectsError(false);
    }
    try {
      const res = await fetch(`${base}lab/projects`, { headers: headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh: Project[] = await res.json();
      setProjects(fresh);
      setProjectsError(false);
      setProjectsLoading(false);
      loadingRef.current = false;

      // Check for newly completed funding / AI-arch analyses
      // Note: the list endpoint returns summary columns only — large fields (fundingAnalysis,
      // aiArchInsights) are empty stubs. When a status change is detected, we do a full
      // loadProject reload to get the real data rather than reading from the list.
      for (const p of fresh) {
        const prev = prevFundingStatus.current[p.id];
        if (prev === "pending" && p.fundingStatus === "complete") {
          // Reload the full project to get the real fundingAnalysis data
          const fullRes = await fetch(`${base}lab/projects/${p.id}`, { headers: headers() });
          if (fullRes.ok) {
            const fullProject = await fullRes.json();
            const matches = (() => { try { return JSON.parse(fullProject.fundingAnalysis || "{}").opportunities?.[0]?.matches?.length ?? 0; } catch { return 0; } })();
            const alert: FundingAlert = { id: `${p.id}-${Date.now()}`, projectName: p.name, count: matches, timestamp: Date.now() };
            setFundingAlerts(prev => [...prev, alert]);
            setActiveProject(cur => cur?.id === p.id ? { ...cur, ...fullProject } : cur);
            setTimeout(() => setFundingAlerts(prev => prev.filter(a => a.id !== alert.id)), 8000);
          }
        }
        prevFundingStatus.current[p.id] = p.fundingStatus;
        const prevArch = (prevFundingStatus.current as any)[`arch-${p.id}`];
        if (prevArch === "pending" && (p.aiArchLinked === "linked" || p.aiArchLinked === "not-applicable")) {
          // Reload the full project to get the real aiArchInsights data
          const fullRes = await fetch(`${base}lab/projects/${p.id}`, { headers: headers() });
          if (fullRes.ok) {
            const fullProject = await fullRes.json();
            setActiveProject(cur => cur?.id === p.id ? { ...cur, ...fullProject } : cur);
          }
        }
        (prevFundingStatus.current as any)[`arch-${p.id}`] = p.aiArchLinked;
      }
    } catch {
      if (attempt < 3) {
        // Retry with back-off: 2s, 4s, 8s — handles server restart windows
        setTimeout(() => loadProjects(attempt + 1), 2000 * Math.pow(2, attempt));
      } else {
        setProjectsError(true);
        setProjectsLoading(false);
        loadingRef.current = false;
      }
    }
  }, [base, headers]);

  const loadProject = useCallback(async (id: number) => {
    const res = await fetch(`${base}lab/projects/${id}`, { headers: headers() });
    if (res.ok) { const p = await res.json(); setActiveProject(p); }
  }, [base, headers]);

  useEffect(() => { if (unlocked) loadProjects(); }, [unlocked, loadProjects]);

  // Dismiss the voice greeting overlay whenever the user navigates via sidebar
  useEffect(() => {
    if (showGreeting) setShowGreeting(false);
  }, [navMode]);

  // Poll every 30s to detect completed funding analyses
  useEffect(() => {
    if (!unlocked) return;
    const interval = setInterval(loadProjects, 30000);
    return () => clearInterval(interval);
  }, [unlocked, loadProjects]);

  // Auto-narrate whenever the user switches to a new section
  const prevNavRef = useRef<string | null>(null);
  useEffect(() => {
    if (!unlocked || navMode === prevNavRef.current) return;
    prevNavRef.current = navMode;
    const narrate: Partial<Record<NavMode, string>> = {
      dashboard:   "Dashboard. You're at command centre. What do you want to focus on today?",
      projects:    "Projects. Your innovation portfolio is here. Which project do you want to work on?",
      botlab:      "Bot Lab. I can design any automation for you right now — just describe what you want to automate and I'll build the full architecture. What task or workflow do you want to turn into a bot?",
      scout:       "Scout. I'm scanning for market opportunities. Want me to brief you on what I've found?",
      feed:        "Intelligence Feed. I'm tracking market signals for you. Shall I highlight the most important ones?",
      grants:      "Funding Radar. I have grant matches ready. Want me to walk you through the best opportunities?",
      commerce:    "Commerce Lab. E-commerce and retail strategy tools. What product or market are we targeting?",
      outreach:    "Outreach Hub. Your sales and partner tools. Who are we reaching out to today?",
      autolab:     "Auto Lab. You have projects awaiting your decision. Want me to summarise what needs your approval?",
      revenue:     "Revenue Centre. Sales plans and financial projections. Do you want to review the numbers?",
      agency:      "Agency Hub. Client delivery tracking. Which client or project should we look at?",
      mission:     "Mission Control. Your strategic objectives and KPIs. How are we tracking against the targets?",
      growth:      "Growth Engine. Marketing and growth strategy. Where do you want to focus growth right now?",
      brain:       "Sirius Brain. Deep strategic intelligence. What question do you want me to analyse?",
      research:    "Deep Research. AI-powered market research. What sector or technology should I research?",
      docs:        "Document Intelligence. Upload and analyse documents. What document are we working with?",
      labchat:     "Full conversation workspace. I'm listening. What would you like to discuss?",
      appbuilder:  "App Builder. Autonomous development pipeline. What application do you want me to build?",
      "ai-arch":   "AI Architecture. Technical design for your projects. Which project needs an AI stack?",
      orchestrate: "Command Centre. Full pipeline orchestration. Give me your command and I'll execute it.",
      sysaudit:    "System Audit. Running live health checks across every Sirius subsystem now.",
    };
    const text = narrate[navMode as NavMode];
    if (text) speakText(text, undefined, 0.87, pin);
  }, [navMode, unlocked]);

  const onUnlock = (p: string, role: AccessRole) => {
    setPin(p);
    setAccessLevel(role);
    setUnlocked(true);
    if (role === "owner") setShowGreeting(true);
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

  if (!unlocked) return <div data-lab="true"><PinGate onUnlock={onUnlock} userName={userName} /></div>;

  const anyPendingFunding = projects.some(p => p.fundingStatus === "pending");
  const isGuest = accessLevel === "guest";

  const NAV_CATEGORIES = [
    { id: "command",      label: "COMMAND",      accent: "hsl(193,100%,42%)",  bg: "hsla(193,100%,42%,0.07)"  },
    { id: "build",        label: "BUILD",        accent: "hsl(155,70%,42%)",   bg: "hsla(155,70%,42%,0.07)"   },
    { id: "intelligence", label: "INTELLIGENCE",  accent: "hsl(210,80%,55%)",   bg: "hsla(210,80%,55%,0.07)"   },
    { id: "revenue",      label: "REVENUE",      accent: "hsl(25,90%,55%)",    bg: "hsla(25,90%,55%,0.07)"    },
  ] as const;

  const ALL_NAV_ITEMS = [
    // COMMAND
    { id: "orchestrate" as NavMode, label: "Command Centre",  icon: Zap,             color: "hsl(193,100%,60%)", category: "command",      guestAllowed: false, badge: true },
    { id: "dashboard" as NavMode,  label: "Dashboard",        icon: LayoutDashboard, color: "hsl(193,100%,45%)", category: "command",      guestAllowed: true  },
    { id: "labchat"   as NavMode,  label: "Chat with Sirius", icon: MessageSquare,   color: "hsl(193,100%,50%)", category: "command",      guestAllowed: true  },
    { id: "sysaudit"  as NavMode,  label: "System Audit",     icon: ShieldAlert,     color: "hsl(210,80%,55%)",  category: "command",      guestAllowed: false },
    { id: "upgrades"  as NavMode,  label: "Sirius Upgrades",  icon: Package,         color: "hsl(280,80%,58%)",  category: "command",      guestAllowed: false },
    { id: "tasks"     as NavMode,  label: "Background Tasks", icon: Clock,            color: "hsl(193,100%,45%)", category: "command",      guestAllowed: false },
    { id: "team"      as NavMode,  label: "Team Access",      icon: Users,            color: "hsl(193,100%,50%)", category: "command",      guestAllowed: false },
    { id: "mission"   as NavMode,  label: "Mission",          icon: Star,            color: "hsl(193,100%,50%)", category: "command",      guestAllowed: true  },
    // BUILD
    { id: "appbuilder" as NavMode, label: "App Builder",      icon: Rocket,          color: "hsl(155,70%,42%)",  category: "build",        guestAllowed: false },
    { id: "projects"   as NavMode, label: "Projects",         icon: FolderOpen,      color: "hsl(155,60%,38%)",  category: "build",        guestAllowed: true  },
    { id: "botlab"     as NavMode, label: "Bot Lab",          icon: Bot,             color: "hsl(280,70%,55%)",  category: "build",        guestAllowed: false },
    { id: "autolab"    as NavMode, label: "Autonomous Lab",   icon: Cpu,             color: "hsl(155,50%,40%)",  category: "build",        guestAllowed: false },
    { id: "ai-arch"  as NavMode,   label: "AI Architecture",  icon: Layers,          color: "hsl(155,60%,38%)",  category: "build",        guestAllowed: false },
    // INTELLIGENCE
    { id: "scout"    as NavMode,   label: "Scout",            icon: Telescope,       color: "hsl(45,100%,45%)",  category: "intelligence", guestAllowed: true  },
    { id: "feed"     as NavMode,   label: "AI Intelligence",  icon: Atom,            color: "hsl(210,80%,55%)",  category: "intelligence", guestAllowed: true,  badge: true },
    { id: "research" as NavMode,   label: "Deep Research",    icon: BookOpen,        color: "hsl(45,100%,50%)",  category: "intelligence", guestAllowed: true  },
    { id: "docs"     as NavMode,   label: "Document Intel",   icon: FileSearch,      color: "hsl(210,90%,55%)",  category: "intelligence", guestAllowed: true  },
    { id: "brain"    as NavMode,   label: "Sirius Brain",     icon: Brain,           color: "hsl(280,70%,65%)",  category: "intelligence", guestAllowed: false },
    // REVENUE
    { id: "revenue"  as NavMode,   label: "Revenue Hub",      icon: Banknote,        color: "hsl(155,70%,45%)",  category: "revenue",      guestAllowed: false },
    { id: "commerce" as NavMode,   label: "Commerce Lab",     icon: TrendingUp,      color: "hsl(25,90%,55%)",   category: "revenue",      guestAllowed: false },
    { id: "grants"   as NavMode,   label: "Funding Radar",    icon: BadgeCheck,      color: "hsl(155,70%,45%)",  category: "revenue",      guestAllowed: false, pending: anyPendingFunding },
    { id: "agency"   as NavMode,   label: "Agency Hub",       icon: Briefcase,       color: "hsl(220,80%,55%)",  category: "revenue",      guestAllowed: false },
    { id: "growth"   as NavMode,   label: "Growth Engine",    icon: Globe,           color: "hsl(155,70%,50%)",  category: "revenue",      guestAllowed: false },
    { id: "outreach" as NavMode,   label: "Outreach Hub",     icon: Mail,            color: "hsl(340,80%,60%)",  category: "revenue",      guestAllowed: false },
  ];
  const NAV_ITEMS = isGuest ? ALL_NAV_ITEMS.filter(n => n.guestAllowed) : ALL_NAV_ITEMS;

  return (
    <div data-lab="true" className="h-screen flex relative overflow-hidden" style={{ background: "#F8FAFC" }}>

      {/* Twin avatar greeting overlay */}
      {showGreeting && (
        <LabAvatarGreeting
          userName={userName}
          onNavigate={(mode) => setNavMode(mode)}
          onDismiss={() => setShowGreeting(false)}
          projects={projects}
          pin={pin}
        />
      )}

      {/* Funding alert toasts */}
      <AnimatePresence>
        {fundingAlerts.map(alert => (
          <motion.div key={alert.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-2xl p-4 shadow-2xl"
            style={{ background: "#F8FAFC", border: "1px solid hsla(155,70%,45%,0.35)", boxShadow: "0 0 40px hsla(155,70%,40%,0.15), 0 8px 32px rgba(0,0,0,0.06)", maxWidth: "340px" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsla(155,70%,45%,0.15)" }}>
              <BadgeCheck className="w-4 h-4" style={{ color: "hsl(155,70%,50%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-semibold text-sm leading-snug">Funding analysis complete</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(15,23,42,0.55)" }}>
                <span className="text-slate-600">{alert.projectName}</span> — {alert.count > 0 ? `${alert.count} funding opportunit${alert.count === 1 ? "y" : "ies"} found` : "No matching schemes found"}
              </p>
              <button onClick={() => { setNavMode("projects"); setFundingAlerts(prev => prev.filter(a => a.id !== alert.id)); }}
                className="text-xs mt-2 font-medium transition-opacity hover:opacity-75" style={{ color: "hsl(155,70%,50%)" }}>
                View project →
              </button>
            </div>
            <button onClick={() => setFundingAlerts(prev => prev.filter(a => a.id !== alert.id))}
              className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Code Terminal Panel ─────────────────────────────────────────── */}
      {codeTerminalOpen && (
        <div className="fixed bottom-5 left-5 z-[60] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: "400px", maxHeight: codeTerminalMinimised ? "48px" : "480px", background: "#0D1117", border: "1px solid rgba(255,255,255,0.08)", transition: "max-height 0.25s ease" }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0" style={{ background: "#161B22", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
            </div>
            <span className="text-xs font-mono ml-1 flex-1" style={{ color: "rgba(255,255,255,0.7)" }}>
              💻 Code Terminal{codeAgentRunning ? " — running…" : " — idle"}
            </span>
            {codeAgentRunning && <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "hsl(155,70%,50%)" }} />}
            <button onClick={() => setCodeTerminalMinimised(v => !v)} className="text-xs px-1.5 py-0.5 rounded font-mono transition-colors" style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}>
              {codeTerminalMinimised ? "↑" : "−"}
            </button>
            <button onClick={() => { setCodeTerminalOpen(false); setCodeEvents([]); }} className="text-xs px-1.5 py-0.5 rounded font-mono transition-colors" style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}>
              ×
            </button>
          </div>
          {/* Event log */}
          {!codeTerminalMinimised && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs" style={{ maxHeight: "432px" }}>
              {codeEvents.length === 0 && (
                <p style={{ color: "rgba(255,255,255,0.25)" }}>Waiting for Code Agent…</p>
              )}
              {codeEvents.map((ev, i) => {
                if (ev.type === "thinking") return (
                  <p key={i} style={{ color: "rgba(255,255,255,0.45)" }}>▸ {ev.text}</p>
                );
                if (ev.type === "tool_call") return (
                  <p key={i} style={{ color: "hsl(193,100%,60%)" }}>⚙ {ev.tool}({ev.args ? Object.keys(ev.args).map(k => `${k}="${String(ev.args![k]).slice(0, 40)}"`).join(", ") : ""})</p>
                );
                if (ev.type === "file_change") {
                  const col = ev.action === "modified" ? "hsl(45,100%,60%)" : ev.action === "created" ? "hsl(155,70%,55%)" : "rgba(255,255,255,0.35)";
                  const icon = ev.action === "modified" ? "✎" : ev.action === "created" ? "+" : ev.action === "listed" ? "📂" : "📄";
                  return <p key={i} style={{ color: col }}>{icon} {ev.path} <span style={{ color: "rgba(255,255,255,0.3)" }}>({ev.action})</span></p>;
                }
                if (ev.type === "tool_result") return (
                  <p key={i} style={{ color: ev.error ? "hsl(0,75%,65%)" : "rgba(255,255,255,0.3)" }}>  → {ev.result?.slice(0, 120)}</p>
                );
                if (ev.type === "message") return (
                  <p key={i} style={{ color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap" }}>{ev.text}</p>
                );
                if (ev.type === "complete") return (
                  <div key={i} className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <p style={{ color: "hsl(155,70%,55%)" }}>✓ Complete</p>
                    {ev.filesChanged && ev.filesChanged.length > 0 && ev.filesChanged.map((f, fi) => (
                      <p key={fi} style={{ color: "rgba(255,255,255,0.4)" }}>  • {f}</p>
                    ))}
                  </div>
                );
                if (ev.type === "error") return (
                  <p key={i} style={{ color: "hsl(0,75%,65%)" }}>✗ {ev.message}</p>
                );
                return null;
              })}
              <div ref={codeEventsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* SIDEBAR */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isGuest ? "linear-gradient(135deg, hsl(45,90%,45%), hsl(25,90%,45%))" : "linear-gradient(135deg, hsl(193,100%,30%), hsl(226,70%,45%))" }}>
              {isGuest ? <ShieldAlert className="w-4 h-4 text-slate-800" /> : <Star className="w-4 h-4 text-slate-800" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-bold text-sm leading-none">Star Lab</p>
              {isGuest
                ? <p className="text-xs mt-0.5 font-medium" style={{ color: "hsl(45,90%,55%)" }}>Guest Access</p>
                : <p className="text-slate-400 text-xs mt-0.5">Private R&D</p>
              }
            </div>
            {!isGuest && <NotificationBell pin={pin} />}
            <button
              onClick={() => setLocation("/")}
              title="Back to Sirius"
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all flex-shrink-0"
              style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.35)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(15,23,42,0.1)"; e.currentTarget.style.color = "rgba(15,23,42,0.7)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(15,23,42,0.05)"; e.currentTarget.style.color = "rgba(15,23,42,0.35)"; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {isGuest && (
            <div className="mt-2.5 px-2 py-1.5 rounded-lg text-xs leading-snug" style={{ background: "hsl(45,90%,45%,0.1)", border: "1px solid hsl(45,90%,45%,0.2)", color: "hsl(45,90%,65%)" }}>
              Limited access · Private data hidden
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="overflow-y-auto" style={{ borderBottom: "1px solid rgba(15,23,42,0.07)", maxHeight: "calc(100vh - 140px)" }}>
          {NAV_CATEGORIES.map(cat => {
            const items = NAV_ITEMS.filter(n => n.category === cat.id);
            if (items.length === 0) return null;
            const catActive = items.some(n => n.id === navMode);
            return (
              <div key={cat.id} className="mb-0.5">
                {/* Category header */}
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat.accent }} />
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: catActive ? cat.accent : "rgba(15,23,42,0.3)" }}>{cat.label}</span>
                  <div className="flex-1 h-px" style={{ background: catActive ? `${cat.accent}40` : "rgba(15,23,42,0.06)" }} />
                </div>
                {/* Items */}
                <div className="px-2 pb-1" style={{ borderLeft: `2px solid ${cat.bg}`, marginLeft: "10px" }}>
                  {items.map(item => {
                    const Icon = item.icon;
                    const active = navMode === item.id;
                    return (
                      <button key={item.id} onClick={() => setNavMode(item.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-0.5 transition-all text-left"
                        style={{
                          background: active ? cat.bg : "transparent",
                          borderLeft: active ? `2px solid ${item.color}` : "2px solid transparent",
                          marginLeft: "-2px",
                        }}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: active ? item.color : "rgba(15,23,42,0.45)" }} />
                        <span className="text-xs flex-1 font-medium" style={{ color: active ? item.color : "rgba(15,23,42,0.5)" }}>{item.label}</span>
                        {item.badge && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        )}
                        {item.pending && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: "hsl(45,100%,55%)" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Projects list */}
        {navMode === "projects" && (
          <>
            <div className="px-3 pt-3 pb-2 flex flex-col gap-2">
              <button onClick={() => setCreating(true)}
                className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-all"
                style={{ background: "hsl(193,100%,32%)", color: "white" }}>
                <Plus className="w-3.5 h-3.5" /> New Project
              </button>
              <button onClick={runQuickWins}
                className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(45,100%,48%), hsl(35,100%,52%))", color: "white" }}>
                <Zap className="w-3.5 h-3.5" /> Quick Wins Analysis
              </button>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "rgba(15,23,42,0.3)" }} />
                <input
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  placeholder="Search projects…"
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.08)", color: "rgba(15,23,42,0.8)" }}
                />
              </div>
              {/* Archive toggle */}
              {(() => {
                const archivedCount = projects.filter(p => p.status === "archived").length;
                return archivedCount > 0 ? (
                  <button
                    onClick={() => setShowArchived(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all w-full"
                    style={{ background: showArchived ? "hsla(25,100%,55%,0.1)" : "rgba(15,23,42,0.05)", color: showArchived ? "hsl(25,100%,42%)" : "rgba(15,23,42,0.45)", border: `1px solid ${showArchived ? "hsla(25,100%,55%,0.25)" : "rgba(15,23,42,0.08)"}` }}>
                    <Archive className="w-3 h-3 flex-shrink-0" />
                    <span>{showArchived ? "Hide archived" : `Show archived (${archivedCount})`}</span>
                  </button>
                ) : null;
              })()}
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <AnimatePresence>
                {creating && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="rounded-xl p-3 mb-1.5" style={{ background: "#F1F5F9", border: "1px solid hsl(193,100%,35%,0.5)" }}>
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && createProject()}
                      placeholder="Project name" className="w-full bg-transparent text-slate-800 text-xs outline-none placeholder-slate-400 mb-2" />
                    <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)}
                      className="w-full text-slate-500 text-xs outline-none mb-2.5 px-1 py-1 rounded-lg"
                      style={{ background: "#E2E8F0" }}>
                      {INDUSTRIES.map(i => <option key={i} value={i} style={{ background: "#E2E8F0" }}>{i}</option>)}
                    </select>
                    <div className="flex gap-1.5">
                      <button onClick={createProject} className="flex-1 py-1.5 rounded-lg text-xs text-slate-800 font-medium" style={{ background: "hsl(193,100%,35%)" }}>Create</button>
                      <button onClick={() => setCreating(false)} className="py-1.5 px-2.5 rounded-lg text-xs text-slate-400">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading state */}
              {projectsLoading && projects.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "hsl(193,100%,45%)" }} />
                  <span className="text-xs" style={{ color: "rgba(15,23,42,0.4)" }}>Loading projects…</span>
                </div>
              )}

              {/* Error state */}
              {projectsError && (
                <div className="flex flex-col items-center gap-2 py-6 px-3">
                  <p className="text-xs text-center" style={{ color: "rgba(15,23,42,0.4)" }}>Could not load projects</p>
                  <button onClick={() => loadProjects(0)} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: "hsl(193,100%,32%)", color: "white" }}>
                    Retry
                  </button>
                </div>
              )}

              {/* Project list */}
              {(() => {
                const pool = showArchived
                  ? projects.filter(p => p.status === "archived")
                  : projects.filter(p => p.status !== "archived");
                const filtered = projectSearch.trim()
                  ? pool.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()) || (p.industry || "").toLowerCase().includes(projectSearch.toLowerCase()))
                  : pool;

                if (filtered.length === 0 && !projectsLoading && !projectsError && !creating) {
                  return (
                    <p className="text-xs text-center py-6" style={{ color: "rgba(15,23,42,0.3)" }}>
                      {showArchived ? "No archived projects" : projectSearch ? `No matches for "${projectSearch}"` : "No projects yet"}
                    </p>
                  );
                }

                return filtered.map(p => {
                  const isArchived = p.status === "archived";
                  return (
                    <div key={p.id} onClick={() => { if (!isArchived) loadProject(p.id); }}
                      className="group flex items-center gap-2 rounded-xl px-2.5 py-2 mb-0.5 transition-all"
                      style={{
                        background: isArchived ? "rgba(15,23,42,0.02)" : activeProject?.id === p.id ? "#E8EEF5" : "transparent",
                        border: isArchived ? "1px solid rgba(15,23,42,0.06)" : activeProject?.id === p.id ? "1px solid rgba(15,23,42,0.11)" : "1px solid transparent",
                        cursor: isArchived ? "default" : "pointer",
                        opacity: isArchived ? 0.75 : 1,
                      }}>
                      {isArchived
                        ? <Archive className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(25,100%,55%)" }} />
                        : <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(193,100%,45%)" }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: isArchived ? "rgba(15,23,42,0.5)" : "rgba(15,23,42,0.85)" }}>{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs truncate" style={{ color: "rgba(15,23,42,0.3)" }}>{p.industry}</span>
                          {isArchived && p.investmentRequired && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                              style={{ background: "hsla(25,100%,55%,0.1)", color: "hsl(25,100%,42%)" }}>
                              £{p.investmentRequired.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isArchived ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setUnarchivingId(p.id);
                              fetch(`${base}lab/projects/${p.id}/unarchive`, { method: "POST", headers: headers() })
                                .then(() => loadProjects())
                                .finally(() => setUnarchivingId(null));
                            }}
                            title="Restore to active"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "hsla(155,70%,45%,0.12)", color: "hsl(155,70%,35%)" }}>
                            {unarchivingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Restore"}
                          </button>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3 text-red-400/50 hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}

        {/* Voice widget + settings — bottom of sidebar, owner only */}
        {!isGuest && (
          <div className="mt-auto border-t flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
            <div className="p-2">
              <StarLabVoiceWidget
                navMode={navMode}
                onNavigate={(mode) => setNavMode(mode as NavMode)}
                onOpenProject={id => { loadProject(id); setNavMode("projects"); }}
                activeProject={activeProject}
                projects={projects}
                pin={pin}
              />
            </div>
            <div className="px-3 pb-3">
              <button
                onClick={() => setChangePinOpen(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                style={{ color: "rgba(15,23,42,0.35)", background: "transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(15,23,42,0.6)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(15,23,42,0.35)"; }}>
                <Settings2 className="w-3 h-3 flex-shrink-0" />
                <span>Change PIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Global breadcrumb / back bar — shown on every panel except dashboard */}
        {navMode !== "dashboard" && (
          <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
            <button onClick={() => { setNavMode("dashboard"); setActiveProject(null); }}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2 py-1"
              style={{ color: "rgba(15,23,42,0.4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "hsl(193,100%,40%)"; (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(15,23,42,0.4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <LayoutDashboard className="w-3 h-3" />
              Dashboard
            </button>
            <ChevronRight className="w-3 h-3" style={{ color: "rgba(15,23,42,0.5)" }} />
            {activeProject && navMode === "projects" ? (
              <>
                <button onClick={() => setActiveProject(null)}
                  className="text-xs font-medium transition-colors rounded-lg px-2 py-1"
                  style={{ color: "rgba(15,23,42,0.4)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "hsl(193,100%,40%)"; (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(15,23,42,0.4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  Projects
                </button>
                <ChevronRight className="w-3 h-3" style={{ color: "rgba(15,23,42,0.5)" }} />
                <span className="text-xs font-semibold text-slate-700 px-2 py-1 rounded-lg" style={{ background: "#F1F5F9" }}>{activeProject.name}</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-700 px-2 py-1 rounded-lg" style={{ background: "#F1F5F9" }}>
                {ALL_NAV_ITEMS.find(n => n.id === navMode)?.label ?? navMode}
              </span>
            )}
          </div>
        )}

        {navMode === "dashboard" && (
          <DashboardPanel
            projects={projects}
            pin={pin}
            onNavigate={m => setNavMode(m)}
            onOpenProject={p => { loadProject(p.id); }}
          />
        )}
        {navMode === "feed" && <FeedPanel pin={pin} />}
        {navMode === "scout" && <ScoutPanel pin={pin} />}
        {navMode === "botlab" && <BotLabPanel pin={pin} />}
        {navMode === "grants" && <FundingRadarPanel pin={pin} />}
        {navMode === "commerce" && <CommerceLabPanel pin={pin} />}
        {navMode === "agency" && <AgencyHubPanel pin={pin} />}
        {navMode === "growth" && <GrowthEnginePanel pin={pin} />}
        {navMode === "labchat" && (
          <SiriusLabChatPanel
            pin={pin}
            accessLevel={accessLevel}
            navMode={navMode}
            activeProject={activeProject}
            onNavigate={m => setNavMode(m as NavMode)}
            onOpenProject={id => {
              loadProject(id);
            }}
            onNavigateAndBuild={(section, prompt) => {
              setAppBuilderPreload(prompt);
              setNavMode(section as NavMode);
            }}
          />
        )}
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
        <div style={{ display: navMode === "autolab" ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <AutoLabPanel
            pin={pin}
            projects={projects}
            onSelectProject={p => { setActiveProject(p); setNavMode("projects"); }}
            onFocusProject={p => setActiveProject(p)}
          />
        </div>
        <div style={{ display: navMode === "orchestrate" ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <OrchestratorPanel pin={pin} onOpenProject={(id) => {
            const found = projects.find(p => p.id === id);
            if (found) { setActiveProject(found); setNavMode("projects"); }
            else { setNavMode("projects"); }
          }} />
        </div>
        {navMode === "sysaudit" && (
          <div className="flex-1 overflow-y-auto" style={{ background: "#F8FAFC" }}>
            <SystemAuditPanel pin={pin} />
          </div>
        )}
        {navMode === "upgrades" && <UpgradesPanel pin={pin} />}
        {navMode === "tasks" && <TasksPanel pin={pin} />}
        {navMode === "team" && <TeamPanel pin={pin} />}
        <div style={{ display: navMode === "appbuilder" ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <AppBuilderPanel
            pin={pin}
            preloadPrompt={appBuilderPreload}
            onPreloadConsumed={() => setAppBuilderPreload(null)}
            onViewProject={(id) => { loadProject(id); setNavMode("projects"); }}
          />
        </div>
        {navMode === "ai-arch" && (
          <AiArchLabPanel pin={pin} projects={projects} onNavigate={setNavMode} onOpenProject={(p) => { setActiveProject(p); setNavMode("projects"); }} />
        )}
        <div style={{ display: (navMode === "projects" && !!activeProject) ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          {activeProject && <ProjectWorkspace
            project={activeProject}
            pin={pin}
            onUpdate={p => setActiveProject(p)}
            onBack={() => setActiveProject(null)}
            allProjects={projects}
            onNavigateProject={id => loadProject(id)}
          />}
        </div>
        {navMode === "projects" && !activeProject && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative" style={{ background: "#F8FAFC" }}>

                {/* ─── Quick Wins Overlay Panel ───────────────────────────────── */}
                <AnimatePresence>
                  {quickWinsOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 flex flex-col"
                      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
                    >
                      <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: "spring", damping: 28, stiffness: 320 }}
                        className="flex-1 flex flex-col m-4 rounded-2xl overflow-hidden shadow-2xl"
                        style={{ background: "#FFFFFF", maxHeight: "calc(100% - 32px)" }}
                      >
                        {/* Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
                          style={{ background: "linear-gradient(135deg, hsl(45,100%,48%), hsl(35,100%,50%))" }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.25)" }}>
                              <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h2 className="font-bold text-white text-base leading-tight">Quick Wins Analysis</h2>
                              <p className="text-xs text-white/75 mt-0.5">
                                {quickWinsRunning
                                  ? `Scanning ${quickWinsTotal} projects…`
                                  : quickWinsPicks.length > 0
                                    ? `Top ${quickWinsPicks.length} of ${quickWinsTotal} projects — lowest investment, fastest revenue`
                                    : "Top 5 projects ready to build and sell immediately"}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => setQuickWinsOpen(false)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-75"
                            style={{ background: "rgba(255,255,255,0.2)" }}>
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        {/* Scanning state */}
                        {quickWinsRunning && quickWinsPicks.length === 0 && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                            <div className="relative w-16 h-16">
                              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "hsla(45,100%,48%,0.2)" }} />
                              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsla(45,100%,48%,0.12)" }}>
                                <Zap className="w-8 h-8" style={{ color: "hsl(45,100%,42%)" }} />
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-slate-700">{quickWinsScanning}</p>
                              <p className="text-xs mt-1" style={{ color: "rgba(15,23,42,0.4)" }}>Sirius is reading every project and scoring commercial potential…</p>
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {quickWinsError && (
                          <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center">
                              <p className="text-sm font-medium text-red-500 mb-2">Analysis failed</p>
                              <p className="text-xs" style={{ color: "rgba(15,23,42,0.45)" }}>{quickWinsError}</p>
                              <button onClick={runQuickWins} className="mt-4 px-4 py-2 rounded-lg text-xs font-medium"
                                style={{ background: "hsl(45,100%,48%)", color: "white" }}>Try again</button>
                            </div>
                          </div>
                        )}

                        {/* Results */}
                        {quickWinsPicks.length > 0 && (
                          <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {/* Summary & headline */}
                            {quickWinsSummary && (
                              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "hsla(45,100%,48%,0.08)", border: "1px solid hsla(45,100%,48%,0.2)", color: "hsl(35,80%,30%)" }}>
                                {quickWinsSummary}
                              </div>
                            )}

                            {/* Loading more picks indicator */}
                            {quickWinsRunning && (
                              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs" style={{ background: "rgba(15,23,42,0.04)", color: "rgba(15,23,42,0.45)" }}>
                                <Loader2 className="w-3 h-3 animate-spin" /> Ranking remaining projects…
                              </div>
                            )}

                            {/* Pick cards */}
                            {quickWinsPicks.map((pick, idx) => {
                              const rankColors = [
                                { bg: "hsl(45,100%,48%)", text: "white", border: "hsl(45,100%,48%)" },
                                { bg: "hsl(220,13%,91%)", text: "hsl(220,13%,35%)", border: "hsl(220,13%,82%)" },
                                { bg: "hsl(25,70%,55%)", text: "white", border: "hsl(25,70%,55%)" },
                                { bg: "hsla(155,70%,45%,0.15)", text: "hsl(155,70%,32%)", border: "hsla(155,70%,45%,0.4)" },
                                { bg: "hsla(193,100%,40%,0.12)", text: "hsl(193,100%,30%)", border: "hsla(193,100%,40%,0.35)" },
                              ];
                              const rc = rankColors[idx] || rankColors[4];
                              const project = projects.find(p => p.id === pick.projectId);
                              return (
                                <motion.div
                                  key={pick.rank}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="rounded-2xl overflow-hidden"
                                  style={{ border: "1px solid rgba(15,23,42,0.09)", background: "#FFFFFF", boxShadow: "0 1px 8px rgba(15,23,42,0.06)" }}
                                >
                                  {/* Card header */}
                                  <div className="flex items-center gap-3 px-4 py-3" style={{ background: "rgba(15,23,42,0.025)" }}>
                                    <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm"
                                      style={{ background: rc.bg, color: rc.text }}>
                                      #{pick.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold text-slate-800 text-sm truncate">{pick.projectName}</h3>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsla(155,70%,45%,0.12)", color: "hsl(155,70%,32%)" }}>
                                          {pick.investmentBand}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsla(193,100%,40%,0.1)", color: "hsl(193,100%,30%)" }}>
                                          Build: {pick.buildTime}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsla(45,100%,48%,0.12)", color: "hsl(35,90%,30%)" }}>
                                          Revenue: {pick.revenueStart}
                                        </span>
                                        {pick.score > 0 && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto" style={{ background: "rgba(15,23,42,0.05)", color: "rgba(15,23,42,0.5)" }}>
                                            Score: {pick.score}/100
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {(project || pick.projectId) && (
                                      <button
                                        onClick={() => {
                                          if (project) { setActiveProject(project); }
                                          else { loadProject(pick.projectId); }
                                          setQuickWinsOpen(false);
                                        }}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                                        style={{ background: "hsl(193,100%,32%)", color: "white" }}>
                                        <ArrowRight className="w-3 h-3" /> Open
                                      </button>
                                    )}
                                  </div>

                                  {/* Card body */}
                                  <div className="px-4 py-3 space-y-3">
                                    <div>
                                      <p className="text-xs font-semibold mb-1" style={{ color: "rgba(15,23,42,0.45)" }}>WHY THIS WINS</p>
                                      <p className="text-sm leading-relaxed" style={{ color: "rgba(15,23,42,0.8)" }}>{pick.whyWin}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="rounded-xl p-3" style={{ background: "hsla(155,70%,45%,0.07)", border: "1px solid hsla(155,70%,45%,0.15)" }}>
                                        <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "hsl(155,70%,35%)" }}>Immediate Action</p>
                                        <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.75)" }}>{pick.immediateAction}</p>
                                      </div>
                                      <div className="rounded-xl p-3" style={{ background: "hsla(25,100%,55%,0.07)", border: "1px solid hsla(25,100%,55%,0.15)" }}>
                                        <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "hsl(25,90%,38%)" }}>Risk to Watch</p>
                                        <p className="text-xs leading-relaxed" style={{ color: "rgba(15,23,42,0.75)" }}>{pick.riskNote}</p>
                                      </div>
                                    </div>
                                    {pick.monthlyRevenueEstimate && (
                                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsla(45,100%,48%,0.08)", border: "1px solid hsla(45,100%,48%,0.2)" }}>
                                        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(35,90%,38%)" }} />
                                        <span className="text-xs font-semibold" style={{ color: "hsl(35,90%,32%)" }}>{pick.monthlyRevenueEstimate}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}

                            {/* Final headline */}
                            {quickWinsHeadline && (
                              <div className="rounded-2xl px-5 py-4 text-center"
                                style={{ background: "linear-gradient(135deg, hsl(45,100%,48%), hsl(35,100%,50%))", boxShadow: "0 2px 16px hsla(45,100%,48%,0.35)" }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/75 mb-1">SIRIUS PRIORITY VERDICT</p>
                                <p className="font-bold text-white text-sm leading-snug">{quickWinsHeadline}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer actions */}
                        {!quickWinsRunning && quickWinsPicks.length > 0 && (
                          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid rgba(15,23,42,0.08)" }}>
                            <p className="text-xs" style={{ color: "rgba(15,23,42,0.4)" }}>Analysis based on all {quickWinsTotal} active projects</p>
                            <div className="flex gap-2">
                              <button onClick={runQuickWins} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.6)" }}>
                                <RefreshCw className="w-3 h-3" /> Re-run
                              </button>
                              <button onClick={() => setQuickWinsOpen(false)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={{ background: "hsl(193,100%,32%)", color: "white" }}>
                                Done
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* ─────────────────────────────────────────────────────────── */}

                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-slate-800 font-bold text-base">Innovation Portfolio</h2>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.4)" }}>
                        {projectsLoading ? "Loading…" : `${projects.length} projects · Click any project to open its workspace`}
                      </p>
                    </div>
                    <button onClick={() => setCreating(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "hsl(193,100%,32%)", color: "white" }}>
                      <Plus className="w-3.5 h-3.5" /> New Project
                    </button>
                  </div>
                </div>

                {/* Loading / error */}
                {projectsLoading && projects.length === 0 && (
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(193,100%,45%)" }} />
                    <span className="text-sm" style={{ color: "rgba(15,23,42,0.4)" }}>Loading your projects…</span>
                  </div>
                )}
                {projectsError && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <p className="text-sm" style={{ color: "rgba(15,23,42,0.45)" }}>Could not load projects — server may be restarting.</p>
                    <button onClick={() => loadProjects(0)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: "hsl(193,100%,32%)", color: "white" }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Try again
                    </button>
                  </div>
                )}

                {/* Projects grid */}
                {!projectsLoading && !projectsError && (
                  <div className="flex-1 overflow-y-auto p-6">
                    {(() => {
                      const q = projectSearch.trim().toLowerCase();
                      const filtered = q
                        ? projects.filter(p => p.name.toLowerCase().includes(q) || (p.industry || "").toLowerCase().includes(q))
                        : projects;
                      if (filtered.length === 0 && projects.length > 0) return (
                        <div className="flex items-center justify-center h-40">
                          <p className="text-sm" style={{ color: "rgba(15,23,42,0.35)" }}>No projects match "{projectSearch}"</p>
                        </div>
                      );
                      if (filtered.length === 0) return (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                          <p className="text-sm" style={{ color: "rgba(15,23,42,0.35)" }}>No projects yet — create your first one above</p>
                        </div>
                      );
                      return (
                        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                          {filtered.map(p => (
                            <button key={p.id} onClick={() => loadProject(p.id)}
                              className="text-left rounded-2xl p-4 transition-all group hover:shadow-md"
                              style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}>
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: "rgba(0,212,255,0.08)" }}>
                                  <FolderOpen className="w-4 h-4" style={{ color: "hsl(193,100%,40%)" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-slate-800 font-semibold text-sm leading-tight truncate group-hover:text-cyan-600 transition-colors">{p.name}</p>
                                  <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(15,23,42,0.4)" }}>{p.industry || "General"}</p>
                                  {p.launchStatus && (
                                    <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                                      style={{
                                        background: p.launchStatus === "launched" ? "hsl(155,70%,90%)" : p.launchStatus === "launch-ready" ? "hsl(45,100%,90%)" : p.launchStatus === "building" ? "hsl(193,100%,90%)" : "rgba(15,23,42,0.06)",
                                        color: p.launchStatus === "launched" ? "hsl(155,70%,35%)" : p.launchStatus === "launch-ready" ? "hsl(45,90%,35%)" : p.launchStatus === "building" ? "hsl(193,100%,30%)" : "rgba(15,23,42,0.4)",
                                      }}>
                                      {p.launchStatus === "launched" ? "Launched" : p.launchStatus === "launch-ready" ? "Launch Ready" : p.launchStatus === "building" ? "Building" : p.launchStatus === "cad-pending" ? "CAD Pending" : "Queued"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
        )}
      </div>

      {/* Persistent floating twin chat — always visible on every page */}
      <LabFloatingChat
        pin={pin}
        navMode={navMode}
        activeProject={activeProject}
        accessLevel={accessLevel}
        onNavigate={m => setNavMode(m as NavMode)}
        onOpenProject={id => {
          loadProject(id);
          setNavMode("projects");
        }}
      />

      {/* Change PIN modal */}
      {changePinOpen && (
        <ChangePinModal
          pin={pin}
          apiBase={base}
          onClose={() => setChangePinOpen(false)}
          onSuccess={(newPin) => {
            setPin(newPin);
            sessionStorage.setItem("lab_pin", newPin);
            setChangePinOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ChangePinModal({ pin, apiBase, onClose, onSuccess }: {
  pin: string;
  apiBase: string;
  onClose: () => void;
  onSuccess: (newPin: string) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("New PINs do not match."); return; }
    if (!/^\d{4,8}$/.test(next)) { setError("PIN must be 4–8 digits."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}lab/settings/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ currentPin: current, newPin: next, confirmPin: confirm }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setDone(true);
      setTimeout(() => onSuccess(next), 1200);
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.1)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsla(193,100%,40%,0.1)" }}>
              <Lock className="w-4 h-4" style={{ color: "hsl(193,100%,35%)" }} />
            </div>
            <div>
              <p className="text-slate-800 font-bold text-sm">Change PIN</p>
              <p className="text-slate-400 text-xs">Owner access · 4–8 digits</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsla(155,70%,45%,0.12)" }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: "hsl(155,70%,42%)" }} />
            </div>
            <p className="text-slate-700 font-semibold text-sm">PIN updated successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {[
              { label: "Current PIN", value: current, set: setCurrent, placeholder: "Enter current PIN" },
              { label: "New PIN", value: next, set: setNext, placeholder: "4–8 digits" },
              { label: "Confirm new PIN", value: confirm, set: setConfirm, placeholder: "Repeat new PIN" },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(15,23,42,0.55)" }}>{label}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  value={value}
                  onChange={e => set(e.target.value.replace(/\D/g, ""))}
                  placeholder={placeholder}
                  required
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none tracking-widest"
                  style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.1)", color: "rgba(15,23,42,0.85)" }}
                />
              </div>
            ))}

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "hsla(0,70%,55%,0.08)", color: "hsl(0,70%,45%)", border: "1px solid hsla(0,70%,55%,0.15)" }}>
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.55)" }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{ background: "hsl(193,100%,32%)", color: "#FFFFFF", opacity: loading ? 0.7 : 1 }}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {loading ? "Saving…" : "Update PIN"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
