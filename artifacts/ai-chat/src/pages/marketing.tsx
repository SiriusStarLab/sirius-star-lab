import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  Sparkles, Check, ArrowRight, Zap, Globe, BarChart3,
  Mail, Users, Brain, Rocket, Shield, TrendingUp,
  Cpu, FlaskConical, Atom, Wrench, Activity,
  ChevronDown, Star, Play, X, Loader2,
} from "lucide-react";
import { getApiBase } from "@/lib/api-base";

const TEAL   = "hsl(193,100%,40%)";
const TEAL_D = "hsl(193,100%,28%)";
const DARK   = "#050912";
const CARD   = "rgba(255,255,255,0.032)";
const BORDER = "rgba(255,255,255,0.07)";

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Checkout modal ─────────────────────────────────────────────── */
function CheckoutModal({ pkg, onClose }: {
  pkg: { id: string; name: string; price: number; colour: string }; onClose: () => void
}) {
  const [email, setEmail]           = useState("");
  const [company, setCompany]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const base = getApiBase();

  const startCheckout = async () => {
    if (!email.trim() || !company.trim()) { setError("Please enter your company name and email."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${base}agency/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg.id, email: email.trim(), companyName: company.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); setLoading(false); return; }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,9,18,0.85)", backdropFilter: "blur(12px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#0c1225", border: `1px solid ${BORDER}`, boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${pkg.colour}12` }}>
        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between"
          style={{ borderBottom: `1px solid ${BORDER}`, background: `${pkg.colour}08` }}>
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: pkg.colour, letterSpacing: "0.15em" }}>START YOUR SUBSCRIPTION</p>
            <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              £{(pkg.price).toLocaleString()}/month · Cancel any time
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Company name</label>
            <input value={company} onChange={e => setCompany(e.target.value)}
              placeholder="Your company"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Business email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="you@company.com"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          {error && <p className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>{error}</p>}
          <button onClick={startCheckout} disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${pkg.colour}, ${TEAL_D})`, color: "#fff", opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to secure checkout…</> : <>Continue to Payment <ArrowRight className="w-4 h-4" /></>}
          </button>
          <div className="flex items-center justify-center gap-4 pt-1">
            {["Secure checkout", "Cancel any time", "No setup fee"].map(t => (
              <span key={t} className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                <Check className="w-3 h-3" /> {t}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Package card ───────────────────────────────────────────────── */
function PkgCard({ pkg, featured = false, onSelect }: {
  pkg: { id: string; name: string; price: number; tagline: string; colour: string; features: string[]; ideal: string; roi: string };
  featured?: boolean;
  onSelect: (pkg: any) => void;
}) {
  return (
    <motion.div whileHover={{ y: -6, boxShadow: `0 32px 80px ${pkg.colour}18` }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl flex flex-col relative overflow-hidden"
      style={{
        background: featured ? `linear-gradient(160deg, ${pkg.colour}14, rgba(255,255,255,0.02))` : CARD,
        border: `1px solid ${featured ? pkg.colour + "50" : BORDER}`,
        boxShadow: featured ? `0 0 60px ${pkg.colour}12` : "none",
      }}>
      {featured && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${pkg.colour}, transparent)` }} />
      )}
      {featured && (
        <div className="absolute top-4 right-4">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: `${pkg.colour}22`, color: pkg.colour, border: `1px solid ${pkg.colour}40` }}>
            Most Popular
          </span>
        </div>
      )}
      <div className="p-7 flex flex-col h-full">
        <div className="mb-5">
          <p className="text-xs font-mono mb-2" style={{ color: pkg.colour, letterSpacing: "0.18em" }}>
            {pkg.id.toUpperCase()}
          </p>
          <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{pkg.tagline}</p>
        </div>

        <div className="mb-6">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black text-white">£{pkg.price.toLocaleString()}</span>
            <span className="text-sm mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>/month</span>
          </div>
        </div>

        <ul className="space-y-3 flex-1 mb-6">
          {pkg.features.map(f => (
            <li key={f} className="flex gap-2.5 items-start">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: pkg.colour }} />
              <span className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mb-5 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: `${pkg.colour}08`, border: `1px solid ${pkg.colour}18`, color: "rgba(255,255,255,0.4)" }}>
          💰 {pkg.roi}
        </div>

        <button onClick={() => onSelect(pkg)}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          style={{
            background: featured ? `linear-gradient(135deg, ${pkg.colour}, ${TEAL_D})` : "rgba(255,255,255,0.06)",
            color: featured ? "#fff" : "rgba(255,255,255,0.8)",
            border: featured ? "none" : `1px solid ${BORDER}`,
          }}>
          Get Started <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-center mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
          Ideal for: {pkg.ideal}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export function MarketingPage() {
  const [modal, setModal] = useState<any>(null);

  const packages = [
    {
      id: "social",
      name: "Sirius Social AI",
      price: 799,
      tagline: "Your client's entire social presence, run by AI",
      colour: "hsl(280,70%,65%)",
      features: [
        "30 AI-crafted posts/month across all platforms",
        "LinkedIn, Instagram, X, Facebook, TikTok formats",
        "Engagement reply drafts for every comment",
        "Monthly competitor content analysis",
        "Hashtag strategy + optimised posting schedule",
        "Performance report with AI recommendations",
      ],
      ideal: "E-commerce, hospitality, retail, lifestyle brands",
      roi: "Replaces a £2,500+/month social media manager",
    },
    {
      id: "sales",
      name: "Sirius Sales Intelligence",
      price: 1299,
      tagline: "AI-powered sales engine that never sleeps",
      colour: "hsl(193,100%,50%)",
      features: [
        "AI cold email sequences (5-step outreach + follow-up)",
        "Deep lead intelligence briefs on each prospect",
        "CRM data enrichment — every gap filled",
        "Sales call prep briefs (company, contacts, angles)",
        "Competitor pricing and positioning intelligence",
        "Monthly pipeline analysis + deal acceleration report",
      ],
      ideal: "B2B, SaaS, professional services, agencies",
      roi: "Replaces a £3,000+/month SDR + £1,500/month tool stack",
    },
    {
      id: "fullstack",
      name: "Sirius Full Operations",
      price: 2499,
      tagline: "The complete AI intelligence layer for your entire business",
      colour: "hsl(45,100%,55%)",
      features: [
        "Everything in Social AI + Sales Intelligence",
        "AI customer service — reply drafts for every ticket",
        "2 × monthly long-form blog posts + newsletter",
        "Brand sentiment monitoring + daily alerts",
        "Quarterly deep market intelligence report",
        "Monthly strategy call — insights presented by Garry",
      ],
      ideal: "Scale-ups, growing agencies, ambitious SMEs",
      roi: "Replaces £6,000–£10,000/month of agency, tools & headcount",
    },
  ];

  const sectors = [
    { icon: Activity,     label: "Oil & Gas",            desc: "North Sea and global upstream/downstream operations" },
    { icon: Rocket,       label: "Aerospace",             desc: "Precision components, MRO, defence supply chain" },
    { icon: FlaskConical, label: "Medical Devices",       desc: "ISO-certified manufacturing and procurement teams" },
    { icon: Atom,         label: "Hydrogen & Clean Energy", desc: "Next-generation energy transition businesses" },
    { icon: Wrench,       label: "Precision Engineering", desc: "Turning, milling, EDM, CNC — the full machining world" },
    { icon: Cpu,          label: "Technology & AI",       desc: "SaaS companies, tech agencies, digital-first businesses" },
  ];

  const whys = [
    { icon: Brain,     title: "Thinks like a strategist",   body: "Not just a content generator — Sirius understands your market, your competitors, and your customers before writing a single word." },
    { icon: Globe,     title: "Works while you sleep",      body: "Sirius runs continuously. Research, analysis, content, outreach — all happening in the background, 24/7, without a salary." },
    { icon: TrendingUp, title: "Learns your business",     body: "The more you use Sirius, the sharper it gets. Every brief, every project, every campaign makes it more valuable to your operation." },
    { icon: Shield,    title: "No lock-in contracts",       body: "Cancel any time. No setup fees. No 12-month minimum. Pay monthly and see ROI within 30 days or we'll help you figure out why." },
    { icon: Zap,       title: "Delivered fast",             body: "Content within 48 hours of onboarding. Sales sequences in your inbox within a week. Full operations running inside a month." },
    { icon: Users,     title: "Built for your team",        body: "Sirius integrates into your workflow, not the other way around. Slack, email, CRM — it delivers where your team actually works." },
  ];

  const stats = [
    { value: "£6,000+", label: "Monthly cost Sirius replaces" },
    { value: "48hrs",   label: "From sign-up to first deliverable" },
    { value: "3",       label: "Industries served at launch" },
    { value: "30×",     label: "Content output vs. one person" },
  ];

  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", overflowX: "hidden" }}>
      {modal && <CheckoutModal pkg={modal} onClose={() => setModal(null)} />}

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(5,9,18,0.85)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: "1px solid rgba(0,200,180,0.3)" }}>
            <img src="/logo-v2.png" alt="Sirius Star Lab" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Sirius Star Lab</span>
          <span className="hidden sm:block text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(0,200,180,0.1)", color: TEAL, border: "1px solid rgba(0,200,180,0.2)" }}>
            Agency
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#pricing"
            className="hidden sm:block text-sm font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            Pricing
          </a>
          <a href="#pricing"
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: TEAL, color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}>
            Get Started
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-32 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: `radial-gradient(ellipse, ${TEAL}0d 0%, transparent 70%)`, filter: "blur(40px)" }} />
        </div>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8"
          style={{ background: "rgba(0,200,180,0.08)", border: "1px solid rgba(0,200,180,0.2)", color: TEAL }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL }} />
          Sirius Star Lab · AI Agency Platform
        </motion.div>

        {/* Twin avatar */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-10" style={{ width: 120, height: 120 }}>
          <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${TEAL}22 0%, transparent 70%)`, filter: "blur(16px)" }} />
          <div className="absolute -inset-4 rounded-full" style={{ border: "1px dashed rgba(0,200,180,0.2)", animation: "spin 12s linear infinite" }} />
          <div className="absolute -inset-8 rounded-full" style={{ border: "1px dashed rgba(0,200,180,0.1)", animation: "spin 20s linear infinite reverse" }} />
          <div className="relative rounded-full overflow-hidden" style={{ width: 120, height: 120, border: "2px solid rgba(0,200,180,0.4)", boxShadow: "0 0 40px rgba(0,200,180,0.25)" }}>
            <img src="/logo-v2.png" alt="Sirius Star Lab" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6 max-w-4xl"
          style={{ background: "linear-gradient(160deg, #fff 40%, rgba(255,255,255,0.45) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          I think,<br />so I am.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
          className="text-lg sm:text-xl max-w-2xl leading-relaxed mb-4"
          style={{ color: "rgba(255,255,255,0.55)" }}>
          Sirius is the AI intelligence partner that runs your social media, builds your sales pipeline, and drives your revenue — across oil & gas, aerospace, medical, hydrogen and beyond.
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.35 }}
          className="text-sm font-mono mb-10" style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
          FROM £799/MONTH · NO CONTRACTS · CANCEL ANY TIME
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 items-center">
          <a href="#pricing"
            className="flex items-center gap-2 px-7 py-4 rounded-2xl font-bold text-base transition-all"
            style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_D})`, color: "#fff", boxShadow: `0 8px 40px ${TEAL}30` }}>
            View Packages <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#how"
            className="flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold text-base transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: `1px solid ${BORDER}` }}>
            <Play className="w-4 h-4" /> See What Sirius Does
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 flex flex-col items-center gap-1" style={{ color: "rgba(255,255,255,0.2)" }}>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-6" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 sm:divide-x" style={{ "--tw-divide-opacity": 1 } as any}>
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1} className="flex flex-col items-center text-center px-6 py-2">
              <span className="text-4xl font-black mb-2" style={{ background: `linear-gradient(135deg, #fff 30%, ${TEAL})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>{s.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── SECTORS ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: TEAL, letterSpacing: "0.2em" }}>INDUSTRIES WE SERVE</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Built for the industries<br />that built the world</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              Sirius was built inside a precision engineering and AI company. It understands complex, technical, regulated industries — not just marketing agencies.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.07}>
                <div className="flex gap-4 p-5 rounded-2xl transition-all" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}12`, border: `1px solid ${TEAL}20` }}>
                    <s.icon className="w-5 h-5" style={{ color: TEAL }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-0.5">{s.label}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 px-6" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: TEAL, letterSpacing: "0.2em" }}>HOW IT WORKS</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Sirius thinks.<br />You grow.</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              No complicated setup. No hiring. No waiting months to see results.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Sign up in 60 seconds", body: "Choose your package, pay securely via Stripe. No contracts, no setup fees, no delays." },
              { step: "02", title: "Sirius studies your business", body: "Within 48 hours, Sirius has researched your market, competitors, customers and positioning." },
              { step: "03", title: "Revenue starts moving", body: "Content goes live. Sales sequences launch. Intelligence reports land. Results within 30 days." },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 0.15}>
                <div className="p-6 rounded-2xl h-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="text-5xl font-black mb-4 leading-none" style={{ background: `linear-gradient(135deg, ${TEAL}60, ${TEAL}20)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {s.step}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY SIRIUS ── */}
      <section className="py-24 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: TEAL, letterSpacing: "0.2em" }}>WHY SIRIUS</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Not a tool. A partner.</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              ChatGPT is a calculator. Sirius is a strategist. Here's the difference.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {whys.map((w, i) => (
              <Reveal key={w.title} delay={i * 0.07}>
                <div className="p-6 rounded-2xl h-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}20` }}>
                    <w.icon className="w-5 h-5" style={{ color: TEAL }} />
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{w.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{w.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-mono mb-3" style={{ color: TEAL, letterSpacing: "0.2em" }}>PRICING</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Straight to the point.</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              No enterprise sales process. No 6-month pilots. Choose a package, pay monthly, and see results in 30 days.
            </p>
          </Reveal>
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {packages.map((pkg, i) => (
              <Reveal key={pkg.id} delay={i * 0.1}>
                <PkgCard pkg={pkg} featured={pkg.id === "sales"} onSelect={setModal} />
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              All packages include onboarding call · Secure payment via Stripe · Cancel any time via email
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── VS TABLE ── */}
      <section className="py-24 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-mono mb-3" style={{ color: TEAL, letterSpacing: "0.2em" }}>THE MATHS</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">What Sirius replaces</h2>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${BORDER}` }}>
                    <th className="text-left px-5 py-4 font-semibold text-white">What you'd need to hire</th>
                    <th className="text-right px-5 py-4 font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Monthly cost</th>
                    <th className="text-right px-5 py-4 font-semibold" style={{ color: TEAL }}>Sirius replaces it</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: "Social media manager",   cost: "£2,500–£4,000",  pkg: "Social AI (£799)" },
                    { role: "SDR / Sales person",      cost: "£2,800–£4,500",  pkg: "Sales Intel (£1,299)" },
                    { role: "Content writer",           cost: "£1,500–£3,000",  pkg: "Included in Full Ops" },
                    { role: "Market research firm",     cost: "£3,000–£8,000",  pkg: "Included in Full Ops" },
                    { role: "Social media tools (stack)", cost: "£300–£800",   pkg: "Replaced entirely" },
                  ].map((row, i) => (
                    <tr key={row.role} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td className="px-5 py-3.5" style={{ color: "rgba(255,255,255,0.7)" }}>{row.role}</td>
                      <td className="px-5 py-3.5 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{row.cost}</td>
                      <td className="px-5 py-3.5 text-right text-xs font-semibold" style={{ color: TEAL }}>{row.pkg}</td>
                    </tr>
                  ))}
                  <tr style={{ background: `${TEAL}0a`, borderTop: `2px solid ${TEAL}40` }}>
                    <td className="px-5 py-4 font-bold text-white">Total without Sirius</td>
                    <td className="px-5 py-4 text-right font-bold" style={{ color: "hsl(0,70%,60%)" }}>£10,100–£20,300/mo</td>
                    <td className="px-5 py-4 text-right font-bold" style={{ color: TEAL }}>Sirius: from £799/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 text-center relative overflow-hidden" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${TEAL}0a, transparent)` }} />
        <Reveal className="max-w-2xl mx-auto relative z-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-8 overflow-hidden" style={{ border: "1px solid rgba(0,200,180,0.4)", boxShadow: `0 0 40px ${TEAL}25` }}>
            <img src="/logo-v2.png" alt="Sirius Star Lab" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs font-mono mb-4" style={{ color: TEAL, letterSpacing: "0.2em" }}>READY WHEN YOU ARE</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Stop paying people<br />to do what AI does better.
          </h2>
          <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            Start with any package. Cancel any time. Your first deliverables land within 48 hours of signing up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#pricing"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all"
              style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_D})`, color: "#fff", boxShadow: `0 8px 40px ${TEAL}30` }}>
              Choose a Package <ArrowRight className="w-4 h-4" />
            </a>
            <a href="mailto:hello@sirius-ai.live"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: `1px solid ${BORDER}` }}>
              <Mail className="w-4 h-4" /> hello@sirius-ai.live
            </a>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
        style={{ borderTop: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.2)" }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden opacity-60">
            <img src="/logo-v2.png" alt="Sirius Star Lab" className="w-full h-full object-cover" />
          </div>
          <span>Sirius Star Lab · Sirius Star Lab · Scotland</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/privacy" style={{ color: "rgba(255,255,255,0.25)" }}>Privacy</a>
          <a href="/terms" style={{ color: "rgba(255,255,255,0.25)" }}>Terms</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>sirius-ai.live</span>
        </div>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
