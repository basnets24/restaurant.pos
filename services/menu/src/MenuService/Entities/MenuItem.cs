
using Common.Library;
using Common.Library.Tenancy;

namespace MenuService.Entities;

public class MenuItem : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public decimal Price { get; set; }
    public string Category { get; set; } = null!;
    public bool IsAvailable { get; set; } = false; 
    public DateTimeOffset CreatedAt { get; init; } = DateTime.UtcNow;
    
    // tenancy
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    
}