import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronDown, ChevronRight, MessageSquare, Mic, Image, Brain,
  Sun, Heart, Layers, CreditCard, Telescope, Volume2, Keyboard,
  Upload, Zap, BookOpen, Star, Search, Cpu
} from "lucide-react";

type Section = {
  id: string;
  icon: React.FC<any>;
  title: string;
  color: string;
  steps: { title: string; body: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "chat",
    icon: MessageSquare,
    title: "Getting Started with Chat",
    color: "hsl(193,100%,35%)",
    steps: [
      {
        title: "Start a conversation",
        body: "Type your question or thought into the input at the bottom of the screen and press Enter or tap the send button. Sirius responds in real time, streaming its reply as it thinks.",
      },
      {
        title: "Ask anything",
        body: "There are no rigid question formats. Chat naturally — ask follow-ups, challenge a response, request clarification, or switch topics completely. Sirius maintains context across the whole conversation.",
      },
      {
        title: "New conversation",
        body: "Hit the compose icon at the top of the sidebar to start a fresh thread. Your previous conversations are saved and accessible from the history panel.",
      },
    ],
  },
  {
    id: "modes",
    icon: Cpu,
    title: "Intelligence Modes",
    color: "hsl(280,70%,55%)",
    steps: [
      {
        title: "What are modes?",
        body: "Each mode changes how Sirius thinks and communicates. Select a mode by clicking the tabs (Guru, Coach, Scientist, Philosopher, Creative, Friend) above the chat area.",
      },
      {
        title: "Guru",
        body: "Authoritative and comprehensive. Best for deep expertise, thorough analysis, or when you need the most complete answer possible.",
      },
      {
        title: "Coach",
        body: "Actionable and motivating. Helps you clarify goals, break down plans, and stay accountable. Great for productivity, habits, and personal growth.",
      },
      {
        title: "Scientist",
        body: "Rigorous and evidence-based. Uses structured reasoning, cites known research, and examines problems with a critical, methodical mindset.",
      },
      {
        title: "Philosopher",
        body: "Reflective and exploratory. Questions assumptions, explores multiple perspectives, and digs into the 'why' behind things.",
      },
      {
        title: "Creative",
        body: "Imaginative and generative. Brainstorms ideas, writes in different styles, generates concepts, and approaches problems from unexpected angles.",
      },
      {
        title: "Friend",
        body: "Warm and conversational. Talks like a knowledgeable friend — honest, casual, supportive, and free of corporate formality.",
      },
    ],
  },
  {
    id: "topics",
    icon: Layers,
    title: "Topic Hub & Domains",
    color: "hsl(45,100%,45%)",
    steps: [
      {
        title: "What is the Topic Hub?",
        body: "The Topic Hub gives you a fast way to explore structured domains — from Science and Philosophy to Finance and Wellbeing. Click any tile to instantly start a focused conversation on that subject.",
      },
      {
        title: "How to use it",
        body: "Open the Topic Hub from the sidebar. Browse the domain tiles and click one that interests you. Sirius will immediately open a chat tailored to that topic.",
      },
      {
        title: "Voice intro",
        body: "Each tile also has a small speaker icon. Hover over a tile and click the 🔊 icon to hear a spoken introduction to that domain before committing to a conversation.",
      },
    ],
  },
  {
    id: "voice",
    icon: Mic,
    title: "Voice Input",
    color: "hsl(340,80%,55%)",
    steps: [
      {
        title: "How to use voice",
        body: "Click the microphone icon in the chat input bar. Speak clearly — your words are transcribed in real time. When you stop speaking, the transcription is placed into the text field for you to review before sending.",
      },
      {
        title: "Browser permission",
        body: "The first time you use voice, your browser will ask for microphone permission. Allow it — Sirius only activates the microphone when you actively click the button.",
      },
      {
        title: "Voice output",
        body: "Sirius can also read its responses aloud. Look for the speaker icon on any message to hear it read back to you. You can adjust playback speed and pause at any time.",
      },
    ],
  },
  {
    id: "images",
    icon: Image,
    title: "Image & Document Analysis",
    color: "hsl(155,70%,45%)",
    steps: [
      {
        title: "Upload an image",
        body: "Click the paperclip or image icon in the input bar, or drag and drop a file directly into the chat. Sirius will analyse the image and you can ask questions about it.",
      },
      {
        title: "What you can do",
        body: "Describe, summarise, or extract information from photos, screenshots, charts, diagrams, PDFs, and documents. Ask Sirius to explain a chart, read a label, or interpret a complex diagram.",
      },
      {
        title: "Supported formats",
        body: "JPEG, PNG, GIF, WEBP, and PDF files are all supported. Files are processed securely and not stored beyond the session.",
      },
    ],
  },
  {
    id: "memory",
    icon: Brain,
    title: "Memory Portrait",
    color: "hsl(210,80%,55%)",
    steps: [
      {
        title: "What is Memory Portrait?",
        body: "Memory Portrait is Sirius's evolving understanding of you. As you chat, Sirius picks up on your interests, goals, communication preferences, and context — and remembers them across sessions.",
      },
      {
        title: "View your portrait",
        body: "Open Memory Portrait from the sidebar. You'll see a structured summary of what Sirius has learned about you — topics you care about, your thinking style, and ongoing threads.",
      },
      {
        title: "Editing your portrait",
        body: "You can add, correct, or remove any detail. Your portrait shapes how Sirius personalises responses — the more accurate it is, the more relevant your conversations become.",
      },
    ],
  },
  {
    id: "daily",
    icon: Sun,
    title: "Daily Wisdom & Mood",
    color: "hsl(35,100%,55%)",
    steps: [
      {
        title: "Daily Wisdom",
        body: "Each day Sirius surfaces a fresh insight, quote, or reflection — chosen to provoke thinking or simply resonate with your current context. Find it in the Daily tab in the sidebar.",
      },
      {
        title: "Mood Check-in",
        body: "A gentle daily prompt asks how you're feeling. It's not a form — just a moment of self-reflection. Sirius uses your check-in to calibrate the tone and pace of conversations that day.",
      },
    ],
  },
  {
    id: "plans",
    icon: CreditCard,
    title: "Plans & Subscriptions",
    color: "hsl(193,100%,35%)",
    steps: [
      {
        title: "Free plan",
        body: "The Free plan gives you 10 messages per day — a great way to explore what Sirius can do. No credit card required to start.",
      },
      {
        title: "Sirius Plus — £6.99/month",
        body: "Unlimited messages, priority response times, and access to the full Topic Hub. Ideal for everyday use and regular creative or research work.",
      },
      {
        title: "Sirius Pro — £14.99/month",
        body: "Everything in Plus, plus enhanced memory, advanced file analysis, voice I/O, and early access to new features. Designed for power users and professionals.",
      },
      {
        title: "Changing or cancelling",
        body: "To cancel, simply stop your monthly bank transfer — no forms, no lock-in. Drop us an email at siriusailab@gmail.com and we'll confirm the cancellation.",
      },
    ],
  },
  {
    id: "starlab",
    icon: Star,
    title: "Star Lab",
    color: "hsl(226,60%,55%)",
    steps: [
      {
        title: "What is Star Lab?",
        body: "Star Lab is Sirius's private R&D environment — a password-protected workspace for advanced research, strategic analysis, and experimental tools. Access it from the sidebar using your PIN.",
      },
      {
        title: "What's inside",
        body: "Star Lab includes: Bot Lab (custom AI bots), Scout (market opportunity research), AI Intelligence Feed, Funding Radar, Commerce Lab, project workspaces with AI-assisted briefs and specs, and the Outreach Hub for personalised email campaigns.",
      },
      {
        title: "Access",
        body: "Click Star Lab in the sidebar and enter your PIN to access your private intelligence workspace.",
      },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TutorialsModal({ open, onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>("chat");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded(e => e === id ? null : id);
  const toggleStep = (key: string) => setExpandedStep(s => s === key ? null : key);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-end"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="h-full w-full max-w-md flex flex-col shadow-2xl"
            style={{ background: "hsl(210,55%,98%)", borderLeft: "1px solid hsl(210,20%,90%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(210,20%,90%)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(193,100%,35%)" }}>
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm" style={{ color: "hsl(226,45%,15%)" }}>Sirius Guide</h2>
                  <p className="text-xs" style={{ color: "hsl(210,15%,55%)" }}>How everything works</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-1.5 transition-colors hover:bg-black/5">
                <X className="w-4 h-4" style={{ color: "hsl(210,15%,50%)" }} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5">
              {SECTIONS.map(section => {
                const Icon = section.icon;
                const isOpen = expanded === section.id;
                return (
                  <div key={section.id} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${isOpen ? section.color + "30" : "hsl(210,20%,90%)"}`, background: isOpen ? section.color + "06" : "white" }}>
                    <button
                      onClick={() => toggle(section.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                    >
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: section.color + "18" }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: section.color }} />
                      </div>
                      <span className="flex-1 text-sm font-semibold" style={{ color: "hsl(226,45%,18%)" }}>{section.title}</span>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4" style={{ color: "hsl(210,15%,60%)" }} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <div className="px-4 pb-3 space-y-1">
                            {section.steps.map((step, i) => {
                              const key = `${section.id}-${i}`;
                              const stepOpen = expandedStep === key;
                              return (
                                <div key={i} className="rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid hsl(210,20%,92%)" }}>
                                  <button
                                    onClick={() => toggleStep(key)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                                  >
                                    <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: section.color + "15", color: section.color }}>
                                      {i + 1}
                                    </div>
                                    <span className="flex-1 text-xs font-medium" style={{ color: "hsl(226,45%,20%)" }}>{step.title}</span>
                                    <ChevronRight className="w-3.5 h-3.5 transition-transform flex-shrink-0" style={{ color: "hsl(210,15%,65%)", transform: stepOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {stepOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.18 }}
                                        style={{ overflow: "hidden" }}
                                      >
                                        <p className="px-3 pb-3 text-xs leading-relaxed" style={{ color: "hsl(210,15%,40%)" }}>{step.body}</p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t text-center" style={{ borderColor: "hsl(210,20%,90%)" }}>
              <p className="text-xs" style={{ color: "hsl(210,15%,60%)" }}>
                Sirius Star Lab · <span style={{ color: "hsl(193,100%,35%)" }}>I think, so I am.</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
