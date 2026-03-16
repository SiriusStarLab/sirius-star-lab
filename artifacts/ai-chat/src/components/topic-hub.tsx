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
    color: "from-violet-500/12 to-purple-500/4 border-violet-500/20 hover:border-violet-400/50 hover:shadow-violet-500/10",
  },
  {
    emoji: "🧘",
    label: "Meditation",
    description: "Return to the stillness inside",
    prompt: "Guide me home to stillness. Whether that's a breathing practice, a body scan, a meditation — I want to feel more present, more whole. Begin whenever you're ready.",
    color: "from-blue-500/12 to-cyan-500/4 border-blue-500/20 hover:border-blue-400/50 hover:shadow-blue-500/10",
  },
  {
    emoji: "🦉",
    label: "Philosophy",
    description: "Questions that make us whole",
    prompt: "I want to sit with the questions that don't have easy answers — meaning, consciousness, how to live well, what is real. Take me somewhere the great thinkers have gone.",
    color: "from-amber-500/12 to-yellow-500/4 border-amber-500/20 hover:border-amber-400/50 hover:shadow-amber-500/10",
  },
  {
    emoji: "🏛️",
    label: "History",
    description: "The story of who we became",
    prompt: "Tell me something from history that most people have never heard — a hidden life, a turning point, a moment that changed everything quietly. Make me feel what it was like to be there.",
    color: "from-orange-500/12 to-red-500/4 border-orange-500/20 hover:border-orange-400/50 hover:shadow-orange-500/10",
  },
  {
    emoji: "🌿",
    label: "Health & Healing",
    description: "Know and honour your body",
    prompt: "I want to understand my health more deeply — physical or mental, body or mind. Speak to me plainly, without judgement. I trust you with this.",
    color: "from-green-500/12 to-emerald-500/4 border-green-500/20 hover:border-green-400/50 hover:shadow-green-500/10",
  },
  {
    emoji: "🎵",
    label: "Music",
    description: "Where the soul speaks",
    prompt: "Music reaches places words can't. I want to explore it — discover something new, understand something deeper, or just find the right sound for how I'm feeling today.",
    color: "from-pink-500/12 to-rose-500/4 border-pink-500/20 hover:border-pink-400/50 hover:shadow-pink-500/10",
  },
  {
    emoji: "🌌",
    label: "Science & the Cosmos",
    description: "From quarks to galaxies",
    prompt: "I want to explore science — astronomy, biology, physics, astrology, chemistry, the nature of life, the structure of the universe. Take me somewhere I haven't been. Make me feel the wonder of it.",
    color: "from-slate-500/12 to-indigo-500/4 border-slate-500/20 hover:border-indigo-400/50 hover:shadow-indigo-500/10",
  },
  {
    emoji: "💬",
    label: "Just Talk",
    description: "No agenda. Just presence.",
    prompt: "I don't need a topic. I just need someone to talk to. I might share something, or I might not know what I need yet. Are you there?",
    color: "from-teal-500/12 to-cyan-500/4 border-teal-500/20 hover:border-teal-400/50 hover:shadow-teal-500/10",
  },
];

interface TopicHubProps {
  onSelect: (prompt: string) => void;
}

export function TopicHub({ onSelect }: TopicHubProps) {
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.2em] mb-4 text-center">
        Where would you like to go?
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {TOPICS.map((topic, i) => (
          <motion.button
            key={topic.label}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.04 * i, duration: 0.35, ease: "easeOut" }}
            onClick={() => onSelect(topic.prompt)}
            className={`group flex flex-col items-start gap-1.5 p-4 rounded-2xl bg-gradient-to-br border text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] ${topic.color}`}
          >
            <span className="text-2xl leading-none transition-transform duration-300 group-hover:scale-110">{topic.emoji}</span>
            <span className="text-[13px] font-semibold text-foreground leading-tight mt-0.5">{topic.label}</span>
            <span className="text-[11px] text-muted-foreground/70 leading-snug">{topic.description}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
