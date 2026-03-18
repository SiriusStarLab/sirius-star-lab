import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Sparkles, Crown, Loader2, Shield, RotateCcw } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

const PLANS = [
  {
    id: "free",
    name: "Explorer",
    price: "Free",
    period: "",
    tag: "ALWAYS FREE",
    tagColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(255,255,255,0.08)",
    icon: <Sparkles style={{ width: 18, height: 18 }} />,
    iconBg: "rgba(255,255,255,0.06)",
    iconColor: "rgba(255,255,255,0.4)",
    features: [
      "30 messages per day",
      "Real-time web search",
      "All topics & moods",
      "Daily wisdom",
      "Conversation history",
    ],
    missing: ["Image generation", "Unlimited messages", "Sirius remembers you"],
  },
  {
    id: "plus",
    name: "Plus",
    price: "£5",
    period: "/month",
    tag: "MOST POPULAR",
    tagColor: "#00d4ff",
    borderColor: "rgba(0,212,255,0.3)",
    glow: "0 0 30px rgba(0,212,255,0.12)",
    icon: <Zap style={{ width: 18, height: 18 }} fill="currentColor" />,
    iconBg: "rgba(0,212,255,0.12)",
    iconColor: "#00d4ff",
    features: [
      "200 messages per day",
      "Real-time web search",
      "10 image generations/day",
      "Full conversation history",
      "Sirius remembers you",
      "All topics & moods",
    ],
    missing: [],
  },
  {
    id: "pro",
    name: "Pro",
    price: "£12",
    period: "/month",
    tag: "UNLIMITED",
    tagColor: "#f59e0b",
    borderColor: "rgba(245,158,11,0.25)",
    glow: "0 0 30px rgba(245,158,11,0.1)",
    icon: <Crown style={{ width: 18, height: 18 }} />,
    iconBg: "rgba(245,158,11,0.1)",
    iconColor: "#f59e0b",
    features: [
      "Unlimited messages",
      "Unlimited image generation",
      "Real-time web search",
      "Full conversation history",
      "Deep memory & personalisation",
      "Priority response speed",
      "Early access to new features",
    ],
    missing: [],
  },
];

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
}

