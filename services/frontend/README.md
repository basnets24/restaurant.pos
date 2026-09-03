# Restaurant POS Frontend

Single-page app for restaurant operations, floor plan, ordering, payments, management. React, TypeScript, Vite. Served as static assets behind Nginx in production.

## Features

- Staff POS: floor plan, ordering, payments, management, admin, settings
- A separate customer-facing diner ordering surface in the same app, its own auth, header, and cart
- Real-time table updates over SignalR
- OIDC login for staff (Authorization Code + PKCE, real redirect to identity's hosted login page), a separate password-grant flow for diners so an inline sign-in modal works
- Talks to each backend service directly, no API gateway or BFF in front

## Structure

- One folder per backend resource under a domain layer (menu, orders, cart, tables, payments, notifications, identity, tenant, plus the diner-facing trio), each with its own API calls, types, and query hooks
- One folder per top-level app area under a features layer (pos, management, admin, settings, home, landing, join, diner)
- Generic UI primitives are kept separate from domain-aware components

## Config

Backend service URLs live in `public/config.js`, a plain script loaded by the page, not compiled into the build. Running `npm run dev` locally uses Vite env vars instead. To point at a service on a different port, edit `config.js` directly. To change URLs in production, swap in a different `config.js` file, no rebuild needed.

## Getting Started

```bash
cd services/frontend
npm install
npm run dev   # http://localhost:5173
```

The backend services need to be running for the app to do anything, normally you don't run the frontend standalone, `./local/dev.sh` from the repo root starts everything together.

```bash
npm run build     # tsc -b && vite build, also how you typecheck
npm run lint       # eslint .
npm run test:e2e   # Playwright, needs the full local stack running first
```

---

License: Proprietary (internal project).
