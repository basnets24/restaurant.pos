export interface PublicModifierOptionDto {
  id: string;
  name: string;
  /** Added to the item's base price. Can be zero ("Included") or negative. */
  priceDelta: number;
  isDefault: boolean;
}

export interface PublicModifierGroupDto {
  id: string;
  name: string;
  selectionType: "Single" | "Multi";
  required: boolean;
  options: PublicModifierOptionDto[];
}

export interface PublicMenuItemDto {
  id: string;
  name: string;
  description: string;
  price: number;
  modifierGroups: PublicModifierGroupDto[];
}

export interface PublicMenuCategoryDto {
  name: string;
  items: PublicMenuItemDto[];
}

export interface PublicMenuDto {
  restaurantId: string;
  locationId: string;
  categories: PublicMenuCategoryDto[];
}
