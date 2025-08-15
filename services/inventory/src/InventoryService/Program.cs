using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.MassTransit;
using Common.Library.MongoDB;
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

builder.Services.AddMongo()
    .AddMongoRepository<InventoryItem>("inventoryitems")
    .AddMongoRepository<MenuItem>("menuitems")
    .AddMassTransitWithRabbitMq( retryConfigurator => 
        retryConfigurator.Interval(3, TimeSpan.FromSeconds(5)));

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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();
app.Run();

