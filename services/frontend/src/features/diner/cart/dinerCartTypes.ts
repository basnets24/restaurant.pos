import type { PublicMenuItemDto, PublicModifierGroupDto, PublicModifierOptionDto } from "@/domain/publicMenu";
import type { DinerCheckoutRequest } from "@/domain/dinerOrders";

export interface DinerCartSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface DinerCartLine {
  /** Identity of a line: same item + same options + same note merge; anything else is a
   *  separate line. See {@link lineKey}. */
  key: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  /** basePrice plus the selected deltas. Quantity is applied on top of this. */
  unitPrice: number;
  quantity: number;
  notes?: string;
  selections: DinerCartSelection[];
  /** "Double patty, Smoked bacon · Note: no onions" - precomputed for display. */
  optionsLabel: string;
}

export interface DinerCart {
  /** Stable for the life of this cart, including across edits, and sent as the checkout's
   *  idempotency key - a double-tapped Place Order returns the same order rather than firing
   *  the kitchen twice. Regenerated only when the cart is cleared or switches restaurant. */
  cartId: string;
  restaurantId: string;
  locationId: string;
  restaurantName: string;
  lines: DinerCartLine[];
}

export function toCheckoutRequest(cart: DinerCart, pickupTime?: string | null): DinerCheckoutRequest {
  return {
    cartId: cart.cartId,
    pickupTime: pickupTime ?? null,
    items: cart.lines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      notes: line.notes,
      // Ids only - the server resolves the names and prices. Sending our own prices would let
      // anyone with devtools set their own.
      optionIds: line.selections.map((s) => s.optionId),
    })),
  };
}

/**
 * Two adds merge into one line only if they are genuinely the same order: same item, same
 * set of options, same note. Option ids are sorted so selection order can't split a line.
 */
export function lineKey(
  menuItemId: string,
  selections: DinerCartSelection[],
  notes?: string
): string {
  const options = selections.map((s) => s.optionId).sort().join(",");
  return `${menuItemId}|${options}|${(notes ?? "").trim()}`;
}

export function optionsLabel(selections: DinerCartSelection[], notes?: string): string {
  const parts = selections.map((s) => s.optionName);
  const note = (notes ?? "").trim();
  if (note) parts.push(`Note: ${note}`);
  return parts.join(" · ");
}

export function unitPriceFor(basePrice: number, selections: DinerCartSelection[]): number {
  return selections.reduce((sum, s) => sum + s.priceDelta, basePrice);
}

/** Options a group opens with. Only Single groups carry a default through; a Multi group
 *  starting pre-ticked would silently add cost the diner never chose. */
export function defaultSelections(item: PublicMenuItemDto): DinerCartSelection[] {
  return item.modifierGroups.flatMap((group) =>
    group.selectionType === "Single"
      ? toSelections(group, group.options.filter((o) => o.isDefault).slice(0, 1))
      : []
  );
}

export function toSelections(
  group: PublicModifierGroupDto,
  options: PublicModifierOptionDto[]
): DinerCartSelection[] {
  return options.map((option) => ({
    groupId: group.id,
    groupName: group.name,
    optionId: option.id,
    optionName: option.name,
    priceDelta: option.priceDelta,
  }));
}

export const cartCount = (cart: DinerCart | null): number =>
  cart?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;

export const cartSubtotal = (cart: DinerCart | null): number =>
  cart?.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) ?? 0;
