using Common.Library.PostgreSQL;
using IdentityService.Entities;

namespace IdentityService.Features.Identity.Repositories;

/// <summary>
/// Repository for user data access operations.
/// Extends the generic IEfRepository for user-specific queries.
/// </summary>
public interface IUserRepository : IEfRepository<ApplicationUser>
{
    /// <summary>Find user by email address.</summary>
    Task<ApplicationUser?> GetByEmailAsync(string email, CancellationToken ct = default);

    /// <summary>Get users in a specific role with pagination.</summary>
    Task<(IReadOnlyList<ApplicationUser> Items, long Total)> GetByRolePagedAsync(
        string role,
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>Search users by email, username, or display name with pagination.</summary>
    Task<(IReadOnlyList<ApplicationUser> Items, long Total)> SearchPagedAsync(
        string? searchTerm,
        string? role,
        int page,
        int pageSize,
        CancellationToken ct = default);
}
