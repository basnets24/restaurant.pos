using Common.Library;
using Common.Library.Tenancy;

namespace InventoryService.Entities;

public class MenuItem : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Category { get; set; } = null!;
    
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
}