namespace Messaging.Contracts.Events.Menu;

public record MenuItemCreated(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string Category,
    bool IsAvailable
);