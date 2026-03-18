import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Crown, Loader2, Shield, RotateCcw, Star } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

async function startCheckout(userId: string, tier: "plus" | "pro"): Promise<string> {
  const base = getApiBase();
  const res = await fetch(`${base}stripe/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, tier }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not start checkout");
  }
  const { url } = await res.json();
  if (!url) throw new Error("No checkout URL returned");
  return url;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  defaultTier?: "plus" | "pro";
}

export function PricingModal({ isOpen, onClose, currentTier = "free", defaultTier }: PricingModalProps) {
  const [loading, setLoading] = useState<"plus" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = getUserId();
  const isPremium = currentTier !== "free";

  async function handleUpgrade(tier: "plus" | "pro") {
    setLoading(tier);
    setError(null);
    try {
      const url = await startCheckout(userId, tier);
      window.location.href = url;
    } catch (err: any) {
      setError("Something went wrong. Please try again in a moment.");
      setLoading(null);
    }
  }

  async function handleManageBilling() {
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
  }

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
              background: "rgba(8,12,26,0.88)",
              backdropFilter: "blur(14px)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{
              position: "fixed",
              bottom: 0, left: 0, right: 0,
              zIndex: 51,
              display: "flex",
              justifyContent: "center",
              padding: "0 0 0 0",
            }}
          >
            {/* Bottom sheet on mobile, centred card on desktop */}
            <div
              style={{
                width: "100%",
                maxWidth: 540,
                borderRadius: "24px 24px 0 0",
                background: "#0c1020",
                border: "1px solid rgba(0,212,255,0.15)",
                borderBottom: "none",
                boxShadow: "0 -20px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,212,255,0.06)",
                overflow: "hidden",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 4 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  position: "absolute", top: 16, right: 16,
                  width: 30, height: 30, borderRadius: 8,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "rgba(255,255,255,0.5)",
                }}
              >
                <X size={14} />
              </button>

              <div style={{ padding: "12px 24px 32px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <h2 style={{
                    fontSize: 22, fontWeight: 800, color: "#fff",
                    marginBottom: 6, letterSpacing: -0.3,
                  }}>
                    {isPremium ? "Your Sirius plan" : "Get more from Sirius"}
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                    {isPremium
                      ? "You're already a partner. Thank you."
                      : "Less than a coffee a month. Cancel any time, no questions asked."}
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171", fontSize: 13, textAlign: "center",
                  }}>
                    {error}
                  </div>
                )}

                {/* PLUS — main card */}
                {currentTier !== "plus" && currentTier !== "pro" && (
                  <div style={{
                    borderRadius: 18,
                    background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,212,255,0.04))",
                    border: "1.5px solid rgba(0,212,255,0.35)",
                    padding: "20px 20px 18px",
                    marginBottom: 12,
                    boxShadow: "0 0 30px rgba(0,212,255,0.1)",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* Popular badge */}
                    <div style={{
                      position: "absolute", top: 14, right: 14,
                      background: "rgba(0,212,255,0.15)",
                      border: "1px solid rgba(0,212,255,0.3)",
                      borderRadius: 20, padding: "3px 10px",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <Star size={9} style={{ color: "#00d4ff" }} fill="#00d4ff" />
                      <span style={{ fontSize: 10, color: "#00d4ff", fontWeight: 600, letterSpacing: "0.08em" }}>MOST POPULAR</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: "rgba(0,212,255,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Zap size={20} style={{ color: "#00d4ff" }} fill="#00d4ff" />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>£5</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>/month</span>
                        </div>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                          Sirius Plus · billed monthly
                        </p>
                      </div>
                    </div>

                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px" }}>
                      {[
                        "200 messages every day",
                        "Sirius remembers you between sessions",
                        "10 image generations per day",
                        "Full conversation history",
                        "Real-time web search",
                      ].map(f => (
                        <li key={f} style={{
                          display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%",
                            background: "rgba(0,212,255,0.12)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Check size={10} style={{ color: "#00d4ff" }} strokeWidth={3} />
                          </div>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade("plus")}
                      disabled={!!loading}
                      style={{
                        width: "100%", padding: "15px",
                        borderRadius: 12, border: "none",
                        background: loading === "plus" ? "rgba(0,212,255,0.2)" : "#00d4ff",
                        color: loading === "plus" ? "#00d4ff" : "#080c1a",
                        fontSize: 15, fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.2s",
                        opacity: loading && loading !== "plus" ? 0.5 : 1,
                      }}
                    >
                      {loading === "plus" ? (
                        <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Getting your payment ready…</>
                      ) : (
                        <>
                          <Zap size={15} fill="currentColor" />
                          Start Plus for £5/month
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Current Plus plan card */}
                {currentTier === "plus" && (
                  <div style={{
                    borderRadius: 18,
                    background: "rgba(0,212,255,0.04)",
                    border: "1.5px solid rgba(0,212,255,0.2)",
                    padding: "16px 20px",
                    marginBottom: 12,
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,212,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Zap size={18} style={{ color: "#00d4ff" }} fill="#00d4ff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#00d4ff" }}>Sirius Plus — Active</p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>200 messages/day · £5/month</p>
                    </div>
                    <Check size={18} style={{ color: "#00d4ff" }} />
                  </div>
                )}

                {/* PRO — secondary option */}
                {currentTier !== "pro" && (
                  <button
                    onClick={() => handleUpgrade("pro")}
                    disabled={!!loading}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      background: "rgba(245,158,11,0.05)",
                      border: "1px solid rgba(245,158,11,0.2)",
                      padding: "16px 18px",
                      display: "flex", alignItems: "center", gap: 14,
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      marginBottom: 20,
                      opacity: loading && loading !== "pro" ? 0.5 : 1,
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {loading === "pro"
                        ? <Loader2 size={18} style={{ color: "#f59e0b", animation: "spin 1s linear infinite" }} />
                        : <Crown size={18} style={{ color: "#f59e0b" }} />}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>
                        {loading === "pro" ? "Getting your payment ready…" : "Go Pro — £12/month"}
                      </p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        Unlimited everything · Deep memory · Priority speed
                      </p>
                    </div>
                    {!loading && <span style={{ fontSize: 18, color: "rgba(245,158,11,0.5)" }}>→</span>}
                  </button>
                )}

                {/* Current Pro plan card */}
                {currentTier === "pro" && (
                  <div style={{
                    borderRadius: 14,
                    background: "rgba(245,158,11,0.04)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    padding: "16px 18px",
                    display: "flex", alignItems: "center", gap: 14,
                    marginBottom: 20,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Crown size={18} style={{ color: "#f59e0b" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>Sirius Pro — Active</p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Unlimited everything · £12/month</p>
                    </div>
                    <Check size={18} style={{ color: "#f59e0b" }} />
                  </div>
                )}

                {/* Manage billing for premium users */}
                {isPremium && (
                  <button
                    onClick={handleManageBilling}
                    style={{
                      width: "100%", padding: "12px",
                      borderRadius: 10, marginBottom: 20,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <RotateCcw size={13} />
                    Manage billing or cancel subscription
                  </button>
                )}

                {/* Trust signals */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 16, flexWrap: "wrap",
                }}>
                  {[
                    { icon: <Shield size={12} />, text: "Secured by Stripe" },
                    { icon: <Check size={12} />, text: "Cancel any time" },
                    { icon: <RotateCcw size={12} />, text: "No questions asked" },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>{icon}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{text}</span>
                    </div>
                  ))}
                </div>
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

// Exported helper so sidebar can go direct to checkout without opening modal
export { startCheckout };
