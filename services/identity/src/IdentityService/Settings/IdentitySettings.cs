namespace IdentityService.Settings;

public class IdentitySettings
{
    public string AdminUserEmail { get; init; } = "";

    public string AdminUserPassword { get; init; } = "";

    public string RestaurantId { get; set; } = "Global";

    public string LocationId { get; set; } = "Global";

    public string PathBase { get; init; } = "/identity-svc";

    public string CertificateCerFilePath { get; init; } = "";

    public string CertificateKeyFilePath { get; init; } = "";
    
}