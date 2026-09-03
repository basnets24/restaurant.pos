# PaymentService (Restaurant POS)

Payment orchestration. Creates a Stripe **PaymentIntent** when order asks for payment, hands the client secret to the frontend, verifies the result server-side once the browser confirms. .NET 10, PostgreSQL/EF Core, MassTransit/RabbitMQ, Stripe.net.

Confirmation is synchronous and server-side, there is no webhook endpoint and no Stripe Checkout Session.

## Features

- Tenant-scoped payment records in PostgreSQL
- Stripe PaymentIntent creation + server-side confirmation, one payment row per order, retrying a failed payment reuses the row rather than leaking a previous decline into the new attempt
- Consumes `PaymentRequested` from order (published outside the saga, deliberately), publishes `PaymentSessionCreated`/`PaymentSucceeded`/`PaymentFailed`
- JWT bearer auth with scope-based policies, health endpoints, OpenTelemetry traces/metrics

## API surface

- Frontend polls a payment-session endpoint until a client secret is ready, then confirms it in-browser with an embedded Stripe element, no redirect to a Stripe-hosted page.
- A confirm endpoint re-fetches the PaymentIntent from Stripe itself rather than trusting the browser's claim, then publishes the success/failure event.
- Refund policies exist in code but aren't wired to any endpoint yet, there's no refund flow.

## Config

Bound from `appsettings.json`, env vars, or User Secrets. The one thing to know: the section is `StripeSettings`, not `Stripe`, and its only property is `SecretKey` (startup throws if blank). Everything else is the usual Postgres/RabbitMQ/OIDC/CORS settings.

## Getting Started

- Needs .NET SDK 10.0+, PostgreSQL and RabbitMQ, and a Stripe test-mode secret key.
- Normally you don't run this by hand, `./local/dev.sh` from the repo root starts everything.

```bash
dotnet run --project services/payment/PaymentService  # https://localhost:7182 / http://localhost:5238
```

Test payments with Stripe's standard test card (`4242 4242 4242 4242`, any future expiry/CVC/ZIP). The Stripe CLI isn't needed, nothing here listens for forwarded webhook events.

---

License: Proprietary (internal project).
