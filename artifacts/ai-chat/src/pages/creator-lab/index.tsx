import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { FlaskConical, Send, Loader2, X, ChevronDown, ChevronRight, Download, FolderOpen, Image, Globe, Terminal, FileText, Search, Zap, ArrowLeft } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

// ── Types ────────────────────────────────────────────────────────────────────

interface ToolResult {
  tool: string;
  args: Record<string, string>;
  result: string;
  imageUrl?: string;
  filesChanged?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolResults: ToolResult[];
  thinkingSteps: string[];
  imageUrls: string[];
}

// ── Tool icons & colours ──────────────────────────────────────────────────────

const TOOL_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  think:          { icon: <Zap size={12} />,      label: "Thinking",        color: "#a78bfa" },
  search_web:     { icon: <Globe size={12} />,     label: "Web Search",      color: "#38bdf8" },
  fetch_url:      { icon: <Globe size={12} />,     label: "Fetched Page",    color: "#38bdf8" },
  bash_execute:   { icon: <Terminal size={12} />,  label: "Terminal",        color: "#00E5A0" },
  write_file:     { icon: <FileText size={12} />,  label: "File Written",    color: "#00C4FF" },
  read_file:      { icon: <FileText size={12} />,  label: "File Read",       color: "#94a3b8" },
  list_files:     { icon: <FolderOpen size={12} />,label: "Workspace",       color: "#f59e0b" },
  grep_files:     { icon: <Search size={12} />,    label: "Search Files",    color: "#f59e0b" },
  image_generate: { icon: <Image size={12} />,     label: "Image Generated", color: "#f472b6" },
};

// ── Tool result card ──────────────────────────────────────────────────────────

