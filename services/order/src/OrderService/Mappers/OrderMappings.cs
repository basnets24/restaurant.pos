using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Mappers;

public static class OrderMappings
{
    public static OrderDto ToDto(this Order order)
    {
        return new OrderDto
        {
            Id = order.Id,
            TableId = order.TableId,
            ServerId = order.ServerId,
            ServerName = order.ServerName,
            GuestCount = order.GuestCount,
            Items = order.Items,
            Status = order.Status,
            CreatedAt = order.CreatedAt,
            AppliedDiscounts = order.AppliedDiscounts,
            AppliedTaxes = order.AppliedTaxes,
            ServiceCharges = order.ServiceCharges,
            TipAmount = order.TipAmount,
            Subtotal = order.Subtotal,
            DiscountTotal = order.DiscountTotal,
            ServiceChargeTotal = order.ServiceChargeTotal,
            TaxTotal = order.TaxTotal,
            GrandTotal = order.GrandTotal,
            ReceiptUrl = order.ReceiptUrl,
            PaidAt = order.PaidAt,
        };
    }

}