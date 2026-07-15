# Identity + Tenant Consolidation

Detailed plan for merging `tenant` into `identity` (Merge 1 of
`docs/SERVICE_CONSOLIDATION.md`), including the dependency audit that
informs the steps below.

## Why this merge is lower-risk than it looks

`tenant` has no DbContext of its own — it calls straight into the shared
`Tenant.Domain` package. `identity` already embeds `TenantDbContext`
directly and has a working `Embedded` mode
(`Services/TenantDirectory/EmbeddedTenantDirectory.cs`) as an alternative
to calling `tenant` over HTTP, and that embedded mode is already the
default (`TenantServiceOptions.Mode = TenantServiceMode.Embedded`,
confirmed set explicitly in `services/identity/src/IdentityService/appsettings.json`).

**The HTTP-mode path is dead code, not a live alternative.**
`services/identity/src/IdentityService/Services/TenantDirectory/HttpTenantDirectory.cs`
implements `ITenantDirectory` but all three methods just log
`"not yet implemented"` and return null:

```
HttpTenantDirectory not yet implemented - returning null membership for user {UserId}
HttpTenantDirectory not yet implemented - returning null location for restaurant {RestaurantId}
HttpTenantDirectory not yet implemented - returning empty roles for user {UserId} in restaurant {RestaurantId}
```

So identity has never actually depended on the standalone `tenant`
service's HTTP API for its own claims/directory logic — it's already
running merged in practice. The only real cross-process dependency on
`tenant` is the **frontend**, which calls it directly.

## Dependency audit (as found)

### Backend services

- `menu`, `inventory`, `order`, `payment` — **no references** to the
  tenant service's URL, config, or client anywhere in source. Confirmed
  via repo-wide grep for `TenantService`, `tenant-svc`,
  `TENANT_SERVICE_URL`, `localhost:5200`/`7180` across all service
  folders.
- `identity` — registers `TenantDbContext` (embedded) and has a
  named `HttpClient("TenantService")` (`Extensions/TenantClaimsExtensions.cs:70`)
  plus `HttpTenantDirectory`/`HttpTenantClaimsProvider`, but both are only
  reachable when `Mode = Http`, which nothing sets in this repo.

### Frontend — the real dependency

`services/frontend/src/config/env.ts:22` resolves `ENV.TENANT_URL` from
`window.TENANT_SERVICE_URL` (set in `public/config.js`,
default `http://localhost:5200`) or `VITE_TENANT_URL` (`.env.development`,
`https://localhost:7180`). Four call sites use it directly:

| File | Usage |
|---|---|
| `src/api-authorization/AuthProvider.tsx:127` | `fetch(\`${ENV.TENANT_URL}/api/onboarding/status\`)` |
| `src/features/admin/pages/OrganizationPage.tsx:56` | `fetch(\`${ENV.TENANT_URL}/api/onboarding/me/code\`)` |
| `src/domain/tenant/Provider.tsx` | API client `baseURL: ENV.TENANT_URL` |
| `src/domain/restaurantUserProfile/Provider.tsx` | API client `tenantBaseURL: ENV.TENANT_URL` |

All four need to repoint at identity's base URL once identity exposes the
onboarding/tenant routes.

### Infra

- `infra/terraform/locals.tf:6` — defines the `tenant-service` AKS
  namespace/container port (5200) entry; remove once the service is
  decommissioned.
- `services/tenant/helm/values.yaml` — standalone Helm chart values for
  the tenant deployment; delete with the service.
- `infra/docker-compose.yml` — no separate `tenant` entry exists; it
  already shares the `identity-postgres` container, so no compose change
  needed there.
- `.github/workflows/publish-tenant-domain.yml` — publishes the shared
  `Tenant.Domain` **NuGet package**, not the tenant service itself.
  Unaffected by this merge; leave as-is (confirm at implementation time
  that no tenant-service-specific steps are hiding in it).

## Implementation steps

1. Move `TenantsController`, `OnboardingController`, and
   `RestaurantOnboardingService` (+ DTOs in `Contracts/tenantDtos.cs`)
   from `services/tenant/src/TenantService` into
   `services/identity/src/IdentityService`, under route prefixes that
   match what the frontend already expects (`/api/onboarding/*` is
   load-bearing — two frontend call sites hit it by exact path).
2. Move `HostedServices/DatabaseMigrationHostedService`'s tenant-schema
   migration call into identity's startup, alongside identity's own
   `ApplicationDbContext` migration.
3. Delete the dead HTTP-mode code: `HttpTenantDirectory.cs`,
   `HttpTenantClaimsProvider.cs`, the `TenantServiceMode.Http` enum value,
   the `HttpClient("TenantService")` registration, and the mode-switch
   logic in `TenantClaimsExtensions.cs` — `Embedded` becomes the only
   path, not a config option.
4. Update frontend: replace `ENV.TENANT_URL` usage in the four call sites
   above with identity's base URL (or introduce a single shared
   `ENV.IDENTITY_URL` if onboarding routes move under identity's existing
   host). Remove `VITE_TENANT_URL` / `TENANT_SERVICE_URL` from
   `.env.development`, `public/config.js`, and `services/frontend/helm/values.yaml`.
5. Delete `services/tenant/` (project, Dockerfile, Helm chart) and the
   `tenant-service` entry in `infra/terraform/locals.tf`.
6. Delete the stale, already-unused identity-local copy of the tenant
   migrations (`services/identity/src/IdentityService/Migrations/Tenant/*`
   — dead code noted during the original database-structure survey,
   referencing an outdated namespace and missing the
   `AddPerformanceIndexes` migration).
7. Remove any Emissary ingress route pointing at the standalone `tenant`
   service.

## Verification before merging

- Run identity locally with the moved controllers, hit
  `/api/onboarding/status` and `/api/onboarding/me/code` directly to
  confirm parity with the old tenant-service responses.
- Run the frontend against the updated `ENV` values and walk the
  onboarding flow + restaurant/location switch end-to-end (per this
  project's `/verify` skill — don't rely on typecheck alone for this,
  since the risk here is a runtime URL/route mismatch, not a compile
  error).
- Confirm `dotnet ef migrations list` (or equivalent) shows the `tenant`
  schema migrations as applied when run from identity's startup, not
  just present in source.
