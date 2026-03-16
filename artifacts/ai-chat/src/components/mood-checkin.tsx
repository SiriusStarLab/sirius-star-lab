import React from "react";
import { motion } from "framer-motion";

type Mood = {
  emoji: string;
  label: string;
  prompt: string;
  accent: string;
};

const MOODS: Mood[] = [
  {
    emoji: "🌤️",
    label: "Alive & open",
    prompt: "My heart feels light today — genuinely open. I want to share this energy and maybe explore something that gives it more meaning. Meet me here.",
    accent: "193 95% 52%",
  },
  {
    emoji: "💙",
    label: "Need holding",
    prompt: "Something in me is asking for gentleness right now. I don't need solutions — I need to feel less alone. Can you just be here with me for a while?",
    accent: "210 90% 60%",
  },
  {
    emoji: "🌊",
    label: "In the deep",
    prompt: "I'm in a hard place today. The kind that's hard to explain. I don't need fixing — I just need you to sit with me in it and not rush me out.",
    accent: "235 80% 62%",
  },
  {
    emoji: "🌀",
    label: "Restless mind",
    prompt: "My mind won't settle — it's spinning and I can't find stillness. Can you help me come back to myself? Gently. I need grounding, not rushing.",
    accent: "175 80% 50%",
  },
  {
    emoji: "🔍",
    label: "Searching",
    prompt: "I'm alive with questions today — something in me is reaching for something I can't quite name. Let's go somewhere I've never been. I'm ready to explore.",
    accent: "260 85% 68%",
  },
  {
    emoji: "🔥",
    label: "Ready to rise",
    prompt: "Something is building in me — a real sense of possibility and purpose. I don't want to waste it. Help me channel this into something that actually matters.",
    accent: "25 95% 58%",
  },
  {
    emoji: "🌑",
    label: "Running on empty",
    prompt: "I'm depleted — down to the last reserves. But I'm here, and I reached out, which took something. Let's take it slow. No pressure. Just presence.",
    accent: "220 15% 45%",
  },
  {
    emoji: "✨",
    label: "Heart full",
    prompt: "I'm sitting with something beautiful — a quiet, deep gratitude that I can't quite explain. Can we stay here a while? I want to understand what I'm feeling.",
    accent: "320 80% 65%",
  },
];

interface MoodCheckinProps {
  onSelect: (prompt: string) => void;
}

export function MoodCheckin({ onSelect }: MoodCheckinProps) {
  return (
    <div className="w-full">
      <p className="text-[10px] font-mono font-medium text-primary/50 uppercase tracking-[0.25em] mb-3 text-center">
        Where are you right now?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {MOODS.map((mood, i) => (
          <motion.button
            key={mood.label}
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.04 * i, duration: 0.3, ease: "easeOut" }}
            onClick={() => onSelect(mood.prompt)}
            className="group flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-250 active:scale-95"
            style={{
              background: "hsl(224 24% 8% / 0.7)",
              backdropFilter: "blur(10px)",
              border: `1px solid hsl(${mood.accent} / 0.18)`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.border = `1px solid hsl(${mood.accent} / 0.55)`;
              el.style.boxShadow = `0 0 14px hsl(${mood.accent} / 0.18), inset 0 0 14px hsl(${mood.accent} / 0.05)`;
              el.style.background = `hsl(224 24% 10% / 0.9)`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.border = `1px solid hsl(${mood.accent} / 0.18)`;
              el.style.boxShadow = "none";
              el.style.background = "hsl(224 24% 8% / 0.7)";
            }}
          >
            <span className="text-xl leading-none">{mood.emoji}</span>
            <span className="text-[10px] font-medium leading-tight text-center"
              style={{ color: `hsl(${mood.accent} / 0.75)` }}>
              {mood.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
