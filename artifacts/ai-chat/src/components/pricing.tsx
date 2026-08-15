import React from "react";
import { Crown, Check, Zap } from "lucide-react";
import { PricingModal } from "./pricing-modal";

interface PricingPageProps {
  currentTier?: string;
  onUpgrade?: () => void;
}

/**
 * Full-page pricing component showing Free vs Premium tiers.
 * Used on the /upgrade route or embedded standalone.
 */
export function PricingPage({ currentTier = "free", onUpgrade }: PricingPageProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const isPremium = currentTier !== "free";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>
          Simple, honest pricing
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 440, lineHeight: 1.6 }}>
          One Premium plan. Everything included. Cancel any time.
        </p>
      </div>

      {/* Plans grid */}
      <div style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%",
        maxWidth: 800,
      }}>

        {/* Free */}
        <div style={{
          flex: "1 1 300px",
          maxWidth: 360,
          borderRadius: 20,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "28px 28px 24px",
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Free</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.5)" }}>£0</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>/month</span>
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
            {["20 messages per day", "Basic Sirius chat", "No memory between sessions"].map(f => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={10} style={{ color: "rgba(255,255,255,0.3)" }} strokeWidth={3} />
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{f}</span>
              </li>
            ))}
          </ul>
          <div style={{
            width: "100%", padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "rgba(255,255,255,0.3)",
            fontSize: 14, fontWeight: 600, textAlign: "center",
          }}>
            {isPremium ? "Downgrade" : "Current plan"}
          </div>
        </div>

        {/* Premium */}
        <div style={{
          flex: "1 1 300px",
          maxWidth: 360,
          borderRadius: 20,
          background: "linear-gradient(145deg, rgba(0,212,255,0.1), rgba(0,212,255,0.03))",
          border: "1.5px solid rgba(0,212,255,0.4)",
          padding: "28px 28px 24px",
          boxShadow: "0 0 40px rgba(0,212,255,0.08)",
          position: "relative",
        }}>
          {/* Best value badge */}
          <div style={{
            position: "absolute", top: -12, right: 20,
            background: "#00d4ff", color: "#080c1a",
            fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
            padding: "4px 12px", borderRadius: 20,
            textTransform: "uppercase",
          }}>
            Everything included
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Crown size={18} style={{ color: "#00d4ff" }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#00d4ff" }}>Premium</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>£19.99</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>/month</span>
            </div>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
            {[
              "Unlimited messages",
              "Dream Lab — build & track your dreams",
              "Star Lab — AI-powered tools & apps",
              "Learn — study plans, quizzes, deep learning",
              "Sirius remembers you between sessions",
              "Image analysis & understanding",
              "Real-time web search",
              "Voice conversations",
              "Telegram — Sirius messages you proactively",
            ].map(f => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,212,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={10} style={{ color: "#00d4ff" }} strokeWidth={3} />
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>{f}</span>
              </li>
            ))}
          </ul>

          {isPremium ? (
            <div style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)",
              color: "#00d4ff", fontSize: 15, fontWeight: 700, textAlign: "center",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Check size={16} /> Active plan
            </div>
          ) : (
            <button
              onClick={() => {
                setModalOpen(true);
                onUpgrade?.();
              }}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: "#00d4ff", color: "#080c1a",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Crown size={16} /> Get Premium — £19.99/month
            </button>
          )}
        </div>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
        Powered by Stripe · Secure · Cancel any time
      </p>

      <PricingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentTier={currentTier}
      />
    </div>
  );
}
