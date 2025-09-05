// Services/DiningTableService.cs
using System.Globalization;
using Common.Library;                 // IRepository<T>
using Common.Library.Tenancy;        // ITenantContext
using Microsoft.AspNetCore.SignalR;
using OrderService.Dtos;
using OrderService.Entities;         // DiningTable
using OrderService.Interfaces;       // IDiningTableService
using OrderService.Hubs;             // FloorHub  (adjust to your hub namespace)

namespace OrderService.Services;

public class DiningTableService : IDiningTableService
{
    private readonly IRepository<DiningTable> _repo;
    private readonly ITenantContext _tenant;
    private readonly IHubContext<FloorHub> _hub;

    public DiningTableService(IRepository<DiningTable> repo, ITenantContext tenant, IHubContext<FloorHub> hub)
    {
        _repo   = repo;
        _tenant = tenant;
        _hub    = hub;
    }

    private string GroupKey() => $"tenant:{_tenant.RestaurantId}:loc:{_tenant.LocationId}";

    private static string NormalizeStatusOrThrow(string status)
    {
        var s = (status ?? string.Empty).Trim().ToLowerInvariant();
        return s switch
        {
            "available" => "Available",
            "reserved"  => "Reserved",
            "occupied"  => "Occupied",
            "dirty"     => "Dirty",
            _           => throw new ArgumentException("Invalid status. Use: available|reserved|occupied|dirty.")
        };
    }

    private static TableViewDto ToView(DiningTable t) => new(
        Id:           t.Id,
        Number:       t.Number.ToString() ,
        Section:      t.Section ?? string.Empty,
        Seats:        t.Seats,
        Shape:        t.Shape ?? "square",
        Status:       (t.Status ?? "Available").ToLowerInvariant(), // UI likes lower-case
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
    public async Task SetStatusAsync(Guid id, SetTableStatusDto dto, CancellationToken ct)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");

        var normalized = NormalizeStatusOrThrow(dto.Status);
        if (normalized == "Occupied" && dto.PartySize is null)
            throw new ArgumentException("partySize is required when status = occupied.");

        t.Status    = normalized;
        t.PartySize = normalized == "Available" ? null : dto.PartySize;

        if (normalized == "Available")
            t.ActiveCartId = null; // clearing order/cart link on available

        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableStatusChanged", new
        {
            tableId  = id,
            status   = t.Status.ToLowerInvariant(),
            partySize = t.PartySize
        }, ct);
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
        if (t.ActiveCartId == cartId) t.ActiveCartId = null;
        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey())
            .SendAsync("OrderUnlinked", new { tableId = id, orderId = cartId }, ct);
    }

    public async Task ClearAsync(Guid id, CancellationToken ct)
    {
        var t = await _repo.GetAsync(id) ?? throw new KeyNotFoundException("Table not found.");
        t.Status      = "Available";
        t.PartySize   = null;
        t.ActiveCartId = null;

        await _repo.UpdateAsync(t);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableStatusChanged", new
        {
            tableId = id,
            status  = "available",
            partySize = (int?)null
        }, ct);
    }

    // ===========================
    // Layout ops
    // ===========================
    public async Task<string> CreateAsync(CreateTableDto dto, CancellationToken ct)
    {
        // Accept either Number (string) or TableNumber (int) depending on your DTO
        var numberString = !string.IsNullOrWhiteSpace(dto.Number);

        var t = new DiningTable
        {
            Id           = Guid.NewGuid(),
            RestaurantId = _tenant.RestaurantId!,
            LocationId   = _tenant.LocationId!,
            Number       = int.Parse(dto.Number),
            Section      = dto.Section ?? string.Empty,
            Seats        = dto.Seats <= 0 ? 4 : dto.Seats,
            Shape        = dto.Shape ?? "square",
            X            = dto.Position?.X ?? 0,
            Y            = dto.Position?.Y ?? 0,
            Width        = dto.Size?.Width ?? 100,
            Height       = dto.Size?.Height ?? 100,
            Rotation     = 0,
            Status       = "Available",
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
            throw new InvalidOperationException("Version conflict.");

        t.X = dto.X;
        t.Y = dto.Y;
        if (dto.Width.HasValue)  t.Width  = dto.Width.Value;
        if (dto.Height.HasValue) t.Height = dto.Height.Value;
        t.Shape    = dto.Shape ?? t.Shape;
        t.Rotation = dto.Rotation;
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
            shape    = t.Shape
        }, ct);
    }

    public async Task BulkUpdateLayoutAsync(BulkLayoutUpdateDto dto, CancellationToken ct)
    {
        foreach (var i in dto.Items)
        {
            var t = await _repo.GetAsync(i.Id) ?? throw new KeyNotFoundException($"Table {i.Id} not found.");
            if (t.Version != i.Version)
                throw new InvalidOperationException($"Version conflict for table {i.Id}.");

            t.X = i.X; t.Y = i.Y;
            if (i.Width.HasValue)  t.Width  = i.Width.Value;
            if (i.Height.HasValue) t.Height = i.Height.Value;
            t.Shape    = i.Shape ?? t.Shape;
            t.Rotation = i.Rotation;
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
                shape    = t.Shape
            }, ct);
        }
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var existing = await _repo.GetAsync(id);
        if (existing is null) throw new KeyNotFoundException("Table not found.");

        await _repo.DeleteAsync(id);

        await _hub.Clients.Group(GroupKey()).SendAsync("TableRemoved", new { tableId = id }, ct);
    }

    // ===========================
    // Join / Split (optional)
    // ===========================
    public async Task<string> JoinAsync(JoinTablesDto dto, CancellationToken ct)
    {
        var groupId = Guid.NewGuid().ToString("n");

        foreach (var tableId in dto.TableIds)
        {
            var t = await _repo.GetAsync(tableId) ?? throw new KeyNotFoundException($"Table {tableId} not found.");
            t.GroupId    = groupId;
            t.GroupLabel = dto.GroupLabel;
            await _repo.UpdateAsync(t);
        }

        await _hub.Clients.Group(GroupKey()).SendAsync("TablesJoined", new
        {
            groupId,
            tableIds = dto.TableIds
        }, ct);

        return groupId;
    }

    public async Task SplitAsync(SplitTablesDto dto, CancellationToken ct)
    {
        // naive scan; replace with predicate-update if your IRepository supports it
        var all      = await _repo.GetAllAsync(_ => true);
        var affected = all.Where(t => t.GroupId == dto.GroupId).ToList();

        foreach (var t in affected)
        {
            t.GroupId = null;
            t.GroupLabel = null;
            await _repo.UpdateAsync(t);
        }

        await _hub.Clients.Group(GroupKey()).SendAsync("TablesSplit", new { groupId = dto.GroupId }, ct);
    }
}
