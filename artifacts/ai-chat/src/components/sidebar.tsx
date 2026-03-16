import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle, MessageSquare, Trash2, X, Settings, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings-panel";
import { PricingModal } from "@/components/pricing-modal";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import {
  useListOpenaiConversations,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const { profile } = useProfile();
  const { status, usagePercent, isPremium } = useSubscription();

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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(193 100% 52% / 0.2), hsl(224 28% 12%))",
              border: "1px solid hsl(193 100% 52% / 0.3)",
              boxShadow: "0 0 10px hsl(193 100% 52% / 0.15)"
            }}>
            <span className="text-primary font-bold text-sm">S</span>
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

      <div className="px-4 pb-4">
        <button
          onClick={() => { setLocation("/"); onClose(); }}
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
            onClick={() => setIsPricingOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 group"
            style={{
              background: "linear-gradient(135deg, hsl(193 100% 52% / 0.1), hsl(224 28% 10%))",
              border: "1px solid hsl(193 100% 52% / 0.25)",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 16px hsl(193 100% 52% / 0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
          >
            <Zap size={14} className="text-primary" fill="currentColor" />
            <div className="flex-1 text-left">
              <p className="text-[12px] font-medium text-primary">Upgrade to Plus</p>
              <p className="text-[10px] text-muted-foreground/60">
                {status.dailyMessageCount}/{status.dailyLimit ?? 30} messages today
              </p>
            </div>
            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(224 24% 14%)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  background: usagePercent > 80 ? "hsl(0 80% 60%)" : "hsl(193 100% 52%)"
                }} />
            </div>
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
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 text-sm"
        >
          <Settings size={15} />
          <span className="text-[13px]">Configure {aiName}</span>
          {profile.aiPersonality && (
            <span className="ml-auto text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: "hsl(193 100% 52% / 0.1)", color: "hsl(193 100% 52%)", border: "1px solid hsl(193 100% 52% / 0.2)" }}>
              Custom
            </span>
          )}
        </button>
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
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} currentTier={status.tier} />
    </>
  );
}
