using Common.Library.MassTransit;
using Common.Library.MongoDB;
using PaymentService.Entities;
using PaymentService.Settings;
using Stripe;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Bind options
builder.Services.Configure<StripeSettings>(builder.Configuration.GetSection("Stripe"));
builder.Services.Configure<FrontendSettings>(builder.Configuration.GetSection("Frontend"));

// Stripe secret key (server-side)
var secretKey = builder.Configuration["Stripe:SecretKey"]
                ?? throw new InvalidOperationException("Stripe:SecretKey is not configured.");
StripeConfiguration.ApiKey = secretKey;

// CORS
const string CorsPolicy = "frontend";
builder.Services.AddCors(options =>
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    options.AddPolicy(CorsPolicy, p =>
        p.WithOrigins(origins) // include http & https in appsettings.json
            .AllowAnyHeader()
            .AllowAnyMethod());
    // If you ever use cookies from the browser: add .AllowCredentials()
});

// Persistence / bus
builder.Services.AddMongo()
    .AddMongoRepository<Payment>("payments");

builder.Services.AddMassTransitWithRabbitMq();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddLogging();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// CORS BEFORE controllers
app.UseCors(CorsPolicy);

app.MapControllers();

app.MapGet("/health/ready", () => Results.Ok(new { status = "ready" }));
app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));

app.Run();