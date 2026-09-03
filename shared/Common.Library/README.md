# Common.Library

Reusable .NET 8 building blocks for Restaurant POS microservices: logging, tenant-aware EF Core repositories, MassTransit/RabbitMQ wiring, JWT auth, tenancy middleware, and strongly-typed settings. Every backend service in this repo references it as a NuGet package; see [Modules](#modules) below for what's in it.

## Installation

Add your GitHub NuGet source/credentials (see the root [README](../../README.md#prerequisites) if you haven't set that up), then reference the package:

```xml
<ItemGroup>
  <PackageReference Include="Common.Library" Version="1.0.*" />
</ItemGroup>
```

## Publishing

`.github/workflows/publish-common-library.yml` packs and pushes on any push to `dev` or `main` that touches `shared/Common.Library/**` (also triggerable manually via `gh workflow run publish-common-library.yml`). **It does not bump the version for you** — `--skip-duplicate` means pushing without bumping `<Version>` in the `.csproj` first just silently no-ops rather than publishing. Bump it yourself before you push.

Local dry run, no publish:
```bash
dotnet pack shared/Common.Library/Common.Library.csproj -c Release -p:PackageVersion=1.0.28 -o ./packages
```

Namespaces live under `Common.Library.*`.

## Quickstart

Program.cs minimal setup using all modules:

```csharp
using Common.Library.Logging;
using Common.Library.PostgreSQL;
using Common.Library.MassTransit;
using Common.Library.Identity;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Logging (Serilog + Seq)
builder.Services.AddSeqLogging(builder.Configuration);

// PostgreSQL + repositories
var postgresSettings = builder.Configuration.GetSection(nameof(PostgresSettings)).Get<PostgresSettings>()
    ?? throw new InvalidOperationException("PostgresSettings is not configured.");
builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseNpgsql(postgresSettings.GetConnectionString()).UseTenantModelCache());
builder.Services.AddTenantEfRepository<MyEntity, MyDbContext>();

// MassTransit + RabbitMQ (with simple retry)
builder.Services.AddMassTransitWithRabbitMq(retry => retry.Interval(3, TimeSpan.FromSeconds(5)));

// AuthN/AuthZ via JWT (IdentityServer/OpenIddict compatible)
builder.Services.AddPosJwtBearer();

// Multitenancy
builder.Services.AddTenancy();

var app = builder.Build();
app.UseTenancy();
app.MapControllers();
app.Run();
```

App settings (illustrative):

```json
{
  "ServiceSettings": { "ServiceName": "MyService", "Authority": "https://localhost:7163" },
  "PostgresSettings": { "Host": "localhost", "Port": 5432, "Database": "identity_db", "Username": "postgres", "Password": "" },
  "RabbitMqSettings": { "Host": "localhost" },
  "SeqSettings": { "Host": "localhost", "Port": "5341" },
  "Cors": { "AllowedOrigins": ["http://localhost:5173", "https://localhost:5173"] }
}
```

## Modules

| Namespace | Provides |
|---|---|
| `Common.Library.Logging` | `AddSeqLogging(IConfiguration)` — Serilog with console + Seq sinks, reads `SeqSettings` |
| `Common.Library.PostgreSQL` | `AddTenantEfRepository<T, TContext>()` — tenant-aware EF Core repository for `T : IEntity, ITenantEntity` · `UseTenantModelCache()` — required on every tenant-scoped `DbContext` so EF's compiled-model cache varies per tenant instead of freezing to whichever tenant built the model first · `ITenantScopedDbContext` — marker interface so the model cache key factory can read the current tenant · `IRepository<T>` — minimal CRUD abstraction |
| `Common.Library.MassTransit` | `AddMassTransitWithRabbitMq(Action<IRetryConfigurator>?)` — registers the bus and calls `AddTenantBusTenancy()` to copy tenant headers across events |
| `Common.Library.Identity` | `AddPosJwtBearer()` — JWT Bearer configured from `ServiceSettings:Authority` · `ScopeRequirement` + `ScopeHandler` — require OAuth scopes in policies |
| `Common.Library.Tenancy` | `AddTenancy()` / `UseTenancy()` — middleware + `ITenantContext` · `ITenantEntity` — interface for storing `RestaurantId`/`LocationId` on an entity |
| `Common.Library.Settings` | `ServiceSettings`, `PostgresSettings`, `RabbitMqSettings`, `SeqSettings` — bound from configuration |
| `Common.Library.HealthChecks` | `AddPostgres<TContext>()` — registers a Postgres health check · `MapPosHealthChecks()` — maps the standard health endpoint |
| `Common.Library.OpenTelemetry` | `AddTracing()` / `AddMetrics()` — OpenTelemetry wiring for Jaeger/Prometheus export |
| `Common.Library.Configuration` | `ConfigureAzureKeyVault(IHostBuilder)` — optional Azure Key Vault config source; not used by anything currently deployed |

## Usage Tips

- Always call `app.UseTenancy()` before mapping controllers so repositories can read the current tenant.
- For REST APIs, authorize with policies based on OAuth scopes using `ScopeRequirement`.
- For consumers/producers, tenant headers are propagated by the MassTransit integration so downstream services receive context.

## Versioning & Support

- Target framework: .NET 8
- Semantic versioning (1.x)

License: Proprietary (internal); permission required to redistribute.
