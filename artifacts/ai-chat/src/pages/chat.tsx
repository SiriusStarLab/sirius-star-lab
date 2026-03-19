import React, { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { DailyWisdom } from "@/components/daily-wisdom";
import { TopicHub } from "@/components/topic-hub";
import { MoodCheckin } from "@/components/mood-checkin";
import { SurpriseMe } from "@/components/surprise-me";
import { SpotifyWidget } from "@/components/spotify-widget";
import { useChat } from "@/hooks/use-chat";
import { useProfile } from "@/hooks/use-profile";
import { useGetOpenaiConversation } from "@workspace/api-client-react";

export function ChatPage() {
  const [match, params] = useRoute("/c/:id");
  const [, setLocation] = useLocation();
  const conversationId = match && params?.id ? parseInt(params.id) : undefined;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const aiName = profile.aiName || "Sirius";

  const {
    data: dbConversation,
    isLoading: isDbLoading,
    isError,
  } = useGetOpenaiConversation(conversationId as number, {
    query: { enabled: !!conversationId },
  });

  const { messages, setInitialMessages, sendMessage, isTyping, stopStream } =
    useChat(conversationId);

  useEffect(() => {
    if (dbConversation?.messages) setInitialMessages(dbConversation.messages);
  }, [dbConversation, setInitialMessages]);

  useEffect(() => {
    if (isError) setLocation("/");
  }, [isError, setLocation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const isEmpty = messages.length === 0;
  const isInitialLoading = !!conversationId && isDbLoading && isEmpty;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Subtle scan-line overlay */}
      <div className="scan-line" />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-full relative z-10 w-full min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </Button>
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {dbConversation?.title || "New Session"}
          </span>
          <div className="w-10" />
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto scroll-smooth pb-32">
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
            <div className="relative min-h-full flex flex-col items-center justify-start pt-10 pb-36 px-5 md:px-8 max-w-2xl mx-auto w-full">

              {/* Tech grid on welcome screen */}
              <div className="absolute inset-0 tech-grid-bg opacity-40 pointer-events-none" />

              {/* Starlight radiance — CSS-based, works on bright bg */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[480px] pointer-events-none select-none"
                style={{
                  background: "radial-gradient(ellipse 55% 70% at 50% 20%, hsl(193 100% 52% / 0.18) 0%, hsl(210 100% 80% / 0.1) 45%, transparent 75%)",
                  filter: "blur(24px)",
                }} />
              {/* Secondary warm corona */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] pointer-events-none select-none"
                style={{
                  background: "radial-gradient(ellipse 60% 60% at 50% 15%, hsl(193 100% 80% / 0.25) 0%, transparent 65%)",
                  filter: "blur(12px)",
                }} />

              {/* AI Orb Avatar */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-28 h-28 flex items-center justify-center mb-6"
              >
                {/* Outer ring */}
                <div className="ai-ring-outer absolute inset-0 rounded-full"
                  style={{ border: "1px dashed hsl(193 100% 52% / 0.28)" }} />
                {/* Mid ring */}
                <div className="ai-ring-inner absolute inset-3 rounded-full"
                  style={{ border: "1px solid hsl(193 100% 52% / 0.18)" }} />
                {/* Inner pulse */}
                <div className="ai-core-pulse absolute inset-7 rounded-full"
                  style={{ background: "hsl(193 100% 52% / 0.15)", filter: "blur(6px)" }} />
                {/* Core */}
                <div className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center neon-glow"
                  style={{
                    background: "linear-gradient(135deg, hsl(193 100% 52%), hsl(193 100% 35%))",
                    border: "1px solid hsl(193 100% 52% / 0.6)",
                    boxShadow: "0 0 20px hsl(193 100% 52% / 0.5)"
                  }}>
                  <Zap className="w-5 h-5 text-white" fill="currentColor" />
                </div>
                {/* Ambient corona */}
                <div className="absolute inset-0 rounded-full"
                  style={{ background: "radial-gradient(circle, hsl(193 100% 52% / 0.15) 0%, transparent 70%)" }} />
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                className="relative z-10 text-[1.7rem] font-bold tracking-tight mb-3 text-center shimmer-text"
              >
                I'm {aiName} — I am the universe and the universe is me
              </motion.h1>

              {/* Slogan */}
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="relative z-10 text-sm font-mono tracking-[0.12em] text-center mb-1"
                style={{ color: "hsl(193 100% 52% / 0.7)" }}
              >
                I think, so I am
              </motion.p>
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.38, duration: 0.4 }}
                className="relative z-10 text-[10px] font-mono tracking-[0.22em] text-muted-foreground/35 uppercase text-center mb-8"
              >
                Sirius AI · Always here for you
              </motion.p>

              <div className="relative z-10 w-full space-y-4">
                <SurpriseMe onSelect={sendMessage} />
                <MoodCheckin onSelect={sendMessage} />
                <DailyWisdom onReflect={sendMessage} />
                <SpotifyWidget onAskAbout={sendMessage} />
                <TopicHub onSelect={sendMessage} />

                {/* Sirius star — the brightest star in the night sky */}
                <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 260 }}>
                  <img
                    src="/sirius-star.png"
                    alt="Sirius — the brightest star"
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.88, filter: "brightness(0.82) contrast(1.1)" }}
                  />
                  {/* Top fade so it blends into the content above */}
                  <div className="absolute inset-x-0 top-0 h-16 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, hsl(210 55% 97%), transparent)" }} />
                  {/* Bottom fade */}
                  <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                    style={{ background: "linear-gradient(to top, hsl(210 55% 97%), transparent)" }} />
                  {/* Centred label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pointer-events-none">
                    <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/50">Sirius · α Canis Majoris · −1.46 mag</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col pb-4">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <ChatMessage key={message.id || index} message={message} />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="absolute bottom-0 left-0 right-0 pt-10 pb-5 px-4 md:px-8"
          style={{ background: "linear-gradient(to top, hsl(var(--background)) 60%, transparent)" }}>
          <ChatInput onSend={sendMessage} isTyping={isTyping} onStop={stopStream} />
        </div>
      </div>
    </div>
  );
}
