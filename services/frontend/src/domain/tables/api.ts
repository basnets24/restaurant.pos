import { http as api } from "@/lib/http";
import { ENV } from "@/config/env";
import {
  type BulkLayoutUpdateDto,
  type CreateTableDto,
  type JoinTablesDto,
  type LinkOrderDto,
  type SetTableStatusDto,
  type SplitTablesDto,
  type TableViewDto,
  type UpdateTableLayoutDto
} from "./types";

// Uses shared axios instance with auth headers/interceptors
// Adds explicit multi-tenant headers where available

function getTenant() {
  try {
    return (window as any)?.POS_SHELL_AUTH?.getTenant?.();
  } catch {
    return undefined;
  }
}

function withTenantHeaders(tenant?: { restaurantId?: string; locationId?: string }) {
  const t = tenant ?? getTenant() ?? {};
  const headers: Record<string, string> = {};
  if (t.restaurantId) headers["x-restaurant-id"] = String(t.restaurantId);
  if (t.locationId) headers["x-location-id"] = String(t.locationId);
  return headers;
}

// Point Tables API to the Order service base URL from env
const base = `${ENV.ORDER_URL}/api/tables`;

export const TablesApi = {
  // Queries
  async getAll(): Promise<TableViewDto[]> {
    const { data } = await api.get<TableViewDto[]>(base, { headers: withTenantHeaders() });
    return data;
  },
  async getById(id: string): Promise<TableViewDto> {
    const { data } = await api.get<TableViewDto>(`${base}/${id}`, { headers: withTenantHeaders() });
    return data;
  },

  // Commands
  async create(dto: CreateTableDto): Promise<void> {
    await api.post(base, dto, { headers: withTenantHeaders() });
  },
  async delete(id: string): Promise<void> {
    await api.delete(`${base}/${id}`, { headers: withTenantHeaders() });
  },

  // Layout
  async updateLayout(id: string, dto: UpdateTableLayoutDto): Promise<void> {
    await api.patch(`${base}/${id}/layout`, dto, { headers: withTenantHeaders() });
  },
  async bulkUpdateLayout(dto: BulkLayoutUpdateDto): Promise<void> {
    // Server expects POST, not PATCH
    await api.post(`${base}/layout/bulk`, dto, { headers: withTenantHeaders() });
  },

  // Status / seating
  async setStatus(id: string, dto: SetTableStatusDto): Promise<void> {
    await api.patch(`${base}/${id}/status`, dto, { headers: withTenantHeaders() });
  },
  async seat(id: string, party: number): Promise<void> {
    await api.post(`${base}/${id}/seat`, { partySize: party }, { headers: withTenantHeaders() });
  },
  async clear(id: string): Promise<void> {
    await api.post(`${base}/${id}/clear`, null, { headers: withTenantHeaders() });
  },

  // Order linking
  async linkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    await api.post(`${base}/${id}/link-order`, dto, { headers: withTenantHeaders() });
  },
  async unlinkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    await api.post(`${base}/${id}/unlink-order`, dto, { headers: withTenantHeaders() });
  },

  // Grouping
  async join(dto: JoinTablesDto): Promise<{ groupId: string }> {
    const { data } = await api.post<{ groupId: string }>(`${base}/join`, dto, { headers: withTenantHeaders() });
    return data;
  },
  async split(dto: SplitTablesDto): Promise<void> {
    await api.post(`${base}/split`, dto, { headers: withTenantHeaders() });
  }
};
