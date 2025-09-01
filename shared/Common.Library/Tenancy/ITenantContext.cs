namespace Common.Library.Tenancy;

public interface ITenantContext
{
    string RestaurantId { get; }
    string LocationId { get; }
}