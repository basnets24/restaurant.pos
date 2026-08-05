namespace Tenant.Domain.Settings;

public class PostgresSettings
{
    public string Host { get; set; } = null!;
    public int Port { get; set; }
    public string Database { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;

    private string? _connectionString;

    public string ConnectionString
    {
        get => _connectionString ??= GetConnectionString();
        set => _connectionString = value;
    }

    public string GetConnectionString()
    {
        if (!string.IsNullOrWhiteSpace(_connectionString))
        {
            return _connectionString;
        }

        // Trust Server Certificate is needed because the ASP.NET base container images'
        // minimal CA bundle can fail to validate Supabase's cert chain otherwise.
        return $"Host={Host};Port={Port};Database={Database};Username={Username};Password={Password};SSL Mode=Require;Trust Server Certificate=true";
    }
}
