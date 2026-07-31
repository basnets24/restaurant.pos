using OrderService.Dtos;

namespace OrderService.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationViewDto>> GetAllAsync(int take, CancellationToken ct = default);
    Task MarkAsReadAsync(Guid id, CancellationToken ct = default);

    Task NotifyAsync(
        string type,
        string title,
        string? message,
        string? entityType,
        Guid? entityId,
        CancellationToken ct = default);
}
