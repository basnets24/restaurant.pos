namespace InventoryService;

    public record CreateInventoryItemDto
    {
        public Guid MenuItemId { get; init; }
        public string MenuItemName { get; init; } = null!;
        public int Quantity { get; init; }
    }

    public record UpdateInventoryItemDto
    {
        public int? Quantity { get; init; }
        public bool? IsAvailable { get; init; }
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

