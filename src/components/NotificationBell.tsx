import { useState } from "react";
import { Bell, Check, CheckCheck, Shield, BookOpen, ShoppingBag, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useUnreadCount } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const typeIcon: Record<string, React.ReactNode> = {
  admin_promotion: <Shield className="h-4 w-4 text-primary" />,
  book_approved:   <BookOpen className="h-4 w-4 text-chart-2" />,
  book_rejected:   <XCircle className="h-4 w-4 text-destructive" />,
  book_purchased:  <ShoppingBag className="h-4 w-4 text-primary" />,
};

const defaultIcon = <Bell className="h-4 w-4 text-muted-foreground" />;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const unreadCount = useUnreadCount();

  const handleOpen = (val: boolean) => {
    setOpen(val);
  };

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleMarkAll = () => {
    markAllAsRead.mutate();
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-lg" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors cursor-default",
                    !n.is_read ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/30"
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {typeIcon[n.type] ?? defaultIcon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-tight", !n.is_read ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatTime(n.created_at)}
                    </p>
                  </div>

                  {/* Mark read button */}
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
