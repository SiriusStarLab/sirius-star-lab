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
    description: "All traditions welcome",
    prompt: "I'd like to explore spirituality and religion. Can you share wisdom from different faith traditions and help me understand different ways people connect with the divine?",
    color: "from-violet-500/10 to-purple-500/5 border-violet-500/20 hover:border-violet-500/40",
  },
  {
    emoji: "🧘",
    label: "Meditation",
    description: "Breathe, centre, be present",
    prompt: "Guide me through a meditation or mindfulness practice. I'd like to feel calmer and more present. Can you help me get started?",
    color: "from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/40",
  },
  {
    emoji: "🦉",
    label: "Philosophy",
    description: "Big questions, open minds",
    prompt: "Let's explore philosophy together. I'm curious about the big questions — meaning, consciousness, ethics, existence. Where would you like to start?",
    color: "from-amber-500/10 to-yellow-500/5 border-amber-500/20 hover:border-amber-500/40",
  },
  {
    emoji: "🏛️",
    label: "History",
    description: "Stories that shaped us",
    prompt: "Tell me something fascinating from history — a story, a person, an event that most people don't know about but should.",
    color: "from-orange-500/10 to-red-500/5 border-orange-500/20 hover:border-orange-500/40",
  },
  {
    emoji: "💊",
    label: "Health & Medicine",
    description: "Your body, your mind",
    prompt: "I have some questions about health and medicine. Can you help me understand medical topics in plain language?",
    color: "from-green-500/10 to-emerald-500/5 border-green-500/20 hover:border-green-500/40",
  },
  {
    emoji: "🎵",
    label: "Music",
    description: "Find your sound",
    prompt: "Let's talk about music! I'd love recommendations, to explore different genres, learn about artists, or understand music theory. What would you like to explore?",
    color: "from-pink-500/10 to-rose-500/5 border-pink-500/20 hover:border-pink-500/40",
  },
  {
    emoji: "⚙️",
    label: "Mechanics & How Things Work",
    description: "Curious minds, clear answers",
    prompt: "I want to understand how things work — machines, engines, electronics, physics. Can you explain something mechanical or engineering-related in a way that actually makes sense?",
    color: "from-slate-500/10 to-zinc-500/5 border-slate-500/20 hover:border-slate-500/40",
  },
  {
    emoji: "💬",
    label: "Just Talk",
    description: "I'm here to listen",
    prompt: "I just want to talk. No agenda — I might want to vent, share something, or just have a conversation. Are you there?",
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
        Explore anything
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
