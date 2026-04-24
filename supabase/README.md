# Supabase Billing and Dashboard Assets

## Canonical SQL order

Apply these files in order:

1. `sql/schema/dashboard_schema_v1.sql`
2. `sql/schema/credits_hardening_v1.sql`
3. `sql/ops/dashboard_permissions_repair_v1.sql`
4. `sql/seed/dashboard_seed_v1.sql`
5. `sql/seed/credits_seed_v1.sql`

Operational helpers under `sql/ops/` should only be used for verification or targeted repair after the canonical schema is already in place.

## Active edge functions

Only these production functions are active:

- `billing-overview`
- `billing-checkout-session`
- `billing-auto-reload`
- `billing-auto-reload-sweeper`
- `billing-expiry-sweeper`
- `stripe-webhook`

`stripe-webhook` is configured as a public function in `config.toml` because Stripe cannot send a Supabase JWT.

## Live billing safety

- Manual top-up uses Stripe Checkout Sessions.
- Auto reload uses PaymentIntents off-session after a saved payment method exists.
- Live Stripe checkout is intentionally blocked on `localhost`, `127.0.0.1`, and `::1`.
- Use Stripe test mode for local development and switch to live secrets only on a production origin.
