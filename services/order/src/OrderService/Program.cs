using Common.Library.Logging;
using Common.Library.MongoDB;
using OrderService.Entities;
using Microsoft.OpenApi.Models;
using OrderService;
using OrderService.Clients;
using OrderService.Interfaces;
using OrderService.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Register Serilog first
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();

builder.Services.AddMongo()
    .AddMongoRepository<Order>("order")
    .AddMongoRepository<InventoryItem>("inventoryitems")
    .AddMongoRepository<MenuItem>("menuitems")
    .AddMongoRepository<Cart>("carts")
    .AddMongoRepository<DiningTable>("diningtables");
builder.Services.AddMassTransitWithSaga(builder.Configuration);

builder.Services.AddScoped<ICartService, CartService>();

builder.Services.AddHttpClient<OrderClient>( client =>
{
    client.BaseAddress = new Uri("http://localhost:5236"); // Adjust per your environment
});

builder.Services.AddControllers(options =>
{
    options.SuppressAsyncSuffixInActionNames = false;
});

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
app.MapControllers();
app.Run();