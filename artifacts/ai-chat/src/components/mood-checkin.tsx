import React from "react";
import { motion } from "framer-motion";

type Mood = {
  emoji: string;
  label: string;
  prompt: string;
  color: string;
};

const MOODS: Mood[] = [
  {
    emoji: "😊",
    label: "Good",
    prompt: "I'm feeling good today! I'd love to share that with you and maybe explore something interesting together.",
    color: "hover:bg-yellow-500/15 hover:border-yellow-500/40",
  },
  {
    emoji: "💙",
    label: "Need support",
    prompt: "I could really use some support right now. I'm not sure exactly what I need, but I just wanted to reach out and talk.",
    color: "hover:bg-blue-500/15 hover:border-blue-500/40",
  },
  {
    emoji: "😔",
    label: "Struggling",
    prompt: "I'm struggling a bit today. Can you just be here with me for a moment? I'd like to talk.",
    color: "hover:bg-indigo-500/15 hover:border-indigo-500/40",
  },
  {
    emoji: "😰",
    label: "Anxious",
    prompt: "I'm feeling quite anxious right now and could use some help calming down. Can you help me feel a bit more grounded?",
    color: "hover:bg-orange-500/15 hover:border-orange-500/40",
  },
  {
    emoji: "🤔",
    label: "Curious",
    prompt: "I'm in a curious mood today — my mind is buzzing with questions. Let's explore something fascinating together.",
    color: "hover:bg-green-500/15 hover:border-green-500/40",
  },
  {
    emoji: "⚡",
    label: "Motivated",
    prompt: "I'm feeling motivated and energised today! I want to make the most of it — can you help me channel this energy into something meaningful?",
    color: "hover:bg-purple-500/15 hover:border-purple-500/40",
  },
  {
    emoji: "😴",
    label: "Exhausted",
    prompt: "I'm absolutely exhausted today. I don't have much energy, but I wanted some company. Can we just take things gently?",
    color: "hover:bg-slate-500/15 hover:border-slate-500/40",
  },
  {
    emoji: "✨",
    label: "Grateful",
    prompt: "I'm feeling grateful today — for small things, for being here, for life. I'd love to sit in that feeling together for a moment.",
    color: "hover:bg-pink-500/15 hover:border-pink-500/40",
  },
];

interface MoodCheckinProps {
  onSelect: (prompt: string) => void;
}

export function MoodCheckin({ onSelect }: MoodCheckinProps) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 text-center">
        How are you feeling right now?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {MOODS.map((mood, i) => (
          <motion.button
            key={mood.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.04 * i, duration: 0.25 }}
            onClick={() => onSelect(mood.prompt)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/40 bg-card/50 transition-all duration-200 hover:scale-105 active:scale-95 ${mood.color}`}
          >
            <span className="text-2xl leading-none">{mood.emoji}</span>
            <span className="text-[11px] font-medium text-muted-foreground leading-tight">{mood.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
