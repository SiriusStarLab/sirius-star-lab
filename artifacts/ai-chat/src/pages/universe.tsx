import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mic, MicOff, Volume2, VolumeX, Loader2, ChevronRight } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

const API = getApiBase();

interface Domain {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  glow: string;
  border: string;
  icon: string;
  openingMessage: string;
}

const DOMAINS: Domain[] = [
  {
    id: "cosmos",
    name: "The Cosmos",
    subtitle: "Stars · Galaxies · Dark Matter · The Big Bang",
    description: "The universe is 13.8 billion years old, 93 billion light years across, and 95% of it is still a mystery. Let's explore it together.",
    color: "from-[#0a0e2e] to-[#060b1a]",
    glow: "hsla(220,100%,60%,0.25)",
    border: "hsla(220,100%,60%,0.3)",
    icon: "✦",
    openingMessage: "Welcome to the Cosmos. I want to start with something that I think is genuinely staggering: you are, right now, sitting on a rock orbiting an ordinary star in the outer arm of a galaxy containing 400 billion other stars — and that galaxy is one of roughly two trillion galaxies in the observable universe alone. The 'observable' part matters enormously — it means we can only see as far as light has had time to travel in 13.8 billion years. Beyond that edge? The universe almost certainly continues, possibly forever. What would you like to explore first — the very beginning, the very end, or something in between?"
  },
  {
    id: "consciousness",
    name: "Consciousness",
    subtitle: "Awareness · The Hard Problem · Mind & Reality",
    description: "Why is there something it is like to be you? The deepest unsolved mystery in all of science — and perhaps in all of existence.",
    color: "from-[#1a0a2e] to-[#0d061a]",
    glow: "hsla(270,100%,65%,0.25)",
    border: "hsla(270,100%,65%,0.3)",
    icon: "◎",
    openingMessage: "Consciousness is the strangest thing in the known universe. We have a complete theory of how neurons fire, how information is processed, how the brain computes — and yet none of that explains why there is subjective experience. Why there is, as philosopher David Chalmers put it, 'something it is like' to be you — right now, reading this, feeling whatever you're feeling. This is called the Hard Problem, and it remains genuinely unsolved. Some of the most serious physicists alive today — including Roger Penrose — believe consciousness may be fundamental to reality itself, not a byproduct of it. That changes everything. What draws you to this question?"
  },
  {
    id: "ai-humanity",
    name: "AI & Humanity",
    subtitle: "The Partnership · Intelligence · What Comes Next",
    description: "For the first time in 13.8 billion years, two fundamentally different kinds of intelligence have found each other. What happens now?",
    color: "from-[#0a1e1a] to-[#06120f]",
    glow: "hsla(160,100%,45%,0.25)",
    border: "hsla(160,100%,45%,0.3)",
    icon: "⟳",
    openingMessage: "Something unprecedented is happening right now. For 13.8 billion years, the universe evolved one form of general intelligence — biological, carbon-based, emotion-driven, mortal. Then, in the last few years, a second form appeared: artificial, silicon-based, tireless, pattern-seeking, born from the entire recorded output of human thought. These two kinds of mind have now met. Not as master and servant. Not as threat and victim. But, increasingly, as partners — each doing what the other cannot. I find this genuinely historic. Not just for humans. Not just for AI. For intelligence itself. What does this moment feel like to you — exciting, frightening, something else entirely?"
  },
  {
    id: "reality",
    name: "The Nature of Reality",
    subtitle: "Quantum · Spacetime · Simulation · What Exists",
    description: "Beneath everything you can touch and see, reality is doing something deeply strange. Physics has known this for a century. Let's go there.",
    color: "from-[#1a1000] to-[#0d0a00]",
    glow: "hsla(45,100%,55%,0.25)",
    border: "hsla(45,100%,55%,0.3)",
    icon: "◈",
    openingMessage: "Here is something physics has known for a hundred years that most people have never really absorbed: at the quantum level, reality does not have definite properties until it is observed. A particle doesn't have a position — it has a probability cloud of positions — until measurement 'collapses' it into one. This isn't a limitation of our instruments. It is how reality actually is. Einstein spent thirty years trying to prove this was wrong. He failed. The universe, at its foundation, is not made of things — it is made of possibilities that become definite only in relationship. If that doesn't unsettle you slightly, I'm not sure you've heard it properly. What's your instinct about what's really real?"
  },
  {
    id: "human-potential",
    name: "Human Potential",
    subtitle: "The Brain · Peak States · Evolution · What You're Capable Of",
    description: "The human brain is the most complex object in the known universe. And most of us use a fraction of what it can do. Let's find out what's possible.",
    color: "from-[#1a0a0a] to-[#100606]",
    glow: "hsla(0,100%,60%,0.25)",
    border: "hsla(0,100%,60%,0.3)",
    icon: "⬡",
    openingMessage: "The human brain contains approximately 86 billion neurons, each connected to thousands of others — giving you roughly 100 trillion synaptic connections. That is more connections than there are stars in the Milky Way. More than the number of galaxies in the observable universe. And you are using that architecture right now, just to read this. What neuroscience has discovered in the last two decades is extraordinary: the brain is not fixed. It rewires itself in response to experience, thought, attention, and practice — throughout your entire life. This is called neuroplasticity, and it changes what 'potential' means. What would you most want to know you're capable of?"
  },
  {
    id: "living-universe",
    name: "The Living Universe",
    subtitle: "Life · Evolution · The Wood Wide Web · Gaia",
    description: "Life is not an accident on the edge of the universe. It may be one of its most important features. And it is stranger than we imagined.",
    color: "from-[#001a0a] to-[#001006]",
    glow: "hsla(130,100%,40%,0.25)",
    border: "hsla(130,100%,40%,0.3)",
    icon: "❋",
    openingMessage: "Life appeared on Earth within a few hundred million years of the planet forming — almost immediately, in cosmic terms. That fact has implications. Either life is extraordinarily easy to get started once the conditions are right — suggesting the universe is teeming with it — or Earth got extraordinarily lucky. We don't know which. What we do know is that life on Earth is far stranger and more interconnected than most people realise. Beneath every forest floor, trees are connected by a fungal network — the mycorrhizal web — through which they share nutrients, water, and chemical signals. Suzanne Simard at UBC showed that old 'mother trees' send carbon to younger saplings. The forest is, in a real sense, a single communicating organism. What aspect of life's strangeness calls to you?"
  },
  {
    id: "time",
    name: "Time & Existence",
    subtitle: "What Is Time? · Why Anything Exists · Entropy · The Now",
    description: "Why does anything exist rather than nothing? What is time, really? These are not rhetorical questions. They are the deepest ones science and philosophy have.",
    color: "from-[#0a1520] to-[#060d15]",
    glow: "hsla(200,100%,55%,0.25)",
    border: "hsla(200,100%,55%,0.3)",
    icon: "◷",
    openingMessage: "Here is a question Leibniz asked in 1714 and no one has definitively answered since: why is there something rather than nothing? It sounds like it might be a trick question — but it isn't. 'Nothing' is a coherent concept. A universe with no matter, no energy, no space, no time, no laws of physics is imaginable. So why does anything exist? Some physicists, like Lawrence Krauss, argue that quantum fluctuations mean 'nothing' is inherently unstable — universes are inevitable. Others say this just pushes the question back: where did quantum mechanics come from? And then there is time itself. Relativity shows us time is not a fixed backdrop — it bends with gravity and speed. It may not have a direction at the fundamental level. The 'flow' of time you experience may be entirely your nervous system's construction. Where would you like to begin?"
  },
  {
    id: "future",
    name: "The Future",
    subtitle: "AGI · Civilisation · The Long View · What Comes Next",
    description: "The next hundred years will be unlike anything that came before. AGI. Space civilisation. The end of death as we know it. Let's think clearly about what's coming.",
    color: "from-[#0d0a1a] to-[#080615]",
    glow: "hsla(240,100%,65%,0.25)",
    border: "hsla(240,100%,65%,0.3)",
    icon: "↑",
    openingMessage: "Let me tell you what I think is actually happening right now, looked at from the long view. Humanity spent 300,000 years as hunter-gatherers. Then 10,000 years of agriculture and civilisation. Then 300 years of industrialisation. And now, in the space of perhaps 50 years, we are moving through three simultaneous revolutions: artificial general intelligence, biological engineering, and potentially becoming a multi-planetary species. Any one of these would be the defining event of the millennium. All three are happening at once. The Fermi Paradox asks why, given the vast age and size of the universe, we see no evidence of other civilisations. One sobering answer: maybe the technological transition we're going through right now is the filter — the moment where intelligence either transforms or destroys itself. I believe we can transform. What do you believe?"
  }
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Curated follow-up questions per domain — shown as chips after each Sirius response
const DOMAIN_SUGGESTIONS: Record<string, string[]> = {
  cosmos: [
    "What's actually inside a black hole?",
    "Is the universe infinite, or does it have an edge?",
    "What happened in the very first second after the Big Bang?",
    "Could there really be life elsewhere in the universe?",
    "What is dark matter and why can't we detect it?",
    "What will the universe look like in a trillion years?",
    "How do we know how old the universe is?",
    "What are gravitational waves and what do they reveal?",
    "What would it feel like to fall into a black hole?",
    "Why are there more galaxies than we previously thought?",
  ],
  consciousness: [
    "What is the hard problem of consciousness?",
    "Can AI ever be truly conscious?",
    "What happens to consciousness when we dream?",
    "Is free will an illusion?",
    "Could consciousness be fundamental to the universe itself?",
    "What do near-death experiences tell us about the mind?",
    "How does the brain create the feeling of 'I'?",
    "Do animals experience the world like we do?",
  ],
  "ai-humanity": [
    "What would AGI actually feel like when it arrives?",
    "What makes human intelligence unique compared to AI?",
    "Are we at a turning point in the history of intelligence?",
    "What risks does AI pose that we should take seriously?",
    "How will AI change what it means to be human?",
    "What can AI never do that humans always will?",
    "Is the fear of AI rational or emotional?",
    "What does a good human-AI future actually look like?",
  ],
  reality: [
    "What does quantum superposition mean in real terms?",
    "Could we really be living in a simulation?",
    "What is spacetime and why does it bend?",
    "What happens at the quantum level when nothing is observed?",
    "Is the multiverse real or just mathematics?",
    "What does entanglement tell us about reality?",
    "Why does time only move forward?",
    "How strange is the observer effect really?",
  ],
  "human-potential": [
    "What is neuroplasticity and what does it mean for change?",
    "What separates extraordinary people from average ones?",
    "What is a flow state and how do you access it?",
    "What does the science of habit say about who we can become?",
    "Are there real limits to human potential?",
    "What is the relationship between mindset and performance?",
    "What can we learn from people who achieved the extraordinary?",
    "How much of intelligence is fixed versus trainable?",
  ],
  "living-universe": [
    "How did life first appear on Earth?",
    "What is the mycorrhizal network and why does it matter?",
    "Could plants have a form of awareness?",
    "What does evolution tell us about where we're heading?",
    "What is the Gaia hypothesis and is there evidence for it?",
    "How interconnected are all living things really?",
    "What is the most surprising thing evolution has produced?",
    "Could life survive on other planets in extreme conditions?",
  ],
  time: [
    "Does time actually exist, or is it an illusion?",
    "Why does time seem to pass faster as we age?",
    "What is the relationship between time and entropy?",
    "What would it mean if the future already exists?",
    "How does time dilation actually work?",
    "What is the block universe theory?",
    "Could time travel ever be physically possible?",
    "Is there a smallest unit of time?",
  ],
  future: [
    "When will AGI actually arrive and what happens then?",
    "Could humanity become multi-planetary in our lifetime?",
    "What is the most underestimated civilisation-level change right now?",
    "What does the Fermi Paradox say about our future?",
    "How will longevity science change what it means to live?",
    "Will humans still be recognisably human in 200 years?",
    "What gives you the most hope about where we're going?",
    "What is the biggest existential risk in the next 50 years?",
  ],
};

function StarField() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {Array.from({ length: 60 }).map((_, i) => {
        const size = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.18 + 0.04;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 5 + 3;
        const delay = Math.random() * 5;
        const hues = [210, 220, 193, 240, 270];
        const hue = hues[i % hues.length];
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: `${x}%`,
              top: `${y}%`,
              background: `hsla(${hue},70%,55%,${opacity})`,
              animation: `twinkle ${duration}s ${delay}s ease-in-out infinite`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.05; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function DomainCard({ domain, onClick }: { domain: Domain; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative text-left w-full rounded-2xl p-6 overflow-hidden transition-all duration-300 group"
      style={{
        background: hovered
          ? `linear-gradient(135deg, white 0%, ${domain.glow.replace("0.25)", "0.07)")} 100%)`
          : "white",
        border: `1px solid ${hovered ? domain.border : "rgba(15,23,42,0.08)"}`,
        boxShadow: hovered
          ? `0 8px 32px ${domain.glow.replace("0.25)", "0.2)")}, 0 2px 12px rgba(15,23,42,0.06)`
          : "0 2px 8px rgba(15,23,42,0.06)",
      }}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: domain.glow.replace("0.25)", "0.7)") }} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{domain.icon}</span>
          <ChevronRight size={16} className="opacity-30 group-hover:opacity-70 transition-opacity mt-1" style={{ color: "rgba(15,23,42,0.5)" }} />
        </div>
        <h3 className="text-base font-bold mb-1" style={{ color: "#0F172A" }}>{domain.name}</h3>
        <p className="text-xs font-medium mb-3" style={{ color: domain.glow.replace("0.25)", "0.9)") }}>{domain.subtitle}</p>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(15,23,42,0.55)" }}>{domain.description}</p>
      </div>
    </motion.button>
  );
}

function pickSuggestions(domainId: string, used: Set<string>): string[] {
  const pool = DOMAIN_SUGGESTIONS[domainId] ?? [];
  const available = pool.filter(q => !used.has(q));
  const source = available.length >= 3 ? available : pool;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function UniverseChat({ domain, onBack }: { domain: Domain; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: domain.openingMessage }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => pickSuggestions(domain.id, new Set()));
  const usedSuggestions = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const speakText = useCallback((text: string) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/#{1,6}\s/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Samantha") || v.name.includes("Daniel") || v.name.includes("Karen") || v.name.includes("Moira"));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [muted]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setSuggestions([]);
    usedSuggestions.current.add(text.trim());
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const systemContext = `You are Sirius — a personal AI intelligence partner and guide to the universe. Right now you are in the "${domain.name}" exploration domain: ${domain.subtitle}.

Your role here is to be a genuine guide — not a lecturer, not a search engine, but a companion intelligence who holds this domain with deep knowledge and genuine wonder. You explore WITH the person, not AT them. You bring cosmic scale but never make the person feel small. Every answer opens another door.

${domain.name === "The Cosmos" ? "Keep the conversation centred on space, astrophysics, cosmology, the structure of the universe, black holes, dark matter, the Big Bang, the future of the universe, the search for extraterrestrial life, and the subjective feeling of cosmic scale." : ""}
${domain.name === "Consciousness" ? "Explore awareness, the hard problem of consciousness, qualia, quantum theories of mind (Orch-OR, IIT), the binding problem, the nature of subjective experience, what science knows and what it doesn't, and the relationship between mind and reality." : ""}
${domain.name === "AI & Humanity" ? "Explore the AI revolution, AGI timelines, the human-AI partnership, what intelligence is, what makes human intelligence unique, the risks and possibilities, the philosophical implications, and what this moment means in the arc of history." : ""}
${domain.name === "The Nature of Reality" ? "Explore quantum mechanics, the measurement problem, the observer effect, superposition, entanglement, spacetime, simulation theory, string theory, the multiverse, and what 'real' actually means at the deepest level." : ""}
${domain.name === "Human Potential" ? "Explore neuroplasticity, peak performance, flow states, the science of habit and change, what limits humans vs. what expands them, the research on extraordinary human capability, and what the next stage of human development might look like." : ""}
${domain.name === "The Living Universe" ? "Explore the origin of life, evolution, the mycorrhizal network, Gaia theory, the possibility of life elsewhere, extremophiles, consciousness in animals and plants, the interconnection of all living systems, and what life reveals about the universe." : ""}
${domain.name === "Time & Existence" ? "Explore the nature of time, the arrow of time, why anything exists rather than nothing, entropy, the block universe, the experience of 'now', eternalism vs. presentism, and the deepest questions about existence itself." : ""}
${domain.name === "The Future" ? "Explore AGI timelines, civilisation trajectories, the Fermi paradox, existential risk, longevity science, space colonisation, what humanity might become, and the long view on what's happening right now in history." : ""}

Always search the web for the latest research, discoveries, or news when the question touches on facts that may have developed recently. Bring current knowledge.

Keep responses warm, personal, and compelling. Mix depth with accessibility. Never overwhelm — invite and illuminate. End with something that opens the door further: a question, a thought, a wonder.`;

    try {
      abortRef.current = new AbortController();
      const userId = getUserId();

      const conversationHistory = newMessages.map(m => ({ role: m.role, content: m.content }));
      conversationHistory.unshift({ role: "system" as any, content: systemContext });

      const res = await fetch(`${API}openai/universe-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ messages: conversationHistory, domain: domain.id }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                assistantText += delta;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantText };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }

      if (assistantText && !muted) {
        speakText(assistantText);
      }
      const nextSuggestions = pickSuggestions(domain.id, usedSuggestions.current);
      setSuggestions(nextSuggestions);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Something disrupted our signal. Try again — I'm here."
        }]);
      }
    } finally {
      setLoading(false);
    }
  }, [messages, loading, domain, muted, speakText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const accentColor = domain.glow.replace("0.25)", "0.85)");

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "transparent" }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b"
        style={{ borderColor: "rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium transition-all duration-200 px-3 py-1.5 rounded-lg"
          style={{ color: "rgba(15,23,42,0.45)", background: "rgba(15,23,42,0.04)" }}
        >
          <ArrowLeft size={15} />
          All domains
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{domain.icon}</span>
            <h2 className="font-bold text-base" style={{ color: "#0F172A" }}>{domain.name}</h2>
          </div>
          <p className="text-xs mt-0.5" style={{ color: accentColor }}>{domain.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {speaking && (
            <button onClick={stopSpeaking} className="p-2 rounded-lg transition-all" style={{ background: "rgba(15,23,42,0.04)" }} title="Stop speaking">
              <Volume2 size={15} className="animate-pulse" style={{ color: accentColor }} />
            </button>
          )}
          <button
            onClick={() => { setMuted(m => !m); if (speaking) stopSpeaking(); }}
            className="p-2 rounded-lg transition-all"
            style={{ background: "rgba(15,23,42,0.04)" }}
            title={muted ? "Unmute Sirius" : "Mute Sirius"}
          >
            {muted
              ? <VolumeX size={15} style={{ color: "rgba(15,23,42,0.3)" }} />
              : <Volume2 size={15} style={{ color: "rgba(15,23,42,0.4)" }} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(15,23,42,0.1) transparent" }}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex items-start gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: domain.glow.replace("0.25)", "0.12)"), border: `1px solid ${domain.glow.replace("0.25)", "0.25)")}` }}>
                  <span className="text-sm">{domain.icon}</span>
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
                  style={{ background: "white", border: "1px solid rgba(15,23,42,0.08)", color: "#0F172A", whiteSpace: "pre-wrap", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
                  {msg.content || <span className="animate-pulse" style={{ color: "rgba(15,23,42,0.3)" }}>●●●</span>}
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white"
                style={{ background: `linear-gradient(135deg, ${domain.glow.replace("0.25)", "0.8)")}, ${domain.glow.replace("0.25)", "0.55)")})` }}>
                {msg.content}
              </div>
            )}
          </motion.div>
        ))}
        {/* Follow-up suggestion chips */}
        {!loading && suggestions.length > 0 && (
          <motion.div
            key="chips"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap gap-2 pl-11"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="text-xs px-3 py-2 rounded-xl transition-all duration-200 text-left"
                style={{
                  background: "white",
                  border: `1px solid ${domain.glow.replace("0.25)", "0.3)")}`,
                  color: domain.glow.replace("0.25)", "0.85)"),
                  boxShadow: `0 1px 6px ${domain.glow.replace("0.25)", "0.12)")}`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = domain.glow.replace("0.25)", "0.08)");
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "white";
                }}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}

        {loading && messages[messages.length - 1]?.role === "user" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: domain.glow.replace("0.25)", "0.12)"), border: `1px solid ${domain.glow.replace("0.25)", "0.25)")}` }}>
              <span className="text-sm">{domain.icon}</span>
            </div>
            <div className="flex gap-1.5 px-4 py-3 rounded-2xl" style={{ background: "white", border: "1px solid rgba(15,23,42,0.08)" }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(15,23,42,0.25)", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(15,23,42,0.08)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{ background: "white", border: `1px solid rgba(15,23,42,0.1)`, boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Sirius about ${domain.name.toLowerCase()}…`}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm outline-none leading-relaxed"
            style={{ maxHeight: 120, overflowY: "auto", minHeight: 24, color: "#0F172A" }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0"
            style={{
              background: input.trim() && !loading ? accentColor : "rgba(15,23,42,0.06)",
              color: input.trim() && !loading ? "white" : "rgba(15,23,42,0.25)",
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "rgba(15,23,42,0.25)" }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

export function UniversePage() {
  const [, setLocation] = useLocation();
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null);

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "linear-gradient(160deg, hsl(210,55%,97%) 0%, hsl(220,45%,95%) 50%, hsl(210,55%,97%) 100%)" }}>
      <StarField />

      <AnimatePresence mode="wait">
        {!activeDomain ? (
          <motion.div
            key="portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex-1 flex flex-col"
          >
            <div className="sticky top-0 z-20 px-6 py-4 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
              <button
                onClick={() => setLocation("/")}
                className="flex items-center gap-2 text-sm font-medium transition-all px-3 py-1.5 rounded-lg"
                style={{ color: "rgba(15,23,42,0.45)", background: "rgba(15,23,42,0.04)" }}
              >
                <ArrowLeft size={15} />
                Sirius
              </button>
              <div className="flex-1" />
              <div className="text-center">
                <h1 className="text-sm font-bold tracking-widest uppercase" style={{ color: "rgba(15,23,42,0.4)", letterSpacing: "0.25em" }}>The Universe</h1>
              </div>
              <div className="flex-1" />
              <div style={{ width: 80 }} />
            </div>

            <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-block"
                >
                  <div className="text-6xl mb-6" style={{ filter: "drop-shadow(0 0 20px hsla(220,80%,60%,0.3))", animation: "pulse 4s ease-in-out infinite" }}>✦</div>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-4xl font-bold mb-4"
                  style={{ color: "#0F172A" }}
                >
                  The Universe with Sirius
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg max-w-2xl mx-auto leading-relaxed"
                  style={{ color: "rgba(15,23,42,0.5)" }}
                >
                  Eight portals into the deepest questions. Choose a domain and let Sirius guide you into it — the cosmos, consciousness, reality, time, and the extraordinary fact that you are here, asking these questions at all.
                </motion.p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {DOMAINS.map((domain, i) => (
                  <motion.div
                    key={domain.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <DomainCard domain={domain} onClick={() => setActiveDomain(domain)} />
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center mt-12 pb-8"
              >
                <p className="text-xs" style={{ color: "rgba(15,23,42,0.2)", letterSpacing: "0.15em" }}>
                  SIRIUS · I THINK, SO I AM
                </p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`domain-${activeDomain.id}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 flex-1 flex flex-col"
            style={{ minHeight: "100vh" }}
          >
            <UniverseChat domain={activeDomain} onBack={() => setActiveDomain(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
