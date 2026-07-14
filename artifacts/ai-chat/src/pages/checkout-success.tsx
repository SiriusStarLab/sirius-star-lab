import React, { useEffect, useState } from "react";
import { CheckCircle, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

export function CheckoutSuccessPage() {
  const [activated, setActivated] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const localUserId = getUserId();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get("tier");
    const sessionId = params.get("session_id");
    // userId comes from URL param (mobile → Safari flow) or localStorage (web flow)
    const urlUserId = params.get("userId") || "";
    const resolvedUserId = urlUserId || localUserId;

    if (tierParam && ["plus", "pro"].includes(tierParam)) {
      setTier(tierParam);
      const base = getApiBase();
      fetch(`${base}stripe/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resolvedUserId, tier: tierParam, sessionId }),
      })
        .then(() => setActivated(true))
        .catch(() => setActivated(true));
    } else {
      setActivated(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!activated) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const base = import.meta.env.BASE_URL || "/";
          window.location.href = base;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activated]);

  const isAgency = tier?.startsWith("agency_");
  const agencyPkg = tier?.replace("agency_", "") || "";
  const AGENCY_META: Record<string, { label: string; color: string; features: string[] }> = {
    social:    { label: "Social AI",         color: "hsl(280,70%,65%)", features: ["30 AI posts/month across all platforms", "Engagement reply drafts", "Competitor content analysis", "Monthly performance report"] },
    sales:     { label: "Sales Intelligence", color: "hsl(193,100%,50%)", features: ["AI cold email sequences (5-step)", "Lead intelligence briefs", "Sales call prep briefs", "Pipeline analysis report"] },
    fullstack: { label: "Full Operations",    color: "hsl(45,100%,55%)", features: ["Everything in Social AI + Sales Intelligence", "AI customer service drafts", "Monthly blog posts + newsletter", "Quarterly market intelligence report"] },
  };
  const agencyMeta = AGENCY_META[agencyPkg];
  const tierLabel = isAgency ? `Sirius ${agencyMeta?.label || "Agency"}` : (tier === "pro" ? "Pro" : tier === "plus" ? "Plus" : "Premium");
  const tierColor = isAgency ? (agencyMeta?.color || "#00d4ff") : (tier === "pro" ? "#f59e0b" : "#00d4ff");
  const tierFeatures = isAgency
    ? (agencyMeta?.features || [])
    : tier === "pro"
    ? ["Unlimited messages", "Unlimited image generation", "Deep memory & personalisation", "Priority speed", "Early access to features"]
    : ["200 messages per day", "Image generation", "Sirius remembers you", "Full conversation history"];

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      background: "#080c1a",
      color: "#fff",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 40% at 50% 40%, ${tierColor}0a, transparent)`,
      }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 440, width: "100%" }}>
        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `${tierColor}12`,
            border: `1px solid ${tierColor}40`,
            boxShadow: `0 0 40px ${tierColor}25`,
          }}>
            {!activated
              ? <Loader2 size={34} style={{ color: tierColor, animation: "spin 1s linear infinite" }} />
              : <CheckCircle size={34} style={{ color: tierColor }} />
            }
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(26px, 6vw, 34px)", fontWeight: 800, marginBottom: 10,
          background: `linear-gradient(135deg, #ffffff 0%, ${tierColor} 60%, rgba(255,255,255,0.6) 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {activated ? "You're in." : "Activating…"}
        </h1>

        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
          {activated
            ? `Sirius ${tierLabel} is now active.`
            : "Setting up your account…"}
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "Space Mono, monospace", marginBottom: 28 }}>
          The partnership deepens.
        </p>

        {/* Features unlocked */}
        {activated && tierFeatures.length > 0 && (
          <div style={{
            background: "rgba(15,20,37,0.8)",
            border: `1px solid ${tierColor}20`,
            borderRadius: 16,
            padding: "20px 20px",
            marginBottom: 24,
            textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Sparkles size={12} style={{ color: tierColor }} />
              <p style={{ fontSize: 10, fontFamily: "Space Mono, monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: `${tierColor}90` }}>
                Now unlocked
              </p>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {tierFeatures.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <CheckCircle size={13} style={{ color: tierColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Back button */}
        {activated && (
          <>
            <a
              href={import.meta.env.BASE_URL || "/"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px", borderRadius: 12,
                background: tierColor, color: "#080c1a",
                fontSize: 14, fontWeight: 700, textDecoration: "none",
                marginBottom: 14,
              }}
            >
              <ExternalLink size={15} />
              Enter Sirius
            </a>
            <p style={{ fontSize: 11, fontFamily: "Space Mono, monospace", color: "rgba(255,255,255,0.2)" }}>
              Redirecting in {countdown}s
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
