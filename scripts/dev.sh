#!/usr/bin/env bash
# Runs all Restaurant POS .NET services + frontend locally against infra
# started via `docker compose -f local/docker-compose.yml up -d`.
set -euo pipefail
set -m # each background job gets its own process group, so `stop` can kill child processes (e.g. npm's vite child) too

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_FILE="$LOG_DIR/dev.pids"
ENV_FILE="$ROOT_DIR/.env"

# name|project path (relative to ROOT_DIR)|--urls value
DOTNET_SERVICES=(
  "identity|services/identity/src/IdentityService/IdentityService.csproj|https://localhost:7163;http://localhost:5265"
  "catalog|services/catalog/src/CatalogService/CatalogService.csproj|https://localhost:7226;http://localhost:5062"
  "order|services/order/src/OrderService/OrderService.csproj|https://localhost:7288;http://localhost:5236"
  "payment|services/payment/PaymentService/PaymentService.csproj|https://localhost:7182;http://localhost:5238"
)

# Containers local/docker-compose.yml defines — waited on before launching services
INFRA_CONTAINERS=(restaurant-postgres restaurant-rabbitmq restaurant-seq)

usage() {
  echo "Usage: $0 [start|stop]"
  echo "  start   Start infra (docker compose) + all services (default)"
  echo "  stop    Stop services started by this script (infra keeps running)"
}

stop_all() {
  if [[ -f "$PID_FILE" ]]; then
    echo "Stopping services..."
    while read -r pid; do
      # negative PID targets the whole process group (catches e.g. npm's vite child)
      kill -TERM -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  else
    echo "No running services tracked in $PID_FILE"
  fi
}

wait_for_infra() {
  echo "Waiting for infra to be ready..."
  local waited=0 max_wait=90
  for c in "${INFRA_CONTAINERS[@]}"; do
    while true; do
      local status
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$c" 2>/dev/null || echo "missing")
      [[ "$status" == "healthy" || "$status" == "running" ]] && break
      if (( waited >= max_wait )); then
        echo "Timed out waiting for $c (status: $status)" >&2
        break
      fi
      sleep 2
      waited=$((waited + 2))
    done
  done
}

ensure_dev_cert() {
  if ! dotnet dev-certs https --check --trust >/dev/null 2>&1; then
    echo "Trusting local HTTPS dev certificate..."
    dotnet dev-certs https --trust
  fi
}

start_all() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  else
    echo "No .env found. Copy .env.example to .env and fill in real values." >&2
    exit 1
  fi

  if [[ -z "${GH_PAT:-}" ]]; then
    echo "GH_PAT is not set. It's required to restore GitHub-hosted NuGet packages (see NuGet.config)." >&2
    echo "Set GH_PAT in .env or run: export GH_PAT=<your github PAT>" >&2
    exit 1
  fi

  # Single POSTGRES_PASSWORD in .env drives both the container and the .NET services
  export PostgresSettings__Password="${PostgresSettings__Password:-${POSTGRES_PASSWORD:-}}"

  ensure_dev_cert

  mkdir -p "$LOG_DIR"
  : > "$PID_FILE"

  echo "Starting infra (postgres, rabbitmq, seq)..."
  (cd "$ROOT_DIR/local" && docker compose up -d)
  wait_for_infra

  trap 'stop_all' INT TERM

  for entry in "${DOTNET_SERVICES[@]}"; do
    IFS='|' read -r name proj urls <<< "$entry"
    echo "Starting $name ($urls)"
    (
      cd "$ROOT_DIR"
      ASPNETCORE_ENVIRONMENT=Development dotnet run --no-launch-profile \
        --project "$proj" --urls "$urls" \
        > "$LOG_DIR/$name.log" 2>&1
    ) &
    echo $! >> "$PID_FILE"
  done

  if [[ ! -d "$ROOT_DIR/services/frontend/node_modules" ]]; then
    echo "Installing frontend dependencies..."
    (cd "$ROOT_DIR/services/frontend" && npm install)
  fi
  echo "Starting frontend"
  (
    cd "$ROOT_DIR/services/frontend"
    npm run dev > "$LOG_DIR/frontend.log" 2>&1
  ) &
  echo $! >> "$PID_FILE"

  echo
  echo "All services starting. Logs: $LOG_DIR/<service>.log"
  echo "  Frontend:  http://localhost:5173"
  echo "  Seq:       http://localhost:5341"
  echo "  RabbitMQ:  http://localhost:15672"
  echo
  echo "Press Ctrl+C to stop all services (infra keeps running)."

  wait
}

case "${1:-start}" in
  start) start_all ;;
  stop) stop_all ;;
  -h|--help) usage ;;
  *) usage; exit 1 ;;
esac
