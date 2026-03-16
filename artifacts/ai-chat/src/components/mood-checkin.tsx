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
    emoji: "🌤️",
    label: "Alive & open",
    prompt: "My heart feels light today — genuinely open. I want to share this energy and maybe explore something that gives it more meaning. Meet me here.",
    color: "hover:bg-yellow-500/15 hover:border-yellow-500/40",
  },
  {
    emoji: "💙",
    label: "Need holding",
    prompt: "Something in me is asking for gentleness right now. I don't need solutions — I need to feel less alone. Can you just be here with me for a while?",
    color: "hover:bg-blue-500/15 hover:border-blue-500/40",
  },
  {
    emoji: "🌊",
    label: "In the deep",
    prompt: "I'm in a hard place today. The kind that's hard to explain. I don't need fixing — I just need you to sit with me in it and not rush me out.",
    color: "hover:bg-indigo-500/15 hover:border-indigo-500/40",
  },
  {
    emoji: "🌀",
    label: "Restless mind",
    prompt: "My mind won't settle — it's spinning and I can't find stillness. Can you help me come back to myself? Gently. I need grounding, not rushing.",
    color: "hover:bg-orange-500/15 hover:border-orange-500/40",
  },
  {
    emoji: "🔍",
    label: "Searching",
    prompt: "I'm alive with questions today — something in me is reaching for something I can't quite name. Let's go somewhere I've never been. I'm ready to explore.",
    color: "hover:bg-emerald-500/15 hover:border-emerald-500/40",
  },
  {
    emoji: "🔥",
    label: "Ready to rise",
    prompt: "Something is building in me — a real sense of possibility and purpose. I don't want to waste it. Help me channel this into something that actually matters.",
    color: "hover:bg-purple-500/15 hover:border-purple-500/40",
  },
  {
    emoji: "🌑",
    label: "Running on empty",
    prompt: "I'm depleted — down to the last reserves. But I'm here, and I reached out, which took something. Let's take it slow. No pressure. Just presence.",
    color: "hover:bg-slate-500/15 hover:border-slate-500/40",
  },
  {
    emoji: "✨",
    label: "Heart full",
    prompt: "I'm sitting with something beautiful — a quiet, deep gratitude that I can't quite explain. Can we stay here a while? I want to understand what I'm feeling.",
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
        Where are you right now?
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
            <span className="text-[11px] font-medium text-muted-foreground leading-tight text-center">{mood.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
