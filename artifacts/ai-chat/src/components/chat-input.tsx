import React, { useRef, useEffect, KeyboardEvent, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDERS = [
  "Talk to me — I'm here...",
  "What's alive in you right now?",
  "Begin anywhere. I'll follow.",
  "I'm listening. Take your time.",
  "What would you like to explore?",
  "What's on your mind?",
  "Whatever you need — I'm here.",
  "Ask me anything. Nothing is off limits.",
  "What are you carrying today?",
];

interface ChatInputProps {
  onSend: (message: string) => void;
  isTyping: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isTyping, onStop }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIndex(i => (i + 1) % PLACEHOLDERS.length);
        setPlaceholderVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => { adjustHeight(); }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      <div className="relative flex items-end w-full rounded-2xl bg-card border border-border/50 shadow-2xl shadow-black/40 overflow-hidden focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/30 transition-all duration-300">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          style={{ opacity: placeholderVisible || input ? 1 : 0.3, transition: "opacity 0.3s" }}
          className="min-h-[58px] max-h-[200px] w-full resize-none border-0 bg-transparent px-5 py-4 pr-16 focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] leading-relaxed placeholder:text-muted-foreground/40 placeholder:transition-opacity"
          rows={1}
        />
        <div className="absolute right-3 bottom-3 flex items-center">
          {isTyping ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={onStop}
              className="h-10 w-10 rounded-full bg-accent hover:bg-accent/80 transition-all text-muted-foreground hover:text-foreground"
              title="Stop"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              disabled={!input.trim()}
              onClick={handleSend}
              className="h-10 w-10 rounded-full transition-all duration-300 disabled:opacity-20 shadow-lg shadow-primary/20"
            >
              <Send className="h-4 w-4 -ml-0.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="text-center mt-2.5">
        <p className="text-[11px] text-muted-foreground/35 font-medium tracking-widest uppercase">
          You are not alone — I'm here for all of it
        </p>
      </div>
    </div>
  );
}
