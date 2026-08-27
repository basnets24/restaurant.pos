# Production deployment (VM + Caddy + GHCR)

CI/CD pipeline: `build-and-push-images.yml` builds and pushes all 5 service images to GHCR on
push to `main`; `deploy.yml` then SSHes into the VM, writes a fresh `.env` from GitHub Secrets,
and runs `docker compose pull && docker compose up -d`. The VM never holds source code or a
hand-maintained `.env` — GitHub Secrets are the single source of truth, rewritten on every deploy.

## One-time VM setup

1. Provision a VM (any provider — a $12–24/mo box is enough: 4 backend services + frontend +
   rabbitmq + seq + caddy, all lightweight). Ubuntu 22.04+ recommended.
2. Install Docker + the Compose plugin: https://docs.docker.com/engine/install/
3. Add the deploy user to the `docker` group so it can run `docker compose` without `sudo`:
   `usermod -aG docker <user>`
4. Generate a dedicated SSH keypair for CI (`ssh-keygen -t ed25519 -f deploy_key`), add the
   public key to the VM's `~/.ssh/authorized_keys`, and keep the private key for the
   `DEPLOY_SSH_KEY` secret below.
5. Open inbound ports 80 and 443 on the VM's firewall/security group. No other ports need to be
   public — rabbitmq, seq, and all 4 backend services stay on the internal compose network.
6. Point DNS records at the VM's public IP: an **A record** for the root domain (`@`),
   **A records** for `identity`, `catalog`, `order`, `payment`, `jaeger`, `prometheus`,
   `grafana`, and either an A record or a CNAME-to-root for `www`. Caddy issues Let's Encrypt
   certs automatically once these resolve.
7. Create `~/restaurant-pos` on the VM (the deploy workflow's `scp` step creates
   `~/restaurant-pos/deploy` on top of it automatically — nothing else to pre-create).

## Identity's signing certificate

IdentityServer refuses to boot in any non-Development environment without a real signing
certificate — `AddDeveloperSigningCredential()` (what local dev uses) generates a throwaway key
that isn't persisted, so every restart would invalidate every previously issued token. Generate
one **once**, keep the PEM values stable across deploys (that's why they're secrets CD writes
fresh each time rather than files left on the VM to drift):

```bash
openssl req -x509 -newkey rsa:2048 -sha256 -days 730 -nodes \
  -keyout identity-signing.key -out identity-signing.cer \
  -subj "/CN=identity.spoontab.com"
```

