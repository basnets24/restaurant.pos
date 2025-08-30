namespace OrderService.Dtos;

public record CreateCartDto(
    Guid? TableId, 
    Guid? CustomerId, 
    int? GuestCount);

public record AddCartItemDto(
    Guid MenuItemId,
    int Quantity, 
    string? Notes);

public record CartItemDto(
    Guid MenuItemId, 
    string MenuItemName, 
    int Quantity, 
    decimal UnitPrice, 
    string? Notes);

public record CartEstimateDto(
    decimal Subtotal,
    decimal DiscountTotal,
    decimal ServiceChargeTotal,
    decimal TaxTotal,
    decimal GrandTotal,
    IReadOnlyList<AppliedDiscount> AppliedDiscounts,
    IReadOnlyList<ServiceCharge>   ServiceCharges,
    IReadOnlyList<AppliedTax>      AppliedTaxes
);


public record CartDto(
    Guid Id,
    Guid? TableId,
    Guid? CustomerId,
    Guid? ServerId,
    int? GuestCount,
    List<CartItemDto> Items,
    DateTimeOffset CreatedAt)
{
    public CartEstimateDto? Estimate { get; init; } // <- new, server-only
}

