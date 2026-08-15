import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { FlaskConical, Cpu, Code2, MessageSquare, Send, Loader2, FolderOpen, ChevronRight, ChevronDown, AlertTriangle, Zap, X, FileText, Terminal } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";
import { PricingModal } from "@/components/pricing-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type LabMode = "app" | "code" | "chat";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ModeConfig {
  id: LabMode;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  placeholder: string;
  starterMessage: string;
}

// ── Mode config ───────────────────────────────────────────────────────────────

const MODES: ModeConfig[] = [
  {
    id: "app",
    label: "App Builder",
    icon: <Cpu size={15} />,
    color: "hsl(193,100%,35%)",
    description: "Describe the app you want. Sirius architects, codes, tests and deploys it in a real Linux sandbox.",
    placeholder: "Describe the app you want to build…",
    starterMessage: "Tell me about the app you want to build. What is it, who is it for, and what should it do? I'll architect it, write every file, run the tests, and show you the result.",
  },
  {
    id: "code",
    label: "Code Builder",
    icon: <Code2 size={15} />,
    color: "hsl(155,70%,38%)",
    description: "Describe what you need coded. Sirius writes, runs and verifies it in a real Linux environment.",
    placeholder: "What do you need built or coded?",
    starterMessage: "What do you need coded? Describe the task — a script, an API, a data pipeline, anything — and I'll write it, run it, and verify it works before handing it over.",
  },
  {
    id: "chat",
    label: "Lab Chat",
    icon: <MessageSquare size={15} />,
    color: "hsl(280,70%,55%)",
    description: "Your AI creation partner. Research, plan, strategise, and build — with a real sandbox available when you need it.",
    placeholder: "Ask anything. Build anything.",
    starterMessage: "I'm ready. What are we working on today? I can research, plan, write code, run it live, or just think through a problem with you.",
  },
];

// ── File tree component ───────────────────────────────────────────────────────

