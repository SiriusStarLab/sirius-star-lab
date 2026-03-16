import React, { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
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
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center mb-8 shadow-xl shadow-primary/5 ring-1 ring-border"
              >
                <Zap className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.h1 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-3xl font-bold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60"
              >
                Hi, I'm {aiName} — so glad you're here 👋
              </motion.h1>
              <motion.p 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-muted-foreground max-w-lg mb-12"
              >
                I'm here for everyone. Talk to me however feels natural — short words, long thoughts, any language. I'll search the whole internet and meet you exactly where you are.
              </motion.p>
              
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full"
              >
                {[
                  "What's in the news right now?",
                  "Explain something to me simply",
                  "I'm struggling and need to talk",
                  "Teach me something wonderful today"
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(suggestion)}
                    className="p-4 text-sm text-left rounded-xl bg-card border border-border/50 hover:bg-accent hover:border-border transition-all duration-200 text-foreground/80 hover:text-foreground shadow-sm group"
                  >
                    {suggestion}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity float-right text-primary">→</span>
                  </button>
                ))}
              </motion.div>
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
