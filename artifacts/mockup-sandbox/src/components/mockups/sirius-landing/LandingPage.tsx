import { useState } from "react";

function ConstellationBg() {
  const stars = Array.from({ length: 120 }, (_, i) => ({
    id: i,
    cx: Math.sin(i * 2.4) * 50 + 50,
    cy: Math.cos(i * 1.7) * 50 + 50,
    r: i % 7 === 0 ? 1.5 : i % 3 === 0 ? 1 : 0.6,
    opacity: 0.15 + (i % 5) * 0.07,
  }));

  const lines = [
    [0, 14], [14, 27], [27, 41], [41, 55], [55, 69], [69, 83],
    [0, 27], [14, 41], [27, 55], [41, 69], [55, 83],
    [83, 97], [97, 111], [111, 0],
    [8, 22], [22, 36], [36, 50], [50, 64], [64, 78],
    [3, 17], [17, 31], [31, 45], [45, 59],
    [7, 21], [21, 35], [35, 49],
    [92, 106], [106, 119], [119, 92],
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="glowCenter" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#00C4FF" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#glowCenter)" />
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={stars[a].cx} y1={stars[a].cy}
          x2={stars[b].cx} y2={stars[b].cy}
          stroke="#4FC3F7"
          strokeWidth="0.08"
          strokeOpacity="0.18"
        />
      ))}
      {stars.map((s) => (
        <circle
          key={s.id}
          cx={s.cx} cy={s.cy} r={s.r}
          fill="#A8E6F0"
          fillOpacity={s.opacity}
        />
      ))}
    </svg>
  );
}

function StarConstellationBg() {
  const pts = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    cx: ((i * 37 + i * i * 0.3) % 100),
    cy: ((i * 23 + i * 0.7) % 100),
    r: i % 5 === 0 ? 1.4 : 0.7,
    opacity: 0.2 + (i % 4) * 0.1,
  }));
  const lines = [[0,7],[7,14],[14,21],[21,28],[28,35],[35,42],[42,49],[49,56],[56,63],[63,70],[70,77],[77,0],[3,18],[18,33],[33,48],[48,63],[4,23],[23,42],[1,16],[16,31]];
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      {lines.map(([a, b], i) => (
        <line key={i} x1={pts[a].cx} y1={pts[a].cy} x2={pts[b].cx} y2={pts[b].cy}
          stroke="#00E5A0" strokeWidth="0.1" strokeOpacity="0.2" />
      ))}
      {pts.map((s) => (
        <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="#00E5A0" fillOpacity={s.opacity} />
      ))}
    </svg>
  );
}

function CloudBg() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="blur1"><feGaussianBlur stdDeviation="18" /></filter>
        <filter id="blur2"><feGaussianBlur stdDeviation="12" /></filter>
      </defs>
      <ellipse cx="200" cy="160" rx="180" ry="80" fill="#7C8FFF" fillOpacity="0.07" filter="url(#blur1)" />
      <ellipse cx="120" cy="120" rx="100" ry="50" fill="#A78BFA" fillOpacity="0.08" filter="url(#blur2)" />
      <ellipse cx="300" cy="140" rx="110" ry="55" fill="#60A5FA" fillOpacity="0.07" filter="url(#blur2)" />
      <ellipse cx="200" cy="180" rx="140" ry="60" fill="#818CF8" fillOpacity="0.06" filter="url(#blur1)" />
    </svg>
  );
}

