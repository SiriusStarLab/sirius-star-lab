import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Zap, User, Globe, ExternalLink, Download, Sparkles, ChevronDown, ChevronRight, Brain, Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ChatMessage as ChatMessageType } from "@/hooks/use-chat";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessageProps {
  message: ChatMessageType;
}

type CodeRunState = { status: "idle" | "running" | "done" | "error"; output?: string; error?: string };

function CodeBlock({ language, code }: { language: string; code: string }) {
  const runnable = ["python", "javascript", "js", "py"].includes((language || "").toLowerCase());
  const [runState, setRunState] = useState<CodeRunState>({ status: "idle" });

  const runCode = useCallback(async () => {
    setRunState({ status: "running" });
    const lang = ["python", "py"].includes(language.toLowerCase()) ? "python" : "javascript";
    try {
      const res = await fetch("/api/openai/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang }),
      });
      const data = await res.json();
      if (data.success) {
        setRunState({ status: "done", output: data.stdout || "(no output)" });
      } else {
        setRunState({ status: "error", error: data.stderr || data.error || "Unknown error" });
      }
    } catch (err: any) {
      setRunState({ status: "error", error: err?.message || "Failed to connect" });
    }
  }, [code, language]);

  return (
    <div className="my-2 rounded-xl overflow-hidden" style={{ border: "1px solid hsl(193 100% 52% / 0.18)", background: "hsl(220 13% 9%)" }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: "1px solid hsl(193 100% 52% / 0.12)", background: "hsl(220 13% 7%)" }}>
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">{language || "code"}</span>
        {runnable && (
          <button
            onClick={runCode}
            disabled={runState.status === "running"}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all"
            style={{ background: runState.status === "running" ? "hsl(193 100% 52% / 0.1)" : "hsl(193 100% 52% / 0.15)", color: "hsl(193 100% 52%)", border: "1px solid hsl(193 100% 52% / 0.25)" }}
          >
            {runState.status === "running" ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
            {runState.status === "running" ? "Running…" : "▶ Run"}
          </button>
        )}
      </div>
      <pre className="p-3 text-[13px] font-mono text-foreground/85 overflow-x-auto leading-relaxed"><code>{code}</code></pre>
      {(runState.status === "done" || runState.status === "error") && (
        <div className="px-3 py-2.5" style={{ borderTop: "1px solid hsl(193 100% 52% / 0.12)", background: "hsl(220 13% 6%)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            {runState.status === "done"
              ? <><CheckCircle size={10} className="text-green-400" /><span className="text-[9px] font-mono text-green-400 uppercase tracking-widest">Output</span></>
              : <><XCircle size={10} className="text-red-400" /><span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">Error</span></>}
          </div>
          <pre className="text-[12px] font-mono whitespace-pre-wrap" style={{ color: runState.status === "done" ? "hsl(142 71% 70%)" : "hsl(0 72% 65%)" }}>
            {runState.status === "done" ? runState.output : runState.error}
          </pre>
        </div>
      )}
    </div>
  );
}

function preprocessContent(content: string): string {
  let result = content;
  // "URL: https://...image.png" → markdown image
  result = result.replace(
    /URL:\s*(https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?\S*)?)/gi,
    (_, url) => `\n\n![Generated image](${url})\n\n`
  );
  // Saved to: /opt/sirius/...renders/file.png → rendered image via API
  result = result.replace(
    /Saved to:\s*\/opt\/sirius\/artifacts\/api-server\/public\/renders\/([\w.\-]+)/gi,
    (_, filename) => `\n\n![Generated image](https://sirius-ai.live/api/lab/renders/${filename})\n\n`
  );
  // Any bare https URL ending in an image extension not already inside a markdown link/image
  result = result.replace(
    /(?<!\()(https?:\/\/[^\s)\]"']+\.(png|jpg|jpeg|gif|webp|bmp|svg)([?#][^\s)\]"']*)?)/gi,
    (url) => `\n\n![Generated image](${url})\n\n`
  );
  return result;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSearching = !isUser && message.isSearching && !message.content;
  const hasSources = !isUser && (message.sources?.length ?? 0) > 0;
  const hasImage = !isUser && !!message.imageB64;
  const isGeneratingImage = !isUser && !!message.isGeneratingImage;
  const wasSearched = !isUser && !!message.wasSearched;
  const hasActions = !isUser && (message.actions?.length ?? 0) > 0;
  const hasThinking = !isUser && !!message.thinkingContent;
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

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
                    src={message.uploadedImageBase64}
                    alt="Uploaded image"
                    className="max-w-[280px] rounded-lg mb-2 block"
                    style={{ border: "1px solid hsl(193 100% 52% / 0.2)" }}
                  />
                )}
                {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
              </div>
            ) : (
              <>
                {/* Thinking block — shown when extended reasoning is active */}
                <AnimatePresence>
                  {hasThinking && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3"
                    >
                      <button
                        onClick={() => setThinkingExpanded(v => !v)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl w-full text-left transition-all"
                        style={{ background: "hsl(270 70% 60% / 0.08)", border: "1px solid hsl(270 70% 60% / 0.2)" }}
                      >
                        <Brain size={11} style={{ color: "hsl(270 70% 65%)" }} className={message.isStreaming && !message.content ? "animate-pulse" : ""} />
                        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "hsl(270 70% 65%)" }}>
                          {message.isStreaming && !message.content ? "Thinking…" : "Reasoning trace"}
                        </span>
                        <span className="ml-auto">
                          {thinkingExpanded ? <ChevronDown size={9} style={{ color: "hsl(270 70% 60%)" }} /> : <ChevronRight size={9} style={{ color: "hsl(270 70% 60%)" }} />}
                        </span>
                      </button>
                      <AnimatePresence>
                        {thinkingExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="mt-1 px-3 py-2.5 rounded-xl text-[12px] font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto"
                              style={{ background: "hsl(270 70% 60% / 0.05)", border: "1px solid hsl(270 70% 60% / 0.12)", color: "hsl(270 50% 70%)" }}
                            >
                              {message.thinkingContent}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action log — live during streaming, collapses to pill after */}
                <AnimatePresence>
                  {hasActions && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-3"
                    >
                      {message.isStreaming ? (
                        /* Live expanding list while Sirius is working */
                        <div
                          className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
                          style={{ background: "hsl(193 100% 52% / 0.06)", border: "1px solid hsl(193 100% 52% / 0.15)" }}
                        >
                          {message.actions!.map((step, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-2"
                            >
                              <span className="text-base leading-none" style={{ minWidth: "1.1em" }}>
                                {step.icon || "⚡"}
                              </span>
                              <span
                                className="text-[11px] font-mono tracking-wide font-medium"
                                style={{ color: step.color || "hsl(193 100% 52%)" }}
                              >
                                {step.label}
                              </span>
                              {step.detail && (
                                <span className="text-[10px] font-mono text-muted-foreground/55 truncate max-w-[200px]">
                                  · {step.detail}
                                </span>
                              )}
                            </motion.div>
                          ))}
                          {/* Pulsing "working" dot */}
                          <div className="flex items-center gap-1.5 mt-0.5 pt-1.5" style={{ borderTop: "1px solid hsl(193 100% 52% / 0.1)" }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] font-mono text-primary/50 tracking-widest uppercase">Working…</span>
                          </div>
                        </div>
                      ) : (
                        /* Collapsed pill once response is complete */
                        <button
                          onClick={() => setActionsExpanded(v => !v)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all"
                          style={{
                            background: "hsl(193 100% 52% / 0.07)",
                            border: "1px solid hsl(193 100% 52% / 0.18)",
                          }}
                        >
                          {actionsExpanded
                            ? <ChevronDown size={9} className="text-primary/60" />
                            : <ChevronRight size={9} className="text-primary/60" />}
                          <span className="text-[9px] font-mono text-primary/60 uppercase tracking-widest">
                            {message.actions!.length} action{message.actions!.length !== 1 ? "s" : ""} taken
                          </span>
                        </button>
                      )}

                      {/* Expanded detail when pill is clicked */}
                      <AnimatePresence>
                        {!message.isStreaming && actionsExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mt-2"
                          >
                            <div
                              className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
                              style={{ background: "hsl(193 100% 52% / 0.06)", border: "1px solid hsl(193 100% 52% / 0.15)" }}
                            >
                              {message.actions!.map((step, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-base leading-none" style={{ minWidth: "1.1em" }}>
                                    {step.icon || "⚡"}
                                  </span>
                                  <span
                                    className="text-[11px] font-mono tracking-wide font-medium"
                                    style={{ color: step.color || "hsl(193 100% 52%)" }}
                                  >
                                    {step.label}
                                  </span>
                                  {step.detail && (
                                    <span className="text-[10px] font-mono text-muted-foreground/55 truncate max-w-[200px]">
                                      · {step.detail}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ src, alt }) => {
                        if (!src) return null;
                        return (
                          <span className="block my-2">
                            <img
                              src={src}
                              alt={alt || "Image"}
                              className="rounded-xl max-w-full"
                              style={{ maxHeight: "400px", objectFit: "contain" }}
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="flex items-center gap-2 mt-1.5">
                              <a href={src} download target="_blank" rel="noopener noreferrer"
                                className="text-xs underline opacity-60 hover:opacity-100">Download</a>
                              <a href={src} target="_blank" rel="noopener noreferrer"
                                className="text-xs underline opacity-60 hover:opacity-100">Open full size ↗</a>
                            </span>
                          </span>
                        );
                      },
                      code({ node, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isBlock = !props.inline;
                        if (isBlock) {
                          return <CodeBlock language={match?.[1] || ""} code={String(children).replace(/\n$/, "")} />;
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                    }}
                  >{preprocessContent(message.content)}</ReactMarkdown>
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
