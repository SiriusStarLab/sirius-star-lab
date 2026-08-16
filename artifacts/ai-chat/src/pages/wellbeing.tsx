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
    welcomeQuestion: "What draws you to vibration and frequency today? Choose a place to begin, or just tell me where you're at:",
    suggestions: [
      "I want to raise my vibration — where do I even start?",
      "Explain the real science behind sound healing",
      "What are solfeggio frequencies and do they actually work?",
      "I keep feeling energetically low and I don't know why",
      "Tell me something about reality that will genuinely surprise me",
    ],
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
    welcomeQuestion: "How are you feeling right now, and what are you hoping breathwork can do for you? Here are some places to start:",
    suggestions: [
      "I'm anxious and need to calm down right now",
      "Walk me through the Wim Hof method",
      "Teach me box breathing — step by step",
      "I want to use my breath to boost my energy",
      "Help me find a breathing practice for better sleep",
    ],
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
    welcomeQuestion: "What's your energy like right now? Let's start from where you are:",
    suggestions: [
      "I'm exhausted all the time — help me understand why",
      "I need sustained energy all day without relying on caffeine",
      "Tell me about chi, prana, and life force energy",
      "What is actually draining my energy?",
      "How do mitochondria affect the way I feel day to day?",
    ],
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
    welcomeQuestion: "What's your relationship with sleep like right now? Choose a starting point or tell me what's going on:",
    suggestions: [
      "I can't switch my mind off at night",
      "I want to understand my sleep cycles properly",
      "I wake up exhausted no matter how long I sleep",
      "What do dreams mean and why do we have them?",
      "What does genuinely deep restoration actually feel like?",
    ],
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
    welcomeQuestion: "Where are you with mindfulness right now? There's no wrong answer — just tell me where you're starting from:",
    suggestions: [
      "I've never tried it — where do I actually begin?",
      "I've tried meditation but I just can't stick to it",
      "What does the neuroscience actually say about mindfulness?",
      "I want to go deeper than surface-level meditation",
      "I'm always in my head — I need to find the present moment",
    ],
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
    welcomeQuestion: "What's drawing you to sound healing today? Pick a place to dive in:",
    suggestions: [
      "Does sound healing actually work? Give me the honest science",
      "What are binaural beats and how do I use them?",
      "Tell me about 432Hz and solfeggio frequencies",
      "I want to try something right now that will shift my state",
      "What's the difference between singing bowls and tuning forks?",
    ],
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
    welcomeQuestion: "How connected do you feel to natural light and the outdoors right now? Here are some starting points:",
    suggestions: [
      "I spend most of my day indoors and I can feel it affecting me",
      "Tell me about the morning sunlight protocol",
      "What is grounding and earthing — does it actually work?",
      "How do circadian rhythms affect everything about how I feel?",
      "I want to align my body clock with natural cycles",
    ],
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
    welcomeQuestion: "What brings you to heart coherence today? Let's find the right entry point for you:",
    suggestions: [
      "I'm dealing with a lot of stress and need real tools",
      "What is the HeartMath research and is it legit?",
      "How do I actually build heart coherence — practically?",
      "Tell me about the heart's electromagnetic field",
      "What is heart rate variability and why does it matter?",
    ],
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

