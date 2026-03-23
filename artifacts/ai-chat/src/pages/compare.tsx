import React, { useState } from "react";
import { Check, X, Star, Zap, ChevronDown, ChevronUp } from "lucide-react";

type Platform = {
  name: string;
  color: string;
  bg: string;
  isSirius?: boolean;
};

type Feature = {
  category: string;
  name: string;
  desc: string;
  exclusive?: boolean;
  platforms: Record<string, boolean | string>;
};

const PLATFORMS: Platform[] = [
  { name: "ChatGPT", color: "#19C37D", bg: "rgba(25,195,125,0.08)" },
  { name: "Grok", color: "#FF6B6B", bg: "rgba(255,107,107,0.08)" },
  { name: "Gemini", color: "#4285F4", bg: "rgba(66,133,244,0.08)" },
  { name: "Claude", color: "#D97706", bg: "rgba(217,119,6,0.08)" },
  { name: "Copilot", color: "#0078D4", bg: "rgba(0,120,212,0.08)" },
  { name: "Perplexity", color: "#A855F7", bg: "rgba(168,85,247,0.08)" },
  { name: "Sirius AI", color: "#00D4FF", bg: "rgba(0,212,255,0.10)", isSirius: true },
];

const FEATURES: Feature[] = [
  // Core AI
  { category: "Core AI", name: "Conversational AI", desc: "Natural language chat and Q&A", platforms: { ChatGPT: true, Grok: true, Gemini: true, Claude: true, Copilot: true, Perplexity: true, "Sirius AI": true } },
  { category: "Core AI", name: "Image Generation", desc: "Create images from text prompts", platforms: { ChatGPT: true, Grok: true, Gemini: true, Claude: false, Copilot: true, Perplexity: false, "Sirius AI": true } },
  { category: "Core AI", name: "Voice / Audio", desc: "Voice input and spoken responses", platforms: { ChatGPT: true, Grok: true, Gemini: true, Claude: false, Copilot: true, Perplexity: false, "Sirius AI": true } },
  { category: "Core AI", name: "Code Generation", desc: "Write, review and debug code", platforms: { ChatGPT: true, Grok: true, Gemini: true, Claude: true, Copilot: true, Perplexity: false, "Sirius AI": true } },
  { category: "Core AI", name: "Web Search (Real-time)", desc: "Access live web data in answers", platforms: { ChatGPT: true, Grok: true, Gemini: true, Claude: false, Copilot: true, Perplexity: true, "Sirius AI": true } },

  // Research & Analysis
  { category: "Research & Analysis", name: "Deep Research Mode", desc: "Multi-step web research with cited reports", platforms: { ChatGPT: true, Grok: true, Gemini: true, Claude: false, Copilot: false, Perplexity: true, "Sirius AI": true } },
  { category: "Research & Analysis", name: "Document Intelligence", desc: "Upload & interrogate PDFs, docs, spreadsheets", platforms: { ChatGPT: true, Grok: false, Gemini: true, Claude: true, Copilot: true, Perplexity: false, "Sirius AI": true } },
  { category: "Research & Analysis", name: "Data Analysis (CSV/Excel)", desc: "Upload data files and get chart insights", platforms: { ChatGPT: true, Grok: false, Gemini: true, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Research & Analysis", name: "Memory / Context", desc: "Remembers facts across conversations", platforms: { ChatGPT: "Limited", Grok: false, Gemini: "Limited", Claude: "Projects only", Copilot: false, Perplexity: false, "Sirius AI": true } },

  // Business Intelligence — Sirius Exclusive Zone
  { category: "Business Intelligence", name: "Business Profile Brain", desc: "AI learns your company, goals, clients permanently", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Business Intelligence", name: "Autonomous Market Scanning", desc: "24/7 AI scans for opportunities while you sleep", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Business Intelligence", name: "Revenue Intelligence", desc: "AI-generated revenue reports and commission tracking", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Business Intelligence", name: "Outreach Automation", desc: "AI-written sales campaigns sent to real contacts", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Business Intelligence", name: "Funding Radar", desc: "Scans grants and investment opportunities for your business", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Business Intelligence", name: "Growth Engine", desc: "AI creates complete growth content: blogs, SEO, social", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Business Intelligence", name: "Commerce Lab", desc: "Full product launch engine: concept to sales", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },

  // Platform
  { category: "Platform", name: "Private Command Centre", desc: "Secure personal lab for your eyes only", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Platform", name: "AI-Created Projects", desc: "AI discovers opportunity → creates full project automatically", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Platform", name: "Agency Management", desc: "Run client packages, pitches, and proposals from one place", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Platform", name: "Custom Domain", desc: "Your AI partner on your own branded domain", exclusive: true, platforms: { ChatGPT: false, Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
  { category: "Platform", name: "Bot Creation Studio", desc: "Build and deploy custom AI bots for any business", exclusive: true, platforms: { ChatGPT: "GPTs (limited)", Grok: false, Gemini: false, Claude: false, Copilot: false, Perplexity: false, "Sirius AI": true } },
];

const categories = Array.from(new Set(FEATURES.map(f => f.category)));

function Cell({ value, isSirius }: { value: boolean | string; isSirius?: boolean }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: isSirius ? "rgba(0,212,255,0.15)" : "rgba(15,23,42,0.07)" }}>
          <Check className="w-3 h-3" style={{ color: isSirius ? "#00D4FF" : "rgba(15,23,42,0.55)" }} />
        </div>
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <X className="w-3.5 h-3.5" style={{ color: "rgba(15,23,42,0.15)" }} />
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(15,23,42,0.07)", color: "rgba(15,23,42,0.45)", fontSize: "10px" }}>
        {value}
      </span>
    </div>
  );
}

