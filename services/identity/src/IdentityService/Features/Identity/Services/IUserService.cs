using IdentityService.Features.Identity.DTOs;

namespace IdentityService.Features.Identity.Services;

/// <summary>
/// Service for managing user operations (authentication, user CRUD, role management).
/// Provides business logic for user-related operations.
/// </summary>
public interface IUserService
{
    /// <summary>Get current authenticated user's profile.</summary>
    Task<UserDto?> GetMeAsync(System.Security.Claims.ClaimsPrincipal user, CancellationToken ct = default);

    /// <summary>List users with pagination and optional filtering.</summary>
    Task<Paged<UserListItemDto>> ListUsersAsync(UsersQuery query, CancellationToken ct = default);

    /// <summary>Get user by ID.</summary>
    Task<UserDetailDto?> GetByIdAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Update user profile information.</summary>
    Task UpdateAsync(Guid userId, UserUpdateDto dto, CancellationToken ct = default);

    /// <summary>Disable/lock a user account.</summary>
    Task DisableAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Get all roles assigned to a user.</summary>
    Task<IReadOnlyCollection<string>> GetUserRolesAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Add roles to a user.</summary>
    Task AddRolesAsync(Guid userId, AddRolesDto dto, CancellationToken ct = default);

    /// <summary>Remove a role from a user.</summary>
    Task RemoveRoleAsync(Guid userId, string role, CancellationToken ct = default);

    /// <summary>Get all available roles in the system.</summary>
    Task<IReadOnlyCollection<string>> GetAllRolesAsync(CancellationToken ct = default);
}
