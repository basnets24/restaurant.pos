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

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateInventoryItemDto }) => InventoryItems.update(id, dto),
    onSuccess: () => void qc.invalidateQueries({ queryKey: InventoryKeys.items }),
  });
}

