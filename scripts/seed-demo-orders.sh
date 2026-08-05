#!/usr/bin/env bash
# Seed past (paid) diner orders for the Momo & Burger demo restaurant, so the Customer Demo's
# order history and the staff Orders view aren't empty on first look.
#
# Drives the real diner checkout -> Stripe PaymentIntent -> payment-confirm flow (Stripe TEST
# mode, using the static test PaymentMethod pm_card_visa), then backdates CreatedAt/PaidAt
# directly in Postgres - neither is settable via any API (Order.CreatedAt is init-only and
# defaults to UtcNow, see services/order/src/OrderService/Entities/Order.cs).
#
# Requires jq, uuidgen, docker (for psql access into the postgres container), and a real
# Stripe TEST secret key in .env (StripeSettings__SecretKey=sk_test_...).
#
# Idempotent: stops once the demo diner already has TARGET_ORDERS paid orders in history.
# Safe to re-run - it'll just top up the count.
#
#   ./scripts/seed-demo-orders.sh
set -euo pipefail

if ! command -v jq >/dev/null; then
  echo "error: jq is required (brew install jq)" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

STRIPE_KEY="${StripeSettings__SecretKey:-}"
if [[ -z "$STRIPE_KEY" || "$STRIPE_KEY" == "sk_test_placeholder" ]]; then
  echo "error: StripeSettings__SecretKey in .env must be a real Stripe test-mode key" >&2
  exit 1
fi

IDENTITY_URL="${IDENTITY_URL:-http://localhost:5265}"
CATALOG_URL="${CATALOG_URL:-http://localhost:5062}"
ORDER_URL="${ORDER_URL:-http://localhost:5236}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:5238}"
RESTAURANT_ID="momo-and-burger"
LOCATION_ID="main"
TARGET_ORDERS=14

echo "Minting demo diner token..."
DINER_TOKEN=$(curl -sf -X POST "$IDENTITY_URL/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=spoontab-diner" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "username=diner@momoandburger.com" \
  --data-urlencode "password=Demo@Diner123" \
  --data-urlencode "scope=openid profile diner payment.read" \
  | jq -r '.access_token')

if [[ -z "$DINER_TOKEN" || "$DINER_TOKEN" == "null" ]]; then
  echo "error: could not mint a demo diner token. Is identity running? (./scripts/dev.sh)" >&2
  exit 1
fi

DINER_AUTH=(-H "Authorization: Bearer $DINER_TOKEN" -H "X-Restaurant-Id: $RESTAURANT_ID" -H "X-Location-Id: $LOCATION_ID")
JSON=(-H "Content-Type: application/json")

existing=$(curl -sf "${DINER_AUTH[@]}" "$ORDER_URL/diner/history" | jq '[.[] | select(.status=="Paid")] | length')
if [[ "$existing" -ge "$TARGET_ORDERS" ]]; then
  echo "Demo diner already has $existing paid orders in history (>= $TARGET_ORDERS). Nothing to do."
  exit 0
fi
to_create=$((TARGET_ORDERS - existing))
echo "Demo diner has $existing paid orders; creating $to_create more."

echo "Fetching menu..."
MENU_JSON=$(curl -sf "$CATALOG_URL/public/menu?restaurantId=$RESTAURANT_ID&locationId=$LOCATION_ID")
ITEM_IDS=($(jq -r '.categories[].items[].id' <<< "$MENU_JSON"))

