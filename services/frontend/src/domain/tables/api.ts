import { http as api } from "@/lib/http";
import { ENV } from "@/config/env";
import { getApiToken } from "@/auth/getApiToken";
import { withTenantHeaders } from "@/auth/tenantHeaders";
import { toApiError } from "@/lib/apiErrors";
import {
  type BulkLayoutUpdateDto,
  type CreateTableDto,
  type JoinTablesDto,
  type LinkOrderDto,
  type SeatResultDto,
  type SetTableStatusDto,
  type SplitTablesDto,
  type TableViewDto,
  type UpdateTableLayoutDto
} from "./types";

// Uses shared axios instance with auth headers/interceptors
// Adds explicit multi-tenant headers where available

// Point Tables API to the Order service base URL from env
const base = `${ENV.ORDER_URL}/api/tables`;

export const TablesApi = {
  // Queries
  async getAll(): Promise<TableViewDto[]> {
    try {
      const token = await getApiToken('Order', ['order.read']);
      const { data } = await api.get<TableViewDto[]>(base, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
      return data;
    } catch (e) { throw toApiError(e); }
  },
  async getById(id: string): Promise<TableViewDto> {
    try {
      const token = await getApiToken('Order', ['order.read']);
      const { data } = await api.get<TableViewDto>(`${base}/${id}`, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
      return data;
    } catch (e) { throw toApiError(e); }
  },

  // Commands
  async create(dto: CreateTableDto): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.post(base, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },
  async delete(id: string): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.delete(`${base}/${id}`, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },

  // Layout
  async updateLayout(id: string, dto: UpdateTableLayoutDto): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.patch(`${base}/${id}/layout`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },
  async bulkUpdateLayout(dto: BulkLayoutUpdateDto): Promise<void> {
    try {
      // Server expects POST, not PATCH
      const token = await getApiToken('Order', ['order.write']);
      await api.post(`${base}/layout/bulk`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },

  // Status / seating
  async setStatus(id: string, dto: SetTableStatusDto): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.patch(`${base}/${id}/status`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },
  async seat(id: string, party: number): Promise<SeatResultDto> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      const { data } = await api.post<SeatResultDto>(`${base}/${id}/seat`, { partySize: party }, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
      return data;
    } catch (e) { throw toApiError(e); }
  },
  async clear(id: string): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.post(`${base}/${id}/clear`, null, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },

  // Order linking
  async linkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.post(`${base}/${id}/link-order`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },
  async unlinkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.post(`${base}/${id}/unlink-order`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  },

  // Grouping
  async join(dto: JoinTablesDto): Promise<{ groupId: string }> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      const { data } = await api.post<{ groupId: string }>(`${base}/join`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
      return data;
    } catch (e) { throw toApiError(e); }
  },
  async split(dto: SplitTablesDto): Promise<void> {
    try {
      const token = await getApiToken('Order', ['order.write']);
      await api.post(`${base}/split`, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) { throw toApiError(e); }
  }
};
