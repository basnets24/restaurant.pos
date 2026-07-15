namespace IdentityService.Tenancy.Services.TenantClaims;

public record TenantClaimResult(string? RestaurantId, string? LocationId, IReadOnlyCollection<string> Roles);

public interface ITenantClaimsProvider
{
    Task<TenantClaimResult?> GetAsync(Guid userId, CancellationToken ct);
}

