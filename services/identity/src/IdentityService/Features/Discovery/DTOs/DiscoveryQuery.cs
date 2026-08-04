namespace IdentityService.Features.Discovery.DTOs;

public enum DiscoverySort
{
    /// <summary>Stable source order. No ranking signal exists to personalise this.</summary>
    Recommended = 0,
    Distance = 1,
    Pickup = 2
}

public record DiscoveryQuery
{
    /// <summary>Case-insensitive substring match against restaurant name and cuisine.</summary>
    public string? Q { get; init; }

    /// <summary>Exact (case-insensitive) cuisine match. Listings with no cuisine set are
    /// excluded when this is supplied, and included when it isn't.</summary>
    public string? Cuisine { get; init; }

    public DiscoverySort Sort { get; init; } = DiscoverySort.Recommended;
}
