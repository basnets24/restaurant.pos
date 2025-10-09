namespace IdentityService.Settings;

/// <summary>
/// Tenant service operation mode.
/// </summary>
public enum TenantServiceMode
{
    /// <summary>
    /// Use embedded EF Core queries directly against tenant database.
    /// </summary>
    Embedded,

    /// <summary>
    /// Use HTTP calls to external tenant service.
    /// </summary>
    Http
}

/// <summary>
/// Configuration options for tenant service integration.
/// </summary>
public sealed class TenantServiceOptions
{
    /// <summary>
    /// Operation mode for tenant data retrieval.
    /// </summary>
    public TenantServiceMode Mode { get; set; } = TenantServiceMode.Embedded;

    /// <summary>
    /// Base URL for HTTP mode. Required when Mode = Http.
    /// </summary>
    public string? BaseUrl { get; set; }

    /// <summary>
    /// Client ID for HTTP authentication. Required when Mode = Http.
    /// </summary>
    public string? ClientId { get; set; }

    /// <summary>
    /// Client secret for HTTP authentication. Required when Mode = Http.
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// OAuth scope for tenant claims access. Defaults to "tenant.claims.read".
    /// </summary>
    public string Scope { get; set; } = "tenant.claims.read";

    /// <summary>
    /// Authority URL for token acquisition in HTTP mode.
    /// </summary>
    public string? Authority { get; set; }
}