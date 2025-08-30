using Common.Library;

namespace OrderService.Entities;

public class Order : IEntity
{
    public Guid Id { get; set; }
    
    // Context
    public Guid? TableId { get; set; }
    public Guid? ServerId { get; set; }
    public Guid? CustomerId { get; set; }
    public int? GuestCount { get; set; }
    
    public List<OrderItem> Items { get; set; } = new();
    
    public string Status { get; set; } = "Pending";
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    
    // Adjustments (order-level)
    public List<AppliedDiscount> AppliedDiscounts { get; set; } = new();
    public List<AppliedTax> AppliedTaxes { get; set; } = new();
    public List<ServiceCharge> ServiceCharges { get; set; } = new(); // delivery fee, surcharge, auto gratuity

    // Tip kept separate (guest-entered)
    public decimal? TipAmount { get; set; }
    
    
    // Money breakdown (cached for fast reads)
    public decimal Subtotal { get; set; }        // sum of item (price*qty)
    public decimal DiscountTotal { get; set; }   // line + order discounts
    public decimal ServiceChargeTotal { get; set; }
    public decimal TaxTotal { get; set; }
    // Subtotal - DiscountTotal + ServiceChargeTotal + TaxTotal + (TipAmount ?? 0)
    public decimal GrandTotal { get; set; }      
    
    // Payment linkage (Stripe)
    public string? ReceiptUrl { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
}

public class OrderItem
{
    public Guid MenuItemId { get; set; }
    public string MenuItemName { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Notes { get; set; }
}
