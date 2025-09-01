namespace Common.Library.Tenancy;

public sealed class TenantContext : ITenantContext
{
    public string RestaurantId { get; init; } = default!;
    public string LocationId { get; init; } = default!;
}