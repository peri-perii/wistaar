import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Shield,
  BookOpen,
  ShoppingBag,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useUnreadCount,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

// ── Per-type config ─────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string; label: string }
> = {
  admin_promotion: {
    icon: <Shield className="h-3.5 w-3.5" />,
    bg: "bg-violet-500/15 text-violet-500",
    label: "Admin",
  },
  book_approved: {
    icon: <BookOpen className="h-3.5 w-3.5" />,
    bg: "bg-emerald-500/15 text-emerald-500",
    label: "Approved",
  },
  book_rejected: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "bg-red-500/15 text-red-500",
    label: "Rejected",
  },
  book_purchased: {
    icon: <ShoppingBag className="h-3.5 w-3.5" />,
    bg: "bg-blue-500/15 text-blue-500",
    label: "Purchase",
  },
};

const DEFAULT_TYPE = {
  icon: <Sparkles className="h-3.5 w-3.5" />,
  bg: "bg-primary/15 text-primary",
  label: "Update",
};

// ── Relative time ────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const unreadCount = useUnreadCount();

  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);

  const handleMarkRead = (id: string) => markAsRead.mutate(id);
  const handleMarkAll = () => markAllAsRead.mutate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id="notification-bell-trigger"
          className="relative w-12 h-12 md:w-9 md:h-9 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {/* Bell with subtle shake animation when there are unread */}
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Bell
              className={cn(
                "h-5 w-5 transition-colors",
                unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
              )}
            />
          </motion.div>

          {/* Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[340px] p-0 shadow-xl border-border/60 overflow-hidden"
        sideOffset={10}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* ── Body ── */}
        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            </div>
          ) : notifications.length === 0 ? (
            // ── Empty state ──
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-14 text-center px-6"
            >
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Bell className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <span className="absolute -bottom-1 -right-1 text-lg">✨</span>
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                You have no notifications right now.
              </p>
            </motion.div>
          ) : (
            <div>
              {/* ── Unread section ── */}
              {unread.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                      New · {unread.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
                    <AnimatePresence initial={false}>
                      {unread.map((n) => {
                        const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_TYPE;
                        return (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex gap-3 px-4 py-3 bg-primary/[0.04] hover:bg-primary/[0.07] transition-colors"
                          >
                            {/* Icon */}
                            <div
                              className={cn(
                                "mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                cfg.bg
                              )}
                            >
                              {cfg.icon}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-snug">
                                {n.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-muted-foreground/60 mt-1">
                                {formatTime(n.created_at)}
                              </p>
                            </div>

                            {/* Mark read */}
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="mt-0.5 flex-shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* ── Read section ── */}
              {read.length > 0 && (
                <div>
                  {unread.length > 0 && (
                    <div className="px-4 pt-3 pb-1.5 border-t border-border/50">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                        Earlier
                      </span>
                    </div>
                  )}
                  <div className="divide-y divide-border/30">
                    {read.slice(0, 10).map((n) => {
                      const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_TYPE;
                      return (
                        <div
                          key={n.id}
                          className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors opacity-75"
                        >
                          <div
                            className={cn(
                              "mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 opacity-60",
                              cfg.bg
                            )}
                          >
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-snug">
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {n.message}
                            </p>
                            <p className="text-[11px] text-muted-foreground/50 mt-1">
                              {formatTime(n.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
