import { useState, useEffect } from "react";
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
        <line key={i} x1={stars[a!].cx} y1={stars[a!].cy} x2={stars[b!].cx} y2={stars[b!].cy}
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

type Mode = "splash" | "login" | "signup" | "forgot" | "reset";

export function AuthGate({ onAuth }: AuthGateProps) {
  const savedEmail = localStorage.getItem("sirius_account_email") || "";

  // Detect ?reset=TOKEN in URL on mount
  const urlToken = new URLSearchParams(window.location.search).get("reset");
  const [mode, setMode] = useState<Mode>(
    urlToken ? "reset" : savedEmail ? "login" : "splash"
  );

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [newPass, setNewPass]   = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [resetLink, setResetLink] = useState("");

  // Clear error when switching modes
  useEffect(() => { setError(""); setSuccess(""); setResetLink(""); }, [mode]);

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

  const ghostBtn: React.CSSProperties = {
    ...btnStyle,
    background: "transparent",
    border: "none",
    color: "rgba(100,150,200,0.5)",
    fontSize: "0.72rem",
    fontWeight: 400,
    letterSpacing: "0.06em",
    padding: "4px 0",
  };

  // Login / signup submit
  const submit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body: Record<string, string> = { email: email.trim(), password };
      if (mode === "signup" && name.trim()) body.name = name.trim();
      const res  = await fetch(`${BASE}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      localStorage.setItem("sirius_user_id", data.userId);
      localStorage.setItem("sirius_entered", "1");
      localStorage.setItem("sirius_account_email", email.trim());
      onAuth(data.userId);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  // Forgot password — request reset link
  const requestReset = async () => {
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/request-reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      if (data.resetUrl) {
        setResetLink(data.resetUrl);
        setSuccess("Reset link generated. Copy the link below and open it in your browser, or ask Garry to send it to you.");
      } else {
        setSuccess("If that email has an account, a reset link has been prepared. Contact Garry to receive it.");
      }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  // Reset password — set new password using token from URL
  const resetPassword = async () => {
    setError("");
    if (!newPass.trim() || newPass.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPass !== newPass2) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: urlToken, newPassword: newPass }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setSuccess("Password updated! You can now sign in with your new password.");
      // Clean up URL and redirect to login after 2s
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setMode("login"), 2000);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const formTitle = { signup: "Create your account", login: "Welcome back", forgot: "Reset your password", reset: "Set new password" };
  const formSub   = { signup: "Free to start — upgrade anytime", login: "Sign in to continue your journey", forgot: "Enter your email and we'll generate a reset link", reset: "Choose a new password for your account" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0D1E3A 0%, #0F2040 40%, #0A1830 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
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
              borderRadius: "20px 20px 0 0", overflow: "hidden",
              border: "1px solid rgba(0,196,255,0.18)", borderBottom: "none",
              boxShadow: "0 0 60px rgba(0,196,255,0.1)", position: "relative",
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
              <button onClick={() => setMode("signup")} style={{
                flex: 1, background: "rgba(0,196,255,0.12)",
                border: "1px solid rgba(0,196,255,0.3)", borderTop: "none", borderRight: "none",
                borderRadius: "0 0 0 20px", color: "rgba(180,235,255,0.9)",
                padding: "16px 0", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.2s",
              }}>Create Account</button>
              <button onClick={() => setMode("login")} style={{
                flex: 1, background: "rgba(13,28,55,0.92)",
                border: "1px solid rgba(0,196,255,0.2)", borderTop: "none", borderLeft: "none",
                borderRadius: "0 0 20px 0", color: "rgba(140,180,210,0.65)",
                padding: "16px 0", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500,
                letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.2s",
              }}>Sign In</button>
            </div>
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (mode === "forgot") requestReset(); else if (mode === "reset") resetPassword(); else submit(); }}
            style={{
              background: "rgba(10,20,40,0.96)", border: "1px solid rgba(0,196,255,0.2)",
              borderRadius: "20px", padding: "32px 28px", backdropFilter: "blur(20px)",
              boxShadow: "0 0 60px rgba(0,196,255,0.08)", position: "relative",
            }}>
            {/* Back button */}
            <button type="button" onClick={() => { setMode(mode === "reset" ? "login" : "splash"); }}
              aria-label="Back"
              style={{
                position: "absolute", top: 14, right: 14,
                width: 30, height: 30, borderRadius: "50%",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(160,200,240,0.7)", fontSize: "1rem", lineHeight: 1,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,196,255,0.2), transparent)",
                border: "1px solid rgba(0,196,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px", fontSize: "1.4rem",
              }}>
                {mode === "forgot" || mode === "reset" ? "🔑" : "✦"}
              </div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "rgba(210,235,255,0.95)", letterSpacing: "0.02em" }}>
                {formTitle[mode]}
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "rgba(120,160,200,0.6)", letterSpacing: "0.05em" }}>
                {formSub[mode]}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* SIGNUP fields */}
              {mode === "signup" && (
                <input style={inputStyle} type="text" placeholder="Your name (optional)"
                  value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
              )}

              {/* Email field — login / signup / forgot */}
              {(mode === "login" || mode === "signup" || mode === "forgot") && (
                <input style={inputStyle} type="email" placeholder="Email address"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              )}

              {/* Password field — login / signup */}
              {(mode === "login" || mode === "signup") && (
                <input style={inputStyle} type="password"
                  placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              )}

              {/* New password fields — reset mode */}
              {mode === "reset" && (
                <>
                  <input style={inputStyle} type="password" placeholder="New password (min 8 characters)"
                    value={newPass} onChange={e => setNewPass(e.target.value)} autoComplete="new-password" />
                  <input style={inputStyle} type="password" placeholder="Confirm new password"
                    value={newPass2} onChange={e => setNewPass2(e.target.value)} autoComplete="new-password" />
                </>
              )}

              {/* Error / success messages */}
              {error && (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,120,120,0.9)", textAlign: "center", lineHeight: 1.4 }}>
                  {error}
                </p>
              )}
              {success && (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(100,220,160,0.9)", textAlign: "center", lineHeight: 1.4 }}>
                  {success}
                </p>
              )}

              {/* Reset link box — shown after requesting reset */}
              {resetLink && (
                <div style={{
                  background: "rgba(0,196,255,0.06)", border: "1px solid rgba(0,196,255,0.2)",
                  borderRadius: "10px", padding: "10px 12px",
                }}>
                  <p style={{ margin: "0 0 6px", fontSize: "0.68rem", color: "rgba(0,196,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Reset link</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(180,220,255,0.8)", wordBreak: "break-all", lineHeight: 1.4 }}>{resetLink}</p>
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(resetLink); }}
                    style={{ ...ghostBtn, marginTop: 8, fontSize: "0.68rem", color: "rgba(0,196,255,0.6)" }}>
                    Copy link
                  </button>
                </div>
              )}

              {/* Primary action button — hidden after reset success */}
              {!success && (
                <button type="submit" style={btnStyle} disabled={loading}>
                  {loading ? "Please wait…"
                    : mode === "signup" ? "Create Account & Enter →"
                    : mode === "forgot" ? "Generate Reset Link →"
                    : mode === "reset"  ? "Set New Password →"
                    : "Sign In & Enter →"}
                </button>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(0,196,255,0.1)" }} />
                <span style={{ fontSize: "0.65rem", color: "rgba(100,140,180,0.4)", letterSpacing: "0.1em" }}>
                  {mode === "forgot" ? "REMEMBERED IT?" : mode === "reset" ? "BACK TO" : "OR"}
                </span>
                <div style={{ flex: 1, height: "1px", background: "rgba(0,196,255,0.1)" }} />
              </div>

              {mode === "login" && (
                <>
                  <button type="button" style={ghostBtn} onClick={() => setMode("signup")}>
                    No account yet? Create one free
                  </button>
                  <button type="button"
                    style={{ ...ghostBtn, color: "rgba(80,130,180,0.4)", fontSize: "0.68rem" }}
                    onClick={() => setMode("forgot")}>
                    Forgot your password?
                  </button>
                </>
              )}
              {mode === "signup" && (
                <button type="button" style={ghostBtn} onClick={() => setMode("login")}>
                  Already have an account? Sign in
                </button>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <button type="button" style={ghostBtn} onClick={() => setMode("login")}>
                  Sign in
                </button>
              )}
            </div>
          </form>
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
