using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Mappers;

public static class NotificationMappings
{
    public static NotificationViewDto ToView(this Notification n) => new(
        Id: n.Id,
        Type: n.Type,
        Title: n.Title,
        Message: n.Message,
        EntityType: n.EntityType,
        EntityId: n.EntityId,
        CreatedAt: n.CreatedAt,
        ReadAt: n.ReadAt
    );
}
