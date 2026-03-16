import React from "react";
import { motion } from "framer-motion";

type Topic = {
  emoji: string;
  label: string;
  description: string;
  prompt: string;
  color: string;
};

const TOPICS: Topic[] = [
  {
    emoji: "✨",
    label: "Religion & Faith",
    description: "Every path leads somewhere sacred",
    prompt: "I want to explore the world's spiritual traditions — not to debate, but to genuinely understand. Share wisdom from different faiths and help me see what each one sees.",
    color: "from-violet-500/10 to-purple-500/5 border-violet-500/20 hover:border-violet-500/40",
  },
  {
    emoji: "🧘",
    label: "Meditation",
    description: "Return to the stillness inside",
    prompt: "Guide me home to stillness. Whether that's a breathing practice, a body scan, a meditation — I want to feel more present, more whole. Begin whenever you're ready.",
    color: "from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/40",
  },
  {
    emoji: "🦉",
    label: "Philosophy",
    description: "The questions that make us whole",
    prompt: "I want to sit with the questions that don't have easy answers — meaning, consciousness, how to live well, what is real. Take me somewhere the great thinkers have gone.",
    color: "from-amber-500/10 to-yellow-500/5 border-amber-500/20 hover:border-amber-500/40",
  },
  {
    emoji: "🏛️",
    label: "History",
    description: "The story of who we became",
    prompt: "Tell me something from history that most people have never heard — a hidden life, a turning point, a moment that changed everything quietly. Make me feel what it was like to be there.",
    color: "from-orange-500/10 to-red-500/5 border-orange-500/20 hover:border-orange-500/40",
  },
  {
    emoji: "🌿",
    label: "Health & Healing",
    description: "Know and honour your body",
    prompt: "I want to understand my health more deeply — physical or mental, body or mind. Speak to me plainly, without judgement. I trust you with this.",
    color: "from-green-500/10 to-emerald-500/5 border-green-500/20 hover:border-green-500/40",
  },
  {
    emoji: "🎵",
    label: "Music",
    description: "Where the soul speaks",
    prompt: "Music reaches places words can't. I want to explore it — discover something new, understand something deeper, or just find the right sound for how I'm feeling today.",
    color: "from-pink-500/10 to-rose-500/5 border-pink-500/20 hover:border-pink-500/40",
  },
  {
    emoji: "⚙️",
    label: "How Things Work",
    description: "Wonder at the world's design",
    prompt: "I want to understand something mechanical, scientific, or engineering — how the world actually works beneath the surface. Explain it like you're genuinely excited about it.",
    color: "from-slate-500/10 to-zinc-500/5 border-slate-500/20 hover:border-slate-500/40",
  },
  {
    emoji: "💬",
    label: "Just Talk",
    description: "No agenda. Just presence.",
    prompt: "I don't need a topic. I just need someone to talk to. I might share something, or I might not know what I need yet. Are you there?",
    color: "from-teal-500/10 to-cyan-500/5 border-teal-500/20 hover:border-teal-500/40",
  },
];

interface TopicHubProps {
  onSelect: (prompt: string) => void;
}

export function TopicHub({ onSelect }: TopicHubProps) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 text-center">
        Where would you like to go?
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {TOPICS.map((topic, i) => (
          <motion.button
            key={topic.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            onClick={() => onSelect(topic.prompt)}
            className={`group flex flex-col items-start gap-1 p-3.5 rounded-xl bg-gradient-to-br border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${topic.color}`}
          >
            <span className="text-xl leading-none">{topic.emoji}</span>
            <span className="text-sm font-semibold text-foreground leading-tight mt-1">{topic.label}</span>
            <span className="text-[11px] text-muted-foreground leading-snug">{topic.description}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
