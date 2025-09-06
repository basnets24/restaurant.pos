import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tableKeys } from "./keys";
import { TablesApi } from "./api";
import type {
  BulkLayoutUpdateDto,
  CreateTableDto,
  SetTableStatusDto,
  TableViewDto,
  UpdateTableLayoutDto
} from "./types";

// ---------- Queries ----------

export function useTables(section?: string | null) {
  return useQuery({
    queryKey: tableKeys.list(section ?? undefined),
    queryFn: () => TablesApi.getAll(),
    staleTime: 10_000
  });
}

export function useTable(id: string) {
  return useQuery({
    queryKey: tableKeys.detail(id),
    queryFn: () => TablesApi.getById(id),
    enabled: Boolean(id),
    staleTime: 10_000
  });
}

// ---------- Mutations (with optimistic UX where it helps) ----------

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTableDto) => TablesApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => TablesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useUpdateTableLayout(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateTableLayoutDto) => TablesApi.updateLayout(id, dto),
    onMutate: async (dto) => {
      await qc.cancelQueries({ queryKey: tableKeys.all });
      const prev = qc.getQueryData<TableViewDto[]>(tableKeys.list());
      if (prev) {
        const next = prev.map(t =>
          t.id === id
            ? {
                ...t,
                position: { x: dto.x, y: dto.y },
                size: {
                  width: dto.width ?? t.size.width,
                  height: dto.height ?? t.size.height
                },
                // shape & version updates for immediate feedback
                shape: dto.shape ?? t.shape,
                version: t.version + 1
              }
            : t
        );
        qc.setQueryData(tableKeys.list(), next);
      }
      return { prev };
    },
    onError: (_err, _dto, ctx) => {
      if (ctx?.prev) qc.setQueryData(tableKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useBulkUpdateLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: BulkLayoutUpdateDto) => TablesApi.bulkUpdateLayout(dto),
    onMutate: async (dto) => {
      await qc.cancelQueries({ queryKey: tableKeys.all });
      const prev = qc.getQueryData<TableViewDto[]>(tableKeys.list());
      if (prev) {
        const map = new Map(dto.items.map(i => [i.id, i]));
        const next = prev.map(t => {
          const u = map.get(t.id);
          if (!u) return t;
          return {
            ...t,
            position: { x: u.x, y: u.y },
            size: { width: u.width ?? t.size.width, height: u.height ?? t.size.height },
            shape: u.shape ?? t.shape,
            version: t.version + 1
          };
        });
        qc.setQueryData(tableKeys.list(), next);
      }
      return { prev };
    },
    onError: (_err, _dto, ctx) => {
      if (ctx?.prev) qc.setQueryData(tableKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useSetTableStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SetTableStatusDto) => TablesApi.setStatus(id, dto),
    onMutate: async (dto) => {
      await qc.cancelQueries({ queryKey: tableKeys.all });
      const prev = qc.getQueryData<TableViewDto[]>(tableKeys.list());
      if (prev) {
        const next = prev.map(t =>
          t.id === id
            ? {
                ...t,
                status: dto.status,
                partySize: dto.status === "occupied" ? (dto.partySize ?? t.partySize ?? 1) : null
              }
            : t
        );
        qc.setQueryData(tableKeys.list(), next);
      }
      return { prev };
    },
    onError: (_err, _dto, ctx) => {
      if (ctx?.prev) qc.setQueryData(tableKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useSeat(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partySize: number) => TablesApi.seat(id, partySize),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useClear(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => TablesApi.clear(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useLinkOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cartId: string) => TablesApi.linkOrder(id, { cartId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useUnlinkOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cartId: string) => TablesApi.unlinkOrder(id, { cartId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useJoinTables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: TablesApi.join,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}

export function useSplitTables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: TablesApi.split,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tableKeys.all });
    }
  });
}
