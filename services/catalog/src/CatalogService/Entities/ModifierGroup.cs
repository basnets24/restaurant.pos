using Common.Library;
using Common.Library.Tenancy;

namespace CatalogService.Entities;

public enum ModifierSelectionType
{
    /// <summary>Exactly one option (size, spice level). Radio-like.</summary>
    Single = 0,

    /// <summary>Any number of options (extras, toppings). Checkbox-like.</summary>
    Multi = 1
}

/// <summary>
/// A set of choices attached to one <see cref="MenuItem"/> - "Size", "Extras", "Cook temp".
/// Tenant-scoped: these are staff-authored rows belonging to a restaurant, unlike the
/// tenant entities themselves.
/// </summary>
public class ModifierGroup : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public Guid MenuItemId { get; set; }
    public string Name { get; set; } = null!;
    public ModifierSelectionType SelectionType { get; set; } = ModifierSelectionType.Single;

    /// <summary>When true the diner must choose (at least) one option before adding the item.</summary>
    public bool Required { get; set; }

    public int DisplayOrder { get; set; }

    public List<ModifierOption> Options { get; set; } = new();

    // tenancy
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
}

/// <summary>
/// One choice within a <see cref="ModifierGroup"/>. Tenancy is inherited through the parent
/// group rather than stored again - options are never queried independently of their group.
/// </summary>
public class ModifierOption : IEntity
{
    public Guid Id { get; set; }
    public Guid ModifierGroupId { get; set; }
    public string Name { get; set; } = null!;

    /// <summary>Added to the item's base price when selected. May be zero ("Included") and
    /// may be negative, so a smaller size can discount.</summary>
    public decimal PriceDelta { get; set; }

    public int DisplayOrder { get; set; }

    /// <summary>Pre-selected when the modifier dialog opens. On a Single/Required group this
    /// is what stops the diner having to make a choice they don't care about.</summary>
    public bool IsDefault { get; set; }

    public ModifierGroup? Group { get; set; }
}
