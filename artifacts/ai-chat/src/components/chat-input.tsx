import React, { useRef, useEffect, KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  isTyping: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isTyping, onStop }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

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
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative flex items-end w-full rounded-2xl bg-card border border-border/60 shadow-xl shadow-black/20 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-border transition-all duration-300">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          className="min-h-[56px] max-h-[200px] w-full resize-none border-0 bg-transparent px-5 py-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
          rows={1}
        />
        
        <div className="absolute right-3 bottom-3 flex items-center">
          {isTyping ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={onStop}
              className="h-10 w-10 rounded-full bg-accent hover:bg-accent/80 transition-all text-muted-foreground hover:text-foreground"
              title="Stop generating"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              disabled={!input.trim()}
              onClick={handleSend}
              className="h-10 w-10 rounded-full transition-all duration-300 disabled:opacity-30"
            >
              <Send className="h-4 w-4 -ml-0.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="text-center mt-3">
        <p className="text-[11px] text-muted-foreground/50 font-medium tracking-wide">
          Ask anything — no topic is too big, too small, or too sensitive
        </p>
      </div>
    </div>
  );
}
