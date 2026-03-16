import React from "react";
import { motion } from "framer-motion";

type Mood = {
  emoji: string;
  label: string;
  prompt: string;
  gradient: string;
  glow: string;
};

const MOODS: Mood[] = [
  {
    emoji: "🌤️",
    label: "Alive & open",
    prompt: "My heart feels light today — genuinely open. I want to share this energy and maybe explore something that gives it more meaning. Meet me here.",
    gradient: "from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/20 hover:border-amber-400/50",
    glow: "hover:shadow-amber-500/10",
  },
  {
    emoji: "💙",
    label: "Need holding",
    prompt: "Something in me is asking for gentleness right now. I don't need solutions — I need to feel less alone. Can you just be here with me for a while?",
    gradient: "from-blue-500/10 via-blue-400/5 to-transparent border-blue-500/20 hover:border-blue-400/50",
    glow: "hover:shadow-blue-500/10",
  },
  {
    emoji: "🌊",
    label: "In the deep",
    prompt: "I'm in a hard place today. The kind that's hard to explain. I don't need fixing — I just need you to sit with me in it and not rush me out.",
    gradient: "from-indigo-500/10 via-indigo-400/5 to-transparent border-indigo-500/20 hover:border-indigo-400/50",
    glow: "hover:shadow-indigo-500/10",
  },
  {
    emoji: "🌀",
    label: "Restless mind",
    prompt: "My mind won't settle — it's spinning and I can't find stillness. Can you help me come back to myself? Gently. I need grounding, not rushing.",
    gradient: "from-cyan-500/10 via-teal-400/5 to-transparent border-cyan-500/20 hover:border-cyan-400/50",
    glow: "hover:shadow-cyan-500/10",
  },
  {
    emoji: "🔍",
    label: "Searching",
    prompt: "I'm alive with questions today — something in me is reaching for something I can't quite name. Let's go somewhere I've never been. I'm ready to explore.",
    gradient: "from-violet-500/10 via-purple-400/5 to-transparent border-violet-500/20 hover:border-violet-400/50",
    glow: "hover:shadow-violet-500/10",
  },
  {
    emoji: "🔥",
    label: "Ready to rise",
    prompt: "Something is building in me — a real sense of possibility and purpose. I don't want to waste it. Help me channel this into something that actually matters.",
    gradient: "from-orange-500/10 via-red-400/5 to-transparent border-orange-500/20 hover:border-orange-400/50",
    glow: "hover:shadow-orange-500/10",
  },
  {
    emoji: "🌑",
    label: "Running on empty",
    prompt: "I'm depleted — down to the last reserves. But I'm here, and I reached out, which took something. Let's take it slow. No pressure. Just presence.",
    gradient: "from-slate-500/10 via-slate-400/5 to-transparent border-slate-500/20 hover:border-slate-400/40",
    glow: "hover:shadow-slate-500/10",
  },
  {
    emoji: "✨",
    label: "Heart full",
    prompt: "I'm sitting with something beautiful — a quiet, deep gratitude that I can't quite explain. Can we stay here a while? I want to understand what I'm feeling.",
    gradient: "from-pink-500/10 via-rose-400/5 to-transparent border-pink-500/20 hover:border-pink-400/50",
    glow: "hover:shadow-pink-500/10",
  },
];

interface MoodCheckinProps {
  onSelect: (prompt: string) => void;
}

export function MoodCheckin({ onSelect }: MoodCheckinProps) {
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.2em] mb-4 text-center">
        Where are you right now?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {MOODS.map((mood, i) => (
          <motion.button
            key={mood.label}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.04 * i, duration: 0.3, ease: "easeOut" }}
            onClick={() => onSelect(mood.prompt)}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border bg-gradient-to-b transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] shadow-lg ${mood.gradient} ${mood.glow}`}
          >
            <span className="text-2xl leading-none">{mood.emoji}</span>
            <span className="text-[10.5px] font-medium text-muted-foreground leading-tight text-center">{mood.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
