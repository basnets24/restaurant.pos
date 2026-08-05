using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.OpenTelemetry;
using Common.Library.PostgreSQL;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Entities;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Metrics;
using OrderService;
using OrderService.Auth;
using OrderService.Extensions;
using OrderService.Interfaces;
using OrderService.Services;
using OrderService.Settings;
using OrderService.Projections;
using OrderService.Services.Catalog;
using OrderService.Services.Tenancy;
using Common.Library.Settings;
using Serilog;
using Common.Library.Configuration;
using Common.Library.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Host.ConfigureAzureKeyVault();
// Add services to the container.
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();
builder.Services.AddTracing(builder.Configuration);
builder.Services.AddMetrics(builder.Configuration);

var postgresSettings = builder.Configuration.GetSection(nameof(PostgresSettings)).Get<PostgresSettings>()
    ?? throw new InvalidOperationException("PostgresSettings is not configured.");
builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseNpgsql(postgresSettings.GetConnectionString()).UseTenantModelCache());
builder.Services.AddDbContext<OrderStateDbContext>(options =>
    options.UseNpgsql(postgresSettings.GetConnectionString()));

builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" })
    .AddPostgres<OrderDbContext>();
builder.Services.AddTenancy();

builder.Services.AddTenantEfRepository<Cart, OrderDbContext>();
builder.Services.AddTenantEfRepository<DiningTable, OrderDbContext>();
builder.Services.AddTenantEfRepository<PosCatalogItem, OrderDbContext>();
builder.Services.AddTenantEfRepository<Order, OrderDbContext>();
builder.Services.AddTenantEfRepository<Notification, OrderDbContext>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddTablesModule();
builder.Services.AddMassTransitWithSaga(builder.Configuration);
builder.Services.Configure<PricingSettings>(
    builder.Configuration.GetSection("Pricing"));
builder.Services.Configure<AbandonedOrderSettings>(
    builder.Configuration.GetSection("AbandonedOrders"));
builder.Services.AddHostedService<AbandonedOrderSweeper>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IOrderService, FinalOrderService>();
builder.Services.AddScoped<IDinerOrderService, DinerOrderService>();
builder.Services.AddScoped<ICurrentUserAccessor, CurrentUserAccessor>();
builder.Services.AddScoped<ICustomerOrderHistory, CustomerOrderHistoryService>();
builder.Services.AddSingleton<IPricingService, PricingService>();

var catalogSettings = builder.Configuration.GetSection(nameof(CatalogSettings)).Get<CatalogSettings>()
    ?? throw new InvalidOperationException("CatalogSettings is not configured.");
builder.Services.AddHttpClient<ICatalogMenuClient, CatalogMenuClient>(c =>
{
    c.BaseAddress = new Uri(catalogSettings.BaseUrl.TrimEnd('/') + "/");
    // Checkout is a person waiting on a button. Better to fail fast and let them retry than
    // to hold the request open while catalog is wedged.
    c.Timeout = TimeSpan.FromSeconds(5);
});

// Identity's public discovery endpoint, reusing the authority already configured for JWT
// validation rather than adding a second setting that points at the same service. Only ever
// called to decorate an order-history row, so a slow identity delays nothing that matters -
// hence a timeout short enough that it cannot hold up a checkout.
var serviceSettings = builder.Configuration.GetSection(nameof(ServiceSettings)).Get<ServiceSettings>()
    ?? throw new InvalidOperationException("ServiceSettings is not configured.");
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<ITenantDirectoryClient, TenantDirectoryClient>(c =>
{
    c.BaseAddress = new Uri(serviceSettings.Authority.TrimEnd('/') + "/");
    c.Timeout = TimeSpan.FromSeconds(3);
});



builder.Services.AddOrderPolicies().AddPosJwtBearer();
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
builder.Services.AddControllers(options =>
{
    options.SuppressAsyncSuffixInActionNames = false;
});

// Add error handling
builder.Services.AddErrorHandling();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Restaurant.Order.Service", Version = "v1" });
});

var app = builder.Build();

// Global exception handling middleware (must be first)
app.UseGlobalExceptionHandling();

// Configure the HTTP request pipeline.
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

// Enable CORS for all environments (frontend needs to call order service)
app.UseCors(corsPolicy);
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();
app.MapPosHealthChecks();
app.MapControllers();
app.MapTablesModule();
app.Run();
