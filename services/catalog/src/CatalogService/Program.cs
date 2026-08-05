using System.Reflection;
using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.MassTransit;
using Common.Library.OpenTelemetry;
using CatalogService.Auth;
using CatalogService.Consumers;
using CatalogService.Data;
using CatalogService.Entities;
using CatalogService.Features.Modifiers;
using CatalogService.Features.PublicMenu;
using Common.Library.PostgreSQL;
using Common.Library.Tenancy;
using Common.Library.Configuration;
using Common.Library.Settings;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using CatalogService.Services;
using Microsoft.OpenApi;
using OpenTelemetry.Metrics;
using Serilog;
using Common.Library.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddScoped<MenuStockService>();
builder.Services.AddScoped<IPublicMenuService, PublicMenuService>();
builder.Services.AddScoped<IModifierGroupService, ModifierGroupService>();

// Identity's public discovery endpoint, reusing the authority already configured for JWT
// validation rather than adding a second setting pointing at the same service. Short timeout:
// this sits in front of a page load, and failing closed quickly beats hanging.
var identitySettings = builder.Configuration.GetSection(nameof(ServiceSettings)).Get<ServiceSettings>()
    ?? throw new InvalidOperationException("ServiceSettings is not configured.");
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<ILocationDirectoryClient, LocationDirectoryClient>(c =>
{
    c.BaseAddress = new Uri(identitySettings.Authority.TrimEnd('/') + "/");
    c.Timeout = TimeSpan.FromSeconds(3);
});

builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();
builder.Services.AddTracing(builder.Configuration);
builder.Services.AddMetrics(builder.Configuration);
builder.Host.ConfigureAzureKeyVault();

var postgresSettings = builder.Configuration.GetSection(nameof(PostgresSettings)).Get<PostgresSettings>()
    ?? throw new InvalidOperationException("PostgresSettings is not configured.");
builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(postgresSettings.GetConnectionString()).UseTenantModelCache());
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" })
    .AddPostgres<CatalogDbContext>();

builder.Services.AddMassTransit(cfg =>
{
    cfg.AddConsumers(Assembly.GetEntryAssembly());

    cfg.UsingRestaurantPosMessageBroker(
        builder.Configuration,
        retry => retry.Interval(3, TimeSpan.FromSeconds(5)),
        configureRabbitBus: (context, bus) =>
        {
            // Explicit endpoint names preserve the pre-merge queue names
            // ("inventory-*", not the auto kebab-case "catalog-*" the
            // ServiceName-based formatter would otherwise produce) so
            // order's saga (hardcoded QueueSettings) needs no changes.
            bus.ReceiveEndpoint("inventory-reserve-inventory", e =>
            {
                e.ConfigureConsumer<ReserveInventoryConsumer>(context);
            });
            bus.ReceiveEndpoint("inventory-release-inventory", e =>
            {
                e.ConfigureConsumer<ReleaseInventoryConsumer>(context);
            });
        });
});

builder.Services.AddTenancy();
builder.Services.AddTenantEfRepository<MenuItem, CatalogDbContext>();

builder.Services.AddCatalogPolicies().AddPosJwtBearer();
builder.Services.AddControllers(options =>
{
    options.SuppressAsyncSuffixInActionNames = false;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Restaurant.Catalog.Service", Version = "v1" });
});
const string corsPolicy = "frontend";
builder.Services.AddCors(options =>
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    options.AddPolicy(corsPolicy, p =>
        p.WithOrigins(origins) // include http & https in appsettings.json
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

// Configure HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Skip HTTPS redirection when running behind API Gateway
// API Gateway handles TLS termination, services communicate via HTTP internally
// Uncomment the following line if running service directly (without API Gateway):
// app.UseHttpsRedirection();

app.UseOpenTelemetryPrometheusScrapingEndpoint(app.Services.GetRequiredService<MeterProvider>());

app.UseRouting();

// Enable CORS for all environments (frontend needs to call catalog service)
app.UseCors(corsPolicy);

app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();
app.MapPosHealthChecks();
app.MapControllers();
app.Run();
