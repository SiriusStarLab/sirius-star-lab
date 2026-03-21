import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Star, Plus, Trash2, Send, Loader2, FileText, Code, Ruler,
  BookOpen, Telescope, ExternalLink, Sparkles, X, FolderOpen,
  Pencil, Check, Bot, Zap, TrendingUp, Package, Layers,
  ChevronDown, RotateCcw, Save, Copy, AlertCircle, Globe,
  Cpu, Wrench, ChevronRight
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

const PROJECT_TABS = [
  { id: "brief", label: "Brief", icon: FileText, placeholder: "Describe the product concept, the problem it solves, target market, and key objectives..." },
  { id: "research", label: "Research", icon: BookOpen, placeholder: "Research notes, competitor analysis, material options, regulatory requirements, market data..." },
  { id: "specs", label: "Specs", icon: Ruler, placeholder: "Technical specifications: dimensions, materials, tolerances, standards, BOM, performance requirements..." },
  { id: "code", label: "Code", icon: Code, placeholder: "Production-ready code goes here. Use the AI panel to generate and refine it..." },
  { id: "drawings", label: "Drawings", icon: Layers, placeholder: "Drawing instructions for newdimensionscad.com: views required, key dimensions, assembly details, callouts..." },
];

const SCOUT_MODES = [
  { id: "full", label: "Full Scan", icon: Globe, color: "hsl(193,100%,35%)", desc: "Broad scan across all industries and opportunity types" },
  { id: "bots", label: "Bot Opportunities", icon: Bot, color: "hsl(280,70%,55%)", desc: "Find tasks ripe for automation across all sectors" },
  { id: "improve", label: "Improve Existing", icon: Wrench, color: "hsl(25,100%,50%)", desc: "Find broken products with fixable problems" },
  { id: "gaps", label: "Market Gaps", icon: Package, color: "hsl(155,70%,40%)", desc: "Find underserved needs with no good solution" },
  { id: "trends", label: "Trend Plays", icon: TrendingUp, color: "hsl(45,100%,45%)", desc: "New opportunities created by recent changes" },
];

