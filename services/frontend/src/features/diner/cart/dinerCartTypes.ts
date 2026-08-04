import type { PublicMenuItemDto, PublicModifierGroupDto, PublicModifierOptionDto } from "@/domain/publicMenu";

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
  restaurantId: string;
  locationId: string;
  restaurantName: string;
  lines: DinerCartLine[];
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
