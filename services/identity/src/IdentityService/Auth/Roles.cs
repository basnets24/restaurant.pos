namespace IdentityService.Auth;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Chef = "Chef";
    public const string Cashier = "Cashier";
    public const string Server = "Server";
    public const string Manager = "Manager";
    
}

public static class TenantRoles
{
    public const string TenantAdmin = "Admin";
    public const string TenantManager = "Manager";
    public const string TenantServer = "Server";
    public const string TenantChef = "Chef";
    public const string TenantCashier = "Cashier";
    public const string TenantOwner = "Owner";
    public const string TenantHost = "Host";
}