// Services/ITableService.cs
using OrderService.Dtos;

namespace OrderService.Interfaces;
public interface IDiningTableService
{
// Reads
    Task<IReadOnlyList<TableViewDto>> GetAllAsync(CancellationToken ct);
    Task<TableViewDto?> GetByIdAsync(Guid id, CancellationToken ct);


// Runtime ops
    Task SetStatusAsync(Guid id, SetTableStatusDto dto, CancellationToken ct);
    Task LinkOrderAsync(Guid id, Guid cartId, CancellationToken ct = default);
    Task UnlinkOrderAsync(Guid id, Guid cartId, CancellationToken ct = default);
    Task ClearAsync(Guid id, CancellationToken ct);


// Layout ops
    Task<string> CreateAsync(CreateTableDto dto, CancellationToken ct);
    Task UpdateLayoutAsync(Guid id, UpdateTableLayoutDto dto, CancellationToken ct);
    Task BulkUpdateLayoutAsync(BulkLayoutUpdateDto dto, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);


// Join / Split (optional)
    Task<string> JoinAsync(JoinTablesDto dto, CancellationToken ct);
    Task SplitAsync(SplitTablesDto dto, CancellationToken ct);
}