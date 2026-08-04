#!/usr/bin/env bash
# Seed diner-discovery display data onto existing tenants, so /order has something to show.
#
# Dev convenience only. This writes straight to Postgres rather than going through
# PUT /tenants/{id}/discovery, because minting a staff token outside the browser needs the
# full authorization-code dance (see services/frontend/e2e/fixtures/oidc.ts). The real
# admin endpoints are the supported path - this just gets a local stack demoable fast.
#
# Idempotent: re-running overwrites the same rows with the same values.
#
#   ./scripts/seed-discovery.sh          # seed
#   ./scripts/seed-discovery.sh clear    # unpublish everything again
set -euo pipefail

CONTAINER="restaurant-postgres"
DB="identity_db"
USER="postgres"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "error: container '$CONTAINER' is not running. Start infra first (./scripts/dev.sh)." >&2
  exit 1
fi

run_sql() { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" -q; }

if [[ "${1:-}" == "clear" ]]; then
  run_sql <<'SQL'
UPDATE tenant."TenantLocations" SET "IsDiscoverable" = false;
SQL
  echo "All locations unpublished."
  exit 0
fi

# Cuisines cycle over the seeded restaurants so the cuisine filter has more than one value
# to filter by; distance and pickup vary so the sorts are actually distinguishable.
run_sql <<'SQL'
WITH numbered AS (
  SELECT "Id", row_number() OVER (ORDER BY "CreatedUtc", "Id") AS n
  FROM tenant."Tenants"
)
UPDATE tenant."Tenants" t
SET "Cuisine" = (ARRAY['American','Mexican','Italian','Thai','Japanese','Mediterranean'])[((n - 1) % 6) + 1]
FROM numbered
WHERE t."Id" = numbered."Id";

WITH numbered AS (
  SELECT "Id", row_number() OVER (ORDER BY "CreatedUtc", "Id") AS n
  FROM tenant."TenantLocations"
  WHERE "IsActive"
)
UPDATE tenant."TenantLocations" l
SET "IsDiscoverable"         = true,
    "Address"                = (ARRAY['128 Alder St','940 Juniper Ave','17 Marlow Row',
                                      '655 Cedar Way','82 Quarry Lane','311 Bell St'])[((n - 1) % 6) + 1],
    "DisplayDistanceMiles"   = round((0.4 + ((n - 1) % 6) * 0.7)::numeric, 2),
    "EstimatedPickupMinutes" = 10 + ((n - 1) % 5) * 5
FROM numbered
WHERE l."Id" = numbered."Id";
SQL

docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -c \
  'SELECT t."Name" AS restaurant, t."Cuisine", l."Name" AS location, l."DisplayDistanceMiles" AS miles, l."EstimatedPickupMinutes" AS pickup
   FROM tenant."TenantLocations" l JOIN tenant."Tenants" t ON t."Id" = l."RestaurantId"
   WHERE l."IsDiscoverable" ORDER BY t."Name", l."Name";'