export function PricingModal({ isOpen, onClose, currentTier = "free" }: PricingModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = getUserId();

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setLoadingPlan(null);
    }
  }, [isOpen]);

  async function handleUpgrade(tier: "plus" | "pro") {
    setLoadingPlan(tier);
    setError(null);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout");
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  }

  const isPremium = currentTier !== "free";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(8,12,26,0.85)",
              backdropFilter: "blur(12px)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              position: "fixed", inset: 0, zIndex: 51,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "16px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                pointerEvents: "auto",
                width: "100%",
                maxWidth: 880,
                maxHeight: "92vh",
                overflowY: "auto",
                borderRadius: 20,
                background: "#080c1a",
                border: "1px solid rgba(0,212,255,0.15)",
                boxShadow: "0 0 60px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div style={{ position: "relative", padding: "28px 24px 0" }}>
                <button
                  onClick={onClose}
                  style={{
                    position: "absolute", top: 20, right: 20,
                    width: 32, height: 32, borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "rgba(255,255,255,0.4)",
                  }}
                >
                  <X size={15} />
                </button>

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: "0.25em", color: "rgba(0,212,255,0.5)", textTransform: "uppercase", marginBottom: 6 }}>
                    Sirius AI
                  </p>
                  <p style={{ fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: "0.1em", color: "rgba(0,212,255,0.3)", marginBottom: 12 }}>
                    I think, so I am
                  </p>
                  <h2 style={{
                    fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, marginBottom: 8,
                    background: "linear-gradient(135deg, #ffffff 0%, #00d4ff 50%, rgba(255,255,255,0.6) 100%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>
                    Choose your partnership level
                  </h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 320, margin: "0 auto" }}>
                    Less than a coffee a month. Cancel any time.
                  </p>
                </div>
              </div>

              {/* Plans grid */}
              <div style={{
                padding: "0 20px 20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}>
                {PLANS.map((plan) => {
                  const isCurrentPlan = plan.id === currentTier;
                  const isLoading = loadingPlan === plan.id;

                  return (
                    <div
                      key={plan.id}
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 16,
                        padding: "20px 18px",
                        background: isCurrentPlan ? "rgba(0,212,255,0.04)" : "rgba(15,20,37,0.8)",
                        border: `1px solid ${isCurrentPlan ? plan.borderColor : "rgba(255,255,255,0.07)"}`,
                        boxShadow: isCurrentPlan ? (plan as any).glow || "none" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <p style={{ fontSize: 9, fontFamily: "Space Mono, monospace", letterSpacing: "0.2em", marginBottom: 14, color: plan.tagColor, textTransform: "uppercase" }}>
                        {plan.tag}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: plan.iconBg, color: plan.iconColor,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {plan.icon}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{plan.name}</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Sirius AI</p>
                        </div>
                      </div>

                      <div style={{ marginBottom: 18 }}>
                        <span style={{ fontSize: 32, fontWeight: 800, color: "#fff" }}>{plan.price}</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{plan.period}</span>
                        {plan.id !== "free" && (
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
                            billed monthly · cancel any time
                          </p>
                        )}
                      </div>

                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", flex: 1 }}>
                        {plan.features.map((f) => (
                          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                            <Check size={12} style={{ color: "#00d4ff", marginTop: 2, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{f}</span>
                          </li>
                        ))}
                        {plan.missing.map((f) => (
                          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, opacity: 0.3 }}>
                            <span style={{ width: 12, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "line-through" }}>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {isCurrentPlan ? (
                        <div style={{
                          padding: "10px 0", textAlign: "center",
                          fontSize: 11, fontFamily: "Space Mono, monospace",
                          letterSpacing: "0.15em", textTransform: "uppercase",
                          color: "rgba(0,212,255,0.5)",
                          background: "rgba(0,212,255,0.06)",
                          borderRadius: 10,
                          border: "1px solid rgba(0,212,255,0.15)",
                        }}>
                          Current plan
                        </div>
                      ) : plan.id === "free" ? (
                        <div style={{
                          padding: "10px 0", textAlign: "center",
                          fontSize: 11, fontFamily: "Space Mono, monospace",
                          letterSpacing: "0.15em", textTransform: "uppercase",
                          color: "rgba(255,255,255,0.2)",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          Included
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(plan.id as "plus" | "pro")}
                          disabled={!!loadingPlan}
                          style={{
                            width: "100%",
                            padding: "12px 0",
                            borderRadius: 10,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontSize: 14, fontWeight: 700,
                            cursor: loadingPlan ? "not-allowed" : "pointer",
                            opacity: loadingPlan && !isLoading ? 0.5 : 1,
                            transition: "all 0.2s",
                            border: "none",
                            background: plan.id === "plus"
                              ? (isLoading ? "rgba(0,212,255,0.15)" : "#00d4ff")
                              : (isLoading ? "rgba(245,158,11,0.15)" : "#f59e0b"),
                            color: isLoading
                              ? (plan.id === "plus" ? "#00d4ff" : "#f59e0b")
                              : "#080c1a",
                          }}
                        >
                          {isLoading ? (
                            <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Taking you to payment…</>
                          ) : (
                            <>
                              {plan.id === "plus" ? <Zap size={14} fill="currentColor" /> : <Crown size={14} />}
                              Upgrade to {plan.name}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  margin: "0 20px 16px",
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444",
                  fontSize: 13,
                  textAlign: "center",
                }}>
                  {error}
                </div>
              )}

              {/* Already subscribed — manage billing */}
              {isPremium && (
                <div style={{ padding: "0 20px 16px" }}>
                  <button
                    onClick={async () => {
                      try {
                        const base = getApiBase();
                        const res = await fetch(`${base}stripe/portal`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId }),
                        });
                        const { url } = await res.json();
                        if (url) window.location.href = url;
                      } catch {}
                    }}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontSize: 13, color: "rgba(255,255,255,0.5)",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={13} />
                    Manage billing & subscription
                  </button>
                </div>
              )}

              {/* Footer */}
              <div style={{ padding: "0 20px 24px", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                  <Shield size={11} style={{ color: "rgba(255,255,255,0.2)" }} />
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                    Payments processed securely by Stripe · Your data is never sold
                  </p>
                </div>
                <a
                  href="mailto:support@siriusai.app"
                  style={{ fontSize: 11, color: "rgba(0,212,255,0.35)" }}
                >
                  Contact support
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
