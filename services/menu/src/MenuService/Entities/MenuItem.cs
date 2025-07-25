
using Common.Library;

namespace MenuService.Entities;

public class MenuItem : IEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public decimal Price { get; set; }
    public string Category { get; set; } = null!;
    public bool IsAvailable { get; set; } = true;
    public DateTimeOffset CreatedAt { get; init; } = DateTime.UtcNow;
    
}