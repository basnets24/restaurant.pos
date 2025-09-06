using System.ComponentModel.DataAnnotations;

namespace InventoryService;

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

