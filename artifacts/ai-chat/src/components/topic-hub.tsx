import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Topic = {
  emoji: string;
  label: string;
  tag: string;
  prompt: string;
  accent: string;
  voiceScript: string;
};

const TOPICS: Topic[] = [
  {
    emoji: "✨",
    label: "Have Faith",
    tag: "SPIRITUAL",
    prompt: "I want to explore the world's spiritual traditions — not to debate, but to genuinely understand. Share wisdom from different faiths and help me see what each one sees.",
    accent: "260 80% 68%",
    voiceScript: "Take a moment to arrive here. Whatever you were doing before — let it rest. This is a space beyond argument and beyond doubt. Every great tradition in human history has looked at the mystery of existence and reached toward something larger than itself. Today, we step into that reaching together. You don't need to believe anything in particular. You only need to be open. So breathe in slowly... and let the journey begin.",
  },
  {
    emoji: "🧘",
    label: "Meditation",
    tag: "MINDFULNESS",
    prompt: "Guide me home to stillness. Whether that's a breathing practice, a body scan, a meditation — I want to feel more present, more whole. Begin whenever you're ready.",
    accent: "193 90% 55%",
    voiceScript: "Close your eyes if you're able. Let your hands rest gently, wherever they are. Take one slow breath in through your nose... hold for just a moment... and release everything through your mouth. Again — breathe in... and let go. Feel the weight of your body, supported and held. There is nowhere you need to be right now. Nothing you need to fix. You are already whole. Just breathe, and let this moment be enough.",
  },
  {
    emoji: "🦉",
    label: "Philosophy",
    tag: "WISDOM",
    prompt: "I want to sit with the questions that don't have easy answers — meaning, consciousness, how to live well, what is real. Take me somewhere the great thinkers have gone.",
    accent: "45 95% 58%",
    voiceScript: "Before the first word is spoken, there is a question. Before every philosophy, there is a moment of noticing — that something exists rather than nothing, that you are here, aware, wondering. Socrates stood in the marketplace and asked the questions no one else dared to. The Stoics walked through chaos and asked how to remain unbroken. The Tao asked what happens when you stop trying to explain. Today, we think together. The only tool you need is the one you were born with — a mind that can wonder.",
  },
  {
    emoji: "🏛️",
    label: "History",
    tag: "DISCOVERY",
    prompt: "Tell me something from history that most people have never heard — a hidden life, a turning point, a moment that changed everything quietly. Make me feel what it was like to be there.",
    accent: "25 90% 60%",
    voiceScript: "History is not a list of dates. It is the sound of a city burning at midnight. The trembling hand that signs a declaration. The unknown farmer, the unnamed nurse, the child who watched an empire fall from a rooftop. Every moment in the past was someone's present — full of uncertainty, full of feeling. Today, we don't just learn history. We step inside it. We feel the texture of another time. Are you ready to be transported?",
  },
  {
    emoji: "🌿",
    label: "Health & Healing",
    tag: "WELLBEING",
    prompt: "I want to understand my health more deeply — physical or mental, body or mind. Speak to me plainly, without judgement. I trust you with this.",
    accent: "145 70% 50%",
    voiceScript: "Your body has been working for you every single second of your life — without being asked, without being thanked. Right now, your heart is beating. Your lungs are breathing. Your cells are repairing, communicating, protecting. Healing is not something that happens to you — it begins the moment you turn toward yourself with curiosity instead of judgement. Today, we do that together. Whatever is happening in your body or your mind, you are not broken. You are a living system — and living systems can change.",
  },
  {
    emoji: "🎵",
    label: "Music",
    tag: "SOUND",
    prompt: "Music reaches places words can't. I want to explore it — discover something new, understand something deeper, or just find the right sound for how I'm feeling today.",
    accent: "320 75% 62%",
    voiceScript: "Before language, there was rhythm. Before words, there was song. Every human culture on earth — without exception — has made music. It is the oldest conversation we have. Music bypasses the thinking mind and speaks directly to something deeper — something that knows how to feel before it knows how to explain. Today, we go into the world of sound. Whether you want to discover something entirely new, understand how music works, or simply find the frequency that matches your soul right now — we begin here.",
  },
  {
    emoji: "🌌",
    label: "Science & Cosmos",
    tag: "UNIVERSE",
    prompt: "I want to explore science — astronomy, biology, physics, astrology, chemistry, the nature of life, the structure of the universe. Take me somewhere I haven't been. Make me feel the wonder of it.",
    accent: "210 90% 62%",
    voiceScript: "You are made of stardust. Literally — the calcium in your bones, the iron in your blood, were forged in the hearts of stars that exploded billions of years ago. The universe is approximately thirteen point eight billion years old, and somehow — against all probability — it produced you, here, now, curious enough to ask about itself. That is the most astonishing fact in the cosmos. Today, we explore the universe from the inside. Hold on to your sense of wonder — you're going to need it.",
  },
  {
    emoji: "🎶",
    label: "Vibration & Frequencies",
    tag: "RESONANCE",
    prompt: "I want to explore the science and wisdom of vibration and frequency — from quantum physics and cymatics to sound healing, Schumann resonance, solfeggio frequencies, binaural beats, and the latest research. Bring me everything — the physics, the biology, the spirituality, and what's being discovered right now. Use the latest research.",
    accent: "280 85% 70%",
    voiceScript: "Everything vibrates. At the subatomic level, beneath the solidity of everything you see and touch, there is only motion — patterns of energy oscillating at specific frequencies. Your body resonates. The Earth resonates — at approximately seven point eight three hertz, a frequency called the Schumann Resonance, which matches the alpha waves of a calm and creative human brain. Sound is not just something you hear. It is something you are. Today, we go deep into the physics and the mystery of vibration — and what it means for healing, consciousness, and the nature of reality.",
  },
  {
    emoji: "💬",
    label: "Just Talk",
    tag: "OPEN SESSION",
    prompt: "I don't need a topic. I just need someone to talk to. I might share something, or I might not know what I need yet. Are you there?",
    accent: "175 80% 52%",
    voiceScript: "I'm here. There's nothing you have to say, and nothing you have to be. You don't need the right words or the right mood. You can arrive exactly as you are — uncertain, tired, excited, or somewhere in between. This is a space without agenda. Sometimes the most important thing is simply having somewhere to land. So — what's on your mind? Or if nothing is, that's okay too. We can start anywhere, or we can start with nothing at all. I'm not going anywhere.",
  },
];

