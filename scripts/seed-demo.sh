#!/usr/bin/env bash
# Seed the "Momo & Burger" fusion menu + modifier groups for the recruiter-facing demo.
#
# The restaurant, location, and admin/manager/server/diner accounts are seeded automatically
# by identity's DemoSeedHostedService on startup (services/identity/src/IdentityService/
# HostedServices/DemoSeedHostedService.cs) - this script only creates the menu, which lives in
# catalog and has no startup-seed equivalent. Unlike scripts/seed-discovery.sh, this goes
# through the real staff APIs rather than psql: the spoontab-demo-admin OIDC client's custom
# `demo_admin` grant (no credentials needed, always resolves to the seeded demo admin - see
# DemoAdminGrantValidator) makes minting a staff-scoped token from a script trivial, so there's
# no need to fall back to raw SQL the way the discovery seed does.
#
# Requires jq. Idempotent: skips any menu item whose name already exists for this restaurant/
# location, and skips any modifier group whose name already exists on its item.
#
#   ./scripts/seed-demo.sh
set -euo pipefail

if ! command -v jq >/dev/null; then
  echo "error: jq is required (brew install jq)" >&2
  exit 1
fi

IDENTITY_URL="${IDENTITY_URL:-http://localhost:5265}"
CATALOG_URL="${CATALOG_URL:-http://localhost:5062}"
RESTAURANT_ID="momo-and-burger"
LOCATION_ID="main"

echo "Minting demo admin token..."
TOKEN=$(curl -sf -X POST "$IDENTITY_URL/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=spoontab-demo-admin" \
  --data-urlencode "grant_type=demo_admin" \
  --data-urlencode "scope=openid menu.read menu.write" \
  | jq -r '.access_token')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "error: could not mint a demo admin token. Is identity running? (./scripts/dev.sh)" >&2
  exit 1
fi

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Restaurant-Id: $RESTAURANT_ID" -H "X-Location-Id: $LOCATION_ID")
JSON=(-H "Content-Type: application/json")

# --- Modifier group templates ------------------------------------------------
style_group()   { jq -n '{name:"Style",selectionType:"Single",required:true,options:[
                    {name:"Steamed",priceDelta:0,isDefault:true},
                    {name:"Fried",priceDelta:0.75,isDefault:false},
                    {name:"Kothey (pan-fried & steamed)",priceDelta:0.75,isDefault:false}]}'; }
sauce_group()   { jq -n '{name:"Sauce",selectionType:"Multi",required:false,options:[
                    {name:"Jhol Achar",priceDelta:0,isDefault:true},
                    {name:"Sesame Achar",priceDelta:0,isDefault:false},
                    {name:"Mayo-Ketchup",priceDelta:0,isDefault:false}]}'; }
spice_group()   { jq -n '{name:"Spice Level",selectionType:"Single",required:true,options:[
                    {name:"Mild",priceDelta:0,isDefault:true},
                    {name:"Medium",priceDelta:0,isDefault:false},
                    {name:"Sherpa-Hot",priceDelta:0,isDefault:false}]}'; }
addons_group()  { jq -n '{name:"Add-ons",selectionType:"Multi",required:false,options:[
                    {name:"Extra Cheese",priceDelta:1.5,isDefault:false},
                    {name:"Fried Egg",priceDelta:1.5,isDefault:false},
                    {name:"Bacon",priceDelta:2.0,isDefault:false}]}'; }
protein_group() { jq -n '{name:"Protein",selectionType:"Single",required:true,options:[
                    {name:"Chicken",priceDelta:0,isDefault:true},
                    {name:"Goat",priceDelta:3.0,isDefault:false},
                    {name:"Vegetarian",priceDelta:-1.0,isDefault:false}]}'; }

groups_for_item() {
  case "$1" in
    "Classic Momo (Chicken)"|"Cheese Momo") echo "style_group sauce_group" ;;
    "The Everest Burger"|"Sekuwa Burger")   echo "spice_group addons_group" ;;
    "Dal Bhat Set")                         echo "protein_group" ;;
    "Loaded Fries (Achar Style)")           echo "sauce_group" ;;
    *) echo "" ;;
  esac
}

# name|description|price|category|quantity
ITEMS=(
  "Classic Momo (Chicken)|Steamed dumplings, ground chicken, Nepali spice blend|9.50|Appetizers|60"
  "Cheese Momo|Chicken and cheese filling - the fusion twist on a Kathmandu classic|10.50|Appetizers|50"
  "The Everest Burger|Beef patty, cheddar, house sauce, toasted bun|13.00|Mains|45"
  "Sekuwa Burger|Grilled skewer-spiced patty, pickled onion, cilantro|13.50|Mains|40"
  "Dal Bhat Set|Lentil soup, rice, seasonal vegetables, choice of protein|14.00|Mains|35"
  "Loaded Fries (Achar Style)|Fries tossed in achar seasoning|7.50|Sides|55"
  "Sel Roti Sliders|Nepali rice-flour donut used as the bun, sweet and savory|8.00|Desserts|30"
  "Masala Chiya|Spiced Nepali milk tea|3.50|Drinks|80"
  "Mint Lemonade|Fresh mint, lime, soda|4.00|Drinks|80"
)

for row in "${ITEMS[@]}"; do
  IFS='|' read -r name description price category quantity <<< "$row"

  item_id=$(curl -sf "${AUTH[@]}" "$CATALOG_URL/menu-items?name=$(jq -rn --arg n "$name" '$n|@uri')&pageSize=200" \
    | jq -r --arg n "$name" '.items[] | select(.name == $n) | .id' | head -n1)

  if [[ -z "$item_id" ]]; then
    body=$(jq -n --arg name "$name" --arg desc "$description" --arg cat "$category" --argjson price "$price" \
      '{name:$name,description:$desc,price:$price,category:$cat}')
    item_id=$(curl -sf -X POST "${AUTH[@]}" "${JSON[@]}" "$CATALOG_URL/menu-items" -d "$body" | jq -r '.id')
    curl -sf -X PATCH "${AUTH[@]}" "${JSON[@]}" "$CATALOG_URL/menu-items/$item_id" \
      -d "$(jq -n --argjson q "$quantity" '{quantity:$q}')" > /dev/null
    echo "Created $name ($item_id)"
  else
    echo "Menu item already exists: $name ($item_id)"
  fi

  existing_groups=$(curl -sf "${AUTH[@]}" "$CATALOG_URL/menu-items/$item_id/modifier-groups" | jq -r '.[].name')

  for fn in $(groups_for_item "$name"); do
    group_name=$("$fn" | jq -r '.name')
    if grep -qx "$group_name" <<< "$existing_groups"; then
      continue
    fi
    "$fn" | curl -sf -X POST "${AUTH[@]}" "${JSON[@]}" "$CATALOG_URL/menu-items/$item_id/modifier-groups" -d @- > /dev/null
    echo "  + modifier group: $group_name"
  done
done

echo
echo "Done. Demo restaurant: $RESTAURANT_ID / $LOCATION_ID"
echo "Admin Demo:    admin@momoandburger.com / Demo@Admin123"
echo "Customer Demo: diner@momoandburger.com / Demo@Diner123"
