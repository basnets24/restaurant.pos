// Table domain types — aligned with your backend DTOs

export type TableStatus = "available" | "occupied" | "reserved" | "dirty";

export interface PositionDto {
  x: number;
  y: number;
}

export interface SizeDto {
  width: number;
  height: number;
}

/** View model returned by GET /api/tables */
export interface TableViewDto {
  id: string;
  number: string;           // displayed "Table 12" → keep as string for UI
  section: string | null;
  seats: number;
  shape: string;            // "square" | "rectangle" | "circle" ... (freeform)
  status: TableStatus;
  position: PositionDto;
  size: SizeDto;
  partySize?: number | null;
  version: number;
  activeCartId?: string | null;
  serverId?: string | null;
}

// ---- Commands / DTOs sent to the API ----

export interface CreateTableDto {
  number: string;
  section?: string | null;
  seats: number;
  shape?: string;
  position: PositionDto;
  size: SizeDto;
}

export interface UpdateTableLayoutDto {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  shape?: string;
  version: number; // optimistic concurrency
}

export interface BulkLayoutItemDto extends UpdateTableLayoutDto {
  id: string;
}

export interface BulkLayoutUpdateDto {
  items: BulkLayoutItemDto[];
}

export interface SetTableStatusDto {
  status: TableStatus;
  partySize?: number | null; // required when status = "occupied"
}

export interface SeatPartyDto {
  partySize: number;
}

export interface LinkOrderDto {
  orderId: string;
}

export interface JoinTablesDto {
  tableIds: string[];
  groupLabel?: string | null;
}

export interface SplitTablesDto {
  groupId: string;
}
