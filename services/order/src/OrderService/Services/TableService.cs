// Services/TableService.cs
using Common.Library;
using MongoDB.Driver; // for MongoWriteException
using System.Linq.Expressions;
using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Services; 

public class TableService : ITableService
{
    private readonly IRepository<DiningTable> _tables;

    public TableService(IRepository<DiningTable> tables) => _tables = tables;

    public async Task<TableDto> CreateAsync(CreateTableDto dto, CancellationToken ct = default)
    {
        var table = new DiningTable
        {
            Id = Guid.NewGuid(),
            TableNumber = dto.TableNumber,
            Status = "Available",
            ServerId = dto.ServerId
        };

        try
        {
            await _tables.CreateAsync(table);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new InvalidOperationException($"Table {dto.TableNumber} already exists.");
        }

        return ToDto(table);
    }

    public async Task<IReadOnlyCollection<TableDto>> GetAsync(string? status = null, bool? hasServer = null, CancellationToken ct = default)
    {
        // build Mongo-translatable filter
        Expression<Func<DiningTable, bool>> filter = t => true;

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalized = NormalizeStatusOrNull(status);
            if (normalized is null) throw new ArgumentException($"Invalid status. Allowed: {string.Join(", ", DiningTable.AllowedStatuses)}");
            var lower = normalized.ToLowerInvariant();
            filter = filter.And(t => t.Status != null && t.Status.ToLower() == lower);
        }

        if (hasServer is not null)
        {
            filter = hasServer.Value
                ? filter.And(t => t.ServerId != null)
                : filter.And(t => t.ServerId == null);
        }

        var results = await _tables.GetAllAsync(filter);
        return results.Select(ToDto).ToArray();
    }

    public async Task<TableDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var table = await _tables.GetAsync(id);
        return table is null ? null : ToDto(table);
    }

    public async Task<TableStatusDto> GetStatusAsync(Guid id, CancellationToken ct = default)
    {
        var table = await _tables.GetAsync(id);
        if (table is null) throw new KeyNotFoundException("Table not found.");

        var normalized = NormalizeStatusOrNull(table.Status)
            ?? throw new InvalidOperationException($"Invalid status on record. Allowed: {string.Join(", ", DiningTable.AllowedStatuses)}");

        return new TableStatusDto(normalized);
    }

    public async Task UpdateStatusAsync(Guid id, string status, CancellationToken ct = default)
    {
        var normalized = NormalizeStatusOrNull(status)
            ?? throw new ArgumentException($"Invalid status. Allowed: {string.Join(", ", DiningTable.AllowedStatuses)}");

        var table = await _tables.GetAsync(id);
        if (table is null) throw new KeyNotFoundException("Table not found.");

        table.Status = normalized;
        await _tables.UpdateAsync(table);
    }

    public async Task AssignServerAsync(Guid id, Guid? serverId, CancellationToken ct = default)
    {
        var table = await _tables.GetAsync(id);
        if (table is null) throw new KeyNotFoundException("Table not found.");

        table.ServerId = serverId; // null clears
        await _tables.UpdateAsync(table);
    }

    public async Task AssignSelfAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var table = await _tables.GetAsync(id);
        if (table is null) throw new KeyNotFoundException("Table not found.");

        if (table.ServerId is not null && table.ServerId != userId)
            throw new InvalidOperationException("Table already assigned to another server.");

        table.ServerId = userId;
        await _tables.UpdateAsync(table);
    }

    public async Task UnassignSelfAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var table = await _tables.GetAsync(id);
        if (table is null) throw new KeyNotFoundException("Table not found.");

        if (table.ServerId != userId)
            throw new InvalidOperationException("You are not assigned to this table.");

        table.ServerId = null;
        await _tables.UpdateAsync(table);
    }

    public async Task ClearAsync(Guid id, CancellationToken ct = default)
    {
        var table = await _tables.GetAsync(id);
        if (table is null) throw new KeyNotFoundException("Table not found.");

        table.Status = "Available";
        table.ActiveCartId = null;
        table.ServerId = null; // ← also clear server
        await _tables.UpdateAsync(table);
    }

    // helpers
    private static string? NormalizeStatusOrNull(string? value)
        => DiningTable.AllowedStatuses.FirstOrDefault(s => s.Equals(value, StringComparison.OrdinalIgnoreCase));

    private static TableDto ToDto(DiningTable t)
        => new(t.Id, t.TableNumber, t.Status, t.ActiveCartId, t.ServerId);
}

// small Expression helper so composing filters is easy
static class Expr
{
    public static Expression<Func<T, bool>> And<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var param = Expression.Parameter(typeof(T));
        var body = Expression.AndAlso(
            Expression.Invoke(left, param),
            Expression.Invoke(right, param));
        return Expression.Lambda<Func<T, bool>>(body, param);
    }
}