if [[ ${#ITEM_IDS[@]} -eq 0 ]]; then
  echo "error: no menu items found for $RESTAURANT_ID/$LOCATION_ID. Run scripts/seed-demo.sh first." >&2
  exit 1
fi

rand_item() { echo "${ITEM_IDS[$((RANDOM % ${#ITEM_IDS[@]}))]}"; }

# The default option of every *required* modifier group on this item, so checkout never trips
# a "please choose a X" validation error. Optional groups are left unselected.
resolve_options() {
  local item_id="$1"
  jq -c --arg id "$item_id" '
    [.categories[].items[] | select(.id == $id) | .modifierGroups[] | select(.required) |
     (.options[] | select(.isDefault) | .id)]
  ' <<< "$MENU_JSON"
}

psql_exec() {
  docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD:-}" restaurant-postgres \
    psql -h localhost -U postgres -d identity_db -v ON_ERROR_STOP=1 -q -t -A -c "$1"
}

for ((i = 0; i < to_create; i++)); do
  cart_id=$(uuidgen | tr '[:upper:]' '[:lower:]')

  line_count=$((RANDOM % 3 + 1))
  items_json="[]"
  for ((l = 0; l < line_count; l++)); do
    mid=$(rand_item)
    qty=$((RANDOM % 2 + 1))
    opts=$(resolve_options "$mid")
    items_json=$(jq -c --arg mid "$mid" --argjson qty "$qty" --argjson opts "$opts" \
      '. + [{menuItemId:$mid, quantity:$qty, notes:null, optionIds:$opts}]' <<< "$items_json")
  done

  body=$(jq -n --arg cid "$cart_id" --argjson items "$items_json" '{cartId:$cid, pickupTime:null, items:$items}')

  order_id=$(curl -sf -X POST "${DINER_AUTH[@]}" "${JSON[@]}" "$ORDER_URL/diner/checkout" -d "$body" | jq -r '.orderId // empty')
  if [[ -z "$order_id" ]]; then
    echo "  ! checkout failed for cart $cart_id, skipping" >&2
    continue
  fi

  # Inventory reservation + auto payment-request happen async over RabbitMQ - poll briefly.
  client_secret=""
  for _ in $(seq 1 20); do
    resp=$(curl -sf "${DINER_AUTH[@]}" "$PAYMENT_URL/orders/$order_id/payment-session" || true)
    client_secret=$(jq -r '.clientSecret // empty' <<< "$resp" 2>/dev/null || true)
    [[ -n "$client_secret" ]] && break
    sleep 0.5
  done

  if [[ -z "$client_secret" ]]; then
    echo "  ! order $order_id never got a payment session (inventory reservation may have failed), skipping" >&2
    continue
  fi

  payment_intent_id="${client_secret%%_secret_*}"

  # return_url is required by Stripe whenever the intent was created with automatic_payment_methods
  # enabled (PaymentRequestedConsumer.cs) - card payments never actually redirect, so this is inert.
  curl -sf -X POST "https://api.stripe.com/v1/payment_intents/$payment_intent_id/confirm" \
    -u "$STRIPE_KEY:" \
    -d "payment_method=pm_card_visa" \
    -d "return_url=http://localhost:5173/order" > /dev/null

  result=$(curl -sf -X POST "${DINER_AUTH[@]}" "$PAYMENT_URL/orders/$order_id/payment-confirm")
  status=$(jq -r '.status' <<< "$result")

  if [[ "$status" != "succeeded" ]]; then
    echo "  ! payment-confirm for order $order_id returned status=$status, skipping backdate" >&2
    continue
  fi

  # Spread orders over the past 30 days, clustered around lunch (11-15) or dinner (17-21).
  days_ago=$((RANDOM % 30 + 1))
  if ((RANDOM % 2 == 0)); then hour=$((11 + RANDOM % 4)); else hour=$((17 + RANDOM % 4)); fi
  minute=$((RANDOM % 60))
  now_epoch=$(date +%s)
  created_epoch=$(date -j -v-"${days_ago}"d -v"${hour}"H -v"${minute}"M -v0S -r "$now_epoch" +%s)
  paid_epoch=$((created_epoch + 360 + RANDOM % 300))
  created_at=$(date -u -r "$created_epoch" +"%Y-%m-%d %H:%M:%S+00")
  paid_at=$(date -u -r "$paid_epoch" +"%Y-%m-%d %H:%M:%S+00")

  psql_exec "UPDATE \"order\".\"Orders\" SET \"CreatedAt\"='$created_at', \"PaidAt\"='$paid_at' WHERE \"Id\"='$order_id';" > /dev/null
  psql_exec "UPDATE \"order\".\"CustomerOrderSummaries\" SET \"CreatedAt\"='$created_at', \"PaidAt\"='$paid_at' WHERE \"Id\"='$order_id';" > /dev/null
  psql_exec "UPDATE payment.\"Payments\" SET \"CreatedAt\"='$created_at', \"UpdatedAt\"='$paid_at' WHERE \"OrderId\"='$order_id';" > /dev/null

  echo "  + order $order_id backdated to $created_at"
done

echo
echo "Done."
