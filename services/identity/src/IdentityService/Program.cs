using Common.Library.Configuration;
using Common.Library.Logging;
using Duende.IdentityServer.Configuration;
using IdentityService.Extensions;
using IdentityService.HostedServices;
using IdentityService.Settings;
using IdentityService.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Serilog;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Host.ConfigureAzureKeyVault();

//services
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();
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
builder.Services.AddScoped<TenantUserProfileService>();
builder.Services.AddTenantClaimsProvider(builder.Configuration);
builder.Services.AddIdentityHealthChecks();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear(); // Loopback by default, this should be configured to your load balancer IP(s)
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

app.Use((context, next) =>
{
    var identitySettings = builder.Configuration.GetSection(nameof(IdentitySettings)).Get<IdentitySettings>();
    context.Request.PathBase = new PathString(identitySettings!.PathBase);
    return next();
});


app.UseStaticFiles();


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
