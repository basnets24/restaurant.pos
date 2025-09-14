namespace Common.Library.Tenancy;

//“This document belongs to Restaurant A.”
public interface ITenantEntity
{
    string RestaurantId { get; set; }
    string LocationId { get; set; }
}