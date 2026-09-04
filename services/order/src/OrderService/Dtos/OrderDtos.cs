using System.ComponentModel.DataAnnotations;
using OrderService.Entities;
using OrderService.Pricing;

namespace OrderService.Dtos;

public record FinalizeOrderDto
{
    public Guid? TableId { get; set; }
    public Guid? ServerId { get; set; }
    public string? ServerName { get; set; }
    public int? GuestCount { get; set; }
    public decimal? TipAmount { get; set; }
    public List<OrderItem> Items { get; init; } = new();
    public decimal Subtotal { get; init; }

    /// <summary>Who the order belongs to. On the diner path this is stamped from the access
    /// token in <c>DinerOrderService</c> and never read off the wire - it is the only thing
    /// separating one diner's orders from another's.</summary>
    public Guid? CustomerId { get; set; }

    public string OrderType { get; set; } = OrderTypes.DineIn;
    public DateTimeOffset? PickupTime { get; set; }
}


public record OrderDto
{
    public Guid Id { get; set; }
    
    public Guid? TableId { get; set; }
    public Guid? ServerId { get; set; }
    public string? ServerName { get; set; }
    public Guid? CustomerId { get; set; }
    public int? GuestCount { get; set; }
    public string OrderType { get; set; } = OrderTypes.DineIn;
    public DateTimeOffset? PickupTime { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public string Status { get; set; } = OrderStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public List<AppliedDiscount> AppliedDiscounts { get; set; } = new();
    public List<AppliedTax> AppliedTaxes { get; set; } = new();
    public List<ServiceCharge> ServiceCharges { get; set; } = new();
    public decimal? TipAmount { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal ServiceChargeTotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public string? ReceiptUrl { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public string? LastPaymentError { get; set; }
    public DateTimeOffset? LastPaymentFailedAt { get; set; }
    public DateTimeOffset? ServedAt { get; set; }

}