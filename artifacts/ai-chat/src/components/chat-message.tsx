import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ChatMessage as ChatMessageType } from "@/hooks/use-chat";
import { motion } from "framer-motion";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

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
              message.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                <div className="flex items-center gap-1 h-6">
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse delay-300" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
