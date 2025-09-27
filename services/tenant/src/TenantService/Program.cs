using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Serilog;
using Tenant.Domain.Data;
using TenantService.Services;
using TenantService.Settings;
using TenantService.Extensions;

var builder = WebApplication.CreateBuilder(args);

// logging
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();

// auth + tenancy
builder.Services.AddPosJwtBearer();
builder.Services.AddTenancy();
builder.Services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("tenant.claims.read", p => p.AddRequirements(new ScopeRequirement("tenant.claims.read")));
});

// db
var pg = builder.Configuration.GetSection("PostgresSettings").Get<PostgresSettings>();
builder.Services.AddDbContext<TenantDbContext>(options =>
    options.UseNpgsql(pg!.GetConnectionString()));

// services + controllers
builder.Services.AddScoped<RestaurantOnboardingService>();

// Health checks
builder.Services.AddHealthChecks()
    .AddNpgSql(pg!.GetConnectionString(), name: "database")
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy("Service is running"));

// Validation and error handling
builder.Services.AddValidationAndErrorHandling();

builder.Services.AddControllers(options =>
{
    // Suppress async suffix in action names for cleaner API
    options.SuppressAsyncSuffixInActionNames = false;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Tenant.Service", Version = "v1" });
});

const string corsPolicy = "frontend";
builder.Services.AddCors(options =>
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    options.AddPolicy(corsPolicy, p =>
        p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

var app = builder.Build();

// Global exception handling middleware (must be first)
app.UseGlobalExceptionHandling();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Skip HTTPS redirection when running behind API Gateway
// API Gateway handles TLS termination, services communicate via HTTP internally
// Uncomment the following line if running service directly (without API Gateway):
// app.UseHttpsRedirection();

// (frontend needs to call tenant service)
app.UseCors(corsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();

// Health check endpoints
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready") || check.Name == "self" || check.Name == "database"
});

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Name == "self"
});

app.MapControllers();

app.Run();
