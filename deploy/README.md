# Production deployment

Single VM behind Caddy. Images are built and pushed to GitHub Container Registry, then pulled down by a deploy workflow over SSH. The VM never holds source code or a hand-edited environment file, GitHub Secrets are the source of truth, rewritten fresh every deploy.

## How a deploy happens

- Push to main builds and pushes all five images.
- Deploy workflow connects over SSH, copies the compose file and config, writes a fresh env file, brings the stack up with the new images.
- Can also run manually, optionally pinning an older tag for a quick rollback.

## Checking it worked

- Identity's discovery endpoint returns real config over a valid certificate.
- The main site loads and sign-in works.
- All eleven containers show healthy on the VM.

## What deployment needs, one time

- Provision a small VM, $12 to 24 a month is enough. Ubuntu 22.04 or newer.
- Install Docker and the Compose plugin, add the deploy user to the docker group.
- Generate a dedicated SSH keypair for CI, add the public half to the VM, keep the private half for the DEPLOY_SSH_KEY secret.
- Open only ports 80 and 443. Everything else stays on the internal network behind Caddy.
- Point DNS at the VM: A records for the root domain plus identity, catalog, order, payment, jaeger, prometheus, grafana, and www.
- Create a restaurant-pos folder on the VM. The deploy workflow builds out everything under it.

## Identity's signing certificate

- Every login token the identity service hands out is signed with a certificate, so other services can trust it's genuine.
- In development, that certificate is a throwaway one generated fresh each time the app starts. In production that's not good enough, a restart would invalidate every token that had been issued, logging everyone out.
- So for production, one certificate is generated a single time and reused forever. It's stored as a secret, and the deploy workflow writes it onto the VM fresh on every deploy rather than leaving it as a file that could get lost or drift out of sync.
- It's self-signed, meaning it isn't from a public certificate authority like the one Caddy uses for HTTPS. That's fine here, since this certificate is only used internally, for services to verify each other's tokens, it's never shown to a browser.
- Replacing this certificate later would invalidate every token issued under the old one, logging everyone out at once. Treat that as a rare, deliberate action, not routine maintenance.

## Container image access

- GHCR packages are private by default, the VM needs GHCR_PAT to pull them.
- Or, switch each package to public in its GitHub settings after the first build, then drop the secret and login step.

## Secrets the deploy needs

| Secret | Purpose |
|---|---|
| DEPLOY_HOST | VM IP or hostname |
| DEPLOY_USER | SSH user on the VM |
| DEPLOY_SSH_KEY | Private half of the deploy keypair |
| GHCR_PAT | Package read access, only needed if images stay private |
| SUPABASE_DB_HOST, PORT, USER, PASSWORD, NAME | Supabase connection details. Port 5432, session-mode, not 6543 |
| IDENTITY_ADMIN_PASSWORD | Seed admin user's password |
| STRIPE_SECRET_KEY | Stripe secret key, server-side |
| STRIPE_PUBLISHABLE_KEY | Stripe publishable key, safe client-side, kept as a secret for consistency |
| IDENTITY_SIGNING_CERT_PEM, IDENTITY_SIGNING_KEY_PEM | The certificate and key above |

- spoontab.com itself is a plain value in the deploy workflow, not a secret.

## Observability

- Jaeger, Prometheus, Grafana are for demos, not production monitoring, no persistent data, everything resets on redeploy or restart.
- Public subdomains, no login in front. Grafana allows anonymous viewing but not editing.
- Keep anything sensitive out of dashboard titles or metric labels.
