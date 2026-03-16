import React from "react";
import { motion } from "framer-motion";

type Topic = {
  emoji: string;
  label: string;
  tag: string;
  prompt: string;
  accent: string;
};

const TOPICS: Topic[] = [
  {
    emoji: "✨",
    label: "Religion & Faith",
    tag: "SPIRITUAL",
    prompt: "I want to explore the world's spiritual traditions — not to debate, but to genuinely understand. Share wisdom from different faiths and help me see what each one sees.",
    accent: "260 80% 68%",
  },
  {
    emoji: "🧘",
    label: "Meditation",
    tag: "MINDFULNESS",
    prompt: "Guide me home to stillness. Whether that's a breathing practice, a body scan, a meditation — I want to feel more present, more whole. Begin whenever you're ready.",
    accent: "193 90% 55%",
  },
  {
    emoji: "🦉",
    label: "Philosophy",
    tag: "WISDOM",
    prompt: "I want to sit with the questions that don't have easy answers — meaning, consciousness, how to live well, what is real. Take me somewhere the great thinkers have gone.",
    accent: "45 95% 58%",
  },
  {
    emoji: "🏛️",
    label: "History",
    tag: "DISCOVERY",
    prompt: "Tell me something from history that most people have never heard — a hidden life, a turning point, a moment that changed everything quietly. Make me feel what it was like to be there.",
    accent: "25 90% 60%",
  },
  {
    emoji: "🌿",
    label: "Health & Healing",
    tag: "WELLBEING",
    prompt: "I want to understand my health more deeply — physical or mental, body or mind. Speak to me plainly, without judgement. I trust you with this.",
    accent: "145 70% 50%",
  },
  {
    emoji: "🎵",
    label: "Music",
    tag: "SOUND",
    prompt: "Music reaches places words can't. I want to explore it — discover something new, understand something deeper, or just find the right sound for how I'm feeling today.",
    accent: "320 75% 62%",
  },
  {
    emoji: "🌌",
    label: "Science & Cosmos",
    tag: "UNIVERSE",
    prompt: "I want to explore science — astronomy, biology, physics, astrology, chemistry, the nature of life, the structure of the universe. Take me somewhere I haven't been. Make me feel the wonder of it.",
    accent: "210 90% 62%",
  },
  {
    emoji: "💬",
    label: "Just Talk",
    tag: "OPEN SESSION",
    prompt: "I don't need a topic. I just need someone to talk to. I might share something, or I might not know what I need yet. Are you there?",
    accent: "175 80% 52%",
  },
];

interface TopicHubProps {
  onSelect: (prompt: string) => void;
}

export function TopicHub({ onSelect }: TopicHubProps) {
  return (
    <div className="w-full">
      <p className="text-[10px] font-mono font-medium text-primary/50 uppercase tracking-[0.25em] mb-3 text-center">
        Select a domain
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {TOPICS.map((topic, i) => (
          <motion.button
            key={topic.label}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.04 * i, duration: 0.3, ease: "easeOut" }}
            onClick={() => onSelect(topic.prompt)}
            className="group flex flex-col items-start gap-2 p-3.5 rounded-lg text-left transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "hsl(224 24% 8% / 0.7)",
              backdropFilter: "blur(10px)",
              border: `1px solid hsl(${topic.accent} / 0.15)`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.border = `1px solid hsl(${topic.accent} / 0.5)`;
              el.style.boxShadow = `0 0 16px hsl(${topic.accent} / 0.15), inset 0 0 20px hsl(${topic.accent} / 0.04)`;
              el.style.background = "hsl(224 24% 10% / 0.9)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.border = `1px solid hsl(${topic.accent} / 0.15)`;
              el.style.boxShadow = "none";
              el.style.background = "hsl(224 24% 8% / 0.7)";
            }}
          >
            <span className="text-xl leading-none">{topic.emoji}</span>
            <div>
              <p className="text-[11px] font-mono tracking-widest uppercase mb-0.5"
                style={{ color: `hsl(${topic.accent} / 0.6)`, fontSize: "9px" }}>
                {topic.tag}
              </p>
              <p className="text-[13px] font-semibold text-foreground/90 leading-tight">
                {topic.label}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
