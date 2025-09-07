import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBlocker } from "react-router-dom";

import { useLinkOrder, useSetTableStatus, useTable, useUnlinkOrder } from "@/domain/tables/hooks";
import { useMenuCategories as useDomainMenuCategories, useMenuList } from "@/domain/menu/hooks";
import type { MenuItemDto } from "@/domain/menu/types";
import { MenuItemCard } from "@/features/pos/components/MenuItemCard"; 
import { OrderSidebar } from "@/features/pos/components/OrderSideBar";  
import {
  useCreateCart,
  useCart,
  cartApi,
  cartKeys,
} from "@/domain/cart";
import type { CartDto } from "@/domain/cart";
import { useStore } from "@/stores";

type POSMenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
};

// Map domain MenuItemDto → POS card type
const toPOS = (m: MenuItemDto): POSMenuItem => ({
  id: m.id,
  name: m.name,
  price: m.price,
  description: (m as any).description ?? undefined,
  category: (m as any).category ?? undefined,
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
  const location = useLocation() as { state?: { partySize?: number; cartId?: string } };
  const search = new URLSearchParams(location.search);
  const cartIdFromQuery = search.get("cartId") || undefined;
  const store = useStore();

  // Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Selected category
  const [category, setCategory] = useState<string>("All");

  // Create or reuse a cart for this table
  const initialSession = store.getTableSession(tableId);
  const [cartId, setCartId] = useState<string | null>(
    location.state?.cartId ?? cartIdFromQuery ?? initialSession?.cartId ?? null
  );
  const createCart = useCreateCart();
  const linkOrder = useLinkOrder(tableId);
  const setTableStatus = useSetTableStatus(tableId);
  const unlinkOrder = useUnlinkOrder(tableId);

  const linkedOnce = useRef(false);
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
      // Create cart if none
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
        } catch (e) {
          // surface error silently for now
          return;
        }
      }

      // We have a cart id: link to table and set party size (once)
      if (cartId && !linkedOnce.current) {
        try {
          await linkOrder.mutateAsync(cartId);
        } catch {}
        try {
          const guestCount = location.state?.partySize ?? initialSession?.guestCount ?? undefined;
          if (guestCount != null) {
            await setTableStatus.mutateAsync({ status: "occupied", partySize: guestCount });
            store.setTableSession(tableId, { guestCount });
          }
        } catch {}
        store.setTableSession(tableId, { cartId });
        linkedOnce.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, cartId]);

  const cartQuery = useCart(cartId ?? undefined); // enabled only when id exists
  const cart = cartQuery.data;
  const qc = useQueryClient();
  const hasNoItems = (cart?.items?.length ?? 0) === 0;

  // Menu data
  const categories = useDomainMenuCategories();
  const menuList = useMenuList({ category: category && category !== "All" ? category : undefined });

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
        try { await linkOrder.mutateAsync(res.id); } catch {}
        try {
          const guestCount = location.state?.partySize ?? initialSession?.guestCount ?? undefined;
          if (guestCount != null) await setTableStatus.mutateAsync({ status: "occupied", partySize: guestCount });
        } catch {}
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
    } catch {
      toast.error("Failed to add item");
    }
  }

  // Update item quantity from sidebar
  async function handleUpdateItem(menuItemId: string, newQty: number) {
    if (!cartId) return;
    const curr = cart?.items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0;
    if (newQty <= 0) {
      await cartApi.removeCartItem(cartId, menuItemId);
    } else if (curr === 0) {
      await cartApi.addCartItem(cartId, { menuItemId, quantity: newQty });
    } else {
      await cartApi.removeCartItem(cartId, menuItemId);
      await cartApi.addCartItem(cartId, { menuItemId, quantity: newQty });
    }
    await qc.invalidateQueries({ queryKey: cartKeys.byId(cartId) });
  }

  async function handleRemoveItem(menuItemId: string) {
    if (!cartId) return;
    await cartApi.removeCartItem(cartId, menuItemId);
    await qc.invalidateQueries({ queryKey: cartKeys.byId(cartId) });
  }

  async function handleCheckout() {
    if (!cartId) return;
    const res = await cartApi.checkoutCart(cartId);
    try { await unlinkOrder.mutateAsync(cartId); } catch {}
    try { await setTableStatus.mutateAsync({ status: "available" }); } catch {}
    store.clearTableSession(tableId);
    await qc.invalidateQueries({ queryKey: cartKeys.byId(cartId) });
    // Navigate to order review/receipt page with orderId if you have it
    if (res?.orderId) {
      navigate(`/pos/table/${tableId}/order`, { state: { orderId: res.orderId } });
    }
  }

  // Fetch table details for header/sidebar context
  const table = useTable(tableId).data;
  const sidebarTable = useMemo(
    () => ({
      id: tableId,
      number: table?.number ?? tableId,
      section: table?.section ?? undefined,
      partySize: location.state?.partySize,
    }),
    [tableId, table?.number, table?.section, location.state?.partySize]
  );

  const sidebarOrder = mapCartToSidebarOrder(cart);

  // Navigation Guard: ask to release table if linked but no items
  // Consider table linked if we have a cart id OR server indicates active cart OR table is occupied
  const isLinked = Boolean(cartId || (table?.activeCartId ?? null) || table?.status === "occupied");
  const shouldBlock = Boolean(isLinked && hasNoItems);
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
      setReleaseOpen(true);
    }
  }, [blocker.state, blocker.location?.pathname, tableId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 xl:pr-[25rem]"> {/* reserve space for fixed sidebar on xl+ */}
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Restaurant Menu</h1>
              <p className="text-sm text-muted-foreground">
                Table {table?.number ?? tableId}
                {table?.section ? ` • ${table.section}` : ""} • Select items to add to your order
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen((s) => !s)}
            className="hidden xl:inline-flex"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {sidebarOpen ? "Hide" : "Show"} Order
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Card className="mb-4 border-border">
        <CardContent className="p-3">
          <Tabs value={category} onValueChange={(v) => setCategory(v)}>
            <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
              {["All", ...((categories.data ?? []).filter(Boolean))].map((c) => (
                <TabsTrigger
                  key={c}
                  value={c}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Section title + count */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-medium">{category === "All" ? "All Items" : category}</h2>
        <Badge variant="outline" className="text-xs">
          {(Array.isArray(menuList.data) ? menuList.data.length : (menuList.data as any)?.items?.length ?? 0).toString()} items
        </Badge>
      </div>
      <Separator className="mb-4" />

      {/* Items Grid */}
      {menuList.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading menu…</div>
      ) : Array.isArray(menuList.data) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 lg:gap-8">
          {(menuList.data as MenuItemDto[]).map((m) => (
            <MenuItemCard key={m.id} item={toPOS(m) as any} onAddToOrder={handleAddToOrder} />
          ))}
        </div>
      ) : (menuList.data as any)?.items?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 lg:gap-8">
          {((menuList.data as any).items as MenuItemDto[]).map((m) => (
            <MenuItemCard key={m.id} item={toPOS(m) as any} onAddToOrder={handleAddToOrder} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No items in this category</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Try a different category or clear filters.
          </CardContent>
        </Card>
      )}

      {/* Fixed Sidebar (desktop) / Sheet (mobile) */}
      <OrderSidebar
        order={sidebarOrder as any}
        table={sidebarTable as any}
        isOpen={sidebarOpen}
        isMobile={false}
        onClose={() => setSidebarOpen(false)}
        onUpdateItem={handleUpdateItem}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* Release confirmation dialog when navigating away with empty order */}
      <Dialog open={releaseOpen} onOpenChange={(o) => { if (!o) { blockerRef.current?.reset(); } setReleaseOpen(o); }}>
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
                blockerRef.current?.reset();
                setReleaseOpen(false);
              }}
            >
              Stay
            </Button>
            <Button
              onClick={async () => {
                if (cartId) {
                  try { await unlinkOrder.mutateAsync(cartId); } catch {}
                }
                try { await setTableStatus.mutateAsync({ status: "available" }); } catch {}
                store.clearTableSession(tableId);
                toast.success("Table released");
                const b = blockerRef.current;
                setReleaseOpen(false);
                // Proceed with the originally requested navigation
                b?.proceed();
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
