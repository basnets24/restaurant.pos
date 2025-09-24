import { http as api } from "@/lib/http";
import { ENV } from "@/config/env";
import { getApiToken } from "@/auth/getApiToken";
import { tenantAccessor } from "@/auth/runtime";
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
    return tenantAccessor();
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
    const token = await getApiToken('Order', ['order.read']);
    const { data } = await api.get<TableViewDto[]>(base, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    return data;
  },
  async getById(id: string): Promise<TableViewDto> {
    const token = await getApiToken('Order', ['order.read']);
    const { data } = await api.get<TableViewDto>(`${base}/${id}`, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    return data;
  },

  // Commands
  async create(dto: CreateTableDto): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.post(base, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  async delete(id: string): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.delete(`${base}/${id}`, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },

  // Layout
  async updateLayout(id: string, dto: UpdateTableLayoutDto): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.patch(`${base}/${id}/layout`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  async bulkUpdateLayout(dto: BulkLayoutUpdateDto): Promise<void> {
    // Server expects POST, not PATCH
    const token = await getApiToken('Order', ['order.write']);
    await api.post(`${base}/layout/bulk`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },

  // Status / seating
  async setStatus(id: string, dto: SetTableStatusDto): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.patch(`${base}/${id}/status`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  async seat(id: string, party: number): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.post(`${base}/${id}/seat`, { partySize: party }, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  async clear(id: string): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.post(`${base}/${id}/clear`, null, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },

  // Order linking
  async linkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.post(`${base}/${id}/link-order`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  async unlinkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.post(`${base}/${id}/unlink-order`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },

  // Grouping
  async join(dto: JoinTablesDto): Promise<{ groupId: string }> {
    const token = await getApiToken('Order', ['order.write']);
    const { data } = await api.post<{ groupId: string }>(`${base}/join`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    return data;
  },
  async split(dto: SplitTablesDto): Promise<void> {
    const token = await getApiToken('Order', ['order.write']);
    await api.post(`${base}/split`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  }
};
