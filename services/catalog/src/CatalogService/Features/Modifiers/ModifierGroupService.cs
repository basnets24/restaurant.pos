using CatalogService.Data;
using CatalogService.Entities;
using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Menu;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Features.Modifiers;

public interface IModifierGroupService
{
    /// <summary>Null return means the menu item does not exist (or isn't this tenant's) -
    /// the controller turns that into a 404.</summary>
    Task<IReadOnlyList<ModifierGroupDto>?> GetForMenuItemAsync(Guid menuItemId, CancellationToken ct = default);
    Task<ModifierGroupDto?> CreateAsync(Guid menuItemId, UpsertModifierGroupDto dto, CancellationToken ct = default);
    Task<ModifierGroupDto?> UpdateAsync(Guid groupId, UpsertModifierGroupDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid groupId, CancellationToken ct = default);
}

/// <summary>
/// Staff CRUD for a menu item's modifier groups. Goes straight at <see cref="CatalogDbContext"/>
/// rather than the generic <c>IRepository&lt;T&gt;</c> - the same reason <c>PublicMenuService</c>
/// does: the repository has no <c>Include</c> support and no way to diff a nested Options
/// collection on save.
///
/// After every write this republishes the menu item's <b>full current</b> modifier set as
/// <see cref="MenuItemModifiersChanged"/> - a snapshot, not a delta - so order's read-model
/// projector never has to diff or reason about arrival order.
/// </summary>
public class ModifierGroupService : IModifierGroupService
{
    private readonly CatalogDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IPublishEndpoint _publish;

    public ModifierGroupService(CatalogDbContext db, ITenantContext tenant, IPublishEndpoint publish)
    {
        _db = db;
        _tenant = tenant;
        _publish = publish;
    }

    public async Task<IReadOnlyList<ModifierGroupDto>?> GetForMenuItemAsync(Guid menuItemId, CancellationToken ct = default)
    {
        if (!await _db.MenuItems.AnyAsync(m => m.Id == menuItemId, ct)) return null;
        return await LoadSnapshotAsync(menuItemId, ct);
    }

    public async Task<ModifierGroupDto?> CreateAsync(Guid menuItemId, UpsertModifierGroupDto dto, CancellationToken ct = default)
    {
        if (!await _db.MenuItems.AnyAsync(m => m.Id == menuItemId, ct)) return null;

        var selectionType = ModifierSelectionTypes.Parse(dto.SelectionType)
            ?? throw new ArgumentException($"Invalid selectionType: {dto.SelectionType}");

        var displayOrder = await _db.ModifierGroups.Where(g => g.MenuItemId == menuItemId).CountAsync(ct);

        var group = new ModifierGroup
        {
            Id = Guid.NewGuid(),
            MenuItemId = menuItemId,
            Name = dto.Name.Trim(),
            SelectionType = selectionType,
            Required = dto.Required,
            DisplayOrder = displayOrder,
            RestaurantId = _tenant.RestaurantId,
            LocationId = _tenant.LocationId,
            Options = dto.Options.Select((o, i) => new ModifierOption
            {
                Id = Guid.NewGuid(),
                Name = o.Name.Trim(),
                PriceDelta = o.PriceDelta,
                IsDefault = o.IsDefault,
                DisplayOrder = i,
            }).ToList(),
        };

        _db.ModifierGroups.Add(group);
        await _db.SaveChangesAsync(ct);

        await PublishSnapshotAsync(menuItemId, ct);
        return ToDto(group);
    }

    public async Task<ModifierGroupDto?> UpdateAsync(Guid groupId, UpsertModifierGroupDto dto, CancellationToken ct = default)
    {
        var group = await _db.ModifierGroups
            .Include(g => g.Options)
            .FirstOrDefaultAsync(g => g.Id == groupId, ct);
        if (group is null) return null;

        var selectionType = ModifierSelectionTypes.Parse(dto.SelectionType)
            ?? throw new ArgumentException($"Invalid selectionType: {dto.SelectionType}");

        group.Name = dto.Name.Trim();
        group.SelectionType = selectionType;
        group.Required = dto.Required;

        // Full replace, diffed against submitted ids: anything not resubmitted is gone,
        // anything with no id is new, everything else is updated in place.
        var submittedIds = dto.Options.Where(o => o.Id is not null).Select(o => o.Id!.Value).ToHashSet();
        foreach (var stale in group.Options.Where(o => !submittedIds.Contains(o.Id)).ToList())
            _db.ModifierOptions.Remove(stale);

        var order = 0;
        foreach (var o in dto.Options)
        {
            var existing = o.Id is { } id ? group.Options.FirstOrDefault(x => x.Id == id) : null;
            if (existing is not null)
            {
                existing.Name = o.Name.Trim();
                existing.PriceDelta = o.PriceDelta;
                existing.IsDefault = o.IsDefault;
                existing.DisplayOrder = order;
            }
            else
            {
                group.Options.Add(new ModifierOption
                {
                    Id = Guid.NewGuid(),
                    ModifierGroupId = group.Id,
                    Name = o.Name.Trim(),
                    PriceDelta = o.PriceDelta,
                    IsDefault = o.IsDefault,
                    DisplayOrder = order,
                });
            }
            order++;
        }

        await _db.SaveChangesAsync(ct);

        await PublishSnapshotAsync(group.MenuItemId, ct);
        return ToDto(group);
    }

    public async Task<bool> DeleteAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await _db.ModifierGroups.FirstOrDefaultAsync(g => g.Id == groupId, ct);
        if (group is null) return false;

        var menuItemId = group.MenuItemId;
        // Options aren't loaded here - the DB's ON DELETE CASCADE (CatalogDbContext.cs) removes
        // them, the same way it does when the parent MenuItem itself is deleted.
        _db.ModifierGroups.Remove(group);
        await _db.SaveChangesAsync(ct);

        await PublishSnapshotAsync(menuItemId, ct);
        return true;
    }

    private async Task PublishSnapshotAsync(Guid menuItemId, CancellationToken ct)
    {
        var groups = await LoadSnapshotAsync(menuItemId, ct);
        await _publish.Publish(new MenuItemModifiersChanged(
            menuItemId,
            _tenant.RestaurantId,
            _tenant.LocationId,
            groups.Select(g => new ModifierGroupSnapshot(
                g.Id, g.Name, g.SelectionType, g.Required,
                g.Options.Select(o => new ModifierOptionSnapshot(o.Id, o.Name, o.PriceDelta, o.IsDefault)).ToList()
            )).ToList()
        ), ct);
    }

    private async Task<IReadOnlyList<ModifierGroupDto>> LoadSnapshotAsync(Guid menuItemId, CancellationToken ct)
    {
        var groups = await _db.ModifierGroups
            .AsNoTracking()
            .Where(g => g.MenuItemId == menuItemId)
            .Include(g => g.Options)
            .OrderBy(g => g.DisplayOrder)
            .ToListAsync(ct);

        return groups.Select(ToDto).ToList();
    }

    private static ModifierGroupDto ToDto(ModifierGroup g) => new(
        g.Id, g.MenuItemId, g.Name, g.SelectionType.ToString(), g.Required,
        g.Options.OrderBy(o => o.DisplayOrder).Select(o => new ModifierOptionDto(o.Id, o.Name, o.PriceDelta, o.IsDefault)).ToList()
    );
}
