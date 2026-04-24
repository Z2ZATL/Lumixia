# Contributing

## Branching

- Branch from `main`
- Use focused branches per task
- Prefer small, reviewable pull requests over large mixed changes

## Before opening a PR

Run:

```bash
npm run typecheck
npm run build
```

For Supabase or billing changes, also verify:

- touched SQL files are in the correct canonical folder
- Edge Functions still match the active production flow
- no secrets or local environment files are staged

## Commit guidance

- Keep one logical change per commit when possible
- Use clear commit messages such as:
  - `feat: add Stripe checkout launch state`
  - `fix: prevent redundant profile hydration on tab refocus`
  - `docs: add billing deployment checklist`

## Billing safety rules

- Do not reintroduce custom raw card-entry UI
- Treat Stripe Checkout and Stripe webhooks as the manual top-up authority
- Fail closed when Stripe or Supabase billing config is incomplete
- Avoid changing live billing behavior without test-mode verification first

