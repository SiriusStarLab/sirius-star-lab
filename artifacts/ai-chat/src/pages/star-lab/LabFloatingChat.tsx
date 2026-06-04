import React from "react";
import { X, Check, Loader2, Mic, MicOff, Send, Clock, FolderOpen } from "lucide-react";
import { getApiBase } from "@/lib/api-base";
import { speakText } from "./voice-utils";
import type { Project, NavMode } from "./types";

type ActionCardFloat = { label: string; color: string; icon?: string; detail?: string };

const NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard", projects: "Projects", botlab: "Bot Lab", scout: "Scout",
  feed: "Feed", grants: "Funding Radar", commerce: "Commerce Lab", outreach: "Outreach Hub",
  autolab: "Autonomous Lab", revenue: "Revenue Hub", agency: "Agency Hub", mission: "Mission",
  growth: "Growth Engine", brain: "Sirius Brain", research: "Deep Research", docs: "Document Intel",
  appbuilder: "App Builder", "ai-arch": "AI Architecture", orchestrate: "Command Centre",
  sysaudit: "System Audit", upgrades: "Sirius Upgrades", labchat: "Chat with Sirius",
};

export function LabFloatingChat({ pin, navMode, activeProject, onNavigate, onOpenProject, accessLevel }: {
  pin: string;
  navMode: NavMode;
  activeProject: Project | null;
  onNavigate: (mode: NavMode) => void;
  onOpenProject?: (id: number) => void;
  accessLevel: string;
}) {
  const CHAT_STORAGE_KEY = `lab_chat_${accessLevel}`;

  const [open, setOpen] = React.useState(() => {
    try { const s = localStorage.getItem(CHAT_STORAGE_KEY); return s ? JSON.parse(s).length > 0 : false; } catch { return false; }
  });
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; content: string; actions?: { label: string; color: string; icon?: string }[] }[]>(() => {
    try { const s = localStorage.getItem(CHAT_STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [streaming, setStreaming] = React.useState(false);
  const [streamText, setStreamText] = React.useState("");
  const [streamingActions, setStreamingActions] = React.useState<ActionCardFloat[]>([]);
  const [thinkingText, setThinkingText] = React.useState("");
  const [unread, setUnread] = React.useState(false);
  const [voicePhase, setVoicePhase] = React.useState<"idle" | "listening" | "speaking">("idle");
  const [waveTick, setWaveTick] = React.useState(0);
  const [pendingOpen, setPendingOpen] = React.useState<{ id: number; name: string } | null>(null);
  const [floatTextInput, setFloatTextInput] = React.useState("");
  const [queuedFloatMsg, setQueuedFloatMsg] = React.useState("");
  const floatInputRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const stoppedRef = React.useRef(false);
  const conversationIdRef = React.useRef<number | null>(null);
  const base = getApiBase();
  const prevNavModeRef = React.useRef(navMode);

  React.useEffect(() => {
    if (!streaming && queuedFloatMsg) {
      const msg = queuedFloatMsg;
      setQueuedFloatMsg("");
      setTimeout(() => sendVoice(msg), 150);
    }
  }, [streaming]);

  React.useEffect(() => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages, CHAT_STORAGE_KEY]);

  React.useEffect(() => {
    if (prevNavModeRef.current === "labchat" && navMode !== "labchat") {
      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) { setMessages(parsed); setOpen(true); }
        }
      } catch {}
    }
    prevNavModeRef.current = navMode;
  }, [navMode, CHAT_STORAGE_KEY]);

  React.useEffect(() => {
    const id = setInterval(() => setWaveTick(t => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  const stopListeningNow = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setVoicePhase("idle");
  };

  const startVoiceListening = React.useCallback((onResult: (text: string) => void) => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec || stoppedRef.current) return;
    const rec = new SpeechRec();
    recognitionRef.current = rec;
    rec.lang = "en-GB"; rec.continuous = false; rec.interimResults = false;
    let got = false;
    rec.onstart = () => setVoicePhase("listening");
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript?.trim() || "";
      if (text.length > 1) { got = true; stopListeningNow(); onResult(text); }
    };
    rec.onerror = () => { setVoicePhase("idle"); };
    rec.onend = () => { if (!got) setVoicePhase("idle"); };
    rec.start();
  }, []);

  React.useEffect(() => {
    if (open) {
      stoppedRef.current = false;
      if (messages.length === 0) {
        const page = NAV_LABELS[navMode] ?? navMode;
        const proj = activeProject ? ` You have "${activeProject.name}" open.` : "";
        const greeting = `I'm here. You're on ${page}.${proj} What do you need?`;
        setMessages([{ role: "assistant", content: greeting }]);
        setVoicePhase("speaking");
        speakText(greeting, () => {
          setVoicePhase("idle");
          if (!stoppedRef.current) startVoiceListening(text => sendVoice(text));
        });
      } else {
        if (!streaming && voicePhase === "idle") {
          setTimeout(() => {
            if (!stoppedRef.current) startVoiceListening(text => sendVoice(text));
          }, 300);
        }
      }
    }
    if (!open) { stoppedRef.current = true; stopListeningNow(); window.speechSynthesis?.cancel(); }
  }, [open]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const extractProjectQuery = (text: string): string | null => {
    const t = text.toLowerCase();
    const goVerbs = ["take me to", "go to", "open", "show me", "navigate to", "find", "pull up", "load"];
    const hasGoVerb = goVerbs.some(v => t.includes(v));
    if (!hasGoVerb) return null;
    let query = text;
    for (const v of goVerbs) {
      const idx = t.indexOf(v);
      if (idx !== -1) { query = text.slice(idx + v.length).trim(); break; }
    }
    query = query.replace(/^(the|a|an|that|my|our)\s+/i, "").replace(/\s+project\s*$/i, "").trim();
    return query.length > 3 ? query : null;
  };

  const sendVoice = async (text: string) => {
    if (!text) return;
    if (streaming) { setQueuedFloatMsg(text); return; }
    setPendingOpen(null);
    stopListeningNow();
    const newMsg = { role: "user" as const, content: text };
    setMessages(prev => [...prev, newMsg]);

    const projQuery = extractProjectQuery(text);
    if (projQuery && onOpenProject) {
      setMessages(prev => [...prev, { role: "assistant", content: `Searching for "${projQuery}"…` }]);
      setStreaming(true);
      try {
        const res = await fetch(`${base}lab/projects?search=${encodeURIComponent(projQuery)}&limit=1`, {
          headers: { "x-lab-pin": pin }
        });
        if (res.ok) {
          const data = await res.json();
          const projects = Array.isArray(data) ? data : (data.projects ?? []);
          if (projects.length > 0) {
            const found = projects[0];
            const reply = `Found "${found.name}". Open it?`;
            setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: reply }]);
            stoppedRef.current = true;
            stopListeningNow();
            setStreaming(false);
            setVoicePhase("speaking");
            speakText(reply, () => {
              setVoicePhase("idle");
              setPendingOpen({ id: found.id, name: found.name });
            });
            return;
          }
        }
      } catch {}
      setStreaming(false);
      setMessages(prev => prev.slice(0, -1));
    }

    const page = NAV_LABELS[navMode] ?? navMode;
    const isAutolabCtx = navMode === "autolab";
    const projCtx = activeProject
      ? `\n\n${isAutolabCtx
          ? `Garry is reviewing this PENDING APPROVAL project (not yet approved): "${activeProject.name}" (ID: ${activeProject.id}, ${activeProject.industry}). They are in the Approvals queue — browsing pending projects. When they say "approve it", "approve this one", "what is this", "tell me about it" — this is the project they mean. DO NOT ask which project.`
          : `Currently open project: "${activeProject.name}" (ID: ${activeProject.id}, ${activeProject.industry})`} — brief: ${(activeProject.brief || "").slice(0, 300)}`
      : "";
    const sections = Object.entries(NAV_LABELS).map(([k, v]) => `${v} (${k})`).join(", ");
    const contextMessage = {
      role: "system" as const,
      content: `CURRENT CONTEXT: Garry is on the "${page}" section.${projCtx}

Available sections: ${sections}

NAVIGATION RULES — CRITICAL:
- To navigate to a panel: use the navigate_to TOOL with the section id. Do NOT use text tags like <<NAVIGATE:x>>.
- To open a specific project: FIRST call query_projects to find it and get its real database ID, THEN call navigate_to with section="projects" and the project_id. NEVER guess a project ID from what the user says — always look it up first.
- To go back to the projects list: call navigate_to with section="projects" (no project_id).
- To build an app: use start_app_build TOOL.

VOICE STYLE: Short, direct sentences. No bullet points or markdown. Report what you just did, then what's next. Only ask a question if the instruction is genuinely ambiguous — never ask for confirmation before executing a clear command. When running a multi-step task, keep going without stopping.`,
    };

    setStreaming(true);
    setStreamText("");
    setStreamingActions([]);
    setThinkingText("");
    setOpen(true);

    try {
      const apiMessages = [contextMessage, ...messages.map(m => ({ role: m.role, content: m.content })), { role: "user" as const, content: text }];
      const fetchController = new AbortController();
      const fetchTimeout = setTimeout(() => fetchController.abort(), 120_000);
      const res = await fetch(`${base}lab/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ messages: apiMessages, conversationId: conversationIdRef.current }),
        signal: fetchController.signal,
      });
      if (!res.ok || !res.body) { clearTimeout(fetchTimeout); throw new Error("Chat failed"); }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      const liveActions: ActionCardFloat[] = [];
      let lastActivity = Date.now();
      const activityTimeout = setInterval(() => {
        if (Date.now() - lastActivity > 90_000) { clearInterval(activityTimeout); reader.cancel().catch(() => {}); }
      }, 5_000);

      while (true) {
        const { done, value } = await reader.read();
        lastActivity = Date.now();
        clearTimeout(fetchTimeout);
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === "done") break;
            if (evt.type === "text" && evt.delta) {
              full += evt.delta;
              setStreamText(full);
              setThinkingText("");
            }
            if (evt.type === "thinking" && evt.text) {
              setThinkingText(evt.text);
            }
            if (evt.type === "status" && evt.message) {
              setThinkingText(evt.message);
            }
            if (evt.type === "action" && evt.label) {
              const card = { label: evt.label, color: evt.color || "hsl(193,100%,35%)", icon: evt.icon, detail: evt.detail };
              liveActions.push(card);
              setStreamingActions([...liveActions]);
              setThinkingText("");
            }
            if (evt.type === "navigate") {
              if (evt.section) {
                stoppedRef.current = true;
                stopListeningNow();
                onNavigate(evt.section as NavMode);
                if (evt.projectId && onOpenProject) {
                  const pName = streamText.match(/"([^"]+)"/)?.[1] ?? `project #${evt.projectId}`;
                  setPendingOpen({ id: evt.projectId, name: pName });
                } else {
                  setTimeout(() => setOpen(false), 600);
                }
              }
            }
            if (evt.type === "navigate_and_build") {
              if (evt.section) {
                stoppedRef.current = true;
                stopListeningNow();
                onNavigate(evt.section as NavMode);
                setTimeout(() => setOpen(false), 600);
              }
            }
            if (evt.type === "conversation_id" && evt.conversationId) {
              conversationIdRef.current = evt.conversationId;
            }
          } catch {}
        }
      }

      clearInterval(activityTimeout);

      if (full) {
        const cleanText = full.replace(/<<[^>]+>>/g, "").replace(/[*#>`_~]/g, "").trim();
        setMessages(prev => [...prev, { role: "assistant", content: cleanText, actions: liveActions.length ? liveActions : undefined }]);

        const spokenText = cleanText.length > 350 ? cleanText.slice(0, 350) + "." : cleanText;
        setVoicePhase("speaking");
        speakText(spokenText, () => {
          setVoicePhase("idle");
          if (!stoppedRef.current) setTimeout(() => startVoiceListening(t => sendVoice(t)), 400);
        });
      }
    } catch {
      const errMsg = "Something went wrong — please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
      setVoicePhase("speaking");
      speakText(errMsg, () => { setVoicePhase("idle"); if (!stoppedRef.current) setTimeout(() => startVoiceListening(t => sendVoice(t)), 400); });
    } finally {
      setStreaming(false);
      setStreamText("");
      setStreamingActions([]);
      setThinkingText("");
      if (!open) setUnread(true);
    }
  };

  if (navMode === "labchat") return null;

  return (
    <>
      {open && (
        <div className="fixed z-50 flex flex-col overflow-hidden"
          style={{
            background: "#fff",
            boxShadow: "0 20px 60px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.08)",
            animation: "slideUp 0.2s ease-out",
            bottom: window.innerWidth < 640 ? 0 : 104,
            right: window.innerWidth < 640 ? 0 : 16,
            left: window.innerWidth < 640 ? 0 : "auto",
            top: window.innerWidth < 640 ? 0 : "auto",
            width: window.innerWidth < 640 ? "100%" : 360,
            height: window.innerWidth < 640 ? "100%" : `min(500px, calc(100svh - 160px))`,
            borderRadius: window.innerWidth < 640 ? 0 : 16,
          }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

          <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3" style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.97), rgba(20,30,55,0.97))", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ border: "1.5px solid hsl(193,100%,50%)" }}>
              <img src="/logo-v2.png" alt="Sirius" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white leading-none">Sirius</p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(193,100%,60%)", fontSize: 10 }}>
                {NAV_LABELS[navMode] ?? navMode}{activeProject ? ` · ${activeProject.name}` : ""}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20">
              <X className="w-5 h-5 text-white/80" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "#F8FAFC" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                {m.role === "assistant" && (
                  <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 mb-0.5" style={{ border: "1px solid hsl(193,100%,70%)" }}>
                    <img src="/logo-v2.png" alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <div className="max-w-[260px] px-3 py-2 rounded-xl text-xs leading-relaxed" style={{
                    background: m.role === "user" ? "rgba(15,23,42,0.85)" : "#fff",
                    color: m.role === "user" ? "#fff" : "rgba(15,23,42,0.8)",
                    border: m.role === "assistant" ? "1px solid rgba(15,23,42,0.08)" : "none",
                    borderBottomRightRadius: m.role === "user" ? 4 : 12,
                    borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
                  }}>
                    {m.content}
                  </div>
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-col gap-1 max-w-[270px]">
                      {m.actions.map((a, ai) => (
                        <div key={ai} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium"
                          style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.07)", borderLeft: `2.5px solid ${a.color}` }}>
                          {a.icon && <span className="text-xs leading-none flex-shrink-0">{a.icon}</span>}
                          <span className="truncate" style={{ color: "rgba(15,23,42,0.65)" }}>{a.label}</span>
                          <Check className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: "hsl(155,70%,45%)" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start items-start gap-2">
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 mt-1" style={{ border: "1px solid hsl(193,100%,70%)" }}>
                  <img src="/logo-v2.png" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-1.5 max-w-[270px]">
                  {streamingActions.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium"
                      style={{ background: "#fff", border: `1px solid rgba(15,23,42,0.08)`, borderLeft: `2.5px solid ${a.color}` }}>
                      {a.icon && <span className="text-xs leading-none flex-shrink-0">{a.icon}</span>}
                      <span className="font-semibold truncate" style={{ color: "rgba(15,23,42,0.75)" }}>{a.label}</span>
                      <Check className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: "hsl(155,70%,45%)" }} />
                    </div>
                  ))}
                  {thinkingText && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]"
                      style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.07)", color: "rgba(15,23,42,0.5)", fontStyle: "italic" }}>
                      <Loader2 className="w-2.5 h-2.5 animate-spin flex-shrink-0" style={{ color: "hsl(193,100%,45%)" }} />
                      <span className="truncate">{thinkingText}</span>
                    </div>
                  )}
                  {streamText ? (
                    <div className="px-3 py-2 rounded-xl text-xs leading-relaxed" style={{ background: "#fff", color: "rgba(15,23,42,0.8)", border: "1px solid rgba(15,23,42,0.08)", borderBottomLeftRadius: 4 }}>
                      {streamText}
                      <span className="inline-block w-1 h-3 ml-0.5 rounded animate-pulse" style={{ background: "hsl(193,100%,45%)", verticalAlign: "middle" }} />
                    </div>
                  ) : !thinkingText && streamingActions.length === 0 && (
                    <div className="flex gap-1 px-3 py-2.5 rounded-xl" style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(193,100%,45%)", animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {pendingOpen && (
            <div className="flex-shrink-0 mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-center justify-between gap-3"
              style={{ background: "rgba(0,198,255,0.07)", border: "1px solid rgba(0,198,255,0.2)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(193,100%,40%)" }} />
                <p className="text-xs font-medium truncate" style={{ color: "rgba(15,23,42,0.8)" }}>
                  Open "{pendingOpen.name}"?
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => {
                    if (onOpenProject) onOpenProject(pendingOpen.id);
                    setPendingOpen(null);
                    setTimeout(() => setOpen(false), 400);
                  }}
                  className="text-xs px-3 py-1 rounded-lg font-semibold text-white transition-all active:scale-95"
                  style={{ background: "hsl(193,100%,35%)" }}>
                  Open
                </button>
                <button
                  onClick={() => setPendingOpen(null)}
                  className="text-xs px-2 py-1 rounded-lg transition-all active:scale-95"
                  style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.5)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex-shrink-0" style={{ background: "#fff", borderTop: "1px solid rgba(15,23,42,0.07)" }}>
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                ref={floatInputRef}
                value={floatTextInput}
                onChange={e => setFloatTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && floatTextInput.trim()) {
                    e.preventDefault();
                    const txt = floatTextInput.trim();
                    setFloatTextInput("");
                    sendVoice(txt);
                  }
                }}
                placeholder={queuedFloatMsg ? `Queued: "${queuedFloatMsg.slice(0, 30)}…"` : streaming ? "Type ahead — sends when she finishes…" : voicePhase === "listening" ? "Listening…" : voicePhase === "speaking" ? "Sirius speaking…" : "Type or speak…"}
                className="flex-1 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                style={{
                  background: queuedFloatMsg ? "hsl(45,100%,97%)" : "hsl(210,20%,97%)",
                  border: `1px solid ${queuedFloatMsg ? "hsl(45,80%,70%)" : "rgba(15,23,42,0.1)"}`,
                  color: "rgba(15,23,42,0.85)",
                  fontSize: 12,
                }}
              />
              {floatTextInput.trim() && (
                <button
                  onClick={() => { const txt = floatTextInput.trim(); if (txt) { setFloatTextInput(""); sendVoice(txt); } }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                  style={{ background: streaming ? "hsl(45,90%,55%)" : "hsl(193,100%,40%)" }}>
                  {streaming ? <Clock className="w-3 h-3 text-white" /> : <Send className="w-3.5 h-3.5 text-white" />}
                </button>
              )}
              <button
                onClick={() => {
                  if (voicePhase === "listening") { stopListeningNow(); }
                  else if (voicePhase === "speaking") { window.speechSynthesis?.cancel(); setVoicePhase("idle"); setTimeout(() => startVoiceListening(t => sendVoice(t)), 300); }
                  else if (!streaming) { startVoiceListening(t => sendVoice(t)); }
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                style={{ background: voicePhase === "listening" ? "hsl(0,75%,45%)" : "rgba(15,23,42,0.08)", boxShadow: voicePhase === "listening" ? "0 0 8px hsl(0,75%,40%)" : "none", opacity: streaming && voicePhase !== "speaking" ? 0.4 : 1 }}>
                {voicePhase === "listening" ? <MicOff className="w-3.5 h-3.5" style={{ color: "white" }} /> : <Mic className="w-3.5 h-3.5" style={{ color: voicePhase === "speaking" ? "hsl(193,100%,45%)" : "rgba(15,23,42,0.5)" }} />}
              </button>
            </div>
            {(voicePhase !== "idle" || streaming) && (
              <div className="flex items-center gap-2 px-3 pb-2">
                <div className="flex items-center gap-0.5 h-4">
                  {Array.from({ length: 6 }, (_, i) => {
                    const active = voicePhase === "listening" || voicePhase === "speaking";
                    const h = active ? 2 + Math.abs(Math.sin(waveTick * 0.28 + i * 0.7)) * 10 : 2;
                    const bg = voicePhase === "listening" ? "hsl(0,75%,55%)" : voicePhase === "speaking" ? "hsl(193,100%,45%)" : "rgba(15,23,42,0.15)";
                    return <div key={i} style={{ width: 2, height: `${h}px`, background: bg, borderRadius: 2, transition: "height 0.09s ease" }} />;
                  })}
                </div>
                <p className="text-xs" style={{ color: voicePhase === "listening" ? "hsl(0,75%,50%)" : voicePhase === "speaking" ? "hsl(193,100%,35%)" : "hsl(45,90%,50%)", fontSize: 10 }}>
                  {voicePhase === "listening" ? "Listening…" : voicePhase === "speaking" ? "Sirius speaking…" : "Thinking…"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
        style={{
          background: open ? "rgba(15,23,42,0.9)" : "linear-gradient(135deg, hsl(193,100%,38%), hsl(193,100%,28%))",
          borderRadius: open ? 14 : 28,
          padding: open ? "8px 14px 8px 10px" : "0",
          width: open ? "auto" : 52,
          height: 52,
          boxShadow: "0 8px 32px rgba(15,23,42,0.25), 0 0 0 1px rgba(255,255,255,0.08)",
          justifyContent: "center",
        }}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: "1.5px solid rgba(255,255,255,0.3)" }}>
          <img src="/logo-v2.png" alt="Sirius" className="w-full h-full object-cover" />
        </div>
        {open && <span className="text-xs font-semibold text-white whitespace-nowrap">Close chat</span>}
        {!open && unread && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "hsl(0,75%,55%)", fontSize: 8 }}>!</span>
        )}
      </button>
    </>
  );
}
