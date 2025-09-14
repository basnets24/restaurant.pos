namespace Common.Library.Tenancy;

// “I am Restaurant A.”
public interface ITenantContext
{
    string RestaurantId { get; }
    string LocationId { get; }
}