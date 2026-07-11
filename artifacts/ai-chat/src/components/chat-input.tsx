import React, { useRef, useEffect, KeyboardEvent, useState, useCallback } from "react";
import { Send, Square, Mic, MicOff, X, Loader2, Zap, FileText, ImageIcon, HelpCircle, Volume2, VolumeX, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubscription } from "@/hooks/use-subscription";
import { getUserId } from "@/lib/user-id";
import { startCheckout } from "@/components/pricing-modal";

const PLACEHOLDERS = [
  "Ask me anything...",
  "What's alive in you right now?",
  "Begin anywhere. I'll follow.",
  "I'm listening. Take your time.",
  "Ask me anything. No limits.",
  "What are you carrying today?",
  "What would you like to explore?",
  "Your thoughts, your pace — I'm here.",
];

const MODES = [
  {
    id: "guru",
    label: "Guru",
    emoji: "🧿",
    desc: "Deep expertise & thorough answers",
    detail: "The default. Sirius gives you its full depth — comprehensive, well-structured, and thorough. Best when you want a complete picture of something.",
    when: "Researching a topic, getting a full explanation, understanding something complex",
  },
  {
    id: "coach",
    label: "Coach",
    emoji: "🏋️",
    desc: "Action plans & accountability",
    detail: "Direct, energising, and action-focused. Sirius cuts through vagueness, asks what you actually want, and ends every reply with a clear next step.",
    when: "Feeling stuck, building habits, wanting to move forward on a goal",
  },
  {
    id: "scientist",
    label: "Scientist",
    emoji: "🔬",
    desc: "Evidence-based & methodical",
    detail: "Everything must be evidenced. Sirius cites studies, separates strong consensus from weak findings, and is honest when the evidence is thin.",
    when: "Health questions, understanding research, fact-checking, anything where accuracy matters",
  },
  {
    id: "philosopher",
    label: "Philosopher",
    emoji: "🦉",
    desc: "Reflective & exploratory",
    detail: "Explores from first principles. Challenges your assumptions, draws on philosophy from across cultures, and sits comfortably with questions that don't have neat answers.",
    when: "Big life questions, ethical dilemmas, understanding your own thinking, exploring meaning",
  },
  {
    id: "creative",
    label: "Creative",
    emoji: "🎨",
    desc: "Imaginative & generative",
    detail: "Thinks laterally. Sirius deliberately avoids the obvious and comes at things from unexpected angles — using metaphor, imagination, and surprise.",
    when: "Writing, brainstorming, creative projects, when you want the non-obvious take",
  },
  {
    id: "friend",
    label: "Friend",
    emoji: "🤝",
    desc: "Warm, honest conversation",
    detail: "All formality dropped. Sirius talks like a present, warm friend — sharing its own view, being real, not lecturing. Just genuine conversation.",
    when: "When you need to talk something through, want a honest opinion, or just want company",
  },
  {
    id: "tutor",
    label: "Tutor",
    emoji: "🎓",
    desc: "Guides your thinking — asks questions, doesn't just give answers",
    detail: "Sirius won't hand you the answer. It asks what you already know, reveals things layer by layer, and checks your understanding. Based on the Socratic method.",
    when: "Learning something new, studying, preparing for an exam, wanting to actually understand — not just be told",
  },
  {
    id: "research",
    label: "Research",
    emoji: "🌐",
    desc: "Deep web research with cited sources",
    detail: "Sirius runs live web searches, cross-references sources, and synthesises a comprehensive research brief with citations. Also searches PubMed and arXiv for academic papers. Takes a little longer — worth it for important questions.",
    when: "Market research, academic topics, current events, fact-checking, competitive analysis, scientific literature, anything that needs the latest information",
  },
  {
    id: "think",
    label: "Think",
    emoji: "🧠",
    desc: "Extended reasoning — works through problems step by step",
    detail: "Sirius uses an extended thinking model that reasons through your question carefully before answering. You can see the full reasoning chain. Best for complex problems that need depth over speed.",
    when: "Complex reasoning, maths, logic, strategy, ethical dilemmas, anything that benefits from careful step-by-step thought",
  },
];

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, mode?: string, documentBase64?: string, documentName?: string) => void;
  isTyping: boolean;
  onStop: () => void;
  voiceMode?: boolean;
  onToggleVoice?: () => void;
}