export function LandingPage() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  return (
    <div
      style={{ background: "#0B0F19", fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}
      className="min-h-screen w-full text-white overflow-x-hidden"
    >
      {/* ── NAV ── */}
      <nav className="relative z-20 flex items-center justify-between px-10 py-6">
        <span
          style={{
            letterSpacing: "0.28em",
            fontWeight: 700,
            fontSize: "1.25rem",
            background: "linear-gradient(90deg, #00C4FF 0%, #00E5A0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          SIRIUS
        </span>
        <button
          style={{
            border: "1px solid rgba(0,196,255,0.35)",
            background: "rgba(0,196,255,0.07)",
            color: "#00C4FF",
            borderRadius: "6px",
            padding: "8px 22px",
            fontSize: "0.78rem",
            letterSpacing: "0.12em",
            fontWeight: 600,
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          LOG IN
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-16 pb-10" style={{ minHeight: "90vh" }}>
        <ConstellationBg />

        {/* Ambient glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "10%", left: "50%", transform: "translateX(-50%)",
            width: "700px", height: "400px",
            background: "radial-gradient(ellipse at center, rgba(0,196,255,0.09) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Eyebrow */}
          <p
            style={{
              letterSpacing: "0.22em",
              fontSize: "0.7rem",
              fontWeight: 500,
              color: "rgba(0,229,160,0.7)",
              marginBottom: "1.5rem",
              textTransform: "uppercase",
            }}
          >
            Now in Private Beta
          </p>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 300,
              lineHeight: 1.18,
              letterSpacing: "-0.01em",
              maxWidth: "820px",
              marginBottom: "1.5rem",
              background: "linear-gradient(160deg, #ffffff 20%, #a8e6f0 60%, #00C4FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            A Place For Conscious People To Come
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "1.05rem",
              fontWeight: 300,
              lineHeight: 1.75,
              color: "rgba(200,220,240,0.7)",
              maxWidth: "560px",
              marginBottom: "2.8rem",
            }}
          >
            Align your vision, cut through the mental noise, and navigate life from a state of total clarity and freedom.
          </p>

          {/* Waitlist capture */}
          <div
            className="flex items-center gap-0"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(0,196,255,0.25)",
              borderRadius: "10px",
              backdropFilter: "blur(16px)",
              overflow: "hidden",
              width: "100%",
              maxWidth: "480px",
              marginBottom: "0.75rem",
            }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                fontSize: "0.9rem",
                padding: "14px 18px",
                letterSpacing: "0.02em",
              }}
            />
            <button
              onClick={() => email && setJoined(true)}
              style={{
                background: "linear-gradient(135deg, #00C4FF 0%, #00E5A0 100%)",
                border: "none",
                color: "#0B0F19",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: "0.13em",
                padding: "14px 22px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
              }}
            >
              {joined ? "✓ Joined" : "Join the Waitlist"}
            </button>
          </div>
          <p style={{ fontSize: "0.72rem", color: "rgba(140,160,180,0.5)", letterSpacing: "0.05em" }}>
            No spam. Pure signal.
          </p>

          {/* Hero graphic container */}
          <div
            className="relative mt-14"
            style={{
              width: "100%",
              maxWidth: "720px",
            }}
          >
            {/* Radial glow behind graphic */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 60%, rgba(0,196,255,0.14) 0%, rgba(0,229,160,0.07) 40%, transparent 70%)",
                filter: "blur(30px)",
                transform: "scale(1.2)",
              }}
            />
            {/* Frame */}
            <div
              style={{
                position: "relative",
                border: "1px solid rgba(0,196,255,0.18)",
                borderRadius: "20px",
                background: "rgba(0,20,40,0.5)",
                backdropFilter: "blur(20px)",
                padding: "3px",
                overflow: "hidden",
              }}
            >
              {/* Inner gradient border glow */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, rgba(0,196,255,0.12) 0%, transparent 50%, rgba(0,229,160,0.08) 100%)",
                  borderRadius: "20px",
                  pointerEvents: "none",
                }}
              />
              {/* Graphic placeholder — two figures in space */}
              <div
                style={{
                  height: "320px",
                  borderRadius: "18px",
                  background: "linear-gradient(170deg, #060D1A 0%, #0B1628 40%, #061220 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <StarConstellationBg />
                {/* Central glowing orb / star */}
                <div style={{
                  position: "absolute",
                  top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                  width: "180px", height: "180px",
                  background: "radial-gradient(circle, rgba(0,196,255,0.22) 0%, rgba(0,229,160,0.1) 40%, transparent 70%)",
                  borderRadius: "50%",
                  filter: "blur(8px)",
                }} />
                {/* Two silhouette figures */}
                <svg width="260" height="240" viewBox="0 0 260 240" fill="none" style={{ position: "relative", zIndex: 2 }}>
                  {/* Left figure — Dream Lab character (ethereal/softer) */}
                  <ellipse cx="80" cy="80" rx="18" ry="18" fill="none" stroke="rgba(0,196,255,0.5)" strokeWidth="1.5" />
                  <line x1="80" y1="98" x2="80" y2="155" stroke="rgba(0,196,255,0.4)" strokeWidth="1.5" />
                  <line x1="80" y1="115" x2="58" y2="135" stroke="rgba(0,196,255,0.35)" strokeWidth="1.5" />
                  <line x1="80" y1="115" x2="102" y2="135" stroke="rgba(0,196,255,0.35)" strokeWidth="1.5" />
                  <line x1="80" y1="155" x2="62" y2="185" stroke="rgba(0,196,255,0.35)" strokeWidth="1.5" />
                  <line x1="80" y1="155" x2="98" y2="185" stroke="rgba(0,196,255,0.35)" strokeWidth="1.5" />
                  {/* Soft cloud-like glow around left figure */}
                  <ellipse cx="80" cy="130" rx="35" ry="55" fill="rgba(0,196,255,0.04)" />
                  {/* Right figure — Star Lab character (sharper/crisp) */}
                  <ellipse cx="180" cy="80" rx="18" ry="18" fill="none" stroke="rgba(0,229,160,0.6)" strokeWidth="1.5" />
                  <line x1="180" y1="98" x2="180" y2="155" stroke="rgba(0,229,160,0.5)" strokeWidth="1.5" />
                  <line x1="180" y1="115" x2="158" y2="135" stroke="rgba(0,229,160,0.45)" strokeWidth="1.5" />
                  <line x1="180" y1="115" x2="202" y2="135" stroke="rgba(0,229,160,0.45)" strokeWidth="1.5" />
                  <line x1="180" y1="155" x2="162" y2="185" stroke="rgba(0,229,160,0.45)" strokeWidth="1.5" />
                  <line x1="180" y1="155" x2="198" y2="185" stroke="rgba(0,229,160,0.45)" strokeWidth="1.5" />
                  {/* Star constellation lines around right figure */}
                  <line x1="195" y1="65" x2="215" y2="50" stroke="rgba(0,229,160,0.3)" strokeWidth="0.8" />
                  <line x1="215" y1="50" x2="225" y2="70" stroke="rgba(0,229,160,0.3)" strokeWidth="0.8" />
                  <line x1="165" y1="65" x2="148" y2="52" stroke="rgba(0,229,160,0.3)" strokeWidth="0.8" />
                  <circle cx="215" cy="50" r="2" fill="rgba(0,229,160,0.6)" />
                  <circle cx="225" cy="70" r="1.5" fill="rgba(0,229,160,0.5)" />
                  <circle cx="148" cy="52" r="2" fill="rgba(0,229,160,0.5)" />
                  {/* Central star between them */}
                  <circle cx="130" cy="115" r="3" fill="rgba(255,255,255,0.6)" />
                  <line x1="130" y1="108" x2="130" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                  <line x1="130" y1="122" x2="130" y2="130" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                  <line x1="123" y1="115" x2="115" y2="115" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                  <line x1="137" y1="115" x2="145" y2="115" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                  {/* SIRIUS label */}
                  <text x="130" y="215" textAnchor="middle" fill="rgba(168,230,240,0.4)" fontSize="9" letterSpacing="4" fontFamily="'Inter', system-ui">SIRIUS STAR LAB</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(0,196,255,0.15) 50%, transparent 100%)", margin: "0 40px" }} />

      {/* ── TWO ENVIRONMENTS ── */}
      <section className="relative px-10 py-20">
        <p
          style={{
            textAlign: "center",
            letterSpacing: "0.22em",
            fontSize: "0.68rem",
            fontWeight: 500,
            color: "rgba(0,229,160,0.5)",
            textTransform: "uppercase",
            marginBottom: "1rem",
          }}
        >
          Two Distinct Environments
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "1.9rem",
            fontWeight: 300,
            letterSpacing: "-0.01em",
            color: "rgba(220,235,245,0.9)",
            marginBottom: "3.5rem",
          }}
        >
          One Unified Space
        </h2>

        <div className="grid grid-cols-2 gap-5" style={{ maxWidth: "900px", margin: "0 auto" }}>

          {/* Dream Lab Column */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              border: "1px solid rgba(0,196,255,0.18)",
              background: "linear-gradient(160deg, rgba(10,18,40,0.9) 0%, rgba(8,14,30,0.8) 100%)",
              backdropFilter: "blur(20px)",
              padding: "36px 32px",
              overflow: "hidden",
            }}
          >
            <CloudBg />
            <div style={{ position: "relative", zIndex: 2 }}>
              {/* Icon */}
              <div style={{ marginBottom: "18px" }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <ellipse cx="18" cy="22" rx="14" ry="8" fill="none" stroke="rgba(0,196,255,0.5)" strokeWidth="1.2" />
                  <ellipse cx="13" cy="18" rx="8" ry="5" fill="none" stroke="rgba(0,196,255,0.35)" strokeWidth="1" />
                  <ellipse cx="23" cy="17" rx="9" ry="5.5" fill="none" stroke="rgba(0,196,255,0.35)" strokeWidth="1" />
                  <ellipse cx="18" cy="15" rx="6" ry="4" fill="none" stroke="rgba(0,196,255,0.45)" strokeWidth="1" />
                </svg>
              </div>
              <p
                style={{
                  fontSize: "0.62rem",
                  letterSpacing: "0.22em",
                  fontWeight: 600,
                  color: "rgba(0,196,255,0.6)",
                  textTransform: "uppercase",
                  marginBottom: "0.6rem",
                }}
              >
                The Dream Lab
              </p>
              <h3
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 300,
                  color: "white",
                  lineHeight: 1.3,
                  marginBottom: "1rem",
                  letterSpacing: "-0.01em",
                }}
              >
                Pure Clarity &amp; Space
              </h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  lineHeight: 1.72,
                  color: "rgba(180,205,230,0.65)",
                  fontWeight: 300,
                }}
              >
                Architecturalize your ideas. Align your vision and cut through the mental noise in an atmosphere built for deep thinking.
              </p>
              {/* Bottom accent line */}
              <div style={{ marginTop: "2rem", height: "1px", background: "linear-gradient(90deg, rgba(0,196,255,0.3) 0%, transparent 100%)" }} />
            </div>
          </div>

          {/* Star Lab Column */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              border: "1px solid rgba(0,229,160,0.18)",
              background: "linear-gradient(160deg, rgba(6,16,18,0.9) 0%, rgba(4,12,14,0.85) 100%)",
              backdropFilter: "blur(20px)",
              padding: "36px 32px",
              overflow: "hidden",
            }}
          >
            <StarConstellationBg />
            <div style={{ position: "relative", zIndex: 2 }}>
              {/* Icon */}
              <div style={{ marginBottom: "18px" }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="3" fill="rgba(0,229,160,0.7)" />
                  <line x1="18" y1="4" x2="18" y2="11" stroke="rgba(0,229,160,0.5)" strokeWidth="1.2" />
                  <line x1="18" y1="25" x2="18" y2="32" stroke="rgba(0,229,160,0.5)" strokeWidth="1.2" />
                  <line x1="4" y1="18" x2="11" y2="18" stroke="rgba(0,229,160,0.5)" strokeWidth="1.2" />
                  <line x1="25" y1="18" x2="32" y2="18" stroke="rgba(0,229,160,0.5)" strokeWidth="1.2" />
                  <line x1="8.3" y1="8.3" x2="13.3" y2="13.3" stroke="rgba(0,229,160,0.35)" strokeWidth="1" />
                  <line x1="22.7" y1="22.7" x2="27.7" y2="27.7" stroke="rgba(0,229,160,0.35)" strokeWidth="1" />
                  <line x1="27.7" y1="8.3" x2="22.7" y2="13.3" stroke="rgba(0,229,160,0.35)" strokeWidth="1" />
                  <line x1="8.3" y1="27.7" x2="13.3" y2="22.7" stroke="rgba(0,229,160,0.35)" strokeWidth="1" />
                  <circle cx="6" cy="6" r="1.5" fill="rgba(0,229,160,0.4)" />
                  <circle cx="30" cy="6" r="1.5" fill="rgba(0,229,160,0.4)" />
                  <circle cx="6" cy="30" r="1.5" fill="rgba(0,229,160,0.4)" />
                  <circle cx="30" cy="30" r="1.5" fill="rgba(0,229,160,0.4)" />
                </svg>
              </div>
              <p
                style={{
                  fontSize: "0.62rem",
                  letterSpacing: "0.22em",
                  fontWeight: 600,
                  color: "rgba(0,229,160,0.6)",
                  textTransform: "uppercase",
                  marginBottom: "0.6rem",
                }}
              >
                The Star Lab
              </p>
              <h3
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 300,
                  color: "white",
                  lineHeight: 1.3,
                  marginBottom: "1rem",
                  letterSpacing: "-0.01em",
                }}
              >
                Intelligent Execution
              </h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  lineHeight: 1.72,
                  color: "rgba(160,210,195,0.65)",
                  fontWeight: 300,
                }}
              >
                Structured design and intelligent execution. Map your path forward from a state of truth in an environment built for precision.
              </p>
              {/* Bottom accent line */}
              <div style={{ marginTop: "2rem", height: "1px", background: "linear-gradient(90deg, rgba(0,229,160,0.3) 0%, transparent 100%)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "32px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            letterSpacing: "0.28em",
            fontWeight: 700,
            fontSize: "0.85rem",
            background: "linear-gradient(90deg, #00C4FF 0%, #00E5A0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          SIRIUS
        </span>
        <p style={{ fontSize: "0.72rem", color: "rgba(100,120,140,0.5)", letterSpacing: "0.05em" }}>
          © 2025 Sirius Star Lab · sirius-ai.live
        </p>
        <div style={{ display: "flex", gap: "24px" }}>
          {["Privacy", "Terms"].map(t => (
            <span key={t} style={{ fontSize: "0.72rem", color: "rgba(100,120,140,0.5)", letterSpacing: "0.05em", cursor: "pointer" }}>{t}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
