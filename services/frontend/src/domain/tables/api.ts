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

// Point Tables API to the Order service base URL from env
const base = `${ENV.ORDER_URL}/api/tables`;

export const TablesApi = {
  // Queries
  async getAll(): Promise<TableViewDto[]> {
    const { data } = await api.get<TableViewDto[]>(base);
    return data;
  },
  async getById(id: string): Promise<TableViewDto> {
    const { data } = await api.get<TableViewDto>(`${base}/${id}`);
    return data;
  },

  // Commands
  async create(dto: CreateTableDto): Promise<void> {
    await api.post(base, dto);
  },
  async delete(id: string): Promise<void> {
    await api.delete(`${base}/${id}`);
  },

  // Layout
  async updateLayout(id: string, dto: UpdateTableLayoutDto): Promise<void> {
    await api.patch(`${base}/${id}/layout`, dto);
  },
  async bulkUpdateLayout(dto: BulkLayoutUpdateDto): Promise<void> {
    // Server expects POST, not PATCH
    await api.post(`${base}/layout/bulk`, dto);
  },

  // Status / seating
  async setStatus(id: string, dto: SetTableStatusDto): Promise<void> {
    await api.patch(`${base}/${id}/status`, dto);
  },
  async seat(id: string, party: number): Promise<void> {
    await api.post(`${base}/${id}/seat`, { partySize: party });
  },
  async clear(id: string): Promise<void> {
    await api.post(`${base}/${id}/clear`);
  },

  // Order linking
  async linkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    await api.post(`${base}/${id}/link-order`, dto);
  },
  async unlinkOrder(id: string, dto: LinkOrderDto): Promise<void> {
    await api.post(`${base}/${id}/unlink-order`, dto);
  },

  // Grouping
  async join(dto: JoinTablesDto): Promise<{ groupId: string }> {
    const { data } = await api.post<{ groupId: string }>(`${base}/join`, dto);
    return data;
  },
  async split(dto: SplitTablesDto): Promise<void> {
    await api.post(`${base}/split`, dto);
  }
};
