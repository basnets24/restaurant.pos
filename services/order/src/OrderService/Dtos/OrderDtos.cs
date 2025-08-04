using System.ComponentModel.DataAnnotations;
using OrderService.Entities;

namespace OrderService.Dtos;

public record CreateOrderDto
{
    public List<OrderItemDto> Items { get; init; } = new();
}

public record OrderItemDto
{
    [Required]
    public Guid MenuItemId { get; init; }
    [Required, Range(1, 100)]
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