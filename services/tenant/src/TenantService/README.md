# TenantService

Multi‑tenant management service for the Restaurant POS platform. Built with .NET 8, EF Core (PostgreSQL), and JWT Bearer auth.

## Prerequisites
- .NET SDK 8.0+
- PostgreSQL database

### Run
```bash
dotnet run
```
- Swagger UI: `/swagger` (Development only)

### Docker

#### Build and Run with Docker

1. **Set up GitHub Personal Access Token** (required for private NuGet packages):
   ```bash
   export GH_OWNER=basnets24
   export GH_PAT="your_github_personal_access_token_here"
   ```

2. **Build the Docker image** (run from repository root):
   ```bash
   docker build --secret id=GH_OWNER --secret id=GH_PAT -f services/tenant/src/TenantService/DockerFile -t tenant-service:1.0.0 .
   ```

3. **Run the container**:
   ```bash
   docker run -d \
     --name tenant-service \
     -p 5200:5200 \
     -e PostgresSettings__Password="your-password" \
     tenant-service:1.0.0
   ```

4. **Check container logs**:
   ```bash
   docker logs tenant-service
   ```

**Note**: The Docker build requires GitHub Personal Access Token with `read:packages` permission to access private NuGet packages.

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
