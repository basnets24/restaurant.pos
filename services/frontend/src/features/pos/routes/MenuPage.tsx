import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, type Location } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, UtensilsCrossed, Search, LayoutGrid,
  PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import { AppetizerIcon, MainIcon, SideIcon, DessertIcon, DrinksIcon, KidsIcon, SpecialIcon } from "@/components/brand-icons/food-icons";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBlocker } from "react-router-dom";

import { useLinkOrder, useSetTableStatus, useTable, useUnlinkOrder } from "@/domain/tables/hooks";
import { useOrder, useCancelOrder } from "@/domain/orders/hooks";
import { useMenuCategories as useDomainMenuCategories, useMenuList } from "@/domain/menu/hooks";
import type { MenuItemDto } from "@/domain/menu/types";
import { MenuItemCard } from "@/features/pos/components/MenuItemCard";
import { OrderSidebar, type SidebarOrder, type SidebarTable } from "@/features/pos/components/OrderSideBar";
import { CheckoutPaymentDialog } from "@/features/pos/components/CheckoutPaymentDialog";
import { useKitchen } from "@/features/pos/kitchen/kitchenStore";
import {
  useCreateCart,
  useCart,
  cartApi,
  cartKeys,
} from "@/domain/cart";
import type { CartDto } from "@/domain/cart";
import { useStore } from "@/stores";
import { errorMessage, errorStatus, isAxiosError } from "@/lib/apiErrors";
import type { MenuItem as POSMenuItem } from "@/types/pos";

// Category → icon (design's MenuScreen rail); falls back to a generic glyph.
// The food-category glyphs are illustrated brand icons — Appetizer/Main/Side/
// Dessert/Drinks from the design handoff (design_handoff_brand_icons),
// Kids/Special designed to match; "All" and unmatched categories keep plain
// Lucide glyphs.
type CategoryIcon = React.ComponentType<{ className?: string }>;
const CAT_ICON: Record<string, CategoryIcon> = {
  all: LayoutGrid,
  appetizers: AppetizerIcon, appetizer: AppetizerIcon, starters: AppetizerIcon, starter: AppetizerIcon,
  mains: MainIcon, main: MainIcon, entrees: MainIcon, entree: MainIcon, "main course": MainIcon,
  sides: SideIcon, side: SideIcon,
  desserts: DessertIcon, dessert: DessertIcon, sweets: DessertIcon,
  drinks: DrinksIcon, drink: DrinksIcon, beverages: DrinksIcon, beverage: DrinksIcon,
  kids: KidsIcon, kid: KidsIcon, "kids menu": KidsIcon, children: KidsIcon,
  special: SpecialIcon, specials: SpecialIcon, "chef's special": SpecialIcon, "chef special": SpecialIcon, featured: SpecialIcon,
};
const iconFor = (c: string): CategoryIcon => CAT_ICON[c.trim().toLowerCase()] ?? UtensilsCrossed;

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

// Map domain MenuItemDto → POS card type
const toPOS = (m: MenuItemDto): POSMenuItem => ({
  id: m.id,
  name: m.name,
  price: m.price,
  description: m.description,
  category: m.category,
  isAvailable: m.isAvailable,
});

