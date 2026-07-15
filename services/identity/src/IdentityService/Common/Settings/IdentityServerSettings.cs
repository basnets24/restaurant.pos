using Duende.IdentityServer.Models;
using IdentityService.Features.Tenancy.Services;

namespace IdentityService.Common.Settings;

public class IdentityServerSettings
{
    public IReadOnlyCollection<ApiScope> ApiScopes { get; init; } = [];
    public IReadOnlyCollection<ApiResource> ApiResources { get; init; } = [];
    public IReadOnlyCollection<Client> Clients { get; init; } = [];

    public IReadOnlyCollection<IdentityResource> IdentityResources =>
    [
            new IdentityResources.OpenId(),
            new IdentityResources.Profile(),
            new IdentityResource("roles", ["role"]),
            new IdentityResource("tenancy", [
                TenantProfileService.RestaurantIdClaim,
                TenantProfileService.LocationIdClaim
            ])
    ];
}
