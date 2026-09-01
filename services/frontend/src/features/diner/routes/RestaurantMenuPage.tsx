import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDiscoveryListing } from "@/domain/discovery";
import { usePublicMenu, type PublicMenuItemDto } from "@/domain/publicMenu";

import { DinerHeader } from "../components/DinerHeader";
import { ItemModifierDialog, QuantityStepper } from "../components/ItemModifierDialog";
import { DinerCartSheet } from "../components/DinerCartSheet";
import { useDinerCart } from "../cart/DinerCartProvider";
import { cartCount, defaultSelections, lineKey, type DinerCartSelection } from "../cart/dinerCartTypes";
import { money } from "../money";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function RestaurantMenuPage() {
  const { restaurantId = "", locationId = "" } = useParams();
  const navigate = useNavigate();

  const { data: listing } = useDiscoveryListing(restaurantId, locationId);
  useDocumentTitle(`${listing?.restaurantName ?? "Menu"} · Spoontab`);
  const { data: menu, isPending, isError } = usePublicMenu(restaurantId, locationId);
  const { cart, add, replaceWith, setQuantity } = useDinerCart();

  const [modifierItem, setModifierItem] = useState<PublicMenuItemDto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [conflict, setConflict] = useState<Parameters<typeof replaceWith>[0] | null>(null);

  const count = cartCount(cart);

  const addOrPrompt = (args: Parameters<typeof add>[0]) => {
    if (add(args) === "conflict") {
      // Never silently discard a cart the diner built at another restaurant.
      setConflict(args);
      return;
    }
    toast.success(`${args.item.name} added to your order`);
  };

  const addSimple = (item: PublicMenuItemDto) =>
    addOrPrompt({
      restaurantId,
      locationId,
      restaurantName: listing?.restaurantName ?? "",
      item,
      selections: defaultSelections(item),
      quantity: 1,
    });

  const addConfigured = (selections: DinerCartSelection[], notes: string, quantity: number) => {
    if (!modifierItem) return;
    addOrPrompt({
      restaurantId,
      locationId,
      restaurantName: listing?.restaurantName ?? "",
      item: modifierItem,
      selections,
      notes,
      quantity,
    });
    setModifierItem(null);
  };

  /** Quantity of a *plainly added* line (no options, no note) for the inline stepper. */
  const plainLineFor = (item: PublicMenuItemDto) => {
    const key = lineKey(item.id, defaultSelections(item), "");
    return cart?.lines.find((l) => l.key === key);
  };

  return (
    <>
      <DinerHeader
        left={
          <Button variant="ghost" onClick={() => navigate("/order")} className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Restaurants
          </Button>
        }
        right={
          <Button
            variant={count > 0 ? "default" : "outline"}
            onClick={() => setCartOpen(true)}
            className="gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
            {count > 0 && <span className="font-numeric">{count}</span>}
          </Button>
        }
      />

      <main className="mx-auto max-w-[900px] px-4 sm:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{listing?.restaurantName ?? "Menu"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {listing?.cuisine && <Badge variant="secondary">{listing.cuisine}</Badge>}
            {listing?.estimatedPickupMinutes != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pickup ready in{" "}
                <span className="font-numeric">{listing.estimatedPickupMinutes} min</span>
              </span>
            )}
            {listing?.distanceMiles != null && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="font-numeric">{listing.distanceMiles} mi</span>
                {listing.address && <span>· {listing.address}</span>}
              </span>
            )}
          </div>
        </div>

        {isError ? (
          <p className="py-16 text-center text-muted-foreground">
            Couldn't load this menu. Please try again.
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : menu.categories.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            This restaurant isn't taking pickup orders right now.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {menu.categories.map((category) => (
              <section key={category.name}>
                <h2 className="text-[19px] font-semibold mb-2">{category.name}</h2>
                <div className="flex flex-col">
                  {category.items.map((item) => {
                    const hasModifiers = item.modifierGroups.length > 0;
                    const line = hasModifiers ? undefined : plainLineFor(item);

                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 border-t border-border py-3.5 first:border-t-0"
                      >
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold">{item.name}</h3>
                          {item.description && (
                            <p className="text-[13px] text-muted-foreground">{item.description}</p>
                          )}
                          <p className="font-numeric text-sm mt-0.5">{money(item.price)}</p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {hasModifiers ? (
                            <Button variant="outline" size="sm" onClick={() => setModifierItem(item)}>
                              Customize
                            </Button>
                          ) : line ? (
                            <QuantityStepper
                              value={line.quantity}
                              onChange={(q) => setQuantity(line.key, q)}
                              min={0}
                            />
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => addSimple(item)}>
                              Add
                            </Button>
                          )}
                          {hasModifiers && <ModifierCartCaption itemId={item.id} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <ItemModifierDialog
        item={modifierItem}
        open={modifierItem !== null}
        onOpenChange={(o) => !o && setModifierItem(null)}
        onAdd={addConfigured}
      />

      <DinerCartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => navigate("/order/checkout")}
      />

      <Dialog open={conflict !== null} onOpenChange={(o) => !o && setConflict(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Start a new order?</DialogTitle>
            <DialogDescription>
              Your cart has items from {cart?.restaurantName || "another restaurant"}. You can
              only order from one restaurant at a time, so adding this will clear it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflict(null)}>
              Keep my cart
            </Button>
            <Button
              onClick={() => {
                if (conflict) replaceWith(conflict);
                setConflict(null);
              }}
            >
              Clear and add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "N in cart" under a Customize button - a customizable item can be in the cart several
 *  times under different configurations, so this sums them rather than showing one line. */
function ModifierCartCaption({ itemId }: { itemId: string }) {
  const { cart } = useDinerCart();
  const total =
    cart?.lines.filter((l) => l.menuItemId === itemId).reduce((n, l) => n + l.quantity, 0) ?? 0;

  if (total === 0) return null;
  return <span className="text-[12px] text-muted-foreground">{total} in cart</span>;
}
