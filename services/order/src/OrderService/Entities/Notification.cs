using Common.Library;
using Common.Library.Tenancy;

namespace OrderService.Entities;

public class Notification : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;

    public string Type { get; set; } = default!; // see NotificationType
    public string Title { get; set; } = default!;
    public string? Message { get; set; }

    public string? EntityType { get; set; } // e.g. "DiningTable"
    public Guid? EntityId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}

/// <summary>
/// Single source of truth for notification type values, mirroring the
/// DiningTableStatus convention used elsewhere in this service.
/// </summary>
public static class NotificationType
{
    public const string TableSeated = "TableSeated";
    public const string TableAvailable = "TableAvailable";
    public const string TableReserved = "TableReserved";
    public const string TableDirty = "TableDirty";
    public const string TableCleared = "TableCleared";
    public const string OrderUnlinked = "OrderUnlinked";
    public const string TablesJoined = "TablesJoined";
    public const string TablesSplit = "TablesSplit";
    public const string TableRemoved = "TableRemoved";
}
