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
}