function ToolCard({ result }: { result: ToolResult }) {
  const [open, setOpen] = useState(result.tool === "write_file" || result.tool === "image_generate" || !!result.imageUrl);
  const meta = TOOL_META[result.tool] ?? { icon: <Zap size={12} />, label: result.tool, color: "#64748b" };

  if (result.tool === "think") {
    return (
      <div style={{ margin: "6px 0", padding: "10px 14px", borderRadius: 8, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, fontStyle: "italic" }}>
        💭 {result.result.replace(/^💭\s*/, "")}
      </div>
    );
  }

  return (
    <div style={{ margin: "6px 0", borderRadius: 10, border: `1px solid ${meta.color}22`, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: `${meta.color}11`, border: "none", cursor: "pointer", color: meta.color, fontSize: 12, fontWeight: 600 }}
      >
        {meta.icon}
        <span style={{ flex: 1, textAlign: "left" }}>{meta.label}{result.args?.path ? ` — ${result.args.path}` : result.args?.command ? ` — ${result.args.command.slice(0, 40)}` : result.args?.query ? ` — ${result.args.query.slice(0, 40)}` : ""}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {open && (
        <div style={{ background: "#0a0e1a", padding: "10px 12px" }}>
          {result.imageUrl ? (
            <div>
              <img src={result.imageUrl} alt="Generated" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />
              <a href={result.imageUrl} download target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: "#f472b6", textDecoration: "underline" }}>
                Download image
              </a>
            </div>
          ) : (
            <pre style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.75)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", lineHeight: 1.5 }}>
              {result.result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── Thinking pill ─────────────────────────────────────────────────────────────

function ThinkingPill({ text }: { text: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "rgba(0,196,255,0.08)", border: "1px solid rgba(0,196,255,0.2)", fontSize: 11, color: "rgba(0,196,255,0.8)", margin: "3px 0" }}>
      <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />
      {text}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CreatorLabPage() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [workspaceTree, setWorkspaceTree] = useState<string | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userId = getUserId();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStatus]);

  const loadWorkspace = useCallback(async () => {
    const base = getApiBase();
    const r = await fetch(`${base}creator-lab/workspace?userId=${encodeURIComponent(userId)}`).catch(() => null);
    if (r?.ok) {
      const d = await r.json();
      setWorkspaceTree(d.tree);
    }
  }, [userId]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setInput("");

    const newMsg: ChatMessage = { role: "user", content: userText, toolResults: [], thinkingSteps: [], imageUrls: [] };
    setMessages(prev => [...prev, newMsg]);

    const base = getApiBase();
    const apiMessages = [...messages, newMsg].map(m => ({ role: m.role, content: m.content }));

    setStreaming(true);
    setCurrentStatus(null);

    const assistantMsg: ChatMessage = { role: "assistant", content: "", toolResults: [], thinkingSteps: [], imageUrls: [] };

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${base}creator-lab/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messages: apiMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Failed to connect to Creator Lab" }));
        setMessages(prev => [...prev, { ...assistantMsg, content: `❌ ${err.error ?? "Connection failed"}` }]);
        return;
      }

      setMessages(prev => [...prev, assistantMsg]);
      const msgIndex = messages.length + 1;

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));

            if (ev.type === "text") {
              setMessages(prev => {
                const updated = [...prev];
                updated[msgIndex] = { ...updated[msgIndex], content: updated[msgIndex].content + ev.text };
                return updated;
              });
              setCurrentStatus(null);
            }

            if (ev.type === "thinking") {
              setCurrentStatus(ev.text);
            }

            if (ev.type === "tool_result") {
              setCurrentStatus(null);
              const toolResult: ToolResult = { tool: ev.tool, args: ev.args, result: ev.result, imageUrl: ev.imageUrl, filesChanged: ev.filesChanged };
              setMessages(prev => {
                const updated = [...prev];
                updated[msgIndex] = { ...updated[msgIndex], toolResults: [...updated[msgIndex].toolResults, toolResult] };
                return updated;
              });
              if (ev.imageUrl) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[msgIndex] = { ...updated[msgIndex], imageUrls: [...updated[msgIndex].imageUrls, ev.imageUrl] };
                  return updated;
                });
              }
              if (ev.filesChanged) loadWorkspace();
            }

            if (ev.type === "done") {
              setCurrentStatus(null);
              loadWorkspace();
            }

            if (ev.type === "error") {
              setMessages(prev => {
                const updated = [...prev];
                updated[msgIndex] = { ...updated[msgIndex], content: updated[msgIndex].content + `\n\n❌ ${ev.text}` };
                return updated;
              });
            }

          } catch { /* partial json */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > messages.length) {
          updated[messages.length + 1] = { ...updated[messages.length + 1], content: "Connection lost. Please try again." };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      setCurrentStatus(null);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const STARTERS = [
    "Build me a Python web scraper that pulls product prices from a website",
    "Create a complete landing page for my coaching business",
    "Write a business plan for a conscious entrepreneur marketplace",
    "Build a REST API with authentication in Node.js",
    "Generate a brand logo concept for a wellness tech startup",
    "Analyse the market opportunity in personalised AI coaching",
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#070c1a", color: "#fff", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid rgba(0,196,255,0.1)", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
          <button onClick={() => setLocation("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
          <FlaskConical size={18} style={{ color: "#00C4FF" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Creator Lab</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Build anything. Sirius verifies everything.</div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { setShowWorkspace(w => !w); if (!showWorkspace) loadWorkspace(); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: showWorkspace ? "rgba(0,196,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${showWorkspace ? "rgba(0,196,255,0.3)" : "rgba(255,255,255,0.1)"}`, color: showWorkspace ? "#00C4FF" : "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12 }}
          >
            <FolderOpen size={13} /> Workspace
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {messages.length === 0 && (
            <div style={{ maxWidth: 640, margin: "40px auto 0", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(0,196,255,0.2), rgba(0,229,160,0.1))", border: "1px solid rgba(0,196,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <FlaskConical size={24} style={{ color: "#00C4FF" }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Creator Lab</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 28 }}>
                Same intelligence. Same tools. Same verification loop.<br />
                Describe what you want built — Sirius builds it, tests it, and hands you something that works.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left" }}>
                {STARTERS.map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,196,255,0.06)"; e.currentTarget.style.borderColor = "rgba(0,196,255,0.2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "100%" }}>
              {msg.role === "user" ? (
                <div style={{ maxWidth: "70%", padding: "10px 16px", borderRadius: "16px 16px 4px 16px", background: "linear-gradient(135deg, rgba(0,196,255,0.25), rgba(0,229,160,0.15))", border: "1px solid rgba(0,196,255,0.2)", fontSize: 14, lineHeight: 1.6, color: "#fff" }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{ width: "100%", maxWidth: 720 }}>
                  {/* Tool results first */}
                  {msg.toolResults.map((tr, j) => <ToolCard key={j} result={tr} />)}

                  {/* Assistant text */}
                  {msg.content && (
                    <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.9)", marginTop: msg.toolResults.length ? 8 : 0, whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Live status */}
          {streaming && currentStatus && (
            <div style={{ maxWidth: 720 }}>
              <ThinkingPill text={currentStatus} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(0,196,255,0.1)", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 720, margin: "0 auto" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build…"
              rows={1}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 12, resize: "none", overflowY: "auto", maxHeight: 120,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,196,255,0.2)", color: "#fff",
                fontSize: 14, lineHeight: 1.5, outline: "none", fontFamily: "inherit",
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            {streaming ? (
              <button onClick={() => abortRef.current?.abort()} style={{ padding: "12px", borderRadius: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <X size={18} />
              </button>
            ) : (
              <button onClick={sendMessage} disabled={!input.trim()} style={{ padding: "12px 18px", borderRadius: 12, background: input.trim() ? "#00C4FF" : "rgba(255,255,255,0.05)", border: "none", color: input.trim() ? "#070c1a" : "rgba(255,255,255,0.2)", cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, transition: "all 0.15s" }}>
                <Send size={16} />
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 8 }}>
            Sirius writes, tests, and verifies everything before reporting back.
          </p>
        </div>
      </div>

      {/* Workspace panel */}
      {showWorkspace && (
        <div style={{ width: 280, borderLeft: "1px solid rgba(0,196,255,0.1)", background: "rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#00C4FF" }}>
              <FolderOpen size={14} /> Workspace
            </div>
            <button onClick={loadWorkspace} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11 }}>↻</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {workspaceTree ? (
              <pre style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "pre-wrap", lineHeight: 1.8, fontFamily: "'JetBrains Mono', monospace" }}>
                {workspaceTree}
              </pre>
            ) : (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0 }}>Workspace is empty. Ask Sirius to build something.</p>
            )}
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, lineHeight: 1.5 }}>
              Files are saved here during your session. Ask Sirius to read, edit, or run any file.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(255,255,255,0.25); }
        textarea:focus { border-color: rgba(0,196,255,0.4) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
