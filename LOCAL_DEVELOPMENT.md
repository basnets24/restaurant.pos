# Local Development Setup Guide

This guide walks you through setting up the Restaurant POS project for local development. The goal is to get all services running locally in **~15 minutes**.

## Prerequisites

Before starting, ensure you have:

- **Node.js** 20+ ([download](https://nodejs.org/))
- **.NET 8 SDK** ([download](https://dotnet.microsoft.com/en-us/download/dotnet/8.0))
- **Docker & Docker Compose** ([download](https://www.docker.com/products/docker-desktop))
- **Git** with GitHub account
- **GitHub Personal Access Token** (PAT) with `read:packages` scope ([create here](https://github.com/settings/tokens))

## Quick Start (TL;DR)

```bash
# 1. Clone and setup
git clone <repo>
cd restaurant.pos
export GH_PAT="ghp_your_token_here"
bash scripts/setup-local.sh

# 2. In separate terminals, start services:
cd services/identity/src/IdentityService && dotnet run
cd services/menu/src/MenuService && dotnet run
cd services/inventory/src/InventoryService && dotnet run
cd services/order/src/OrderService && dotnet run
cd services/payment/src/PaymentService && dotnet run
cd services/tenant/src/TenantService && dotnet run
cd services/frontend && npm run dev

# 3. Open browser
# http://localhost:5173
# Login: admin@pos.local / (password you set during setup)
```

## Step-by-Step Setup

### Step 1: GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name: `Restaurant POS Local Dev`
4. Scopes: Check only `read:packages`
5. Click "Generate token" and copy it

Store your token securely - you'll use it in Step 3.

### Step 2: Clone Repository

```bash
git clone https://github.com/your-org/restaurant.pos.git
cd restaurant.pos
```

### Step 3: Run Setup Script (One-Time)

```bash
# Set your GitHub token
export GH_OWNER="your-github-username"
export GH_PAT="ghp_xxxxxxxxxxxx"

# Run the setup script
bash scripts/setup-local.sh
```

**What this script does:**
- Creates `.env` file with your GitHub credentials
- Generates HTTPS certificate for Identity service (`certs/identity-service.pfx`)
- Starts Docker infrastructure (PostgreSQL, MongoDB, RabbitMQ, Seq)
- Displays next steps and service port reference

**Output example:**
```
✓ .env file created
✓ HTTPS certificate generated (certs/identity-service.pfx)
✓ Docker infrastructure started

Infrastructure Services Running:
  PostgreSQL     | localhost:5432 | identity_db
  MongoDB        | localhost:27017
  RabbitMQ       | localhost:5672 (Management: localhost:15672)
  Seq (Logging)  | localhost:5341

Next steps:
  1. Start Identity Service (required first):
     cd services/identity/src/IdentityService && dotnet run

  2. In other terminals, start remaining services
  3. Start Frontend:
     cd services/frontend && npm run dev
  4. Open http://localhost:5173 and login
```

### Step 4: Start Services (Daily Development)

Services have dependencies - **start them in this order:**

**Terminal 1 - Identity Service (REQUIRED FIRST):**
```bash
cd services/identity/src/IdentityService
dotnet restore
dotnet ef database update  # Creates/updates database schema
dotnet run
# Runs on https://localhost:7163
# Swagger: https://localhost:7163/swagger
```

Wait for Identity service to fully start, then start others in parallel:

**Terminal 2 - Menu Service:**
```bash
cd services/menu/src/MenuService
dotnet restore
dotnet run
# Runs on http://localhost:5062
```

**Terminal 3 - Inventory Service:**
```bash
cd services/inventory/src/InventoryService
dotnet restore
dotnet run
# Runs on http://localhost:5094
```

**Terminal 4 - Order Service:**
```bash
cd services/order/src/OrderService
dotnet restore
dotnet run
# Runs on http://localhost:5236
```

**Terminal 5 - Payment Service:**
```bash
cd services/payment/src/PaymentService
dotnet restore
dotnet run
# Runs on http://localhost:5238
```

**Terminal 6 - Tenant Service:**
```bash
cd services/tenant/src/TenantService
dotnet restore
dotnet run
# Runs on http://localhost:5200
```

**Terminal 7 - Frontend:**
```bash
cd services/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Step 5: Verify Everything Works

1. **Check Infrastructure:**
   ```bash
   bash scripts/health-check.sh
   ```
   Should show all services as healthy.

2. **Open Frontend:**
   Navigate to http://localhost:5173

3. **Login:**
   - Email: `admin@pos.local`
   - Password: The admin password you set during setup (default: `Admin@123`)

4. **Test Features:**
   - View Menu (calls Menu Service)
   - Check Inventory (calls Inventory Service)
   - Create an Order (calls Order Service)
   - Test Payment flow (calls Payment Service)

## Service Ports Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Identity | 7163 | HTTPS | OAuth2/OIDC, Token issuance |
| Frontend | 5173 | HTTP | React SPA |
| Tenant | 5200 | HTTP | Multi-tenant management |
| Menu | 5062 | HTTP | Restaurant catalog |
| Inventory | 5094 | HTTP | Stock tracking |
| Order | 5236 | HTTP | Order processing |
| Payment | 5238 | HTTP | Payment processing (Stripe) |
| PostgreSQL | 5432 | - | Identity & Tenant data |
| MongoDB | 27017 | - | Business domain data |
| RabbitMQ | 5672 | AMQP | Message broker |
| RabbitMQ Management | 15672 | HTTP | Admin UI |
| Seq | 5341 | HTTP | Logging aggregation |

## Configuration Files

### .env (Auto-created by setup script)

Located at root, contains all environment variables:
```bash
GH_OWNER=your-username
GH_PAT=ghp_xxxxxxxxxxxx
POSTGRES_PASSWORD=password
POSTGRES_CONNECTION_STRING=Host=localhost;Port=5432;Database=identity_db;Username=postgres;Password=password
SERVICE_AUTHORITY=https://localhost:7163
IDENTITY_ADMIN_PASSWORD=Admin@123
CERT_PASSWORD=cert-password
SEQ_HOST=localhost
```

### config.js (Frontend Service URLs)

Located at `services/frontend/public/config.js` (auto-created from `.example`):
```javascript
window.IDENTITY_SERVICE_URL = 'https://localhost:7163';
window.TENANT_SERVICE_URL = 'http://localhost:5200';
window.CATALOG_SERVICE_URL = 'http://localhost:5062';
window.INVENTORY_SERVICE_URL = 'http://localhost:5094';
window.ORDER_SERVICE_URL = 'http://localhost:5236';
window.PAYMENT_SERVICE_URL = 'http://localhost:5238';
```

## Useful Commands

### Restart Infrastructure Only
```bash
bash scripts/docker-infra-up.sh
```

### Check Service Health
```bash
bash scripts/health-check.sh
```

### View Logs
```bash
# RabbitMQ Management UI
open http://localhost:15672
# Username: guest, Password: guest

# Seq Logs
open http://localhost:5341

# Service Swagger
open https://localhost:7163/swagger     # Identity
open http://localhost:5062/swagger      # Menu
open http://localhost:5094/swagger      # Inventory
open http://localhost:5236/swagger      # Order
open http://localhost:5238/swagger      # Payment
```

### Database Management

**PostgreSQL** (Identity & Tenant data):
```bash
# Connect with psql
psql -h localhost -U postgres -d identity_db

# Or use a GUI like DBeaver
```

**MongoDB** (Business domain data):
```bash
# Connect with mongo shell
mongosh mongodb://localhost:27017

# View databases
show databases

# Use restaurant database
use restaurantpos-db
```

### Frontend Development

The frontend uses hot-reload, so changes are instant:
```bash
cd services/frontend
npm run dev      # Development with hot-reload
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Troubleshooting

### "Setup script not found"
```bash
# Make script executable
chmod +x scripts/setup-local.sh

# Then run
bash scripts/setup-local.sh
```

### "Certificate error: CERT_FILE_NOT_FOUND"
```bash
# Regenerate certificate
bash scripts/generate-certs.sh
```

### "Cannot connect to Identity Service"
- Ensure Identity service is running in a terminal
- Check https://localhost:7163/health returns 200
- If HTTPS error in browser, accept the self-signed certificate warning

### "404 when accessing other services"
- Verify all services are running: `bash scripts/health-check.sh`
- Check service is listening on correct port
- Verify `.env` file exists with correct values

### "MongoDB connection failed"
```bash
# Restart MongoDB container
docker-compose -f docker-compose.infra.yml restart mongodb

# Or restart all infrastructure
bash scripts/docker-infra-up.sh
```

### "Cannot login with admin@pos.local"
- Verify Identity service ran `dotnet ef database update`
- Check admin user was seeded (should appear in logs)
- Try password you set during setup, or reset to default `Admin@123`

### "RabbitMQ says 'Could not connect'"
```bash
# Check RabbitMQ is running
docker-compose -f docker-compose.infra.yml ps

# Restart if needed
docker-compose -f docker-compose.infra.yml restart rabbitmq

# Check logs
docker logs restaurant-rabbitmq
```

### "Port already in use"
```bash
# Find what's using the port (example: 5173)
lsof -i :5173
# or on Windows
netstat -ano | findstr :5173

# Kill the process or change port in service config
```

## Database Seeding

**Identity Service** automatically seeds:
- Admin role
- Admin user (`admin@pos.local`)
- Sample tenant and location data

Other services don't have automatic seeding - data is created through the API or manually inserted.

To reset the identity database:
```bash
cd services/identity/src/IdentityService
dotnet ef database drop -f
dotnet ef database update
```

## Debugging

### Enable Debug Logs
Set in `.env`:
```bash
ASPNETCORE_ENVIRONMENT=Development
```

Services already run in Development mode, showing detailed logs.

### Use IDE Debugger

**Visual Studio / Rider:**
1. Open the solution: `Restaurant.Pos.sln`
2. Set breakpoints in code
3. Instead of `dotnet run`, use IDE's Run/Debug command
4. Debugger will stop at breakpoints

**VS Code:**
1. Install C# extension
2. Create `.vscode/launch.json` for each service
3. Use Debug panel to run with breakpoints

### Check Service Logs

Each service terminal shows logs:
- INFO: Normal operations
- WARN: Warnings
- ERROR: Errors (with stack traces)

Also check Seq at http://localhost:5341 for structured logging from all services.

## Frontend Development Tips

### Hot Reload
Changes to React components automatically reload - just save the file.

### TanStack Query DevTools
Open browser DevTools → Components → Find `ReactQueryDevtools` to see cache state.

### Network Debugging
Frontend uses axios with interceptors. Check:
- Authorization header is added
- Tenant headers are set
- Requests go to correct service URLs

### Silent Renewal
OIDC tokens auto-renew silently. If you see "login required" unexpectedly:
- Check browser console for OIDC errors
- Verify Identity service is running
- Check token expiry in localStorage

## Performance Tips

### .NET Services
- Debug builds are slower - use Release for performance testing
- Add `<TieredCompilation>true</TieredCompilation>` to `.csproj` for faster startup
- Use dotnet watch for auto-recompile on file changes:
  ```bash
  dotnet watch run
  ```

### Frontend
- Use Lighthouse in DevTools to audit performance
- Check bundle size: `npm run build && npm run preview`
- React DevTools extension helps identify unnecessary re-renders

### Database
- Add indexes on frequently queried fields
- Check MongoDB query plans with `explain()`
- Use Postgres EXPLAIN for query analysis

## Next Steps

After local setup is working:

1. **Understand Architecture:** Read `/docs/architecture-diagram.png`
2. **Explore Services:** Each service has its own README with API docs
3. **Run Tests:** Each service may have unit/integration tests
4. **Check CI/CD:** See `.github/workflows/` for deployment pipeline
5. **Make Changes:** Create a branch and start developing!

## Getting Help

- **Service-specific questions:** See `services/*/README.md`
- **Architecture questions:** See `README.md` and docs/
- **Deployment questions:** See `infra/README.md`
- **Issues:** Check `.github/issues` or ask on team Slack

## Useful Links

- **Identity Service Docs:** https://localhost:7163/swagger
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
- **RabbitMQ Docs:** https://www.rabbitmq.com/documentation.html
- **Seq Docs:** https://docs.datalust.co/
- **Duende IdentityServer:** https://duendesoftware.com/
- **.NET 8:** https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8
- **React 18:** https://react.dev/
