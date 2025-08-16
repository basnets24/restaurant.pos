using IdentityService.Extensions;
using IdentityService.HostedServices;
using IdentityService.Settings;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddPostgresWithIdentity(builder.Configuration);
builder.Services.AddRestaurantPosIdentityServer(builder.Configuration);
builder.Services.AddRazorPages();
    
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
builder.Services.AddLocalApiAuthentication(); 
builder.Services.AddControllers();
builder.Services.Configure<IdentitySettings>(
    builder.Configuration.GetSection("IdentitySettings"));
builder.Services.AddHostedService<IdentitySeedHostedService>(); 

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    builder.Configuration.AddUserSecrets<Program>();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseIdentityServer();
app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();
app.MapControllers();

app.Run();