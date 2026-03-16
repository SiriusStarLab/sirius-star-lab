import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Globe, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ChatMessage as ChatMessageType } from "@/hooks/use-chat";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSearching = !isUser && message.isSearching && !message.content;
  const hasSources = !isUser && (message.sources?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex w-full px-4 py-6 md:px-8",
        isUser ? "justify-end" : "justify-start bg-muted/20 border-y border-border/30"
      )}
    >
      <div className={cn(
        "flex max-w-4xl w-full gap-4 md:gap-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full shadow-sm ring-1",
          isUser 
            ? "bg-primary text-primary-foreground ring-primary/20" 
            : "bg-card text-foreground ring-border shadow-black/20"
        )}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Message Content */}
        <div className={cn(
          "flex flex-col min-w-[10%]",
          isUser ? "items-end" : "items-start w-full"
        )}>
          <div className={cn(
            "text-sm md:text-base leading-relaxed break-words",
            isUser 
              ? "bg-accent/40 text-foreground px-5 py-3 rounded-2xl rounded-tr-sm border border-border/40" 
              : "text-foreground prose prose-invert prose-p:leading-relaxed max-w-full"
          )}>
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <>
                {/* Web search indicator */}
                <AnimatePresence>
                  {isSearching && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
                    >
                      <Globe size={14} className="text-primary animate-spin" style={{ animationDuration: "2s" }} />
                      <span className="text-primary/80 font-medium">Searching the web...</span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Searching while content also arriving */}
                <AnimatePresence>
                  {message.isSearching && message.content && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3"
                    >
                      <Globe size={12} className="text-primary animate-spin" style={{ animationDuration: "2s" }} />
                      <span className="text-primary/70">Searching the web...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Message text */}
                {message.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : !isSearching ? (
                  <div className="flex items-center gap-1 h-6">
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : null}

                {/* Sources */}
                {hasSources && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 pt-4 border-t border-border/30"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                      <Globe size={11} />
                      Sources
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {message.sources!.slice(0, 5).map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-primary/70 hover:text-primary transition-colors group"
                        >
                          <ExternalLink size={11} className="shrink-0 opacity-60 group-hover:opacity-100" />
                          <span className="truncate">{source.title || source.url}</span>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
