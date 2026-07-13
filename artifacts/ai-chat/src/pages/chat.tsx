import React, { useEffect, useRef, useState } from "react";
import { speakText, stopSpeaking } from "@/pages/star-lab/voice-utils";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, CheckCircle2, Smartphone, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { IOSInstallGuide } from "@/components/pwa-install-prompt";
import { useChat } from "@/hooks/use-chat";
import { useProfile } from "@/hooks/use-profile";
import { useGetOpenaiConversation } from "@workspace/api-client-react";

function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}
function isMobileDevice() { return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent); }


export function ChatPage() {
  const [matchConv, convParams] = useRoute("/c/:id");
  const [matchHome] = useRoute("/");
  const [, setLocation] = useLocation();
  const conversationId = matchConv && convParams?.id ? parseInt(convParams.id) : undefined;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [upgradeParam, setUpgradeParam] = useState<"plus" | "pro" | null>(null);
  const [chatMode, setChatMode] = useState("guru");
  const [savedFlash, setSavedFlash] = useState(false);
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  const [installEventReady, setInstallEventReady] = useState(() => !!(window as any).__siriusPWAInstallEvent);
  useEffect(() => {
    if (installEventReady) return;
    const onReady = () => setInstallEventReady(true);
    window.addEventListener("sirius-pwa-installable", onReady);
    return () => window.removeEventListener("sirius-pwa-installable", onReady);
  }, [installEventReady]);
  // Show the button on mobile UAs (guide flow) OR any device (desktop/laptop
  // Chrome/Edge included) once the browser has actually fired the native install prompt
  const showInstallButton = !isIOS() && !isInStandaloneMode() && (isMobileDevice() || installEventReady);
  const [voiceMode, setVoiceMode] = useState(() => localStorage.getItem("sirius_voice_mode") === "true");
  const prevConvId = useRef<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const stopTTS = () => { stopSpeaking(); };

  const playTTS = async (text: string) => {
    stopSpeaking();
    const clean = text
      .replace(/\*\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    speakText(clean, undefined, 0.87);
  };

  const handleSend = (content: string, imageBase64?: string, mode?: string, documentBase64?: string, documentName?: string) => {
    sendMessage(content, imageBase64, mode ?? chatMode, documentBase64, documentName, voiceMode ? playTTS : undefined);
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
        chatMode={chatMode}
        onChatModeChange={m => { setChatMode(m); setIsSidebarOpen(false); }}
        onNewSession={() => {
          clearMessages();
          setLocation("/");
          setIsSidebarOpen(false);
        }}
      />

      <div className="flex-1 flex flex-col h-full relative z-10 w-full min-w-0">

        {/* Top bar — always visible, Gemini-style */}
        <header className="flex items-center justify-between px-2 py-2 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            title="Menu"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </Button>
          <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase truncate max-w-[200px]">
            {conversationId ? (dbConversation?.title || "Session") : aiName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { clearMessages(); setLocation("/"); }}
            title="New session"
            className="text-muted-foreground hover:text-foreground"
            style={{ opacity: messages.length > 0 ? 1 : 0.35 }}
          >
            <PlusCircle size={18} />
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
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth pb-44 sm:pb-36">
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
            <div className="relative min-h-full flex flex-col items-center pb-16 px-5 md:px-8 max-w-2xl mx-auto w-full justify-center">

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
                  Welcome to Sirius — a place where you become a star
                </h1>
                <p className="text-base md:text-lg font-medium text-muted-foreground/70">
                  What would you like to do?
                </p>
              </motion.div>

              {/* Chat input — embedded in empty state, sits between heading and tagline */}
              <motion.div
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
                className="relative z-10 w-full mb-6"
              >
                <ChatInput onSend={handleSend} isTyping={isTyping} onStop={stopStream} voiceMode={voiceMode} onToggleVoice={toggleVoiceMode} externalMode={chatMode} />
              </motion.div>

              {/* Add to Home Screen — only on mobile, only when not already installed */}
              {showInstallButton && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.35 }}
                  className="relative z-10 flex justify-center mt-1 mb-3"
                >
                  <button
                    onClick={async () => {
                      const evt = (window as any).__siriusPWAInstallEvent;
                      if (evt && !isIOS()) {
                        await evt.prompt();
                      } else {
                        setShowPWAGuide(true);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                    style={{
                      background: "hsl(193 100% 52% / 0.07)",
                      border: "1px solid hsl(193 100% 52% / 0.28)",
                      color: "hsl(193 100% 35%)",
                    }}
                  >
                    <Smartphone size={13} />
                    Add to Home Screen
                  </button>
                </motion.div>
              )}

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

        {/* Input bar — only shown when conversation has messages */}
        {!isEmpty && (
          <div
            className="absolute bottom-14 left-0 right-0 z-30 pt-10 pb-3 px-4 md:px-8"
            style={{ background: "linear-gradient(to top, hsl(var(--background)) 60%, transparent)" }}
          >
            <ChatInput onSend={handleSend} isTyping={isTyping} onStop={stopStream} voiceMode={voiceMode} onToggleVoice={toggleVoiceMode} externalMode={chatMode} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPWAGuide && <IOSInstallGuide onClose={() => setShowPWAGuide(false)} />}
      </AnimatePresence>
    </div>
  );
}
