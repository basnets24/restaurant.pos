namespace CatalogService.Features.PublicMenu;

/// <summary>A diner-facing menu: categories in menu order, each holding its items.</summary>
public record PublicMenuDto(
    string RestaurantId,
    string LocationId,
    IReadOnlyList<PublicMenuCategoryDto> Categories
);

public record PublicMenuCategoryDto(
    string Name,
    IReadOnlyList<PublicMenuItemDto> Items
);

/// <summary>
/// Deliberately narrower than <c>MenuItemDto</c>: no <c>Quantity</c>, no <c>IsAvailable</c>,
/// no <c>CreatedAt</c>/<c>AcquiredDate</c>. Stock levels are commercially sensitive and of no
/// use to a diner - unavailable items are simply absent from this response.
/// </summary>
public record PublicMenuItemDto(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    IReadOnlyList<PublicModifierGroupDto> ModifierGroups
);

public record PublicModifierGroupDto(
    Guid Id,
    string Name,
    string SelectionType,
    bool Required,
    IReadOnlyList<PublicModifierOptionDto> Options
);

public record PublicModifierOptionDto(
    Guid Id,
    string Name,
    decimal PriceDelta,
    bool IsDefault
);
