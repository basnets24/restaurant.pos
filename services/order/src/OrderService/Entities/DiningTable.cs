using Common.Library;

namespace OrderService.Entities;

public class DiningTable : IEntity
{
    public Guid Id { get; set; }
    public int TableNumber { get; set; }
    public string Status { get; set; } = "Available";
    public Guid? ActiveCartId { get; set; }
}