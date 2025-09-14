# IdentityService (Restaurant POS)

A .NET 8 Identity and Authorization service for the Restaurant POS platform. It uses ASP.NET Core Identity + Duende IdentityServer for OpenID Connect/OAuth2, EF Core with PostgreSQL for persistence, and issues multi-tenant claims (restaurant/location) to downstream services.

## Features
- Duende IdentityServer: OIDC/OAuth2 with configurable clients, resources, and scopes
- ASP.NET Core Identity: user and role management with EF Core
- Multi‑tenant claims: issues `restaurant_id`, `location_id`, and `role` via a custom profile service
- HTTP or DB tenant claims provider: configurable via `TenantService:Mode`
- Swagger UI in Development, Serilog + Seq logging, CORS for the frontend

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- PostgreSQL (local or container)
- Optional: Seq for structured logs

### Configuration
Settings are primarily in `appsettings.json` and can be overridden with environment variables or User Secrets.

- PostgresSettings
  - Host, Port, Database, Username, Password
- IdentitySettings (used by the seed hosted service)
  - AdminUserEmail, AdminUserPassword, RestaurantId, LocationId
- IdentityServerSettings
  - ApiScopes, ApiResources, Clients (in‑memory)
  - You may override a specific client secret at runtime via User Secrets using keys under `TenantService` (see below)
- TenantService
  - Mode: `Http` (default) or `Db`
  - BaseUrl: base URL of the Tenant service when `Mode` = `Http`
  - Authority, ClientId, ClientSecret, Scope: client‑credentials used to call the Tenant service (token retrieved from `Authority`)
- Cors
  - AllowedOrigins: array of allowed frontend origins

Example: set secrets for local development
```bash
# from this project directory
dotnet user-secrets set "IdentitySettings:AdminUserEmail" "admin@pos.local"
dotnet user-secrets set "IdentitySettings:AdminUserPassword" "Passw0rd!"
# if using Http tenant mode, set confidential client secret out of appsettings
dotnet user-secrets set "TenantService:ClientSecret" "dev-identity-tenant-secret"
```



### Database
Apply migrations to your local PostgreSQL database:
```bash
dotnet ef database update
```
Connection string is built from `PostgresSettings`.

### Run
```bash
dotnet run
```
- Swagger UI: `/swagger` (Development only)
- IdentityServer endpoints: `/connect/*`

The `IdentitySeedHostedService` runs on startup to:
- Ensure required roles exist (e.g., `Admin`)
- Create an initial admin user from `IdentitySettings` if it does not exist

## API Overview

All endpoints are protected with IdentityServer’s Local API policy unless noted. Key routes:

- Users
  - `GET /users/me` — current authenticated user profile
  - `GET /users` — paged list (Admin only). Filters: `username`, `role`, `page`, `pageSize`
  - `GET /users/{userId}` — user details (Admin only)
  - `PUT /users/{userId}` — update identity fields (Admin only)
  - `DELETE /users/{userId}` — soft‑disable/lock user (Admin only)
  - `GET /users/{userId}/roles` — list roles (Admin only)
  - `POST /users/{userId}/roles` — add roles (Admin only)
  - `DELETE /users/{userId}/roles/{role}` — remove a role (Admin only)

- Employees (tenant‑scoped)
  - `GET /tenants/{restaurantId}/employees` — paged list with optional `q`, `role`
  - `GET /tenants/{restaurantId}/employees/{userId}` — details
  - `PUT /tenants/{restaurantId}/employees/{userId}` — update identity fields
  - `GET /tenants/{restaurantId}/employees/{userId}/roles` — list tenant roles
  - `POST /tenants/{restaurantId}/employees/{userId}/roles` — add tenant roles
  - `DELETE /tenants/{restaurantId}/employees/{userId}/roles/{role}` — remove one tenant role
  - `PUT /tenants/{restaurantId}/employees/{userId}/default-location` — set default location
  - `GET /tenants/{restaurantId}/employees/roles` — available tenant role names

## Project Layout
- `Program.cs` — service wiring (IdentityServer, Identity, EF Core, CORS, Serilog)
- `Extensions/` — DI helpers for IdentityServer, EF/Identity, and tenant claims provider
- `Settings/` — strongly‑typed settings models
- `Controllers/` — users and tenant employees endpoints
- `Services/` — profile service and tenant claims providers (HTTP/DB)
- `Entities/` — ASP.NET Identity entities
- `Contracts/` — DTOs used by the API
- `Migrations/` — EF Core migrations

## Notes
- In `Development`, CORS is enabled using `Cors:AllowedOrigins` and Swagger UI is available.
- The tenant claims provider defaults to `Http` mode; set `TenantService:Mode = "Db"` to use the local database provider.

---

License: Proprietary (internal project). 
