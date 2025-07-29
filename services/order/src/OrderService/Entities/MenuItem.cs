using Common.Library;

namespace OrderService.Entities;

public class MenuItem : IEntity
{
    public Guid Id { get; set; }
    public String Name { get; set; } = null!;
    public decimal Price { get; set; }
    public String Category { get; set; } = null!;
}