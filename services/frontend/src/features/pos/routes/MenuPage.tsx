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
import { useMenuCategories as useDomainMenuCategories, useMenuList } from "@/domain/menu/hooks";
import type { MenuItemDto } from "@/domain/menu/types";
import { MenuItemCard } from "@/features/pos/components/MenuItemCard";
import { OrderSidebar, type SidebarOrder, type SidebarTable } from "@/features/pos/components/OrderSideBar";
import { CheckoutPaymentDialog } from "@/features/pos/components/CheckoutPaymentDialog";
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
  const [checkingOut, setCheckingOut] = useState(false);
  // Once checked out, the placed order id drives the inline payment dialog.
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Selected category + category rail / search state
  const [category, setCategory] = useState<string>("All");
  const [railOpen, setRailOpen] = useState(true);
  const [query, setQuery] = useState("");

  // Create or reuse a cart for this table
  const initialSession = store.getTableSession(tableId);
  const [cartId, setCartId] = useState<string | null>(
    location.state?.cartId ?? cartIdFromQuery ?? initialSession?.cartId ?? null
  );
  const createCart = useCreateCart();
  const linkOrder = useLinkOrder(tableId);
  const setTableStatus = useSetTableStatus(tableId);
  const unlinkOrder = useUnlinkOrder(tableId);

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
      if (!cartId) {
        // Resume the table's existing active cart if it already has a real one —
        // creating a second cart for an occupied table 409s server-side. Ignore
        // the empty-GUID placeholder (a stale/phantom link, not a usable cart).
        if (table?.activeCartId && table.activeCartId !== EMPTY_GUID) {
          setCartId(table.activeCartId);
          store.setTableSession(tableId, { cartId: table.activeCartId });
          return;
        }
        // Wait until the table has loaded before deciding to create, so we
        // don't race ahead and create a duplicate for an already-linked table.
        if (tableQuery.isLoading || table === undefined) return;
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
        } catch (e) { console.warn("MenuPage: failed to link cart to table", e); }
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
  }, [tableId, cartId, table?.activeCartId, tableQuery.isLoading]);

  const cartQuery = useCart(cartId ?? undefined); // enabled only when id exists
  const cart = cartQuery.data;
  const qc = useQueryClient();
  const hasNoItems = (cart?.items?.length ?? 0) === 0;

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
    await cartApi.removeCartItem(cartId, menuItemId);
    await qc.invalidateQueries({ queryKey: cartKeys.byId(cartId) });
  }

  // Checkout creates the order, then opens the inline payment dialog (Pay Now)
  // right here instead of routing out to the success/order pages to pay.
  async function handleCheckout() {
    if (!cartId) return;
    setCheckingOut(true);
    try {
      const res = await cartApi.checkoutCart(cartId);
      const orderId = res?.orderId as string | undefined;
      if (!orderId) {
        toast.error("Could not create order for checkout.");
        return;
      }
      setOrderPlaced(true);
      setPaymentOrderId(orderId);
    } finally {
      setCheckingOut(false);
    }
  }

  // Guest has paid and is done → free the table (mirrors OrderPage), then
  // return to the floor.
  async function releaseTableAfterPayment() {
    if (cartId) {
      try { await unlinkOrder.mutateAsync(cartId); } catch (e) { console.warn("MenuPage: failed to unlink order from table", e); }
    }
    try { await setTableStatus.mutateAsync({ status: "available" }); } catch (e) { console.warn("MenuPage: failed to mark table available", e); }
    store.clearTableSession(tableId);
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
    <div className="xl:pr-[25rem]"> {/* reserve space for fixed sidebar on xl+ */}
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
        onCheckout={handleCheckout}
        checkoutLoading={checkingOut}
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
            await releaseTableAfterPayment();
            toast.success("Payment confirmed!");
          }}
        />
      )}

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
                if (cartId) {
                  try { await unlinkOrder.mutateAsync(cartId); }
                  catch (e: unknown) { toast.error(errorMessage(e) || "Failed to unlink order"); }
                }
                try { await setTableStatus.mutateAsync({ status: "available" }); }
                catch (e: unknown) { toast.error(errorMessage(e) || "Failed to set table available"); }
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
