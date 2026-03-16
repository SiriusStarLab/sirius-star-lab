import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle, MessageSquare, Trash2, X, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/settings-panel";
import { useProfile } from "@/hooks/use-profile";
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
  const { profile } = useProfile();

  const { data: conversations, isLoading } = useListOpenaiConversations();
  const { mutate: deleteConversation, isPending: isDeleting } = useDeleteOpenaiConversation();

  const currentId = location.startsWith("/c/") ? parseInt(location.split("/c/")[1]) : null;
  const aiName = profile.aiName || "Nexus";

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
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-72 lg:w-80 shadow-2xl lg:shadow-none">
      <div className="p-4 lg:p-6 flex items-center justify-between">
        <Link
          href="/"
          onClick={() => onClose()}
          className="flex items-center gap-3 text-sidebar-foreground font-semibold hover:text-white transition-colors"
        >
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Logo"
            className="w-8 h-8 rounded-lg"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement?.insertAdjacentHTML(
                "afterbegin",
                '<div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><div class="w-4 h-4 bg-primary-foreground rounded-sm"></div></div>'
              );
            }}
          />
          {aiName}
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
        <Button
          onClick={() => {
            setLocation("/");
            onClose();
          }}
          className="w-full justify-start gap-2 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 border border-sidebar-border"
        >
          <PlusCircle size={18} />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Recent Chats
        </div>

        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-sidebar-accent/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="px-3 py-6 text-sm text-sidebar-foreground/50 text-center">
            No history yet. Start a new chat!
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
                  "group flex flex-col gap-1 p-3 rounded-xl transition-all duration-200 border border-transparent",
                  isActive
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
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

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 text-sm"
        >
          <Settings size={16} />
          <span>Customise your AI</span>
          {profile.aiPersonality && (
            <span className="ml-auto text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
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
    </>
  );
}
