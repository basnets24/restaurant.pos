using System.ComponentModel.DataAnnotations;

namespace CatalogService;

public record MenuItemDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = null!;
    public string Description { get; init; } = null!;
    public decimal Price { get; init; }
    public string Category { get; init; } = null!;
    public bool IsAvailable { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record CreateMenuItemDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; init; } = null!;

    [MaxLength(500)]
    public string Description { get; init; } = null!;

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than zero.")]
    public decimal Price { get; init; }

    [Required]
    [MaxLength(50)]
    public string Category { get; init; } = null!;

}

public record UpdateMenuItemDto
{
    [MaxLength(100)]
    public string? Name { get; init; }

    [MaxLength(500)]
    public string? Description { get; init; }

    [Range(0.01, double.MaxValue)]
    public decimal? Price { get; init; }

    [MaxLength(50)]
    public string? Category { get; init; }

}

public record MenuQuery(string? Name=null, string? Category=null, bool? Available=null,
    decimal? MinPrice=null, decimal? MaxPrice=null, int Page=1, int PageSize=25);

public record CreateInventoryItemDto
{
    [Required]
    public Guid MenuItemId { get; init; }

    [Required]
    public string MenuItemName { get; init; } = null!;


    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0")]
    public int Quantity { get; init; }
}

public record UpdateInventoryItemDto
{
    // Absolute quantity (0..int.MaxValue). Optional.
    [Range(0, int.MaxValue, ErrorMessage = "Quantity must be non-negative.")]
    public int? Quantity { get; init; }

    // Explicit availability override. Optional.
    public bool? IsAvailable { get; init; }
}

// For signed adjustments (deltas can be negative or positive)
public record AdjustInventoryQuantityDto
{
    // e.g., +5 to add 5, -2 to subtract 2
    public int Delta { get; init; }
}

public record InventoryItemDto
{
    public Guid Id { get; init; }
    public Guid MenuItemId { get; init; }
    public string MenuItemName { get; init; } = null!;
    public int Quantity { get; init; }
    public bool IsAvailable { get; init; }
    public DateTimeOffset AcquiredDate { get; init; }
}

public record InventoryQuery(
    string? Name = null,
    bool? Available = null,
    int? MinQty = null,
    int Page = 1,
    int PageSize = 25
);

public record PageResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    long Total
);
