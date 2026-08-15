import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Mail, Zap, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
  const { status, isPremium } = useSubscription();
  const [signingOut, setSigningOut] = useState(false);

  const email = localStorage.getItem("sirius_account_email") || "";
  const userId = localStorage.getItem("sirius_user_id") || "";
  const isTester = userId.startsWith("tst_");

  const tierLabel = isTester
    ? "Team Tester"
    : isPremium
    ? "Sirius Premium"
    : "Free";

  const tierColor = isTester
    ? "hsl(38,90%,55%)"
    : isPremium
    ? "hsl(193,100%,45%)"
    : "hsl(193,60%,50%)";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleRefresh = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        const sw = regs[0];
        if (sw) {
          await sw.update();
          if (sw.waiting) {
            sw.waiting.postMessage({ type: "SKIP_WAITING" });
            return;
          }
        }
      }
    } catch {}
    window.location.reload();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 inset-y-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">My Account</h2>
                  <p className="text-xs text-muted-foreground">Manage your Sirius account</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close account">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Email */}
              <section className="rounded-xl border border-border bg-accent/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Email address</span>
                </div>
                <p className="text-sm text-muted-foreground break-all">
                  {email || <span className="italic opacity-50">Not available</span>}
                </p>
              </section>

              {/* Subscription tier */}
              <section className="rounded-xl border border-border bg-accent/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4" style={{ color: tierColor }} />
                  <span className="text-sm font-semibold text-foreground">Subscription</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: `${tierColor}18`,
                      color: tierColor,
                      border: `1px solid ${tierColor}35`,
                    }}
                  >
                    {tierLabel}
                  </span>
                  {isPremium && (
                    <span className="text-xs text-muted-foreground">
                      {status.dailyLimit
                        ? `${status.dailyMessageCount}/${status.dailyLimit} messages today`
                        : "Unlimited messages"}
                    </span>
                  )}
                </div>
                {!isPremium && !isTester && (
                  <p className="text-xs text-muted-foreground">
                    Upgrade to Premium for unlimited messages and all features.
                  </p>
                )}
                {isPremium && (
                  <p className="text-xs text-muted-foreground">
                    To cancel, use the Stripe billing portal or email{" "}
                    <a href="mailto:siriusailab@gmail.com" className="text-primary underline">
                      siriusailab@gmail.com
                    </a>
                  </p>
                )}
              </section>

              {/* Account ID */}
              {userId && (
                <section className="rounded-xl border border-border bg-accent/30 p-4">
                  <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider mb-1">Account ID</p>
                  <p className="text-xs font-mono text-muted-foreground/50 break-all">{userId}</p>
                </section>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 border-t border-border space-y-3">
              <button
                onClick={handleRefresh}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "hsl(193 100% 52% / 0.06)",
                  border: "1px solid hsl(193 100% 52% / 0.15)",
                  color: "hsl(193 100% 40%)",
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh to latest version
              </button>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "hsl(0 70% 50% / 0.06)",
                  border: "1px solid hsl(0 70% 50% / 0.2)",
                  color: signingOut ? "hsl(0 50% 50% / 0.5)" : "hsl(0 65% 50%)",
                  cursor: signingOut ? "not-allowed" : "pointer",
                }}
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
