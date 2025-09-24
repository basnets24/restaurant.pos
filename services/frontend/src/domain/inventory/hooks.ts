import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InventoryItems } from "./service";
import { InventoryKeys } from "./keys";
import type { InventoryItemDto, UpdateInventoryItemDto } from "./types";

export function useInventoryItems() {
  return useQuery<InventoryItemDto[]>({
    queryKey: InventoryKeys.items,
    queryFn: InventoryItems.list,
    placeholderData: keepPreviousData,
  });
}

type UpdateVars = { id: string; dto: UpdateInventoryItemDto; menuItemId?: string };
type AdjustVars = { id: string; delta: number; menuItemId?: string };

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: UpdateVars) => {
      if (typeof dto.quantity === 'number') {
        await InventoryItems.setQuantity(id, dto.quantity);
        return;
      }
      await InventoryItems.update(id, dto);
    },
    onSuccess: (_data, variables: UpdateVars) => {
      void qc.invalidateQueries({ queryKey: InventoryKeys.items });
      // Also refresh menu lists so availability/stock reflects in UI without reload
      void qc.invalidateQueries({ queryKey: ["menu", "list"], exact: false });
      if (variables.menuItemId) {
        void qc.invalidateQueries({ queryKey: ["menu", "item", variables.menuItemId] });
      }
    },
  });
}

export function useAdjustInventoryQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delta }: AdjustVars) => InventoryItems.adjustQuantity(id, delta),
    onSuccess: (_data, variables: AdjustVars) => {
      void qc.invalidateQueries({ queryKey: InventoryKeys.items });
      void qc.invalidateQueries({ queryKey: ["menu", "list"], exact: false });
      if (variables.menuItemId) {
        void qc.invalidateQueries({ queryKey: ["menu", "item", variables.menuItemId] });
      }
    },
  });
}
