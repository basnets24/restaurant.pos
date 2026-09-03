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
