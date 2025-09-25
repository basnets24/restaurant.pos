namespace IdentityService.Services;

/// <summary>
/// Read-only interface for tenant membership and role directory operations.
/// Internal abstraction to decouple claim providers from direct EF access.
/// </summary>
public interface ITenantDirectory
{
    /// <summary>
    /// Get the most recent membership for a user, or null if none exists.
    /// </summary>
    Task<TenantMembershipResult?> GetPrimaryMembershipAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Get the default or fallback location ID for a restaurant, or null if none active.
    /// </summary>
    Task<string?> GetDefaultLocationAsync(string restaurantId, string? preferredLocationId = null, CancellationToken ct = default);

    /// <summary>
    /// Get all role names for a user within a specific restaurant.
    /// </summary>
    Task<IReadOnlyList<string>> GetUserRolesAsync(Guid userId, string restaurantId, CancellationToken ct = default);
}

/// <summary>
/// Represents a tenant membership record for directory operations.
/// </summary>
public record TenantMembershipResult(
    string RestaurantId,
    string? DefaultLocationId,
    DateTime CreatedUtc
);