import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle } from "lucide-react";

const SURPRISE_PROMPTS = [
  "Tell me the most mind-blowing fact about the universe that most people have never heard. Make me feel the full scale of it.",
  "What is the strangest thing that quantum physics tells us about reality? Don't soften it — give me the actual weirdness.",
  "Tell me something from history that was buried, suppressed, or forgotten — something that changes how we understand the world.",
  "What is the biggest unsolved mystery in all of science right now? Not a guess — the actual frontier where nobody knows the answer.",
  "Explain the hard problem of consciousness to me like it actually matters — because it does. Why can't science explain why I feel anything at all?",
  "Give me the most extraordinary fact about the human body that most doctors don't even mention.",
  "What did Nikola Tesla discover that the world still hasn't fully understood?",
  "Tell me something about trees and forests that will completely change how I look at them.",
  "What is the most shocking thing that near-death experience research has actually documented?",
  "What was the most important civilisation in human history that almost no one knows about?",
  "Blow my mind with the mathematics of infinity. There's more than one size of infinity — explain that.",
  "Tell me the real story of how the universe will end. All the theories. Don't leave out the strange ones.",
  "What do we actually know about consciousness from neuroscience — and where does it completely break down?",
  "Give me a philosophical question so deep that even the greatest minds couldn't answer it. Then tell me what they tried.",
  "Tell me something about the ocean that most people have no idea about. The deep ocean is more alien than outer space.",
  "What is the most extraordinary healing that the human body is capable of — documented and real?",
  "Explain time to me. Not how we measure it — what physicists actually think it is. And whether it's real at all.",
  "What is the most incredible animal ability on Earth — something that makes our senses look primitive?",
  "Tell me something about sound and music that science has discovered that feels almost spiritual.",
  "What's the most remarkable thing that happened in the last 10 years of science that barely made the news?",
  "Give me the most extraordinary coincidence in all of recorded history and explain why it might not be a coincidence at all.",
  "What do psychedelic researchers actually think is happening in the brain during a mystical experience?",
  "Tell me a mathematical truth so strange it sounds like fiction — but is completely proven.",
  "What ancient wisdom have modern scientists confirmed is actually correct? Something that was dismissed and then vindicated.",
  "Tell me about a moment in history where one person's decision changed everything — and almost no one knows their name.",
  "What is the most remarkable thing about DNA that most people were never taught?",
  "Give me the most extraordinary story of human survival or endurance ever documented.",
  "What does physics say about parallel universes? Not science fiction — the actual serious academic theories.",
  "Tell me something about the power of the mind over the body that is documented and astonishing.",
  "What would a truly wise person — who had lived a thousand years — tell me about how to live well?",
];

interface SurpriseMeProps {
  onSelect: (prompt: string) => void;
}

export function SurpriseMe({ onSelect }: SurpriseMeProps) {
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const handleClick = () => {
    let idx: number;
    do { idx = Math.floor(Math.random() * SURPRISE_PROMPTS.length); }
    while (idx === lastIndex && SURPRISE_PROMPTS.length > 1);
    setLastIndex(idx);
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    onSelect(SURPRISE_PROMPTS[idx]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
      className="w-full"
    >
      <motion.button
        onClick={handleClick}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        animate={flash ? { scale: [1, 1.04, 1] } : {}}
        transition={{ duration: 0.25 }}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group"
        style={{
          background: "linear-gradient(135deg, hsl(193 100% 52% / 0.12) 0%, hsl(270 80% 65% / 0.08) 100%)",
          border: "1px solid hsl(193 100% 52% / 0.35)",
          boxShadow: "0 0 20px hsl(193 100% 52% / 0.08)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, hsl(193 100% 52% / 0.2) 0%, hsl(270 80% 65% / 0.14) 100%)";
          (e.currentTarget as HTMLElement).style.border = "1px solid hsl(193 100% 52% / 0.65)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 28px hsl(193 100% 52% / 0.2)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, hsl(193 100% 52% / 0.12) 0%, hsl(270 80% 65% / 0.08) 100%)";
          (e.currentTarget as HTMLElement).style.border = "1px solid hsl(193 100% 52% / 0.35)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px hsl(193 100% 52% / 0.08)";
        }}
      >
        <div className="flex items-center gap-3 text-left">
          <span className="text-2xl leading-none select-none">🎲</span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">Surprise me</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Something mind-blowing, verified, and totally unexpected</p>
          </div>
        </div>
        <Shuffle
          size={16}
          className="text-primary/60 group-hover:text-primary transition-colors shrink-0"
        />
      </motion.button>
    </motion.div>
  );
}
