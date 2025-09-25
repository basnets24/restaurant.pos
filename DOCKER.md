# Restaurant POS - Docker Deployment

This deployment uses Docker Compose overlays to separate infrastructure and application services for better organization and flexibility.

## Architecture

- **Infrastructure** (`infra/docker-compose.yml`): PostgreSQL, MongoDB, RabbitMQ, Seq
- **Applications** (`docker-compose.yml`): Identity Service, Tenant Service

## Prerequisites

- Docker and Docker Compose installed
- GitHub Personal Access Token with `read:packages` permission

## Quick Start

1. **Set up environment variables**:
   ```bash
   export GH_OWNER=basnets24
   export GH_PAT="your_github_personal_access_token_here"
   export POSTGRES_PASSWORD="your_secure_postgres_password"
   ```

2. **Start all services** (infrastructure + applications):
   ```bash
   docker-compose -f infra/docker-compose.yml -f docker-compose.yml up -d
   ```

3. **Check service status**:
   ```bash
   docker-compose -f infra/docker-compose.yml -f docker-compose.yml ps
   ```

4. **View logs**:
   ```bash
   # All services
   docker-compose -f infra/docker-compose.yml -f docker-compose.yml logs -f
   
   # Specific service
   docker-compose -f infra/docker-compose.yml -f docker-compose.yml logs -f identity-service
   docker-compose -f infra/docker-compose.yml -f docker-compose.yml logs -f tenant-service
   ```

## Alternative Deployment Options

### Infrastructure Only
```bash
# Start only infrastructure services
docker-compose -f infra/docker-compose.yml up -d
```

### Applications Only (requires infrastructure running)
```bash
# Start only application services
docker-compose up -d
```

## Services

### Infrastructure
- **PostgreSQL** - Port 5432 (Database for Identity & Tenant services)
- **MongoDB** - Port 27017 (Document database)
- **RabbitMQ** - Port 5672 (Message broker), Management UI: http://localhost:15672
- **Seq** - Port 5341 (Structured logging), UI: http://localhost:5341

### Applications
- **Identity Service** - Port 5265 (Authentication/Authorization)
  - Swagger: http://localhost:5265/swagger
  - IdentityServer: http://localhost:5265/connect/*
- **Tenant Service** - Port 5200 (Multi-tenant management)
  - Swagger: http://localhost:5200/swagger

## Service Dependencies

The services start in the correct order:
1. Infrastructure services (PostgreSQL, MongoDB, RabbitMQ, Seq)
2. Identity Service (depends on PostgreSQL)
3. Tenant Service (depends on PostgreSQL + Identity Service)

## Database

Both Identity and Tenant services share the same PostgreSQL database (`identity_db`) with different schemas/tables.

## Development

### Building individual services
```bash
# Identity service
cd services/identity
docker build --secret id=GH_OWNER --secret id=GH_PAT -t identity-service:local .

# Tenant service  
cd services/tenant
docker build --secret id=GH_OWNER --secret id=GH_PAT -t tenant-service:local .
```

### Stopping services
```bash
# Stop all services (infrastructure + applications)
docker-compose -f infra/docker-compose.yml -f docker-compose.yml down

# Stop only applications
docker-compose down

# Stop only infrastructure
docker-compose -f infra/docker-compose.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f infra/docker-compose.yml -f docker-compose.yml down -v
```

### Rebuilding services
```bash
# Rebuild and restart specific service
docker-compose -f infra/docker-compose.yml -f docker-compose.yml up -d --build identity-service

# Rebuild all application services
docker-compose -f infra/docker-compose.yml -f docker-compose.yml up -d --build
```

## Troubleshooting

### Check service health
```bash
docker-compose ps
```

### Service not starting
1. Check logs: `docker-compose logs servicename`
2. Verify GitHub PAT is set correctly
3. Ensure PostgreSQL is healthy before dependent services start

### Database connection issues
- Services connect to PostgreSQL using hostname `postgres` (Docker internal networking)
- Database credentials are configured in the docker-compose.yml

### Networking
All services run on the same Docker network and can communicate using service names as hostnames.