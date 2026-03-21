import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Star, Plus, Trash2, ChevronRight, Send, Loader2,
  FileText, Search, Code, Ruler, BookOpen, Telescope,
  Download, ExternalLink, Sparkles, X, ChevronDown,
  FolderOpen, AlertTriangle, Pencil, Check
} from "lucide-react";
import { getApiBase } from "@/lib/api-base";

const INDUSTRIES = [
  "Aerospace", "Agriculture", "AI & Machine Learning", "Automotive",
  "Consumer Electronics", "Defence", "Education", "Energy", "Finance",
  "Healthcare", "Industrial Automation", "IoT", "Logistics", "Manufacturing",
  "Marine", "Medical Devices", "Pharmaceutical", "Robotics", "Software",
  "Social Media", "Space Tech", "Telecommunications", "General"
];

const TABS = [
  { id: "brief", label: "Brief", icon: FileText },
  { id: "research", label: "Research", icon: BookOpen },
  { id: "specs", label: "Specs", icon: Ruler },
  { id: "code", label: "Code", icon: Code },
  { id: "drawings", label: "Drawings", icon: Search },
];

type Project = {
  id: number;
  name: string;
  industry: string;
  status: string;
  brief: string;
  research: string;
  specs: string;
  code: string;
  drawingNotes: string;
  cadUrl: string;
  updatedAt: string;
  messages?: Message[];
};

type Message = {
  id: number;
  projectId: number;
  role: string;
  content: string;
  createdAt: string;
};

