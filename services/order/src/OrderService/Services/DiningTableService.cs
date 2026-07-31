// Services/DiningTableService.cs
using System.Globalization;
using Common.Library;                 // IRepository<T>
using Common.Library.Tenancy;        // ITenantContext
using Microsoft.AspNetCore.SignalR;
using OrderService.Dtos;
using OrderService.Entities;         // DiningTable
using OrderService.Exceptions;
using OrderService.Interfaces;       // IDiningTableService
using OrderService.Hubs;             // FloorHub  (adjust to your hub namespace)

namespace OrderService.Services;

public class DiningTableService : IDiningTableService
{
    private readonly IRepository<DiningTable> _repo;
    private readonly ITenantContext _tenant;
    private readonly IHubContext<FloorHub> _hub;
    private readonly INotificationService _notifications;
    private readonly ICartService _cartService;

    public DiningTableService(
        IRepository<DiningTable> repo,
        ITenantContext tenant,
        IHubContext<FloorHub> hub,
        INotificationService notifications,
        ICartService cartService)
    {
        _repo   = repo;
        _tenant = tenant;
        _hub    = hub;
        _notifications = notifications;
        _cartService = cartService;
    }

    // Maps a post-update table's status to the matching notification, or null
    // for statuses that aren't reachable via DiningTableStatus.Normalize.
    private Task NotifyStatusChangeAsync(DiningTable t, CancellationToken ct)
    {
        (string Type, string Title)? notification = t.Status switch
        {
            DiningTableStatus.Occupied  => (NotificationType.TableSeated, $"Table {t.Number} seated — party of {t.PartySize}"),
            DiningTableStatus.Available => (NotificationType.TableAvailable, $"Table {t.Number} is now available"),
            DiningTableStatus.Reserved  => (NotificationType.TableReserved, $"Table {t.Number} reserved"),
            DiningTableStatus.Dirty     => (NotificationType.TableDirty, $"Table {t.Number} needs cleaning"),
            _ => null
        };

        return notification is { } n
            ? _notifications.NotifyAsync(n.Type, n.Title, null, "DiningTable", t.Id, ct)
            : Task.CompletedTask;
    }

    private string GroupKey() => FloorGroups.TenantGroup(_tenant.RestaurantId, _tenant.LocationId);

    private static TableViewDto ToView(DiningTable t) => new(
        Id:           t.Id,
        Number:       t.Number ,
        Section:      t.Section ?? string.Empty,
        Seats:        t.Seats,
        Shape:        t.Shape ?? "square",
        Status:       (t.Status ?? DiningTableStatus.Available).ToLowerInvariant(), // UI likes lower-case
        Position:     new PositionDto(t.X, t.Y),
        Size:         new SizeDto(t.Width, t.Height),
        PartySize:    t.PartySize,
        Version:      t.Version,
        ActiveCartId: t.ActiveCartId,
        ServerId:     t.ServerId
    );

    // ===========================
    // Reads
    // ===========================
    public async Task<IReadOnlyList<TableViewDto>> GetAllAsync(CancellationToken ct)
    {
        var all = await _repo.GetAllAsync(_ => true);
        return all.Select(ToView).ToList();
    }

