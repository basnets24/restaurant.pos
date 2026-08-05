import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DinerNotificationKeys,
  DinerNotifications,
  type DinerNotification,
} from "@/domain/dinerNotifications";

import { useDinerAuth } from "../auth/DinerAuthProvider";
import { rememberDinerTenant } from "../cart/lastTenant";

/**
 * The diner's notification bell.
 *
 * Polled rather than pushed. Staff notifications also arrive live over the SignalR floor hub,
 * but that hub broadcasts to a per-tenant group — a diner is in no tenant, and putting them in
 * one would hand them every other notification that restaurant's floor produces.
 */
export function DinerNotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useDinerAuth();

  const notifications = useQuery<DinerNotification[]>({
    queryKey: DinerNotificationKeys.list(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerNotifications.list(token);
    },
    enabled: isSignedIn,
    // Slower than the order-status poll: nothing here is being watched second by second, and
    // this one runs on every diner page rather than a single screen.
    refetchInterval: 30_000,
  });

  const items = notifications.data ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerNotifications.markRead(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DinerNotificationKeys.all }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerNotifications.markAllRead(token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DinerNotificationKeys.all }),
  });

  if (!isSignedIn) return null;

  /**
   * Same trap as the history list: the order page reads one order, and that read is
   * tenant-scoped against whichever restaurant the diner last ordered from. A notification is
   * very often about a different one, so the remembered tenant has to move first or the page
   * 404s on an order the diner was just told about.
   */
  const open = (n: DinerNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    rememberDinerTenant({ restaurantId: n.restaurantId, locationId: n.locationId });
    navigate(`/order/orders/${n.orderId}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground font-numeric">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[320px]">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="text-xs font-normal text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing yet. We'll tell you here when an order moves.
          </p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => open(n)}
                className="flex-col items-start gap-0.5 py-2.5"
              >
                <div className="flex w-full items-center gap-2">
                  {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className={n.readAt ? "text-sm" : "text-sm font-medium"}>{n.title}</span>
                </div>
                {n.message && (
                  <p className="text-[13px] leading-snug text-muted-foreground whitespace-normal">
                    {n.message}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {[n.restaurantName, when(n.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const when = (iso: string) => FORMAT.format(new Date(iso));
