namespace Messaging.Contracts.Events.Menu;

public record MenuItemCreated(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string Category,
    bool IsAvailable,
    string RestaurantId,
    string LocationId
);

public record MenuItemDeleted( 
    Guid Id,
    string RestaurantId,
    string LocationId); 

public record MenuItemUpdated
(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string Category,
    bool IsAvailable,
    string RestaurantId,
    string LocationId
); 