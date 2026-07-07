import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mic, MicOff, Send, Clock, Check, Loader2, Globe, Paperclip, X } from "lucide-react";
import { getApiBase } from "@/lib/api-base";
import { speakText, stopSpeaking } from "./voice-utils";
import type { Project, NavMode, AccessRole } from "./types";

function preprocessImageUrls(content: string): string {
  let result = content;
  result = result.replace(
    /URL:\s*(https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?\S*)?)/gi,
    (_, url) => `\n\n![Generated image](${url})\n\n`
  );
  result = result.replace(
    /Saved to:\s*\/opt\/sirius\/artifacts\/api-server\/public\/renders\/([\w.\-]+)/gi,
    (_, filename) => `\n\n![Generated image](https://sirius-ai.live/api/lab/renders/${filename})\n\n`
  );
  result = result.replace(
    /(?<!\()(https?:\/\/[^\s)\]"']+\.(png|jpg|jpeg|gif|webp|bmp|svg)([?#][^\s)\]"']*)?)/gi,
    (url) => `\n\n![Generated image](${url})\n\n`
  );
  return result;
}

type ActionCard = { tool: string; label: string; detail: string; color: string; icon: string; result?: string };
type LabChatMsg = { role: "user" | "assistant"; content: string; actions?: ActionCard[]; attachedImageUrl?: string; images?: string[] };

const NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard", projects: "Projects", botlab: "Bot Lab", scout: "Scout",
  feed: "Feed", grants: "Funding Radar", commerce: "Commerce Lab", outreach: "Outreach Hub",
  autolab: "Autonomous Lab", revenue: "Revenue Hub", agency: "Agency Hub", mission: "Mission",
  growth: "Growth Engine", brain: "Sirius Brain", research: "Deep Research", docs: "Document Intel",
  appbuilder: "App Builder", "ai-arch": "AI Architecture", orchestrate: "Command Centre",
  sysaudit: "System Audit", upgrades: "Sirius Upgrades", labchat: "Chat with Sirius",
};

