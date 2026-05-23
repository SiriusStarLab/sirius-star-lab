import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, RefreshCw, Brain } from "lucide-react";
import { getUserId } from "@/lib/user-id";

interface MemoryPortraitProps {
  isOpen: boolean;
  onClose: () => void;
  aiName?: string;
}

type PortraitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "empty"; message: string }
  | { status: "ready"; portrait: string; generatedAt: string }
  | { status: "error"; error: string };

export function MemoryPortrait({ isOpen, onClose, aiName = "Sirius" }: MemoryPortraitProps) {
  const [state, setState] = useState<PortraitState>({ status: "idle" });
  const userId = getUserId();

  const generate = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/intelligence/portrait/${userId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate portrait");
      const data = await res.json();
      if (data.portrait) {
        setState({ status: "ready", portrait: data.portrait, generatedAt: data.generatedAt });
      } else {
        setState({ status: "empty", message: data.message ?? "Talk to me more and I'll start to see who you are." });
      }
    } catch (err: any) {
      setState({ status: "error", error: err.message ?? "Something went wrong." });
    }
  }, [userId]);

  const handleClose = () => {
    setState({ status: "idle" });
    onClose();
  };

  const formattedDate = state.status === "ready"
    ? new Date(state.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            key="panel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed inset-y-0 left-0 z-[70] w-full max-w-md shadow-2xl flex flex-col"
            style={{
              background: "hsl(var(--sidebar))",
              borderRight: "1px solid hsl(193 100% 52% / 0.12)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6"
              style={{ borderBottom: "1px solid hsl(193 100% 52% / 0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(193 100% 52% / 0.12)", border: "1px solid hsl(193 100% 52% / 0.2)" }}>
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Memory Portrait</h2>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">How {aiName} sees you</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-sidebar-accent transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {state.status === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col items-center text-center gap-6 pt-8"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, hsl(193 100% 52% / 0.15), hsl(224 28% 10%))",
                          border: "1px solid hsl(193 100% 52% / 0.25)",
                          boxShadow: "0 0 40px hsl(193 100% 52% / 0.1)"
                        }}>
                        <Sparkles className="w-9 h-9 text-primary" />
                      </div>
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        style={{ background: "radial-gradient(circle, hsl(193 100% 52% / 0.08) 0%, transparent 70%)" }}
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-medium text-foreground">Your portrait awaits</h3>
                      <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-xs">
                        {aiName} has been quietly watching, listening, and understanding. 
                        Ask it to reveal what it sees in you — a portrait drawn from memory.
                      </p>
                    </div>

                    <button
                      onClick={generate}
                      className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-lg"
                      style={{
                        background: "linear-gradient(135deg, hsl(193 100% 52% / 0.2), hsl(193 100% 52% / 0.1))",
                        border: "1px solid hsl(193 100% 52% / 0.3)",
                        color: "hsl(193 100% 52%)",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 24px hsl(193 100% 52% / 0.15)"; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Reveal my portrait
                    </button>

                    <p className="text-[11px] text-muted-foreground/40 max-w-xs leading-relaxed">
                      Generated from your conversations. The more you talk, the deeper the portrait becomes.
                    </p>
                  </motion.div>
                )}

                {state.status === "loading" && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center gap-5 pt-12"
                  >
                    <motion.div
                      className="w-16 h-16 rounded-full"
                      style={{
                        background: "linear-gradient(135deg, hsl(193 100% 52% / 0.15), hsl(224 28% 10%))",
                        border: "1px solid hsl(193 100% 52% / 0.25)",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <Brain className="w-7 h-7 text-primary" />
                      </div>
                    </motion.div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">{aiName} is reflecting…</p>
                      <p className="text-xs text-muted-foreground/60">Drawing from everything it knows about you</p>
                    </div>
                    <motion.div className="flex gap-1.5 mt-2">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/60"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {state.status === "empty" && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center gap-5 pt-8"
                  >
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        background: "hsl(224 28% 10%)",
                        border: "1px solid hsl(193 100% 52% / 0.1)",
                      }}>
                      <Brain className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">Not quite yet</h3>
                      <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-xs">
                        {state.message}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground/40 italic">
                      The portrait deepens with every conversation.
                    </p>
                  </motion.div>
                )}

                {state.status === "ready" && (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="relative rounded-2xl p-6 space-y-4"
                      style={{
                        background: "hsl(224 28% 11%)",
                        border: "1px solid hsl(193 100% 52% / 0.18)",
                        boxShadow: "0 0 48px hsl(193 100% 52% / 0.05) inset",
                      }}>
                      <motion.div
                        className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary/60"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                      />
                      <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-primary/60">
                        Portrait — {formattedDate}
                      </p>
                      <p className="text-sm leading-[1.95] text-foreground/90 font-light italic">
                        {state.portrait}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                      <div className="flex-1 h-px" style={{ background: "hsl(193 100% 52% / 0.1)" }} />
                      <span>drawn from memory</span>
                      <div className="flex-1 h-px" style={{ background: "hsl(193 100% 52% / 0.1)" }} />
                    </div>

                    <button
                      onClick={generate}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium text-muted-foreground/60 hover:text-primary transition-all duration-200"
                      style={{ background: "hsl(224 28% 8%)", border: "1px solid hsl(193 100% 52% / 0.1)" }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate portrait
                    </button>
                  </motion.div>
                )}

                {state.status === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center gap-4 pt-8"
                  >
                    <p className="text-sm text-muted-foreground/60">{state.error}</p>
                    <button
                      onClick={generate}
                      className="text-xs text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
