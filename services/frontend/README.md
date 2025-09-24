# Restaurant POS Frontend

Single-page web app for restaurant operations (tables, orders, payments, management). Built with React, TypeScript, and Vite. Served as static assets behind Nginx.

## Features

- Tables and floor plan: view active tables and seats
- Ordering workflow: browse menu, add to cart, place orders
- Payments: client flow to initiate payment sessions
- Management dashboard: inventory, menu, staff, and analytics views
- Admin area: organization profile and basic tenant info
- Authentication: OIDC login/logout with silent renew
- Multi-tenant: implicit headers and tenant-aware data fetching

## Tech Overview

- Framework: React 18 + TypeScript, Vite build tool
- State/Data: TanStack Query for server cache, lightweight local state
- HTTP: axios with centralized interceptors (auth + tenant headers)
- Auth: oidc-client-ts (Authorization Code + PKCE), silent renew
- Realtime: @microsoft/signalr for live table updates
- UI: Tailwind CSS + component primitives (buttons, cards, tabs, etc.)
- Config: runtime `public/config.js` (no build-time secrets in bundle)

## Quick Start (Dev)

```bash
npm install
npm run dev
```

App runs on http://localhost:5173/ by default.

## Configuration

Service URLs are provided via `public/config.js`. This file is loaded before the app and defines globals like:

```js
window.IDENTITY_SERVICE_URL = 'http://localhost:5200';
window.TENANT_SERVICE_URL = 'http://localhost:5210';
window.CATALOG_SERVICE_URL = 'http://localhost:5220';
window.INVENTORY_SERVICE_URL = 'http://localhost:5230';
window.ORDER_SERVICE_URL = 'http://localhost:5240';
window.PAYMENT_SERVICE_URL = 'http://localhost:5250';
window.RABBITMQ_URL = 'amqp://localhost:5672';
```

- Local development: adjust `public/config.js` as needed.
- Other environments: swap or mount a different `config.js` at `/usr/share/nginx/html/config.js`.

## Architecture

- Routing: client-side routes with SPA fallback in Nginx
- Runtime config: `config.js` defines `window.*` service URLs consumed via `src/config/env.ts`
- Auth accessors: token/tenant surfaced via module accessors bound in `AuthProvider`
- HTTP layer: `src/lib/http.ts` injects Authorization and tenant headers; robust JWT parsing
- Data patterns: paginated responses via `PageResult<T>` (e.g., Menu, Orders)
- Code-splitting: route-level chunks produced by Vite for faster loads

## Build & Preview

```bash
npm run build
npm run preview  # serves dist/ on http://localhost:4173/
```

## Docker

Build and run the static image served by Nginx:

```bash
docker build -t pos-frontend:dev .
docker run --rm -p 8080:80 pos-frontend:dev
```

Override config per environment by mounting a different `config.js`:

```bash
docker run --rm -p 8080:80 \
  -v $(pwd)/ops/prod/config.js:/usr/share/nginx/html/config.js:ro \
  pos-frontend:dev
```

## Notes

- SPA routing: Nginx is configured with a fallback to `index.html`.
- Ports: dev (5173), preview (4173), Docker example (8080). Adjust mappings as needed.

## Project Layout Highlights

- `src/app` — router and top-level providers
- `src/api-authorization` — OIDC wiring and auth provider
- `src/config/env.ts` — typed runtime config from `window.*` globals
- `src/lib` — axios/http, react-query client, shared helpers
- `src/domain/*` — feature domains (menu, orders, inventory, etc.) with api/hooks/types
- `src/components/` — UI components

