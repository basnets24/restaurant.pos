using System.ComponentModel.DataAnnotations;
using OrderService.Entities;

namespace OrderService.Dtos;

public record FinalizeOrderDto
{
    public List<OrderItem> Items { get; init; } = new();
    public decimal TotalAmount { get; init; }
}


public record OrderDto
{
    public Guid Id { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTimeOffset CreatedAt { get; set; }
}