# IdentityService (Restaurant POS)

Identity and authorization for the Restaurant POS platform: ASP.NET Core Identity + Duende IdentityServer for OpenID Connect/OAuth2, EF Core/PostgreSQL for persistence, and multi-tenant claims (restaurant/location) issued to every downstream service. Also owns restaurant onboarding, join-by-code, and location/membership management — absorbed from the former standalone Tenant service. Built with .NET 10.

## Features
- Duende IdentityServer: OIDC/OAuth2 with configurable clients, resources, and scopes
- ASP.NET Core Identity: user and role management with EF Core
- Multi-tenant claims: issues `restaurant_id`, `location_id`, and `role` via a custom profile service, resolved directly against the `tenant` schema via EF Core — no separate tenant service or HTTP hop
- Restaurant onboarding, join-by-code, and location management (`Features/Tenancy/`)
- Public restaurant discovery for the diner-facing surface, and diner self-signup — the platform's only anonymous endpoints (`Features/Discovery/`, see below)
- Swagger UI in Development, Serilog + Seq logging, CORS for the frontend

## Getting Started

### Prerequisites
- .NET SDK 10.0+
- PostgreSQL (local or container)
- Optional: Seq for structured logs

### Configuration
From `appsettings.json`, overridable via environment variables or User Secrets.

- `PostgresSettings` — Host, Port, Database, Username, Password
- `IdentitySettings` (used by the seed hosted service) — `AdminUserEmail`, `AdminUserPassword`, `RestaurantId`, `LocationId`
- `IdentityServerSettings` — `ApiScopes`, `ApiResources`, `Clients` (in-memory)
- `Cors.AllowedOrigins` — allowed frontend origins

```bash
# from services/identity/src/IdentityService
dotnet user-secrets set "IdentitySettings:AdminUserEmail" "admin@pos.local"
dotnet user-secrets set "IdentitySettings:AdminUserPassword" "YourSecurePassword123!"
```

### Run standalone
```bash
cd services/identity/src/IdentityService
dotnet restore
dotnet ef database update
dotnet run  # https://localhost:7163 / http://localhost:5265
```
- Swagger UI: `/swagger` (Development only)
- IdentityServer endpoints: `/connect/*`

On startup, two hosted services run automatically:
- `IdentitySeedHostedService` applies identity-schema migrations, ensures required roles exist (e.g. `Admin`), and creates an initial admin user from `IdentitySettings` if one doesn't exist
- `TenantDatabaseMigrationHostedService` applies `tenant`-schema migrations

## API Overview

All endpoints are protected with IdentityServer's Local API policy unless noted.

### Users
| Method | Route | Notes |
|---|---|---|
| `GET` | `/users/me` | Current authenticated user profile |
| `GET` | `/users` | Paged list (Admin only). Filters: `username`, `role`, `page`, `pageSize` |
| `GET` | `/users/{userId}` | User details (Admin only) |
| `PUT` | `/users/{userId}` | Update identity fields (Admin only) |
| `DELETE` | `/users/{userId}` | Soft-disable/lock user (Admin only) |
| `GET` | `/users/{userId}/roles` | List roles (Admin only) |
| `POST` | `/users/{userId}/roles` | Add roles (Admin only) |
| `DELETE` | `/users/{userId}/roles/{role}` | Remove a role (Admin only) |

### Employees (tenant-scoped)
| Method | Route | Notes |
|---|---|---|
| `GET` | `/tenants/{restaurantId}/employees` | Paged list, optional `q`, `role` filters |
| `GET` | `/tenants/{restaurantId}/employees/{userId}` | Details |
| `PUT` | `/tenants/{restaurantId}/employees/{userId}` | Update identity fields |
| `GET` | `/tenants/{restaurantId}/employees/{userId}/roles` | List tenant roles |
| `POST` | `/tenants/{restaurantId}/employees/{userId}/roles` | Add tenant roles |
| `DELETE` | `/tenants/{restaurantId}/employees/{userId}/roles/{role}` | Remove one tenant role |
| `PUT` | `/tenants/{restaurantId}/employees/{userId}/default-location` | Set default location |
| `GET` | `/tenants/{restaurantId}/employees/roles` | Available tenant role names |

### Tenants
| Method | Route | Notes |
|---|---|---|
| `GET` | `/tenants/mine` | Restaurants the current user belongs to |
| `GET` | `/tenants/{restaurantId}` | Restaurant + its locations |
| `POST` | `/tenants/{restaurantId}/locations` | Create a location (Admin only) |
| `PUT` | `/tenants/{restaurantId}/locations/{locationId}` | Update a location (Admin only) |

