# IdentityService (Restaurant POS)

Identity and authorization for the platform: Duende IdentityServer for OIDC/OAuth2, ASP.NET Core Identity for users/roles, EF Core/PostgreSQL for persistence. .NET 10.

## Features

- Issues multi-tenant claims (`restaurant_id`, `location_id`, `role`) to every downstream service, resolved directly against the tenant schema, no separate tenant service or HTTP hop
- Also owns restaurant onboarding, join-by-code, and location/membership management
- Public restaurant discovery and diner self-signup, the platform's only anonymous endpoints
- Swagger in Development, Serilog + Seq logging, CORS for the frontend

## API surface

- **Users/roles**: admin-only user management and role assignment.
- **Employees/tenants**: tenant-scoped staff management, restaurant/location details.
- **Onboarding**: create a restaurant, join one by code, check onboarding status.
- **Discovery admin**: staff toggling a restaurant/location's public discoverability.
- **Public discovery** (`/public`, anonymous, cross-tenant): the discoverable restaurant list catalog's public menu endpoint gates on. A private tenant's existence is never confirmed or denied by these routes.
- **Diner self-signup** (`/public/diner`): account creation only, no roles or tenant membership, rate-limited.

## Config

`appsettings.json`, overridable via env vars or User Secrets: Postgres connection, seed admin credentials, IdentityServer clients/scopes, CORS origins.

## Getting Started

- Needs .NET SDK 10.0+ and PostgreSQL.
- Normally you don't run this by hand, `./local/dev.sh` from the repo root starts everything.

```bash
cd services/identity/src/IdentityService
dotnet ef database update
dotnet run  # https://localhost:7163 / http://localhost:5265
```

On startup, hosted services apply identity- and tenant-schema migrations and seed an initial admin user if one doesn't exist.

## Extra

Production is a single VM + Caddy + GHCR pipeline, not AKS/Helm, see [`deploy/README.md`](../../deploy/README.md) at the repo root, including how identity's signing certificate is provisioned.

License: Proprietary (internal project).
