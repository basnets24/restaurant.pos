using Common.Library.Configuration;
using Common.Library.HealthChecks;
using Common.Library.Identity;
using Common.Library.MassTransit;
using Common.Library.MongoDB;
using Common.Library.Tenancy;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using PaymentService.Auth;
using PaymentService.Entities;
using PaymentService.Settings;
using Stripe;

var builder = WebApplication.CreateBuilder(args);
builder.Host.ConfigureAzureKeyVault();
builder.Services.AddControllers();

// Bind options
builder.Services.Configure<StripeSettings>(builder.Configuration.GetSection(nameof(StripeSettings)));
builder.Services.Configure<FrontendSettings>(builder.Configuration.GetSection(nameof(FrontendSettings)));

builder.Services.AddScoped<IStripeClient>(sp =>
{
    var monitor = sp.GetRequiredService<Microsoft.Extensions.Options.IOptionsMonitor<StripeSettings>>();
    var settings = monitor.CurrentValue;
    if (string.IsNullOrWhiteSpace(settings.SecretKey))
    {
        throw new InvalidOperationException("StripeSettings:SecretKey is not configured.");
    }

    return new StripeClient(settings.SecretKey);
});

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
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" })
    .AddMongoDb();
builder.Services.AddTenancy();
builder.Services.AddTenantMongoRepository<Payment>("payments");
builder.Services.AddPaymentPolicies().AddPosJwtBearer();
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
app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();
app.MapPosHealthChecks();
app.MapControllers();
app.Run();
