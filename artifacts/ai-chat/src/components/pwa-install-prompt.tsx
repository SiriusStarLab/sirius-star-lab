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

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

const DISMISSED_KEY = "sirius_pwa_dismissed";

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (!isMobile()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 1000 * 60 * 60 * 24 * 7) return;
    }

    if (isIOS()) {
      const timer = setTimeout(() => {
        setShowIOSGuide(true);
        setVisible(true);
      }, 4000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: "16px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          background: "linear-gradient(to top, rgba(8,12,26,0.98) 0%, rgba(8,12,26,0.95) 100%)",
          borderTop: "1px solid rgba(0,212,255,0.15)",
          backdropFilter: "blur(20px)",
        }}
      >
        {showIOSGuide ? (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src="/pwa-192.png" alt="Sirius" style={{ width: 44, height: 44, borderRadius: 10 }} />
                <div>
                  <div style={{ color: "#ffffff", fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: 15 }}>
                    Install Sirius Star Lab
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Outfit, sans-serif", fontSize: 12, marginTop: 2 }}>
                    Add to your home screen
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.4)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.15)",
              borderRadius: 12,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(0,212,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: "#00d4ff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 13 }}>1</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.8)", fontFamily: "Outfit, sans-serif", fontSize: 14 }}>
                  Tap the <Share size={16} color="#00d4ff" style={{ display: "inline", flexShrink: 0 }} /> Share button below
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(0,212,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: "#00d4ff", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 13 }}>2</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.8)", fontFamily: "Outfit, sans-serif", fontSize: 14 }}>
                  Tap <Plus size={16} color="#00d4ff" style={{ display: "inline", flexShrink: 0 }} /> <strong style={{ color: "#fff" }}>Add to Home Screen</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 420, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/pwa-192.png" alt="Sirius" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#ffffff", fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                Install Sirius Star Lab
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Outfit, sans-serif", fontSize: 12 }}>
                Add to your home screen — works offline
              </div>
            </div>
            <button
              onClick={handleDismiss}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}
            >
              <X size={18} />
            </button>
            <button
              onClick={handleInstall}
              style={{
                background: "#00d4ff",
                color: "#080c1a",
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                fontFamily: "Outfit, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              Install
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
