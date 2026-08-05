using System.ComponentModel.DataAnnotations;
using CatalogService.Entities;

namespace CatalogService.Features.Modifiers;

public record ModifierGroupDto(
    Guid Id,
    Guid MenuItemId,
    string Name,
    string SelectionType,
    bool Required,
    IReadOnlyList<ModifierOptionDto> Options
);

public record ModifierOptionDto(
    Guid Id,
    string Name,
    decimal PriceDelta,
    bool IsDefault
);

public record UpsertModifierGroupDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; init; } = null!;

    [Required]
    public string SelectionType { get; init; } = null!;

    public bool Required { get; init; }

    [MinLength(1, ErrorMessage = "A modifier group needs at least one option.")]
    public List<UpsertModifierOptionDto> Options { get; init; } = new();
}

public record UpsertModifierOptionDto
{
    /// <summary>Set to update an existing option in place; omitted for a new one. Any existing
    /// option whose Id is absent from the submitted list is deleted.</summary>
    public Guid? Id { get; init; }

    [Required]
    [MaxLength(100)]
    public string Name { get; init; } = null!;

    public decimal PriceDelta { get; init; }

    public bool IsDefault { get; init; }
}

/// <summary>Parses/validates the wire-level SelectionType string against the entity enum,
/// mirroring MenuCategories.Normalize's role for menu-item categories.</summary>
public static class ModifierSelectionTypes
{
    public static readonly string[] All = Enum.GetNames<ModifierSelectionType>();

    public static ModifierSelectionType? Parse(string? value) =>
        Enum.TryParse<ModifierSelectionType>(value, ignoreCase: true, out var t) ? t : null;
}
