using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Mappers;

public static class CustomerOrderSummaryMappings
{
    public static DinerOrderSummaryDto ToDinerSummaryDto(this CustomerOrderSummary s) =>
        new(
            OrderId: s.Id,
            RestaurantId: s.RestaurantId,
            LocationId: s.LocationId,
            RestaurantName: s.RestaurantName,
            LocationName: s.LocationName,
            Status: s.Status,
            OrderType: s.OrderType,
            GrandTotal: s.GrandTotal,
            ItemCount: s.ItemCount,
            ItemSummary: s.ItemSummary,
            CreatedAt: s.CreatedAt,
            PickupTime: s.PickupTime,
            PaidAt: s.PaidAt,
            CancelledAt: s.CancelledAt);

    public static DinerNotificationDto ToDinerDto(this CustomerNotification n) =>
        new(
            Id: n.Id,
            OrderId: n.OrderId,
            RestaurantId: n.RestaurantId,
            LocationId: n.LocationId,
            RestaurantName: n.RestaurantName,
            Type: n.Type,
            Title: n.Title,
            Message: n.Message,
            CreatedAt: n.CreatedAt,
            ReadAt: n.ReadAt);
}
