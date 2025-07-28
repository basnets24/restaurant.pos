using Common.Library.Settings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace Common.Library.Logging;

public static class Extensions
{
    public static IServiceCollection AddSeqLogging(
        this IServiceCollection services, 
        IConfiguration config)
    {
        var seqSettings = config.GetRequiredSection(nameof(SeqSettings)).Get<SeqSettings>();

        Log.Logger = new LoggerConfiguration()
            .Enrich.FromLogContext()
            .WriteTo.Console()
            .WriteTo.Seq(seqSettings!.ServerUrl)
            .CreateLogger();

        return services;
    }
}