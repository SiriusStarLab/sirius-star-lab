import React, { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { DailyWisdom } from "@/components/daily-wisdom";
import { TopicHub } from "@/components/topic-hub";
import { MoodCheckin } from "@/components/mood-checkin";
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
  const aiName = profile.aiName || "Nexus";

  const { 
    data: dbConversation, 
    isLoading: isDbLoading, 
    isError 
  } = useGetOpenaiConversation(conversationId as number, { 
    query: { enabled: !!conversationId } 
  });

  const {
    messages,
    setInitialMessages,
    sendMessage,
    isTyping,
    stopStream
  } = useChat(conversationId);

  // Sync DB messages to local state when loaded
  useEffect(() => {
    if (dbConversation?.messages) {
      setInitialMessages(dbConversation.messages);
    }
  }, [dbConversation, setInitialMessages]);

  // Handle dead links
  useEffect(() => {
    if (isError) {
      setLocation("/");
    }
  }, [isError, setLocation]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const isEmpty = messages.length === 0;
  const isInitialLoading = !!conversationId && isDbLoading && isEmpty;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Sidebar - Handles its own mobile/desktop responsive states */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 w-full min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </Button>
          <span className="font-medium text-sm">
            {dbConversation?.title || "New Chat"}
          </span>
          <div className="w-10" /> {/* Balancer */}
        </header>

        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth pb-32">
          {isInitialLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm">Loading conversation...</p>
              </div>
            </div>
          ) : isEmpty ? (
            <div className="min-h-full flex flex-col items-center justify-start pt-10 pb-36 px-5 md:px-8 max-w-2xl mx-auto w-full">

              {/* Ambient glow orb */}
              <div className="relative mb-8 flex items-center justify-center">
                <div className="nexus-glow" />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="nexus-avatar relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/25 shadow-2xl shadow-primary/20"
                >
                  <Sparkles className="w-7 h-7 text-primary" />
                </motion.div>
              </div>

              <motion.h1
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
                className="text-[1.65rem] font-bold tracking-tight mb-3 text-center"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--foreground) / 0.7) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                I'm {aiName} — here for the whole of you
              </motion.h1>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="text-sm text-muted-foreground/70 text-center mb-8 max-w-xs leading-relaxed font-light"
              >
                No part of you needs to be hidden here.<br />Bring everything.
              </motion.p>

              <div className="w-full space-y-5">
                <MoodCheckin onSelect={sendMessage} />
                <DailyWisdom onReflect={sendMessage} />
                <SpotifyWidget onAskAbout={sendMessage} />
                <TopicHub onSelect={sendMessage} />
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

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pb-4 px-4 md:px-8">
          <ChatInput 
            onSend={sendMessage} 
            isTyping={isTyping} 
            onStop={stopStream}
          />
        </div>
      </div>
    </div>
  );
}
