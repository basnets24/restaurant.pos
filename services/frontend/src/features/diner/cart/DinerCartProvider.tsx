import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PublicMenuItemDto } from "@/domain/publicMenu";
import {
  lineKey,
  optionsLabel,
  unitPriceFor,
  type DinerCart,
  type DinerCartLine,
  type DinerCartSelection,
} from "./dinerCartTypes";

const STORAGE_KEY = "spoontab.diner.cart";

interface AddArgs {
  restaurantId: string;
  locationId: string;
  restaurantName: string;
  item: PublicMenuItemDto;
  selections: DinerCartSelection[];
  notes?: string;
  quantity: number;
}

interface DinerCartContextValue {
  cart: DinerCart | null;
  /** Adds to the cart. Returns "conflict" without changing anything if the cart already
   *  holds another restaurant's items - the caller must confirm and call replaceWith. */
  add: (args: AddArgs) => "added" | "conflict";
  replaceWith: (args: AddArgs) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const DinerCartContext = createContext<DinerCartContextValue | null>(null);

function load(): DinerCart | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cart = JSON.parse(raw) as DinerCart;
    // Carts saved before cartId existed would otherwise check out as `undefined` and lose
    // their idempotency guarantee.
    return cart.cartId ? cart : { ...cart, cartId: crypto.randomUUID() };
  } catch {
    // A corrupt or half-written cart should cost the diner their cart, not the whole page.
    return null;
  }
}

/**
 * Holds the diner's in-progress order, client-side only until checkout.
 *
 * A cart belongs to exactly one restaurant *and* location, which falls out of the backend
 * anyway (Cart carries RestaurantId/LocationId), but is enforced here too so the diner is
 * asked before losing a cart rather than having it silently swapped.
 */
export function DinerCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<DinerCart | null>(() => load());

  useEffect(() => {
    try {
      if (cart && cart.lines.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing or a full quota - the cart still works for this session.
    }
  }, [cart]);

  const buildLine = (args: AddArgs): DinerCartLine => ({
    key: lineKey(args.item.id, args.selections, args.notes),
    menuItemId: args.item.id,
    name: args.item.name,
    basePrice: args.item.price,
    unitPrice: unitPriceFor(args.item.price, args.selections),
    quantity: args.quantity,
    notes: args.notes?.trim() || undefined,
    selections: args.selections,
    optionsLabel: optionsLabel(args.selections, args.notes),
  });

  const mergeInto = (existing: DinerCart | null, args: AddArgs): DinerCart => {
    const line = buildLine(args);
    const base: DinerCart = existing ?? {
      cartId: crypto.randomUUID(),
      restaurantId: args.restaurantId,
      locationId: args.locationId,
      restaurantName: args.restaurantName,
      lines: [],
    };

    const at = base.lines.findIndex((l) => l.key === line.key);
    const lines =
      at >= 0
        ? base.lines.map((l, i) => (i === at ? { ...l, quantity: l.quantity + line.quantity } : l))
        : [...base.lines, line];

    return { ...base, lines };
  };

  const isOtherRestaurant = (c: DinerCart | null, restaurantId: string, locationId: string) =>
    c !== null &&
    c.lines.length > 0 &&
    (c.restaurantId !== restaurantId || c.locationId !== locationId);

  const add = useCallback<DinerCartContextValue["add"]>(
    (args) => {
      // The conflict check reads `cart` from this render, NOT from inside the setCart
      // updater. Setting a flag inside the updater and returning it looks equivalent but
      // isn't: React may run the updater after this function has already returned (and
      // runs it twice under StrictMode), so the caller reliably saw a stale "added" and
      // the confirmation dialog never opened.
      if (isOtherRestaurant(cart, args.restaurantId, args.locationId)) return "conflict";
      setCart((current) => mergeInto(current, args));
      return "added";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart]
  );

  const replaceWith = useCallback<DinerCartContextValue["replaceWith"]>((args) => {
    setCart(
      mergeInto(
        {
          // A new cart, so a new id: reusing the old one would collide with the order the
          // previous restaurant's cart may already have placed.
          cartId: crypto.randomUUID(),
          restaurantId: args.restaurantId,
          locationId: args.locationId,
          restaurantName: args.restaurantName,
          lines: [],
        },
        args
      )
    );
  }, []);

  const setQuantity = useCallback<DinerCartContextValue["setQuantity"]>((key, quantity) => {
    setCart((current) => {
      if (!current) return current;
      const lines =
        quantity <= 0
          ? current.lines.filter((l) => l.key !== key)
          : current.lines.map((l) => (l.key === key ? { ...l, quantity } : l));
      return lines.length > 0 ? { ...current, lines } : null;
    });
  }, []);

  const remove = useCallback<DinerCartContextValue["remove"]>(
    (key) => setQuantity(key, 0),
    [setQuantity]
  );

  const clear = useCallback(() => setCart(null), []);

  const value = useMemo(
    () => ({ cart, add, replaceWith, setQuantity, remove, clear }),
    [cart, add, replaceWith, setQuantity, remove, clear]
  );

  return <DinerCartContext.Provider value={value}>{children}</DinerCartContext.Provider>;
}

export function useDinerCart(): DinerCartContextValue {
  const ctx = useContext(DinerCartContext);
  if (!ctx) throw new Error("useDinerCart must be used inside a DinerCartProvider");
  return ctx;
}
