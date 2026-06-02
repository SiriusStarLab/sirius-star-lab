import React, { useState, useEffect, useRef } from "react";
import { Star, Lock, Loader2 } from "lucide-react";
import { getApiBase } from "@/lib/api-base";

const SESSION_KEY = "lab_pin";
const PERSIST_KEY = "lab_pin_persist";

interface Props {
  children: React.ReactNode;
  title?: string;
}

export function LabAuthGate({ children, title = "Star Lab" }: Props) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(PERSIST_KEY);
    if (stored) {
      // Sync to sessionStorage so the API header checks still work
      sessionStorage.setItem(SESSION_KEY, stored);
      setStatus("unlocked");
    } else {
      setStatus("locked");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${getApiBase()}lab/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem(SESSION_KEY, pin.trim());
        localStorage.setItem(PERSIST_KEY, pin.trim());
        setStatus("unlocked");
      } else if (res.status === 403) {
        setError("Access locked — too many incorrect attempts. Try again in 15 minutes.");
        setPin("");
      } else {
        const left = data.attemptsLeft ?? null;
        setAttemptsLeft(left);
        setError(
          left !== null && left <= 2
            ? `Incorrect PIN — ${left} attempt${left !== 1 ? "s" : ""} left before lockout.`
            : "Incorrect PIN."
        );
        setPin("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setError("Connection error — check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") return null;

  if (status === "unlocked") return <>{children}</>;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(160deg, hsl(193,80%,96%) 0%, hsl(210,60%,94%) 50%, hsl(220,55%,96%) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "48px 32px",
          margin: "0 16px",
          background: "white",
          border: "1px solid hsla(193,100%,35%,0.15)",
          borderRadius: 24,
          textAlign: "center",
          boxShadow: "0 20px 60px hsla(193,100%,35%,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "linear-gradient(135deg, hsl(193,100%,35%), hsl(180,100%,38%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 24px hsla(193,100%,35%,0.35)",
          }}
        >
          <Star size={28} color="#fff" fill="#fff" />
        </div>

        <h1
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 700,
            color: "#0F172A",
            letterSpacing: "-0.3px",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "0 0 28px",
            fontSize: 13,
            color: "#64748B",
          }}
        >
          Enter your PIN to continue
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(null); }}
            placeholder="PIN"
            autoComplete="current-password"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 16,
              letterSpacing: "0.15em",
              background: "#F8FAFF",
              border: `1.5px solid ${error ? "hsl(0,70%,60%)" : "hsla(193,100%,35%,0.2)"}`,
              borderRadius: 12,
              color: "#0F172A",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 12,
              transition: "border-color 0.15s",
            }}
          />

          {error && (
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12.5,
                color: "hsl(0,70%,50%)",
                lineHeight: 1.4,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!pin.trim() || loading}
            style={{
              width: "100%",
              padding: "13px",
              fontSize: 14,
              fontWeight: 600,
              background: pin.trim() && !loading
                ? "linear-gradient(135deg, hsl(193,100%,35%), hsl(180,100%,38%))"
                : "hsl(210,20%,92%)",
              color: pin.trim() && !loading ? "#fff" : "#94A3B8",
              border: "none",
              borderRadius: 12,
              cursor: pin.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s",
              boxShadow: pin.trim() && !loading ? "0 4px 16px hsla(193,100%,35%,0.35)" : "none",
            }}
          >
            {loading ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Lock size={15} />
            )}
            {loading ? "Verifying…" : "Unlock"}
          </button>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
