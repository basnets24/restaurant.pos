# Play.Common (Common.Library)

Reusable .NET 8 building blocks for Restaurant POS microservices. This library provides focused extensions for:

- Logging (Serilog + Seq)
- PostgreSQL/EF Core repositories (tenant‑aware)
- MassTransit + RabbitMQ wiring with tenant context propagation
- JWT Bearer + scope authorization helpers
- Tenancy middleware and abstractions
- Strongly‑typed settings bindings

It is consumed by the services in this repo and can be published as a package for external reuse.

## Installation

From GitHub Packages (example):

1) Add your GitHub NuGet source and credentials to `NuGet.config` or via CLI (dotnet add package Play.Common).
2) Reference the package in your `.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="Common.Library" Version="1.0.*" />
</ItemGroup>
```


## Creating a package

Publish (CI, `.github/workflows/publish-common-library.yml`): triggers
automatically on any push to `dev` or `main` that touches
`shared/Common.Library/**`, bumping `<Version>` in `Common.Library.csproj`
first. Can also be triggered manually via `workflow_dispatch`
(`gh workflow run publish-common-library.yml`) from any branch.

Local dry run (no publish):

```bash
dotnet pack shared/Common.Library/Common.Library.csproj -c Release -p:PackageVersion=1.0.21 -o ./packages
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

- Logging (`Common.Library.Logging`)
  - `AddSeqLogging(IConfiguration)`: Registers Serilog with console + Seq sinks. Reads `SeqSettings`.

- PostgreSQL (`Common.Library.PostgreSQL`)
  - `AddTenantEfRepository<T, TContext>()`: Adds a tenant‑aware EF Core repository for `T : IEntity, ITenantEntity`, backed by `TContext`.
  - `UseTenantModelCache()`: `DbContextOptionsBuilder` extension — required on every tenant-scoped `DbContext` so EF's compiled-model cache varies per tenant instead of freezing to whichever tenant built the model first.
  - `ITenantScopedDbContext`: marker interface a `DbContext` implements so the model cache key factory can read the current tenant.
  - `IRepository<T>`: Minimal CRUD abstraction used across services.

- MassTransit (`Common.Library.MassTransit`)
  - `AddMassTransitWithRabbitMq(Action<IRetryConfigurator>?)`: Registers bus; calls `AddTenantBusTenancy()` to copy tenant headers.

- Identity (`Common.Library.Identity`)
  - `AddPosJwtBearer()`: Configures JWT Bearer using `ServiceSettings:Authority`.
  - `ScopeRequirement` + `ScopeHandler`: Require OAuth scopes in policies.

- Tenancy (`Common.Library.Tenancy`)
  - `AddTenancy()`, `UseTenancy()`: Middleware + services exposing `ITenantContext`.
  - Interfaces: `ITenantEntity` for storing `RestaurantId`/`LocationId` on documents.

- Settings (`Common.Library.Settings`)
  - `ServiceSettings`, `PostgresSettings`, `RabbitMqSettings`, `SeqSettings` bound from configuration.

## Usage Tips

- Always call `app.UseTenancy()` before mapping controllers so repositories can read the current tenant.
- For REST APIs, authorize with policies based on OAuth scopes using `ScopeRequirement`.
- For consumers/producers, tenant headers are propagated by the MassTransit integration so downstream services receive context.

## Versioning & Support

- Target framework: .NET 8
- Semantic versioning (1.x)

License: Proprietary (internal); permission required to redistribute.
