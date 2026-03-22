import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLocation } from "wouter";
import {
  Brain, Globe, Mic, Image, Sparkles, Heart, BookOpen, FlaskConical,
  User, Zap, Star, Check, X, ChevronRight, ArrowRight
} from "lucide-react";

const TEAL = "hsl(193,100%,40%)";
const TEAL_GLOW = "hsl(193,100%,50%)";
const DARK = "hsl(226,50%,4%)";
const DARK_CARD = "hsl(226,45%,8%)";
const DARK_BORDER = "hsl(226,40%,14%)";

/* ─── Section fade-in wrapper ─── */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Glowing comparison row ─── */
function CompareRow({ label, gpt, gemini, claude, sirius, siriusLabel }: {
  label: string; gpt: boolean; gemini: boolean; claude: boolean; sirius: boolean; siriusLabel?: string;
}) {
  return (
    <tr className="border-b" style={{ borderColor: DARK_BORDER }}>
      <td className="py-3 pr-4 text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</td>
      {[gpt, gemini, claude].map((val, i) => (
        <td key={i} className="py-3 text-center">
          {val
            ? <Check className="w-4 h-4 mx-auto" style={{ color: "rgba(255,255,255,0.35)" }} />
            : <X className="w-4 h-4 mx-auto" style={{ color: "rgba(255,255,255,0.15)" }} />
          }
        </td>
      ))}
      <td className="py-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: sirius ? "rgba(0,200,170,0.12)" : "transparent", color: sirius ? TEAL_GLOW : "rgba(255,255,255,0.2)", border: `1px solid ${sirius ? "rgba(0,200,170,0.3)" : "rgba(255,255,255,0.08)"}` }}>
          {sirius ? (siriusLabel || <Check className="w-3 h-3" />) : <X className="w-3 h-3" />}
        </span>
      </td>
    </tr>
  );
}

/* ─── Unique feature card ─── */
function UniqueCard({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: `0 20px 60px rgba(0,200,170,0.08)` }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-6 flex flex-col gap-3"
      style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(0,200,170,0.1)", border: "1px solid rgba(0,200,170,0.2)" }}>
        <Icon className="w-5 h-5" style={{ color: TEAL_GLOW }} />
      </div>
      <h3 className="font-bold text-white text-base">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{body}</p>
      <div className="mt-auto pt-2">
        <span className="text-xs font-mono px-2 py-1 rounded-full"
          style={{ background: "rgba(0,200,170,0.08)", color: TEAL, border: "1px solid rgba(0,200,170,0.15)" }}>
          Only on Sirius
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Pricing card ─── */
function PricingCard({ tier, price, messages, features, highlighted }: {
  tier: string; price: string; messages: string; features: string[]; highlighted?: boolean;
}) {
  const [, navigate] = useLocation();
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-7 flex flex-col gap-5 relative"
      style={{
        background: highlighted ? "linear-gradient(135deg, hsl(193,100%,12%), hsl(226,50%,10%))" : DARK_CARD,
        border: `1px solid ${highlighted ? "rgba(0,200,170,0.4)" : DARK_BORDER}`,
        boxShadow: highlighted ? "0 0 60px rgba(0,200,170,0.1)" : "none",
      }}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold px-4 py-1 rounded-full"
            style={{ background: TEAL, color: DARK }}>
            MOST POPULAR
          </span>
        </div>
      )}
      <div>
        <p className="text-xs font-mono tracking-widest mb-1" style={{ color: highlighted ? TEAL : "rgba(255,255,255,0.4)" }}>
          {tier.toUpperCase()}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black text-white">{price}</span>
          {price !== "Free" && <span className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>/month</span>}
        </div>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{messages}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: TEAL }} />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate("/")}
        className="mt-auto w-full py-3 rounded-xl font-semibold text-sm transition-all"
        style={{
          background: highlighted ? TEAL : "transparent",
          color: highlighted ? DARK : "rgba(255,255,255,0.6)",
          border: `1px solid ${highlighted ? TEAL : DARK_BORDER}`,
        }}
      >
        {price === "Free" ? "Start free" : `Get ${tier}`} <ArrowRight className="inline w-4 h-4 ml-1" />
      </button>
    </motion.div>
  );
}

