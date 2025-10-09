using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.MongoDB;
using Common.Library.Tenancy;
using OrderService.Entities;
using Microsoft.OpenApi.Models;
using OrderService;
using OrderService.Auth;
using OrderService.Extensions;
using OrderService.Interfaces;
using OrderService.Services;
using OrderService.Settings;
using Serilog;
using Common.Library.Configuration;
using Common.Library.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Host.ConfigureAzureKeyVault();
// Add services to the container.
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();

// OrderService/Program.cs
builder.Services.AddMongo();
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" })
    .AddMongoDb();
builder.Services.AddTenancy();

builder.Services.AddPosCatalogReadModel();
builder.Services.AddTenantMongoRepository<Cart>("carts");
builder.Services.AddTenantMongoRepository<DiningTable>("diningtables");
builder.Services.AddTenantMongoRepository<InventoryItem>("inventoryitems");
builder.Services.AddTenantMongoRepository<MenuItem>("menuitems");
builder.Services.AddTenantMongoRepository<Order>("orders");
builder.Services.AddTablesModule();
builder.Services.AddMassTransitWithSaga(builder.Configuration);
builder.Services.Configure<PricingSettings>(
    builder.Configuration.GetSection("Pricing"));

builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IOrderService, FinalOrderService>();
builder.Services.AddScoped<IDiningTableService, DiningTableService>();
builder.Services.AddSingleton<IPricingService, PricingService>();



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
builder.Services.AddSignalR();

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

app.UseRouting();

// Enable CORS for all environments (frontend needs to call order service)
app.UseCors(corsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();
app.MapPosHealthChecks();
app.MapControllers();
app.MapTablesModule();
app.Run();