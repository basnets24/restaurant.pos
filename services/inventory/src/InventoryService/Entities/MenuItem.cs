using Common.Library;

namespace InventoryService.Entities;

public class MenuItem : IEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Category { get; set; } = null!;
}