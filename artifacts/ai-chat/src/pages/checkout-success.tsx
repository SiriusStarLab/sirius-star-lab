import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";

export function CheckoutSuccessPage() {
  const [activated, setActivated] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [exchangeCode, setExchangeCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const resolvedUserIdRef = useRef<string>("");
  const localUserId = getUserId();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get("tier");
    const sessionId = params.get("session_id");
    // userId comes from URL param (mobile → Safari flow) or localStorage (web flow)
    const urlUserId = params.get("userId") || "";
    const resolvedUserId = urlUserId || localUserId;
    resolvedUserIdRef.current = resolvedUserId;

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
  }, [localUserId]);

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

  // Poll for Sirius Exchange code (Pro tier only) — webhook may fire after page load
  useEffect(() => {
    if (!activated || tier !== "pro") return;
    const userId = resolvedUserIdRef.current;
    if (!userId) return;

    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const base = getApiBase();
        const res = await fetch(`${base}stripe/exchange-code?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json() as { code: string | null };
          if (data.code) { setExchangeCode(data.code); return; }
        }
      } catch { /* network error — keep polling */ }
      // Retry up to 15 times (≈30 s) in case webhook hasn't fired yet
      if (attempts < 15 && !cancelled) setTimeout(poll, 2000);
    };

    poll();
    return () => { cancelled = true; };
  }, [activated, tier]);

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

        {/* Sirius Exchange unlock code — Pro only */}
        {activated && tier === "pro" && (
          <div style={{
            background: "rgba(15,20,37,0.8)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 16,
            padding: "20px",
            marginBottom: 20,
            textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14 }}>⭐</span>
              <p style={{ margin: 0, fontSize: 10, fontFamily: "Space Mono, monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,158,11,0.8)" }}>
                Sirius Exchange unlock code
              </p>
            </div>

            {exchangeCode ? (
              <>
                {/* Code display + copy */}
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(exchangeCode).then(() => {
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    });
                  }}
                  style={{
                    background: "#080c1a",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    marginBottom: 14,
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", color: "#f59e0b" }}>
                    {exchangeCode}
                  </span>
                  <Copy size={14} style={{ color: codeCopied ? "#22c55e" : "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                </div>
                {codeCopied && (
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "#22c55e", fontFamily: "Space Mono, monospace" }}>✓ Copied</p>
                )}
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                  Log in at{" "}
                  <a href="https://siriusexchange.net" target="_blank" rel="noreferrer" style={{ color: "#f59e0b" }}>
                    siriusexchange.net
                  </a>
                  , open the Sirius AI chat button (bottom-right), and enter this code to unlock your assistant.
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>Single-use · one account only. Also sent to your email.</span>
                </p>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <Loader2 size={14} style={{ color: "rgba(245,158,11,0.6)", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "Space Mono, monospace" }}>
                  Generating your code…
                </span>
              </div>
            )}
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
