# Local development stack

Docker Compose for local infrastructure only. Production lives in [deploy/](../deploy/), see [deploy/README.md](../deploy/README.md).

## Usage

- From the repo root: `./local/dev.sh` brings up infrastructure, waits for it to be healthy, then runs all services and the frontend directly.
- Infrastructure only: `docker compose -f local/docker-compose.yml up -d`
- Only infrastructure runs in containers, the services themselves run via `dotnet run` / `npm run dev`.

## What's here

- Postgres, `localhost:5432`, all service data, one schema per service.
- RabbitMQ, `localhost:15672`, message broker and management UI.
- Seq, `localhost:5341`, structured logs.

Not used in production, deployed environments run Supabase Postgres instead.

## Troubleshooting

| Symptom | Fix |
|---|---|
| NuGet restore fails | `GH_PAT` isn't set in `.env`, or lacks `read:packages` |
| Postgres auth error | `POSTGRES_PASSWORD` in `.env` doesn't match what services expect, `local/dev.sh` derives `PostgresSettings__Password` from it automatically, don't set that separately |
| A service can't reach RabbitMQ | Check `docker compose ps` in `local/`, infra containers may not have come up healthy |
| 401s despite a valid login | Check the JWT's tenant claims (`restaurant_id`/`location_id`) match the `X-Restaurant-Id`/`X-Location-Id` headers being sent |
