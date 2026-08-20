import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Zap, User, Globe, ExternalLink, Download, Sparkles, FileText } from "lucide-react";
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
  const generatedAssets = !isUser ? message.generatedAssets || [] : [];
  const isGeneratingImage = !isUser && !!message.isGeneratingImage;
  const wasSearched = !isUser && !!message.wasSearched;

  const handleDownload = () => {
    if (!message.imageB64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${message.imageB64}`;
    link.download = "sirius-creation.png";
    link.click();
  };

  const downloadAsset = (asset: NonNullable<ChatMessageType["generatedAssets"]>[number]) => {
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.name;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
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
          : "justify-start border-b border-border/60"
      )}
      style={!isUser ? {
        background: "linear-gradient(90deg, hsl(193 100% 52% / 0.05) 0%, transparent 50%)",
        borderLeft: "2px solid hsl(193 100% 52% / 0.35)"
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
            background: "linear-gradient(135deg, hsl(193 100% 52%), hsl(193 100% 35%))",
            boxShadow: "0 0 14px hsl(193 100% 52% / 0.4)"
          } : undefined}
        >
          {isUser
            ? <User size={14} />
            : <Zap size={13} className="text-white" fill="currentColor" />}
        </div>

        {/* Content */}
        <div className={cn(
          "flex flex-col min-w-[10%]",
          isUser ? "items-end" : "items-start w-full"
        )}>
          {/* Role label */}
          <span className="text-[11px] font-mono tracking-widest text-muted-foreground/70 uppercase mb-2">
            {isUser ? "You" : aiName}
          </span>

          <div className={cn(
            "text-[15px] md:text-[16px] leading-[1.75] break-words font-[430]",
            isUser
              ? "px-4 py-3 rounded-xl rounded-tr-sm text-white"
              : "text-foreground prose prose-base max-w-full"
          )}
          style={isUser ? {
            background: "linear-gradient(135deg, hsl(193 100% 52%), hsl(193 100% 35%))",
            border: "none",
            boxShadow: "0 2px 16px hsl(193 100% 52% / 0.3)"
          } : undefined}>
            {isUser ? (
              <div>
                {message.uploadedImageBase64 && (
                  <img
                    src={`data:image/jpeg;base64,${message.uploadedImageBase64}`}
                    alt="Uploaded image"
                    className="max-w-[280px] rounded-lg mb-2 block"
                    style={{ border: "1px solid hsl(193 100% 52% / 0.2)" }}
                  />
                )}
                {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
              </div>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}>{message.content}</ReactMarkdown>
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

                {generatedAssets.map((asset, index) => (
                  <div
                    key={`${asset.url}-${index}`}
                    className="mt-3 flex items-center gap-3 rounded-xl p-3 max-w-lg"
                    style={{ background: "hsl(193 100% 52% / 0.07)", border: "1px solid hsl(193 100% 52% / 0.2)" }}
                  >
                    {asset.kind === "pdf"
                      ? <FileText size={20} className="text-primary shrink-0" />
                      : <Sparkles size={20} className="text-primary shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{asset.kind === "pdf" ? "Your PDF is ready" : "Your image is ready"}</p>
                      <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                    </div>
                    <button
                      onClick={() => downloadAsset(asset)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
                      aria-label={`Download ${asset.name}`}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                ))}

                {/* Searched-but-no-citations badge */}
                {wasSearched && !hasSources && !message.isStreaming && message.content && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 flex items-center gap-1.5"
                  >
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                      style={{ background: "hsl(193 100% 52% / 0.07)", border: "1px solid hsl(193 100% 52% / 0.18)" }}>
                      <Globe size={8} className="text-primary/70" />
                      <span className="text-[8px] font-mono text-primary/60 uppercase tracking-widest">Live intelligence · Searched in real time</span>
                    </div>
                  </motion.div>
                )}

                {/* Sources */}
                {hasSources && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mt-5 pt-4"
                    style={{ borderTop: "1px solid hsl(193 100% 52% / 0.14)" }}
                  >
                    {/* Verified badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: "hsl(193 100% 52% / 0.1)", border: "1px solid hsl(193 100% 52% / 0.25)" }}>
                        <Globe size={9} className="text-primary" />
                        <span className="text-[9px] font-mono font-semibold text-primary uppercase tracking-widest">Verified · Live web search</span>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground/40">{message.sources!.length} source{message.sources!.length !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Citation cards */}
                    <div className="flex flex-col gap-2">
                      {message.sources!.slice(0, 5).map((source, i) => {
                        let domain = source.url;
                        try { domain = new URL(source.url).hostname.replace(/^www\./, ""); } catch {}
                        const title = source.title || domain;
                        return (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150"
                            style={{
                              background: "hsl(193 100% 52% / 0.04)",
                              border: "1px solid hsl(193 100% 52% / 0.1)",
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = "hsl(193 100% 52% / 0.09)";
                              (e.currentTarget as HTMLElement).style.border = "1px solid hsl(193 100% 52% / 0.28)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = "hsl(193 100% 52% / 0.04)";
                              (e.currentTarget as HTMLElement).style.border = "1px solid hsl(193 100% 52% / 0.1)";
                            }}
                          >
                            <span className="flex items-center justify-center w-4 h-4 rounded-full shrink-0 mt-0.5 text-[8px] font-mono font-bold text-primary/60"
                              style={{ background: "hsl(193 100% 52% / 0.12)" }}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-foreground/80 leading-snug line-clamp-2 group-hover:text-primary transition-colors">{title}</p>
                              <p className="text-[9px] font-mono text-muted-foreground/45 mt-0.5 flex items-center gap-1">
                                <ExternalLink size={7} className="shrink-0" />
                                {domain}
                              </p>
                            </div>
                          </a>
                        );
                      })}
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
