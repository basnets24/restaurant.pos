# Refactoring Guide: 7 Services → Modular Monolith

Step-by-step guide to consolidate microservices into a single organized .NET solution.

---

## Refactoring Overview

### Before (7 Separate Services)
```
services/
├── identity/               (separate project)
├── tenant/                 (separate project)
├── menu/                   (separate project)
├── inventory/              (separate project)
├── order/                  (separate project)
├── payment/                (separate project)
└── frontend/               (stays separate)

Restaurant.Pos.sln          (references all 7)
```

### After (Modular Monolith)
```
RestaurantPOS.API/         (single API project)
├── Features/
│   ├── Identity/
│   ├── Tenant/
│   ├── Menu/
│   ├── Inventory/
│   ├── Order/
│   └── Payment/
├── Common/
├── Program.cs
└── appsettings.json

RestaurantPOS.sln          (single solution)
```

**Result:** Single .NET application, organized by feature domains

---

## Phase 1: Preparation (Day 1)

### 1.1 Backup Everything
```bash
# Create backup branch
git checkout -b backup/pre-refactor-7services
git push origin backup/pre-refactor-7services

# Work on main branch
git checkout main
```

### 1.2 Understand Current Structure
```bash
# For each service, check:
ls services/identity/src/IdentityService/
ls services/menu/src/MenuService/
# etc.
```

**Document:**
- [ ] Identity: Controllers, Services, Models, Repositories, Migrations
- [ ] Tenant: Controllers, Services, Models, Repositories, Migrations
- [ ] Menu: Controllers, Services, Models, Repositories, Migrations
- [ ] Inventory: Controllers, Services, Models, Repositories, Migrations
- [ ] Order: Controllers, Services, Models, Repositories, Migrations
- [ ] Payment: Controllers, Services, Models, Repositories, Migrations

### 1.3 Check Dependencies
```bash
# Each service's .csproj file
# Note which NuGet packages are used
# Example: Identity uses Duende.IdentityServer, others use MassTransit

# Check what each service depends on (other services?)
# Check appsettings.json for configuration
```

---

## Phase 2: Create New Monolith Structure (Day 1)

### 2.1 Create New Solution
```bash
# Create fresh solution structure
dotnet new sln -n RestaurantPOS -o RestaurantPOS.Monolith

cd RestaurantPOS.Monolith

# Create main API project (from web template, not microservice)
dotnet new web -n RestaurantPOS.API -o RestaurantPOS.API

# Add to solution
dotnet sln add RestaurantPOS.API/RestaurantPOS.API.csproj
```

### 2.2 Create Feature Folders
```bash
cd RestaurantPOS.API

# Create feature structure
mkdir -p Features/Identity/{Controllers,Services,Models,Repositories,Migrations}
mkdir -p Features/Tenant/{Controllers,Services,Models,Repositories,Migrations}
mkdir -p Features/Menu/{Controllers,Services,Models,Repositories,Migrations}
mkdir -p Features/Inventory/{Controllers,Services,Models,Repositories,Migrations}
mkdir -p Features/Order/{Controllers,Services,Models,Repositories,Migrations}
mkdir -p Features/Payment/{Controllers,Services,Models,Repositories,Migrations}

mkdir -p Common/{Middleware,Extensions,Models,Exceptions}
```

### 2.3 Setup Base Project
```csharp
// RestaurantPOS.API.csproj - Add all necessary NuGet packages

<ItemGroup>
  <!-- .NET & ASP.NET Core -->
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.0" />
  <PackageReference Include="Swashbuckle.AspNetCore" Version="6.4.0" />
  
  <!-- Database -->
  <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.0" />
  
  <!-- Messaging -->
  <PackageReference Include="MassTransit" Version="8.1.0" />
  <PackageReference Include="MassTransit.RabbitMQ" Version="8.1.0" />
  
  <!-- Authentication -->
  <PackageReference Include="Duende.IdentityServer" Version="7.0.0" />
  
  <!-- Logging -->
  <PackageReference Include="Serilog" Version="3.1.0" />
  <PackageReference Include="Serilog.Sinks.Seq" Version="6.0.0" />
  <PackageReference Include="Serilog.AspNetCore" Version="8.0.0" />
  
  <!-- Monitoring -->
  <PackageReference Include="OpenTelemetry" Version="1.2.0" />
  
  <!-- Validation -->
  <PackageReference Include="FluentValidation" Version="11.8.0" />
</ItemGroup>
```

