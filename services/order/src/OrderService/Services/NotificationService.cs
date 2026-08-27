using Common.Library;
using Common.Library.Tenancy;
using Microsoft.AspNetCore.SignalR;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Hubs;
using OrderService.Interfaces;
using OrderService.Mappers;

namespace OrderService.Services;

public class NotificationService : INotificationService
{
    private readonly IRepository<Notification> _repo;
    private readonly ITenantContext _tenant;
    private readonly IHubContext<FloorHub> _hub;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IRepository<Notification> repo,
        ITenantContext tenant,
        IHubContext<FloorHub> hub,
        ILogger<NotificationService> logger)
    {
        _repo = repo;
        _tenant = tenant;
        _hub = hub;
        _logger = logger;
    }

    public async Task<IReadOnlyList<NotificationViewDto>> GetAllAsync(int take, CancellationToken ct = default)
    {
        var all = await _repo.GetAllAsync(_ => true);
        return all
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .Select(n => n.ToView())
            .ToList();
    }

    public async Task MarkAsReadAsync(Guid id, CancellationToken ct = default)
    {
        var notification = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Notification not found.");
        if (notification.ReadAt is null)
        {
            notification.ReadAt = DateTimeOffset.UtcNow;
            await _repo.UpdateAsync(notification);
        }
    }

    public async Task NotifyAsync(
        string type,
        string title,
        string? message,
        string? entityType,
        Guid? entityId,
        CancellationToken ct = default)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            RestaurantId = _tenant.RestaurantId!,
            LocationId = _tenant.LocationId!,
            Type = type,
            Title = title,
            Message = message,
            EntityType = entityType,
            EntityId = entityId,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _repo.CreateAsync(notification);

        // Persistence is the source of truth; a dropped live push just means the
        // client picks the notification up on its next GET, so failures here are
        // logged, never thrown - they must not fail the caller's table operation.
        try
        {
            await _hub.Clients.Group(FloorGroups.TenantGroup(_tenant.RestaurantId!, _tenant.LocationId!))
                .SendAsync("NotificationReceived", new
                {
                    id = notification.Id,
                    type = notification.Type,
                    title = notification.Title,
                    message = notification.Message,
                    entityType = notification.EntityType,
                    entityId = notification.EntityId,
                    createdAt = notification.CreatedAt,
                    readAt = notification.ReadAt
                }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to push NotificationReceived for {NotificationId}", notification.Id);
        }
    }
}
