using Common.Library;
using Common.Library.Tenancy;
using OrderService.Pricing;

namespace OrderService.Entities;

public class Order : IEntity, ITenantEntity 
{
    public Guid Id { get; set; }
    
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    
    // Context
    public Guid? TableId { get; set; }
    public Guid? ServerId { get; set; }
    public string? ServerName { get; set; }
    
    public Guid? CustomerId { get; set; }
    public int? GuestCount { get; set; }

    /// <summary>See <see cref="Cart.OrderType"/>. Only Pickup orders are routed automatically
    /// to payment (InventoryReservedConsumer); dine-in keeps the deliberate two-step
    /// fire-then-pay flow.</summary>
    public string OrderType { get; set; } = OrderTypes.DineIn;

    public DateTimeOffset? PickupTime { get; set; }

    public List<OrderItem> Items { get; set; } = new();

    public string Status { get; set; } = OrderStatus.Pending;
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

    // Set when a payment attempt fails; cleared implicitly once PaidAt is set.
    // Order stays Pending/retryable - a declined card is not an order rejection.
    public string? LastPaymentError { get; set; }
    public DateTimeOffset? LastPaymentFailedAt { get; set; }

    public DateTimeOffset? CancelledAt { get; set; }
}

/// <summary>Single source of truth for Order.Status values - previously hardcoded
/// independently across FinalOrderService, OrderController, and two consumers.</summary>
public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Rejected = "Rejected";
    public const string Cancelled = "Cancelled";
}

public class OrderItem
{
    /// <summary>Carried over from the cart line. See <see cref="CartItem.LineId"/>.</summary>
    public Guid LineId { get; set; } = Guid.NewGuid();

    public Guid MenuItemId { get; set; }
    public string MenuItemName { get; set; } = null!;
    public int Quantity { get; set; }

    /// <summary>All-in: base price plus modifier deltas. See <see cref="CartItem.UnitPrice"/>.</summary>
    public decimal UnitPrice { get; set; }

    public string? Notes { get; set; }

    public List<SelectedModifier> SelectedModifiers { get; set; } = new();
}
