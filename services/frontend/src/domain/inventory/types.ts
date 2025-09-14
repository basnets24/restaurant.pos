export interface InventoryItemDto {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  isAvailable: boolean;
  acquiredDate: string; // ISO
}

export interface UpdateInventoryItemDto {
  quantity?: number;     // >= 0
  isAvailable?: boolean; // optional toggle
}

