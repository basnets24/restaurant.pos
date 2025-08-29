using Common.Library;

namespace OrderService.Entities;

public class Cart : IEntity
{
    public Guid Id { get; set; }
    // context 
    public Guid? TableId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? ServerId { get; set; }
    public int? GuestCount { get; set; }
    public List<CartItem> Items { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Money (order level)
    public decimal? TipAmount { get; set; }
    public List<AppliedTax> AppliedTaxes { get; set; } = new();        // order-level
    public List<AppliedDiscount> AppliedDiscounts { get; set; } = new(); // order-level
    public List<ServiceCharge> ServiceCharges { get; set; } = new(); // delivery fee, surcharge, auto gratuity
}

public class CartItem
{
    public Guid MenuItemId { get; set; }
    public string MenuItemName { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Notes { get; set; } 
}