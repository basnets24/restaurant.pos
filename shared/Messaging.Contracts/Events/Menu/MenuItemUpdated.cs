namespace Messaging.Contracts.Events.Menu;

public record MenuItemUpdated
(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string Category,
    bool IsAvailable
); 