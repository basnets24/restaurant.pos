import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, UtensilsCrossed } from "lucide-react";

import { ENV } from "@/config/env";
import { http } from "@/lib/http";
import { MenuItemCard } from "@/features/pos/components/MenuItemCard"; // adjust path to your file
import { OrderSidebar } from "@/features/pos/components/OrderSideBar";  // adjust path to your file

// cart + orders clients from earlier
import {
  useCreateCart,
  useCart,
  useAddCartItem,
  useRemoveCartItem,
  useCheckoutCart,
} from "@/features/pos/cart";
import type { CartDto, CartItemDto } from "@/features/pos/cart";

type POSMenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
};

const CATALOG_BASE = ENV.CATALOG_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Small local catalog API helpers
// ─────────────────────────────────────────────────────────────────────────────
function useMenuCategories() {
  return useQuery({
    queryKey: ["menu", "categories"],
    queryFn: async () => {
      const { data } = await http.get<string[]>(
        `${CATALOG_BASE}/menu-items/categories`
      );
      // Add an All tab at the front
      return ["All", ...data.filter(Boolean)];
    },
    staleTime: 60_000,
  });
}

function useMenuItems(selectedCategory: string) {
  return useQuery({
    queryKey: ["menu", "items", selectedCategory || "All"],
    queryFn: async () => {
      const params =
        selectedCategory && selectedCategory !== "All"
          ? { category: selectedCategory }
          : undefined;
      const { data } = await http.get<POSMenuItem[]>(
        `${CATALOG_BASE}/menu-items`,
        { params }
      );
      return data;
    },
    staleTime: 15_000,
  });
}

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
  const { id: tableId = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { partySize?: number; cartId?: string } };

  // Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Selected category
  const [category, setCategory] = useState<string>("All");

  // Create or reuse a cart for this table
  const createdCartId = useRef<string | null>(location.state?.cartId ?? null);
  const createCart = useCreateCart();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!createdCartId.current) {
        const res = await createCart.mutateAsync({
          tableId,
          guestCount: location.state?.partySize ?? undefined,
        });
        if (!cancelled) createdCartId.current = res.id;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cartId = createdCartId.current!;
  const cartQuery = useCart(cartId, undefined); // tenant headers optional
  const cart = cartQuery.data;
  const qc = useQueryClient();

  const addItem = useAddCartItem(cartId);
  const removeItem = useRemoveCartItem(cartId);
  const checkout = useCheckoutCart(cartId);

  // Menu data
  const categories = useMenuCategories();
  const items = useMenuItems(category);

  // Add to cart from a card
  async function handleAddToOrder(item: POSMenuItem, quantity = 1, notes?: string) {
    if (!cartId) return;
    await addItem.mutateAsync({
      menuItemId: item.id,
      quantity,
      notes,
    });
    setSidebarOpen(true);
  }

  // Update item quantity from sidebar
  async function handleUpdateItem(menuItemId: string, newQty: number) {
    if (!cart) return;
    const curr = cart.items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0;
    if (newQty <= 0) {
      await removeItem.mutateAsync(menuItemId);
    } else if (curr === 0) {
      await addItem.mutateAsync({ menuItemId, quantity: newQty });
    } else {
      // simplest: remove then re-add with new quantity
      await removeItem.mutateAsync(menuItemId);
      await addItem.mutateAsync({ menuItemId, quantity: newQty });
    }
    await qc.invalidateQueries({ queryKey: ["cart", "by-id", cartId] });
  }

  async function handleRemoveItem(menuItemId: string) {
    await removeItem.mutateAsync(menuItemId);
    await qc.invalidateQueries({ queryKey: ["cart", "by-id", cartId] });
  }

  async function handleCheckout() {
    const res = await checkout.mutateAsync();
    // Navigate to order review/receipt page with orderId if you have it
    if (res?.orderId) {
      navigate(`/pos/table/${tableId}/order`, { state: { orderId: res.orderId } });
    }
  }

  // Sidebar expects a “table” object for header display
  const sidebarTable = useMemo(
    () => ({
      id: tableId,
      number: tableId,
      section: "Main Dining",
      partySize: location.state?.partySize,
    }),
    [tableId, location.state?.partySize]
  );

  const sidebarOrder = mapCartToSidebarOrder(cart);

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
                Table {tableId} • Select items to add to your order
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
              {(categories.data ?? ["All"]).map((c) => (
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
          {(items.data?.length ?? 0).toString()} items
        </Badge>
      </div>
      <Separator className="mb-4" />

      {/* Items Grid */}
      {items.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading menu…</div>
      ) : items.data && items.data.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.data.map((m) => (
            <MenuItemCard key={m.id} item={m as any} onAddToOrder={handleAddToOrder} />
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
    </div>
  );
}

