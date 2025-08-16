using Duende.IdentityServer.Models;

namespace IdentityService.Settings;

public class IdentityServerSettings
{
    public IReadOnlyCollection<ApiScope> ApiScopes { get; init; } = [];
    public IReadOnlyCollection<ApiResource> ApiResources { get; init; } = [];
    public IReadOnlyCollection<Client> Clients { get; init; } = [];

    public IReadOnlyCollection<IdentityResource> IdentityResources =>
    [
            new IdentityResources.OpenId(),
            new IdentityResources.Profile(),
            new IdentityResource("roles", ["role"])
    ];

}