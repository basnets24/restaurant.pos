namespace Common.Library.PostgreSQL;

public class PostgresSettings
{
    public string Host { get; set; } = null!;
    public int Port { get; set; }
    public string Database { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;

    // Trust Server Certificate is needed because the ASP.NET base container images'
    // minimal CA bundle can fail to validate Supabase's cert chain otherwise.
    public string GetConnectionString() =>
        $"Host={Host};Port={Port};Database={Database};Username={Username};Password={Password};SSL Mode=Require;Trust Server Certificate=true";
}
