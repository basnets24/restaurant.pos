using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Services;

namespace OrderService.Mappers;

public static class FinalizeOrderMappings
{
    /// <summary>Pure construction: a FinalizeOrderDto + its computed pricing becomes a new Order.
    /// No persistence, no publishing - kept separate so this mapping can be tested on its own.</summary>
    public static Order ToOrder(this FinalizeOrderDto dto, Guid orderId, PricingBreakdown p) => new()
    {
        CreatedAt = DateTimeOffset.UtcNow,
        Id = orderId,
        Items = dto.Items,
        Status = OrderStatus.Pending,

        // Context
        TableId = dto.TableId,
        ServerId = dto.ServerId,
        ServerName = dto.ServerName,
        GuestCount = dto.GuestCount,

        // order-level itemized lines (all are Scope="Order")
        AppliedDiscounts = p.AppliedDiscounts.ToList(),
        ServiceCharges = p.ServiceCharges.ToList(),
        AppliedTaxes = p.AppliedTaxes.ToList(),

        // Totals
        Subtotal = dto.Subtotal,
        DiscountTotal = p.DiscountTotal,
        ServiceChargeTotal = p.ServiceChargeTotal,
        TaxTotal = p.TaxTotal,
        TipAmount = p.Tip,
        GrandTotal = p.GrandTotal,
    };
}
