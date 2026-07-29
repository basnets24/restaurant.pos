using Common.Library.Configuration;
using Common.Library.Logging;
using Common.Library.OpenTelemetry;
using Common.Library.PostgreSQL;
using Duende.IdentityServer.Configuration;
using IdentityService.Common.Extensions;
using IdentityService.Common.Settings;
using IdentityService.Data;
using IdentityService.Entities;
using IdentityService.Features.Identity.Repositories;
using IdentityService.Features.Identity.Services;
using IdentityService.Features.Tenancy.Repositories;
using IdentityService.Features.Tenancy.Services;
using IdentityService.HostedServices;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Serilog;
using Microsoft.AspNetCore.HttpOverrides;
using OpenTelemetry.Metrics;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Host.ConfigureAzureKeyVault();

//services
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();
builder.Services.AddTracing(builder.Configuration);
builder.Services.AddMetrics(builder.Configuration);
builder.Services.AddPostgresWithIdentity(builder.Configuration);
builder.Services.AddRestaurantPosIdentityServer(builder.Configuration, builder.Environment);

builder.Services.AddMemoryCache();
builder.Services.AddRazorPages();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
builder.Services.AddLocalApiAuthentication();
builder.Services.AddControllers();
builder.Services.Configure<IdentitySettings>(builder.Configuration.GetSection("IdentitySettings"));
builder.Services.AddHostedService<IdentitySeedHostedService>();
builder.Services.AddHostedService<TenantDatabaseMigrationHostedService>();

// Identity Feature Services & Repositories
builder.Services.AddEfRepository<ApplicationUser, ApplicationDbContext>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

// Tenancy Feature Services & Repositories
builder.Services.AddEfRepository<Restaurant, TenantDbContext>();
builder.Services.AddEfRepository<Location, TenantDbContext>();
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<ILocationRepository, LocationRepository>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();

// Existing services
builder.Services.AddScoped<RestaurantOnboardingService>();
builder.Services.AddTenantClaimsProvider();
builder.Services.AddIdentityHealthChecks();
builder.Services.AddValidationAndErrorHandling();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear(); // Loopback by default, this should be configured to your load balancer IP(s)
    options.KnownProxies.Clear();    
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

var identitySettings = builder.Configuration.GetSection(nameof(IdentitySettings)).Get<IdentitySettings>();

app.UseGlobalExceptionHandling();
app.UseForwardedHeaders();
//the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    builder.Configuration.AddUserSecrets<Program>();
}

// Skip HTTPS redirection when running behind API Gateway
// API Gateway handles TLS termination, services communicate via HTTP internally
// Uncomment the following lines if running services directly (without API Gateway):
// if (!app.Environment.IsDevelopment())
// {
//     app.UseHttpsRedirection();
// }

if (!string.IsNullOrWhiteSpace(identitySettings?.PathBase))
{
    app.UsePathBase(identitySettings.PathBase);
}

app.UseStaticFiles();

app.UseOpenTelemetryPrometheusScrapingEndpoint(app.Services.GetRequiredService<MeterProvider>());

app.UseRouting();

// (frontend needs to call identity service)
app.UseCors(corsPolicy);

app.UseSerilogRequestLogging();
app.UseIdentityServer();
app.UseAuthentication();
app.UseAuthorization();
app.UseCookiePolicy( new CookiePolicyOptions
{
    MinimumSameSitePolicy = SameSiteMode.Lax
});
app.MapRazorPages();
app.MapControllers();
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.Run();
