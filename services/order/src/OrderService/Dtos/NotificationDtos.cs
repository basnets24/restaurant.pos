namespace OrderService.Dtos;

public record NotificationViewDto(
    Guid Id,
    string Type,
    string Title,
    string? Message,
    string? EntityType,
    Guid? EntityId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt
);
