// Services/ITableService.cs
using System.Linq.Expressions;
using OrderService.Dtos;

public interface ITableService
{
    Task<TableDto> CreateAsync(CreateTableDto dto, CancellationToken ct = default);
    Task<IReadOnlyCollection<TableDto>> GetAsync(string? status = null, bool? hasServer = null, CancellationToken ct = default);
    Task<TableDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<TableStatusDto> GetStatusAsync(Guid id, CancellationToken ct = default);
    Task UpdateStatusAsync(Guid id, string status, CancellationToken ct = default);
    Task AssignServerAsync(Guid id, Guid? serverId, CancellationToken ct = default);
    Task AssignSelfAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task UnassignSelfAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task ClearAsync(Guid id, CancellationToken ct = default);
}