import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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

export function SplashPage({ onEnter }: { onEnter: () => void }) {
  const [hover, setHover] = useState(false);
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    setEntering(true);
    setTimeout(() => {
      localStorage.setItem("sirius_entered", "1");
      onEnter();
    }, 700);
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

      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        opacity: entering ? 0 : 1,
        transition: "opacity 0.7s ease",
      }}>
        <div style={{
          width: "min(520px, 92vw)",
          aspectRatio: "1 / 1",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid rgba(0,196,255,0.18)",
          boxShadow: "0 0 60px rgba(0,196,255,0.1), 0 0 120px rgba(0,229,160,0.05)",
        }}>
          <img src={starLabHero} alt="Sirius Star Lab"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            padding: "28px 20px 20px",
            background: "linear-gradient(to top, rgba(10,22,45,0.95) 0%, rgba(10,22,45,0.5) 60%, transparent 100%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          }}>
            <span style={{
              fontSize: "0.6rem", letterSpacing: "0.3em", fontWeight: 600,
              color: "rgba(0,229,160,0.8)", textTransform: "uppercase",
            }}>PRODUCTION</span>
            <div style={{ width: "32px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,196,255,0.5), transparent)" }} />
          </div>
        </div>

        <div style={{ marginTop: "0", width: "min(520px, 92vw)" }}>
          <button
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={handleEnter}
            style={{
              width: "100%",
              background: hover ? "rgba(0,196,255,0.12)" : "rgba(13,28,55,0.92)",
              border: `1px solid ${hover ? "rgba(0,196,255,0.45)" : "rgba(0,196,255,0.2)"}`,
              borderTop: "none",
              borderRadius: "0 0 20px 20px",
              color: hover ? "rgba(180,235,255,0.95)" : "rgba(140,180,210,0.65)",
              padding: "18px 24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "all 0.25s",
              backdropFilter: "blur(12px)",
              boxShadow: hover ? "0 8px 32px rgba(0,196,255,0.08)" : "none",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              You are now entering Sirius Star Lab
            </span>
            <span style={{
              fontSize: "0.8rem", opacity: hover ? 1 : 0.5,
              transition: "all 0.25s",
              transform: hover ? "translateX(3px)" : "translateX(0)",
              display: "inline-block",
            }}>→</span>
          </button>
        </div>

        <div style={{ display: "flex", gap: "24px", marginTop: "28px" }}>
          {["About", "Early Access", "Log In"].map(t => (
            <span key={t} style={{
              fontSize: "0.65rem", letterSpacing: "0.1em",
              color: "rgba(70,90,110,0.45)", cursor: "pointer", textTransform: "uppercase",
            }}>{t}</span>
          ))}
        </div>
      </div>

      {entering && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#0D1E3A", animation: "siriusFadeIn 0.5s ease forwards",
        }}>
          <p style={{
            fontSize: "0.7rem", letterSpacing: "0.22em",
            color: "rgba(0,196,255,0.55)", textTransform: "uppercase",
            animation: "siriusPulse 1.5s infinite",
          }}>Entering Star Lab...</p>
        </div>
      )}

      <div style={{
        position: "absolute", bottom: "28px", left: 0, right: 0,
        display: "flex", justifyContent: "center",
        zIndex: 10,
      }}>
        <span style={{ fontSize: "0.62rem", letterSpacing: "0.15em", color: "rgba(50,70,90,0.35)", textTransform: "uppercase" }}>
          sirius-ai.live
        </span>
      </div>

      <style>{`
        @keyframes siriusFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes siriusPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
