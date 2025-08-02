using OrderService.Entities;

namespace OrderService;

public record CreateOrderDto
{
    public List<OrderItemDto> Items { get; init; } = new();
}

public record OrderItemDto
{
    public Guid MenuItemId { get; init; }
    public int Quantity { get; init; }
}

public record OrderDto
{
    public Guid Id { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTimeOffset CreatedAt { get; set; }
}