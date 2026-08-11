import { useEffect, useState, useRef } from "react";

export function ReconnectionBanner() {
  const [offline, setOffline] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = async () => {
    try {
      const res = await fetch("/api/health", { method: "GET", cache: "no-store" });
      if (res.ok) {
        setOffline(false);
        // Delay hiding so user sees the "back online" state briefly
        timerRef.current = setTimeout(() => setVisible(false), 2000);
      } else {
        setOffline(true);
        setVisible(true);
      }
    } catch {
      setOffline(true);
      setVisible(true);
    }
  };

  useEffect(() => {
    // Start polling after 5s to avoid false positives on first load
    const start = setTimeout(() => {
      check();
      pollRef.current = setInterval(check, 15000);
    }, 5000);

    return () => {
      clearTimeout(start);
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: offline ? "rgba(239,68,68,0.95)" : "rgba(16,185,129,0.95)",
        color: "#fff",
        textAlign: "center",
        padding: "10px 16px",
        fontSize: "13px",
        fontWeight: 600,
        backdropFilter: "blur(8px)",
        transition: "background 0.4s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      {offline ? (
        <>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#fff",
              display: "inline-block",
              animation: "pulse 1.2s ease-in-out infinite",
            }}
          />
          Sirius is reconnecting… Please wait
        </>
      ) : (
        <>✓ Back online</>
      )}
    </div>
  );
}