---

## Phase 3: Copy & Integrate Code (Days 2-3)

### 3.1 Migrate Identity Service
**From:** `services/identity/src/IdentityService/`  
**To:** `RestaurantPOS.API/Features/Identity/`

```bash
# Copy controllers
cp -r services/identity/src/IdentityService/Controllers/* \
  RestaurantPOS.API/Features/Identity/Controllers/

# Copy services
cp -r services/identity/src/IdentityService/Services/* \
  RestaurantPOS.API/Features/Identity/Services/

# Copy models
cp -r services/identity/src/IdentityService/Models/* \
  RestaurantPOS.API/Features/Identity/Models/

# Copy repositories
cp -r services/identity/src/IdentityService/Repositories/* \
  RestaurantPOS.API/Features/Identity/Repositories/

# Copy migrations
cp -r services/identity/src/IdentityService/Migrations/* \
  RestaurantPOS.API/Features/Identity/Migrations/
```

**Fix namespaces:**
```csharp
// Before
namespace IdentityService.Controllers

// After
namespace RestaurantPOS.API.Features.Identity.Controllers
```

**Repeat for all 6 services:**
- Tenant
- Menu
- Inventory
- Order
- Payment

### 3.2 Consolidate DbContext
**Single DatabaseContext for all features:**

```csharp
// RestaurantPOS.API/Common/ApplicationDbContext.cs

using Microsoft.EntityFrameworkCore;
using RestaurantPOS.API.Features.Identity.Models;
using RestaurantPOS.API.Features.Tenant.Models;
using RestaurantPOS.API.Features.Menu.Models;
using RestaurantPOS.API.Features.Inventory.Models;
using RestaurantPOS.API.Features.Order.Models;
using RestaurantPOS.API.Features.Payment.Models;

namespace RestaurantPOS.API.Common
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Identity
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }

        // Tenant
        public DbSet<Restaurant> Restaurants { get; set; }
        public DbSet<Location> Locations { get; set; }

        // Menu
        public DbSet<MenuItem> MenuItems { get; set; }
        public DbSet<MenuCategory> MenuCategories { get; set; }

        // Inventory
        public DbSet<InventoryItem> InventoryItems { get; set; }
        public DbSet<InventoryReservation> InventoryReservations { get; set; }

        // Order
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderLineItem> OrderLineItems { get; set; }

        // Payment
        public DbSet<Payment> Payments { get; set; }
        public DbSet<PaymentMethod> PaymentMethods { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure each feature's entities
            // Use fluent API to configure relationships
        }
    }
}
```

### 3.3 Consolidate Program.cs
```csharp
// RestaurantPOS.API/Program.cs

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddNpgsql<ApplicationDbContext>(
    builder.Configuration.GetConnectionString("DefaultConnection"));

// Logging
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// Authentication (Identity Service)
builder.Services.AddIdentityCore<User>()
    .AddRoles<Role>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.AddIdentityServer()
    // ... configuration

// MassTransit (Event Bus)
builder.Services.AddMassTransit(x =>
{
    // Register all consumers
    x.AddConsumersFromNamespaceContaining(typeof(Program));
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration["RabbitMq:Host"]);
        cfg.ConfigureEndpoints(context);
    });
});

// OpenTelemetry
builder.Services.AddTracing(builder.Configuration);
builder.Services.AddMetrics(builder.Configuration);

// API Services
builder.Services.AddScoped<IdentityService>();
builder.Services.AddScoped<TenantService>();
builder.Services.AddScoped<MenuService>();
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<PaymentService>();

// Repositories
builder.Services.AddScoped<IMenuRepository, MenuRepository>();
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
// ... etc

// Middleware
builder.Services.AddControllers();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
```