Paste the full contents of `identity-signing.cer` into `IDENTITY_SIGNING_CERT_PEM` and
`identity-signing.key` into `IDENTITY_SIGNING_KEY_PEM` (below), then delete both local files —
they only need to exist as GitHub Secrets from here on. It's self-signed on purpose: this cert
only signs JWTs for internal verification between services, it isn't presented over TLS to
browsers (Caddy + Let's Encrypt handles that separately), so no public CA is needed. Rotating it
later invalidates every token issued under the old one — treat it as a rare, deliberate action,
not routine key hygiene.

## GHCR image visibility

GHCR packages are **private by default**. The VM needs to authenticate to pull them, which is
what `GHCR_PAT` (below) is for — a personal access token with `read:packages` scope, used for
`docker login ghcr.io` on the VM before every `docker compose pull`.

If you'd rather skip that: after the first successful build, go to each package's settings on
GitHub (Packages tab → `pos-identity` etc.) and set visibility to **public**. Public packages
need no `docker login` at all — you can then drop `GHCR_PAT` from `deploy.yml`'s script.

## Required GitHub repo secrets

Set these under **Settings → Secrets and variables → Actions**. Names and purposes only — the
values are yours to set; nothing here is created on your behalf.

| Secret | Purpose |
|---|---|
| `DEPLOY_HOST` | VM's IP or hostname |
| `DEPLOY_USER` | SSH user on the VM (must be in the `docker` group) |
| `DEPLOY_SSH_KEY` | Private half of the CI SSH keypair from step 4 above |
| `GHCR_PAT` | GitHub PAT with `read:packages`, only needed if GHCR packages stay private |
| `SUPABASE_DB_HOST` | e.g. `aws-0-ca-central-1.pooler.supabase.com` |
| `SUPABASE_DB_PORT` | **`5432`** — session-mode pooler. Not `6543` (transaction mode); that breaks EF Core's migration batches, see `CLAUDE.md` |
| `SUPABASE_DB_USER` | e.g. `postgres.<project-ref>` |
| `SUPABASE_DB_PASSWORD` | The database password set when creating the Supabase project |
| `SUPABASE_DB_NAME` | `postgres` (Supabase's default database name) |
| `IDENTITY_ADMIN_PASSWORD` | Seed admin user's password for the identity service |
| `STRIPE_SECRET_KEY` | Stripe **secret** key (payment service, server-side) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe **publishable** key (frontend, safe to expose client-side — still sourced from a secret here for consistency with everything else being GitHub-Secrets-driven) |
| `IDENTITY_SIGNING_CERT_PEM` | Self-signed cert PEM for IdentityServer token signing — see "Identity's signing certificate" above |
| `IDENTITY_SIGNING_KEY_PEM` | Matching private key PEM — generated alongside the cert above |

`DOMAIN=spoontab.com` is a plain value hardcoded in `deploy.yml`, not a secret — it's not
sensitive and there's only one production domain.

## How a deploy happens

1. Push to `main` (or manually run `build-and-push-images.yml` via `workflow_dispatch`).
2. `build-and-push-images.yml` builds and pushes all 5 images to GHCR.
3. `deploy.yml` fires automatically once that completes successfully (`workflow_run` trigger),
   or can be run manually via `workflow_dispatch` (optionally pinning a specific `image_tag`
   instead of `latest` — useful for a quick rollback to a known-good git-sha tag).
4. It copies `deploy/docker-compose.yml`, `deploy/Caddyfile`, `deploy/config.js`,
   `deploy/prometheus.yml`, and `deploy/grafana/` to the VM, writes `.env` from the secrets
   above, substitutes the real Stripe publishable key into `config.js`, then runs
   `docker compose pull && docker compose up -d`.

## Verifying a deploy

- `https://identity.spoontab.com/.well-known/openid-configuration` returns real IdentityServer
  discovery JSON with valid Let's Encrypt TLS.
- `https://spoontab.com` (and `https://www.spoontab.com`) loads the frontend and can sign in.
- `docker compose ps` on the VM shows all 10 services (`rabbitmq`, `seq`, `jaeger`,
  `prometheus`, `grafana`, 4 backend services, `frontend`, `caddy`) healthy/running.

## Observability (Jaeger / Prometheus / Grafana)

Included for demo purposes, not production monitoring rigor: **no persistent volumes**, so
traces, metrics, and dashboards reset on every redeploy or container restart. Reachable at
`https://jaeger.spoontab.com`, `https://prometheus.spoontab.com`, `https://grafana.spoontab.com`
— all public, no auth in front (Grafana runs with anonymous access enabled but pinned to the
**Viewer** role, not Admin, so a visitor can look but not edit/delete dashboards or touch the
data source). Don't put anything sensitive in a dashboard panel title or Prometheus label.

Backend services export traces to `jaeger:6831` (`JaegerSettings__Host` in
`docker-compose.yml`) and expose Prometheus metrics at `/metrics`, scraped per
`deploy/prometheus.yml`. Grafana's Prometheus datasource is provisioned automatically from
`deploy/grafana/provisioning/`; add dashboards through the UI (they won't survive a restart) or
commit dashboard JSON under `deploy/grafana/provisioning/dashboards/` if you want them to.

## Out of scope

Provisioning the VM itself, buying the domain, creating the Supabase project, and setting any
secret value — all user actions.