export function SiriusLabChatPanel({ pin, accessLevel, navMode, activeProject, onNavigate, onOpenProject, onNavigateAndBuild }: {
  pin: string;
  accessLevel: AccessRole;
  navMode?: NavMode;
  activeProject?: Project | null;
  onNavigate?: (section: NavMode) => void;
  onOpenProject?: (id: number) => void;
  onNavigateAndBuild?: (section: NavMode, prompt: string) => void;
}) {
  const base = getApiBase();
  const CHAT_STORAGE_KEY = `lab_chat_${accessLevel}`;
  const [messages, setMessages] = useState<LabChatMsg[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingActions, setStreamingActions] = useState<ActionCard[]>([]);
  const [streamingImages, setStreamingImages] = useState<string[]>([]);
  const [thinkingText, setThinkingText] = useState("");
  const [webSearching, setWebSearching] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [voicePhase, setVoicePhase] = useState<"idle" | "listening" | "speaking">("idle");
  const [voiceHint, setVoiceHint] = useState("");
  const [waveTick, setWaveTick] = useState(0);
  const [chatInputMode, setChatInputMode] = useState<"voice" | "keyboard">("voice");
  const chatInputModeRef = useRef<"voice" | "keyboard">("voice");
  const [textInput, setTextInput] = useState("");
  const [queuedMessage, setQueuedMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachedMime, setAttachedMime] = useState<string | null>(null);
  const CONV_ID_KEY = `lab_conv_${accessLevel}`;
  const getSavedConvId = (): number | null => {
    try {
      const saved = localStorage.getItem(`lab_conv_${accessLevel}`);
      return saved ? parseInt(saved, 10) : null;
    } catch { return null; }
  };
  const conversationIdRef = useRef<number | null>(getSavedConvId());
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<LabChatMsg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stoppedRef = useRef(false);
  const hasGreetedRef = useRef(false);
  const pendingNavRef = useRef<{ section: NavMode; projectId?: number } | null>(null);
  const pendingBuildRef = useRef<{ section: NavMode; prompt: string } | null>(null);
  const silentRetryRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages, CHAT_STORAGE_KEY]);

  useEffect(() => {
    if (!streaming && queuedMessage) {
      const msg = queuedMessage;
      setQueuedMessage("");
      setTimeout(() => {
        const userMsg: LabChatMsg = { role: "user", content: msg };
        setMessages(prev => [...prev, userMsg]);
        const apiMessages = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
        sendWithMessages(apiMessages);
      }, 150);
    }
  }, [streaming]);

  useEffect(() => {
    const id = setInterval(() => setWaveTick(t => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  const stopListeningNow = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setVoicePhase("idle");
    setVoiceHint("");
  };

  const startListeningLoop = () => {
    if (stoppedRef.current || streaming) return;
    if (chatInputModeRef.current === "keyboard") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { setVoiceHint("Voice not supported in this browser."); return; }
    const rec = new SpeechRec();
    recognitionRef.current = rec;
    rec.lang = "en-GB";
    rec.continuous = false;
    rec.interimResults = true;
    let gotResult = false;
    rec.onstart = () => { setVoicePhase("listening"); setVoiceHint(""); };
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(" ").trim();
      if (e.results[e.results.length - 1].isFinal && text.length > 1) {
        gotResult = true;
        silentRetryRef.current = 0;
        stopListeningNow();
        setVoiceHint(`Heard: "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`);
        const userMsg: LabChatMsg = { role: "user", content: text };
        const apiMessages = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
        setMessages(prev => [...prev, userMsg]);
        sendWithMessages(apiMessages);
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        setVoiceHint("Microphone access denied — check browser settings.");
        setVoicePhase("idle");
      } else if (e.error === "no-speech") {
        // handled in onend
      } else {
        setVoiceHint("Voice error — tap the mic to retry.");
        setVoicePhase("idle");
      }
    };
    rec.onend = () => {
      if (gotResult || stoppedRef.current) return;
      silentRetryRef.current += 1;
      if (silentRetryRef.current <= 4) {
        setVoicePhase("idle");
        setTimeout(() => startListeningLoop(), 800);
      } else {
        silentRetryRef.current = 0;
        setVoicePhase("idle");
        setVoiceHint("Tap the mic when you're ready to speak.");
      }
    };
    rec.start();
  };

  useEffect(() => {
    stoppedRef.current = false;
    if (hasGreetedRef.current) {
      setTimeout(() => startListeningLoop(), 600);
      return;
    }
    hasGreetedRef.current = true;
    const greeting = accessLevel === "guest"
      ? "Hello. I'm Sirius. Ask me anything about this company, its projects, or the market."
      : "I'm here, Garry. What would you like to work on?";
    setTimeout(() => {
      setVoicePhase("speaking");
      speakText(greeting, () => {
        setVoicePhase("idle");
        if (!stoppedRef.current) startListeningLoop();
      }, 0.87, pin);
    }, 500);
    return () => { stoppedRef.current = true; stopListeningNow(); stopSpeaking(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, streamingActions]);

  const sendWithMessages = async (apiMessages: { role: string; content: string }[], imageBase64?: string, documentBase64?: string, documentName?: string) => {
    setStreaming(true);
    setStreamingText("");
    setStreamingActions([]);
    setThinkingText("");
    setVoiceHint("");

    const page = NAV_LABELS[navMode ?? "labchat"] ?? navMode ?? "Chat with Sirius";
    const isAutolab = (navMode ?? "") === "autolab";
    const projCtx = activeProject
      ? `\n\n${isAutolab ? `Garry is reviewing this PENDING APPROVAL project (it has NOT been approved yet): "${activeProject.name}" (ID: ${activeProject.id}, ${activeProject.industry}). They are in the Approvals queue. When they say "approve it", "approve this one", "what do you think", "tell me about this", etc — this is the project they mean. DO NOT ask which project.` : `Currently open project: "${activeProject.name}" (ID: ${activeProject.id}, ${activeProject.industry})`} — brief: ${(activeProject.brief || "").slice(0, 300)}`
      : "";
    const sections = Object.entries(NAV_LABELS).map(([k, v]) => `${v} (${k})`).join(", ");
    const contextSystemMsg = {
      role: "system" as const,
      content: `CURRENT CONTEXT: Garry is viewing the "${page}" section.${projCtx}

Available sections: ${sections}

NAVIGATION RULES — CRITICAL:
- To navigate to a panel: use the navigate_to TOOL with the section id.
- To open a specific project: FIRST call query_projects to find it and get its real database ID, THEN call navigate_to with section="projects" and the project_id. NEVER guess a project ID.
- To go back to the projects list: call navigate_to with section="projects" (no project_id).
- To build an app: use start_app_build TOOL.

PROJECT OPENING — CRITICAL:
- Only open or navigate to a project when the user explicitly uses words like "open", "go to", "show me", "load", "take me to", or "switch to" a project.
- If the user merely asks about, mentions, discusses, or references a project by name (e.g. "tell me about project Alpha", "what's the status of Alpha", "how is Alpha going"), do NOT open or navigate to it. Just answer the question in text.
- Casual project mentions in conversation context must NEVER trigger <<OPEN_PROJECT:N>> or a navigate_to call with a project_id.

VOICE STYLE: Short, natural sentences. No bullet points or markdown. Under 3 sentences.`,
    };
    const messagesWithContext = [contextSystemMsg, ...apiMessages.filter(m => m.role !== "system")];

    let fullText = "";
    const actions: ActionCard[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      const body: any = { messages: messagesWithContext, conversationId: conversationIdRef.current };
      if (imageBase64) body.imageBase64 = imageBase64;
      if (documentBase64) { body.documentBase64 = documentBase64; body.documentName = documentName; }
      const res = await fetch(`${base}lab/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;
      const images: string[] = [];

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { streamDone = true; break; }
          try {
            const evt = JSON.parse(raw);
            // ── text streaming ────────────────────────────────────────────
            if (evt.content) {
              fullText += evt.content;
              setStreamingText(fullText);
              setThinkingText("");
              setWebSearching(false);
            } else if (evt.type === "text" && evt.delta) {
              fullText += evt.delta;
              setStreamingText(fullText);
              setThinkingText("");
              setWebSearching(false);
            } else if (evt.done) {
              streamDone = true;
            } else if (evt.type === "image" && evt.url) {
              images.push(evt.url);
              setStreamingImages([...images]);
              setThinkingText("");
            // ── action cards for every tool Sirius uses ───────────────────
            } else if (evt.type === "action") {
              const card: ActionCard = { tool: evt.tool, label: evt.label, detail: evt.detail, color: evt.color, icon: evt.icon, result: evt.result };
              actions.push(card);
              setStreamingActions([...actions]);
              setThinkingText("");
            } else if (evt.type === "reading_file") {
              const card: ActionCard = { tool: "read_source_file", label: "Reading file", detail: evt.path, color: "hsl(220 70% 55%)", icon: "📄" };
              actions.push(card); setStreamingActions([...actions]); setThinkingText("");
            } else if (evt.type === "executing_code") {
              const card: ActionCard = { tool: "execute_code", label: `Running ${evt.language || "code"}`, detail: "", color: "hsl(280 70% 55%)", icon: "⚡" };
              actions.push(card); setStreamingActions([...actions]); setThinkingText("");
            } else if (evt.type === "code_result") {
              const last = actions[actions.length - 1];
              if (last?.tool === "execute_code") {
                actions[actions.length - 1] = { ...last, detail: evt.success ? `Done in ${evt.executionMs}ms` : "Failed", color: evt.success ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" };
                setStreamingActions([...actions]);
              }
            } else if (evt.type === "proposing_change") {
              const card: ActionCard = { tool: "propose_code_change", label: "Writing change", detail: evt.filePath, color: "hsl(38 92% 50%)", icon: "✏️" };
              actions.push(card); setStreamingActions([...actions]); setThinkingText("");
            } else if (evt.type === "deploy_result") {
              const last = actions[actions.length - 1];
              if (last?.tool === "propose_code_change") {
                actions[actions.length - 1] = { ...last, label: evt.success ? "Change deployed ✓" : "Change rejected", color: evt.success ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" };
                setStreamingActions([...actions]);
              }
            } else if (evt.type === "field_saved") {
              const card: ActionCard = { tool: "save_to_project", label: `Saved: ${evt.label || evt.field}`, detail: evt.preview ? evt.preview.slice(0, 60) : "", color: "hsl(142 71% 45%)", icon: "💾" };
              actions.push(card); setStreamingActions([...actions]); setThinkingText("");
            } else if (evt.type === "render_queued") {
              const card: ActionCard = { tool: "generate_render", label: "Render queued", detail: evt.description ? evt.description.slice(0, 60) : "", color: "hsl(193 100% 40%)", icon: "🎨" };
              actions.push(card); setStreamingActions([...actions]); setThinkingText("");
            } else if (evt.type === "sending_to_cad") {
              const card: ActionCard = { tool: "send_to_new_dimensions", label: "Sending to New Dimensions", detail: "", color: "hsl(193 100% 40%)", icon: "📐" };
              actions.push(card); setStreamingActions([...actions]); setThinkingText("");
            // ── status / thinking ────────────────────────────────────────
            } else if (evt.type === "thinking") {
              setThinkingText(evt.text || "");
            } else if (evt.type === "status" && evt.message) {
              setThinkingText(evt.message);
            } else if (evt.type === "searching") {
              setWebSearching(true);
              setWebSearchQuery(evt.query || "");
              setThinkingText("");
            } else if (evt.type === "search_done") {
              setWebSearching(false);
              setWebSearchQuery("");
            } else if (evt.type === "navigate") {
              if (evt.section) {
                pendingNavRef.current = { section: evt.section as NavMode, projectId: evt.projectId || undefined };
              }
            } else if (evt.type === "navigate_and_build") {
              if (evt.section && evt.prompt) {
                pendingBuildRef.current = { section: evt.section as NavMode, prompt: evt.prompt };
              } else if (evt.section) {
                pendingNavRef.current = { section: evt.section as NavMode };
              }
            } else if (evt.type === "conversation_id" && evt.conversationId) {
              conversationIdRef.current = evt.conversationId;
              try { localStorage.setItem(CONV_ID_KEY, String(evt.conversationId)); } catch {}
            } else if (evt.type === "error") {
              fullText = evt.message || "Something went wrong.";
              streamDone = true;
            }
          } catch {}
        }
      }

      reader.cancel().catch(() => {});

      const navTagMatch = fullText.match(/<<NAVIGATE:([^>]+)>>/);
      const openProjectMatches = [...fullText.matchAll(/<<OPEN_PROJECT:(\d+)>>/g)];

      if (navTagMatch && onNavigate) {
        setTimeout(() => onNavigate!(navTagMatch[1].trim() as NavMode), 200);
      }
      if (openProjectMatches.length > 0) {
        if (onOpenProject) {
          const firstId = parseInt(openProjectMatches[0][1], 10);
          if (!isNaN(firstId)) setTimeout(() => onOpenProject!(firstId), 500);
        }
      }

      const cleanedText = fullText.replace(/<<[^>]+>>/g, "").trim();
      const finalText = cleanedText || (images.length > 0 ? "" : "No response — please try again.");
      setMessages(prev => [...prev, { role: "assistant", content: finalText, actions: actions.length > 0 ? [...actions] : undefined, images: images.length > 0 ? [...images] : undefined }]);

      if (chatInputModeRef.current === "keyboard") {
        const pendingBuild = pendingBuildRef.current;
        const pendingNav = pendingNavRef.current;
        pendingBuildRef.current = null;
        pendingNavRef.current = null;
        if (pendingBuild && onNavigateAndBuild) {
          setTimeout(() => onNavigateAndBuild!(pendingBuild.section, pendingBuild.prompt), 100);
        } else if (pendingBuild && onNavigate) {
          setTimeout(() => onNavigate!(pendingBuild.section), 100);
        } else if (pendingNav) {
          setTimeout(() => {
            if (onNavigate) onNavigate!(pendingNav.section);
            if (pendingNav.projectId && onOpenProject) setTimeout(() => onOpenProject!(pendingNav.projectId!), 300);
          }, 100);
        }
      }

      setVoicePhase("speaking");
      const _voiceRaw = finalText.replace(/[*#>`_~]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      const _voiceMax = 1200;
      const voiceText = _voiceRaw.length <= _voiceMax ? _voiceRaw : (() => {
        const cut = _voiceRaw.slice(0, _voiceMax);
        const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf(".\n"), cut.lastIndexOf("!\n"), cut.lastIndexOf("?\n"));
        return lastStop > 600 ? cut.slice(0, lastStop + 1) : cut;
      })();
      speakText(voiceText, () => {
        setVoicePhase("idle");
        const pendingBuild = pendingBuildRef.current;
        const pendingNav = pendingNavRef.current;
        pendingBuildRef.current = null;
        pendingNavRef.current = null;
        if (pendingBuild && onNavigateAndBuild) {
          setTimeout(() => onNavigateAndBuild!(pendingBuild.section, pendingBuild.prompt), 200);
        } else if (pendingBuild && onNavigate) {
          setTimeout(() => onNavigate!(pendingBuild.section), 200);
        } else if (pendingNav) {
          setTimeout(() => {
            if (onNavigate) onNavigate!(pendingNav.section);
            if (pendingNav.projectId && onOpenProject) setTimeout(() => onOpenProject!(pendingNav.projectId!), 300);
          }, 200);
        } else if (!stoppedRef.current) {
          setTimeout(() => startListeningLoop(), 400);
        }
      }, 0.87, pin);

    } catch (err: any) {
      const msg = err?.name === "AbortError" ? "Request timed out — Sirius took too long. Try again." : "Something went wrong — try again.";
      setMessages(prev => [...prev, { role: "assistant", content: msg }]);
      speakText(msg, () => { if (!stoppedRef.current) setTimeout(() => startListeningLoop(), 400); }, 0.87, pin);
    } finally {
      setStreaming(false);
      setStreamingText("");
      setStreamingActions([]);
      setStreamingImages([]);
      setThinkingText("");
      setWebSearching(false);
      setWebSearchQuery("");
    }
  };

  const switchChatMode = (mode: "voice" | "keyboard") => {
    chatInputModeRef.current = mode;
    setChatInputMode(mode);
    if (mode === "keyboard") {
      stopListeningNow();
      window.speechSynthesis?.cancel();
      setTimeout(() => textInputRef.current?.focus(), 100);
    } else {
      setTextInput("");
      if (!stoppedRef.current && !streaming) setTimeout(() => startListeningLoop(), 300);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setAttachedFile(ev.target?.result as string);
      setAttachedName(file.name);
      setAttachedMime(file.type || "application/octet-stream");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearAttachment = () => { setAttachedFile(null); setAttachedName(null); setAttachedMime(null); };
  const isImageMime = (mime: string | null) => !!(mime && mime.startsWith("image/"));

  const submitTextMessage = () => {
    const text = textInput.trim();
    if (!text && !attachedFile) return;
    if (streaming) {
      setQueuedMessage(text);
      setTextInput("");
      return;
    }
    const imgForDisplay = attachedFile && isImageMime(attachedMime) ? attachedFile : undefined;
    const imgB64 = attachedFile && isImageMime(attachedMime) ? attachedFile : undefined;
    const docB64 = attachedFile && !isImageMime(attachedMime) ? attachedFile : undefined;
    const docName = attachedName && !isImageMime(attachedMime) ? attachedName : undefined;
    setTextInput("");
    clearAttachment();
    const userMsg: LabChatMsg = { role: "user", content: text, attachedImageUrl: imgForDisplay };
    setMessages(prev => [...prev, userMsg]);

    const apiMessages = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
    sendWithMessages(apiMessages, imgB64 || undefined, docB64 || undefined, docName || undefined);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#F5F7FF" }}>

      <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid rgba(0,212,255,0.3)", boxShadow: voicePhase === "speaking" ? "0 0 18px rgba(0,212,255,0.35)" : "0 0 8px rgba(0,212,255,0.1)" }}>
              <img src="/logo-v2.png" alt="Sirius" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 animate-pulse"
              style={{ background: voicePhase === "listening" ? "hsl(0,75%,50%)" : voicePhase === "speaking" ? "hsl(193,100%,50%)" : "hsl(155,70%,50%)", borderColor: "#FFFFFF" }} />
          </div>
          <div>
            <p className="text-slate-800 font-bold text-sm leading-none">Sirius {accessLevel === "guest" ? "— Guest Mode" : "— Intelligence Partner"}</p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: voicePhase === "listening" ? "hsl(0,75%,50%)" : voicePhase === "speaking" ? "hsl(193,100%,35%)" : streaming ? "hsl(45,90%,50%)" : "hsl(155,70%,45%)", letterSpacing: "0.08em" }}>
              {voicePhase === "listening" ? "● LISTENING" : voicePhase === "speaking" ? "● SPEAKING" : streaming ? "● THINKING" : "● READY"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); stoppedRef.current = true; stopListeningNow(); window.speechSynthesis?.cancel(); try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {} setTimeout(() => { stoppedRef.current = false; hasGreetedRef.current = false; }, 100); }}
              className="text-xs px-2 py-1 rounded-lg transition-all hover:bg-slate-900/5"
              style={{ color: "rgba(15,23,42,0.4)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8">
            <div className="flex items-center gap-1 h-14">
              {Array.from({ length: 18 }, (_, i) => {
                const active = voicePhase === "listening" || voicePhase === "speaking";
                const height = active
                  ? 12 + Math.abs(Math.sin((waveTick * 0.25 + i * 0.6))) * 36
                  : 6 + Math.abs(Math.sin(i * 0.5)) * 10;
                const color = voicePhase === "listening"
                  ? `hsla(0,75%,55%,${0.5 + 0.5 * Math.abs(Math.sin(waveTick * 0.3 + i))})`
                  : voicePhase === "speaking"
                  ? `hsla(193,100%,45%,${0.5 + 0.5 * Math.abs(Math.sin(waveTick * 0.35 + i))})`
                  : "rgba(15,23,42,0.12)";
                return <div key={i} style={{ width: 4, height: `${height}px`, background: color, borderRadius: 4, transition: "height 0.1s ease, background 0.3s ease" }} />;
              })}
            </div>
            <div className="text-center">
              <p className="text-slate-800 font-bold text-base">
                {voicePhase === "listening" ? "I'm listening — speak now" : voicePhase === "speaking" ? "Sirius is speaking…" : "Ready. Just start talking."}
              </p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
                {voicePhase === "idle" ? "Tap the mic to start, or wait — Sirius will speak first." : ""}
              </p>
            </div>
            {voicePhase === "idle" && !streaming && (
              <button onClick={() => startListeningLoop()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,45%))", color: "#fff", boxShadow: "0 4px 20px rgba(0,212,255,0.25)" }}>
                <Mic className="w-4 h-4" /> Tap to Speak
              </button>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-1"
                style={{ border: "1px solid rgba(0,212,255,0.2)" }}>
                <img src="/logo-v2.png" alt="Sirius" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-col gap-1.5 max-w-[78%]">
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-col gap-1 mb-1">
                  {msg.actions.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.08)", borderLeft: `3px solid ${a.color}` }}>
                      <span className="text-sm leading-none">{a.icon}</span>
                      <span className="font-semibold text-slate-700">{a.label}</span>
                      {a.detail && <span className="text-slate-400 font-normal truncate max-w-[200px]">— {a.detail}</span>}
                      <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-emerald-500" />
                    </div>
                  ))}
                </div>
              )}
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-col gap-2">
                  {msg.images.map((url, ii) => (
                    <img key={ii} src={url} alt="Generated image" className="rounded-2xl max-w-full shadow-md" style={{ maxHeight: "360px", objectFit: "contain", border: "1px solid rgba(15,23,42,0.09)" }} />
                  ))}
                </div>
              )}
              {(msg.content || msg.attachedImageUrl) && (
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={msg.role === "user"
                    ? { background: "hsl(213,60%,88%)", color: "rgba(15,23,42,0.9)", borderRadius: "18px 18px 4px 18px" }
                    : { background: "#FFFFFF", color: "rgba(15,23,42,0.82)", border: "1px solid rgba(15,23,42,0.09)", borderRadius: "18px 18px 18px 4px" }}>
                  {msg.attachedImageUrl && (
                    <img src={msg.attachedImageUrl} alt="Attached" className="rounded-xl mb-2 max-w-full" style={{ maxHeight: "220px", objectFit: "contain" }} />
                  )}
                  {msg.content && <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ src, alt }) => src ? <span className="block my-2"><img src={src} alt={alt || "Image"} className="rounded-xl max-w-full" style={{ maxHeight: "400px", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /><span className="flex gap-2 mt-1.5"><a href={src} download target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-60 hover:opacity-100">Download</a><a href={src} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-60 hover:opacity-100">Open ↗</a></span></span> : null }}>{preprocessImageUrls(msg.content)}</ReactMarkdown>}
                </div>
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-1"
              style={{ border: "1px solid rgba(0,212,255,0.2)" }}>
              <img src="/logo-v2.png" alt="Sirius" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-[78%]">
              {streamingActions.length > 0 && (
                <div className="flex flex-col gap-1 mb-1">
                  {streamingActions.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.08)", borderLeft: `3px solid ${a.color}` }}>
                      <span className="text-sm leading-none">{a.icon}</span>
                      <span className="font-semibold text-slate-700">{a.label}</span>
                      {a.detail && <span className="text-slate-400 font-normal truncate max-w-[200px]">— {a.detail}</span>}
                      <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-emerald-500" />
                    </div>
                  ))}
                </div>
              )}
              {webSearching && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(0,140,255,0.06)", border: "1px solid rgba(0,140,255,0.18)", borderLeft: "3px solid hsl(210,100%,50%)" }}>
                  <Globe className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" style={{ color: "hsl(210,100%,50%)" }} />
                  <span style={{ color: "hsl(210,90%,40%)" }}>Searching the web{webSearchQuery ? ` — "${webSearchQuery.slice(0, 60)}${webSearchQuery.length > 60 ? "…" : ""}"` : "…"}</span>
                </div>
              )}
              {thinkingText && !webSearching && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 italic"
                  style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-500 flex-shrink-0" />
                  {thinkingText}
                </div>
              )}
              {streamingImages.length > 0 && (
                <div className="flex flex-col gap-2">
                  {streamingImages.map((url, ii) => (
                    <img key={ii} src={url} alt="Generated image" className="rounded-2xl max-w-full shadow-md" style={{ maxHeight: "360px", objectFit: "contain", border: "1px solid rgba(15,23,42,0.09)" }} />
                  ))}
                </div>
              )}
              {streamingText ? (
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={{ background: "#FFFFFF", color: "rgba(15,23,42,0.82)", border: "1px solid rgba(15,23,42,0.09)", borderRadius: "18px 18px 18px 4px" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ src, alt }) => src ? <span className="block my-2"><img src={src} alt={alt || "Image"} className="rounded-xl max-w-full" style={{ maxHeight: "400px", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></span> : null }}>{preprocessImageUrls(streamingText)}</ReactMarkdown>
                </div>
              ) : !thinkingText && streamingActions.length === 0 && (
                <div className="px-4 py-3 rounded-2xl"
                  style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.09)", borderRadius: "18px 18px 18px 4px" }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(15,23,42,0.3)", animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(15,23,42,0.3)", animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(15,23,42,0.3)", animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t" style={{ borderColor: "rgba(15,23,42,0.07)", background: "#FFFFFF" }}>
        {attachedFile && (
          <div className="flex items-center gap-2 mx-4 mt-3 px-2 py-1.5 rounded-xl" style={{ background: "rgba(0,198,255,0.08)", border: "1px solid rgba(0,198,255,0.2)" }}>
            {isImageMime(attachedMime) ? (
              <img src={attachedFile} alt="preview" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,198,255,0.15)" }}>
                <Paperclip className="w-3.5 h-3.5" style={{ color: "hsl(193,100%,40%)" }} />
              </div>
            )}
            <span className="text-xs font-medium flex-1 truncate" style={{ color: "hsl(193,100%,35%)" }}>{attachedName}</span>
            <button onClick={clearAttachment} className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(15,23,42,0.08)" }}>
              <X className="w-3 h-3" style={{ color: "rgba(15,23,42,0.5)" }} />
            </button>
          </div>
        )}
        {(voicePhase !== "idle" || streaming || voiceHint) && (
          <div className="flex items-center gap-2 px-4 pt-2 pb-0">
            <div className="flex items-center gap-0.5 h-4">
              {Array.from({ length: 8 }, (_, i) => {
                const active = voicePhase === "listening" || voicePhase === "speaking";
                const h = active ? 2 + Math.abs(Math.sin(waveTick * 0.28 + i * 0.7)) * 10 : 2;
                const bg = voicePhase === "listening" ? "hsl(0,75%,55%)" : voicePhase === "speaking" ? "hsl(193,100%,45%)" : "rgba(15,23,42,0.15)";
                return <div key={i} style={{ width: 2, height: `${h}px`, background: bg, borderRadius: 2, transition: "height 0.09s ease" }} />;
              })}
            </div>
            <p className="text-xs font-medium" style={{ color: voicePhase === "listening" ? "hsl(0,75%,50%)" : voicePhase === "speaking" ? "hsl(193,100%,35%)" : streaming ? "hsl(45,90%,50%)" : "rgba(15,23,42,0.4)" }}>
              {voiceHint || (voicePhase === "listening" ? "Listening…" : voicePhase === "speaking" ? "Sirius is speaking…" : streaming ? "Thinking…" : "")}
            </p>
          </div>
        )}
        <div className="flex items-end gap-2 px-4 py-3">
          <button
            onClick={() => {
              if (voicePhase === "listening") { stopListeningNow(); }
              else if (voicePhase === "speaking") { window.speechSynthesis?.cancel(); setVoicePhase("idle"); }
              else if (!streaming) { startListeningLoop(); }
            }}
            title={voicePhase === "listening" ? "Stop listening" : "Tap to speak"}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
            style={{
              background: voicePhase === "listening" ? "hsl(0,75%,45%)" : "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,45%))",
              boxShadow: voicePhase === "listening" ? "0 0 16px hsl(0,75%,40%)" : "0 4px 12px rgba(0,212,255,0.25)",
              opacity: streaming && voicePhase === "idle" ? 0.4 : 1,
            }}>
            {voicePhase === "listening" ? <MicOff className="w-4 h-4" style={{ color: "#fff" }} /> : <Mic className="w-4 h-4" style={{ color: "#fff" }} />}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach image or document"
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 flex-shrink-0"
            style={{
              background: attachedFile ? "rgba(0,198,255,0.15)" : "rgba(15,23,42,0.06)",
              border: attachedFile ? "1.5px solid rgba(0,198,255,0.4)" : "1.5px solid rgba(15,23,42,0.1)",
            }}>
            <Paperclip className="w-4 h-4" style={{ color: attachedFile ? "hsl(193,100%,40%)" : "rgba(15,23,42,0.4)" }} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.docx,.doc,.txt,.csv,.md,.json,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,text/markdown,application/json"
            className="hidden"
            onChange={handleFileSelect}
          />
          <textarea
            ref={textInputRef}
            value={textInput}
            onChange={e => {
              setTextInput(e.target.value);
              if (voicePhase === "listening") stopListeningNow();
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitTextMessage(); }
            }}
            placeholder={queuedMessage ? `Queued: "${queuedMessage.slice(0, 40)}${queuedMessage.length > 40 ? "…" : ""}"` : streaming ? "Type your next message — it'll send when she finishes…" : "Type a message or attach an image/doc…"}
            rows={1}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: queuedMessage ? "hsl(45,100%,97%)" : "rgba(15,23,42,0.04)",
              border: `1.5px solid ${queuedMessage ? "hsl(45,80%,70%)" : "rgba(15,23,42,0.1)"}`,
              color: "rgba(15,23,42,0.85)",
              minHeight: 44,
              maxHeight: 140,
              lineHeight: "1.5",
              fontFamily: "inherit",
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 140) + "px";
            }}
          />
          <button
            onClick={submitTextMessage}
            disabled={!textInput.trim() && !attachedFile}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
            style={{
              background: (textInput.trim() || attachedFile) ? (streaming ? "hsl(45,90%,55%)" : "linear-gradient(135deg, hsl(226,70%,50%), hsl(193,100%,35%))") : "rgba(15,23,42,0.08)",
              boxShadow: (textInput.trim() || attachedFile) ? "0 4px 14px rgba(99,102,241,0.25)" : "none",
            }}>
            {streaming && (textInput.trim() || attachedFile)
              ? <Clock className="w-4 h-4 text-white" />
              : <Send className="w-4 h-4" style={{ color: (textInput.trim() || attachedFile) ? "#fff" : "rgba(15,23,42,0.3)" }} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
