namespace TenantService.Settings;

public class PostgresSettings
{
    public string Host { get; set; } = null!;
    public int Port { get; set; }
    public string Database { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;

    private string _connectionString = null!;

    public string ConnectionString
    {
        get => _connectionString ??= GetConnectionString();
        set => _connectionString = value;
    }

    public string GetConnectionString()
    {
        // If ConnectionString is directly set (from env var), use it
        if (!string.IsNullOrEmpty(_connectionString))
            return _connectionString;

        // Otherwise, build from individual components
        return $"Host={Host};Port={Port};Database={Database};Username={Username};Password={Password}";
    }
}

