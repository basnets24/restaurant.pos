# Play.Common (Common.Library)

Reusable .NET 8 building blocks for Restaurant POS microservices. This library provides focused extensions for:

- Logging (Serilog + Seq)
- MongoDB repositories (optionally tenant‑aware)
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



Namespaces live under `Common.Library.*`.

## Quickstart

Program.cs minimal setup using all modules:

```csharp
using Common.Library.Logging;
using Common.Library.MongoDB;
using Common.Library.MassTransit;
using Common.Library.Identity;
using Common.Library.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// Logging (Serilog + Seq)
builder.Services.AddSeqLogging(builder.Configuration);

// MongoDB + repositories
builder.Services.AddMongo();
builder.Services.AddTenantMongoRepository<MyEntity>("my-collection");

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
  "MongoDbSettings": { "Host": "localhost", "Port": "27017" },
  "RabbitMqSettings": { "Host": "localhost" },
  "SeqSettings": { "Host": "localhost", "Port": "5341" },
  "Cors": { "AllowedOrigins": ["http://localhost:5173", "https://localhost:5173"] }
}
```

## Modules

- Logging (`Common.Library.Logging`)
  - `AddSeqLogging(IConfiguration)`: Registers Serilog with console + Seq sinks. Reads `SeqSettings`.

- MongoDB (`Common.Library.MongoDB`)
  - `AddMongo()`: Registers `IMongoClient` and BSON serializers.
  - `AddTenantMongoRepository<T>(collection)`: Adds a tenant‑aware repository for `T : IEntity, ITenantEntity`.
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
  - `ServiceSettings`, `MongoDbSettings`, `RabbitMqSettings`, `SeqSettings` bound from configuration.

## Usage Tips

- Always call `app.UseTenancy()` before mapping controllers so repositories can read the current tenant.
- For REST APIs, authorize with policies based on OAuth scopes using `ScopeRequirement`.
- For consumers/producers, tenant headers are propagated by the MassTransit integration so downstream services receive context.

## Versioning & Support

- Target framework: .NET 8
- Semantic versioning (1.x)

License: Proprietary (internal); permission required to redistribute.
