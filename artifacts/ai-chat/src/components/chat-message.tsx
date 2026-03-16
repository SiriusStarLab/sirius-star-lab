import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Zap, User, Globe, ExternalLink, Download, Sparkles } from "lucide-react";
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
  const hasImage = !isUser && !!message.imageB64;
  const isGeneratingImage = !isUser && !!message.isGeneratingImage;

  const handleDownload = () => {
    if (!message.imageB64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${message.imageB64}`;
    link.download = "sirius-creation.png";
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex w-full px-4 py-5 md:px-8",
        isUser
          ? "justify-end"
          : "justify-start border-b border-primary/[0.06]"
      )}
      style={!isUser ? {
        background: "linear-gradient(90deg, hsl(193 100% 52% / 0.04) 0%, transparent 40%)",
        borderLeft: "2px solid hsl(193 100% 52% / 0.2)"
      } : undefined}
    >
      <div className={cn(
        "flex max-w-4xl w-full gap-3 md:gap-5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full ring-1 transition-all",
          isUser
            ? "bg-muted text-foreground ring-border/60"
            : "ring-primary/30"
          )}
          style={!isUser ? {
            background: "linear-gradient(135deg, hsl(193 100% 52% / 0.2), hsl(224 28% 12%))",
            boxShadow: "0 0 10px hsl(193 100% 52% / 0.15)"
          } : undefined}
        >
          {isUser
            ? <User size={14} />
            : <Zap size={13} className="text-primary" fill="currentColor" />}
        </div>

        {/* Content */}
        <div className={cn(
          "flex flex-col min-w-[10%]",
          isUser ? "items-end" : "items-start w-full"
        )}>
          {/* Role label */}
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground/40 uppercase mb-1.5">
            {isUser ? "You" : aiName}
          </span>

          <div className={cn(
            "text-sm md:text-[15px] leading-relaxed break-words",
            isUser
              ? "px-4 py-3 rounded-xl rounded-tr-sm text-foreground/90"
              : "text-foreground prose prose-invert max-w-full"
          )}
          style={isUser ? {
            background: "hsl(224 24% 11% / 0.8)",
            border: "1px solid hsl(224 20% 18%)",
            backdropFilter: "blur(8px)"
          } : undefined}>
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <>
                {/* Searching indicator */}
                <AnimatePresence>
                  {isSearching && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 text-sm text-muted-foreground mb-3"
                    >
                      <Globe size={13} className="text-primary animate-spin" style={{ animationDuration: "2s" }} />
                      <span className="text-primary font-mono text-xs tracking-wider uppercase">Scanning the web...</span>
                      <span className="flex gap-0.5 ml-1">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {message.isSearching && message.content && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-xs mb-3"
                    >
                      <Globe size={11} className="text-primary animate-spin" style={{ animationDuration: "2s" }} />
                      <span className="text-primary/60 font-mono tracking-wider">Scanning web...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Message text */}
                {message.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                ) : !isSearching ? (
                  <div className="flex items-center gap-1 h-6">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                ) : null}

                {/* Image generating */}
                <AnimatePresence>
                  {isGeneratingImage && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 mt-3 text-xs"
                    >
                      <Sparkles size={12} className="text-primary animate-pulse" />
                      <span className="text-primary/80 font-mono tracking-wider uppercase text-[10px]">Rendering image...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Generated image */}
                <AnimatePresence>
                  {hasImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="mt-4 rounded-xl overflow-hidden relative group max-w-lg"
                      style={{ border: "1px solid hsl(193 100% 52% / 0.25)", boxShadow: "0 0 24px hsl(193 100% 52% / 0.1)" }}
                    >
                      <img
                        src={`data:image/png;base64,${message.imageB64}`}
                        alt={message.imagePrompt || "Generated image"}
                        className="w-full h-auto block"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 transition-colors ml-auto uppercase"
                        >
                          <Download size={11} />
                          Save
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sources */}
                {hasSources && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 pt-3"
                    style={{ borderTop: "1px solid hsl(193 100% 52% / 0.12)" }}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary/50 mb-2 uppercase tracking-widest">
                      <Globe size={10} />
                      Sources
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {message.sources!.slice(0, 5).map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-primary/60 hover:text-primary transition-colors group"
                        >
                          <ExternalLink size={10} className="shrink-0 opacity-50 group-hover:opacity-100" />
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

const aiName = "Sirius";
