namespace Common.Library.Settings;

public class SeqSettings
{
    public string Host { get; init; } = null!;
    public int Port { get; init; }
    public string ServerUrl => $"http://{Host}:{Port}";
    
}