namespace OrderService.Dtos;

public record CreateCartDto(
    Guid? TableId, 
    Guid? CustomerId, 
    Guid? ServerId, 
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

public record CartDto(
    Guid Id, 
    Guid? TableId, 
    Guid? CustomerId, 
    Guid? ServerId, 
    int? GuestCount,
    List<CartItemDto> Items, 
    DateTimeOffset CreatedAt,
    decimal? TipAmount, 
    List<AppliedTax> AppliedTaxes,
    List<AppliedDiscount> AppliedDiscounts,
    List<ServiceCharge> ServiceCharges
    );