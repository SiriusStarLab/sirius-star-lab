import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIOSSafari() {
  const ua = navigator.userAgent;
  return isIOS() && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

const SESSION_DISMISSED_KEY = "sirius_pwa_dismissed_session";

export function PWAInstallPrompt() {
  useEffect(() => {
    if (isInStandaloneMode()) return;

    // Capture install event (fires on any Chromium browser — Android, ChromeOS,
    // Windows/Linux desktop laptops, etc.) and store globally — welcome screen uses it
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__siriusPWAInstallEvent = e;
      window.dispatchEvent(new Event("sirius-pwa-installable"));
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // No floating bar — install is handled via sidebar button and welcome screen button
  return null;
}

// ── Standalone iOS guide component used by sidebar & welcome screen ──────────
interface IOSGuideProps {
  onClose: () => void;
}

export function IOSInstallGuide({ onClose }: IOSGuideProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, cursor: "pointer",
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 12px 24px",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 220 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: "linear-gradient(160deg, #0d1629 0%, #080c1a 100%)",
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: 20,
          padding: 22,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/pwa-192.png" alt="Sirius" style={{ width: 44, height: 44, borderRadius: 10 }} />
            <div>
              <div style={{ color: "#fff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 16 }}>
                Install Sirius Star Lab
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Outfit, sans-serif", fontSize: 12, marginTop: 2 }}>
                Add to your home screen for the best experience
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.4)" }}
          >
            <X size={18} />
          </button>
        </div>

        {!isIOSSafari() && isIOS() ? (
          /* iOS Chrome / non-Safari */
          <div style={{
            background: "rgba(255,180,0,0.08)",
            border: "1px solid rgba(255,180,0,0.35)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ color: "#ffb400", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              ⚠️ You need to switch to Safari
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Outfit, sans-serif", fontSize: 14, lineHeight: 1.6 }}>
              Chrome on iPhone can only save bookmarks — not install apps.<br /><br />
              Open <strong style={{ color: "#fff" }}>Safari</strong> and visit{" "}
              <strong style={{ color: "#fff" }}>sirius-ai.live</strong>, then tap{" "}
              <strong style={{ color: "#fff" }}>Add to Home Screen</strong> from the Share menu.
            </div>
          </div>
        ) : (
          /* iOS Safari or Android */
          <div style={{
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.18)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(0,212,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#00d4ff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14 }}>1</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.85)", fontFamily: "Outfit, sans-serif", fontSize: 14 }}>
                Tap the <Share size={15} color="#00d4ff" style={{ display: "inline", flexShrink: 0 }} />{" "}
                <strong style={{ color: "#fff" }}>Share</strong> button at the bottom of Safari
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(0,212,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#00d4ff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14 }}>2</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.85)", fontFamily: "Outfit, sans-serif", fontSize: 14 }}>
                Scroll down and tap <Plus size={15} color="#00d4ff" style={{ display: "inline", flexShrink: 0 }} />{" "}
                <strong style={{ color: "#fff" }}>Add to Home Screen</strong>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
