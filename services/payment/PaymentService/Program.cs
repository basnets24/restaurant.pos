using Common.Library.MassTransit;
using Common.Library.MongoDB;
using Common.Library.Tenancy;
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
builder.Services.AddMongo();
builder.Services.AddTenancy();
builder.Services.AddTenantMongoRepository<Payment>("payments");

builder.Services.AddMassTransitWithMessageBroker(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddLogging();

var app = builder.Build();

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

// Enable CORS for all environments (frontend needs to call payment service)
app.UseCors(CorsPolicy);

app.UseTenancy();
app.MapControllers();

app.MapGet("/health/ready", () => Results.Ok(new { status = "ready" }));
app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));

app.Run();
