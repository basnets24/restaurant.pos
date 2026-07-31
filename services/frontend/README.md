# Restaurant POS Frontend

Single-page app for restaurant operations — floor plan, ordering, payments, management — built with React, TypeScript, and Vite. Served as static assets behind Nginx in production.

See [`CLAUDE.md`](./CLAUDE.md) in this folder for the frontend's internal structure and conventions (domain/feature folders, auth layers, testing). This README covers running and building it.

## Quick Start

```bash
cd services/frontend
npm install
npm run dev   # http://localhost:5173
```

The backend services need to be running for the app to do anything useful — normally you don't run the frontend standalone; `./scripts/dev.sh` from the repo root starts everything together, frontend included.

```bash
npm run build     # tsc -b && vite build — also how you typecheck; output to dist/
npm run preview   # serve dist/ at http://localhost:4173
npm run lint       # eslint .
npm run test:e2e   # Playwright — needs the full local stack running first, see ./CLAUDE.md
```

## Configuration

Service URLs are **not** baked into the build — they're read at runtime from `window.*` globals, set by `public/config.js`, with `.env.development`'s `VITE_*` values as a Vite dev-server fallback (`src/config/env.ts`).

| Global | Local dev value |
|---|---|
| `window.IDENTITY_SERVICE_URL` | `http://localhost:5265` |
| `window.CATALOG_SERVICE_URL` | `http://localhost:5062` |
| `window.ORDER_SERVICE_URL` | `http://localhost:5236` |
| `window.PAYMENT_SERVICE_URL` | `http://localhost:5238` |
| `window.RABBITMQ_URL` | `http://localhost:15672` |

- **Local dev**: these come from `public/config.js` (checked in with the defaults above) — edit it if you're running a service on a different port.
- **Other environments**: mount a different `config.js` at `/usr/share/nginx/html/config.js` in the container rather than rebuilding the image.
- Adding a call to a new backend? Extend `ENV` and the `Window` interface in `src/config/env.ts`, and add the matching entry to `config.js` — don't hardcode a URL inline.

## Architecture

- `src/app/` — router (`createBrowserRouter`, all routes lazy-loaded) and top-level providers
- `src/api-authorization/` + `src/auth/` — OIDC login/logout (Authorization Code + PKCE, real cross-origin redirect to Duende's hosted login page), silent renew, tenant/scope accessors
- `src/lib/http.ts` — shared axios instance; injects the bearer token and tenant headers on every request
- `src/domain/<resource>/` — one folder per backend resource (`menu`, `orders`, `cart`, `tables`, `payments`, `notifications`, `identity`, `tenant`, …), each with `api.ts`/`types.ts`/`hooks.ts`
- `src/features/<area>/` — route-level pages per top-level app area (`pos`, `management`, `admin`, `settings`, `home`, `landing`, `join`)
- `src/components/ui/` — generic shadcn-style primitives; domain-aware components live under `features/`
- Real-time table updates over SignalR (`@microsoft/signalr`)

## Docker

```bash
docker build -t restaurant-pos/frontend:1.0.0 .
docker run -d -p 5173:80 restaurant-pos/frontend:1.0.0
```

Nginx serves the static build with an `index.html` SPA fallback for client-side routing. Override config per environment by mounting a different `config.js`:

```bash
docker run --rm -p 8080:80 \
  -v $(pwd)/ops/prod/config.js:/usr/share/nginx/html/config.js:ro \
  restaurant-pos/frontend:1.0.0
```

### Build & push for AKS (amd64)

```bash
export version=1.0.0
export ACR=acrpos

docker buildx build \
  --platform linux/amd64 \
  -t "$ACR.azurecr.io/pos.frontend:$version" \
  --push .
```

### Install the Helm chart

```bash
namespace="frontend"
helm install frontend-client ./helm --create-namespace -n $namespace
```

---

License: Proprietary (internal project).
