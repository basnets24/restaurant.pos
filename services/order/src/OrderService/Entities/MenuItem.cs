using Common.Library;
using Common.Library.Tenancy;

namespace OrderService.Entities;

public class MenuItem : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    public String Name { get; set; } = null!;
    public decimal Price { get; set; }
    public String Category { get; set; } = null!;
}