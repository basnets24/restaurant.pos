using Common.Library.MassTransit;
using MenuService.Entities;
using Common.Library.MongoDB;
using MassTransit;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services
    .AddMongo()
    .AddMongoRepository<MenuItem>("menuitems")
    .AddMassTransitWithRabbitMq( retryConfigurator => retryConfigurator.Interval(3, TimeSpan.FromSeconds(5)) );
builder.Services.AddControllers(options =>
{
    options.SuppressAsyncSuffixInActionNames = false;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Restaurant.Menu.Service", Version = "v1" });
});

var app = builder.Build();

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//  if using authentication in the future
// app.UseAuthentication();
// app.UseAuthorization();
app.UseHttpsRedirection();
app.MapControllers();
app.Run();