import React, { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Home, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { DailyWisdom } from "@/components/daily-wisdom";
import { TopicHub } from "@/components/topic-hub";
import { MoodCheckin } from "@/components/mood-checkin";
import { useChat } from "@/hooks/use-chat";
import { useProfile } from "@/hooks/use-profile";
import { useGetOpenaiConversation } from "@workspace/api-client-react";

const SURPRISE_PROMPTS = [
  "Tell me the most mind-blowing fact about the universe that most people have never heard.",
  "What is the strangest thing that quantum physics tells us about reality?",
  "Tell me something from history that was buried or forgotten — something that changes how we see the world.",
  "What is the biggest unsolved mystery in science right now?",
  "Explain the hard problem of consciousness — why can't science explain why we feel anything at all?",
  "Give me the most extraordinary fact about the human body that most doctors don't mention.",
  "What do we actually know about consciousness from neuroscience — and where does it break down?",
  "Tell me something about the ocean that most people have no idea about.",
  "What is the most incredible animal ability on Earth — something that makes our senses look primitive?",
  "Give me the most profound philosophical question ever asked — one so deep even the greatest minds couldn't answer it.",
  "What ancient wisdom have modern scientists confirmed is actually correct?",
  "What does physics say about parallel universes? The actual serious academic theories.",
];

type ExpandedSection = "topics" | "mood" | "wisdom" | null;

export function ChatPage() {
  const [matchConv, convParams] = useRoute("/c/:id");
  const [matchHome] = useRoute("/");
  const [, setLocation] = useLocation();
  const conversationId = matchConv && convParams?.id ? parseInt(convParams.id) : undefined;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [upgradeParam, setUpgradeParam] = useState<"plus" | "pro" | null>(null);
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [voiceMode, setVoiceMode] = useState(() => localStorage.getItem("sirius_voice_mode") === "true");
  const prevConvId = useRef<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const aiName = profile.aiName || "Sirius";

  // Redirect unknown paths (not "/" and not "/c/:id") to home
  useEffect(() => {
    if (!matchHome && !matchConv) {
      setLocation("/");
    }
  }, [matchHome, matchConv, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const up = params.get("upgrade");
    if (up === "plus" || up === "pro") {
      setUpgradeParam(up as "plus" | "pro");
      setIsSidebarOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("upgrade");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const {
    data: dbConversation,
    isLoading: isDbLoading,
    isError,
  } = useGetOpenaiConversation(conversationId as number, {
    query: { enabled: !!conversationId } as any,
  });

  const { messages, setInitialMessages, sendMessage, isTyping, stopStream, clearMessages } =
    useChat(conversationId);

  useEffect(() => {
    if (dbConversation?.messages) setInitialMessages(dbConversation.messages);
  }, [dbConversation, setInitialMessages]);

  useEffect(() => {
    if (isError) setLocation("/");
  }, [isError, setLocation]);

  // Flash a "saved to history" indicator the first time a conversation gets an ID
  useEffect(() => {
    if (conversationId && prevConvId.current === undefined) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 3000);
      prevConvId.current = conversationId;
      return () => clearTimeout(t);
    }
    prevConvId.current = conversationId;
    return;
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const toggleVoiceMode = () => {
    setVoiceMode(prev => {
      const next = !prev;
      localStorage.setItem("sirius_voice_mode", String(next));
      if (!next) stopTTS();
      return next;
    });
  };

  const ttsGenRef = useRef(0);

  const playTTS = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Bump the generation counter so any in-flight chunks from a previous
    // message will bail out when they check their captured gen value.
    const gen = ++ttsGenRef.current;

    const clean = text
      .replace(/\*\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .slice(0, 6000);

    // Split into sentence-sized chunks to work around Chrome's ~15s speech cutoff bug.
    // Chrome silently stops speaking long utterances; chaining short ones avoids this.
    const sentences = clean.match(/[^.!?]+[.!?]+[\s]*/g) || [clean];
    const chunks: string[] = [];
    let current = "";
    for (const s of sentences) {
      if ((current + s).length > 220) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === "en-GB" && v.name.toLowerCase().includes("female"))
      || voices.find(v => v.lang === "en-GB")
      || voices.find(v => v.lang.startsWith("en"));

    const speakChunk = (index: number) => {
      // If a newer playTTS call has started, abandon this sequence entirely.
      if (ttsGenRef.current !== gen) return;
      if (index >= chunks.length) return;
      const utt = new SpeechSynthesisUtterance(chunks[index]);
      utt.lang = "en-GB";
      utt.rate = 0.95;
      utt.pitch = 1.0;
      if (preferred) utt.voice = preferred;
      utt.onend = () => speakChunk(index + 1);
      utt.onerror = () => speakChunk(index + 1); // skip broken chunk, keep going
      window.speechSynthesis.speak(utt);
    };

    speakChunk(0);
  };

  const stopTTS = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  // When a topic/mood/wisdom chip triggers a chat, collapse the section
  const handleSend = (content: string, imageBase64?: string, mode?: string, documentBase64?: string, documentName?: string) => {
    setExpandedSection(null);
    sendMessage(content, imageBase64, mode, documentBase64, documentName, voiceMode ? playTTS : undefined);
  };

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const surpriseMe = () => {
    const idx = Math.floor(Math.random() * SURPRISE_PROMPTS.length);
    handleSend(SURPRISE_PROMPTS[idx]);
  };

  const isEmpty = messages.length === 0;
  const isInitialLoading = !!conversationId && isDbLoading && isEmpty;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <div className="scan-line" />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        forceOpenPricing={upgradeParam}
        onNewSession={() => {
          clearMessages();
          setLocation("/");
          setIsSidebarOpen(false);
        }}
      />

      <div className="flex-1 flex flex-col h-full relative z-10 w-full min-w-0">

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-3 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { clearMessages(); setLocation("/"); }}
            title="New session"
            className="text-muted-foreground hover:text-foreground"
            style={{ opacity: messages.length > 0 ? 1 : 0.35 }}
          >
            <Home size={18} />
          </Button>
          <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase truncate max-w-[160px]">
            {conversationId ? (dbConversation?.title || "Session") : aiName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            title="Chat history"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
            {conversationId && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </header>

        {/* "Saved to history" flash — mobile only, fades in/out */}
        <AnimatePresence>
          {savedFlash && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden absolute top-14 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono"
              style={{ background: "hsl(193 100% 52% / 0.1)", border: "1px solid hsl(193 100% 52% / 0.25)", color: "hsl(193 100% 52%)" }}
            >
              <CheckCircle2 size={11} />
              Saved to history
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto scroll-smooth pb-44 sm:pb-36">
          {isInitialLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="relative w-8 h-8">
                  <span className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
                <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground/60">
                  Loading session...
                </p>
              </div>
            </div>
          ) : isEmpty ? (
            /* ── Welcome screen: Gemini-inspired clean layout ── */
            <div className="relative min-h-full flex flex-col items-center justify-center pb-56 px-5 md:px-8 max-w-2xl mx-auto w-full">

              {/* Ambient background glow */}
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[380px] pointer-events-none select-none"
                style={{
                  background: "radial-gradient(ellipse 55% 60% at 50% 50%, hsl(193 100% 52% / 0.10) 0%, transparent 72%)",
                  filter: "blur(32px)",
                }}
              />

              {/* Twins logo — the Sirius Star Lab brand mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex items-center justify-center mb-4"
                style={{ width: 164, height: 164 }}
              >
                {/* Outer slow-spin ring */}
                <div className="ai-ring-outer absolute inset-0 rounded-full"
                  style={{ border: "1px dashed hsl(193 100% 52% / 0.32)" }} />
                {/* Inner ring */}
                <div className="absolute inset-4 rounded-full"
                  style={{ border: "1px solid hsl(193 100% 52% / 0.20)" }} />
                {/* Ambient glow behind the image */}
                <div className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, hsl(193 100% 52% / 0.18) 0%, transparent 68%)",
                    filter: "blur(14px)",
                  }} />
                {/* The twins logo */}
                <div
                  className="relative z-10 rounded-full overflow-hidden"
                  style={{
                    width: 136,
                    height: 136,
                    border: "2px solid hsl(193 100% 52% / 0.45)",
                    boxShadow: "0 0 36px hsl(193 100% 52% / 0.38), 0 0 80px hsl(193 100% 52% / 0.12)",
                  }}
                >
                  <img
                    src="/logo-v2.png"
                    alt="Sirius Star Lab"
                    className="w-full h-full object-cover"
                    style={{ filter: "brightness(1.12) contrast(1.06) saturate(1.18)" }}
                  />
                </div>
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
                className="relative z-10 text-center mb-8"
              >
                <p className="text-[11px] font-mono tracking-[0.25em] uppercase mb-3"
                  style={{ color: "hsl(193 100% 44% / 0.70)" }}>
                  I'm {aiName} · I think, so I am
                </p>
                <h1 className="text-[2.1rem] md:text-[2.8rem] font-bold tracking-tight leading-tight mb-3 text-foreground">
                  Welcome to Sirius — where you become a star
                </h1>
                <p className="text-base md:text-lg font-medium text-muted-foreground/70">
                  What would you like to do?
                </p>
              </motion.div>

              {/* Quick-action chips */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.28, duration: 0.4 }}
                className="relative z-10 flex flex-wrap gap-2.5 justify-center mb-5"
              >
                {/* Surprise me */}
                <button
                  onClick={surpriseMe}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 hover:brightness-105"
                  style={{
                    background: "hsl(193 100% 52% / 0.08)",
                    border: "1px solid hsl(193 100% 52% / 0.35)",
                    color: "hsl(193 100% 32%)",
                  }}
                >
                  <span>🎲</span>
                  <span>Surprise me</span>
                </button>

                {/* World subjects */}
                <button
                  onClick={() => toggleSection("topics")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: expandedSection === "topics" ? "hsl(193 100% 52% / 0.12)" : "hsl(210 30% 95%)",
                    border: expandedSection === "topics" ? "1px solid hsl(193 100% 52% / 0.55)" : "1px solid hsl(210 25% 88%)",
                    color: expandedSection === "topics" ? "hsl(193 100% 32%)" : "hsl(220 18% 42%)",
                  }}
                >
                  <span>🌍</span>
                  <span>World subjects</span>
                </button>

                {/* How are you feeling */}
                <button
                  onClick={() => toggleSection("mood")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: expandedSection === "mood" ? "hsl(210 90% 60% / 0.10)" : "hsl(210 30% 95%)",
                    border: expandedSection === "mood" ? "1px solid hsl(210 90% 60% / 0.45)" : "1px solid hsl(210 25% 88%)",
                    color: expandedSection === "mood" ? "hsl(210 90% 38%)" : "hsl(220 18% 42%)",
                  }}
                >
                  <span>💙</span>
                  <span>How are you feeling?</span>
                </button>

                {/* Daily wisdom */}
                <button
                  onClick={() => toggleSection("wisdom")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: expandedSection === "wisdom" ? "hsl(45 90% 55% / 0.10)" : "hsl(210 30% 95%)",
                    border: expandedSection === "wisdom" ? "1px solid hsl(45 90% 55% / 0.45)" : "1px solid hsl(210 25% 88%)",
                    color: expandedSection === "wisdom" ? "hsl(38 90% 32%)" : "hsl(220 18% 42%)",
                  }}
                >
                  <span>✨</span>
                  <span>Daily wisdom</span>
                </button>
              </motion.div>

              {/* Expandable content sections */}
              <AnimatePresence mode="wait">
                {expandedSection === "topics" && (
                  <motion.div
                    key="topics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="relative z-10 w-full"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50">World subjects</span>
                      <button
                        onClick={() => setExpandedSection(null)}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                        style={{ color: "hsl(220 18% 52%)", background: "hsl(210 30% 95%)", border: "1px solid hsl(210 25% 88%)" }}
                      >
                        <span>✕</span>
                        <span>Close</span>
                      </button>
                    </div>
                    <TopicHub onSelect={handleSend} />
                  </motion.div>
                )}

                {expandedSection === "mood" && (
                  <motion.div
                    key="mood"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="relative z-10 w-full"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50">How are you feeling?</span>
                      <button
                        onClick={() => setExpandedSection(null)}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                        style={{ color: "hsl(220 18% 52%)", background: "hsl(210 30% 95%)", border: "1px solid hsl(210 25% 88%)" }}
                      >
                        <span>✕</span>
                        <span>Close</span>
                      </button>
                    </div>
                    <MoodCheckin onSelect={handleSend} />
                  </motion.div>
                )}

                {expandedSection === "wisdom" && (
                  <motion.div
                    key="wisdom"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="relative z-10 w-full"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50">Daily wisdom</span>
                      <button
                        onClick={() => setExpandedSection(null)}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                        style={{ color: "hsl(220 18% 52%)", background: "hsl(210 30% 95%)", border: "1px solid hsl(210 25% 88%)" }}
                      >
                        <span>✕</span>
                        <span>Close</span>
                      </button>
                    </div>
                    <DailyWisdom onReflect={handleSend} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col pb-4">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <ChatMessage key={message.id || index} message={message} />
                ))}
              </AnimatePresence>
              {/* Follow-up question chips */}
              {(() => {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg?.role === "assistant" && !lastMsg.isStreaming && lastMsg.followups?.length) {
                  return (
                    <div className="flex flex-wrap gap-2 px-4 pb-3 pt-1">
                      {lastMsg.followups.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(q)}
                          className="text-xs px-3 py-1.5 rounded-full text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background: "hsl(193 100% 52% / 0.06)",
                            border: "1px solid hsl(193 100% 52% / 0.22)",
                            color: "hsl(193 100% 30%)",
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div
          className="absolute bottom-0 left-0 right-0 z-30 pt-10 pb-5 px-4 md:px-8"
          style={{ background: "linear-gradient(to top, hsl(var(--background)) 60%, transparent)" }}
        >
          <ChatInput onSend={handleSend} isTyping={isTyping} onStop={stopStream} voiceMode={voiceMode} onToggleVoice={toggleVoiceMode} />
        </div>
      </div>
    </div>
  );
}
