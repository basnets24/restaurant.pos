using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.MongoDB;
using Common.Library.Tenancy;
using OrderService.Entities;
using Microsoft.OpenApi.Models;
using OrderService;
using OrderService.Auth;
using OrderService.Interfaces;
using OrderService.Services;
using OrderService.Settings;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();

// OrderService/Program.cs
builder.Services.AddMongo();
builder.Services.AddTenancy();

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

builder.Services.AddControllers(options =>
{
    options.SuppressAsyncSuffixInActionNames = false;
});
builder.Services.AddSignalR();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Restaurant.Order.Service", Version = "v1" });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseApiProblemDetails();
app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();
app.MapControllers();
app.MapTablesModule();
app.Run();