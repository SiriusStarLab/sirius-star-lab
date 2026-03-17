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
    label: "Have Faith",
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
    emoji: "🎶",
    label: "Vibration & Frequencies",
    tag: "RESONANCE",
    prompt: "I want to explore the science and wisdom of vibration and frequency — from quantum physics and cymatics to sound healing, Schumann resonance, solfeggio frequencies, binaural beats, and the latest research. Bring me everything — the physics, the biology, the spirituality, and what's being discovered right now. Use the latest research.",
    accent: "280 85% 70%",
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
      <p className="text-[10px] font-mono font-medium text-primary/60 uppercase tracking-[0.25em] mb-3 text-center">
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
            className="group flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all duration-200 active:scale-[0.97]"
            style={{
              background: `linear-gradient(135deg, hsl(${topic.accent} / 0.14), hsl(${topic.accent} / 0.05))`,
              backdropFilter: "blur(10px)",
              border: `1px solid hsl(${topic.accent} / 0.32)`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.border = `1px solid hsl(${topic.accent} / 0.65)`;
              el.style.boxShadow = `0 0 20px hsl(${topic.accent} / 0.2), inset 0 0 20px hsl(${topic.accent} / 0.06)`;
              el.style.background = `linear-gradient(135deg, hsl(${topic.accent} / 0.22), hsl(${topic.accent} / 0.09))`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.border = `1px solid hsl(${topic.accent} / 0.32)`;
              el.style.boxShadow = "none";
              el.style.background = `linear-gradient(135deg, hsl(${topic.accent} / 0.14), hsl(${topic.accent} / 0.05))`;
            }}
          >
            <span className="text-xl leading-none">{topic.emoji}</span>
            <div>
              <p className="font-mono uppercase tracking-widest mb-0.5"
                style={{ color: `hsl(${topic.accent})`, fontSize: "9px" }}>
                {topic.tag}
              </p>
              <p className="text-[13px] font-semibold leading-tight"
                style={{ color: `hsl(${topic.accent} / 0.95)` }}>
                {topic.label}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
