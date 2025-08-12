namespace OrderService.Dtos;

public record CreateCartDto(Guid? TableId, Guid? CustomerId);
public record AddCartItemDto(Guid MenuItemId, int Quantity);
public record CartItemDto(Guid MenuItemId, string MenuItemName, 
    int Quantity, decimal UnitPrice);
public record CartDto(Guid Id, Guid? TableId, Guid? CustomerId, 
    List<CartItemDto> Items, DateTimeOffset CreatedAt);