import React, { useState, useEffect, useRef } from "react";
import { Star, Lock, Loader2 } from "lucide-react";
import { getApiBase } from "@/lib/api-base";

const SESSION_KEY = "lab_pin";

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
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
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
        background: "hsl(230,30%,6%)",
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
          background: "hsl(230,25%,10%)",
          border: "1px solid hsl(230,20%,18%)",
          borderRadius: 20,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "hsl(193,100%,35%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Star size={26} color="#fff" fill="#fff" />
        </div>

        <h1
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.3px",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "0 0 28px",
            fontSize: 13,
            color: "hsl(230,15%,55%)",
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
              background: "hsl(230,25%,14%)",
              border: `1.5px solid ${error ? "hsl(0,70%,55%)" : "hsl(230,20%,22%)"}`,
              borderRadius: 10,
              color: "#fff",
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
                color: "hsl(0,70%,60%)",
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
              padding: "12px",
              fontSize: 14,
              fontWeight: 600,
              background: pin.trim() && !loading ? "hsl(193,100%,35%)" : "hsl(230,20%,20%)",
              color: pin.trim() && !loading ? "#fff" : "hsl(230,15%,40%)",
              border: "none",
              borderRadius: 10,
              cursor: pin.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s",
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
