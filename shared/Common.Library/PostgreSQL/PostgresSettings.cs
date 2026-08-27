namespace Common.Library.PostgreSQL;

public class PostgresSettings
{
    public string Host { get; set; } = null!;
    public int Port { get; set; }
    public string Database { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
    public bool RequireSsl { get; set; }

    // Trust Server Certificate is needed because the ASP.NET base container images'
    // minimal CA bundle can fail to validate Supabase's cert chain otherwise. Local
    // dev's Postgres container has no SSL configured, so this is opt-in, not default.
    public string GetConnectionString()
    {
        var connectionString = $"Host={Host};Port={Port};Database={Database};Username={Username};Password={Password}";
        return RequireSsl ? $"{connectionString};SSL Mode=Require;Trust Server Certificate=true" : connectionString;
    }
}
