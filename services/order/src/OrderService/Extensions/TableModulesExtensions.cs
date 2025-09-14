using OrderService.Hubs;
using OrderService.Interfaces;
using OrderService.Services;

namespace OrderService;

public static class TableModulesExtensions
{
    
    public static void AddTablesModule(this IServiceCollection services)
    {
    // CORS for SignalR (allow your UI origins)
        services.AddCors(opt =>
        {
            opt.AddPolicy("frontend", b => b
                .WithOrigins(
                    "http://localhost:5173" // Vite/Next dev
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials());
        });


    // SignalR with useful defaults (JSON casing preserved)
        services.AddSignalR(options =>
            {
                options.EnableDetailedErrors = true;
                options.KeepAliveInterval = TimeSpan.FromSeconds(15);
                options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
            })
            .AddJsonProtocol(o =>
            {
                o.PayloadSerializerOptions.PropertyNamingPolicy = null;
            });
        
        // .AddStackExchangeRedis("localhost:6379", opt => { opt.Configuration.ChannelPrefix = "signalr"; }); // optional scale-out

    
        services.AddScoped<IDiningTableService, DiningTableService>();
    }
    
    public static void MapTablesModule(this WebApplication app)
    {
    // Ensure app.UseRouting() / app.UseAuthentication() / app.UseAuthorization() is configured in Program.cs
    // Apply CORS to the hub endpoint
        app.MapHub<FloorHub>("/hubs/floor").RequireCors("frontend");
    }
    
    
}