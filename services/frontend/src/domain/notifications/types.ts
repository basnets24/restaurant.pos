// Notification domain types — aligned with backend NotificationViewDto

export type NotificationType =
  | "TableSeated"
  | "TableAvailable"
  | "TableReserved"
  | "TableDirty"
  | "TableCleared"
  | "OrderUnlinked"
  | "TablesJoined"
  | "TablesSplit"
  | "TableRemoved";

/** View model returned by GET /api/notifications */
export interface NotificationViewDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  readAt: string | null;
}