### Onboarding
| Method | Route | Notes |
|---|---|---|
| `POST` | `/api/onboarding/restaurant` | Create a restaurant + default location, onboarding the caller as Admin/Owner |
| `POST` | `/api/onboarding/join` | Join an existing restaurant by join code |
| `GET` | `/api/onboarding/status` | Current user's membership/onboarding status |
| `GET` | `/api/onboarding/me/code` | Current user's restaurant join code/URL |

### Discovery admin (tenant staff, Admin only)
| Method | Route | Notes |
|---|---|---|
| `PUT` | `/tenants/{restaurantId}/discovery` | Set `Cuisine` |
| `PUT` | `/tenants/{restaurantId}/locations/{locationId}/discovery` | Set `IsDiscoverable`, `Address`, `DisplayDistanceMiles`, `EstimatedPickupMinutes`. Rejects listing an inactive location (`400`). Deactivating a location (via the plain location-update endpoint) automatically clears its listing — relisting after reactivation is a separate, explicit call. |

### Public discovery — `/public` (anonymous, cross-tenant; the platform's only unauthenticated surface besides diner registration below)
| Method | Route | Notes |
|---|---|---|
| `GET` | `/public/restaurants` | Discoverable restaurants + locations. Filters: `q` (name/cuisine substring), `cuisine`; `sort`: `Recommended`\|`Distance`\|`Pickup` |
| `GET` | `/public/restaurants/{restaurantId}/locations/{locationId}` | One listing — `404` whether it doesn't exist, isn't a location of that restaurant, or simply isn't discoverable (never confirms a private tenant exists). Consumed by catalog's `LocationDirectoryClient` to gate `GET /public/menu`. |
| `GET` | `/public/cuisines` | Distinct cuisine values in use, for the discovery filter |

### Diner self-signup — `/public/diner`
| Method | Route | Notes |
|---|---|---|
| `POST` | `/public/diner/register` | Creates an account only — no roles, no tenant membership. Usable only through the `spoontab-diner` OIDC client. Rate limited to 5 requests per client address per 15 minutes (`429` + `Retry-After`); real client-address partitioning requires `ForwardedHeaders:KnownNetworks` to be set to the deployment's trusted proxy network, or every caller behind one ingress shares a single bucket. No CAPTCHA, no email verification. |

## Project Layout
- `Program.cs` — service wiring (IdentityServer, Identity, EF Core, CORS, Serilog)
- `Areas/Identity/Pages/` — scaffolded ASP.NET Core Identity Razor pages (login, register, password reset, 2FA)
- `Common/Extensions/` — cross-cutting DI helpers: IdentityServer setup, EF/Identity registration, tenant claims provider, request validation/error handling
- `Common/Settings/` — strongly-typed settings models (`IdentityServerSettings`, `IdentitySettings`)
- `Data/` — `ApplicationDbContext` (identity schema)
- `Entities/` — ASP.NET Identity entities (`ApplicationUser`, `ApplicationRole`); shared by both `Features/` areas below, which is why it lives at the root
- `Features/Identity/` — user management: `Controllers`, `DTOs`, `Repositories`, `Services`, `Extensions` (DTO mapping)
- `Features/Tenancy/` — onboarding, tenants, and employees: `Controllers`, `DTOs`, `Repositories`, `Services`, `Validation`
- `Features/Discovery/` — public restaurant/menu discovery and diner self-signup: `PublicDiscoveryController`, `DinerAccountController`, `RateLimitPolicies`
- `Features/Shared/` — cross-feature `DTOs`/`Constants` (e.g. `Paged<T>`, `Roles`)
- `Filters/` — validation action filters used by `Common/Extensions/ValidationExtensions`
- `Middleware/` — global exception handling
- `HostedServices/` — startup migrations (identity + tenant schemas) and admin seeding
- `Migrations/` — EF Core migrations for the identity schema only (tenant-schema migrations live in the `Tenant.Domain` package). Kept at the root rather than under `Features/` because EF migration snapshots embed CLR type names as strings — moving entity types would desync them from already-applied migration history

## Docker

```bash
export GH_OWNER=your-github-username
export GH_PAT="your_github_personal_access_token_here"   # needs read:packages

cd services/identity
docker build --secret id=GH_OWNER --secret id=GH_PAT -t identity-service:1.0.3 .

docker run -d -p 5265:5265 \
  -e PostgresSettings__ConnectionString="$PostGresConnString" \
  -e IdentitySettings__AdminUserPassword="@Admin_Password" \
  --network pos_pos-net \
  --name identity-service-v1.0.3 \
  restaurant-pos/identity-service:1.0.3

docker logs identity-service
```

## Production deployment

The actual production deploy is a single VM + Caddy + GHCR image pipeline, not AKS/Helm — see [`deploy/README.md`](../../deploy/README.md) at the repo root for the full CI/CD flow, including how identity's signing certificate is provisioned.

---

License: Proprietary (internal project).
