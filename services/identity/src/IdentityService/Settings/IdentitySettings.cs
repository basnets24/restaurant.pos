namespace IdentityService.Settings;

public class IdentitySettings
{
    public string AdminUserEmail { get; init; } = "";

    public string AdminUserPassword { get; init; } = ""; 
    
    public string RestaurantId { get; set; } = "";
    
    public string LocationId   { get; set; } = "";
}