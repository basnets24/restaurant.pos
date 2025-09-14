using Common.Library.Identity;
using Common.Library.Logging;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Common.Library.Identity;
using Microsoft.OpenApi.Models;
using Serilog;
using Tenant.Domain.Data;
using TenantService.Services;
using TenantService.Settings;

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
builder.Services.AddControllers();
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors(corsPolicy);
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.UseTenancy();
app.MapControllers();

app.Run();