function WellbeingChat({ topic, onBack }: { topic: typeof TOPICS[0] & { welcomeQuestion?: string; suggestions?: string[] }; onBack: () => void }) {
  const storageKey = `wellbeing_chat_${topic.id}_${getUserId()}`;
  const openingQuestion = topic.welcomeQuestion ?? `Welcome. You've chosen to explore **${topic.title}**.\n\nI'm ready when you are — just ask me anything.`;
  const welcomeMsg: ChatMsg = {
    role: "assistant",
    content: openingQuestion,
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
        {messages.length === 1 && topic.suggestions && topic.suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col gap-2 pt-1 pl-11">
            {topic.suggestions.map((s, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                onClick={() => send(s)}
                className="text-left text-sm px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2.5"
                style={{
                  background: "white",
                  border: `1px solid ${topic.color}30`,
                  color: "#1e293b",
                  boxShadow: `0 1px 6px ${topic.color}10`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${topic.color}0e`;
                  e.currentTarget.style.borderColor = `${topic.color}55`;
                  e.currentTarget.style.boxShadow = `0 2px 12px ${topic.color}22`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = `${topic.color}30`;
                  e.currentTarget.style.boxShadow = `0 1px 6px ${topic.color}10`;
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: topic.color }} />
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
        {messages.length === 1 && (!topic.suggestions || topic.suggestions.length === 0) && (
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

  const MOOD_CONFIG: Record<string, { color: string; bg: string; border: string; welcomeQuestion: string; suggestions: string[] }> = {
    peaceful: {
      color: "#059669", bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.2)",
      welcomeQuestion: "You're feeling peaceful — that's a beautiful state to be in. Let's go deeper with it. What would you like to explore?",
      suggestions: [
        "Help me anchor and extend this feeling of peace",
        "What practices will help me return to this state when I lose it?",
        "Tell me about the neuroscience of calm and peace",
        "What frequencies and sounds support this state?",
        "Take me somewhere unexpected from this peaceful place",
      ],
    },
    anxious: {
      color: "#0284c7", bg: "rgba(2,132,199,0.07)", border: "rgba(2,132,199,0.2)",
      welcomeQuestion: "You're feeling anxious — I've got you. Let's bring you back to calm. What would help most right now?",
      suggestions: [
        "Give me a breathing technique I can do right now",
        "Help me understand what's happening in my body",
        "Talk me through a grounding exercise step by step",
        "What does the science say about calming the nervous system?",
        "I need something I can use in the next 2 minutes",
      ],
    },
    energised: {
      color: "#d97706", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.2)",
      welcomeQuestion: "You're feeling energised — let's make the most of it. How do you want to channel this state?",
      suggestions: [
        "How do I sustain this energy and not burn it out?",
        "What is this energised state actually doing in my body?",
        "I want to use this to go deeper — take me somewhere interesting",
        "What practices amplify and direct this kind of energy?",
        "Tell me about the relationship between energy and consciousness",
      ],
    },
    tired: {
      color: "#7c3aed", bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.2)",
      welcomeQuestion: "You're tired — let's figure out what kind of tired, and what you actually need. Where shall we start?",
      suggestions: [
        "Help me understand why I'm so tired all the time",
        "What's the difference between physical and energetic exhaustion?",
        "Give me something I can do right now to restore myself",
        "Tell me about deep recovery — what does it actually require?",
        "I don't just want a nap — I want to fix this at the root",
      ],
    },
    low: {
      color: "#0891b2", bg: "rgba(8,145,178,0.07)", border: "rgba(8,145,178,0.2)",
      welcomeQuestion: "You're in a low place. That's okay — let's just be here for a moment and see what would help. No pressure:",
      suggestions: [
        "I don't want to be fixed — I just want to understand what's happening",
        "What does the body do when we feel low?",
        "Is there something gentle I can do to lift myself slightly?",
        "Tell me about the connection between mood and body chemistry",
        "What would genuinely help right now — not just distraction?",
      ],
    },
    open: {
      color: "#ea580c", bg: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.2)",
      welcomeQuestion: "You're feeling open and curious — the best state to explore from. Where shall we go?",
      suggestions: [
        "Take me somewhere I wouldn't normally think to look",
        "Tell me something about consciousness that will change how I see myself",
        "What's the most interesting thing happening in wellbeing science right now?",
        "I want to understand something deep about human potential",
        "Surprise me — take me wherever you think I need to go",
      ],
    },
  };

  const handleMoodSelected = (mood: string, prompt: string) => {
    const cfg = MOOD_CONFIG[mood] ?? { color: "#0891b2", bg: "rgba(8,145,178,0.07)", border: "rgba(8,145,178,0.2)", welcomeQuestion: undefined, suggestions: [] };
    const fakeTopic = {
      id: `mood-${mood}`,
      icon: Heart,
      emoji: "💗",
      title: "Wellbeing Check-in",
      subtitle: `You're feeling ${mood}`,
      color: cfg.color,
      bg: cfg.bg,
      border: cfg.border,
      prompt,
      welcomeQuestion: cfg.welcomeQuestion,
      suggestions: cfg.suggestions,
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
