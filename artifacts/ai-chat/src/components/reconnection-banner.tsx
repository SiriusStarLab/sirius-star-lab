import { useConnectionStatus } from "@/hooks/use-connection-status";

/**
 * Reconnection Banner — Tier 1 UX
 * Shows a subtle top-of-screen indicator when the server is recovering.
 * "Reconnecting to Sirius..." → amber pulse
 * "Reconnected ✓"             → green, auto-dismisses in 3s
 * Hidden when connected normally.
 */
export function ReconnectionBanner() {
  const status = useConnectionStatus();

  if (status === "connected") return null;

  const isReconnecting = status === "reconnecting";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "6px 16px",
        fontSize: "13px",
        fontWeight: 500,
        letterSpacing: "0.01em",
        background: isReconnecting
          ? "rgba(251, 191, 36, 0.95)"  // amber
          : "rgba(34, 197, 94, 0.95)",   // green
        color: isReconnecting ? "#78350f" : "#14532d",
        transition: "background 0.4s ease",
        boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
      }}
    >
      {isReconnecting ? (
        <>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#d97706",
              animation: "sirius-pulse 1.2s ease-in-out infinite",
            }}
          />
          Reconnecting to Sirius...
        </>
      ) : (
        <>
          <span style={{ fontSize: "15px" }}>✓</span>
          Reconnected
        </>
      )}
      <style>{`
        @keyframes sirius-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}
