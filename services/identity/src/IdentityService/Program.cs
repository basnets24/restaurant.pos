using Common.Library.Logging;
using Common.Library.Tenancy;
using IdentityService.Extensions;
using IdentityService.HostedServices;
using IdentityService.Settings;
using IdentityService.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

//services
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();
// builder.Host.UseSerilog((ctx, services, cfg) =>
// {
//     // Use the preconfigured logger from AddSeqLogging, but allow override
//     cfg.ReadFrom.Configuration(ctx.Configuration)
//        .ReadFrom.Services(services)
//        .Enrich.FromLogContext();
// });

builder.Services.AddPostgresWithIdentity(builder.Configuration);
builder.Services.AddRestaurantPosIdentityServer(builder.Configuration);
builder.Services.AddRazorPages();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
builder.Services.AddLocalApiAuthentication(); 
builder.Services.AddControllers();
builder.Services.AddTenancy(); 
builder.Services.Configure<IdentitySettings>(builder.Configuration.GetSection("IdentitySettings"));
builder.Services.AddHostedService<IdentitySeedHostedService>(); 
builder.Services.AddScoped<RestaurantOnboardingService>();

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
    app.UseCors(corsPolicy);
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseSerilogRequestLogging();
app.UseIdentityServer();
app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();
app.UseTenancy(); 
app.MapControllers();

app.Run();