---

## Phase 4: Fix Routing & Controllers (Days 3-4)

### 4.1 Consolidate Routes
**Move all route prefixes under `/api`:**

```csharp
// Features/Identity/Controllers/AuthController.cs
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Implementation
    }
}

// Features/Menu/Controllers/MenuController.cs
[ApiController]
[Route("api/[controller]")]
public class MenuController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<MenuItem>>> GetMenuItems()
    {
        // Implementation
    }
}
```

### 4.2 Fix Inter-Service Communication
**Before:** Services called each other via HTTP  
**After:** Inject services directly

```csharp
// Before (HTTP call between services)
var response = await httpClient.GetAsync("http://menu-service/api/menu-items");

// After (Direct service injection)
public class OrderService
{
    private readonly IMenuRepository _menuRepository;
    
    public OrderService(IMenuRepository menuRepository)
    {
        _menuRepository = menuRepository;
    }
    
    public async Task CreateOrder(CreateOrderRequest request)
    {
        var menuItem = await _menuRepository.GetByIdAsync(request.MenuItemId);
        // Create order with real menu item
    }
}
```

### 4.3 Fix Event Publishing
**Before:** MassTransit published to separate service  
**After:** Single bus for entire monolith

```csharp
// Before: Each service had its own publish logic
await _bus.Publish(new MenuItemCreatedEvent { ... });

// After: Same code, single bus
// Just register all consumers in Program.cs
```

---

## Phase 5: Database Migration (Days 4-5)

### 5.1 Create Master Migration
```bash
cd RestaurantPOS.API

# Create migration combining all features
dotnet ef migrations add InitialCreate

# Review generated migration
cat Migrations/*_InitialCreate.cs
```

### 5.2 Apply to Supabase
```bash
# Test locally first
dotnet ef database update

# Then apply to Supabase PostgreSQL
# Update connection string to Supabase
dotnet ef database update --context ApplicationDbContext
```

### 5.3 Data Migration (if needed)
If you had data in MongoDB, migrate to PostgreSQL:

```csharp
// RestaurantPOS.API/Common/DataMigrationService.cs
public class DataMigrationService
{
    public async Task MigrateFromMongoAsync()
    {
        // Read from Cosmos DB (MongoDB)
        var mongoItems = await cosmosClient.GetDatabase("restaurant-pos")
            .GetCollection<MenuItem>("menu_items")
            .FindAsync(FilterDefinition<MenuItem>.Empty);
        
        // Write to PostgreSQL
        foreach (var item in mongoItems.ToList())
        {
            _dbContext.MenuItems.Add(item);
        }
        
        await _dbContext.SaveChangesAsync();
    }
}
```

---

## Phase 6: Update Infrastructure (Days 5-6)

### 6.1 Update docker-compose.yml
**Remove:** Separate service containers  
**Keep:** Infrastructure (PostgreSQL, RabbitMQ, Seq)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Removed: identity-service, menu-service, etc.
  # Keep: Infrastructure only
  
  postgres:
    image: postgres:15
    # ...
  
  rabbitmq:
    image: masstransit/rabbitmq:latest
    # ...
  
  seq:
    image: datalust/seq
    # ...
```

### 6.2 Update Dockerfile
```dockerfile
# RestaurantPOS.API/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src
COPY ["RestaurantPOS.API/RestaurantPOS.API.csproj", "RestaurantPOS.API/"]

RUN dotnet restore "RestaurantPOS.API/RestaurantPOS.API.csproj"

COPY . .