export function ChatInput({ onSend, isTyping, onStop, voiceMode = false, onToggleVoice }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const [mode, setMode] = useState("guru");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [youtubeDetected, setYoutubeDetected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [upgradingFromLimit, setUpgradingFromLimit] = useState(false);
  const [showModeGuide, setShowModeGuide] = useState(false);
  const [modeBarCanScrollRight, setModeBarCanScrollRight] = useState(false);
  const [hoveredModeId, setHoveredModeId] = useState<string | null>(null);
  const [tooltipRect, setTooltipRect] = useState<{ left: number; bottom: number } | null>(null);
  const modeBarRef = useRef<HTMLDivElement>(null);
  const { status } = useSubscription();
  const userId = getUserId();

  const handleLimitUpgrade = () => {
    setUpgradingFromLimit(false);
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPlaceholderIndex(i => (i + 1) % PLACEHOLDERS.length);
        setPhVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Mode bar scroll indicator — show fade when more modes are hidden to the right
  useEffect(() => {
    const el = modeBarRef.current;
    if (!el) return;
    const check = () => setModeBarCanScrollRight(el.scrollWidth > el.clientWidth + el.scrollLeft + 4);
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => { el.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, []);

  const adjustHeight = () => {
    const t = textareaRef.current;
    if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }
  };

  useEffect(() => { adjustHeight(); }, [input]);

  useEffect(() => {
    const ytRegex = /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/)/i;
    setYoutubeDetected(ytRegex.test(input));
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = () => {
    if (!input.trim() && !imageBase64 && !documentBase64) return;
    onSend(input, imageBase64 || undefined, mode !== "guru" ? mode : undefined, documentBase64 || undefined, documentName || undefined);
    setInput("");
    setImageBase64(null);
    setImagePreview(null);
    setDocumentBase64(null);
    setDocumentName(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImageBase64(result);
      setImagePreview(result);
      setDocumentBase64(null);
      setDocumentName(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setDocumentBase64(result.split(",")[1]);
      setDocumentName(file.name);
      setImageBase64(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeImage = () => {
    setImageBase64(null);
    setImagePreview(null);
  };

  const removeDocument = () => {
    setDocumentBase64(null);
    setDocumentName(null);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
          const audioBase64 = btoa(binary);
          const resp = await fetch("/api/openai/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64, mimeType }),
          });
          if (resp.ok) {
            const { text } = await resp.json();
            if (text?.trim()) {
              onSend(text.trim(), undefined, mode !== "guru" ? mode : undefined);
            }
          }
        } catch (err) {
          console.error("Transcription failed", err);
        } finally {
          setIsTranscribing(false);
          textareaRef.current?.focus();
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const canSend = !!(input.trim() || imageBase64 || documentBase64);

  // Show upgrade wall when daily limit is hit
  if (status.dailyLimit !== null && !status.canSendMessage) {
    return (
      <div className="relative w-full max-w-3xl mx-auto">
        <div
          style={{
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.03))",
            border: "1.5px solid rgba(0,212,255,0.25)",
            padding: "24px 24px 20px",
            textAlign: "center",
            boxShadow: "0 0 40px rgba(0,212,255,0.06)",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            You've used all {status.dailyLimit} messages today
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.5 }}>
            Your free messages reset at midnight. Upgrade to Plus for 200 a day — or go Pro for unlimited.
          </p>
          <button
            onClick={handleLimitUpgrade}
            style={{
              padding: "14px 32px",
              borderRadius: 12, border: "none",
              background: "#00d4ff",
              color: "#080c1a",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all 0.2s",
            }}
          >
            <Zap size={15} fill="currentColor" /> Get Plus for £6.99/month
          </button>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12 }}>
            Pay by bank transfer · Cancel any time
          </p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto">

      {/* Mode selector */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="relative flex-1 min-w-0">
        <div ref={modeBarRef} className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setShowModeGuide(false); setTimeout(() => textareaRef.current?.focus(), 0); }}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setHoveredModeId(m.id);
                  setTooltipRect({ left: rect.left + rect.width / 2, bottom: window.innerHeight - rect.top + 8 });
                }}
                onMouseLeave={() => { setHoveredModeId(null); setTooltipRect(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 shrink-0"
                style={{
                  background: active ? "hsl(193 100% 52% / 0.12)" : "hsl(210 30% 95%)",
                  border: active ? "1px solid hsl(193 100% 52% / 0.5)" : "1px solid hsl(210 25% 87%)",
                  color: active ? "hsl(193 100% 35%)" : "hsl(220 20% 52%)",
                  boxShadow: active ? "0 0 12px hsl(193 100% 52% / 0.15)" : "none",
                }}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
        {/* Right-fade hint — shows when modes are hidden off-screen */}
        {modeBarCanScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, hsl(210 30% 97%))" }}
          />
        )}
        </div>
        <button
          onClick={() => setShowModeGuide(g => !g)}
          title="What do these modes mean?"
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200"
          style={{
            background: showModeGuide ? "hsl(193 100% 52% / 0.12)" : "transparent",
            border: showModeGuide ? "1px solid hsl(193 100% 52% / 0.4)" : "1px solid hsl(210 25% 87%)",
            color: showModeGuide ? "hsl(193 100% 35%)" : "hsl(220 20% 55%)",
          }}
        >
          <HelpCircle size={12} />
        </button>
      </div>

      {/* Mode guide panel */}
      {showModeGuide && (
        <div
          className="mb-3 rounded-xl overflow-hidden"
          style={{ border: "1px solid hsl(193 100% 52% / 0.2)", background: "hsl(210 40% 98%)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid hsl(210 25% 92%)", background: "hsl(193 100% 52% / 0.06)" }}>
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "hsl(193 100% 35%)" }}>
              How Sirius thinks with you
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "hsl(220 15% 55%)" }}>
              Pick a mode to shape how Sirius approaches your conversation. You can switch at any time.
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "hsl(210 25% 92%)" }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setShowModeGuide(false); setTimeout(() => textareaRef.current?.focus(), 0); }}
                className="w-full text-left px-4 py-3 transition-all duration-150 group"
                style={{ background: mode === m.id ? "hsl(193 100% 52% / 0.07)" : "transparent" }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-base mt-0.5 shrink-0">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-semibold" style={{ color: mode === m.id ? "hsl(193 100% 35%)" : "hsl(220 15% 25%)" }}>
                        {m.label}
                      </span>
                      {mode === m.id && (
                        <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full" style={{ background: "hsl(193 100% 52% / 0.15)", color: "hsl(193 100% 35%)" }}>
                          active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "hsl(220 15% 45%)" }}>{m.detail}</p>
                    <p className="text-[10px] mt-1 font-medium" style={{ color: "hsl(193 100% 40% / 0.7)" }}>
                      Best for: {m.when}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active mode description — desktop only */}
      {!showModeGuide && (
        <div className="hidden sm:flex mb-2.5 h-4 items-center">
          {MODES.find(m => m.id === mode) && (
            <p className="text-[10px] font-mono tracking-[0.18em] transition-all duration-200"
              style={{ color: mode !== "guru" ? "hsl(193 100% 40% / 0.75)" : "hsl(220 14% 60% / 0.5)" }}>
              ↳ {MODES.find(m => m.id === mode)?.desc}
            </p>
          )}
        </div>
      )}

      {/* YouTube URL detection badge */}
      {youtubeDetected && !imageBase64 && !documentBase64 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "hsl(0 72% 51% / 0.07)", border: "1px solid hsl(0 72% 51% / 0.2)" }}>
            <span className="text-sm">📺</span>
            <span className="text-xs font-medium" style={{ color: "hsl(0 72% 45%)" }}>YouTube video detected — Sirius will analyse it</span>
          </div>
        </div>
      )}

      {/* Image preview strip */}
      {imagePreview && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Upload preview"
              className="h-16 w-auto max-w-[120px] rounded-lg object-cover"
              style={{ border: "1px solid hsl(193 100% 52% / 0.3)" }}
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "hsl(210 30% 95%)", border: "1px solid hsl(193 100% 52% / 0.3)" }}
            >
              <X size={9} className="text-primary" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground/50">Image ready · Sirius will analyse it</span>
        </div>
      )}

      {/* Document preview strip */}
      {documentName && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "hsl(193 100% 52% / 0.07)", border: "1px solid hsl(193 100% 52% / 0.25)" }}>
            <FileText size={14} className="text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground/80 max-w-[180px] truncate">{documentName}</span>
            <button
              onClick={removeDocument}
              className="ml-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "hsl(210 30% 90%)" }}
            >
              <X size={8} className="text-primary" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground/50">Document ready · Sirius will read and analyse it — then ask your question below</span>
        </div>
      )}

      {/* Input box */}
      <div
        className="relative flex items-end w-full rounded-xl overflow-hidden transition-all duration-300"
        style={{
          background: "hsl(0 0% 100% / 0.95)",
          backdropFilter: "blur(20px)",
          border: (input || imageBase64)
            ? "1px solid hsl(193 100% 52% / 0.5)"
            : "1px solid hsl(210 25% 86%)",
          boxShadow: (input || imageBase64)
            ? "0 0 0 3px hsl(193 100% 52% / 0.08), 0 4px 24px hsl(193 100% 52% / 0.12)"
            : "0 2px 16px hsl(210 30% 88% / 0.7)",
        }}
      >
        {/* Neon top line */}
        <div className="absolute top-0 left-8 right-8 h-px transition-opacity duration-300"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(193 100% 52% / 0.4), transparent)",
            opacity: (input || imageBase64) ? 1 : 0
          }} />

        {/* Attachment tab buttons */}
        <div className="flex-shrink-0 self-end mb-2.5 ml-2.5 flex items-center gap-1.5">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
            style={{
              background: imageBase64 ? "hsl(193 100% 52% / 0.18)" : "hsl(210 25% 94%)",
              color: imageBase64 ? "hsl(193 100% 35%)" : "hsl(220 14% 45%)",
              border: imageBase64 ? "1px solid hsl(193 100% 52% / 0.4)" : "1px solid hsl(210 25% 87%)",
            }}
            title="Attach an image"
          >
            <ImageIcon size={12} />
            <span className="hidden sm:inline">Image</span>
          </button>
          <button
            onClick={() => docInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
            style={{
              background: documentBase64 ? "hsl(193 100% 52% / 0.18)" : "hsl(210 25% 94%)",
              color: documentBase64 ? "hsl(193 100% 35%)" : "hsl(220 14% 45%)",
              border: documentBase64 ? "1px solid hsl(193 100% 52% / 0.4)" : "1px solid hsl(210 25% 87%)",
            }}
            title="Attach a document, code file, or data file"
          >
            <FileText size={12} />
            <span className="hidden sm:inline">Document</span>
          </button>
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={docInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.csv,.md,.json,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.vue,.html,.css,.scss,.sql,.sh,.bash,.yml,.yaml,.toml,.xml,.env,.gitignore,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/csv,text/markdown,application/json" className="hidden" onChange={handleDocSelect} />

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          style={{ opacity: phVisible || input ? 1 : 0.35, transition: "opacity 0.3s" }}
          className="min-h-[64px] max-h-[240px] flex-1 resize-none border-0 bg-transparent px-4 py-4 pr-2 focus-visible:ring-0 focus-visible:ring-offset-0 text-[16px] leading-relaxed placeholder:text-muted-foreground/35 placeholder:text-[15px]"
          rows={1}
        />

        <div className="flex items-center gap-1.5 pr-2 pb-2.5 self-end shrink-0">
          {/* Speaker / TTS toggle */}
          {onToggleVoice && (
            <button
              onClick={onToggleVoice}
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                background: voiceMode ? "hsl(193 100% 52% / 0.12)" : "hsl(210 30% 95%)",
                border: voiceMode ? "1px solid hsl(193 100% 52% / 0.4)" : "1px solid hsl(210 25% 87%)",
              }}
              title={voiceMode ? "Sirius is speaking — click to mute" : "Click to hear Sirius speak"}
            >
              {voiceMode ? (
                <Volume2 size={13} style={{ color: "hsl(193 100% 52%)" }} />
              ) : (
                <VolumeX size={13} style={{ color: "hsl(220 14% 46%)" }} />
              )}
            </button>
          )}

          {/* Keyboard / type button — desktop only (redundant on mobile) */}
          <button
            onClick={() => { setTimeout(() => textareaRef.current?.focus(), 0); }}
            className="hidden sm:flex h-8 w-8 rounded-lg items-center justify-center transition-all duration-200"
            style={{
              background: "hsl(210 30% 95%)",
              border: "1px solid hsl(210 25% 87%)",
            }}
            title="Type your message"
          >
            <Keyboard size={13} style={{ color: "hsl(220 14% 46%)" }} />
          </button>

          {/* Mic button */}
          <button
            onClick={toggleRecording}
            disabled={isTranscribing}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              background: isRecording ? "hsl(0 85% 55% / 0.12)" : "hsl(210 30% 95%)",
              border: isRecording ? "1px solid hsl(0 85% 55% / 0.4)" : "1px solid hsl(210 25% 87%)",
            }}
            title={isRecording ? "Stop recording" : "Voice input"}
          >
            {isTranscribing ? (
              <Loader2 size={13} className="text-primary animate-spin" />
            ) : isRecording ? (
              <MicOff size={13} style={{ color: "hsl(0 85% 68%)" }} />
            ) : (
              <Mic size={13} style={{ color: "hsl(220 14% 46%)" }} />
            )}
          </button>

          {/* Send / Stop */}
          {isTyping ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={onStop}
              className="h-9 w-9 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <button
              disabled={!canSend}
              onClick={handleSend}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: canSend
                  ? "linear-gradient(135deg, hsl(193 100% 52% / 0.9), hsl(193 100% 45%))"
                  : "hsl(210 30% 92%)",
                boxShadow: canSend ? "0 0 20px hsl(193 100% 52% / 0.4)" : "none",
                border: "1px solid hsl(193 100% 52% / 0.3)"
              }}
            >
              <Send className="h-3.5 w-3.5 -ml-0.5"
                style={{ color: canSend ? "hsl(224 28% 5%)" : "hsl(220 14% 50%)" }} />
            </button>
          )}
        </div>
      </div>

      <div className="text-center mt-2.5">
        <p className="data-readout text-[10px] text-muted-foreground/25 tracking-[0.25em] uppercase">
          {isRecording ? "🔴 Recording — click mic to stop" : isTranscribing ? "Transcribing your voice..." : "Secure · Private · Always on"}
        </p>
      </div>

      {/* Mode hover tooltip — fixed so it floats above the tab bar */}
      {hoveredModeId && tooltipRect && (() => {
        const m = MODES.find(x => x.id === hoveredModeId);
        if (!m) return null;
        const CARD_W = 260;
        const safeLeft = Math.min(Math.max(tooltipRect.left - CARD_W / 2, 12), window.innerWidth - CARD_W - 12);
        return (
          <div
            style={{
              position: "fixed",
              bottom: tooltipRect.bottom,
              left: safeLeft,
              width: CARD_W,
              zIndex: 9999,
              background: "hsl(224 28% 8%)",
              border: "1px solid hsl(193 100% 52% / 0.25)",
              borderRadius: 14,
              padding: "12px 14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 24px hsl(193 100% 52% / 0.08)",
              pointerEvents: "none",
            }}
          >
            {/* arrow */}
            <div style={{
              position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
              width: 10, height: 6,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid hsl(193 100% 52% / 0.25)",
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{m.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(193 100% 70%)", letterSpacing: "0.04em" }}>{m.label}</span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(200,220,240,0.85)", lineHeight: 1.5, margin: "0 0 6px" }}>
              {m.detail}
            </p>
            <p style={{ fontSize: 10, color: "hsl(193 100% 52% / 0.55)", lineHeight: 1.4, margin: 0 }}>
              Best for: {m.when}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
