import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Crown, Loader2, Building2, Copy, CheckCheck, RotateCcw } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

const BANK = {
  name: "GCTH Supplies Ltd",
  account: "26359434",
  sortCode: "04-03-33",
  bank: "Mettle",
};

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  defaultTier?: "plus" | "pro";
}

export function PricingModal({ isOpen, onClose, currentTier = "free", defaultTier }: PricingModalProps) {
  const [step, setStep] = useState<"plans" | "pay">("plans");
  const [selectedTier, setSelectedTier] = useState<"plus" | "pro">(defaultTier ?? "plus");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const userId = getUserId();
  const isPremium = currentTier !== "free";

  const PRICES = {
    plus: { amount: "£5.00", label: "Sirius Plus", monthly: "£5/month" },
    pro: { amount: "£12.00", label: "Sirius Pro", monthly: "£12/month" },
  };

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}payment/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: selectedTier, name, email }),
      });
      const data = await res.json();
      setReference(data.reference ?? "");
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("plans");
    setDone(false);
    setName("");
    setEmail("");
    onClose();
  }

  function startPay(tier: "plus" | "pro") {
    setSelectedTier(tier);
    setStep("pay");
  }

  const price = PRICES[selectedTier];

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

                {/* ── PLANS VIEW ── */}
                {step === "plans" && !isPremium && (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                        Get more from Sirius
                      </h2>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                        Pay by bank transfer — no card details needed.
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
                            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>£5</span>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>/month</span>
                          </div>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Sirius Plus · billed monthly</p>
                        </div>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px" }}>
                        {["200 messages every day", "Sirius remembers you between sessions", "Image analysis", "Full conversation history", "Real-time web search"].map(f => (
                          <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,212,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Check size={10} style={{ color: "#00d4ff" }} strokeWidth={3} />
                            </div>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => startPay("plus")}
                        style={{
                          width: "100%", padding: "15px", borderRadius: 12, border: "none",
                          background: "#00d4ff", color: "#080c1a", fontSize: 15, fontWeight: 700,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                      >
                        <Zap size={15} fill="currentColor" /> Pay £5/month by bank transfer
                      </button>
                    </div>

                    {/* Pro */}
                    <button
                      onClick={() => startPay("pro")}
                      style={{
                        width: "100%", borderRadius: 14,
                        background: "rgba(245,158,11,0.05)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        padding: "16px 18px",
                        display: "flex", alignItems: "center", gap: 14,
                        cursor: "pointer", marginBottom: 20,
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Crown size={18} style={{ color: "#f59e0b" }} />
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>Go Pro — £12/month</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Unlimited everything · Deep memory · Priority speed</p>
                      </div>
                      <span style={{ fontSize: 18, color: "rgba(245,158,11,0.5)" }}>→</span>
                    </button>

                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Bank transfer · Cancel any time by emailing us</p>
                    </div>
                  </>
                )}

                {/* ── ACTIVE PLAN ── */}
                {step === "plans" && isPremium && (
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
                          {currentTier === "pro" ? "Unlimited everything" : "200 messages/day"} · {currentTier === "pro" ? "£12" : "£5"}/month
                        </p>
                      </div>
                      <Check size={18} style={{ color: currentTier === "pro" ? "#f59e0b" : "#00d4ff" }} />
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                      To cancel, stop your monthly bank transfer and contact us.
                    </p>
                  </>
                )}

                {/* ── PAYMENT DETAILS VIEW ── */}
                {step === "pay" && !done && (
                  <>
                    <button
                      onClick={() => setStep("plans")}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      ← Back
                    </button>

                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                        Pay by bank transfer
                      </h2>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
                        {price.label} · {price.monthly}
                      </p>
                    </div>

                    {/* Bank details */}
                    <div style={{
                      borderRadius: 16, background: "rgba(0,212,255,0.06)",
                      border: "1px solid rgba(0,212,255,0.2)", padding: "18px 20px", marginBottom: 16,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <Building2 size={16} style={{ color: "#00d4ff" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#00d4ff" }}>Bank Transfer Details</span>
                      </div>

                      {[
                        { label: "Pay to", value: BANK.name, key: "name" },
                        { label: "Bank", value: BANK.bank, key: "bank" },
                        { label: "Account number", value: BANK.account, key: "account" },
                        { label: "Sort code", value: BANK.sortCode, key: "sort" },
                        { label: "Amount", value: price.amount, key: "amount" },
                        { label: "Reference", value: `SIRIUS-${userId.substring(0, 8).toUpperCase()}-${selectedTier.toUpperCase()}`, key: "ref" },
                      ].map(({ label, value, key }) => (
                        <div key={key} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{value}</span>
                            <button
                              onClick={() => copy(value, key)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: copied === key ? "#00d4ff" : "rgba(255,255,255,0.3)", padding: 2 }}
                            >
                              {copied === key ? <CheckCheck size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16, lineHeight: 1.6 }}>
                      Make the transfer in your banking app, then tap the button below. Your account will be upgraded within a few hours once we confirm receipt.
                    </p>

                    {/* Optional name/email */}
                    <div style={{ marginBottom: 16 }}>
                      <input
                        placeholder="Your name (optional)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 10,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", fontSize: 14, marginBottom: 8, boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                      <input
                        placeholder="Email for confirmation (optional)"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 10,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", fontSize: 14, boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>

                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      style={{
                        width: "100%", padding: "15px", borderRadius: 12, border: "none",
                        background: loading ? "rgba(0,212,255,0.2)" : "#00d4ff",
                        color: loading ? "#00d4ff" : "#080c1a",
                        fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      {loading
                        ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                        : "I've made the transfer"}
                    </button>
                  </>
                )}

                {/* ── DONE VIEW ── */}
                {step === "pay" && done && (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                      Transfer noted — thank you!
                    </h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 20 }}>
                      Once we confirm your payment, your account will be upgraded to{" "}
                      <strong style={{ color: "#00d4ff" }}>{price.label}</strong>. This usually happens within a few hours.
                    </p>
                    {reference && (
                      <div style={{
                        borderRadius: 10, background: "rgba(0,212,255,0.08)",
                        border: "1px solid rgba(0,212,255,0.2)",
                        padding: "10px 16px", marginBottom: 20, display: "inline-block",
                      }}>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>Your reference</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#00d4ff" }}>{reference}</p>
                      </div>
                    )}
                    <button
                      onClick={handleClose}
                      style={{
                        padding: "12px 32px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
                        fontSize: 14, cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
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
