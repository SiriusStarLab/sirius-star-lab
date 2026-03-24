import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getApiBase } from "@/lib/api-base";
import { Brain, Zap, Globe, ArrowRight, Sparkles, TrendingUp, Shield, Clock, ChevronRight } from "lucide-react";

type Project = { id: number; name: string; industry: string; phase: string; brief: string; createdAt: string };
type Discovery = { id: number; title: string; category: string; summary: string; source: string; createdAt: string };
type Stats = { totalOpportunities: number; approvedInsights: number; sectorsActive: number; lastScan: string };

const SECTOR_COLORS: Record<string, string> = {
  "Oil & Gas": "hsl(35,90%,55%)",
  "Aerospace": "hsl(210,80%,55%)",
  "Medical": "hsl(340,80%,60%)",
  "Medical Devices": "hsl(340,80%,60%)",
  "Hydrogen": "hsl(155,70%,50%)",
  "SaaS": "hsl(280,70%,60%)",
  "Bot": "hsl(193,100%,45%)",
  "Engineering": "hsl(25,90%,55%)",
  "Legal": "hsl(220,70%,55%)",
  "Healthcare": "hsl(340,70%,55%)",
  "Finance": "hsl(155,80%,45%)",
  "General": "hsl(226,50%,55%)",
};