RUN dotnet build "RestaurantPOS.API/RestaurantPOS.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "RestaurantPOS.API/RestaurantPOS.API.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 80 443
ENTRYPOINT ["dotnet", "RestaurantPOS.API.dll"]
```

### 6.3 Create Single Helm Chart
**Remove:** `services/identity/helm`, `services/menu/helm`, etc.  
**Create:** `infra/helm/api/` for single application

```yaml
# infra/helm/api/Chart.yaml
apiVersion: v2
name: restaurant-pos-api
version: 1.0.0

# infra/helm/api/values.yaml
replicaCount: 2
image:
  repository: acrpos.azurecr.io/pos-api
  tag: latest

service:
  port: 80
  
ingress:
  enabled: true
  hosts:
    - host: api.restaurant-pos.com
```

---

## Phase 7: Update CI/CD (Day 6)

### 7.1 Consolidate GitHub Actions
**Remove:** 7 separate workflows  
**Create:** Single unified workflow

```yaml
# .github/workflows/api-ci.yml
name: API CI/CD

on:
  push:
    branches: [main, dev]
    paths:
      - 'RestaurantPOS/**'
      - '.github/workflows/api-ci.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0'
      
      - run: dotnet build RestaurantPOS.sln
      
      - run: dotnet test RestaurantPOS.sln
      
      - name: Build Docker image
        run: docker build -t pos-api:latest RestaurantPOS.API/
      
      - name: Push to ACR
        run: |
          docker login -u ${{ secrets.ACR_USERNAME }} \
            -p ${{ secrets.ACR_PASSWORD }} \
            ${{ secrets.ACR_REGISTRY }}
          docker tag pos-api:latest ${{ secrets.ACR_REGISTRY }}/pos-api:latest
          docker push ${{ secrets.ACR_REGISTRY }}/pos-api:latest
```

### 7.2 Delete Old Workflows
```bash
# Remove old pipelines
rm .github/workflows/identity-ci.yml
rm .github/workflows/menu-ci.yml
rm .github/workflows/inventory-ci.yml
rm .github/workflows/order-ci.yml
rm .github/workflows/payment-ci.yml
rm .github/workflows/tenant-ci.yml
```

---

## Phase 8: Update Documentation (Day 7)

### 8.1 Update LOCAL_DEVELOPMENT.md
```markdown
# Before
Start 7 services:
- cd services/identity && dotnet run
- cd services/menu && dotnet run
- etc.

# After
Start 1 service:
- cd RestaurantPOS.API && dotnet run
- Or: docker-compose up && cd RestaurantPOS.API && dotnet run
```

### 8.2 Update CI_CD_PIPELINE.md
Remove all service-specific CI/CD phases, consolidate to single pipeline

### 8.3 Delete Old Service READMEs
```bash
rm services/identity/README.md
rm services/menu/README.md
# etc.
```

### 8.4 Create Main API README
```markdown
# RestaurantPOS.API

Monolithic restaurant management API with organized feature domains.

## Project Structure
```
RestaurantPOS.API/
├── Features/
│   ├── Identity/     (Authentication)
│   ├── Tenant/       (Multi-tenancy)
│   ├── Menu/         (Catalog)
│   ├── Inventory/    (Stock)
│   ├── Order/        (Orders)
│   └── Payment/      (Payments)
├── Common/           (Shared code)
└── Program.cs
```

## Running Locally
```bash
docker-compose up
cd RestaurantPOS.API
dotnet run
```

## API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/menu` - Get menu
- `POST /api/orders` - Create order
- etc.
```

---

## Phase 9: Testing & Verification (Days 7-8)

### 9.1 Local Testing
```bash
# Build
dotnet build RestaurantPOS.sln

# Test
dotnet test RestaurantPOS.sln

# Run
docker-compose up
cd RestaurantPOS.API
dotnet run