    public async Task<TableViewDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var t = await _repo.GetAsync(id);
        return t is null ? null : ToView(t);
    }

    // ===========================
    // Runtime ops
    // ===========================

    // Seating a party and opening its order are one business event, not two -
    // this does both atomically (status+partySize, then cart creation+link) in a
    // single call so callers never need to separately re-assert table state
    // after creating the cart (that split was the root cause of a duplicate-
    // notification bug: two components each defensively re-writing state the
    // other had already set).
    public async Task<Guid> SeatAsync(Guid id, SeatPartyDto dto, CancellationToken ct)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");
        if (t.Status == DiningTableStatus.Occupied && t.ActiveCartId is not null)
            throw new ConflictException($"Table {t.Number} is already occupied.");

        t.Status = DiningTableStatus.Occupied;
        t.PartySize = dto.PartySize;
        await _repo.UpdateAsync(t);

        // CartService.CreateAsync links the new cart as this table's ActiveCartId
        // itself (shares this request's DbContext, so it sees the status/partySize
        // write above rather than a stale copy).
        var cart = await _cartService.CreateAsync(
            tableId: id, customerId: null, serverId: null, serverName: null, guestCount: dto.PartySize);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableStatusChanged", new
        {
            tableId  = id,
            status   = "occupied",
            partySize = t.PartySize
        }, ct);

        await NotifyStatusChangeAsync(t, ct);

        return cart.Id;
    }

    public async Task SetStatusAsync(Guid id, SetTableStatusDto dto, CancellationToken ct)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");

        var normalized = DiningTableStatus.Normalize(dto.Status);
        if (normalized == DiningTableStatus.Occupied && dto.PartySize is null)
            throw new ArgumentException("partySize is required when status = occupied.");

        // Any move away from Occupied detaches the table's order, whichever
        // status it's headed to (Available, Reserved, or Dirty) - so guard all
        // of them the same way, not just Available: if the linked cart already
        // has items, refuse rather than silently orphaning an open check. An
        // empty cart has nothing worth protecting and falls through.
        if (normalized != DiningTableStatus.Occupied && t.ActiveCartId is { } activeCartId)
        {
            Cart? activeCart = null;
            try { activeCart = await _cartService.GetAsync(activeCartId); }
            catch (KeyNotFoundException) { /* stale/phantom link - nothing to protect */ }

            if (activeCart is not null && activeCart.Items.Count > 0)
                throw new ConflictException(
                    $"Table {t.Number} still has items on its order - clear the table before changing its status.");
        }

        var newPartySize = normalized == DiningTableStatus.Available ? null : dto.PartySize;
        var changed = t.Status != normalized || t.PartySize != newPartySize;

        t.Status    = normalized;
        t.PartySize = newPartySize;

        if (normalized != DiningTableStatus.Occupied)
            t.ActiveCartId = null; // released above (guarded when the cart still had items)

        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableStatusChanged", new
        {
            tableId  = id,
            status   = t.Status.ToLowerInvariant(),
            partySize = t.PartySize
        }, ct);

        // Callers occasionally re-assert a status that's already set (e.g. MenuPage
        // re-marking a table occupied after TablesPage's Seat Party already did) -
        // only notify when something actually changed, or every redundant call
        // would surface as a duplicate notification.
        if (changed)
            await NotifyStatusChangeAsync(t, ct);
    }

    public async Task LinkOrderAsync(Guid id, Guid cartId, CancellationToken ct = default)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");
        t.ActiveCartId = cartId;
        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey())
            .SendAsync("OrderLinked", new { tableId = id, orderId = cartId }, ct);
    }

    public async Task UnlinkOrderAsync(Guid id, Guid cartId, CancellationToken ct = default)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");
        var wasLinked = t.ActiveCartId == cartId;
        if (wasLinked) t.ActiveCartId = null;
        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey())
            .SendAsync("OrderUnlinked", new { tableId = id, orderId = cartId }, ct);

        if (wasLinked)
        {
            await _notifications.NotifyAsync(
                NotificationType.OrderUnlinked,
                $"Order unlinked from Table {t.Number}",
                null, "DiningTable", t.Id, ct);
        }
    }

    public async Task ClearAsync(Guid id, CancellationToken ct)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");
        var alreadyClear = t.Status == DiningTableStatus.Available && t.PartySize is null && t.ActiveCartId is null;

        t.Status      = DiningTableStatus.Available;
        t.PartySize   = null;
        t.ActiveCartId = null;

        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableStatusChanged", new
        {
            tableId = id,
            status  = "available",
            partySize = (int?)null
        }, ct);

        if (!alreadyClear)
        {
            await _notifications.NotifyAsync(
                NotificationType.TableCleared,
                $"Table {t.Number} cleared and ready",
                null, "DiningTable", t.Id, ct);
        }
    }

    // ===========================
    // Layout ops
    // ===========================
    public async Task<string> CreateAsync(CreateTableDto dto, CancellationToken ct)
    {
        // Accept either Number (string), depending on your DTO
        var numberString = !string.IsNullOrWhiteSpace(dto.Number);

        var t = new DiningTable
        {
            Id           = Guid.NewGuid(),
            RestaurantId = _tenant.RestaurantId!,
            LocationId   = _tenant.LocationId!,
            Number       = dto.Number,
            Section      = dto.Section ?? string.Empty,
            Seats        = dto.Seats <= 0 ? 4 : dto.Seats,
            Shape        = dto.Shape ?? "square",
            X            = dto.Position?.X ?? 0,
            Y            = dto.Position?.Y ?? 0,
            Width        = dto.Size?.Width ?? 100,
            Height       = dto.Size?.Height ?? 100,
            Rotation     = 0,
            Status       = DiningTableStatus.Available,
            Version      = 0
        };

        await _repo.CreateAsync(t);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableLayoutChanged", new
        {
            tableId  = t.Id,
            x        = t.X,
            y        = t.Y,
            width    = t.Width,
            height   = t.Height,
            rotation = t.Rotation,
            version  = t.Version,
            shape    = t.Shape
        }, ct);

        return t.Id.ToString();
    }

    public async Task UpdateLayoutAsync(Guid id, UpdateTableLayoutDto dto, CancellationToken ct)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");

        // optimistic concurrency via Version
        if (t.Version != dto.Version)
            throw new ConflictException("Version conflict.");

        t.X = dto.X;
        t.Y = dto.Y;
        if (dto.Width.HasValue)  t.Width  = dto.Width.Value;
        if (dto.Height.HasValue) t.Height = dto.Height.Value;
        t.Shape    = dto.Shape ?? t.Shape;
        t.Rotation = dto.Rotation;
        if (dto.Number is not null)  t.Number  = dto.Number;
        if (dto.Section is not null) t.Section = dto.Section;
        if (dto.Seats.HasValue)      t.Seats   = dto.Seats.Value;
        t.Version++;

        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableLayoutChanged", new
        {
            tableId  = id,
            x        = t.X,
            y        = t.Y,
            width    = t.Width,
            height   = t.Height,
            rotation = t.Rotation,
            version  = t.Version,
            shape    = t.Shape,
            number   = t.Number,
            section  = t.Section,
            seats    = t.Seats
        }, ct);
    }

    public async Task BulkUpdateLayoutAsync(BulkLayoutUpdateDto dto, CancellationToken ct)
    {
        foreach (var i in dto.Items)
        {
            var t = await _repo.GetAsync(i.Id) ?? throw new KeyNotFoundException($"Table {i.Id} not found.");
            if (t.Version != i.Version)
                throw new ConflictException($"Version conflict for table {i.Id}.");

            t.X = i.X; t.Y = i.Y;
            if (i.Width.HasValue)  t.Width  = i.Width.Value;
            if (i.Height.HasValue) t.Height = i.Height.Value;
            t.Shape    = i.Shape ?? t.Shape;
            t.Rotation = i.Rotation;
            if (i.Number is not null)  t.Number  = i.Number;
            if (i.Section is not null) t.Section = i.Section;
            if (i.Seats.HasValue)      t.Seats   = i.Seats.Value;
            t.Version++;

            await _repo.UpdateAsync(t);

            await _hub.Clients.Group(GroupKey()).SendAsync("TableLayoutChanged", new
            {
                tableId  = i.Id,
                x        = t.X,
                y        = t.Y,
                width    = t.Width,
                height   = t.Height,
                rotation = t.Rotation,
                version  = t.Version,
                shape    = t.Shape,
                number   = t.Number,
                section  = t.Section,
                seats    = t.Seats
            }, ct);
        }
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var existing = await _repo.GetAsync(id);
        if (existing is null) throw new KeyNotFoundException("Table not found.");

        await _repo.DeleteAsync(id);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableRemoved", new { tableId = id }, ct);

        await _notifications.NotifyAsync(
            NotificationType.TableRemoved,
            $"Table {existing.Number} removed from floor plan",
            null, "DiningTable", id, ct);
    }

    // ===========================
    // Join / Split (optional)
    // ===========================
    public async Task<string> JoinAsync(JoinTablesDto dto, CancellationToken ct)
    {
        var groupId = Guid.NewGuid().ToString("n");
        var numbers = new List<string>();

        foreach (var tableId in dto.TableIds)
        {
            var t = await _repo.GetAsync(tableId) ?? throw new KeyNotFoundException($"Table {tableId} not found.");
            t.GroupId    = groupId;
            t.GroupLabel = dto.GroupLabel;
            await _repo.UpdateAsync(t);
            numbers.Add(t.Number);
        }

        await _hub.Clients.Group(GroupKey()).SendAsync("TablesJoined", new
        {
            groupId,
            tableIds = dto.TableIds
        }, ct);

        var label = string.IsNullOrWhiteSpace(dto.GroupLabel) ? "a group" : $"\"{dto.GroupLabel}\"";
        await _notifications.NotifyAsync(
            NotificationType.TablesJoined,
            $"Tables {string.Join(", ", numbers)} joined as {label}",
            null, "DiningTableGroup", null, ct);

        return groupId;
    }

    public async Task SplitAsync(SplitTablesDto dto, CancellationToken ct)
    {
        // naive scan; replace with predicate-update if your IRepository supports it
        var all      = await _repo.GetAllAsync(_ => true);
        var affected = all.Where(t => t.GroupId == dto.GroupId).ToList();
        var numbers  = affected.Select(t => t.Number).ToList();

        foreach (var t in affected)
        {
            t.GroupId = null;
            t.GroupLabel = null;
            await _repo.UpdateAsync(t);
        }

        await _hub.Clients.Group(GroupKey()).SendAsync("TablesSplit", new { groupId = dto.GroupId }, ct);

        await _notifications.NotifyAsync(
            NotificationType.TablesSplit,
            $"Tables {string.Join(", ", numbers)} split apart",
            null, "DiningTableGroup", null, ct);
    }
}
