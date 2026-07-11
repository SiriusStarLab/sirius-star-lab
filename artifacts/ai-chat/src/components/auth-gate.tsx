import { useState } from "react";
import starLabHero from "@assets/IMG_0562_1783595769136.png";

function ConstellationBg() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    cx: Math.abs(Math.sin(i * 2.4) * 100),
    cy: Math.abs(Math.cos(i * 1.7) * 100),
    r: i % 9 === 0 ? 1.2 : i % 3 === 0 ? 0.7 : 0.4,
    opacity: 0.06 + (i % 5) * 0.04,
  }));
  const lines = [
    [0,12],[12,24],[24,36],[36,48],[48,60],[60,72],
    [0,24],[12,36],[24,48],[36,60],[48,72],
    [3,15],[15,27],[27,39],[39,51],[51,63],[63,75],
    [6,18],[18,30],[30,42],[42,54],[54,66],
  ];
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
      viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      {lines.map(([a, b], i) => (
        <line key={i} x1={stars[a].cx} y1={stars[a].cy} x2={stars[b].cx} y2={stars[b].cy}
          stroke="#4FC3F7" strokeWidth="0.05" strokeOpacity="0.1" />
      ))}
      {stars.map(s => (
        <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="#A8E6F0" fillOpacity={s.opacity} />
      ))}
    </svg>
  );
}

interface AuthGateProps {
  onAuth: (userId: string) => void;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthGate({ onAuth }: AuthGateProps) {
  const [mode, setMode] = useState<"splash" | "login" | "signup">("splash");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body: Record<string, string> = { email: email.trim(), password };
      if (mode === "signup" && name.trim()) body.name = name.trim();

      const res = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      localStorage.setItem("sirius_user_id", data.userId);
      localStorage.setItem("sirius_entered", "1");
      onAuth(data.userId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(0,196,255,0.2)",
    borderRadius: "10px",
    color: "rgba(210,235,255,0.9)",
    fontSize: "0.9rem",
    padding: "11px 14px",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    background: loading ? "rgba(0,196,255,0.08)" : "rgba(0,196,255,0.15)",
    border: "1px solid rgba(0,196,255,0.4)",
    borderRadius: "10px",
    color: "rgba(180,235,255,0.95)",
    fontSize: "0.85rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    padding: "13px 0",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0D1E3A 0%, #0F2040 40%, #0A1830 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <ConstellationBg />

      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -60%)",
        width: "700px", height: "700px",
        background: "radial-gradient(ellipse at center, rgba(0,180,255,0.18) 0%, transparent 65%)",
        pointerEvents: "none", filter: "blur(30px)",
      }} />

      <div style={{ position: "relative", zIndex: 10, width: "min(420px, 92vw)" }}>
        {mode === "splash" ? (
          <>
            <div style={{
              borderRadius: "20px 20px 0 0",
              overflow: "hidden",
              border: "1px solid rgba(0,196,255,0.18)",
              borderBottom: "none",
              boxShadow: "0 0 60px rgba(0,196,255,0.1)",
              position: "relative",
            }}>
              <img src={starLabHero} alt="Sirius Star Lab"
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "28px 20px 16px",
                background: "linear-gradient(to top, rgba(10,22,45,0.95) 0%, rgba(10,22,45,0.5) 60%, transparent 100%)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              }}>
                <span style={{ fontSize: "0.6rem", letterSpacing: "0.3em", fontWeight: 600, color: "rgba(0,229,160,0.8)", textTransform: "uppercase" }}>PRODUCTION</span>
                <div style={{ width: "32px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,196,255,0.5), transparent)" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1px" }}>
              <button
                onClick={() => setMode("signup")}
                style={{
                  flex: 1,
                  background: "rgba(0,196,255,0.12)",
                  border: "1px solid rgba(0,196,255,0.3)",
                  borderTop: "none",
                  borderRight: "none",
                  borderRadius: "0 0 0 20px",
                  color: "rgba(180,235,255,0.9)",
                  padding: "16px 0",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >Create Account</button>
              <button
                onClick={() => setMode("login")}
                style={{
                  flex: 1,
                  background: "rgba(13,28,55,0.92)",
                  border: "1px solid rgba(0,196,255,0.2)",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRadius: "0 0 20px 0",
                  color: "rgba(140,180,210,0.65)",
                  padding: "16px 0",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >Sign In</button>
            </div>
          </>
        ) : (
          <div style={{
            background: "rgba(10,20,40,0.96)",
            border: "1px solid rgba(0,196,255,0.2)",
            borderRadius: "20px",
            padding: "32px 28px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 60px rgba(0,196,255,0.08)",
          }}>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,196,255,0.2), transparent)",
                border: "1px solid rgba(0,196,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
                fontSize: "1.4rem",
              }}>✦</div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "rgba(210,235,255,0.95)", letterSpacing: "0.02em" }}>
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "rgba(120,160,200,0.6)", letterSpacing: "0.05em" }}>
                {mode === "signup" ? "Free to start — upgrade anytime" : "Sign in to continue your journey"}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {mode === "signup" && (
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              )}
              <input
                style={inputStyle}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                onKeyDown={e => e.key === "Enter" && submit()}
              />
              <input
                style={inputStyle}
                type="password"
                placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onKeyDown={e => e.key === "Enter" && submit()}
              />

              {error && (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,120,120,0.9)", textAlign: "center", lineHeight: 1.4 }}>
                  {error}
                </p>
              )}

              <button style={btnStyle} onClick={submit} disabled={loading}>
                {loading ? "Please wait…" : mode === "signup" ? "Create Account & Enter →" : "Sign In & Enter →"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(0,196,255,0.1)" }} />
                <span style={{ fontSize: "0.65rem", color: "rgba(100,140,180,0.4)", letterSpacing: "0.1em" }}>OR</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(0,196,255,0.1)" }} />
              </div>

              <button
                style={{ ...btnStyle, background: "transparent", border: "none", color: "rgba(100,150,200,0.5)", fontSize: "0.72rem", fontWeight: 400, letterSpacing: "0.06em", padding: "4px 0" }}
                onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
              >
                {mode === "signup" ? "Already have an account? Sign in" : "No account yet? Create one free"}
              </button>

              <button
                style={{ ...btnStyle, background: "transparent", border: "none", color: "rgba(70,100,140,0.4)", fontSize: "0.65rem", fontWeight: 400, letterSpacing: "0.08em", padding: "2px 0" }}
                onClick={() => { setMode("splash"); setError(""); }}
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "24px", marginTop: "24px", justifyContent: "center" }}>
          {["Privacy", "Terms", "About"].map(t => (
            <a key={t} href={`${BASE}/${t.toLowerCase()}`}
              style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(70,90,110,0.4)", textTransform: "uppercase", textDecoration: "none" }}>
              {t}
            </a>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "28px", left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 10 }}>
        <span style={{ fontSize: "0.62rem", letterSpacing: "0.15em", color: "rgba(50,70,90,0.35)", textTransform: "uppercase" }}>
          sirius-ai.live
        </span>
      </div>
    </div>
  );
}
