# Dremo Code Architecture Docs

Status: proposed documentation only.

Dremo Code is Lumixia's future autonomous coding workspace. It is intended to replace the current Code Architect AI workspace only after the backend, event model, sandbox, credit, and audit paths are server-owned and production-ready.

Dremo Code is not just a chat assistant. It must be able to take a user task, inspect a repository, create a plan, request approvals, execute in a sandbox, stream terminal and tool events, produce diffs, run verification, perform self-review, repair failures where safe, and deliver a final report with artifacts.

The guiding principle is simple: the browser renders trusted state, but it does not create trusted execution, billing, or audit facts.

## Current Context

Lumixia is currently a Vite, React, and TypeScript single-page app backed by Supabase. It already has dashboard agents, Supabase auth, credits, billing, an `execution-api`, and hardened `execution_sessions` / `execution_logs` permissions.

The current Code Architect AI workspace remains a mock/demo surface. It must not be renamed to Dremo Code in production branding until the Dremo backend owns execution state, event writes, sandbox lifecycle, and credit accounting.

## Documentation Map

| File | Purpose |
| --- | --- |
| [architecture.md](./architecture.md) | Proposed system architecture and component boundaries. |
| [api-contract.md](./api-contract.md) | Proposed authenticated Dremo API routes. |
| [event-schema.md](./event-schema.md) | Proposed server-owned structured event stream model. |
| [database-schema.md](./database-schema.md) | Proposed future `dremo_*` tables and RLS direction. |
| [sandbox-security.md](./sandbox-security.md) | Sandbox threat model, isolation rules, and provider criteria. |
| [sandbox-provider-decision.md](./sandbox-provider-decision.md) | Proposed sandbox provider decision, MVP path, and production boundary. |
| [docker-execution-security-checklist.md](./docker-execution-security-checklist.md) | Required gate before any local-dev Docker execution PR. |
| [credit-billing-flow.md](./credit-billing-flow.md) | Trusted task credit reservation, charging, and refund model. |
| [frontend-workspace.md](./frontend-workspace.md) | Proposed Dremo workspace UI and responsive requirements. |
| [migration-plan.md](./migration-plan.md) | Phased path from Code Architect AI mock to Dremo Code. |
| [open-questions.md](./open-questions.md) | Decisions that must be resolved before implementation. |

## Non-goals For This PR

| Non-goal | Reason |
| --- | --- |
| No runtime implementation | This PR defines architecture only. |
| No schema migration | Future database changes need a dedicated migration PR. |
| No Code Architect rename | Branding must wait until server-owned execution and billing are ready. |
| No sandbox execution | Sandbox provider and isolation strategy are still proposed. |
| No billing behavior changes | Credit flow changes require separate backend and SQL work. |

## Server-owned Requirements

Dremo Code must be audit-safe from day one:

| Area | Requirement |
| --- | --- |
| Auth | Every API request derives the user from a validated Supabase JWT. |
| Execution | Backend creates tasks, events, sandbox sessions, and final status. |
| Events | Frontend can read event streams but cannot insert trusted runtime events. |
| Billing | Backend reserves, charges, refunds, or releases credits. |
| Artifacts | Backend controls artifact creation, retention, and access. |
| Approvals | User decisions are captured through authenticated API calls. |

## Recommended Next PR

The next PR should add a sandbox runner interface without executing commands. It should define provider interfaces, policy config shape, and event mapping only. It should not add Docker/E2B/Daytona integration code, arbitrary command execution, billing changes, or Code Architect AI rename work.