function FileTree({ tree }: { tree: string }) {
  const [expanded, setExpanded] = useState(true);
  const lines = tree.split("\n").filter(Boolean).slice(0, 60);

  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: "hsl(193,60%,30%)" }}>
      <button
        onClick={() => setExpanded(x => !x)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: "pointer",
          color: "hsl(193,60%,30%)", fontFamily: "inherit", fontSize: 11,
          fontWeight: 600, marginBottom: 6, padding: 0,
        }}
      >
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        /workspace
      </button>
      {expanded && (
        <div style={{ paddingLeft: 12 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ padding: "1px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {line}
            </div>
          ))}
          {tree.split("\n").length > 60 && (
            <div style={{ color: "hsl(193,50%,50%)", fontStyle: "italic" }}>… and more</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Upgrade gate ──────────────────────────────────────────────────────────────

function UpgradeGate({ onClose }: { onClose: () => void }) {
  const [, setLocation] = useLocation();
  const [showPricing, setShowPricing] = useState(false);

  return (
    <>
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(160deg, hsl(193,80%,97%) 0%, hsl(280,50%,97%) 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}>
        <div style={{
          maxWidth: 420, width: "100%", margin: "0 20px",
          background: "white", borderRadius: 24,
          border: "1px solid hsla(193,100%,35%,0.15)",
          boxShadow: "0 20px 60px hsla(193,100%,35%,0.12)",
          padding: "48px 36px", textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
            background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(280,70%,55%))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px hsla(193,100%,35%,0.3)",
          }}>
            <FlaskConical size={28} color="#fff" />
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.3px" }}>
            Star Lab
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
            Build real apps, write and run code, and think through anything — with a live Linux sandbox.
          </p>
          <p style={{ margin: "0 0 28px", fontSize: 13, color: "#64748B" }}>
            Available on <strong>Sirius Plus</strong> and <strong>Pro</strong>.
          </p>
          <button
            onClick={() => setShowPricing(true)}
            style={{
              width: "100%", padding: "13px", fontSize: 14, fontWeight: 600,
              background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(280,70%,55%))",
              color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
              boxShadow: "0 4px 16px hsla(193,100%,35%,0.35)",
            }}
          >
            Upgrade to Plus →
          </button>
          <button
            onClick={() => setLocation("/")}
            style={{
              marginTop: 12, background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: "#94A3B8",
            }}
          >
            Back to chat
          </button>
        </div>
      </div>
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, modeColor }: { msg: Message; modeColor: string }) {
  const isUser = msg.role === "user";
  // Detect code blocks in assistant messages
  const content = msg.content;

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: isUser ? "70%" : "90%",
        padding: isUser ? "10px 16px" : "12px 16px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        background: isUser
          ? `linear-gradient(135deg, ${modeColor}, ${modeColor}cc)`
          : "white",
        color: isUser ? "#fff" : "#1E293B",
        fontSize: 14,
        lineHeight: 1.6,
        border: isUser ? "none" : "1px solid hsla(0,0%,0%,0.06)",
        boxShadow: isUser
          ? `0 2px 8px ${modeColor}40`
          : "0 1px 3px rgba(0,0,0,0.06)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {content}
        {msg.isStreaming && (
          <span style={{
            display: "inline-block", width: 8, height: 14, marginLeft: 2,
            background: modeColor, borderRadius: 1,
            animation: "blink 0.8s step-end infinite",
          }} />
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CreatorLabPage() {
  const userId = getUserId();
  const base = getApiBase();

  const [accessState, setAccessState] = useState<"checking" | "granted" | "denied">("checking");
  const [mode, setMode] = useState<LabMode>("app");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [fileTree, setFileTree] = useState<string | null>(null);
  const [showFiles, setShowFiles] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentMode = MODES.find(m => m.id === mode)!;

  // ── Check subscription on load ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${base}creator-lab/workspace?userId=${encodeURIComponent(userId)}`)
      .then(r => {
        if (r.status === 403) { setAccessState("denied"); return; }
        setAccessState("granted");
        return r.json();
      })
      .then((data: any) => {
        if (data?.tree) setFileTree(data.tree);
      })
      .catch(() => setAccessState("granted")); // allow optimistically on network error
  }, [userId]);

  // ── Show starter message when mode changes ─────────────────────────────────
  useEffect(() => {
    if (accessState !== "granted") return;
    setMessages([{ role: "assistant", content: currentMode.starterMessage }]);
    setInput("");
  }, [mode, accessState]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    const assistantMsg: Message = { role: "assistant", content: "", isStreaming: true };
    setMessages([...newMessages, assistantMsg]);
    setStreaming(true);

    // Build message history for API (include mode context in first system message position)
    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${base}creator-lab/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messages: apiMessages, mode }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: err.error || "Something went wrong. Please try again.",
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "text" && ev.text) {
              fullText += ev.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: fullText,
                  isStreaming: true,
                };
                return updated;
              });
            } else if (ev.type === "done") {
              break;
            } else if (ev.type === "error") {
              fullText += ev.text ? `\n\n⚠️ ${ev.text}` : "\n\n⚠️ An error occurred.";
            }
          } catch {}
        }
      }

      // Mark streaming done
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: fullText || "Done.",
          isStreaming: false,
        };
        return updated;
      });

      // Refresh file tree after response (may have created files)
      fetch(`${base}creator-lab/workspace?userId=${encodeURIComponent(userId)}`)
        .then(r => r.json())
        .then((data: any) => { if (data?.tree) setFileTree(data.tree); })
        .catch(() => {});

    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Connection error — please check your internet and try again.",
          };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, userId, base, mode]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Render: access checking ─────────────────────────────────────────────────
  if (accessState === "checking") {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, hsl(193,80%,97%) 0%, hsl(280,50%,97%) 100%)",
      }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "hsl(193,100%,35%)" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (accessState === "denied") {
    return <UpgradeGate onClose={() => {}} />;
  }

  // ── Render: main lab ────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, hsl(193,40%,97%) 0%, hsl(280,30%,97%) 100%)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: hsla(193,100%,35%,0.2); border-radius: 4px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid hsla(193,100%,35%,0.1)",
        background: "white",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `linear-gradient(135deg, ${currentMode.color}, ${currentMode.color}bb)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", flexShrink: 0,
          boxShadow: `0 4px 12px ${currentMode.color}40`,
          transition: "all 0.2s",
        }}>
          {currentMode.icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>Star Lab</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{currentMode.label}</div>
        </div>

        {/* Mode selector */}
        <div style={{
          marginLeft: "auto", display: "flex", gap: 4, alignItems: "center",
        }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                background: mode === m.id ? m.color : "hsla(0,0%,0%,0.04)",
                color: mode === m.id ? "white" : "#64748B",
                boxShadow: mode === m.id ? `0 2px 8px ${m.color}40` : "none",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {m.icon}
              <span style={{ display: "none" }} className="sm-show">{m.label}</span>
            </button>
          ))}

          {/* File browser toggle */}
          {fileTree && (
            <button
              onClick={() => setShowFiles(x => !x)}
              title="Workspace files"
              style={{
                marginLeft: 4, padding: "5px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                background: showFiles ? "hsla(193,100%,35%,0.1)" : "hsla(0,0%,0%,0.04)",
                color: showFiles ? "hsl(193,100%,30%)" : "#64748B",
              }}
            >
              <FolderOpen size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Messages ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Mode description banner */}
          <div style={{
            padding: "8px 16px",
            background: `${currentMode.color}08`,
            borderBottom: `1px solid ${currentMode.color}18`,
            fontSize: 12, color: "#64748B",
            display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0,
          }}>
            <span style={{ color: currentMode.color }}>{currentMode.icon}</span>
            {currentMode.description}
          </div>

          {/* Message list */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            display: "flex", flexDirection: "column",
          }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} modeColor={currentMode.color} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid hsla(0,0%,0%,0.06)",
            background: "white",
            flexShrink: 0,
          }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#F8FAFF",
              border: `1.5px solid ${streaming ? currentMode.color + "60" : "hsla(0,0%,0%,0.1)"}`,
              borderRadius: 14,
              padding: "8px 12px",
              transition: "border-color 0.15s",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={currentMode.placeholder}
                disabled={streaming}
                rows={1}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  resize: "none", fontSize: 14, color: "#1E293B",
                  lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                  fontFamily: "inherit",
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={streaming ? () => { abortRef.current?.abort(); setStreaming(false); } : send}
                disabled={!streaming && !input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: "none",
                  cursor: streaming ? "pointer" : !input.trim() ? "not-allowed" : "pointer",
                  background: streaming
                    ? "hsl(0,70%,55%)"
                    : input.trim()
                      ? `linear-gradient(135deg, ${currentMode.color}, ${currentMode.color}cc)`
                      : "hsl(210,20%,90%)",
                  color: streaming || input.trim() ? "white" : "#94A3B8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                {streaming
                  ? <X size={14} />
                  : <Send size={14} />
                }
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "#94A3B8", textAlign: "center" }}>
              {streaming ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  Sirius is working…
                </span>
              ) : (
                "Enter to send · Shift+Enter for new line"
              )}
            </div>
          </div>
        </div>

        {/* ── File browser panel ── */}
        {showFiles && fileTree && (
          <div style={{
            width: 220, borderLeft: "1px solid hsla(193,100%,35%,0.1)",
            background: "white", display: "flex", flexDirection: "column",
            overflow: "hidden", flexShrink: 0,
          }}>
            <div style={{
              padding: "10px 12px",
              borderBottom: "1px solid hsla(193,100%,35%,0.08)",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, fontWeight: 600, color: "hsl(193,60%,30%)",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              <Terminal size={11} />
              Workspace
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              <FileTree tree={fileTree} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
