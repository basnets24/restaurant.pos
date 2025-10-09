# Restaurant POS Services

A microservices-based point-of-sale system for restaurants with separate services for identity, tenant management, menu, inventory, orders, and payments.

## Architecture Overview

![Restaurant POS Architecture](./docs/images/architecture-diagram.png)

### Key Design Principles
- **Microservices**: Independent, domain-specific services
- **Event-driven**: Services communicate via message broker
- **Multi-tenancy**: Built for multiple restaurant operations
- **Containerized**: Docker-based deployment

### Infrastructure Components
- **PostgreSQL**: Identity & tenant data
- **MongoDB**: Business domain data storage
- **RabbitMQ**: Service-to-service messaging
- **Seq**: Centralized structured logging

### Network Architecture
- All services communicate via `pos-net` Docker network
- Security: Non-root containers, environment-based secrets

## Service Access Points
- **Frontend**: http://localhost:5173
- **Identity Service**: http://localhost:5265
- **Tenant Service**: http://localhost:5200
- **Menu Service**: http://localhost:5062
- **Inventory Service**: http://localhost:5094
- **Order Service**: http://localhost:5236
- **Payment Service**: http://localhost:5238

## Core Services

### Identity Service
- **Purpose**: Authentication and authorization service using Duende IdentityServer
- **Responsibilities**: User management, JWT issuance, OAuth flows
- **Documentation**: [services/identity/src/IdentityService/README.md](./services/identity/src/IdentityService/README.md)

### Tenant Service
- **Purpose**: Multi-tenant management system
- **Responsibilities**: Restaurant onboarding, membership, tenant claims API
- **Documentation**: [services/tenant/src/TenantService/README.md](./services/tenant/src/TenantService/README.md)

### Menu Service
- **Purpose**: Menu management for each restaurant tenant
- **Responsibilities**: Tenant-aware menu CRUD, events, inventory sync
- **Documentation**: [services/menu/src/MenuService/README.md](./services/menu/src/MenuService/README.md)

### Inventory Service
- **Purpose**: Inventory tracking and management
- **Responsibilities**: Stock tracking, reserve/release workflow, events
- **Documentation**: [services/inventory/src/InventoryService/README.md](./services/inventory/src/InventoryService/README.md)

### Order Service
- **Purpose**: Order processing and management
- **Responsibilities**: Carts, orders, dining tables, pricing, SignalR
- **Documentation**: [services/order/src/OrderService/README.md](./services/order/src/OrderService/README.md)

### Payment Service
- **Purpose**: Payment processing integration
- **Responsibilities**: Stripe Checkout sessions, webhooks, payment status
- **Documentation**: [services/payment/PaymentService/README.md](./services/payment/PaymentService/README.md)

## Shared Libraries

### Common.Library
- **Purpose**: Core infrastructure components and utilities
- **Features**: Logging, tenancy, MongoDB repositories, MassTransit, identity helpers
- **Documentation**: [shared/common.library/README.md](./shared/common.library/README.md)
  
### Tenant.Domain
- **Purpose**: Tenant data structure and access
- **Features**: EF Core domain + DbContext for tenant data
- **Documentation**: [shared/tenant.domain/README.md](./shared/tenant.domain/README.md)

### Messaging.Contracts
- **Purpose**: Service communication contracts
- **Features**: Shared event contracts used by all services
- **Documentation**: [shared/messaging.contracts/README.md](./shared/messaging.contracts/README.md)

## Development Setup

### Prerequisites
1. **GitHub Personal Access Token** with `read:packages` permission for private NuGet packages
2. **Docker** and **Docker Compose** installed
3. **Environment variables** configured


### Package Management

#### Current Package Versions
- **Messaging.Contracts**: 1.0.6
- **Common.Library**: 1.0.13
- **Tenant.Domain**: 1.0.1

#### Automatic Package Publishing

Packages are automatically published to GitHub Packages when you push changes to shared libraries:

1. **Edit version** in the library's `.csproj` file (e.g., `<Version>1.0.7</Version>`)
2. **Commit and push** changes to `dev` or `main` branch
3. **GitHub Actions** automatically builds and publishes the updated package

**Publishing Triggers**:
- `shared/Messaging.Contracts/**` → publishes Messaging.Contracts
- `shared/common.library/**` → publishes Common.Library
- `shared/tenant.domain/**` → publishes Tenant.Domain

