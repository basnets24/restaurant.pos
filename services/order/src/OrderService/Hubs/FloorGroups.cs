namespace OrderService.Hubs;

/// <summary>
/// Single source of truth for the tenant-scoped SignalR group name - shared by
/// FloorHub (join/leave on connect) and DiningTableService (broadcast target).
/// Previously each hand-built the same format string independently, so a change
/// to one without the other would silently break real-time delivery.
/// </summary>
public static class FloorGroups
{
    public static string TenantGroup(string restaurantId, string locationId) =>
        $"tenant:{restaurantId}:loc:{locationId}";
}
