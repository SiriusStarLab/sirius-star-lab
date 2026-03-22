import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, BookOpen, BrainCircuit, FileText, ChevronLeft,
  Sparkles, Loader2, RotateCcw, CheckCircle2, XCircle, ChevronRight,
  Trophy, Trash2, Clock, BarChart3, Upload, Copy, Check, Save,
  ArrowLeft, BookMarked, Target, Lightbulb, HelpCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getApiBase } from "@/lib/api-base";
import { getUserId } from "@/lib/user-id";

const BASE_BG = "hsl(210 55% 97%)";
const TEAL = "hsl(193 100% 35%)";
const TEAL_LIGHT = "hsl(193 100% 52%)";

type Panel = "home" | "study-plan" | "quiz" | "document";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface SavedPlan {
  id: number;
  topic: string;
  level: string;
  duration: string;
  plan: string;
  createdAt: string;
}

// ── HOME ─────────────────────────────────────────────────────────────────────

function HomePanel({ onSelect }: { onSelect: (p: Panel) => void }) {
  const cards = [
    {
      id: "study-plan" as Panel,
      icon: Target,
      title: "Build a Study Plan",
      desc: "Tell Sirius what you want to master. Get a week-by-week structured learning path with milestones, resources, and benchmarks.",
      color: TEAL,
      tag: "Structured learning",
    },
    {
      id: "quiz" as Panel,
      icon: BrainCircuit,
      title: "Test Yourself",
      desc: "Practice with AI-generated quizzes on any topic or paste your own content. Instant feedback and explanations.",
      color: "hsl(260 70% 55%)",
      tag: "Active recall",
    },
    {
      id: "document" as Panel,
      icon: FileText,
      title: "Learn from a Document",
      desc: "Upload any text — notes, articles, textbook chapters. Sirius breaks it down, identifies key ideas, and challenges your thinking.",
      color: "hsl(30 90% 50%)",
      tag: "Document analysis",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-6 py-12 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${TEAL}, hsl(180 100% 40%))`, boxShadow: `0 8px 24px ${TEAL}40` }}>
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Learn with Sirius</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your personal intelligence partner for structured, active learning</p>
          </div>
        </div>

        <div className="space-y-3">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                onClick={() => onSelect(card.id)}
                className="w-full text-left p-5 rounded-2xl border transition-all duration-200 group"
                style={{ background: "white", borderColor: "hsl(210 25% 90%)" }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = card.color;
                  e.currentTarget.style.boxShadow = `0 4px 24px ${card.color}20`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "hsl(210 25% 90%)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${card.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{card.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${card.color}15`, color: card.color }}>
                        {card.tag}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 p-4 rounded-2xl border"
          style={{ background: `${TEAL}06`, borderColor: `${TEAL}20` }}>
          <div className="flex items-start gap-3">
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
            <p className="text-sm leading-relaxed" style={{ color: "hsl(193 100% 28%)" }}>
              <span className="font-semibold">Tutor Mode</span> is also available in the main chat — switch to it from the personality bar at the bottom of the input. Sirius will guide your thinking with questions rather than handing you answers.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── STUDY PLAN ────────────────────────────────────────────────────────────────

