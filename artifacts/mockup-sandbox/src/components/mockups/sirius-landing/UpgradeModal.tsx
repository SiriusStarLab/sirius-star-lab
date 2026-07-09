import { useState } from "react";

const FEATURES = {
  starlab: {
    label: "Star Lab",
    price: "$20",
    period: "/mo",
    color: "#00C4FF",
    glow: "rgba(0,196,255,0.15)",
    border: "rgba(0,196,255,0.3)",
    gradient: "linear-gradient(135deg, #00C4FF 0%, #0099CC 100%)",
    items: [
      { icon: "◈", text: "200 messages / day", sub: "vs 20 on Free" },
      { icon: "⚡", text: "Sonnet-class AI", sub: "Noticeably smarter responses" },
      { icon: "🧠", text: "Persistent memory", sub: "Sirius remembers your goals & context" },
      { icon: "⚙️", text: "Background tasks", sub: "2 concurrent autonomous tasks" },
      { icon: "🌌", text: "Full Dream Lab access", sub: "Unlimited journaling & manifestation" },
      { icon: "📡", text: "Intelligence Feed", sub: "Daily AI & market discovery sweep" },
    ],
  },
  pro: {
    label: "Sirius Pro",
    price: "$49",
    period: "/mo",
    color: "#00E5A0",
    glow: "rgba(0,229,160,0.15)",
    border: "rgba(0,229,160,0.3)",
    gradient: "linear-gradient(135deg, #00E5A0 0%, #00AA78 100%)",
    items: [
      { icon: "∞", text: "Unlimited messages", sub: "No daily cap, ever" },
      { icon: "🤖", text: "Autonomous Worker", sub: "5 concurrent background tasks" },
      { icon: "🧬", text: "Deep memory system", sub: "Cross-session structured memory" },
      { icon: "💻", text: "Code Agent", sub: "AI that builds & deploys real software" },
      { icon: "🎯", text: "Command Centre", sub: "Full project pipeline orchestration" },
      { icon: "🔔", text: "Telegram notifications", sub: "Real-time updates wherever you are" },
    ],
  },
};

