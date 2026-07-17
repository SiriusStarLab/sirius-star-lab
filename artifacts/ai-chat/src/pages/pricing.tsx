import React, { useState } from "react";
import { Check, Zap, Star, ArrowLeft, Loader2 } from "lucide-react";
import { getApiBase } from "@/lib/api-base";
import { getUserId } from "@/lib/user-id";

const PLANS = [
  {
    id: "plus" as const,
    name: "Plus",
    price: "£9.99",
    period: "/month",
    tagline: "For daily users who want more",
    color: "hsl(193,100%,45%)",
    icon: Zap,
    features: [
      "75 messages per day",
      "Dream Lab — build & track your dreams",
      "Sirius remembers you across sessions",
      "Full memory & personalisation",
      "Priority response speed",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "£19.99",
    period: "/month",
    tagline: "For power users — no limits",
    color: "hsl(45,100%,52%)",
    icon: Star,
    features: [
      "500 messages per day",
      "Everything in Plus",
      "Voice conversations",
      "Telegram — Sirius messages you proactively",
      "Early access to new features",
    ],
    featured: true,
  },
];

export function PricingPage() {
  const [loading, setLoading] = useState<"plus" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = getUserId();

  const handleCheckout = async (tier: "plus" | "pro") => {
    setLoading(tier);
    setError(null);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #04081a 0%, #070d20 55%, #050e1b 100%)",
      color: "#fff",
      fontFamily: "Outfit, sans-serif",
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle, rgba(0,212,255,0.07) 1px, transparent 1px),
                          radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "56px 56px, 28px 28px",
        backgroundPosition: "0 0, 14px 14px",
      }} />
      <div style={{
        position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 500, pointerEvents: "none",
        background: "radial-gradient(circle, hsla(193,100%,45%,0.1) 0%, transparent 65%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 540, margin: "0 auto", padding: "40px 20px 60px" }}>

        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: 13, marginBottom: 40 }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}>
          <ArrowLeft size={14} /> Back to Sirius
        </a>

        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: 999, padding: "5px 14px", marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(155,70%,55%)", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "hsl(193,100%,60%)", textTransform: "uppercase" }}>Upgrade Sirius</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px,7vw,38px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 12 }}>
            More messages.<br />More intelligence.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            Start free with 10 messages a day — upgrade any time.<br />Cancel whenever you like.
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "14px 18px", marginBottom: 18,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Free</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>10 messages per day · chat, wellbeing, learn & universe · always free</p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)",
          }}>Current</span>
        </div>

        {PLANS.map(plan => {
          const Icon = plan.icon;
          return (
            <div key={plan.id} style={{
              background: plan.featured ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${plan.featured ? plan.color + "40" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 20,
              padding: "24px 22px",
              marginBottom: 14,
              position: "relative",
              boxShadow: plan.featured ? `0 0 40px ${plan.color}12` : "none",
            }}>
              {plan.featured && (
                <div style={{
                  position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                  background: plan.color, color: "#04081a",
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                  padding: "3px 12px", borderRadius: 999,
                }}>Most Popular</div>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: `${plan.color}18`, border: `1px solid ${plan.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={18} style={{ color: plan.color }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 17 }}>{plan.name}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{plan.tagline}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: plan.color }}>{plan.price}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{plan.period}</span>
                </div>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px" }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                    <Check size={13} style={{ color: plan.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading !== null}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: "none",
                  background: loading === plan.id ? `${plan.color}80` : plan.color,
                  color: "#04081a", fontSize: 14, fontWeight: 700, cursor: loading !== null ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >
                {loading === plan.id
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Opening checkout…</>
                  : `Get ${plan.name} — ${plan.price}/mo`
                }
              </button>
            </div>
          );
        })}

        {error && (
          <p style={{ textAlign: "center", color: "hsl(0,80%,65%)", fontSize: 13, marginTop: 10 }}>{error}</p>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 24, lineHeight: 1.6 }}>
          Payments secured by Stripe · Cancel anytime from your account · No hidden fees
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