# Verify Swagger: http://localhost:5000/swagger
```

### 9.2 Test All Endpoints
- [ ] Login works
- [ ] Create restaurant works
- [ ] Get menu works
- [ ] Create order works
- [ ] Process payment works
- [ ] All CRUD operations work

### 9.3 Verify Database
```bash
# Check all tables created
psql -h localhost -U postgres -d restaurant_pos -c "\dt"

# Should see all 20+ tables for all 6 domains
```

---

## Phase 10: Deploy & Cleanup (Day 8)

### 10.1 Deploy to AKS
```bash
# Build and push image
docker build -t acrpos.azurecr.io/pos-api:1.0.0 RestaurantPOS.API/
docker push acrpos.azurecr.io/pos-api:1.0.0

# Deploy with Helm
helm upgrade restaurant-pos-api ./infra/helm/api/ \
  --set image.tag=1.0.0 \
  -n production \
  --install
```

### 10.2 Cleanup Old Services
```bash
# Delete old service directories (AFTER successful deployment)
rm -rf services/identity
rm -rf services/menu
rm -rf services/inventory
rm -rf services/order
rm -rf services/payment
rm -rf services/tenant

# Keep only frontend
# services/frontend stays as separate React app
```

### 10.3 Update Repository Structure
```
restaurant-pos/
├── RestaurantPOS.sln
├── RestaurantPOS.API/
├── RestaurantPOS.Tests/
├── services/
│   └── frontend/         (stays separate)
├── infra/
│   ├── helm/
│   │   └── api/          (was microservice, now monolith)
│   ├── terraform/
│   └── docker-compose.yml
├── docs/
├── .github/
│   └── workflows/
│       ├── api-ci.yml    (new - single workflow)
│       └── frontend-ci.yml (unchanged)
└── README.md
```

---

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# You have a backup branch
git checkout backup/pre-refactor-7services

# Revert to old services
git push origin +backup/pre-refactor-7services:main

# Deploy old services from backup
```

---

## Timeline

| Phase | Days | What | Status |
|-------|------|------|--------|
| 1 | 1 | Backup, prepare | ✓ Quick |
| 2 | 1 | Create structure | ✓ Quick |
| 3 | 2 | Copy code, integrate | ⏳ Main work |
| 4 | 2 | Fix routing, dependencies | ⏳ Main work |
| 5 | 2 | Database migration | ⏳ Critical |
| 6 | 1 | Infrastructure updates | ✓ Quick |
| 7 | 1 | CI/CD, docs | ✓ Quick |
| 8 | 1 | Testing, deployment | ✓ Critical |

**Total: 8 days** for complete refactoring

---

## Success Checklist

- [ ] New monolith structure created
- [ ] All code copied and namespaces fixed
- [ ] Single DbContext with all entities
- [ ] Program.cs consolidates all services
- [ ] All routes updated to `/api/*`
- [ ] Inter-service HTTP calls replaced with DI
- [ ] Database migrations created and tested
- [ ] docker-compose runs locally
- [ ] All endpoints work in Swagger
- [ ] Tests pass
- [ ] Single CI/CD pipeline works
- [ ] Helm chart deployable
- [ ] Deployed to AKS successfully
- [ ] Old services deleted
- [ ] Documentation updated

---

## Common Issues & Fixes

### "DbContext conflicts"
**Solution:** Create single ApplicationDbContext with all entities

### "Service can't find dependency"
**Solution:** Register all services in Program.cs

### "Route conflicts"
**Solution:** Use `[Route("api/[controller]")]` consistently

### "Migration conflicts"
**Solution:** Combine all migrations into one initial migration

### "Docker build fails"
**Solution:** Update Dockerfile to reference RestaurantPOS.API project

---

## After Refactoring

You'll have:
- ✅ Single .NET solution (cleaner)
- ✅ Single executable (simpler)
- ✅ Single deployment (easier)
- ✅ Single CI/CD pipeline (faster)
- ✅ Organized by features (clear structure)
- ✅ 50% less operational complexity
- ✅ Same functionality
- ✅ Can extract to microservices later if needed

Ready to start? 🚀