type ScoutReport = {
  id: number;
  title: string;
  industry: string;
  opportunity: string;
  createdAt: string;
};

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = getApiBase();

  const submit = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${base}lab/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        sessionStorage.setItem("lab_pin", pin);
        onUnlock();
      } else {
        setError(true);
        setPin("");
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "hsl(226,45%,5%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 max-w-sm w-full px-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,50%))" }}>
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">Sirius Star Lab</h1>
            <p className="text-white/40 text-sm">Private R&D Intelligence</p>
          </div>
        </div>

        <div className="w-full space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Enter your PIN"
              className="w-full pl-11 pr-4 py-4 rounded-2xl text-white placeholder-white/30 text-center text-xl tracking-[0.5em] outline-none"
              style={{ background: "hsl(226,45%,10%)", border: error ? "1px solid hsl(0,70%,50%)" : "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
          {error && (
            <p className="text-center text-sm" style={{ color: "hsl(0,70%,60%)" }}>
              Incorrect PIN
            </p>
          )}
          <button
            onClick={submit}
            disabled={loading || pin.length < 1}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all"
            style={{ background: "hsl(193,100%,35%)", opacity: loading || pin.length < 1 ? 0.5 : 1 }}
          >
            {loading ? "Verifying..." : "Enter the Lab"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ChatPanel({ project, pin }: { project: Project; pin: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState("brief");
  const bottomRef = useRef<HTMLDivElement>(null);
  const base = getApiBase();

  useEffect(() => {
    if (project.messages) {
      setMessages(project.messages.map(m => ({ role: m.role, content: m.content })));
    }
  }, [project.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    let assistant = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${base}lab/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ message: userMsg, tab: activeTab }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistant += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistant };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-white/30 text-xs px-2 py-1">Focus:</span>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="text-xs px-3 py-1 rounded-lg transition-all"
            style={{
              background: activeTab === t.id ? "hsl(193,100%,35%)" : "transparent",
              color: activeTab === t.id ? "white" : "rgba(255,255,255,0.4)"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-white/20" />
            <p className="text-white/30 text-sm">Ask anything about this project.</p>
            <p className="text-white/20 text-xs mt-1">Set the focus tab to get context-aware answers.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? "hsl(193,100%,35%)" : "hsl(226,45%,12%)",
                color: "white",
                fontSize: "0.82rem"
              }}
            >
              {m.content || (streaming && m.role === "assistant" ? <span className="opacity-50">Thinking...</span> : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask the Lab AI..."
            rows={2}
            className="flex-1 px-4 py-3 rounded-2xl text-white text-sm placeholder-white/30 resize-none outline-none"
            style={{ background: "hsl(226,45%,12%)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center self-end transition-all"
            style={{ background: "hsl(193,100%,35%)", opacity: streaming || !input.trim() ? 0.4 : 1 }}
          >
            {streaming ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoutPanel({ pin }: { pin: string }) {
  const [query, setQuery] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [reports, setReports] = useState<ScoutReport[]>([]);
  const [showReports, setShowReports] = useState(false);
  const base = getApiBase();

  const loadReports = useCallback(async () => {
    const res = await fetch(`${base}lab/scout/reports`, { headers: { "x-lab-pin": pin } });
    if (res.ok) setReports(await res.json());
  }, [base, pin]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const runScout = async () => {
    setStreaming(true);
    setOutput("");
    let result = "";

    try {
      const res = await fetch(`${base}lab/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ query, industries }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) { result += data.content; setOutput(result); }
            } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
    loadReports();
  };

  const toggleIndustry = (ind: string) => {
    setIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(45,100%,50%), hsl(30,100%,50%))" }}>
            <Telescope className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold">Opportunity Scout</h2>
            <p className="text-white/40 text-xs">Find product & business opportunities across all industries</p>
          </div>
        </div>

        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Describe what you're looking for, or leave blank for a broad scan..."
          rows={2}
          className="w-full px-4 py-3 rounded-2xl text-white text-sm placeholder-white/30 resize-none outline-none mb-3"
          style={{ background: "hsl(226,45%,12%)", border: "1px solid rgba(255,255,255,0.08)" }}
        />

        <div className="mb-3">
          <p className="text-white/40 text-xs mb-2">Focus industries (optional):</p>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRIES.map(ind => (
              <button
                key={ind}
                onClick={() => toggleIndustry(ind)}
                className="text-xs px-2.5 py-1 rounded-full transition-all"
                style={{
                  background: industries.includes(ind) ? "hsl(45,100%,50%)" : "hsl(226,45%,12%)",
                  color: industries.includes(ind) ? "hsl(226,45%,9%)" : "rgba(255,255,255,0.5)",
                  border: industries.includes(ind) ? "none" : "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={runScout}
          disabled={streaming}
          className="w-full py-3 rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, hsl(45,100%,50%), hsl(30,100%,50%))", opacity: streaming ? 0.6 : 1, color: "hsl(226,45%,9%)" }}
        >
          {streaming ? <><Loader2 className="w-4 h-4 animate-spin" /> Scouting...</> : <><Telescope className="w-4 h-4" /> Run Scout</>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {output && (
          <div className="rounded-2xl p-5 mb-4 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ background: "hsl(226,45%,10%)", color: "rgba(255,255,255,0.85)", fontSize: "0.82rem" }}>
            {output}
          </div>
        )}

        {reports.length > 0 && (
          <div>
            <button
              onClick={() => setShowReports(!showReports)}
              className="flex items-center gap-2 text-white/40 text-sm mb-3 hover:text-white/60 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showReports ? "rotate-180" : ""}`} />
              Previous scans ({reports.length})
            </button>
            {showReports && reports.map(r => (
              <div key={r.id} className="rounded-2xl p-4 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.06)" }}
                onClick={() => setOutput(r.opportunity)}>
                <p className="text-white/80 text-sm font-medium">{r.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{r.industry} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
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
  const [activeTab, setActiveTab] = useState<string>("brief");
  const [mode, setMode] = useState<"project" | "scout">("project");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("General");
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const base = getApiBase();

  useEffect(() => {
    const stored = sessionStorage.getItem("lab_pin");
    if (stored) { setPin(stored); setUnlocked(true); }
  }, []);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    "x-lab-pin": pin,
  }), [pin]);

  const loadProjects = useCallback(async () => {
    const res = await fetch(`${base}lab/projects`, { headers: headers() });
    if (res.ok) setProjects(await res.json());
  }, [base, headers]);

  const loadProject = useCallback(async (id: number) => {
    const res = await fetch(`${base}lab/projects/${id}`, { headers: headers() });
    if (res.ok) { const p = await res.json(); setActiveProject(p); }
  }, [base, headers]);

  useEffect(() => { if (unlocked) loadProjects(); }, [unlocked, loadProjects]);

  const createProject = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`${base}lab/projects`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: newName.trim(), industry: newIndustry }),
    });
    if (res.ok) {
      const p = await res.json();
      setCreating(false); setNewName(""); setNewIndustry("General");
      await loadProjects();
      await loadProject(p.id);
    }
  };

  const saveField = async (field: string, value: string) => {
    if (!activeProject) return;
    setSaving(true);
    await fetch(`${base}lab/projects/${activeProject.id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ ...activeProject, [field]: value }),
    });
    setActiveProject(prev => prev ? { ...prev, [field]: value } : null);
    setSaving(false);
  };

  const deleteProject = async (id: number) => {
    if (!confirm("Delete this project permanently?")) return;
    await fetch(`${base}lab/projects/${id}`, { method: "DELETE", headers: headers() });
    if (activeProject?.id === id) setActiveProject(null);
    loadProjects();
  };

  const saveProjectName = async () => {
    if (!activeProject || !editName.trim()) return;
    await saveField("name", editName.trim());
    setEditingName(false);
    loadProjects();
  };

  const openCad = () => {
    if (!activeProject) return;
    const specs = activeProject.specs || "";
    const drawing = activeProject.drawingNotes || "";
    const url = `https://www.newdimensionscad.com?project=${encodeURIComponent(activeProject.name)}&specs=${encodeURIComponent(specs.slice(0, 500))}&notes=${encodeURIComponent(drawing.slice(0, 500))}`;
    window.open(url, "_blank");
  };

  const getTabContent = () => {
    if (!activeProject) return "";
    const map: Record<string, string> = {
      brief: activeProject.brief || "",
      research: activeProject.research || "",
      specs: activeProject.specs || "",
      code: activeProject.code || "",
      drawings: activeProject.drawingNotes || "",
    };
    return map[activeTab] || "";
  };

  const getTabField = () => {
    const map: Record<string, string> = {
      brief: "brief", research: "research", specs: "specs",
      code: "code", drawings: "drawingNotes",
    };
    return map[activeTab];
  };

  const getTabPlaceholder = () => {
    const map: Record<string, string> = {
      brief: "Describe the product concept, the problem it solves, target market, and key objectives...",
      research: "Paste research notes, web findings, competitor analysis, material options, regulatory notes...",
      specs: "Technical specifications: dimensions, materials, tolerances, standards, BOM, performance requirements...",
      code: "Write or paste production-ready code here. Use the AI to generate and refine it...",
      drawings: "Drawing notes and instructions for newdimensionscad.com — views required, dimensions to highlight, assembly details...",
    };
    return map[activeTab] || "";
  };

  const onUnlock = () => {
    const stored = sessionStorage.getItem("lab_pin");
    if (stored) setPin(stored);
    setUnlocked(true);
  };

  if (!unlocked) return <PinGate onUnlock={onUnlock} />;

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(226,45%,5%)" }}>
      {/* LEFT SIDEBAR — Projects */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,7%)" }}>
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,50%))" }}>
              <Star className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">Star Lab</span>
          </div>

          <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "hsl(226,45%,10%)" }}>
            <button
              onClick={() => setMode("project")}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: mode === "project" ? "hsl(193,100%,35%)" : "transparent", color: mode === "project" ? "white" : "rgba(255,255,255,0.4)" }}
            >
              Projects
            </button>
            <button
              onClick={() => setMode("scout")}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: mode === "scout" ? "hsl(45,100%,45%)" : "transparent", color: mode === "scout" ? "hsl(226,45%,9%)" : "rgba(255,255,255,0.4)" }}
            >
              Scout
            </button>
          </div>

          {mode === "project" && (
            <button
              onClick={() => setCreating(true)}
              className="w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-all"
              style={{ background: "hsl(193,100%,35%)", color: "white" }}
            >
              <Plus className="w-3.5 h-3.5" /> New Project
            </button>
          )}
        </div>

        {mode === "project" && (
          <div className="flex-1 overflow-y-auto p-2">
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl p-3 mb-2"
                  style={{ background: "hsl(226,45%,12%)", border: "1px solid hsl(193,100%,35%)" }}
                >
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && createProject()}
                    placeholder="Project name"
                    className="w-full bg-transparent text-white text-sm outline-none placeholder-white/30 mb-2"
                  />
                  <select
                    value={newIndustry}
                    onChange={e => setNewIndustry(e.target.value)}
                    className="w-full bg-transparent text-white/60 text-xs outline-none mb-3"
                    style={{ background: "hsl(226,45%,15%)", borderRadius: "8px", padding: "4px 8px" }}
                  >
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={createProject} className="flex-1 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: "hsl(193,100%,35%)" }}>Create</button>
                    <button onClick={() => setCreating(false)} className="py-1.5 px-3 rounded-lg text-xs text-white/40">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => loadProject(p.id)}
                className="group flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1 cursor-pointer transition-all"
                style={{
                  background: activeProject?.id === p.id ? "hsl(226,45%,14%)" : "transparent",
                  border: activeProject?.id === p.id ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent"
                }}
              >
                <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(193,100%,50%)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{p.name}</p>
                  <p className="text-white/30 text-xs truncate">{p.industry}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-red-400/60 hover:text-red-400" />
                </button>
              </div>
            ))}

            {projects.length === 0 && !creating && (
              <p className="text-white/20 text-xs text-center py-8">No projects yet.<br />Create your first one.</p>
            )}
          </div>
        )}

        {mode === "scout" && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <Telescope className="w-8 h-8 mx-auto mb-2 text-white/20" />
              <p className="text-white/30 text-xs">Scout runs in the main panel</p>
            </div>
          </div>
        )}
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {mode === "scout" ? (
          <ScoutPanel pin={pin} />
        ) : activeProject ? (
          <>
            {/* Project header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveProjectName(); if (e.key === "Escape") setEditingName(false); }}
                    className="bg-transparent text-white font-bold text-lg outline-none border-b border-white/30"
                  />
                  <button onClick={saveProjectName}><Check className="w-4 h-4 text-green-400" /></button>
                  <button onClick={() => setEditingName(false)}><X className="w-4 h-4 text-white/30" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h1 className="text-white font-bold text-lg truncate">{activeProject.name}</h1>
                  <button onClick={() => { setEditName(activeProject.name); setEditingName(true); }}>
                    <Pencil className="w-3.5 h-3.5 text-white/20 hover:text-white/60 transition-colors" />
                  </button>
                  <span className="text-white/30 text-sm truncate hidden md:block">· {activeProject.industry}</span>
                </div>
              )}

              <div className="flex items-center gap-2 flex-shrink-0">
                {saving && <span className="text-white/30 text-xs">Saving...</span>}
                <button
                  onClick={openCad}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: "hsl(226,45%,14%)", color: "hsl(193,100%,60%)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in CAD
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 border-b flex-shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all"
                    style={{
                      background: activeTab === t.id ? "hsl(193,100%,35%)" : "transparent",
                      color: activeTab === t.id ? "white" : "rgba(255,255,255,0.4)"
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Content + Chat split */}
            <div className="flex-1 flex min-h-0">
              {/* Editable content area */}
              <div className="flex-1 p-4 min-h-0">
                <textarea
                  key={`${activeProject.id}-${activeTab}`}
                  defaultValue={getTabContent()}
                  onBlur={e => saveField(getTabField(), e.target.value)}
                  placeholder={getTabPlaceholder()}
                  className="w-full h-full resize-none outline-none text-sm leading-relaxed"
                  style={{
                    background: "transparent",
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: activeTab === "code" ? "monospace" : "inherit",
                    fontSize: activeTab === "code" ? "0.78rem" : "0.85rem",
                  }}
                />
              </div>

              {/* AI Chat panel */}
              <div className="w-80 border-l flex flex-col min-h-0"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "hsl(226,45%,7%)" }}>
                <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: "hsl(193,100%,50%)" }} />
                    <span className="text-white text-sm font-medium">Lab AI</span>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatPanel project={activeProject} pin={pin} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Star className="w-12 h-12 mx-auto mb-4 text-white/10" />
              <h2 className="text-white/40 font-medium mb-2">Sirius Star Lab</h2>
              <p className="text-white/20 text-sm max-w-sm">Select a project from the sidebar, or create a new one to begin. Each project has its own Brief, Research, Specs, Code, and Drawings workspace.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
