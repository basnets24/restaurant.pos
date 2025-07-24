using System.ComponentModel.DataAnnotations;

namespace MenuService.Dtos;

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

    public bool IsAvailable { get; init; } = true;
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

    public bool? IsAvailable { get; init; }
}