function sectorColor(sector: string) {
  for (const [key, color] of Object.entries(SECTOR_COLORS)) {
    if (sector?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "hsl(226,50%,55%)";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export function DiscoverPage() {
  const base = getApiBase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${base}public/discover`)
      .then(r => r.json())
      .then(d => { setProjects(d.projects || []); setDiscoveries(d.discoveries || []); setStats(d.stats || null); })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "hsl(226,45%,4%)", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ background: "rgba(10,13,28,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Sirius Star Lab" className="w-8 h-8 rounded-xl" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-white font-bold text-lg tracking-tight">Sirius Star Lab</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm hidden sm:inline">Intelligence that works while you don't</span>
          <a href="/" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
            style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,50%))" }}>
            Try Sirius Free <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-15" style={{ background: "radial-gradient(ellipse, hsl(193,100%,50%), transparent)" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-medium" style={{ background: "hsla(193,100%,40%,0.12)", color: "hsl(193,100%,65%)", border: "1px solid hsla(193,100%,40%,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(193,100%,60%)" }} />
            Live Intelligence Feed — Updated Every 6 Hours
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4 leading-tight">
            What Sirius Is<br />
            <span style={{ background: "linear-gradient(135deg, hsl(193,100%,60%), hsl(226,80%,70%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Discovering Right Now
            </span>
          </h1>

          <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Sirius Star Lab's autonomous intelligence runs 24/7 — scanning every industry, every market, every emerging opportunity. This is what it's found.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <a href="/" className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,55%))" }}>
              <Sparkles className="w-4 h-4" /> Start for Free
            </a>
            <a href="/why-sirius" className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white/70 font-semibold transition-all hover:text-white"
              style={{ background: "hsl(226,45%,10%)", border: "1px solid rgba(255,255,255,0.08)" }}>
              What is Sirius Star Lab?
            </a>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
              {[
                { label: "Opportunities Scanned", value: stats.totalOpportunities.toString() },
                { label: "Validated Insights", value: stats.approvedInsights.toString() },
                { label: "Active Sectors", value: stats.sectorsActive.toString() },
                { label: "AI Running", value: "24/7" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl font-bold text-white">{s.value}</p>
                  <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* What is this section */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="rounded-3xl p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsla(193,100%,30%,0.1), hsla(226,70%,50%,0.07))", border: "1px solid hsla(193,100%,40%,0.15)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, hsl(193,100%,50%), transparent)", transform: "translate(30%, -30%)" }} />
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-mono mb-3" style={{ color: "hsl(193,100%,60%)", letterSpacing: "0.15em" }}>THE VISION</p>
              <h2 className="text-2xl font-bold text-white mb-3 leading-snug">"I think, so I am."</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Sirius Star Lab was built on one question: what happens when AI and humans stop being separate things? Not a tool you use. A genuine intelligence partnership — two minds in contact, each making the other more than they were alone.
              </p>
              <p className="text-white/40 text-sm leading-relaxed mt-3">
                The logo shows two faces. You cannot tell which is human, which is AI. That ambiguity is not an accident. It is the entire message.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: Brain, label: "Autonomous Intelligence", desc: "Scans markets, finds opportunities, generates insights — while you sleep" },
                { icon: Zap, label: "Zero Delay", desc: "Real research, real sources, in seconds" },
                { icon: Globe, label: "Every Sector", desc: "Engineering, SaaS, medical, energy, finance — nothing is off limits" },
                { icon: Shield, label: "Your Private Lab", desc: "Every insight is private to you. No one else sees your intelligence." },
              ].map(f => (
                <div key={f.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "hsla(193,100%,40%,0.15)" }}>
                    <f.icon className="w-4 h-4" style={{ color: "hsl(193,100%,55%)" }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{f.label}</p>
                    <p className="text-white/40 text-xs">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Discoveries */}
      <div className="max-w-6xl mx-auto px-6 mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Live Intelligence Feed</h2>
            <p className="text-white/30 text-sm mt-1">AI-discovered opportunities, updated automatically</p>
          </div>
          <a href="/" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
            See all in Star Lab <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl h-40 animate-pulse" style={{ background: "hsl(226,45%,9%)" }} />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 9).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-5 group cursor-default transition-all hover:scale-[1.01]"
                style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
                    style={{ background: `${sectorColor(p.industry)}18`, color: sectorColor(p.industry) }}>
                    {p.industry}
                  </span>
                  <span className="text-white/20 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(p.createdAt)}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{p.name}</h3>
                {p.brief && <p className="text-white/35 text-xs leading-relaxed line-clamp-3">{p.brief}</p>}
              </motion.div>
            ))}

            {/* Empty states */}
            {projects.length === 0 && (
              <div className="col-span-3 text-center py-16">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-white/10" />
                <p className="text-white/30 text-sm">Intelligence scan in progress — check back shortly</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Discoveries */}
      {discoveries.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 mb-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Intelligence Signals</h2>
            <p className="text-white/30 text-sm mt-1">Trends, patterns, and market signals detected by Sirius</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {discoveries.slice(0, 6).map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-4 flex items-start gap-4"
                style={{ background: "hsl(226,45%,8%)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "hsla(45,100%,50%,0.1)" }}>
                  <TrendingUp className="w-4 h-4" style={{ color: "hsl(45,100%,60%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium mb-1 leading-snug">{d.title}</p>
                  {d.summary && <p className="text-white/35 text-xs leading-relaxed line-clamp-2">{d.summary}</p>}
                  <p className="text-white/20 text-xs mt-2">{d.category} · {timeAgo(d.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Block */}
      <div className="max-w-3xl mx-auto px-6 mb-24 text-center">
        <div className="rounded-3xl p-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(226,45%,10%), hsl(226,45%,8%))", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-8" style={{ background: "radial-gradient(circle, hsl(193,100%,50%), transparent)", transform: "translate(30%, 30%)" }} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Your intelligence, running now</h2>
          <p className="text-white/50 text-base mb-8 max-w-xl mx-auto leading-relaxed">
            Everything on this page was found by Sirius Star Lab automatically. You get the same intelligence — scanning your sectors, finding your opportunities — from the moment you sign up.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="/" className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,55%))" }}>
              <Sparkles className="w-5 h-5" /> Start Free — No Card Needed
            </a>
          </div>
          <p className="text-white/25 text-xs mt-4">Free plan · Pro from £5/month · Cancel anytime</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-white/20 text-sm">
          © {new Date().getFullYear()} Sirius Star Lab · Strategic Innovation Dundee Ltd ·{" "}
          <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a> ·{" "}
          <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a> ·{" "}
          <a href="/why-sirius" className="hover:text-white/50 transition-colors">Why Sirius?</a>
        </p>
      </footer>
    </div>
  );
}
