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

## Local-dev Worker Boundary

`tools/local-dev-worker/` is the first out-of-bundle worker boundary for future local-dev Docker execution. It is not imported by `src/`, does not expose a browser or production UI execution path, and remains blocked/dry-run only until a separate security-reviewed worker PR enables local-dev execution.

PR #20 extends that boundary with a dry-run adapter, dependency-free request validation, deterministic trace/audit metadata, fixture coverage, an executable TypeScript self-check harness, npm verification scripts, and a stronger safety scan. It still performs no real execution and preserves `noExecution: true`.

PR #21 adds the final pre-execution review layer: a disabled-by-default capability manifest, a pure manual review gate, a readiness evaluator, readiness fixtures, and self-check coverage for future execution eligibility. It still performs no real execution and keeps `noExecution: true`.

PR #22 adds the first manually gated local-dev version command execution adapter. Execution is isolated to `tools/local-dev-worker`, disabled by default, not imported by `src/`, and limited to reviewed non-Docker version/identity commands. Docker CLI execution remains blocked.

PR #23 adds the first Docker-specific probe inside that same worker boundary. Only `docker --version` may be attempted, and only with the Docker-specific reviewed local-dev config and trusted review scope. It does not run containers, query daemon state, mount Docker socket, mount home directories, or expose execution through `src/`, Dremo Lab, production UI, Supabase functions, SQL, billing, or TerminalWorkspace.

PR #24 adds Docker daemon readiness classification for local-dev only. It may attempt `docker version --format "{{json .}}"` under a separate reviewed readiness config to classify `cli_unavailable`, `daemon_unavailable`, or `daemon_available`. It still does not start containers, pull or build images, inspect runtime objects, mount Docker socket, mount home directories, use network commands, or expose execution to browser or production paths.

## Current Execution Status After PR #24

| Area | Status |
| --- | --- |
| Browser sandbox | Browser-safe policy validation only. No worker import and no execution. |
| Worker boundary | Local-dev-only adapter exists for reviewed version/identity commands. Default config blocks execution. |
| Review gates | Capability and manual-review readiness gate execution before the adapter can run. |
| Docker | `docker --version` and the readiness-only `docker version --format "{{json .}}"` may be attempted under separate Docker-specific trusted local-dev configs. `docker info`, `docker run`, `docker build`, `docker compose`, image/container commands, socket paths, and mounts remain denied. |
| Network | No worker runtime calls. |
| File writes | No worker runtime writes. |
| Secrets | Not read or injected. |
| Production UI | No path to worker execution. |

## Recommended Next PR

The next Docker PR should still not jump directly to arbitrary `docker run`. Keep the next step to container execution design review, workspace policy, and a no-network/no-mount container plan.
