import { useState, useEffect } from "react";
import siriusHero from "../../../assets/sirius-hero.png";

function ConstellationBg() {
  const stars = Array.from({ length: 90 }, (_, i) => ({
    id: i,
    cx: Math.abs(Math.sin(i * 2.4) * 100),
    cy: Math.abs(Math.cos(i * 1.7) * 100),
    r: i % 9 === 0 ? 1.4 : i % 3 === 0 ? 0.9 : 0.5,
    opacity: 0.08 + (i % 5) * 0.05,
  }));
  const lines = [
    [0,12],[12,24],[24,36],[36,48],[48,60],[60,72],[72,84],
    [0,24],[12,36],[24,48],[36,60],[48,72],[60,84],
    [3,15],[15,27],[27,39],[39,51],[51,63],[63,75],
    [6,18],[18,30],[30,42],[42,54],
  ];
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      {lines.map(([a, b], i) => (
        <line key={i} x1={stars[a].cx} y1={stars[a].cy} x2={stars[b].cx} y2={stars[b].cy}
          stroke="#4FC3F7" strokeWidth="0.06" strokeOpacity="0.12" />
      ))}
      {stars.map((s) => (
        <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="#A8E6F0" fillOpacity={s.opacity} />
      ))}
    </svg>
  );
}

export function MinimalLanding() {
  const [entered, setEntered] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0F19",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <ConstellationBg />

      {/* Deep ambient glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: "600px", height: "400px", pointerEvents: "none",
        background: "radial-gradient(ellipse at center, rgba(0,196,255,0.06) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "0",
        opacity: entered ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}>

        {/* Logo image — small, centered */}
        <div style={{
          width: "110px", height: "110px",
          borderRadius: "16px",
          overflow: "hidden",
          marginBottom: "32px",
          border: "1px solid rgba(0,196,255,0.2)",
          boxShadow: "0 0 40px rgba(0,196,255,0.12), 0 0 80px rgba(0,229,160,0.06)",
        }}>
          <img src={siriusHero} alt="Sirius" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        {/* SIRIUS wordmark */}
        <p style={{
          letterSpacing: "0.38em",
          fontWeight: 700,
          fontSize: "1.05rem",
          background: "linear-gradient(90deg, #00C4FF 0%, #00E5A0 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "20px",
          textTransform: "uppercase",
        }}>
          SIRIUS
        </p>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)",
          fontWeight: 300,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          textAlign: "center",
          maxWidth: "480px",
          marginBottom: "48px",
          background: "linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(168,230,240,0.8) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          padding: "0 20px",
        }}>
          A Place For Conscious People To Come
        </h1>

        {/* ENTER button */}
        <button
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => setEntered(true)}
          style={{
            background: "transparent",
            border: `1px solid ${hover ? "rgba(0,196,255,0.6)" : "rgba(0,196,255,0.25)"}`,
            borderRadius: "8px",
            color: hover ? "rgba(0,196,255,1)" : "rgba(0,196,255,0.7)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.25em",
            padding: "14px 44px",
            cursor: "pointer",
            textTransform: "uppercase",
            transition: "all 0.25s",
            backdropFilter: "blur(8px)",
            boxShadow: hover ? "0 0 24px rgba(0,196,255,0.15)" : "none",
            marginBottom: "20px",
          }}
        >
          ENTER
        </button>

        {/* Subtle domain */}
        <p style={{
          fontSize: "0.65rem",
          letterSpacing: "0.15em",
          color: "rgba(80,100,120,0.5)",
          textTransform: "uppercase",
        }}>
          sirius-ai.live
        </p>
      </div>

      {/* "Entered" state — shows the transition */}
      {entered && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#0B0F19",
          animation: "fadeIn 0.5s ease",
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{
              fontSize: "0.7rem", letterSpacing: "0.22em",
              color: "rgba(0,196,255,0.5)", textTransform: "uppercase",
              animation: "pulse 1.5s infinite",
            }}>
              Entering Star Lab...
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {/* Bottom nav — minimal */}
      <div style={{
        position: "absolute", bottom: "28px", left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: "28px",
        zIndex: 10,
      }}>
        {["About", "Early Access", "Log In"].map(t => (
          <span key={t} style={{
            fontSize: "0.68rem", letterSpacing: "0.1em",
            color: "rgba(80,100,120,0.45)", cursor: "pointer",
            textTransform: "uppercase",
            transition: "color 0.2s",
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
