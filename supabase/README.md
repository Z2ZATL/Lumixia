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
- `execution-api`

`stripe-webhook` is configured as a public function in `config.toml` because Stripe cannot send a Supabase JWT.

## Live billing safety

- Manual top-up uses Stripe Checkout Sessions.
- Auto reload uses PaymentIntents off-session after a saved payment method exists.
- Live Stripe checkout is intentionally blocked on `localhost`, `127.0.0.1`, and `::1`.
- Use Stripe test mode for local development and switch to live secrets only on a production origin.
- Set `LUMIXIA_ALLOWED_ORIGINS` in Edge Function secrets to a comma-separated allowlist of real frontend origins before going live.
- Set `STRIPE_WEBHOOK_TOLERANCE_SECONDS` explicitly for production webhook freshness checks.
- Manual execution-credit refunds are intentionally not exposed to authenticated clients; refund handling should stay on secure server-side paths only.
- Keep `LUMIXIA_EXECUTION_CREDITS_MODE=stub` while Code Architect AI is a demo/mock workspace. Switch it to `live` only after the execution API is the trusted server-side owner of session status, audit logs, and credit debit decisions.

## Frontend auth and execution env

- `VITE_PUBLIC_APP_ORIGIN` must point to the trusted browser origin used for passwordless redirect flows.
- `VITE_EXECUTION_MODE=api` should only be enabled when `VITE_EXECUTION_API_AUTH_MODE=supabase-jwt` is configured and the upstream service validates Supabase bearer tokens.
- `VITE_EXECUTION_API_BASE_URL` can point to `https://your-project-ref.supabase.co/functions/v1/execution-api`; when omitted, the frontend derives that Supabase function URL from `VITE_SUPABASE_URL`.
- If those execution envs are not present, Lumixia intentionally stays in mock/demo workspace mode.
- Do not rename Code Architect AI to Dremo Code in production branding until the server-owned execution/event/credit flow is complete.
