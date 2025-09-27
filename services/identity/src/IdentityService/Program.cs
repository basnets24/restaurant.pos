using Common.Library.Logging;
using Duende.IdentityServer.Configuration;
using IdentityService.Extensions;
using IdentityService.HostedServices;
using IdentityService.Settings;
using IdentityService.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

//services
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();
builder.Services.AddPostgresWithIdentity(builder.Configuration);
builder.Services.AddRestaurantPosIdentityServer(builder.Configuration);

// Configure cookie settings for development (HTTP)
if (builder.Environment.IsDevelopment())
{
    // Configure all cookie-based authentication schemes for HTTP development
    builder.Services.PostConfigure<CookieAuthenticationOptions>(
        CookieAuthenticationDefaults.AuthenticationScheme,
        options =>
        {
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        });

    // Configure IdentityServer session cookie
    builder.Services.PostConfigure<IdentityServerOptions>(options =>
    {
        options.Authentication.CookieSameSiteMode = SameSiteMode.Lax;
    });
}

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
app.UseStaticFiles();
app.UseRouting();

// (frontend needs to call identity service)
app.UseCors(corsPolicy);

app.UseSerilogRequestLogging();
app.UseIdentityServer();
app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();
app.MapControllers();

app.Run();
