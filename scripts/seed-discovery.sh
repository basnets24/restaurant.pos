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
DELETE FROM catalog."ModifierGroups";
SQL
  echo "All locations unpublished, modifier groups removed."
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

# --- Menu + modifiers -------------------------------------------------------
# Gives every discoverable location a menu worth browsing, and attaches modifier groups
# covering all three shapes the diner UI has to handle: required single-select, optional
# single-select, and multi-select.
#
# There is NO staff UI for authoring modifiers (deliberately out of scope), so every
# modifier group in a dev database comes from here - hence the unconditional delete below
# rather than something more surgical. Menu items are only inserted where missing, so
# hand-created items and their stock levels survive.
run_sql <<'SQL'
INSERT INTO catalog."MenuItems"
  ("Id","Name","Description","Price","Category","IsAvailable","CreatedAt","Quantity","AcquiredDate","RestaurantId","LocationId")
SELECT gen_random_uuid(), i.name, i.description, i.price, i.category, true, now(), 40, now(), l."RestaurantId", l."Id"
FROM tenant."TenantLocations" l
CROSS JOIN (VALUES
  ('Fork Burger',      'Chargrilled patty, aged cheddar, house pickles',        14.50, 'Mains'),
  ('Pan-Seared Salmon','Lemon butter, seasonal greens',                         21.00, 'Mains'),
  ('Al Pastor Tacos',  'Three corn tortillas, pineapple, coriander',            13.00, 'Mains'),
  ('Charred Corn Ribs','Chilli butter, lime, cotija',                            8.50, 'Appetizers'),
  ('House Fries',      'Rosemary salt, roast garlic aioli',                      6.00, 'Sides'),
  ('Olive Oil Cake',   'Citrus syrup, creme fraiche',                            9.00, 'Desserts'),
  ('Ginger Lemonade',  'Pressed lemon, fresh ginger, soda',                      5.50, 'Drinks')
) AS i(name, description, price, category)
WHERE l."IsDiscoverable"
  AND NOT EXISTS (
    SELECT 1 FROM catalog."MenuItems" m
    WHERE m."RestaurantId" = l."RestaurantId" AND m."LocationId" = l."Id" AND m."Name" = i.name
  );

DELETE FROM catalog."ModifierGroups";

-- Required single-select: every Fork Burger must pick a size.
WITH g AS (
  INSERT INTO catalog."ModifierGroups" ("Id","MenuItemId","Name","SelectionType","Required","DisplayOrder","RestaurantId","LocationId")
  SELECT gen_random_uuid(), m."Id", 'Size', 'Single', true, 0, m."RestaurantId", m."LocationId"
  FROM catalog."MenuItems" m WHERE m."Name" = 'Fork Burger'
  RETURNING "Id"
)
INSERT INTO catalog."ModifierOptions" ("Id","ModifierGroupId","Name","PriceDelta","DisplayOrder","IsDefault")
SELECT gen_random_uuid(), g."Id", o.name, o.delta, o.ord, o.is_default
FROM g CROSS JOIN (VALUES
  ('Regular',      0.00, 0, true),
  ('Double patty', 4.00, 1, false)
) AS o(name, delta, ord, is_default);

-- Multi-select, optional.
WITH g AS (
  INSERT INTO catalog."ModifierGroups" ("Id","MenuItemId","Name","SelectionType","Required","DisplayOrder","RestaurantId","LocationId")
  SELECT gen_random_uuid(), m."Id", 'Extras', 'Multi', false, 1, m."RestaurantId", m."LocationId"
  FROM catalog."MenuItems" m WHERE m."Name" = 'Fork Burger'
  RETURNING "Id"
)
INSERT INTO catalog."ModifierOptions" ("Id","ModifierGroupId","Name","PriceDelta","DisplayOrder","IsDefault")
SELECT gen_random_uuid(), g."Id", o.name, o.delta, o.ord, false
FROM g CROSS JOIN (VALUES
  ('Smoked bacon',  2.50, 0),
  ('Extra cheddar', 1.50, 1),
  ('Avocado',       2.00, 2)
) AS o(name, delta, ord);

-- Optional single-select, with a non-first default.
WITH g AS (
  INSERT INTO catalog."ModifierGroups" ("Id","MenuItemId","Name","SelectionType","Required","DisplayOrder","RestaurantId","LocationId")
  SELECT gen_random_uuid(), m."Id", 'Spice level', 'Single', false, 0, m."RestaurantId", m."LocationId"
  FROM catalog."MenuItems" m WHERE m."Name" = 'Al Pastor Tacos'
  RETURNING "Id"
)
INSERT INTO catalog."ModifierOptions" ("Id","ModifierGroupId","Name","PriceDelta","DisplayOrder","IsDefault")
SELECT gen_random_uuid(), g."Id", o.name, 0.00, o.ord, o.is_default
FROM g CROSS JOIN (VALUES
  ('Mild',   0, false),
  ('Medium', 1, true),
  ('Hot',    2, false)
) AS o(name, ord, is_default);

-- A negative delta, to prove the price maths isn't assuming upsells only.
WITH g AS (
  INSERT INTO catalog."ModifierGroups" ("Id","MenuItemId","Name","SelectionType","Required","DisplayOrder","RestaurantId","LocationId")
  SELECT gen_random_uuid(), m."Id", 'Side', 'Single', true, 0, m."RestaurantId", m."LocationId"
  FROM catalog."MenuItems" m WHERE m."Name" = 'Pan-Seared Salmon'
  RETURNING "Id"
)
INSERT INTO catalog."ModifierOptions" ("Id","ModifierGroupId","Name","PriceDelta","DisplayOrder","IsDefault")
SELECT gen_random_uuid(), g."Id", o.name, o.delta, o.ord, o.is_default
FROM g CROSS JOIN (VALUES
  ('Seasonal greens', 0.00, 0, true),
  ('House fries',     1.50, 1, false),
  ('No side',        -2.00, 2, false)
) AS o(name, delta, ord, is_default);
SQL

docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -c \
  'SELECT t."Name" AS restaurant, t."Cuisine", l."Name" AS location, l."DisplayDistanceMiles" AS miles, l."EstimatedPickupMinutes" AS pickup
   FROM tenant."TenantLocations" l JOIN tenant."Tenants" t ON t."Id" = l."RestaurantId"
   WHERE l."IsDiscoverable" ORDER BY t."Name", l."Name";'

docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -c \
  'SELECT m."Name" AS item, g."Name" AS modifier_group, g."SelectionType", g."Required", count(o.*) AS options
   FROM catalog."ModifierGroups" g
   JOIN catalog."MenuItems" m ON m."Id" = g."MenuItemId"
   LEFT JOIN catalog."ModifierOptions" o ON o."ModifierGroupId" = g."Id"
   GROUP BY m."Name", g."Name", g."SelectionType", g."Required", g."DisplayOrder"
   ORDER BY m."Name", g."DisplayOrder";'
