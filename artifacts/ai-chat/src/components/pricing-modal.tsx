import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Crown, Loader2, CreditCard } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

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
  const historyPushedRef = useRef(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ siriusPricing: true }, "");
    historyPushedRef.current = true;
    closingRef.current = false;
    const onPop = () => {
      if (!closingRef.current) {
        closingRef.current = true;
        historyPushedRef.current = false;
        onClose();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isOpen]);

  async function handleCheckout(tier: "plus" | "pro") {
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
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Could not start checkout. Please try again.");
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function handleClose() {
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      closingRef.current = true;
      window.history.back();
    }
    onClose();
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(8,12,26,0.88)", backdropFilter: "blur(14px)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 51,
              display: "flex", justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%", maxWidth: 540,
                borderRadius: "24px 24px 0 0",
                background: "#0c1020",
                border: "1px solid rgba(0,212,255,0.15)",
                borderBottom: "none",
                boxShadow: "0 -20px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,212,255,0.06)",
                overflow: "hidden",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 4 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
              </div>

              <button
                onClick={handleClose}
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

              <div style={{ padding: "12px 24px 32px", maxHeight: "85vh", overflowY: "auto" }}>

                {/* ── ACTIVE PLAN ── */}
                {isPremium ? (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Your Sirius plan</h2>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>You're already a partner. Thank you.</p>
                    </div>
                    <div style={{
                      borderRadius: 14, background: "rgba(0,212,255,0.04)",
                      border: "1.5px solid rgba(0,212,255,0.2)",
                      padding: "16px 20px", marginBottom: 20,
                      display: "flex", alignItems: "center", gap: 14,
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: currentTier === "pro" ? "rgba(245,158,11,0.1)" : "rgba(0,212,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {currentTier === "pro" ? <Crown size={18} style={{ color: "#f59e0b" }} /> : <Zap size={18} style={{ color: "#00d4ff" }} fill="#00d4ff" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: currentTier === "pro" ? "#f59e0b" : "#00d4ff" }}>
                          Sirius {currentTier === "pro" ? "Pro" : "Plus"} — Active
                        </p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                          {currentTier === "pro" ? "Unlimited everything" : "200 messages/day"} · {currentTier === "pro" ? "£19.99" : "£9.99"}/month
                        </p>
                      </div>
                      <Check size={18} style={{ color: currentTier === "pro" ? "#f59e0b" : "#00d4ff" }} />
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                      To cancel, visit your Stripe billing portal or contact us.
                    </p>
                  </>
                ) : (
                  <>
                    {/* ── PLANS ── */}
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                        Get more from Sirius
                      </h2>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                        Secure checkout · Cancel any time
                      </p>
                    </div>

                    {/* Plus */}
                    <div style={{
                      borderRadius: 18,
                      background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,212,255,0.04))",
                      border: "1.5px solid rgba(0,212,255,0.35)",
                      padding: "20px 20px 18px", marginBottom: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: "rgba(0,212,255,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Zap size={20} style={{ color: "#00d4ff" }} fill="#00d4ff" />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>£9.99</span>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>/month</span>
                          </div>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Sirius Plus · billed monthly</p>
                        </div>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px" }}>
                        {["200 messages every day", "Sirius remembers you between sessions", "Image analysis", "Full conversation history", "Real-time web search", "Dream Lab access"].map(f => (
                          <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,212,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Check size={10} style={{ color: "#00d4ff" }} strokeWidth={3} />
                            </div>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleCheckout("plus")}
                        disabled={loading !== null}
                        style={{
                          width: "100%", padding: "15px", borderRadius: 12, border: "none",
                          background: loading === "plus" ? "rgba(0,212,255,0.3)" : "#00d4ff",
                          color: loading === "plus" ? "#00d4ff" : "#080c1a",
                          fontSize: 15, fontWeight: 700,
                          cursor: loading !== null ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                      >
                        {loading === "plus"
                          ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Opening checkout…</>
                          : <><CreditCard size={15} /> Get Plus — £9.99/month</>
                        }
                      </button>
                    </div>

                    {/* Pro */}
                    <div style={{
                      borderRadius: 18,
                      background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))",
                      border: "1.5px solid rgba(245,158,11,0.3)",
                      padding: "20px 20px 18px", marginBottom: 20,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: "rgba(245,158,11,0.12)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Crown size={20} style={{ color: "#f59e0b" }} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>£19.99</span>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>/month</span>
                          </div>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Sirius Pro · billed monthly</p>
                        </div>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px" }}>
                        {["Unlimited messages", "Deep memory & full context", "Priority response speed", "Star Lab access", "Everything in Plus"].map(f => (
                          <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Check size={10} style={{ color: "#f59e0b" }} strokeWidth={3} />
                            </div>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleCheckout("pro")}
                        disabled={loading !== null}
                        style={{
                          width: "100%", padding: "15px", borderRadius: 12, border: "none",
                          background: loading === "pro" ? "rgba(245,158,11,0.2)" : "#f59e0b",
                          color: loading === "pro" ? "#f59e0b" : "#080c1a",
                          fontSize: 15, fontWeight: 700,
                          cursor: loading !== null ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                      >
                        {loading === "pro"
                          ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Opening checkout…</>
                          : <><CreditCard size={15} /> Get Pro — £19.99/month</>
                        }
                      </button>
                    </div>

                    {error && (
                      <p style={{ fontSize: 13, color: "#f87171", textAlign: "center", marginBottom: 12 }}>{error}</p>
                    )}

                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                        Powered by Stripe · Secure · Cancel any time
                      </p>
                    </div>
                  </>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export async function startCheckout(userId: string, tier: "plus" | "pro"): Promise<string> {
  return "/upgrade";
}
