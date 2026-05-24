import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle, MessageSquare, Trash2, X, Settings, Zap, Loader2, Sparkles, FlaskConical, BookOpen, GraduationCap, Globe2, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings-panel";
import { MemoryPortrait } from "@/components/memory-portrait";
import { PricingModal, startCheckout } from "@/components/pricing-modal";
import { TutorialsModal } from "@/components/tutorials-modal";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { getUserId } from "@/lib/user-id";
import { getApiBase } from "@/lib/api-base";
import {
  useListOpenaiConversations,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";

function useLabPendingCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Only poll if the user has an active Star Lab session — never expose
    // internal project counts to unauthenticated public visitors
    const pin = sessionStorage.getItem("lab_pin");
    if (!pin) return;

    const base = getApiBase();
    const check = async () => {
      try {
        const res = await fetch(`${base}lab/notification-count`, {
          headers: { "x-lab-pin": pin },
        });
        if (res.ok) { const d = await res.json(); setCount(d.pendingApproval || 0); }
      } catch {}
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);
  return count;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  forceOpenPricing?: "plus" | "pro" | null;
  onNewSession?: () => void;
}

export function Sidebar({ isOpen, onClose, forceOpenPricing, onNewSession }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const labPendingCount = useLabPendingCount();
  const queryClient = useQueryClient();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPortraitOpen, setIsPortraitOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isTutorialsOpen, setIsTutorialsOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const { profile } = useProfile();
  const { status, usagePercent, isPremium } = useSubscription();
  const userId = getUserId();

  useEffect(() => {
    if (forceOpenPricing) setIsPricingOpen(true);
  }, [forceOpenPricing]);

  const handleDirectUpgrade = () => {
    setIsPricingOpen(true);
  };

  const { data: conversations, isLoading } = useListOpenaiConversations();
  const { mutate: deleteConversation, isPending: isDeleting } = useDeleteOpenaiConversation();

  const currentId = location.startsWith("/c/") ? parseInt(location.split("/c/")[1]) : null;
  const aiName = profile.aiName || "Sirius";

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();

    deleteConversation({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (currentId === id) {
          setLocation("/");
        }
      },
    });
  };

  const sortedConversations = React.useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [conversations]);

  const SidebarContent = (
    <div className="flex flex-col h-full w-72 lg:w-80 shadow-2xl lg:shadow-none"
      style={{
        background: "hsl(var(--sidebar))",
        borderRight: "1px solid hsl(193 100% 52% / 0.1)"
      }}>
      <div className="p-4 lg:p-6 flex items-center justify-between">
        <Link
          href="/"
          onClick={() => onClose()}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
            style={{
              boxShadow: "0 0 12px hsl(193 100% 52% / 0.25), 0 0 4px hsl(193 100% 52% / 0.15)"
            }}>
            <img src="/logo.png" alt="Sirius" className="w-full h-full object-cover" style={{ filter: "brightness(1.5) contrast(1.1) saturate(1.4)" }} />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-wide text-sidebar-foreground block">{aiName}</span>
            <span className="text-[9px] font-mono tracking-[0.12em] block" style={{ color: "hsl(193 100% 52% / 0.5)" }}>I think, so I am</span>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-sidebar-foreground"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </div>

      <div className="px-4 pb-2 space-y-2">
        <button
          onClick={() => { if (onNewSession) { onNewSession(); } else { setLocation("/"); } onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: "hsl(193 100% 52% / 0.08)",
            border: "1px solid hsl(193 100% 52% / 0.2)",
            color: "hsl(193 100% 52%)",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.background = "hsl(193 100% 52% / 0.15)";
            el.style.boxShadow = "0 0 12px hsl(193 100% 52% / 0.15)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.background = "hsl(193 100% 52% / 0.08)";
            el.style.boxShadow = "none";
          }}
        >
          <PlusCircle size={16} />
          New Session
        </button>

        {/* Sirius Guide — moved above Learn */}
        <button
          onClick={() => setIsTutorialsOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: "hsla(38,95%,55%,0.07)",
            border: "1px solid hsla(38,95%,55%,0.18)",
            color: "hsl(38,80%,32%)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "hsla(38,95%,55%,0.13)";
            e.currentTarget.style.borderColor = "hsla(38,95%,55%,0.35)";
            e.currentTarget.style.color = "hsl(38,80%,26%)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "hsla(38,95%,55%,0.07)";
            e.currentTarget.style.borderColor = "hsla(38,95%,55%,0.18)";
            e.currentTarget.style.color = "hsl(38,80%,32%)";
          }}
        >
          <BookOpen size={15} style={{ flexShrink: 0 }} />
          <span className="flex-1 text-left">Sirius Guide</span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "hsla(38,95%,55%,0.1)", color: "hsl(38,80%,30%)", border: "1px solid hsla(38,95%,55%,0.2)", letterSpacing: "0.15em" }}>
            HELP
          </span>
        </button>

        {/* Learn entry */}
        <button
          onClick={() => { setLocation("/learn"); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden group"
          style={{
            background: location === "/learn" ? "hsla(193,100%,35%,0.1)" : "hsla(193,100%,35%,0.05)",
            border: location === "/learn" ? "1px solid hsla(193,100%,35%,0.35)" : "1px solid hsla(193,100%,35%,0.15)",
            color: location === "/learn" ? "hsl(193,100%,24%)" : "hsl(193,65%,30%)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "hsla(193,100%,35%,0.1)";
            e.currentTarget.style.borderColor = "hsla(193,100%,35%,0.35)";
            e.currentTarget.style.color = "hsl(193,100%,24%)";
          }}
          onMouseLeave={e => {
            if (location !== "/learn") {
              e.currentTarget.style.background = "hsla(193,100%,35%,0.05)";
              e.currentTarget.style.borderColor = "hsla(193,100%,35%,0.15)";
              e.currentTarget.style.color = "hsl(193,65%,30%)";
            }
          }}
        >
          <GraduationCap size={15} style={{ flexShrink: 0 }} />
          <span className="flex-1 text-left">Learn</span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "hsla(193,100%,35%,0.1)", color: "hsl(193,100%,26%)", border: "1px solid hsla(193,100%,35%,0.2)", letterSpacing: "0.15em" }}>
            NEW
          </span>
        </button>

        {/* Dream Lab entry */}
        <button
          onClick={() => { setLocation("/dream-lab"); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden group"
          style={{
            background: location === "/dream-lab" ? "hsla(280,70%,55%,0.1)" : "hsla(280,70%,55%,0.05)",
            border: location === "/dream-lab" ? "1px solid hsla(280,70%,55%,0.35)" : "1px solid hsla(280,70%,55%,0.15)",
            color: location === "/dream-lab" ? "hsl(280,65%,35%)" : "hsl(280,45%,42%)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "hsla(280,70%,55%,0.1)";
            e.currentTarget.style.borderColor = "hsla(280,70%,55%,0.35)";
            e.currentTarget.style.color = "hsl(280,65%,35%)";
          }}
          onMouseLeave={e => {
            if (location !== "/dream-lab") {
              e.currentTarget.style.background = "hsla(280,70%,55%,0.05)";
              e.currentTarget.style.borderColor = "hsla(280,70%,55%,0.15)";
              e.currentTarget.style.color = "hsl(280,45%,42%)";
            }
          }}
        >
          <Sparkles size={15} style={{ flexShrink: 0 }} />
          <span className="flex-1 text-left">Dream Lab</span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "hsla(280,70%,55%,0.1)", color: "hsl(280,65%,38%)", border: "1px solid hsla(280,70%,55%,0.2)", letterSpacing: "0.15em" }}>
            NEW
          </span>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: "hsl(280,70%,55%)" }} />
        </button>

        {/* Wellbeing entry */}
        <button
          onClick={() => { setLocation("/wellbeing"); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden group"
          style={{
            background: location === "/wellbeing" ? "hsla(168,70%,38%,0.1)" : "hsla(168,70%,38%,0.05)",
            border: location === "/wellbeing" ? "1px solid hsla(168,70%,38%,0.35)" : "1px solid hsla(168,70%,38%,0.15)",
            color: location === "/wellbeing" ? "hsl(168,65%,26%)" : "hsl(168,45%,32%)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "hsla(168,70%,38%,0.1)";
            e.currentTarget.style.borderColor = "hsla(168,70%,38%,0.35)";
            e.currentTarget.style.color = "hsl(168,65%,26%)";
          }}
          onMouseLeave={e => {
            if (location !== "/wellbeing") {
              e.currentTarget.style.background = "hsla(168,70%,38%,0.05)";
              e.currentTarget.style.borderColor = "hsla(168,70%,38%,0.15)";
              e.currentTarget.style.color = "hsl(168,45%,32%)";
            }
          }}
        >
          <Heart size={15} style={{ flexShrink: 0 }} />
          <span className="flex-1 text-left">Wellbeing</span>
        </button>

        {/* Universe Guide entry */}
        <button
          onClick={() => { setLocation("/universe"); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden group"
          style={{
            background: location === "/universe" ? "hsla(220,90%,55%,0.1)" : "hsla(220,90%,55%,0.05)",
            border: location === "/universe" ? "1px solid hsla(220,90%,55%,0.35)" : "1px solid hsla(220,90%,55%,0.15)",
            color: location === "/universe" ? "hsl(220,75%,35%)" : "hsl(220,50%,42%)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "hsla(220,90%,55%,0.1)";
            e.currentTarget.style.borderColor = "hsla(220,90%,55%,0.35)";
            e.currentTarget.style.color = "hsl(220,75%,35%)";
          }}
          onMouseLeave={e => {
            if (location !== "/universe") {
              e.currentTarget.style.background = "hsla(220,90%,55%,0.05)";
              e.currentTarget.style.borderColor = "hsla(220,90%,55%,0.15)";
              e.currentTarget.style.color = "hsl(220,50%,42%)";
            }
          }}
        >
          <Globe2 size={15} style={{ flexShrink: 0 }} />
          <span className="flex-1 text-left">The Universe</span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "hsla(220,90%,55%,0.1)", color: "hsl(220,75%,38%)", border: "1px solid hsla(220,90%,55%,0.2)", letterSpacing: "0.15em" }}>
            NEW
          </span>
        </button>

        {/* Star Lab entry */}
        <button
          onClick={() => { setLocation("/star-lab"); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden group"
          style={{
            background: location === "/star-lab" ? "hsla(193,100%,35%,0.1)" : "hsla(193,100%,35%,0.05)",
            border: location === "/star-lab" ? "1px solid hsla(193,100%,35%,0.35)" : "1px solid hsla(193,100%,35%,0.15)",
            color: location === "/star-lab" ? "hsl(193,100%,24%)" : "hsl(193,60%,32%)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "hsla(193,100%,35%,0.1)";
            e.currentTarget.style.borderColor = "hsla(193,100%,35%,0.35)";
            e.currentTarget.style.color = "hsl(193,100%,24%)";
          }}
          onMouseLeave={e => {
            if (location !== "/star-lab") {
              e.currentTarget.style.background = "hsla(193,100%,35%,0.05)";
              e.currentTarget.style.borderColor = "hsla(193,100%,35%,0.15)";
              e.currentTarget.style.color = "hsl(193,60%,32%)";
            }
          }}
        >
          <FlaskConical size={15} style={{ flexShrink: 0 }} />
          <span className="flex-1 text-left">Star Lab</span>
          {labPendingCount > 0 ? (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex-shrink-0"
              style={{ background: "hsl(25,90%,55%)", color: "white" }}>
              {labPendingCount}
            </span>
          ) : (
            <>
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: "hsla(193,100%,35%,0.1)", color: "hsl(193,100%,26%)", border: "1px solid hsla(193,100%,35%,0.2)", letterSpacing: "0.15em" }}>
                R&amp;D
              </span>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                style={{ background: "hsl(193,100%,38%)" }} />
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono font-medium text-sidebar-foreground/35 uppercase tracking-[0.2em]">
          Session History
        </div>

        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-sidebar-accent/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="px-3 py-8 text-center space-y-1">
            <p className="text-sm text-sidebar-foreground/50">Your story starts here.</p>
            <p className="text-xs text-sidebar-foreground/30">Every conversation begins somewhere.</p>
          </div>
        ) : (
          sortedConversations.map((convo) => {
            const isActive = currentId === convo.id;
            return (
              <Link
                key={convo.id}
                href={`/c/${convo.id}`}
                onClick={() => onClose()}
                className={cn(
                  "group flex flex-col gap-1 p-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                )}
                style={isActive ? {
                  background: "hsl(193 100% 52% / 0.07)",
                  border: "1px solid hsl(193 100% 52% / 0.2)"
                } : {
                  border: "1px solid transparent"
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare
                      size={16}
                      className={cn("shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/50")}
                    />
                    <span className="text-sm font-medium truncate">
                      {convo.title || "New Conversation"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, convo.id)}
                    disabled={isDeleting}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/20 hover:text-destructive transition-all disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <span className="text-[11px] text-sidebar-foreground/40 pl-7">
                  {formatDistanceToNow(new Date(convo.createdAt), { addSuffix: true })}
                </span>
              </Link>
            );
          })
        )}
      </div>

      <div className="p-4 space-y-2" style={{ borderTop: "1px solid hsl(193 100% 52% / 0.08)" }}>
        {/* Upgrade button for free users */}
        {!isPremium && (
          <button
            onClick={handleDirectUpgrade}
            disabled={checkingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 group"
            style={{
              background: checkingOut
                ? "hsl(193 100% 52% / 0.06)"
                : "linear-gradient(135deg, hsl(193 100% 52% / 0.12), hsl(224 28% 10%))",
              border: "1px solid hsl(193 100% 52% / 0.28)",
              opacity: checkingOut ? 0.9 : 1,
            }}
            onMouseEnter={e => { if (!checkingOut) e.currentTarget.style.boxShadow = "0 0 16px hsl(193 100% 52% / 0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
          >
            {checkingOut
              ? <Loader2 size={14} className="text-primary animate-spin" />
              : <Zap size={14} className="text-primary" fill="currentColor" />}
            <div className="flex-1 text-left">
              <p className="text-[12px] font-medium text-primary">
                {checkingOut ? "Preparing checkout…" : "Get Plus — £5/month"}
              </p>
              {!checkingOut && (
                <p className="text-[10px] text-muted-foreground/60">
                  {status.dailyMessageCount}/{status.dailyLimit ?? 30} messages today
                </p>
              )}
            </div>
            {!checkingOut && (
              <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(224 24% 14%)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usagePercent}%`,
                    background: usagePercent > 80 ? "hsl(0 80% 60%)" : "hsl(193 100% 52%)"
                  }} />
              </div>
            )}
          </button>
        )}

        {/* Premium badge */}
        {isPremium && (
          <button
            onClick={() => setIsPricingOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200"
            style={{
              background: "hsl(45 95% 58% / 0.07)",
              border: "1px solid hsl(45 95% 58% / 0.2)",
            }}
          >
            <Zap size={14} className="text-amber-400" fill="currentColor" />
            <div className="flex-1 text-left">
              <p className="text-[12px] font-medium text-amber-400 capitalize">{status.tier} member</p>
              <p className="text-[10px] text-muted-foreground/50">
                {status.dailyLimit ? `${status.dailyMessageCount}/${status.dailyLimit} today` : "Unlimited messages"}
              </p>
            </div>
          </button>
        )}

        <button
          onClick={() => setIsPortraitOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm"
          style={{
            color: "hsl(193 100% 52% / 0.7)",
            background: "hsl(193 100% 52% / 0.04)",
            border: "1px solid hsl(193 100% 52% / 0.12)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "hsl(193 100% 52%)";
            e.currentTarget.style.background = "hsl(193 100% 52% / 0.08)";
            e.currentTarget.style.boxShadow = "0 0 12px hsl(193 100% 52% / 0.08)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "hsl(193 100% 52% / 0.7)";
            e.currentTarget.style.background = "hsl(193 100% 52% / 0.04)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <Sparkles size={14} />
          <span className="text-[13px] font-medium">Memory Portrait</span>
          <span className="ml-auto text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: "hsl(193 100% 52% / 0.1)", color: "hsl(193 100% 52%)", border: "1px solid hsl(193 100% 52% / 0.2)" }}>
            {aiName}
          </span>
        </button>



        {/* Legal links */}
        <div className="flex items-center gap-3 px-3 pt-2 pb-1">
          <Link href="/terms" className="text-[10px] font-mono text-muted-foreground/30 hover:text-primary/60 transition-colors">Terms</Link>
          <span className="text-muted-foreground/20 text-[10px]">·</span>
          <Link href="/privacy" className="text-[10px] font-mono text-muted-foreground/30 hover:text-primary/60 transition-colors">Privacy</Link>
          <span className="text-muted-foreground/20 text-[10px] ml-auto">© {new Date().getFullYear()} Sirius Star Lab</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:static lg:block transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          !isOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {SidebarContent}
      </motion.div>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <MemoryPortrait isOpen={isPortraitOpen} onClose={() => setIsPortraitOpen(false)} aiName={aiName} />
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} currentTier={status.tier} />
      <TutorialsModal open={isTutorialsOpen} onClose={() => setIsTutorialsOpen(false)} />
    </>
  );
}
