namespace OrderService.Interfaces;

/// <summary>Resolves a restaurant/location's display names, which identity owns and this
/// service has no copy of. Used only to snapshot them onto a customer order summary.</summary>
public interface ITenantDirectoryClient
{
    /// <summary>Null when identity cannot answer - the caller is expected to carry on without
    /// the names rather than fail whatever it was doing.</summary>
    Task<TenantNames?> GetNamesAsync(string restaurantId, string locationId, CancellationToken ct = default);
}

public record TenantNames(string RestaurantName, string LocationName);
