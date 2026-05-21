import React from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiBase } from "@/lib/api-base";

type SiriusNotification = {
  id: number;
  title: string;
  message: string;
  type: "proposal" | "needs_key" | "achievement" | "insight" | "wants_chat" | "urgent" | "info";
  urgency: "low" | "normal" | "high";
  read: boolean;
  sentEmail: boolean;
  createdAt: string;
};

const NOTIF_TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  proposal:   { emoji: "📋", label: "Proposal",   color: "hsl(280,80%,55%)" },
  needs_key:  { emoji: "🔑", label: "Needs Key",  color: "hsl(35,100%,52%)" },
  achievement:{ emoji: "⚡", label: "Achievement", color: "hsl(193,100%,42%)" },
  insight:    { emoji: "💡", label: "Insight",    color: "hsl(48,97%,48%)" },
  wants_chat: { emoji: "💬", label: "Wants Chat", color: "hsl(210,80%,55%)" },
  urgent:     { emoji: "🚨", label: "Urgent",     color: "hsl(0,80%,55%)" },
  info:       { emoji: "ℹ️",  label: "Info",       color: "hsl(215,60%,55%)" },
};

export function NotificationBell({ pin }: { pin: string }) {
  const [open, setOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState<SiriusNotification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const base = getApiBase();

  const fetchNotifs = React.useCallback(async () => {
    if (!pin) return;
    setLoading(true);
    try {
      const r = await fetch(`${base}lab/notifications`, { headers: { "x-lab-pin": pin } });
      if (r.ok) setNotifs(await r.json());
    } finally { setLoading(false); }
  }, [pin, base]);

  React.useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  React.useEffect(() => {
    if (!open) return;
    const id = setInterval(fetchNotifs, 15000);
    return () => clearInterval(id);
  }, [open, fetchNotifs]);

  React.useEffect(() => {
    const id = setInterval(fetchNotifs, 60000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifs.filter(n => !n.read);
  const unreadCount = unread.length;

  const markRead = async (id: number) => {
    await fetch(`${base}lab/notifications/${id}/read`, { method: "POST", headers: { "x-lab-pin": pin } });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await fetch(`${base}lab/notifications/read-all`, { method: "POST", headers: { "x-lab-pin": pin } });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${base}lab/notifications/${id}`, { method: "DELETE", headers: { "x-lab-pin": pin } });
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all"
        style={{ background: open ? "hsla(280,80%,55%,0.12)" : "transparent", color: unreadCount > 0 ? "hsl(280,80%,52%)" : "rgba(15,23,42,0.4)" }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.06)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        title={unreadCount > 0 ? `${unreadCount} new notification${unreadCount !== 1 ? "s" : ""} from Sirius` : "Notifications from Sirius"}>
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-white font-bold"
            style={{ minWidth: 16, height: 16, fontSize: 9, padding: "0 4px", background: "hsl(280,80%,52%)", boxShadow: "0 0 0 2px #FFFFFF" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: 360, maxHeight: 480, zIndex: 200, background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.1)", boxShadow: "0 20px 60px rgba(15,23,42,0.15), 0 4px 16px rgba(0,0,0,0.08)" }}>

            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(15,23,42,0.07)", background: "#FAFBFC" }}>
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" style={{ color: "hsl(280,80%,52%)" }} />
                <span className="text-xs font-bold" style={{ color: "#0F172A" }}>
                  From Sirius {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold" style={{ background: "hsl(280,80%,52%)" }}>{unreadCount}</span>}
                </span>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all"
                  style={{ color: "hsl(280,80%,52%)", background: "hsla(280,80%,52%,0.08)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "hsla(280,80%,52%,0.16)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "hsla(280,80%,52%,0.08)"}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && notifs.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(15,23,42,0.3)" }} />
                </div>
              ) : notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell className="w-6 h-6" style={{ color: "rgba(15,23,42,0.15)" }} />
                  <p className="text-xs" style={{ color: "rgba(15,23,42,0.35)" }}>No notifications yet</p>
                  <p className="text-[10px]" style={{ color: "rgba(15,23,42,0.25)" }}>Sirius will reach you here</p>
                </div>
              ) : (
                notifs.map(n => {
                  const meta = NOTIF_TYPE_META[n.type] || NOTIF_TYPE_META.info;
                  const isUrgent = n.urgency === "high" || n.type === "urgent";
                  return (
                    <div key={n.id}
                      onClick={() => { if (!n.read) markRead(n.id); }}
                      className="group flex gap-3 px-4 py-3 cursor-pointer transition-all"
                      style={{ background: n.read ? "transparent" : isUrgent ? "hsla(0,80%,55%,0.04)" : "hsla(280,80%,52%,0.04)", borderBottom: "1px solid rgba(15,23,42,0.06)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.03)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.read ? "transparent" : isUrgent ? "hsla(0,80%,55%,0.04)" : "hsla(280,80%,52%,0.04)"}>
                      <div className="flex-shrink-0 relative">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: `${meta.color}18` }}>
                          {meta.emoji}
                        </div>
                        {!n.read && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: isUrgent ? "hsl(0,80%,55%)" : "hsl(280,80%,52%)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <span className="text-xs font-semibold leading-tight" style={{ color: n.read ? "rgba(15,23,42,0.6)" : "#0F172A" }}>{n.title}</span>
                          <button onClick={e => deleteNotif(n.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <X className="w-3 h-3" style={{ color: "rgba(15,23,42,0.3)" }} />
                          </button>
                        </div>
                        <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: "rgba(15,23,42,0.55)" }}>{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.label}</span>
                          {n.urgency === "high" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsla(0,80%,55%,0.1)", color: "hsl(0,80%,52%)" }}>HIGH PRIORITY</span>
                          )}
                          <span className="text-[9px]" style={{ color: "rgba(15,23,42,0.3)" }}>
                            {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
