# Lumixia

Lumixia is a route-based React + Supabase application with a premium onboarding flow, dashboard discovery experience, and a production-oriented Stripe Checkout-first credits system.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Supabase
- Stripe Checkout + Supabase Edge Functions

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Validate before pushing:

```bash
npm run typecheck
npm run build
```

## Environment

Frontend expects:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_CREDITS_MODE`

Billing production examples live in `.env.billing.production.example`.

## Repository layout

- `src/app`
  App shell, routing, and session lifecycle.
- `src/features/auth`
  Authentication, review gate, onboarding, and profile hydration helpers.
- `src/features/billing`
  Credits and billing UI, billing data access, and billing domain types.
- `src/features/dashboard`
  Discovery/dashboard UI, execution demo flow, and dashboard data/state.
- `src/lib`
  Shared infrastructure such as the Supabase client.
- `supabase/functions`
  Active Edge Functions for billing, webhooks, and scheduled jobs.
- `supabase/sql`
  Canonical schema, seed, and operational SQL assets.

## Billing notes

- Manual credit purchases use Stripe Checkout Sessions.
- Live Stripe checkout is intentionally blocked on loopback origins such as `localhost` and `127.0.0.1`.
- Stripe webhooks are authoritative for credit grants and post-checkout fulfillment.
- Additional Supabase billing deployment notes are in `supabase/README.md`.

## Git workflow

- Keep commits focused and small.
- Run `npm run typecheck` and `npm run build` before opening a pull request.
- Never commit secrets, live keys, or generated runtime artifacts.
