namespace Common.Library.Settings;

public class MongoDbSettings
{
    public string Host { get; init; } = null!; 
    public int Port { get; init; }

    public string? ConnectionString { get; set; } 
    
    public string GetConnectionString()
    {
        return string.IsNullOrWhiteSpace(ConnectionString)
            ? $"mongodb://{Host}:{Port}"
            : ConnectionString;
    }
    

}