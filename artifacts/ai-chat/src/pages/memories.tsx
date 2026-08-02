import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Brain, MessageSquare, Trash2, Clock, ChevronRight, Sparkles } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function MemoriesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const userId = getUserId();
  const base = getApiBase();

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${base}openai/conversations?userId=${userId}`);
      if (res.ok) setConversations(await res.json());
    } catch {}
    setLoading(false);
  }, [userId, base]);

  useEffect(() => { load(); }, [load]);

  const deleteConversation = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(`${base}openai/conversations/${id}`, { method: "DELETE" });
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch {}
    setDeleting(null);
  };

  const totalConversations = conversations.length;
  const oldestDate = conversations.length
    ? new Date(conversations[conversations.length - 1]?.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #04081a 0%, #070d20 55%, #050e1b 100%)",
      color: "#fff",
      fontFamily: "Outfit, sans-serif",
    }}>
      {/* Subtle grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle, rgba(0,212,255,0.05) 1px, transparent 1px)`,
        backgroundSize: "56px 56px",
      }} />
      {/* Glow */}
      <div style={{
        position: "fixed", top: -80, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400, pointerEvents: "none",
        background: "radial-gradient(circle, hsla(270,70%,50%,0.08) 0%, transparent 65%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Back */}
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: 13, marginBottom: 40 }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}>
          <ArrowLeft size={14} /> Back to Sirius
        </a>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 999, padding: "5px 14px", marginBottom: 20,
          }}>
            <Brain size={11} style={{ color: "hsl(270,70%,70%)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "hsl(270,70%,70%)", textTransform: "uppercase" }}>Memory</span>
          </div>
          <h1 style={{ fontSize: "clamp(26px,6vw,34px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}>
            What Sirius knows
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.65, maxWidth: 420 }}>
            Every conversation builds context. Sirius uses this to remember you, your goals, and your projects across sessions.
          </p>
        </div>

        {/* Stats */}
        {!loading && totalConversations > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { icon: MessageSquare, label: "Conversations", value: totalConversations.toString() },
              { icon: Clock, label: "First memory", value: oldestDate || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <Icon size={13} style={{ color: "rgba(139,92,246,0.7)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Conversation history */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", margin: 0 }}>
              Conversation history
            </h2>
            {totalConversations > 0 && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{totalConversations} sessions</span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
              Loading your memory…
            </div>
          ) : conversations.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "48px 24px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
            }}>
              <Sparkles size={28} style={{ color: "rgba(139,92,246,0.4)", marginBottom: 14 }} />
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No memory yet</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                Start a conversation and Sirius will begin building context about you.
              </p>
              <a href="/" style={{
                display: "inline-block", marginTop: 20, padding: "10px 22px",
                background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
                borderRadius: 10, color: "hsl(270,70%,75%)", textDecoration: "none", fontSize: 13, fontWeight: 600,
              }}>
                Start talking
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {conversations.map(convo => (
                <div key={convo.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "13px 16px",
                  transition: "border-color 0.15s",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={`/c/${convo.id}`} style={{
                      display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
                    }}>
                      <span style={{
                        fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.8)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: 1,
                      }}>
                        {convo.title || "Untitled conversation"}
                      </span>
                      <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    </a>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", display: "block", marginTop: 3 }}>
                      {timeAgo(convo.updatedAt || convo.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteConversation(convo.id)}
                    disabled={deleting === convo.id}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: "6px",
                      color: deleting === convo.id ? "rgba(255,255,255,0.1)" : "rgba(255,80,80,0.3)",
                      borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "color 0.15s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => { if (deleting !== convo.id) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,80,80,0.8)"; }}
                    onMouseLeave={e => { if (deleting !== convo.id) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,80,80,0.3)"; }}
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacy note */}
        <div style={{
          background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)",
          borderRadius: 14, padding: "16px 18px",
        }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: "rgba(255,255,255,0.5)" }}>Your data is yours.</strong>{" "}
            Sirius uses your conversation history to provide personalised, context-aware responses. Deleting a conversation removes it from Sirius's memory permanently.
          </p>
        </div>

      </div>
    </div>
  );
}
