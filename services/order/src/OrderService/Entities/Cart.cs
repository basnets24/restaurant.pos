using Common.Library;
using Common.Library.Tenancy;

namespace OrderService.Entities;

public class Cart : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    // context
    public Guid? TableId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? ServerId { get; set; }
    public string? ServerName { get; set; }
    public int? GuestCount { get; set; }
    public List<CartItem> Items { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>How this order reaches the guest. Deliberately explicit rather than derived
    /// from <c>TableId == null</c>: a staff counter order also has no table, and reclassifying
    /// those as pickup would hand them to the diner payment path they were never meant for.</summary>
    public string OrderType { get; set; } = OrderTypes.DineIn;

    public DateTimeOffset? PickupTime { get; set; }
}

public class CartItem
{
    /// <summary>Identifies this line, not this menu item. The same item can sit in a cart
    /// several times under different modifier choices, so quantity edits and removals key
    /// on the line - <c>MenuItemId</c> is no longer unique within a cart.</summary>
    public Guid LineId { get; set; } = Guid.NewGuid();

    public Guid MenuItemId { get; set; }
    public string MenuItemName { get; set; } = null!;
    public int Quantity { get; set; }

    /// <summary>Base price plus every selected modifier's delta. Folded in here, at the point
    /// the line is built, so that everything downstream - the subtotal, PricingService, the tax
    /// base, the Stripe amount - sees one all-in number and cannot disagree about it.</summary>
    public decimal UnitPrice { get; set; }

    public string? Notes { get; set; }

    public List<SelectedModifier> SelectedModifiers { get; set; } = new();
}

/// <summary>Single source of truth for Cart/Order.OrderType values.</summary>
public static class OrderTypes
{
    public const string DineIn = "DineIn";
    public const string Pickup = "Pickup";
}
