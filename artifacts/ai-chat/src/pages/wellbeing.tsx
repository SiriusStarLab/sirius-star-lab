import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Heart, Waves, Wind, Zap, Moon, Sun, Music2, Brain,
  ChevronRight, ArrowLeft, Send, Loader2, Mic, MicOff,
  Sparkles, RefreshCw
} from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

type ChatMsg = { role: "user" | "assistant"; content: string };

const TOPICS = [
  {
    id: "vibration",
    icon: Waves,
    emoji: "〰️",
    title: "Vibration & Frequency",
    subtitle: "The physics of everything",
    color: "#0891b2",
    bg: "rgba(8,145,178,0.07)",
    border: "rgba(8,145,178,0.2)",
    prompt: "I want to explore the science and wisdom of vibration and frequency — from quantum physics and cymatics to sound healing, Schumann resonance, solfeggio frequencies, binaural beats, and the latest research. Start with something that will genuinely surprise me and expand my understanding of reality.",
  },
  {
    id: "breathwork",
    icon: Wind,
    emoji: "🌬️",
    title: "Breathwork",
    subtitle: "Conscious breathing practices",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.07)",
    border: "rgba(22,163,74,0.2)",
    prompt: "Guide me through breathwork — I want to understand the science behind it, explore different techniques like box breathing, Wim Hof, 4-7-8, and coherent breathing, and learn how each affects my nervous system. Make it practical and give me something I can try right now.",
  },
  {
    id: "energy",
    icon: Zap,
    emoji: "⚡",
    title: "Energy & Vitality",
    subtitle: "Raising your frequency",
    color: "#d97706",
    bg: "rgba(217,119,6,0.07)",
    border: "rgba(217,119,6,0.2)",
    prompt: "Let's talk about energy — not just physical energy but the deeper kind. Cover the science of mitochondria and cellular energy, the concept of chi and prana, what actually raises and drains our vibration, and the latest research on bioenergetics. How can I genuinely raise my energy and sustain it?",
  },
  {
    id: "sleep",
    icon: Moon,
    emoji: "🌙",
    title: "Sleep & Recovery",
    subtitle: "Deep restoration",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.07)",
    border: "rgba(124,58,237,0.2)",
    prompt: "Teach me everything about sleep and deep recovery — the science of sleep cycles, what happens at each stage, how to optimise my sleep quality, the role of dreams, sleep and healing frequencies, and what the latest neuroscience says about sleep and consciousness. I want to transform my relationship with sleep.",
  },
  {
    id: "mindfulness",
    icon: Brain,
    emoji: "🧠",
    title: "Mindfulness & Presence",
    subtitle: "The power of now",
    color: "#dc2626",
    bg: "rgba(220,38,38,0.07)",
    border: "rgba(220,38,38,0.2)",
    prompt: "Explore mindfulness and presence with me — not just meditation techniques but the neuroscience behind it, what happens in the brain during mindfulness, the difference between mindfulness and meditation, evidence-based benefits, and how to actually build a practice that sticks. Go deep.",
  },
  {
    id: "sound",
    icon: Music2,
    emoji: "🎵",
    title: "Sound Healing",
    subtitle: "Frequencies that heal",
    color: "#db2777",
    bg: "rgba(219,39,119,0.07)",
    border: "rgba(219,39,119,0.2)",
    prompt: "Take me deep into sound healing — solfeggio frequencies, binaural beats, tuning forks, singing bowls, cymatics, and the research behind them. What does the science actually say? What's proven? What's emerging? And what can I practically use today to shift my state and support my wellbeing?",
  },
  {
    id: "sunlight",
    icon: Sun,
    emoji: "☀️",
    title: "Light & Nature",
    subtitle: "Circadian intelligence",
    color: "#ea580c",
    bg: "rgba(234,88,12,0.07)",
    border: "rgba(234,88,12,0.2)",
    prompt: "Explain the profound relationship between light, nature, and human health — circadian rhythms, morning sunlight protocols, grounding and earthing, forest bathing, the electromagnetic field of the Earth, and how to align my biology with natural cycles. Include the science and make it actionable.",
  },
  {
    id: "heart",
    icon: Heart,
    emoji: "💗",
    title: "Heart Coherence",
    subtitle: "Intelligence of the heart",
    color: "#be123c",
    bg: "rgba(190,18,60,0.07)",
    border: "rgba(190,18,60,0.2)",
    prompt: "Tell me about heart coherence — the HeartMath research, the electromagnetic field of the heart, heart rate variability, the heart-brain connection, and how heart coherence affects every system in the body. What practices genuinely build heart coherence and how does it change your state and life?",
  },
];

const MOODS = [
  { id: "peaceful", emoji: "🌿", label: "Peaceful" },
  { id: "anxious", emoji: "🌊", label: "Anxious" },
  { id: "energised", emoji: "⚡", label: "Energised" },
  { id: "tired", emoji: "😴", label: "Tired" },
  { id: "low", emoji: "🌧️", label: "Low" },
  { id: "open", emoji: "🌅", label: "Open" },
];

