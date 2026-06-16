import { useEffect, useState } from "react";

export function SWUpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setWaiting(reg.waiting);
      }
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(newWorker);
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  }, []);

  if (!waiting) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#080c1a",
        border: "1px solid rgba(0,212,255,0.4)",
        borderRadius: 12,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 24px rgba(0,212,255,0.15)",
        backdropFilter: "blur(20px)",
        minWidth: 260,
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
        ✨ New version available
      </span>
      <button
        onClick={() => { waiting.postMessage({ type: "SKIP_WAITING" }); }}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          border: "none",
          background: "#00d4ff",
          color: "#080c1a",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Update
      </button>
      <button
        onClick={() => setWaiting(null)}
        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
