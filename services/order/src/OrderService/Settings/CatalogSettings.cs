namespace OrderService.Settings;

/// <summary>Where to reach catalog for the one synchronous call this service makes - resolving
/// modifier prices at diner checkout. See <c>CatalogMenuClient</c> for why it is a call and not
/// a projection.</summary>
public class CatalogSettings
{
    public string BaseUrl { get; init; } = null!;
}