export function ComparePage() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (cat: string) => setCollapsed(p => ({ ...p, [cat]: !p[cat] }));

  const siriusFeatureCount = FEATURES.filter(f => f.platforms["Sirius AI"] === true).length;
  const exclusiveCount = FEATURES.filter(f => f.exclusive).length;

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC", color: "#0F172A", fontFamily: "'SF Pro Display', 'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <div className="max-w-screen-xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <img src="/sirius-logo.png" alt="Sirius AI" className="w-8 h-8 rounded-xl" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-bold text-base tracking-tight" style={{ color: "#00D4FF" }}>SIRIUS AI</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/discover" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">Discover</a>
            <a href="/" className="text-sm px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,45%))", color: "white" }}>
              Try Sirius Free →
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-screen-xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.25)", color: "#00D4FF" }}>
          <Zap className="w-3 h-3" />
          Sirius AI vs Every Major Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight">
          Why settle for a chatbot<br />
          <span style={{ color: "#00D4FF" }}>when you can have a partner?</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-10">
          ChatGPT, Grok, Gemini, Claude — they all answer questions.<br />
          Sirius AI scans markets, writes campaigns, tracks revenue, and builds your business while you sleep.
        </p>

        {/* Stats row */}
        <div className="inline-flex items-center gap-8 px-8 py-4 rounded-2xl" style={{ background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.09)" }}>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#00D4FF" }}>{siriusFeatureCount}/{FEATURES.length}</div>
            <div className="text-slate-400 text-xs mt-0.5">Features matched</div>
          </div>
          <div className="w-px h-10" style={{ background: "rgba(15,23,42,0.1)" }} />
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#FFD700" }}>{exclusiveCount}</div>
            <div className="text-slate-400 text-xs mt-0.5">Exclusive to Sirius</div>
          </div>
          <div className="w-px h-10" style={{ background: "rgba(15,23,42,0.1)" }} />
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#A855F7" }}>0</div>
            <div className="text-slate-400 text-xs mt-0.5">Competitors match all</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-screen-xl mx-auto px-4 pb-20">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,0.09)", background: "#FFFFFF" }}>

          {/* Table header */}
          <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: "minmax(200px,1fr) repeat(7, 90px)", background: "#F1F5F9", borderBottom: "1px solid rgba(15,23,42,0.09)" }}>
            <div className="px-5 py-4">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Feature</span>
            </div>
            {PLATFORMS.map(p => (
              <div key={p.name} className="py-4 px-1 flex flex-col items-center justify-center gap-1"
                style={{ background: p.isSirius ? "rgba(0,212,255,0.05)" : "transparent", borderLeft: p.isSirius ? "1px solid rgba(0,212,255,0.15)" : "1px solid rgba(15,23,42,0.05)" }}>
                {p.isSirius && <Star className="w-3 h-3" style={{ color: "#FFD700" }} />}
                <span className="text-xs font-bold leading-tight text-center" style={{ color: p.isSirius ? "#00D4FF" : "rgba(15,23,42,0.55)", fontSize: "10px" }}>
                  {p.name}
                </span>
              </div>
            ))}
          </div>

          {/* Feature rows by category */}
          {categories.map(cat => {
            const catFeatures = FEATURES.filter(f => f.category === cat);
            const isCollapsed = collapsed[cat];
            return (
              <div key={cat}>
                {/* Category header */}
                <button
                  onClick={() => toggle(cat)}
                  className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:bg-white/[0.02]"
                  style={{ borderTop: "1px solid rgba(15,23,42,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(15,23,42,0.4)" }}>{cat}</span>
                  {isCollapsed
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-900/20" />
                    : <ChevronUp className="w-3.5 h-3.5 text-slate-900/20" />}
                </button>

                {!isCollapsed && catFeatures.map((feature, fi) => (
                  <div key={feature.name}
                    className="grid"
                    style={{
                      gridTemplateColumns: "minmax(200px,1fr) repeat(7, 90px)",
                      borderTop: "1px solid rgba(15,23,42,0.05)",
                      background: feature.exclusive ? "rgba(0,212,255,0.02)" : "transparent"
                    }}>
                    {/* Feature name */}
                    <div className="px-5 py-3.5 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: feature.exclusive ? "rgba(15,23,42,0.85)" : "rgba(15,23,42,0.67)" }}>
                          {feature.name}
                        </span>
                        {feature.exclusive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                            style={{ background: "rgba(0,212,255,0.12)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>
                            Exclusive
                          </span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "rgba(15,23,42,0.45)" }}>{feature.desc}</span>
                    </div>

                    {/* Platform cells */}
                    {PLATFORMS.map(p => (
                      <div key={p.name} className="flex items-center justify-center py-3.5 px-1"
                        style={{
                          background: p.isSirius ? "rgba(0,212,255,0.04)" : "transparent",
                          borderLeft: p.isSirius ? "1px solid rgba(0,212,255,0.10)" : "1px solid rgba(15,23,42,0.04)"
                        }}>
                        <Cell value={feature.platforms[p.name]} isSirius={p.isSirius} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-block px-10 py-10 rounded-3xl" style={{ background: "#F1F5F9", border: "1px solid rgba(0,212,255,0.15)" }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="w-5 h-5" style={{ color: "#FFD700" }} />
              <span className="text-slate-900 font-bold text-xl">The only AI that works for your business</span>
              <Star className="w-5 h-5" style={{ color: "#FFD700" }} />
            </div>
            <p className="text-slate-400 text-sm mb-7 max-w-md mx-auto">
              Every other platform answers questions. Sirius AI scans markets, creates projects, runs outreach, tracks revenue — all without being asked.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="/"
                className="px-7 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,45%))", color: "white" }}>
                Start for Free →
              </a>
              <a href="/star-lab"
                className="px-7 py-3 rounded-xl font-bold text-sm transition-all hover:bg-slate-900/10"
                style={{ background: "rgba(15,23,42,0.07)", color: "rgba(15,23,42,0.72)", border: "1px solid rgba(15,23,42,0.12)" }}>
                Open Star Lab
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
