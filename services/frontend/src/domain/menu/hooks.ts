import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MenuItems } from "./service";
import { MenuKeys } from "./keys";
import type { MenuItemDto, PageResult, CreateMenuItemDto, UpdateMenuItemDto } from "./types";

export function useMenuCategories() {
  return useQuery<string[]>({
    queryKey: MenuKeys.categories,
    queryFn: MenuItems.categories,
  });
}

export function useMenuList(params: {
  name?: string;
  category?: string;
  available?: boolean;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<PageResult<MenuItemDto>>({
    queryKey: MenuKeys.list(params),
    queryFn: () => MenuItems.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useToggleMenuAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => MenuItems.setAvailability(id, value),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["menu", "list"], exact: false }),
  });
}

export function usePatchMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateMenuItemDto }) => MenuItems.patch(id, dto),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["menu", "item", vars.id] });
      void qc.invalidateQueries({ queryKey: ["menu", "list"], exact: false });
    },
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMenuItemDto) => MenuItems.create(dto),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["menu", "list"], exact: false }),
  });
}

export function useRemoveMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => MenuItems.remove(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: ["menu", "item", id] });
      void qc.invalidateQueries({ queryKey: ["menu", "list"], exact: false });
    },
  });
}