type Project = {
  id: number; name: string; industry: string; status: string;
  brief: string; research: string; specs: string; code: string;
  drawingNotes: string; cadUrl: string; updatedAt: string;
  messages?: Message[];
};
type Message = { id: number; projectId: number; role: string; content: string; createdAt: string };
type ScoutReport = { id: number; title: string; industry: string; opportunity: string; type: string; createdAt: string };
type NavMode = "projects" | "botlab" | "scout";

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = getApiBase();

  const submit = async () => {
    if (!pin) return;
    setLoading(true); setError(false);
    try {
      const res = await fetch(`${base}lab/auth`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) { sessionStorage.setItem("lab_pin", pin); onUnlock(pin); }
      else { setError(true); setPin(""); }
    } catch { setError(true); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(226,45%,4%)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-8 w-full max-w-xs px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(193,100%,30%), hsl(226,70%,45%))", boxShadow: "0 0 40px hsla(193,100%,35%,0.3)" }}>
            <Star className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold tracking-tight">Sirius Star Lab</h1>
            <p className="text-white/40 text-sm mt-1">Private R&D Intelligence</p>
          </div>
        </div>
        <div className="w-full space-y-3">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input type="password" value={pin} onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="PIN" autoFocus
              className="w-full pl-11 pr-4 py-4 rounded-2xl text-white placeholder-white/20 text-center text-2xl tracking-[0.6em] outline-none"
              style={{ background: "hsl(226,45%,9%)", border: `1px solid ${error ? "hsl(0,70%,50%)" : "rgba(255,255,255,0.07)"}` }} />
          </div>
          {error && <p className="text-center text-xs" style={{ color: "hsl(0,70%,60%)" }}>Incorrect PIN. Try again.</p>}
          <button onClick={submit} disabled={loading || !pin}
            className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all text-sm"
            style={{ background: "hsl(193,100%,35%)", opacity: loading || !pin ? 0.4 : 1 }}>
            {loading ? "Verifying..." : "Enter the Lab"}
          </button>
        </div>
        <p className="text-white/15 text-xs text-center">Access restricted to authorised users only</p>
      </motion.div>
    </div>
  );
}

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
    const userMsg = input.trim(); setInput(""); setStreaming(true);
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
            try { const d = JSON.parse(line.slice(6)); if (d.content) { assistant += d.content; setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistant }; return u; }); } } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
  };

  const quickPrompts = mode === "bot"
    ? ["Design the full architecture", "Write the core code", "What APIs do I need?", "Estimate the build cost", "Deployment instructions"]
    : ["Help me write the brief", "Generate technical specs", "What materials should I use?", "Write the code", "Create a BOM"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-3 py-2 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {PROJECT_TABS.map(t => (
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

function ProjectWorkspace({ project, pin, onUpdate }: { project: Project; pin: string; onUpdate: (p: Project) => void }) {
  const [activeTab, setActiveTab] = useState("brief");
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [labMode, setLabMode] = useState<"engineering" | "bot">("engineering");
  const base = getApiBase();

  const headers = useCallback(() => ({ "Content-Type": "application/json", "x-lab-pin": pin }), [pin]);

  const saveField = async (field: string, value: string) => {
    setSaving(true);
    const updated = { ...project, [field]: value };
    await fetch(`${base}lab/projects/${project.id}`, { method: "PUT", headers: headers(), body: JSON.stringify(updated) });
    onUpdate(updated);
    setSaving(false);
  };

  const saveProjectName = async () => {
    if (!editName.trim()) return;
    await saveField("name", editName.trim());
    setEditingName(false);
  };

  const getContent = () => {
    const map: Record<string, string> = { brief: project.brief, research: project.research, specs: project.specs, code: project.code, drawings: project.drawingNotes };
    return map[activeTab] || "";
  };

  const getField = () => ({ brief: "brief", research: "research", specs: "specs", code: "code", drawings: "drawingNotes" }[activeTab] || "brief");

  const openCad = () => {
    const url = `https://www.newdimensionscad.com?project=${encodeURIComponent(project.name)}&specs=${encodeURIComponent((project.specs || "").slice(0, 500))}&notes=${encodeURIComponent((project.drawingNotes || "").slice(0, 500))}`;
    window.open(url, "_blank");
  };

  const copyContent = () => {
    navigator.clipboard.writeText(getContent());
  };

  const tab = PROJECT_TABS.find(t => t.id === activeTab)!;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveProjectName(); if (e.key === "Escape") setEditingName(false); }}
              className="bg-transparent text-white font-bold text-base outline-none border-b border-white/30 flex-1" />
            <button onClick={saveProjectName}><Check className="w-4 h-4 text-green-400" /></button>
            <button onClick={() => setEditingName(false)}><X className="w-4 h-4 text-white/30" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-white font-bold text-base truncate">{project.name}</h1>
            <button onClick={() => { setEditName(project.name); setEditingName(true); }}>
              <Pencil className="w-3 h-3 text-white/20 hover:text-white/50 transition-colors" />
            </button>
            <span className="text-white/25 text-xs hidden sm:block truncate">· {project.industry}</span>
          </div>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && <span className="text-white/30 text-xs">Saving...</span>}

          {/* Lab mode toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "hsl(226,45%,12%)" }}>
            <button onClick={() => setLabMode("engineering")}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all"
              style={{ background: labMode === "engineering" ? "hsl(193,100%,35%)" : "transparent", color: labMode === "engineering" ? "white" : "rgba(255,255,255,0.35)" }}>
              <Cpu className="w-3 h-3" /> Engineering
            </button>
            <button onClick={() => setLabMode("bot")}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all"
              style={{ background: labMode === "bot" ? "hsl(280,70%,55%)" : "transparent", color: labMode === "bot" ? "white" : "rgba(255,255,255,0.35)" }}>
              <Bot className="w-3 h-3" /> Bot Mode
            </button>
          </div>

          <button onClick={openCad}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: "hsl(226,45%,14%)", color: "hsl(193,100%,60%)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <ExternalLink className="w-3 h-3" /> Open in CAD
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {PROJECT_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: activeTab === t.id ? "hsl(226,45%,16%)" : "transparent", color: activeTab === t.id ? "white" : "rgba(255,255,255,0.35)", border: activeTab === t.id ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent" }}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={copyContent} title="Copy content"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <Copy className="w-3.5 h-3.5 text-white/30" />
          </button>
        </div>
      </div>

      {/* Content + Chat */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 p-4 min-h-0">
          <textarea key={`${project.id}-${activeTab}`} defaultValue={getContent()}
            onBlur={e => saveField(getField(), e.target.value)}
            placeholder={tab?.placeholder}
            className="w-full h-full resize-none outline-none leading-relaxed"
            style={{
              background: "transparent", color: "rgba(255,255,255,0.8)",
              fontFamily: activeTab === "code" ? "'Fira Code', 'Cascadia Code', 'Consolas', monospace" : "inherit",
              fontSize: activeTab === "code" ? "0.75rem" : "0.83rem",
              lineHeight: activeTab === "code" ? "1.6" : "1.7",
            }} />
        </div>

        {/* AI Panel */}
        <div className="w-72 border-l flex flex-col min-h-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,6%)" }}>
          <div className="px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
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
    setStreaming(true); setOutput(""); let result = "";
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
            try { const d = JSON.parse(line.slice(6)); if (d.content) { result += d.content; setOutput(result); } } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
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
        {output ? (
          <>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-white/40 text-xs">{focusMode.label} results</span>
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Telescope className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm font-medium mb-2">Ready to Scout</p>
              <p className="text-white/20 text-xs leading-relaxed">Choose a scan type, optionally add a focus or industries, then run. The Scout searches across social media, forums, market data, patent databases, and product reviews to find real, evidence-based opportunities.</p>
            </div>
          </div>
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
                <span className="text-sm" style={{ color: navMode === item.id ? "white" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
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
        {navMode === "scout" && <ScoutPanel pin={pin} />}
        {navMode === "botlab" && <BotLabPanel pin={pin} />}
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
