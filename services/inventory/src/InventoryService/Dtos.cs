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
        [Range(0, int.MaxValue, ErrorMessage = "Quantity must be non-negative.")]
        public int? Quantity { get; init; }
        public bool? IsAvailable { get; set; }
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

