# Infrastructure

Infrastructure for the Restaurant POS platform — local Docker Compose stack for development. Production deployment (VM + Caddy + GHCR CI/CD) lives under [`deploy/`](../deploy/) at the repo root, not here — see [`deploy/README.md`](../deploy/README.md).

## Layout

| Path | What it is |
|---|---|
| `docker-compose.yml` | The local dev stack (see below) |

Note that **Postgres is not provisioned here**. Deployed environments use Supabase (schema-per-service, Supavisor **session-mode** pooling on port `5432` — transaction mode on `6543` breaks EF Core's migration batches); locally it's the compose container.

---

## Local development

This is what you use day to day. From the **repo root**:

```bash
./scripts/dev.sh
```

That brings up the compose stack, waits for it to be healthy, then runs all four .NET services and the frontend directly via `dotnet run` / `npm run dev`. Only infrastructure is containerized locally — don't try to `docker compose up` the services themselves.

To start just the infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Three containers, all defined in `docker-compose.yml`:

| Container | URL | Purpose |
|---|---|---|
| postgres | `localhost:5432` | All service data, schema-per-service |
| rabbitmq | http://localhost:15672 | Message broker + management UI |
| seq | http://localhost:5341 | Structured logs |

`scripts/dev.sh` health-waits on all three. `./scripts/dev.sh stop` stops the services the script started and leaves these containers running.

No Jaeger/Prometheus/Grafana locally — traces/metrics have nowhere useful to go in local dev. They're deployed in production only, for demo purposes (ephemeral, no persistence) — see `deploy/README.md`.

---

## Production deployment

Not here. See [`deploy/README.md`](../deploy/README.md) at the repo root — a single VM running `deploy/docker-compose.yml` behind Caddy, images built and pushed to GHCR by `.github/workflows/build-and-push-images.yml` and deployed by `.github/workflows/deploy.yml`. An earlier AKS/Helm/Emissary/cert-manager path was explored but never actually deployed; it's been removed.