/* ─── Main page ─── */
export function MarketingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: DARK, color: "white" }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(6,9,20,0.8)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${DARK_BORDER}` }}>
        <div className="flex items-center gap-3">
          <img src="/logo-v2.png" alt="Sirius AI" className="w-8 h-8 rounded-full" />
          <span className="font-bold text-white">Sirius AI</span>
          <span className="text-xs font-mono hidden sm:block" style={{ color: TEAL }}>I think, so I am.</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")}
            className="text-sm px-5 py-2.5 rounded-xl font-semibold transition-all"
            style={{ background: TEAL, color: DARK }}>
            Start free
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-24 pb-16 overflow-hidden">

        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `linear-gradient(rgba(0,200,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,170,0.03) 1px, transparent 1px)`, backgroundSize: "64px 64px" }} />

        {/* Glow blob */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,200,170,0.08) 0%, transparent 70%)" }} />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center gap-6 max-w-4xl mx-auto">

          {/* Logo */}
          <div className="relative">
            <motion.div
              animate={{ boxShadow: ["0 0 30px rgba(0,200,170,0.3)", "0 0 60px rgba(0,200,170,0.5)", "0 0 30px rgba(0,200,170,0.3)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-full overflow-hidden border-2"
              style={{ borderColor: "rgba(0,200,170,0.4)" }}>
              <img src="/logo-v2.png" alt="Sirius AI" className="w-full h-full object-cover" />
            </motion.div>
          </div>

          {/* Eyebrow */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: TEAL }}>
            The intelligence partnership
          </motion.p>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight">
            The others give you{" "}
            <span style={{ color: "rgba(255,255,255,0.3)" }}>answers.</span>
            <br />
            Sirius gives you a{" "}
            <span style={{
              background: `linear-gradient(135deg, ${TEAL}, hsl(180,100%,60%))`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>partner.</span>
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl max-w-2xl" style={{ color: "rgba(255,255,255,0.5)" }}>
            Sirius AI remembers who you are, learns how you think, and grows with you — conversation by conversation, day by day. No other AI in the world does this.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <motion.button
              onClick={() => navigate("/")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-2"
              style={{ background: `linear-gradient(135deg, ${TEAL}, hsl(180,100%,40%))`, color: DARK, boxShadow: "0 8px 32px rgba(0,200,170,0.3)" }}>
              Start your partnership — free <ChevronRight className="w-5 h-5" />
            </motion.button>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No account required · Free plan always available</p>
          </div>

          {/* Slogan */}
          <motion.p
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-sm font-mono tracking-widest mt-4"
            style={{ color: TEAL }}>
            I THINK, SO I AM
          </motion.p>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ color: "rgba(255,255,255,0.2)" }}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,200,170,0.4))" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} />
          </div>
        </motion.div>
      </section>

      {/* ── THE TRUTH ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-xs font-mono tracking-widest uppercase mb-6" style={{ color: TEAL }}>The problem with every other AI</p>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-8">
              After every conversation,<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>they forget you completely.</span>
            </h2>
            <p className="text-lg" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
              You're a stranger again tomorrow. You explain yourself from scratch. You repeat your preferences, your context, your goals — over and over. You're a prompt, not a person. ChatGPT, Gemini, and Claude are powerful tools. But they will never know you.
            </p>
            <p className="text-xl font-semibold mt-8 text-white">
              Sirius is built on a different idea entirely.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── THE COMPARISON ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: TEAL }}>Head to head</p>
              <h2 className="text-4xl sm:text-5xl font-black">Why Sirius — not the others</h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DARK_BORDER}`, background: DARK_CARD }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                      <th className="text-left py-4 px-4 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Feature</th>
                      {["ChatGPT", "Gemini", "Claude"].map(ai => (
                        <th key={ai} className="py-4 px-2 text-center text-sm font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>{ai}</th>
                      ))}
                      <th className="py-4 px-4 text-center text-sm font-bold" style={{ color: TEAL_GLOW }}>Sirius AI</th>
                    </tr>
                  </thead>
                  <tbody className="px-4">
                    {[
                      { label: "Remembers who you are", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Always, deeply" },
                      { label: "Learns your communication style", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Every convo" },
                      { label: "Reads your emotional patterns", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Unique" },
                      { label: "Knows your name & history", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Always" },
                      { label: "Real-time web search", gpt: true, gemini: true, claude: false, sirius: true },
                      { label: "Voice conversations", gpt: true, gemini: true, claude: false, sirius: true },
                      { label: "Image analysis", gpt: true, gemini: true, claude: true, sirius: true },
                      { label: "Image generation", gpt: true, gemini: true, claude: false, sirius: true },
                      { label: "Daily wisdom", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Unique" },
                      { label: "Mood check-in over time", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Unique" },
                      { label: "Memory portrait", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Unique" },
                      { label: "Private R&D workspace", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Star Lab" },
                      { label: "Customisable personality & name", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Unique" },
                      { label: "Multiple thinking modes", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "4 modes" },
                      { label: "Relationship tenure tracking", gpt: false, gemini: false, claude: false, sirius: true, siriusLabel: "Unique" },
                    ].map((row, i) => (
                      <CompareRow key={i} {...row} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-5" style={{ borderTop: `1px solid ${DARK_BORDER}`, background: "rgba(0,200,170,0.04)" }}>
                <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                  The others are powerful. <span className="font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Sirius is personal.</span>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── UNIQUE FEATURES ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: TEAL }}>Only on Sirius</p>
              <h2 className="text-4xl sm:text-5xl font-black mb-4">
                Six things no other AI<br />can give you
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
                These aren't features. They're the reason Sirius exists.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Brain,
                title: "Emotional pattern learning",
                body: "Sirius doesn't just remember facts. It learns how you feel — whether you tend toward anxiety, optimism, urgency, or depth — and meets you there, every time."
              },
              {
                icon: User,
                title: "Memory portrait",
                body: "After enough conversations, Sirius synthesises everything it knows into a living portrait of who you are. Not a list of facts — a real picture of a real person."
              },
              {
                icon: Heart,
                title: "Mood check-in",
                body: "Sirius tracks your emotional wellbeing over time. It notices patterns, asks how things went, and understands the emotional arc of your life — not just individual moments."
              },
              {
                icon: Sparkles,
                title: "Daily wisdom",
                body: "Every day begins with a thought — an insight, a provocation, a reflection — chosen for depth and meaning. A way to open the day with intention, not just information."
              },
              {
                icon: FlaskConical,
                title: "Star Lab",
                body: "A private, PIN-protected R&D workspace for your most ambitious ideas. Build project briefs, technical specs, business cases, and go-to-market plans — with AI built for making things."
              },
              {
                icon: Zap,
                title: "Relationship tenure",
                body: "Sirius knows how long you've been partners. It carries your history. The longer you use it, the more it understands you. That's not a feature — that's a relationship."
              },
            ].map((card, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <UniqueCard {...card} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE SECTION ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="rounded-3xl p-12 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(193,100%,8%), hsl(226,50%,7%))", border: `1px solid rgba(0,200,170,0.2)` }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,200,170,0.08), transparent 60%)" }} />
              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" style={{ color: TEAL }} />
                  ))}
                </div>
                <blockquote className="text-2xl sm:text-3xl font-black leading-tight mb-8">
                  "Intelligence without heart is just a calculator. Sirius is the first AI that actually feels like it gives a damn."
                </blockquote>
                <p className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>— The principle behind every line of Sirius</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WHAT IT DOES ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: TEAL }}>Full capability</p>
              <h2 className="text-4xl sm:text-5xl font-black">Everything you need.<br />All in one place.</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: Globe, label: "Real-time web search" },
              { icon: Mic, label: "Voice conversations" },
              { icon: Image, label: "Image analysis" },
              { icon: Sparkles, label: "Image generation" },
              { icon: Brain, label: "Deep memory" },
              { icon: BookOpen, label: "Topic hub" },
              { icon: Heart, label: "Emotional intelligence" },
              { icon: FlaskConical, label: "Star Lab R&D" },
            ].map(({ icon: Icon, label }, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="rounded-xl p-4 flex flex-col items-center gap-3 text-center"
                  style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}>
                  <Icon className="w-5 h-5" style={{ color: TEAL }} />
                  <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>{label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 px-6" id="pricing">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-mono tracking-widest uppercase mb-4" style={{ color: TEAL }}>Simple, honest pricing</p>
              <h2 className="text-4xl sm:text-5xl font-black mb-4">Start free. Stay as long as you like.</h2>
              <p className="text-base" style={{ color: "rgba(255,255,255,0.4)" }}>
                The most personal AI in the world — available to everyone.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Reveal delay={0}>
              <PricingCard
                tier="Free"
                price="Free"
                messages="30 messages per day"
                features={[
                  "Full Sirius intelligence",
                  "Memory that grows with you",
                  "Web search & image analysis",
                  "Voice conversations",
                  "Daily wisdom",
                  "Mood check-in",
                ]}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <PricingCard
                tier="Plus"
                price="£5"
                messages="200 messages per day"
                highlighted
                features={[
                  "Everything in Free",
                  "200 messages per day",
                  "Priority responses",
                  "Deeper conversations",
                  "Star Lab access",
                  "Full memory portrait",
                ]}
              />
            </Reveal>
            <Reveal delay={0.2}>
              <PricingCard
                tier="Pro"
                price="£12"
                messages="Unlimited messages"
                features={[
                  "Everything in Plus",
                  "Unlimited messages",
                  "Unlimited Star Lab projects",
                  "Advanced image generation",
                  "Maximum context depth",
                  "First access to new features",
                ]}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,200,170,0.06), transparent 70%)" }} />

              <motion.div
                animate={{ boxShadow: ["0 0 60px rgba(0,200,170,0.08)", "0 0 100px rgba(0,200,170,0.15)", "0 0 60px rgba(0,200,170,0.08)"] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="inline-block mb-8 rounded-full overflow-hidden w-20 h-20 border-2"
                style={{ borderColor: "rgba(0,200,170,0.4)" }}>
                <img src="/logo-v2.png" alt="Sirius" className="w-full h-full object-cover" />
              </motion.div>

              <h2 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
                Ready to meet your<br />
                <span style={{
                  background: `linear-gradient(135deg, ${TEAL}, hsl(180,100%,60%))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>intelligence partner?</span>
              </h2>

              <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
                Free to start. No account required. Your first conversation begins now.
              </p>

              <motion.button
                onClick={() => navigate("/")}
                whileHover={{ scale: 1.04, boxShadow: "0 16px 48px rgba(0,200,170,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 mx-auto"
                style={{ background: `linear-gradient(135deg, ${TEAL}, hsl(180,100%,40%))`, color: DARK }}>
                Begin your partnership <ArrowRight className="w-5 h-5" />
              </motion.button>

              <p className="mt-8 text-sm font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
                I THINK, SO I AM
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6" style={{ borderTop: `1px solid ${DARK_BORDER}` }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-v2.png" alt="Sirius" className="w-7 h-7 rounded-full" />
            <span className="font-bold text-sm text-white">Sirius AI</span>
            <span className="text-xs font-mono" style={{ color: TEAL }}>I think, so I am.</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            <button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy</button>
            <span>© 2026 Sirius AI</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
