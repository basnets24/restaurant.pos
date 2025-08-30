using System.ComponentModel.DataAnnotations;
using OrderService.Entities;

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
}


public record OrderDto
{
    public Guid Id { get; set; }
    
    public Guid? TableId { get; set; }
    public Guid? ServerId { get; set; }
    public string? ServerName { get; set; }
    public int? GuestCount { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public string Status { get; set; } = "Pending";
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

}