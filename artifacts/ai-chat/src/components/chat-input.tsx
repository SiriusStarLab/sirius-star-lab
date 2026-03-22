import React, { useRef, useEffect, KeyboardEvent, useState, useCallback } from "react";
import { Send, Square, Mic, MicOff, Paperclip, X, Loader2, Zap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubscription } from "@/hooks/use-subscription";
import { getUserId } from "@/lib/user-id";
import { startCheckout } from "@/components/pricing-modal";

const PLACEHOLDERS = [
  "Initialise session — I'm ready...",
  "What's alive in you right now?",
  "Begin anywhere. I'll follow.",
  "I'm listening. Take your time.",
  "Ask me anything. No limits.",
  "What are you carrying today?",
  "What would you like to explore?",
  "Your thoughts, your pace — I'm here.",
];

const MODES = [
  { id: "guru",        label: "Guru",        emoji: "🧿", desc: "Deep expertise & thorough answers" },
  { id: "coach",       label: "Coach",       emoji: "🏋️", desc: "Action plans & accountability" },
  { id: "scientist",   label: "Scientist",   emoji: "🔬", desc: "Evidence-based & methodical" },
  { id: "philosopher", label: "Philosopher", emoji: "🦉", desc: "Reflective & exploratory" },
  { id: "creative",    label: "Creative",    emoji: "🎨", desc: "Imaginative & generative" },
  { id: "friend",      label: "Friend",      emoji: "🤝", desc: "Warm, honest conversation" },
  { id: "tutor",       label: "Tutor",       emoji: "🎓", desc: "Guides your thinking — asks questions, doesn't just give answers" },
];

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, mode?: string, documentBase64?: string, documentName?: string) => void;
  isTyping: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isTyping, onStop }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const [mode, setMode] = useState("guru");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [upgradingFromLimit, setUpgradingFromLimit] = useState(false);
  const { status } = useSubscription();
  const userId = getUserId();

  const handleLimitUpgrade = async () => {
    setUpgradingFromLimit(true);
    try {
      const url = await startCheckout(userId, "plus");
      window.location.href = url;
    } catch {
      setUpgradingFromLimit(false);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const adjustHeight = () => {
    const t = textareaRef.current;
    if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }
  };

  useEffect(() => { adjustHeight(); }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = () => {
    if ((!input.trim() && !imageBase64 && !documentBase64) || isTyping) return;
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const base64 = result.split(",")[1];
        setDocumentBase64(base64);
        setDocumentName(file.name);
        setImageBase64(null);
        setImagePreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const base64 = result.split(",")[1];
        setImageBase64(base64);
        setImagePreview(result);
        setDocumentBase64(null);
        setDocumentName(null);
      };
      reader.readAsDataURL(file);
    }
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
            if (text) setInput(prev => prev ? prev + " " + text : text);
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

  const canSend = !!(input.trim() || imageBase64 || documentBase64) && !isTyping;

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
            disabled={upgradingFromLimit}
            style={{
              padding: "14px 32px",
              borderRadius: 12, border: "none",
              background: upgradingFromLimit ? "rgba(0,212,255,0.2)" : "#00d4ff",
              color: upgradingFromLimit ? "#00d4ff" : "#080c1a",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all 0.2s",
            }}
          >
            {upgradingFromLimit
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Getting checkout ready…</>
              : <><Zap size={15} fill="currentColor" /> Get Plus for £5/month</>}
          </button>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12 }}>
            Secured by Stripe · Cancel any time
          </p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto">

      {/* Mode selector */}
      <div className="flex items-center gap-1.5 mb-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setTimeout(() => textareaRef.current?.focus(), 0); }}
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
      {/* Active mode description */}
      <div className="mb-2.5 h-4 flex items-center">
        {MODES.find(m => m.id === mode) && (
          <p className="text-[10px] font-mono tracking-[0.18em] transition-all duration-200"
            style={{ color: mode !== "guru" ? "hsl(193 100% 40% / 0.75)" : "hsl(220 14% 60% / 0.5)" }}>
            ↳ {MODES.find(m => m.id === mode)?.desc}
          </p>
        )}
      </div>

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
          <span className="text-xs text-muted-foreground/50">Document ready · Sirius will read and analyse it</span>
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

        {/* Image upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 self-end mb-3 ml-3 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200"
          style={{
            background: (imageBase64 || documentBase64) ? "hsl(193 100% 52% / 0.15)" : "transparent",
            color: (imageBase64 || documentBase64) ? "hsl(193 100% 52%)" : "hsl(220 14% 38%)",
          }}
          title="Attach image or PDF document"
        >
          <Paperclip size={16} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={handleFileSelect} />

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
    </div>
  );
}
