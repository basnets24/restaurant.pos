# TenantService (Restaurant POS)

Multi‑tenant management service for the Restaurant POS platform. Provides APIs for onboarding restaurants, joining by code, listing a user’s restaurants, and an internal endpoint used by IdentityService to resolve tenant claims (restaurant/location/roles). Built with .NET 8, EF Core (PostgreSQL), and JWT Bearer auth.

## Features
- Onboarding: create restaurant + first location; add creator as Owner/Admin
- Join by code: join via restaurant ID or slug and default active location
- My tenants: list restaurants for the current user
- Internal tenant claims API for IdentityService (`tenant.claims.read` scope)
- Serilog + Seq logging, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- PostgreSQL (local or container)
- Optional: Seq for structured logs

### Configuration
Settings live in `appsettings.json` and can be overridden with environment variables or User Secrets.

- ServiceSettings
  - Authority: OIDC authority used by JWT Bearer auth
- PostgresSettings
  - Host, Port, Database, Username, Password
- Cors
  - AllowedOrigins: array of allowed frontend origins
- SeqSettings
  - Host, Port for Seq

Example: set local secrets
```bash
# from this project directory
dotnet user-secrets set "ServiceSettings:Authority" "https://localhost:7163"
dotnet user-secrets set "PostgresSettings:Password" "your-dev-password"
```

### Database
Schema is defined in `Tenant.Domain` (referenced project). Ensure your Postgres database exists and is migrated accordingly. If you maintain migrations separately, run them before starting the service.

### Run
```bash
dotnet run
```
- Swagger UI: `/swagger` (Development only)

## API Overview

All endpoints require JWT Bearer authentication unless noted.

- Onboarding (`/api/onboarding`)
  - `POST /api/onboarding/restaurant` — create restaurant; body: `{ name, locationName?, timeZoneId? }`
  - `POST /api/onboarding/join` — join by code (restaurant id or slug); body: `{ code }`
  - `GET /api/onboarding/status` — membership + admin status for current user
  - `GET /api/onboarding/me/code` — join code for current user’s latest restaurant

- Tenants (`/tenants`)
  - `GET /tenants/mine` — restaurants the user belongs to
  - `GET /tenants/{restaurantId}` — restaurant + locations detail

- Internal (for IdentityService only)
  - `GET /internal/users/{userId}/tenant-claims` — returns `{ restaurantId, locationId, roles[] }`
    - Requires scope policy `tenant.claims.read`

## Project Layout
- `Program.cs` — authentication/authorization, EF Core, Swagger, CORS
- `Controllers/` — Onboarding, Tenants, Internal tenant-claims endpoints
- `Services/` — onboarding workflows and helpers
- `Settings/` — strongly‑typed configuration for PostgreSQL
- `Contracts/` — DTOs used by controllers
- `Tenant.Domain` — shared domain (DbContext + entities)

## Notes
- Set `Cors:AllowedOrigins` to your frontend’s URL(s) in development.
- Logging to Seq is configured via `SeqSettings` (optional).

---

License: Proprietary (internal project).
