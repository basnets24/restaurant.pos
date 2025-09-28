using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.MassTransit;
using Common.Library.MongoDB;
using Common.Library.Tenancy;
using InventoryService.Auth;
using InventoryService.Entities;
using InventoryService.Services;
using MassTransit;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddScoped<InventoryManager>();

// Register Serilog first
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();

builder.Services.AddMongo();
builder.Services.AddMassTransitWithMessageBroker(
    builder.Configuration,
    retryConfigurator => retryConfigurator.Interval(3, TimeSpan.FromSeconds(5)));

builder.Services.AddTenancy();
builder.Services.AddTenantMongoRepository<InventoryItem>("inventoryitems")
    .AddTenantMongoRepository<MenuItem>("menuitems");

builder.Services.AddInventoryPolicies().AddPosJwtBearer();

builder.Services.AddControllers(options =>
{
    options.SuppressAsyncSuffixInActionNames = false;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Restaurant.Inventory.Service", Version = "v1" });
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

// Enable CORS for all environments (frontend needs to call inventory service)
app.UseCors(corsPolicy);

app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();
app.MapControllers();
app.Run();