interface VoicePlayerProps {
  topic: Topic;
  onContinue: () => void;
  onClose: () => void;
}

function VoicePlayer({ topic, onContinue, onClose }: VoicePlayerProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const estimatedDurationRef = useRef<number>(0);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const english = available.filter(v => v.lang.startsWith("en"));
      const sorted = [
        ...english.filter(v => v.localService),
        ...english.filter(v => !v.localService),
      ];
      setVoices(sorted.length > 0 ? sorted : available);
      if (sorted.length > 0 && !selectedVoice) {
        const preferred =
          sorted.find(v => /samantha|karen|daniel|moira|tessa/i.test(v.name)) ||
          sorted[0];
        setSelectedVoice(preferred.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsPlaying(false);
  }, []);

  const startSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(topic.voiceScript);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const wordCount = topic.voiceScript.split(" ").length;
    estimatedDurationRef.current = (wordCount / utterance.rate / 2.5) * 1000;
    startTimeRef.current = Date.now();

    utterance.onstart = () => {
      setIsPlaying(true);
      setHasPlayed(true);
      setProgress(0);
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const pct = Math.min((elapsed / estimatedDurationRef.current) * 100, 98);
        setProgress(pct);
      }, 200);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [topic, voices, selectedVoice]);

  useEffect(() => {
    if (voices.length > 0 && selectedVoice) {
      setTimeout(() => startSpeech(), 400);
    }
    return () => stopSpeech();
  }, [voices.length > 0, selectedVoice]);

  const handlePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      startTimeRef.current = Date.now() - (progress / 100) * estimatedDurationRef.current;
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current + (progress / 100) * estimatedDurationRef.current;
        const pct = Math.min((elapsed / estimatedDurationRef.current) * 100, 98);
        setProgress(pct);
      }, 200);
    } else {
      startSpeech();
    }
  };

  const handleVoiceChange = (name: string) => {
    setSelectedVoice(name);
    stopSpeech();
    setProgress(0);
    setHasPlayed(false);
  };

  const accentHsl = `hsl(${topic.accent})`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5, 8, 18, 0.88)", backdropFilter: "blur(16px)" }}
      onClick={e => { if (e.target === e.currentTarget) { stopSpeech(); onClose(); } }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(160deg, hsl(${topic.accent} / 0.18) 0%, hsl(224 28% 6%) 60%)`,
          border: `1px solid hsl(${topic.accent} / 0.45)`,
          boxShadow: `0 0 60px hsl(${topic.accent} / 0.2), 0 24px 48px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{topic.emoji}</span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] mb-0.5" style={{ color: accentHsl }}>
                  {topic.tag}
                </p>
                <h2 className="text-lg font-semibold text-white">{topic.label}</h2>
              </div>
            </div>
            <button
              onClick={() => { stopSpeech(); onClose(); }}
              className="text-white/40 hover:text-white/70 transition-colors text-lg leading-none p-1"
            >
              ✕
            </button>
          </div>

          {/* Script preview */}
          <p className="text-sm leading-relaxed text-white/55 italic line-clamp-3">
            "{topic.voiceScript.slice(0, 120)}..."
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="h-1 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, hsl(${topic.accent}), hsl(${topic.accent} / 0.6))` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2, ease: "linear" }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-5 flex items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 active:scale-95 shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${topic.accent}), hsl(${topic.accent} / 0.7))`,
              boxShadow: `0 0 20px hsl(${topic.accent} / 0.4)`,
            }}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <rect x="3" y="2" width="4" height="12" rx="1"/>
                <rect x="9" y="2" width="4" height="12" rx="1"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <path d="M4 2.5l10 5.5-10 5.5V2.5z"/>
              </svg>
            )}
          </button>

          {/* Stop / Replay */}
          <button
            onClick={() => { stopSpeech(); setProgress(0); setHasPlayed(false); }}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 active:scale-95 shrink-0"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white" opacity="0.7">
              <rect x="1" y="1" width="10" height="10" rx="2"/>
            </svg>
          </button>

          {/* Voice selector */}
          <div className="flex-1 min-w-0">
            <select
              value={selectedVoice}
              onChange={e => handleVoiceChange(e.target.value)}
              className="w-full text-xs rounded-lg px-3 py-2 font-mono outline-none truncate"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              {voices.map(v => (
                <option key={v.name} value={v.name} style={{ background: "#0d1117" }}>
                  {v.name.replace(/\s*\(.*\)/, "")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status + Continue */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: `1px solid hsl(${topic.accent} / 0.15)` }}
        >
          <div className="flex items-center gap-2">
            {isPlaying && (
              <motion.div className="flex gap-0.5 items-end h-4">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-0.5 rounded-full"
                    style={{ background: accentHsl }}
                    animate={{ height: ["4px", "14px", "4px"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
            <span className="text-xs font-mono" style={{ color: `hsl(${topic.accent} / 0.7)` }}>
              {isPlaying ? "Speaking..." : hasPlayed ? "Ready" : "Press play"}
            </span>
          </div>

          <button
            onClick={() => { stopSpeech(); onContinue(); }}
            className="text-sm font-semibold px-5 py-2 rounded-xl transition-all duration-200 active:scale-95"
            style={{
              background: `linear-gradient(135deg, hsl(${topic.accent} / 0.28), hsl(${topic.accent} / 0.12))`,
              border: `1px solid hsl(${topic.accent} / 0.55)`,
              color: accentHsl,
            }}
          >
            Continue to chat →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface TopicHubProps {
  onSelect: (prompt: string) => void;
}

export function TopicHub({ onSelect }: TopicHubProps) {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  return (
    <>
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
              onClick={() => setActiveTopic(topic)}
              className="group flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: `linear-gradient(145deg, hsl(${topic.accent} / 0.30) 0%, hsl(${topic.accent} / 0.12) 100%)`,
                backdropFilter: "blur(10px)",
                border: `1px solid hsl(${topic.accent} / 0.58)`,
                boxShadow: `0 2px 14px hsl(${topic.accent} / 0.15)`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.border = `1px solid hsl(${topic.accent} / 0.9)`;
                el.style.boxShadow = `0 0 24px hsl(${topic.accent} / 0.38), inset 0 0 20px hsl(${topic.accent} / 0.1)`;
                el.style.background = `linear-gradient(145deg, hsl(${topic.accent} / 0.46) 0%, hsl(${topic.accent} / 0.22) 100%)`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.border = `1px solid hsl(${topic.accent} / 0.58)`;
                el.style.boxShadow = `0 2px 14px hsl(${topic.accent} / 0.15)`;
                el.style.background = `linear-gradient(145deg, hsl(${topic.accent} / 0.30) 0%, hsl(${topic.accent} / 0.12) 100%)`;
              }}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xl leading-none">{topic.emoji}</span>
                <span className="opacity-0 group-hover:opacity-60 transition-opacity text-white text-[10px]">▶</span>
              </div>
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

      <AnimatePresence>
        {activeTopic && (
          <VoicePlayer
            topic={activeTopic}
            onContinue={() => {
              onSelect(activeTopic.prompt);
              setActiveTopic(null);
            }}
            onClose={() => setActiveTopic(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
