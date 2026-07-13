import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getApiBase } from "@/lib/api-base";
import { Brain, Zap, Globe, ArrowRight, Sparkles, TrendingUp, Shield, Clock, ChevronRight } from "lucide-react";

type Project = { id: number; name: string; industry: string; phase: string; brief: string; createdAt: string };
type Discovery = { id: number; title: string; category: string; summary: string; source: string; createdAt: string };
type Stats = { totalOpportunities: number; approvedInsights: number; sectorsActive: number; lastScan: string };

const SECTOR_COLORS: Record<string, string> = {
  "Oil & Gas": "hsl(35,90%,50%)",
  "Aerospace": "hsl(210,80%,50%)",
  "Medical": "hsl(340,80%,55%)",
  "Medical Devices": "hsl(340,80%,55%)",
  "Hydrogen": "hsl(155,70%,42%)",
  "SaaS": "hsl(280,70%,55%)",
  "Bot": "hsl(193,100%,38%)",
  "Engineering": "hsl(25,90%,50%)",
  "Legal": "hsl(220,70%,50%)",
  "Healthcare": "hsl(340,70%,50%)",
  "Finance": "hsl(155,80%,38%)",
  "General": "hsl(226,50%,50%)",
};

function sectorColor(sector: string) {
  for (const [key, color] of Object.entries(SECTOR_COLORS)) {
    if (sector?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "hsl(226,50%,50%)";
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC", color: "#0F172A", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Sirius Star Lab" className="w-8 h-8 rounded-xl" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="font-bold text-lg tracking-tight" style={{ color: "#0F172A" }}>Sirius Star Lab</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm hidden sm:inline">Intelligence that works while you don't</span>
          <a href="/" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
            style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,50%))" }}>
            Try Sirius Free <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10"
            style={{ background: "radial-gradient(ellipse, hsl(193,100%,50%), transparent)" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-medium"
            style={{ background: "rgba(0,180,216,0.09)", color: "hsl(193,100%,32%)", border: "1px solid rgba(0,180,216,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(193,100%,38%)" }} />
            Live Intelligence Feed — Updated Every 6 Hours
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold mb-4 leading-tight" style={{ color: "#0F172A" }}>
            What Sirius Is<br />
            <span style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,50%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Discovering Right Now
            </span>
          </h1>

          <p className="text-slate-500 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Sirius Star Lab's autonomous intelligence runs 24/7 — scanning every industry, every market, every emerging opportunity. This is what it's found.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <a href="/" className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,55%))" }}>
              <Sparkles className="w-4 h-4" /> Start for Free
            </a>
            <a href="/why-sirius" className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all hover:bg-slate-100"
              style={{ background: "white", color: "#475569", border: "1px solid rgba(15,23,42,0.1)" }}>
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
                  <p className="text-3xl font-bold" style={{ color: "#0F172A" }}>{s.value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* What is this section */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="rounded-3xl p-8 relative overflow-hidden bg-white" style={{ border: "1px solid rgba(15,23,42,0.09)", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5 pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(193,100%,50%), transparent)", transform: "translate(30%, -30%)" }} />
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-mono mb-3 uppercase tracking-widest" style={{ color: "hsl(193,100%,35%)", letterSpacing: "0.15em" }}>THE VISION</p>
              <h2 className="text-2xl font-bold mb-3 leading-snug" style={{ color: "#0F172A" }}>"I think, so I am."</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Sirius Star Lab was built on one question: what happens when AI and humans stop being separate things? Not a tool you use. A genuine intelligence partnership — two minds in contact, each making the other more than they were alone.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mt-3">
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
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(0,180,216,0.1)" }}>
                    <f.icon className="w-4 h-4" style={{ color: "hsl(193,100%,35%)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0F172A" }}>{f.label}</p>
                    <p className="text-slate-400 text-xs">{f.desc}</p>
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
            <h2 className="text-2xl font-bold" style={{ color: "#0F172A" }}>Live Intelligence Feed</h2>
            <p className="text-slate-400 text-sm mt-1">AI-discovered opportunities, updated automatically</p>
          </div>
          <a href="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            See all in Star Lab <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl h-40 animate-pulse bg-white" style={{ border: "1px solid rgba(15,23,42,0.07)" }} />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 9).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-5 group cursor-default transition-all hover:shadow-md bg-white"
                style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
                    style={{ background: `${sectorColor(p.industry)}12`, color: sectorColor(p.industry) }}>
                    {p.industry}
                  </span>
                  <span className="text-slate-300 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(p.createdAt)}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-2 leading-snug" style={{ color: "#0F172A" }}>{p.name}</h3>
                {p.brief && <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{p.brief}</p>}
              </motion.div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-3 text-center py-16">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 text-sm">Intelligence scan in progress — check back shortly</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Discoveries */}
      {discoveries.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 mb-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold" style={{ color: "#0F172A" }}>Intelligence Signals</h2>
            <p className="text-slate-400 text-sm mt-1">Trends, patterns, and market signals detected by Sirius</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {discoveries.slice(0, 6).map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-4 flex items-start gap-4 bg-white" style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "rgba(245,158,11,0.1)" }}>
                  <TrendingUp className="w-4 h-4" style={{ color: "hsl(45,100%,45%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1 leading-snug" style={{ color: "#0F172A" }}>{d.title}</p>
                  {d.summary && <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{d.summary}</p>}
                  <p className="text-slate-300 text-xs mt-2">{d.category} · {timeAgo(d.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Block */}
      <div className="max-w-3xl mx-auto px-6 mb-24 text-center">
        <div className="rounded-3xl p-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(226,70%,50%))" }}>
          <h2 className="text-3xl font-bold text-white mb-3">Your intelligence, running now</h2>
          <p className="text-white/80 text-base mb-8 max-w-xl mx-auto leading-relaxed">
            Everything on this page was found by Sirius Star Lab automatically. You get the same intelligence — scanning your sectors, finding your opportunities — from the moment you sign up.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="/" className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-lg transition-all hover:opacity-90 hover:scale-105 bg-white"
              style={{ color: "hsl(193,100%,35%)" }}>
              <Sparkles className="w-5 h-5" /> Start Free — No Card Needed
            </a>
          </div>
          <p className="text-white/60 text-xs mt-4">Free plan · Plus from £9.99/month · Cancel anytime</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center bg-white" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
        <p className="text-slate-400 text-sm">
          © {new Date().getFullYear()} Sirius Star Lab ·{" "}
          <a href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</a> ·{" "}
          <a href="/terms" className="hover:text-slate-700 transition-colors">Terms</a> ·{" "}
          <a href="/why-sirius" className="hover:text-slate-700 transition-colors">Why Sirius?</a>
        </p>
      </footer>
    </div>
  );
}
