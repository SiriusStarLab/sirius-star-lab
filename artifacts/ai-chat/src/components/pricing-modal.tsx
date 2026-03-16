import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Star, Sparkles, Crown } from "lucide-react";
import { getUserId } from "@/lib/user-id";

declare global {
  interface Window {
    paypal?: any;
  }
}

const PLANS = [
  {
    id: "free",
    name: "Explorer",
    price: "Free",
    period: "",
    tag: "ALWAYS FREE",
    tagColor: "text-muted-foreground",
    borderColor: "border-border/40",
    glowColor: "",
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: "bg-muted/60",
    iconColor: "text-muted-foreground",
    features: [
      "30 messages per day",
      "Web search included",
      "All topics & moods",
      "Daily wisdom",
      "Basic conversation history",
    ],
    missing: ["Image generation", "Unlimited messages", "Saved memories"],
    paypalPlanId: null,
    cta: "Current plan",
    ctaDisabled: true,
  },
  {
    id: "plus",
    name: "Plus",
    price: "$5",
    period: "/month",
    tag: "MOST POPULAR",
    tagColor: "text-primary",
    borderColor: "border-primary/40",
    glowColor: "shadow-[0_0_30px_hsl(193_100%_52%/0.12)]",
    icon: <Zap className="w-5 h-5" fill="currentColor" />,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    features: [
      "200 messages per day",
      "Web search included",
      "10 image generations/day",
      "Full conversation history",
      "Sirius remembers you",
      "All topics & moods",
    ],
    missing: [],
    paypalPlanId: import.meta.env.VITE_PAYPAL_PLUS_PLAN_ID || "",
    cta: "Upgrade to Plus",
    ctaDisabled: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "/month",
    tag: "UNLIMITED",
    tagColor: "text-amber-400",
    borderColor: "border-amber-400/30",
    glowColor: "shadow-[0_0_30px_hsl(45_95%_58%/0.1)]",
    icon: <Crown className="w-5 h-5" />,
    iconBg: "bg-amber-400/10",
    iconColor: "text-amber-400",
    features: [
      "Unlimited messages",
      "Unlimited image generation",
      "Web search included",
      "Full conversation history",
      "Deep memory & personalisation",
      "Priority response speed",
      "Early access to new features",
    ],
    missing: [],
    paypalPlanId: import.meta.env.VITE_PAYPAL_PRO_PLAN_ID || "",
    cta: "Upgrade to Pro",
    ctaDisabled: false,
  },
];

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
}