function PlanCard({ plan, selected, onSelect }: { plan: typeof FEATURES.starlab; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        flex: 1,
        borderRadius: "16px",
        border: `1.5px solid ${selected ? plan.border : "rgba(255,255,255,0.08)"}`,
        background: selected
          ? `radial-gradient(ellipse at 50% 0%, ${plan.glow} 0%, rgba(6,10,20,0.95) 60%)`
          : "rgba(6,10,20,0.7)",
        padding: "28px 24px",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {selected && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: plan.gradient,
        }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: plan.color, fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
            {plan.label}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
            <span style={{ fontSize: "2rem", fontWeight: 700, color: "white" }}>{plan.price}</span>
            <span style={{ fontSize: "0.8rem", color: "rgba(180,200,220,0.5)", fontWeight: 300 }}>{plan.period}</span>
          </div>
        </div>
        <div style={{
          width: "20px", height: "20px", borderRadius: "50%",
          border: `2px solid ${selected ? plan.color : "rgba(255,255,255,0.2)"}`,
          background: selected ? plan.color : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: "4px",
        }}>
          {selected && <span style={{ fontSize: "10px", color: "#0B0F19", fontWeight: 700 }}>✓</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {plan.items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "14px", marginTop: "1px", flexShrink: 0 }}>{item.icon}</span>
            <div>
              <p style={{ fontSize: "0.82rem", color: "rgba(220,235,250,0.9)", fontWeight: 400, lineHeight: 1.3 }}>{item.text}</p>
              <p style={{ fontSize: "0.7rem", color: "rgba(140,160,180,0.55)", fontWeight: 300, marginTop: "1px" }}>{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UpgradeModal() {
  const [selected, setSelected] = useState<"starlab" | "pro">("starlab");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const plan = FEATURES[selected];

  const price = billing === "annual"
    ? { starlab: "$16", pro: "$39" }[selected]
    : plan.price;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0F19",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 30%, rgba(0,196,255,0.05) 0%, transparent 60%)",
      }} />

      {/* Modal */}
      <div style={{
        width: "100%",
        maxWidth: "780px",
        background: "rgba(8,13,26,0.96)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        backdropFilter: "blur(24px)",
        overflow: "hidden",
        position: "relative",
        zIndex: 10,
      }}>

        {/* Top gradient bar */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, #00C4FF 0%, #00E5A0 100%)" }} />

        {/* Header */}
        <div style={{ padding: "32px 36px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "rgba(0,229,160,0.7)", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                You've reached your daily limit
              </p>
              <h2 style={{
                fontSize: "1.6rem", fontWeight: 300, letterSpacing: "-0.01em",
                background: "linear-gradient(135deg, #ffffff 30%, #a8e6f0 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                marginBottom: "6px",
              }}>
                Unlock the full Sirius experience
              </h2>
              <p style={{ fontSize: "0.85rem", color: "rgba(180,200,220,0.55)", fontWeight: 300 }}>
                20 free messages used today. Choose a plan to keep going.
              </p>
            </div>
            {/* Close X */}
            <button style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px", color: "rgba(200,220,240,0.5)", fontSize: "14px",
              width: "32px", height: "32px", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>✕</button>
          </div>

          {/* Billing toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" }}>
            <span style={{ fontSize: "0.78rem", color: "rgba(180,200,220,0.6)" }}>Monthly</span>
            <div
              onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
              style={{
                width: "40px", height: "22px", borderRadius: "11px", cursor: "pointer",
                background: billing === "annual" ? "#00E5A0" : "rgba(255,255,255,0.1)",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                position: "absolute", top: "3px",
                left: billing === "annual" ? "21px" : "3px",
                width: "16px", height: "16px", borderRadius: "50%",
                background: "white", transition: "left 0.2s",
              }} />
            </div>
            <span style={{ fontSize: "0.78rem", color: "rgba(180,200,220,0.6)" }}>
              Annual
              <span style={{
                marginLeft: "6px", fontSize: "0.68rem", fontWeight: 600,
                color: "#00E5A0", background: "rgba(0,229,160,0.1)",
                padding: "2px 7px", borderRadius: "20px",
              }}>Save 20%</span>
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ padding: "24px 36px", display: "flex", gap: "16px" }}>
          <PlanCard plan={{ ...FEATURES.starlab, price }} selected={selected === "starlab"} onSelect={() => setSelected("starlab")} />
          <PlanCard plan={{ ...FEATURES.pro, price: billing === "annual" ? "$39" : "$49" }} selected={selected === "pro"} onSelect={() => setSelected("pro")} />
        </div>

        {/* CTA */}
        <div style={{ padding: "0 36px 32px" }}>
          <button style={{
            width: "100%",
            background: plan.gradient,
            border: "none",
            borderRadius: "12px",
            color: "#0B0F19",
            fontWeight: 700,
            fontSize: "0.9rem",
            letterSpacing: "0.06em",
            padding: "16px",
            cursor: "pointer",
            marginBottom: "12px",
          }}>
            Start {plan.label} — {price}{billing === "annual" ? "/mo billed annually" : "/month"}
          </button>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "rgba(120,140,160,0.5)" }}>
            Cancel anytime · No commitment · Instant access
          </p>
        </div>

        {/* What free includes */}
        <div style={{ padding: "16px 36px 28px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: "0.7rem", color: "rgba(120,140,160,0.4)", letterSpacing: "0.05em", marginBottom: "10px" }}>INCLUDED ON FREE</p>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {["20 messages / day", "Dream Lab access", "Star Lab access", "Basic AI model"].map(f => (
              <span key={f} style={{ fontSize: "0.75rem", color: "rgba(160,180,200,0.4)", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ color: "rgba(100,120,140,0.4)" }}>✓</span> {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
