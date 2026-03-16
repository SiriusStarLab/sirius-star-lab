import React, { useRef, useEffect, KeyboardEvent, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

interface ChatInputProps {
  onSend: (message: string) => void;
  isTyping: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isTyping, onStop }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (input.trim() && !isTyping) {
      onSend(input);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div
        className="relative flex items-end w-full rounded-xl overflow-hidden transition-all duration-300"
        style={{
          background: "hsl(224 24% 8% / 0.85)",
          backdropFilter: "blur(20px)",
          border: input
            ? "1px solid hsl(193 100% 52% / 0.45)"
            : "1px solid hsl(224 20% 16%)",
          boxShadow: input
            ? "0 0 0 1px hsl(193 100% 52% / 0.1), 0 0 24px hsl(193 100% 52% / 0.1)"
            : "none",
        }}
      >
        {/* Subtle top neon line */}
        <div className="absolute top-0 left-8 right-8 h-px transition-opacity duration-300"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(193 100% 52% / 0.4), transparent)",
            opacity: input ? 1 : 0
          }} />

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          style={{ opacity: phVisible || input ? 1 : 0.3, transition: "opacity 0.3s" }}
          className="min-h-[58px] max-h-[200px] w-full resize-none border-0 bg-transparent px-5 py-4 pr-16 focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] leading-relaxed placeholder:text-muted-foreground/30 placeholder:font-mono placeholder:text-sm placeholder:tracking-wide"
          rows={1}
        />

        <div className="absolute right-3 bottom-3">
          {isTyping ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={onStop}
              className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <button
              disabled={!input.trim()}
              onClick={handleSend}
              className="h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: input.trim()
                  ? "linear-gradient(135deg, hsl(193 100% 52% / 0.9), hsl(193 100% 45%))"
                  : "hsl(224 18% 13%)",
                boxShadow: input.trim() ? "0 0 16px hsl(193 100% 52% / 0.35)" : "none",
                border: "1px solid hsl(193 100% 52% / 0.3)"
              }}
            >
              <Send className="h-4 w-4 -ml-0.5"
                style={{ color: input.trim() ? "hsl(224 28% 5%)" : "hsl(220 14% 50%)" }} />
            </button>
          )}
        </div>
      </div>

      <div className="text-center mt-2.5">
        <p className="data-readout text-[10px] text-muted-foreground/25 tracking-[0.25em] uppercase">
          Secure · Private · Always on
        </p>
      </div>
    </div>
  );
}