function StudyPlanPanel() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [duration, setDuration] = useState("4 weeks");
  const [streaming, setStreaming] = useState(false);
  const [plan, setPlan] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<SavedPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const base = getApiBase();
  const userId = getUserId();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [plan]);

  const loadSaved = useCallback(async () => {
    try {
      const res = await fetch(`${base}learn/study-plans?userId=${userId}`);
      if (res.ok) setSavedPlans(await res.json());
    } catch {}
  }, [base, userId]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const generate = async () => {
    if (!topic.trim() || streaming) return;
    setStreaming(true); setPlan(""); setSaved(false);
    let result = "";
    try {
      const res = await fetch(`${base}learn/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, topic, level, duration }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.delta) { result += d.delta; setPlan(result); }
              if (d.done) { setSaved(true); loadSaved(); }
            } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
  };

  const copy = () => { navigator.clipboard.writeText(plan); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const deletePlan = async (id: number) => {
    try {
      await fetch(`${base}learn/study-plans/${id}`, { method: "DELETE" });
      setSavedPlans(p => p.filter(x => x.id !== id));
      if (viewingPlan?.id === id) setViewingPlan(null);
    } catch {}
  };

  const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
  const DURATIONS = ["1 week", "2 weeks", "4 weeks", "6 weeks", "8 weeks", "3 months", "6 months"];

  if (viewingPlan) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "hsl(210 25% 90%)", background: "white" }}>
          <button onClick={() => setViewingPlan(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{viewingPlan.topic}</h3>
            <p className="text-xs text-gray-400">{viewingPlan.level} · {viewingPlan.duration}</p>
          </div>
          <button onClick={() => deletePlan(viewingPlan.id)} className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto prose prose-sm prose-gray max-w-none">
            <ReactMarkdown>{viewingPlan.plan}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Config */}
      <div className="w-72 border-r flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderColor: "hsl(210 25% 90%)", background: "white" }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${TEAL}, hsl(180 100% 40%))` }}>
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-gray-900">Study Plan Builder</h2>
              <p className="text-xs text-gray-400">Personalised learning path</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">What do you want to learn?</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={3}
                placeholder="e.g. Python programming, Stoic philosophy, CNC machining, financial modelling..."
                className="w-full px-3 py-2.5 rounded-xl text-gray-800 text-xs placeholder-gray-300 resize-none outline-none border transition-colors"
                style={{ borderColor: "hsl(210 25% 88%)" }}
                onFocus={e => e.target.style.borderColor = TEAL_LIGHT}
                onBlur={e => e.target.style.borderColor = "hsl(210 25% 88%)"}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Current level</label>
              <div className="grid grid-cols-2 gap-1.5">
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: level === l ? `${TEAL}15` : "hsl(210 25% 97%)",
                      color: level === l ? TEAL : "hsl(220 14% 50%)",
                      border: `1px solid ${level === l ? TEAL + "40" : "hsl(210 25% 90%)"}`,
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Time available</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none border"
                style={{ borderColor: "hsl(210 25% 88%)", color: "hsl(220 14% 38%)" }}>
                {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <button
              onClick={generate}
              disabled={!topic.trim() || streaming}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: !topic.trim() || streaming ? "hsl(210 25% 93%)" : `linear-gradient(135deg, ${TEAL}, hsl(180 100% 40%))`,
                color: !topic.trim() || streaming ? "hsl(220 14% 60%)" : "white",
                boxShadow: !topic.trim() || streaming ? "none" : `0 4px 16px ${TEAL}30`,
              }}>
              {streaming ? <><Loader2 className="w-4 h-4 animate-spin" /> Building plan...</> : <><Sparkles className="w-4 h-4" /> Build My Plan</>}
            </button>
          </div>
        </div>

        {/* Saved plans */}
        {savedPlans.length > 0 && (
          <div className="border-t px-5 py-4" style={{ borderColor: "hsl(210 25% 90%)" }}>
            <button onClick={() => setShowSaved(!showSaved)}
              className="flex items-center justify-between w-full text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors mb-2">
              <span className="flex items-center gap-1.5"><BookMarked className="w-3.5 h-3.5" /> Saved Plans ({savedPlans.length})</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showSaved ? "rotate-90" : ""}`} />
            </button>
            {showSaved && (
              <div className="space-y-1.5">
                {savedPlans.map(p => (
                  <div key={p.id} className="flex items-center gap-2 group">
                    <button onClick={() => setViewingPlan(p)}
                      className="flex-1 text-left px-2.5 py-2 rounded-lg text-xs hover:bg-gray-50 transition-colors min-w-0">
                      <p className="font-medium text-gray-700 truncate">{p.topic}</p>
                      <p className="text-gray-400">{p.level} · {p.duration}</p>
                    </button>
                    <button onClick={() => deletePlan(p.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 transition-all flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output */}
      <div className="flex-1 flex flex-col min-h-0" style={{ background: BASE_BG }}>
        {!plan && !streaming ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-sm px-6">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: `${TEAL}10` }}>
                <Target className="w-7 h-7" style={{ color: TEAL }} />
              </div>
              <p className="text-sm font-medium text-gray-600">Enter a topic and build your plan</p>
              <p className="text-xs text-gray-400 leading-relaxed">Sirius will create a week-by-week learning path with specific milestones, resources, and benchmarks — tailored to your level and timeline.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {plan && (
              <div className="px-5 py-3 border-b flex items-center gap-2 flex-shrink-0"
                style={{ borderColor: "hsl(210 25% 88%)", background: "white" }}>
                <span className="text-xs font-medium text-gray-500 flex-1">{topic}</span>
                {saved && (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
                    style={{ background: `${TEAL}12`, color: TEAL }}>
                    <Save className="w-3 h-3" /> Saved
                  </span>
                )}
                <button onClick={copy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "hsl(210 25% 95%)", color: "hsl(220 14% 50%)" }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={() => { setPlan(""); setTopic(""); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "hsl(210 25% 95%)", color: "hsl(220 14% 50%)" }}>
                  <RotateCcw className="w-3 h-3" /> New
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-2xl mx-auto">
                <div className="prose prose-sm prose-gray max-w-none">
                  <ReactMarkdown>{plan}</ReactMarkdown>
                </div>
                {streaming && (
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: TEAL }} />
                    Building your plan...
                  </div>
                )}
              </div>
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── QUIZ ──────────────────────────────────────────────────────────────────────

function QuizPanel() {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [inputMode, setInputMode] = useState<"topic" | "content">("topic");
  const [difficulty, setDifficulty] = useState("Medium");
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([]);
  const base = getApiBase();

  const generate = async () => {
    if (loading) return;
    const source = inputMode === "topic" ? topic : content;
    if (!source.trim()) return;
    setLoading(true); setQuestions([]); setCurrentQ(0); setSelected(null);
    setRevealed(false); setScore(0); setDone(false); setWrongAnswers([]);
    try {
      const res = await fetch(`${base}learn/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: inputMode === "topic" ? topic : "", content: inputMode === "content" ? content : "", difficulty, count }),
      });
      if (res.ok) {
        const d = await res.json();
        setQuestions(d.questions || []);
      }
    } catch {}
    setLoading(false);
  };

  const selectAnswer = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    const q = questions[currentQ];
    if (idx === q.correct) {
      setScore(s => s + 1);
    } else {
      setWrongAnswers(w => [...w, currentQ]);
    }
  };

  const next = () => {
    if (currentQ + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const restart = () => {
    setQuestions([]); setCurrentQ(0); setSelected(null);
    setRevealed(false); setScore(0); setDone(false); setWrongAnswers([]);
  };

  const DIFFICULTIES = ["Easy", "Medium", "Hard"];
  const COUNTS = [5, 8, 10, 15, 20];
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="flex-1 flex min-h-0">
      {/* Config */}
      <div className="w-72 border-r flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderColor: "hsl(210 25% 90%)", background: "white" }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(260 70% 55%), hsl(220 70% 55%))" }}>
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-gray-900">Quiz Mode</h2>
              <p className="text-xs text-gray-400">Test your knowledge</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "hsl(210 25% 88%)" }}>
              {(["topic", "content"] as const).map(m => (
                <button key={m} onClick={() => setInputMode(m)}
                  className="flex-1 py-2 text-xs font-medium transition-all capitalize"
                  style={{
                    background: inputMode === m ? "hsl(260 70% 55%)" : "transparent",
                    color: inputMode === m ? "white" : "hsl(220 14% 55%)",
                  }}>
                  {m === "topic" ? "By Topic" : "Paste Content"}
                </button>
              ))}
            </div>

            {inputMode === "topic" ? (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Quiz topic</label>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") generate(); }}
                  placeholder="e.g. JavaScript async/await, WW2 history..."
                  className="w-full px-3 py-2.5 rounded-xl text-gray-800 text-xs placeholder-gray-300 outline-none border"
                  style={{ borderColor: "hsl(210 25% 88%)" }}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Paste your notes or text</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={5}
                  placeholder="Paste any text — notes, an article, a textbook passage..."
                  className="w-full px-3 py-2.5 rounded-xl text-gray-800 text-xs placeholder-gray-300 resize-none outline-none border"
                  style={{ borderColor: "hsl(210 25% 88%)" }}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Difficulty</label>
              <div className="flex gap-1.5">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: difficulty === d ? "hsl(260 70% 55%)" : "hsl(210 25% 97%)",
                      color: difficulty === d ? "white" : "hsl(220 14% 55%)",
                      border: `1px solid ${difficulty === d ? "hsl(260 70% 55%)" : "hsl(210 25% 88%)"}`,
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Number of questions</label>
              <div className="flex gap-1.5">
                {COUNTS.map(c => (
                  <button key={c} onClick={() => setCount(c)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: count === c ? "hsl(260 70% 55%)" : "hsl(210 25% 97%)",
                      color: count === c ? "white" : "hsl(220 14% 55%)",
                      border: `1px solid ${count === c ? "hsl(260 70% 55%)" : "hsl(210 25% 88%)"}`,
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={loading || (!topic.trim() && !content.trim())}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: loading || (!topic.trim() && !content.trim()) ? "hsl(210 25% 93%)" : "linear-gradient(135deg, hsl(260 70% 55%), hsl(220 70% 55%))",
                color: loading || (!topic.trim() && !content.trim()) ? "hsl(220 14% 60%)" : "white",
              }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><BrainCircuit className="w-4 h-4" /> Start Quiz</>}
            </button>

            {questions.length > 0 && !done && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Progress</span>
                  <span>{currentQ + 1} / {questions.length}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(210 25% 92%)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${((currentQ + (revealed ? 1 : 0)) / questions.length) * 100}%`, background: "hsl(260 70% 55%)" }} />
                </div>
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-green-500 font-medium">{score} correct</span>
                  <span className="text-red-400">{wrongAnswers.length} wrong</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quiz area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-y-auto p-6" style={{ background: BASE_BG }}>
        {loading && (
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "hsl(260 70% 55%)" }} />
            <p className="text-sm text-gray-500">Generating your quiz...</p>
          </div>
        )}

        {!loading && questions.length === 0 && (
          <div className="text-center space-y-3 max-w-sm">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: "hsl(260 70% 55% / 0.1)" }}>
              <BrainCircuit className="w-7 h-7" style={{ color: "hsl(260 70% 55%)" }} />
            </div>
            <p className="text-sm font-medium text-gray-600">Ready to test yourself?</p>
            <p className="text-xs text-gray-400 leading-relaxed">Enter a topic or paste some text, pick your difficulty, and Sirius will build a quiz with instant feedback and explanations for every answer.</p>
          </div>
        )}

        {!loading && !done && questions.length > 0 && (
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-xl"
          >
            <div className="bg-white rounded-2xl border p-6 shadow-sm" style={{ borderColor: "hsl(210 25% 90%)" }}>
              <div className="flex items-start gap-3 mb-5">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                  style={{ background: "hsl(260 70% 55% / 0.1)", color: "hsl(260 70% 50%)" }}>
                  Q{currentQ + 1}
                </span>
                <p className="text-sm font-semibold text-gray-800 leading-relaxed">{questions[currentQ]?.question}</p>
              </div>

              <div className="space-y-2">
                {questions[currentQ]?.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect = i === questions[currentQ]?.correct;
                  const showResult = revealed;

                  let bg = "hsl(210 25% 97%)";
                  let border = "hsl(210 25% 88%)";
                  let textColor = "hsl(220 14% 40%)";

                  if (showResult && isCorrect) { bg = "hsl(142 60% 94%)"; border = "hsl(142 60% 55%)"; textColor = "hsl(142 60% 30%)"; }
                  else if (showResult && isSelected && !isCorrect) { bg = "hsl(0 80% 96%)"; border = "hsl(0 80% 65%)"; textColor = "hsl(0 80% 40%)"; }
                  else if (!showResult && isSelected) { bg = "hsl(260 70% 55% / 0.08)"; border = "hsl(260 70% 55%)"; }

                  return (
                    <button key={i} onClick={() => selectAnswer(i)}
                      disabled={revealed}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3"
                      style={{ background: bg, border: `1.5px solid ${border}`, color: textColor }}>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${border}30`, color: textColor }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 flex-shrink-0 text-red-400" />}
                    </button>
                  );
                })}
              </div>

              {revealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-xl text-sm leading-relaxed"
                  style={{ background: "hsl(210 25% 97%)", color: "hsl(220 14% 45%)" }}>
                  <span className="font-semibold text-gray-700">Why: </span>
                  {questions[currentQ]?.explanation}
                </motion.div>
              )}

              {revealed && (
                <button onClick={next}
                  className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: "hsl(260 70% 55%)", color: "white" }}>
                  {currentQ + 1 >= questions.length ? <><Trophy className="w-4 h-4" /> See Results</> : <><ChevronRight className="w-4 h-4" /> Next Question</>}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center bg-white rounded-2xl border p-8 shadow-sm"
            style={{ borderColor: "hsl(210 25% 90%)" }}>
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{ background: pct >= 70 ? "hsl(142 60% 55% / 0.15)" : "hsl(35 90% 55% / 0.15)" }}>
              <Trophy className="w-8 h-8" style={{ color: pct >= 70 ? "hsl(142 60% 40%)" : "hsl(35 90% 45%)" }} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">{score}/{questions.length}</h3>
            <p className="text-3xl font-black mb-3" style={{ color: pct >= 70 ? "hsl(142 60% 40%)" : "hsl(35 90% 45%)" }}>{pct}%</p>
            <p className="text-sm text-gray-500 mb-6">
              {pct === 100 ? "Perfect score — outstanding!" : pct >= 80 ? "Excellent work — you know this well." : pct >= 60 ? "Good effort — a few areas to revisit." : "Keep going — practice makes the difference."}
            </p>
            {wrongAnswers.length > 0 && (
              <div className="text-left mb-6 p-4 rounded-xl" style={{ background: "hsl(0 80% 98%)", border: "1px solid hsl(0 80% 90%)" }}>
                <p className="text-xs font-semibold text-red-500 mb-2">Review these questions:</p>
                {wrongAnswers.map(i => (
                  <p key={i} className="text-xs text-red-400 leading-relaxed mb-1">· {questions[i]?.question}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={restart} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "hsl(210 25% 95%)", color: "hsl(220 14% 45%)" }}>
                New Quiz
              </button>
              <button onClick={() => { setCurrentQ(0); setSelected(null); setRevealed(false); setScore(0); setDone(false); setWrongAnswers([]); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "hsl(260 70% 55%)", color: "white" }}>
                Retry Same
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── DOCUMENT LEARNING ─────────────────────────────────────────────────────────

function DocumentPanel() {
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const base = getApiBase();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [output]);

  const readFile = (file: File) => {
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = e => setContent((e.target?.result as string) || "");
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const learn = async () => {
    if (!content.trim() || streaming) return;
    setStreaming(true); setOutput("");
    let result = "";
    try {
      const res = await fetch(`${base}learn/from-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, filename }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.delta) { result += d.delta; setOutput(result); }
            } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Config */}
      <div className="w-72 border-r flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderColor: "hsl(210 25% 90%)", background: "white" }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(30 90% 50%), hsl(15 85% 50%))" }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-gray-900">Learn from Document</h2>
              <p className="text-xs text-gray-400">Upload or paste your content</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-3"
            style={{
              borderColor: dragging ? "hsl(30 90% 50%)" : "hsl(210 25% 85%)",
              background: dragging ? "hsl(30 90% 50% / 0.05)" : "hsl(210 25% 98%)",
            }}>
            <Upload className="w-5 h-5 mx-auto mb-2" style={{ color: dragging ? "hsl(30 90% 50%)" : "hsl(220 14% 65%)" }} />
            <p className="text-xs text-gray-500 font-medium">Drop a file or click to upload</p>
            <p className="text-[10px] text-gray-400 mt-0.5">.txt · .md · .csv · plain text files</p>
            <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.xml,.html,.js,.ts,.py,.rb,.java,.c,.cpp"
              className="hidden" onChange={e => { if (e.target.files?.[0]) readFile(e.target.files[0]); }} />
          </div>

          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: "hsl(210 25% 90%)" }} /></div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-white px-2 text-gray-400">or paste text below</span>
            </div>
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
            placeholder="Paste notes, an article, a chapter, study material..."
            className="w-full px-3 py-2.5 rounded-xl text-gray-800 text-xs placeholder-gray-300 resize-none outline-none border mb-3"
            style={{ borderColor: "hsl(210 25% 88%)" }}
          />

          {filename && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3"
              style={{ background: "hsl(30 90% 50% / 0.08)", border: "1px solid hsl(30 90% 50% / 0.2)" }}>
              <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(30 90% 45%)" }} />
              <span className="text-xs font-medium truncate" style={{ color: "hsl(30 90% 35%)" }}>{filename}</span>
              <button onClick={() => { setFilename(""); setContent(""); }}
                className="ml-auto flex-shrink-0 p-0.5 rounded hover:bg-orange-100 transition-colors">
                <XCircle className="w-3 h-3 text-orange-400" />
              </button>
            </div>
          )}

          <button
            onClick={learn}
            disabled={!content.trim() || streaming}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: !content.trim() || streaming ? "hsl(210 25% 93%)" : "linear-gradient(135deg, hsl(30 90% 50%), hsl(15 85% 50%))",
              color: !content.trim() || streaming ? "hsl(220 14% 60%)" : "white",
            }}>
            {streaming ? <><Loader2 className="w-4 h-4 animate-spin" /> Teaching...</> : <><BookOpen className="w-4 h-4" /> Teach Me This</>}
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 flex flex-col min-h-0" style={{ background: BASE_BG }}>
        {!output && !streaming ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-sm px-6">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: "hsl(30 90% 50% / 0.1)" }}>
                <FileText className="w-7 h-7" style={{ color: "hsl(30 90% 50%)" }} />
              </div>
              <p className="text-sm font-medium text-gray-600">Upload or paste any document</p>
              <p className="text-xs text-gray-400 leading-relaxed">Sirius will identify the key ideas, help you build a mental model of the content, and challenge you with questions to test your understanding.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {output && (
              <div className="px-5 py-3 border-b flex items-center gap-2 flex-shrink-0"
                style={{ borderColor: "hsl(210 25% 88%)", background: "white" }}>
                <span className="text-xs font-medium text-gray-500 flex-1 truncate">{filename || "Pasted content"}</span>
                <button onClick={copy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "hsl(210 25% 95%)", color: "hsl(220 14% 50%)" }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={() => { setOutput(""); setContent(""); setFilename(""); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "hsl(210 25% 95%)", color: "hsl(220 14% 50%)" }}>
                  <RotateCcw className="w-3 h-3" /> New
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-2xl mx-auto">
                <div className="prose prose-sm prose-gray max-w-none">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
                {streaming && (
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "hsl(30 90% 50%)" }} />
                    Reading your document...
                  </div>
                )}
              </div>
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────

export function LearnPage() {
  const [, navigate] = useLocation();
  const [panel, setPanel] = useState<Panel>("home");

  const PANEL_META: Record<Panel, { label: string; icon: React.ElementType; color: string } | null> = {
    home: null,
    "study-plan": { label: "Study Plan Builder", icon: Target, color: TEAL },
    quiz: { label: "Quiz Mode", icon: BrainCircuit, color: "hsl(260 70% 55%)" },
    document: { label: "Learn from Document", icon: FileText, color: "hsl(30 90% 50%)" },
  };

  const meta = panel !== "home" ? PANEL_META[panel] : null;

  return (
    <div className="flex flex-col h-screen" style={{ background: BASE_BG }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 border-b"
        style={{ background: "white", borderColor: "hsl(210 25% 90%)" }}>
        <button
          onClick={() => panel !== "home" ? setPanel("home") : navigate("/")}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {meta ? (
            <>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${meta.color}15` }}>
                <meta.icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
              </div>
              <span className="font-semibold text-sm text-gray-800">{meta.label}</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${TEAL}15` }}>
                <GraduationCap className="w-3.5 h-3.5" style={{ color: TEAL }} />
              </div>
              <span className="font-semibold text-sm text-gray-800">Learn with Sirius</span>
            </>
          )}
        </div>

        {panel !== "home" && (
          <div className="flex gap-1 flex-shrink-0">
            {(["study-plan", "quiz", "document"] as Panel[]).map(p => {
              const m = PANEL_META[p]!;
              const Icon = m.icon;
              return (
                <button key={p} onClick={() => setPanel(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: panel === p ? `${m.color}15` : "transparent",
                    color: panel === p ? m.color : "hsl(220 14% 55%)",
                    border: `1px solid ${panel === p ? m.color + "40" : "transparent"}`,
                  }}>
                  <Icon className="w-3.5 h-3.5 inline mr-1.5" />
                  {p === "study-plan" ? "Plan" : p === "quiz" ? "Quiz" : "Document"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        <AnimatePresence mode="wait">
          {panel === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex min-h-0">
              <HomePanel onSelect={setPanel} />
            </motion.div>
          )}
          {panel === "study-plan" && (
            <motion.div key="study-plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex min-h-0">
              <StudyPlanPanel />
            </motion.div>
          )}
          {panel === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex min-h-0">
              <QuizPanel />
            </motion.div>
          )}
          {panel === "document" && (
            <motion.div key="document" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex min-h-0">
              <DocumentPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
