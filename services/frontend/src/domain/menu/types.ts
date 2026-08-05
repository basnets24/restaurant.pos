export interface MenuItemDto {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  quantity: number;
  createdAt: string;
}

export interface CreateMenuItemDto {
  name: string;
  description?: string;
  price: number;
  category: string;
}

export interface UpdateMenuItemDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  quantity?: number;
  isAvailable?: boolean;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type ModifierSelectionType = "Single" | "Multi";

export interface ModifierOptionDto {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface ModifierGroupDto {
  id: string;
  menuItemId: string;
  name: string;
  selectionType: ModifierSelectionType;
  required: boolean;
  options: ModifierOptionDto[];
}

export interface UpsertModifierOptionDto {
  // Present to update an existing option in place; omitted for a new one. Any existing
  // option whose id isn't in the submitted list is deleted.
  id?: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface UpsertModifierGroupDto {
  name: string;
  selectionType: ModifierSelectionType;
  required: boolean;
  options: UpsertModifierOptionDto[];
}