// ─────────────────────────────────────────────────────────────────────────────
// Mapping: Cart → “POSOrder” shape that OrderSidebar expects
// (id, items[{ id, menuItem:{ name, price }, quantity, notes }], createdAt)
// ─────────────────────────────────────────────────────────────────────────────
function mapCartToSidebarOrder(cart: CartDto | undefined) {
  if (!cart) return null;
  return {
    id: cart.id,
    createdAt: new Date(cart.createdAt),
    items: cart.items.map((it) => ({
      id: it.menuItemId,
      quantity: it.quantity,
      notes: it.notes,
      menuItem: {
        id: it.menuItemId,
        name: it.menuItemName,
        price: it.unitPrice,
      },
    })),
    estimate: cart.estimate && {
      subtotal: cart.estimate.subtotal,
      discountTotal: cart.estimate.discountTotal,
      serviceChargeTotal: cart.estimate.serviceChargeTotal,
      taxTotal: cart.estimate.taxTotal,
      grandTotal: cart.estimate.grandTotal,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const { tableId = "" } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: { partySize?: number; cartId?: string } };
  const search = new URLSearchParams(location.search);
  const cartIdFromQuery = search.get("cartId") || undefined;
  const store = useStore();

  // Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [firing, setFiring] = useState(false);
  // Once checked out, the placed order id drives the inline payment dialog.
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const kitchen = useKitchen();

  // Selected category + category rail / search state
  const [category, setCategory] = useState<string>("All");
  const [railOpen, setRailOpen] = useState(true);
  const [query, setQuery] = useState("");

  // Create or reuse a cart for this table
  const initialSession = store.getTableSession(tableId);
  const [cartId, setCartId] = useState<string | null>(
    location.state?.cartId ?? cartIdFromQuery ?? initialSession?.cartId ?? null
  );
  // Once fired, the backend order is a snapshot of the cart at that moment —
  // further cart edits wouldn't reach it, so they're blocked below.
  const isFired = kitchen.isFired(cartId);
  const createCart = useCreateCart();
  const linkOrder = useLinkOrder(tableId);
  const setTableStatus = useSetTableStatus(tableId);
  const unlinkOrder = useUnlinkOrder(tableId);
  // Order.Id === cartId (see FinalOrderService.FinalizeOrderAsync's idempotency
  // key) — once fired, this is the same order OrderPage/OrdersPage show.
  const orderQuery = useOrder(isFired ? cartId ?? undefined : undefined);
  const cancelOrder = useCancelOrder();
  const isCancellable = isFired && orderQuery.data?.status === "Pending";

  // Table details (also tells us whether the table already has an active cart)
  const tableQuery = useTable(tableId);
  const table = tableQuery.data;

  // Seat Party (TablesPage) already opened+linked the cart and set status
  // atomically server-side when it navigated here with a cartId - nothing
  // left for this page to link.
  const linkedOnce = useRef(location.state?.cartId != null);
  // Seed guest count to store if passed via navigation state
  useEffect(() => {
    if (location.state?.partySize != null) {
      store.setTableSession(tableId, { guestCount: location.state.partySize });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Ensure we have a cart; then link table->cart and set party size
  useEffect(() => {
    (async () => {
      // Wait until the table has loaded before doing anything below - both so
      // we don't race ahead and create a duplicate cart for an already-linked
      // table, and so the server-truth reconciliation right below actually has
      // something to reconcile against before any link/create call fires.
      if (tableQuery.isLoading || table === undefined) return;

      const serverCartId =
        table?.activeCartId && table.activeCartId !== EMPTY_GUID ? table.activeCartId : null;

      // Server truth wins over whatever cartId we started with (nav state, a
      // ?cartId query param, or a cached session value) - a locally cached
      // cartId can go stale if the table's real active cart changed via
      // another path since (e.g. a stale session from an earlier visit to
      // this table), and blindly trusting it used to silently orphan fired,
      // unpaid orders by relinking the table to the wrong cart. The table
      // already being linked to serverCartId means it's already occupied and
      // linked server-side, so there's nothing left to link/assert here.
      if (serverCartId && serverCartId !== cartId) {
        setCartId(serverCartId);
        store.setTableSession(tableId, { cartId: serverCartId });
        linkedOnce.current = true;
        return;
      }

      if (!cartId) {
        try {
          const res = await createCart.mutateAsync({
            tableId,
            guestCount: location.state?.partySize ?? initialSession?.guestCount ?? undefined,
          });
          setCartId(res.id);
          store.setTableSession(tableId, {
            cartId: res.id,
            guestCount: location.state?.partySize ?? initialSession?.guestCount ?? null,
          });
          // Proceed to link and set status below on next pass when cartId is set
          return;
        } catch (e: unknown) {
          // 409 = table already marked in-use with a cart we can't resolve
          // (e.g. a stale phantom link). Don't silently dead-end — tell the user.
          if (errorStatus(e) === 409) {
            toast.error("This table already has an open order that couldn't be loaded. Clear the table to start a new one.");
          }
          return;
        }
      }

      // We have a cart id but haven't linked it yet (e.g. resuming an existing
      // cart, or the fallback create-path above). Claim the guard synchronously,
      // before any await, so two overlapping invocations of this effect (React
      // StrictMode's dev-mode double-invoke) can't both pass the check and fire
      // these mutations twice.
      if (cartId && !linkedOnce.current) {
        linkedOnce.current = true;
        try {
          await linkOrder.mutateAsync(cartId);
        } catch (e: unknown) {
          // The server now refuses to relink over a different table that
          // already has a live, unpaid order - a failure here means our local
          // cartId doesn't match reality, so stop rather than keep showing it
          // as if it were the table's current order.
          toast.error(errorMessage(e) || "Could not open this table's order.");
          console.warn("MenuPage: failed to link cart to table", e);
          return;
        }
        try {
          const guestCount = location.state?.partySize ?? initialSession?.guestCount ?? undefined;
          if (guestCount != null) {
            // Seat Party (TablesPage) may have already set this exact status/party
            // size before navigating here - skip the redundant write when so.
            const alreadyOccupied = table?.status === "occupied" && table?.partySize === guestCount;
            if (!alreadyOccupied) {
              await setTableStatus.mutateAsync({ status: "occupied", partySize: guestCount });
            }
            store.setTableSession(tableId, { guestCount });
          }
        } catch (e) { console.warn("MenuPage: failed to mark table occupied", e); }
        store.setTableSession(tableId, { cartId });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, cartId, table, tableQuery.isLoading]);

  const cartQuery = useCart(cartId ?? undefined); // enabled only when id exists
  const cart = cartQuery.data;
  const qc = useQueryClient();
  // Gate on isSuccess, not just cart?.items - right after this page (re)mounts
  // the cart query is still loading, so cart is undefined and this would
  // otherwise read as "no items" for a moment even on a table with a real
  // fired order, wrongly arming the "release this empty table?" prompt below.
  const hasNoItems = cartQuery.isSuccess && (cart?.items?.length ?? 0) === 0;

  // Menu data
  const categories = useDomainMenuCategories();
  const menuList = useMenuList({ category: category && category !== "All" ? category : undefined });
  const items = (menuList.data?.items ?? []) as MenuItemDto[];
  const cats = useMemo(
    () => ["All", ...(((categories.data ?? []).filter(Boolean)) as string[])],
    [categories.data],
  );
  const shown = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query],
  );

  // Add to cart from a card
  async function handleAddToOrder(item: POSMenuItem, quantity = 1, notes?: string) {
    if (isFired) {
      toast.error("Order already fired to kitchen: further changes won't be included");
      return;
    }
    // ensure we have a cart first
    let id = cartId;
    if (!id) {
      try {
        const res = await createCart.mutateAsync({ tableId, guestCount: location.state?.partySize ?? initialSession?.guestCount ?? undefined });
        id = res.id;
        setCartId(res.id);
        store.setTableSession(tableId, { cartId: res.id, guestCount: location.state?.partySize ?? initialSession?.guestCount ?? null });
        try { await linkOrder.mutateAsync(res.id); } catch (e) { console.warn("MenuPage: failed to link cart to table", e); }
        try {
          const guestCount = location.state?.partySize ?? initialSession?.guestCount ?? undefined;
          const alreadyOccupied = table?.status === "occupied" && table?.partySize === guestCount;
          if (guestCount != null && !alreadyOccupied) await setTableStatus.mutateAsync({ status: "occupied", partySize: guestCount });
        } catch (e) { console.warn("MenuPage: failed to mark table occupied", e); }
      } catch {
        toast.error("Could not start an order");
        return;
      }
    }
    try {
      await cartApi.addCartItem(id!, { menuItemId: item.id, quantity, notes });
      await qc.invalidateQueries({ queryKey: cartKeys.byId(id!) });
      setSidebarOpen(true);
      toast.success(`Added ${quantity}× ${item.name}`);
    } catch (e: unknown) {
      const detail = isAxiosError<{ detail?: string }>(e) ? e.response?.data?.detail : undefined;
      toast.error(detail || "Failed to add item");
    }
  }

  // Update item quantity from sidebar
  async function handleUpdateItem(menuItemId: string, newQty: number) {
    if (!cartId) return;
    if (isFired) {
      toast.error("Order already fired to kitchen: further changes won't be included");
      return;
    }
    const curr = cart?.items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0;
    try {
      if (newQty <= 0) {
        await cartApi.removeCartItem(cartId, menuItemId);
      } else if (curr === 0) {
        await cartApi.addCartItem(cartId, { menuItemId, quantity: newQty });
      } else {
        await cartApi.removeCartItem(cartId, menuItemId);
        await cartApi.addCartItem(cartId, { menuItemId, quantity: newQty });
      }
    } catch (e: unknown) {
      const detail = isAxiosError<{ detail?: string }>(e) ? e.response?.data?.detail : undefined;
      toast.error(detail || "Failed to update item");
    } finally {
      await qc.invalidateQueries({ queryKey: cartKeys.byId(cartId) });
    }
  }

  async function handleRemoveItem(menuItemId: string) {
    if (!cartId) return;
    if (isFired) {
      toast.error("Order already fired to kitchen: further changes won't be included");
      return;
    }
    await cartApi.removeCartItem(cartId, menuItemId);
    await qc.invalidateQueries({ queryKey: cartKeys.byId(cartId) });
  }

  // Fire to Kitchen commits the cart into a real order — this is what actually
  // reserves inventory (POST /carts/{id}/checkout -> OrderSubmitted -> saga).
  // Payment happens later, as a separate step (handlePay below), once the
  // guest is ready to leave — not bundled into this click.
  async function handleFireToKitchen() {
    if (!cartId || !cart) return;
    setFiring(true);
    try {
      const res = await cartApi.checkoutCart(cartId);
      const orderId = res?.orderId as string | undefined;
      if (!orderId) {
        toast.error("Could not fire order to kitchen.");
        return;
      }
      kitchen.fire({
        id: orderId,
        tableId: tableId,
        tableNumber: String(table?.number ?? ""),
        items: cart.items.map((i) => ({ name: i.menuItemName, quantity: i.quantity })),
        firedAt: Date.now(),
      });
      setOrderPlaced(true);
      toast.success("Fired to kitchen");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not fire order to kitchen.");
    } finally {
      setFiring(false);
    }
  }

  // Pay is only reachable once fired — the order already exists (id === cartId,
  // see FinalOrderService.FinalizeOrderAsync's idempotencyKey), so this just
  // opens the inline payment dialog instead of hitting checkout again.
  function handlePay() {
    if (!cartId || !isFired) return;
    setPaymentOrderId(cartId);
  }

  // Guest has paid (or the order was voided) and is done with this table →
  // free it and clear the cached cart session so the next visit starts fresh.
  async function releaseTable() {
    if (cartId) {
      try { await unlinkOrder.mutateAsync(cartId); } catch (e) { console.warn("MenuPage: failed to unlink order from table", e); }
    }
    try { await setTableStatus.mutateAsync({ status: "available" }); } catch (e) { console.warn("MenuPage: failed to mark table available", e); }
    store.clearTableSession(tableId);
  }

  // Void a fired-but-unpaid order (backend endpoint/hook is still named
  // "cancel" — "void" is just the staff-facing term). The backend releases
  // any reserved inventory; the local kitchen ticket is voided (not removed)
  // so it drops out of "fired"/isFired but stays in history. The cart used
  // for this order is idempotency-bound to it server-side
  // (FinalizeOrderAsync), so it can't be re-fired — free the table so staff
  // start a new cart if needed.
  async function handleCancelOrder() {
    if (!cartId) return;
    setCancelling(true);
    try {
      await cancelOrder.mutateAsync(cartId);
      kitchen.void(cartId);
      await releaseTable();
      toast.success("Order voided.");
      setCancelDialogOpen(false);
      navigate("/pos/tables");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not cancel order.");
    } finally {
      setCancelling(false);
    }
  }

  // (table fetched above, near cart init)
  const sidebarTable: SidebarTable = useMemo(
    () => ({
      id: tableId,
      number: table?.number ?? tableId,
      section: table?.section ?? undefined,
      partySize: location.state?.partySize,
    }),
    [tableId, table?.number, table?.section, location.state?.partySize]
  );

  const sidebarOrder: SidebarOrder | null = mapCartToSidebarOrder(cart);

  // Navigation Guard: ask to release table if linked but no items
  // Consider table linked if we have a cart id OR server indicates active cart OR table is occupied
  const isLinked = Boolean(cartId || (table?.activeCartId ?? null) || table?.status === "occupied");
  // Once the order is placed we're heading into payment — don't nag about
  // releasing the table for having an "empty" cart.
  const shouldBlock = Boolean(isLinked && hasNoItems && !orderPlaced);
  const blocker = useBlocker(shouldBlock);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const blockerRef = useRef<typeof blocker | null>(null);

  useEffect(() => {
    if (blocker.state === "blocked") {
      const nextPath = blocker.location?.pathname ?? "";
      const base = `/pos/table/${tableId}`;
      const insideSameTable = nextPath === base || nextPath.startsWith(base + "/");
      if (insideSameTable) {
        blocker.proceed();
        return;
      }
      blockerRef.current = blocker;
      // Reacting to react-router's navigation blocker (an external system).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReleaseOpen(true);
    }
  }, [blocker.state, blocker.location?.pathname, tableId]);

  return (
    <div className="pr-[19rem] sm:pr-[19.5rem] lg:pr-[21.5rem] xl:pr-[25rem]"> {/* reserve space for fixed sidebar at every breakpoint it renders at (widths match OrderSidebar's own w-72/lg:w-80/xl:w-96 + right offset) */}
      <div className="flex min-h-[calc(100dvh-3.5rem)]">
        {/* Category icon rail (sm+) */}
        <aside
          className="hidden sm:flex flex-col gap-1 shrink-0 border-r border-border px-2 py-4 sticky top-14 self-start h-[calc(100dvh-3.5rem)] transition-[width] duration-150"
          style={{ width: railOpen ? 176 : 64 }}
        >
          {cats.map((c) => {
            const Ico = iconFor(c);
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                title={c}
                className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-sm font-semibold transition-colors ${
                  railOpen ? "justify-start" : "justify-center"
                } ${active ? "bg-brand-soft text-brand-strong" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <Ico className="h-7 w-7 shrink-0" />
                {railOpen && <span className="truncate">{c}</span>}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={() => setRailOpen((o) => !o)}
            title={railOpen ? "Collapse" : "Expand"}
            className="flex items-center justify-center rounded-[10px] px-2.5 py-2.5 text-muted-foreground hover:bg-secondary"
          >
            {railOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
        </aside>

        {/* Center: context + search + grid */}
        <div className="flex-1 min-w-0 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{category === "All" ? "Menu" : category}</h1>
              <p className="text-sm text-muted-foreground">
                {shown.length} item{shown.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search menu items…"
                className="w-full rounded-md border border-border bg-input-background pl-10 pr-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Mobile category chips */}
          <div className="sm:hidden -mx-4 px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-colors ${
                  c === category
                    ? "bg-brand-soft text-brand-strong border-brand"
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Items grid */}
          {menuList.isLoading ? (
            <div className="text-sm text-muted-foreground py-10">Loading menu…</div>
          ) : shown.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 lg:gap-6">
              {shown.map((m) => (
                <MenuItemCard key={m.id} item={toPOS(m)} onAddToOrder={handleAddToOrder} />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No items found</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {query ? "Try a different search term." : "Try a different category."}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Fixed Sidebar (desktop) / Sheet (mobile) */}
      <OrderSidebar
        order={sidebarOrder}
        table={sidebarTable}
        isOpen={sidebarOpen}
        isMobile={false}
        onClose={() => setSidebarOpen(false)}
        onUpdateItem={handleUpdateItem}
        onRemoveItem={handleRemoveItem}
        onFire={handleFireToKitchen}
        onPay={handlePay}
        firing={firing}
        onCancel={() => setCancelDialogOpen(true)}
        isCancellable={isCancellable}
      />

      {/* Floating order button to reopen sidebar when hidden */}
      {!sidebarOpen && (cart?.items?.length ?? 0) > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50">
          <Button
            onClick={() => setSidebarOpen(true)}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg"
            size="lg"
            variant="default"
          >
            <div className="flex flex-col items-center relative">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              {(cart?.items?.length ?? 0) > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs bg-destructive"
                >
                  {(cart?.items?.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 0)}
                </Badge>
              )}
            </div>
          </Button>
        </div>
      )}

      {/* Inline checkout → Pay Now dialog (created order pays here, no routing) */}
      {paymentOrderId && (
        <CheckoutPaymentDialog
          open
          orderId={paymentOrderId}
          onOpenChange={(o) => {
            // Dismissing the dialog (Back to Tables, X, or before paying)
            // leaves the menu screen. An unpaid placed order stays payable
            // later from Orders; a paid one already released the table below.
            if (!o) {
              setPaymentOrderId(null);
              navigate("/pos/tables");
            }
          }}
          onPaid={async () => {
            // Payment confirmed — release the table; the dialog stays open on
            // its success card until the user dismisses it.
            await releaseTable();
            toast.success("Payment confirmed!");
          }}
        />
      )}

      {/* Void confirmation dialog for a fired-but-unpaid order */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this order?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This releases any reserved inventory back to stock and frees the table. This cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={() => { void handleCancelOrder(); }} disabled={cancelling}>
              {cancelling ? "Voiding…" : "Void Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release confirmation dialog when navigating away with empty order */}
      <Dialog open={releaseOpen} onOpenChange={(o) => { if (!o) { blockerRef.current?.reset?.(); } setReleaseOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release this table?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            No items were added. Do you want to release the table and make it available?
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                blockerRef.current?.reset?.();
                setReleaseOpen(false);
              }}
            >
              Stay
            </Button>
            <Button
              onClick={async () => {
                // Both calls are now server-guarded against releasing a table
                // that still has a live, unpaid order (DiningTableService) - if
                // either is refused, stop here rather than pretending it
                // worked: clearing the local session and navigating away would
                // desync the app from a table the server correctly kept intact.
                try {
                  if (cartId) await unlinkOrder.mutateAsync(cartId);
                  await setTableStatus.mutateAsync({ status: "available" });
                } catch (e: unknown) {
                  toast.error(errorMessage(e) || "Could not release the table.");
                  return;
                }
                store.clearTableSession(tableId);
                toast.success("Table released");
                const b = blockerRef.current;
                setReleaseOpen(false);
                // Proceed with the originally requested navigation
                b?.proceed?.();
              }}
            >
              Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