export function PricingModal({ isOpen, onClose, currentTier = "free" }: PricingModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const userId = getUserId();

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb";

  useEffect(() => {
    if (!isOpen) return;
    if (window.paypal) { setPaypalReady(true); return; }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.onload = () => setPaypalReady(true);
    script.onerror = () => console.error("PayPal SDK failed to load");
    document.head.appendChild(script);
  }, [isOpen, clientId]);

  useEffect(() => {
    if (!paypalReady || !isOpen) return;

    for (const plan of PLANS) {
      if (!plan.paypalPlanId || plan.id === currentTier) continue;
      const containerId = `paypal-button-${plan.id}`;
      const container = document.getElementById(containerId);
      if (!container || container.children.length > 0) continue;

      try {
        window.paypal.Buttons({
          style: {
            shape: "rect",
            color: plan.id === "plus" ? "blue" : "gold",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription: (_data: any, actions: any) => {
            return actions.subscription.create({ plan_id: plan.paypalPlanId });
          },
          onApprove: async (data: any) => {
            setLoadingPlan(plan.id);
            try {
              const res = await fetch("/api/subscription/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  subscriptionId: data.subscriptionID,
                  tier: plan.id,
                }),
              });
              if (res.ok) {
                window.location.reload();
              }
            } catch (err) {
              console.error("Subscription activation failed:", err);
            } finally {
              setLoadingPlan(null);
            }
          },
          onError: (err: any) => {
            console.error("PayPal error:", err);
            setLoadingPlan(null);
          },
        }).render(`#${containerId}`);
      } catch (e) {
        console.error("Failed to render PayPal button for", plan.id, e);
      }
    }
  }, [paypalReady, isOpen, currentTier, userId]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl"
              style={{
                background: "hsl(224 28% 6%)",
                border: "1px solid hsl(193 100% 52% / 0.15)",
                boxShadow: "0 0 60px hsl(193 100% 52% / 0.08), 0 40px 80px hsl(0 0% 0% / 0.5)"
              }}>

              {/* Header */}
              <div className="relative p-6 pb-0">
                <button onClick={onClose}
                  className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  style={{ background: "hsl(224 24% 11%)", border: "1px solid hsl(224 20% 16%)" }}>
                  <X size={15} />
                </button>
                <div className="text-center mb-6">
                  <p className="text-[10px] font-mono tracking-[0.25em] text-primary/60 uppercase mb-3">Sirius AI</p>
                  <h2 className="text-2xl font-bold mb-2"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(193 100% 52%) 50%, hsl(var(--foreground) / 0.7) 100%)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
                    }}>
                    Choose your plan
                  </h2>
                  <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
                    Less than a coffee a month. Cancel any time.
                  </p>
                </div>
              </div>

              {/* Plans */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                  const isCurrentPlan = plan.id === currentTier;
                  return (
                    <div key={plan.id}
                      className={`relative flex flex-col rounded-xl p-5 transition-all duration-200 ${plan.glowColor}`}
                      style={{
                        background: isCurrentPlan ? "hsl(224 24% 10%)" : "hsl(224 24% 8% / 0.8)",
                        border: `1px solid ${isCurrentPlan ? "hsl(193 100% 52% / 0.35)" : `hsl(var(--border) / 0.6)`}`,
                      }}>

                      {/* Tag */}
                      <p className={`text-[9px] font-mono tracking-[0.2em] mb-3 ${plan.tagColor}`}>{plan.tag}</p>

                      {/* Icon + Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.iconBg} ${plan.iconColor}`}>
                          {plan.icon}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{plan.name}</p>
                          <p className="text-xs text-muted-foreground/60">Sirius AI</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                        {plan.id !== "free" && (
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">billed monthly · cancel any time</p>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-5 flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                            <Check size={12} className="text-primary mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                        {plan.missing.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground/35 line-through">
                            <span className="w-3 h-3 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {isCurrentPlan ? (
                        <div className="w-full py-2.5 rounded-lg text-center text-xs font-mono tracking-wider text-primary/60 uppercase"
                          style={{ background: "hsl(193 100% 52% / 0.07)", border: "1px solid hsl(193 100% 52% / 0.2)" }}>
                          Current plan
                        </div>
                      ) : plan.paypalPlanId ? (
                        <div>
                          {loadingPlan === plan.id ? (
                            <div className="w-full py-3 rounded-lg flex items-center justify-center gap-2 text-xs text-muted-foreground"
                              style={{ background: "hsl(224 24% 11%)", border: "1px solid hsl(224 20% 16%)" }}>
                              <div className="w-3 h-3 rounded-full border border-primary/30 border-t-primary animate-spin" />
                              Processing...
                            </div>
                          ) : (
                            <div id={`paypal-button-${plan.id}`} className="w-full" />
                          )}
                        </div>
                      ) : (
                        <div className="w-full py-2.5 rounded-lg text-center text-xs font-mono tracking-wider text-muted-foreground/40 uppercase"
                          style={{ background: "hsl(224 24% 9%)", border: "1px solid hsl(224 20% 14%)" }}>
                          {plan.cta}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 text-center">
                <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                  Payments processed securely by PayPal · Your data is never sold or shared ·{" "}
                  <a href="mailto:support@siriusai.app" className="text-primary/50 hover:text-primary transition-colors">
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
