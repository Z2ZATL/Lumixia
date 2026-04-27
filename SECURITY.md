# Security Policy

## Supported scope

This repository contains application code and Supabase/Stripe integration assets for Lumixia.

## Reporting

Please do not open public issues for:

- leaked credentials
- billing vulnerabilities
- webhook verification issues
- credit grant or ledger bypass findings

Report security-sensitive issues privately to the repository owner first.

## Sensitive data rules

- Never commit `.env`, `.env.local`, `.env.billing.production`, or live keys
- Rotate any Stripe live key immediately if it is exposed
- Remove or replace workspace-local files that still contain live secrets after rotation; keep only `.example` files in the repo shape
- Keep webhook signing secrets out of source control
- Keep `LUMIXIA_ALLOWED_ORIGINS` configured for real production frontend origins
- Keep `VITE_PUBLIC_APP_ORIGIN` pinned to the trusted frontend origin used for passwordless auth redirects
- Do not store raw PAN/CVC or custom card-entry logic in the repo

## High-risk areas

- `supabase/functions/stripe-webhook`
- `supabase/functions/billing-checkout-session`
- `supabase/functions/billing-auto-reload`
- `supabase/functions/_shared/billing.ts`
- `supabase/sql/schema/credits_hardening_v1.sql`

## Billing abuse controls

- Do not expose direct client refund paths for execution credits unless the refund decision is enforced server-side
- Keep Stripe webhook fulfillment idempotent and authoritative for credit grants
- Treat CORS as an allowlist configuration, not a wildcard default, in production
- Do not promote client-side localStorage review/onboarding flags into canonical server consent fields
- Treat execution API mode as opt-in and require JWT-validated backend auth before enabling it outside demo mode
- Keep execution session ownership checks server-side; the browser may send an agent slug or session id, but the backend must derive the user from the Supabase bearer token
- Keep execution audit logs and live execution-credit debits server-owned; the browser must not insert execution logs or decide execution refunds
- Keep Code Architect AI as demo/mock branding until the Dremo Code execution/event/credit path is server-owned end to end
