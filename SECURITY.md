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
- Keep webhook signing secrets out of source control
- Do not store raw PAN/CVC or custom card-entry logic in the repo

## High-risk areas

- `supabase/functions/stripe-webhook`
- `supabase/functions/billing-checkout-session`
- `supabase/functions/billing-auto-reload`
- `supabase/functions/_shared/billing.ts`
- `supabase/sql/schema/credits_hardening_v1.sql`