function WellbeingChat({ topic, onBack }: { topic: typeof TOPICS[0]; onBack: () => void }) {
  const storageKey = `wellbeing_chat_${topic.id}_${getUserId()}`;
  const welcomeMsg: ChatMsg = {
    role: "assistant",
    content: `Welcome. You've chosen to explore **${topic.title}** — ${topic.subtitle.toLowerCase()}.\n\nI'm going to take you somewhere real with this. Ready when you are — just ask me anything, or I can start with something that might genuinely change how you see this.`,
  };
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try { const s = localStorage.getItem(storageKey); if (s) return JSON.parse(s); } catch {}
    return [welcomeMsg];
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const voiceRecRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const base = getApiBase();
  const userId = getUserId();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40))); } catch {}
  }, [messages]);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || voiceActive) return;
    const rec = new SR();
    voiceRecRef.current = rec;
    rec.lang = "en-GB"; rec.continuous = false; rec.interimResults = false;
    rec.onstart = () => setVoiceActive(true);
    rec.onerror = () => setVoiceActive(false);
    rec.onend = () => setVoiceActive(false);
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript?.trim() || "";
      if (text.length > 1) { setVoiceActive(false); rec.stop(); setInput(text); }
    };
    rec.start();
  };

  const send = async (override?: string) => {
    const msg = (override || input).trim();
    if (!msg || streaming) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const systemPrompt = `You are Sirius — a deeply knowledgeable, warm, and insightful AI companion focused on wellbeing, vibration, consciousness, and human potential. The user is exploring the topic of "${topic.title}" (${topic.subtitle}).

Be genuinely illuminating. Draw on real science, ancient wisdom, and cutting-edge research. Make connections the user hasn't considered. Be specific — name the researchers, the studies, the mechanisms. But also be warm and human — this is a conversation, not a lecture. Ask thoughtful follow-up questions. Go deep when invited. Be the most interesting conversation they've had about this topic.`;

      const res = await fetch(`${base}dream-lab/sirius-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dream-user": userId },
        body: JSON.stringify({ message: msg, history, systemPrompt }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = ""; let reply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) { reply += d.text; setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: reply }; return c; }); } } catch {}
        }
      }
    } finally { setStreaming(false); }
  };

  const startTopic = () => send(topic.prompt);

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: `linear-gradient(160deg, #F9FAFB 0%, ${topic.color}0d 60%, ${topic.color}06 100%)` }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: `${topic.color}22`, background: `linear-gradient(135deg, white 0%, ${topic.color}0a 100%)` }}>
        <button onClick={onBack} className="p-1.5 rounded-lg transition-all" style={{ color: "rgba(15,23,42,0.45)" }}
          onMouseEnter={e => (e.currentTarget.style.background = `${topic.color}15`)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${topic.color}20, ${topic.color}10)`, border: `1.5px solid ${topic.color}40` }}>
          <topic.icon className="w-4.5 h-4.5" style={{ color: topic.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "#0F172A" }}>{topic.title}</p>
          <p className="text-[11px] font-medium" style={{ color: `${topic.color}bb` }}>{topic.subtitle}</p>
        </div>
        <button onClick={() => { localStorage.removeItem(storageKey); setMessages([welcomeMsg]); }}
          className="p-1.5 rounded-lg transition-all" style={{ color: "rgba(15,23,42,0.35)" }} title="Clear chat"
          onMouseEnter={e => (e.currentTarget.style.background = `${topic.color}15`)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: topic.bg, border: `1px solid ${topic.border}` }}>
                <topic.icon className="w-4 h-4" style={{ color: topic.color }} />
              </div>
            )}
            <div className="max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === "user"
                  ? `linear-gradient(135deg, ${topic.color}, ${topic.color}cc)`
                  : "white",
                border: msg.role === "assistant" ? `1px solid rgba(15,23,42,0.08)` : "none",
                color: msg.role === "user" ? "#fff" : "#1e293b",
                boxShadow: msg.role === "assistant" ? "0 1px 4px rgba(15,23,42,0.06)" : "none",
                whiteSpace: "pre-wrap",
              }}>
              {msg.role === "assistant" && msg.content === "" && streaming
                ? <span className="inline-block w-2 h-4 rounded-sm animate-pulse" style={{ background: topic.color }} />
                : msg.content}
            </div>
          </motion.div>
        ))}
        {messages.length === 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex justify-center pt-2">
            <button onClick={startTopic}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: topic.color, color: "#fff", boxShadow: `0 4px 16px ${topic.color}40` }}>
              <Sparkles className="w-4 h-4" />
              Begin this exploration
            </button>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-5 pt-3 border-t" style={{ borderColor: `${topic.color}22`, background: `linear-gradient(135deg, white 0%, ${topic.color}07 100%)` }}>
        <div className="flex items-end gap-2 rounded-2xl px-3 py-2" style={{ background: "white", border: `1px solid ${topic.color}30`, boxShadow: `0 2px 12px ${topic.color}14` }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything…"
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm py-1"
            style={{ color: "#1e293b", lineHeight: 1.5, maxHeight: 120 }}
          />
          <button onClick={voiceActive ? () => { try { voiceRecRef.current?.stop(); } catch {} setVoiceActive(false); } : startVoice}
            className="p-1.5 rounded-lg transition-all flex-shrink-0"
            style={{ color: voiceActive ? topic.color : "rgba(15,23,42,0.35)" }}>
            {voiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={() => send()} disabled={!input.trim() || streaming}
            className="p-1.5 rounded-lg transition-all flex-shrink-0"
            style={{ background: input.trim() && !streaming ? topic.color : "rgba(15,23,42,0.06)", color: input.trim() && !streaming ? "#fff" : "rgba(15,23,42,0.25)" }}>
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoodCheck({ onMoodSelected }: { onMoodSelected: (mood: string, prompt: string) => void }) {
  const moodPrompts: Record<string, string> = {
    peaceful: "I'm feeling peaceful right now. I want to deepen this state — what practices, frequencies, or insights can help me go even deeper into peace and presence?",
    anxious: "I'm feeling anxious and want to bring myself back to calm. Guide me through something practical right now — breathwork, grounding, or anything that will genuinely help shift this state.",
    energised: "I'm feeling energised and want to channel this well. What should I know about this state? How do I sustain it and use it most powerfully?",
    tired: "I'm feeling tired and depleted. I need real restoration — not caffeine. What does the science and wisdom say about genuine recovery and rebuilding my energy?",
    low: "I'm in a low place right now. I'm not looking to be fixed — I want to understand what's happening in my body and mind, and find something that genuinely helps lift me gently.",
    open: "I'm feeling open and curious today. Take me somewhere unexpected — something about wellbeing, consciousness, or human potential that will genuinely expand my perspective.",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 mb-6 bg-white" style={{ border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
      <p className="text-sm font-semibold mb-1" style={{ color: "#0F172A" }}>How are you right now?</p>
      <p className="text-xs mb-4" style={{ color: "rgba(15,23,42,0.45)" }}>Sirius will tailor the conversation to where you are.</p>
      <div className="grid grid-cols-3 gap-2">
        {MOODS.map(m => (
          <button key={m.id} onClick={() => onMoodSelected(m.id, moodPrompts[m.id])}
            className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all hover:scale-105"
            style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.09)", color: "#475569" }}>
            <span className="text-xl">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function WellbeingPage() {
  const [, setLocation] = useLocation();
  const [activeTopic, setActiveTopic] = useState<typeof TOPICS[0] | null>(null);
  const [moodTopic, setMoodTopic] = useState<typeof TOPICS[0] | null>(null);

  const handleMoodSelected = (mood: string, prompt: string) => {
    const fakeTopic = {
      id: `mood-${mood}`,
      icon: Heart,
      emoji: "💗",
      title: "Wellbeing Check-in",
      subtitle: `You're feeling ${mood}`,
      color: "#0891b2",
      bg: "rgba(8,145,178,0.07)",
      border: "rgba(8,145,178,0.2)",
      prompt,
    };
    setMoodTopic(fakeTopic);
    setActiveTopic(fakeTopic);
  };

  if (activeTopic) {
    return <WellbeingChat topic={activeTopic} onBack={() => { setActiveTopic(null); setMoodTopic(null); }} />;
  }

  return (
    <div className="h-screen overflow-y-auto" style={{ background: "#F8FAFF" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-white"
        style={{ borderColor: "rgba(15,23,42,0.08)" }}>
        <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
          style={{ color: "rgba(15,23,42,0.45)" }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: "#0F172A" }}>Wellbeing</h1>
          <p className="text-[11px]" style={{ color: "rgba(15,23,42,0.4)" }}>Vibration · Frequency · Human Potential</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto">
        {/* Mood check-in */}
        <MoodCheck onMoodSelected={handleMoodSelected} />

        {/* Topics */}
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(15,23,42,0.35)", letterSpacing: "0.15em" }}>
          Explore a topic
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TOPICS.map((topic, i) => (
            <motion.button key={topic.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveTopic(topic)}
              className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] group bg-white"
              style={{ border: `1px solid rgba(15,23,42,0.08)`, boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}
              onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${topic.border}`; e.currentTarget.style.boxShadow = `0 4px 16px ${topic.color}20`; }}
              onMouseLeave={e => { e.currentTarget.style.border = `1px solid rgba(15,23,42,0.08)`; e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,23,42,0.05)"; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: topic.bg, border: `1px solid ${topic.border}` }}>
                <topic.icon className="w-5 h-5" style={{ color: topic.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#0F172A" }}>{topic.title}</p>
                <p className="text-xs truncate" style={{ color: "rgba(15,23,42,0.45)" }}>{topic.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: topic.color }} />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
