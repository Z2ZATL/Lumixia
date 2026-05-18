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
| [ADR index](../adr/README.md) | Architecture Decision Records for Dremo worker and sandbox decisions. |
| [architecture.md](./architecture.md) | Proposed system architecture and component boundaries. |
| [api-contract.md](./api-contract.md) | Proposed authenticated Dremo API routes. |
| [event-schema.md](./event-schema.md) | Proposed server-owned structured event stream model. |
| [database-schema.md](./database-schema.md) | Proposed future `dremo_*` tables and RLS direction. |
| [sandbox-security.md](./sandbox-security.md) | Sandbox threat model, isolation rules, and provider criteria. |
| [sandbox-provider-decision.md](./sandbox-provider-decision.md) | Proposed sandbox provider decision, MVP path, and production boundary. |
| [docker-execution-security-checklist.md](./docker-execution-security-checklist.md) | Required gate before any local-dev Docker execution PR. |
| [local-dev-worker-capability-registry.md](./local-dev-worker-capability-registry.md) | Operator reference mapping worker capabilities, policies, adapters, fixtures, golden checks, telemetry schema, and verification checks. |
| [local-dev-worker-operator-guide.md](./local-dev-worker-operator-guide.md) | Operator guide for understanding, running, verifying, and safely extending the local-dev worker. |
| [local-dev-worker-troubleshooting.md](./local-dev-worker-troubleshooting.md) | Troubleshooting matrix for worker verification, lifecycle reports, Docker local state, and policy blocks. |
| [local-dev-worker-extension-playbook.md](./local-dev-worker-extension-playbook.md) | Future PR playbook for docs, reporting, telemetry, CLI UX, safety checks, and narrow reviewed capabilities. |
| [local-dev-worker-threat-model-v2.md](./local-dev-worker-threat-model-v2.md) | Threat model for local-dev worker trust boundaries, assets, mitigations, residual risks, and future review gates. |
| [local-dev-worker-threat-checklist.md](./local-dev-worker-threat-checklist.md) | Future PR author checklist for local-dev worker security scope and verification. |
| [local-dev-worker-release-readiness.md](./local-dev-worker-release-readiness.md) | Release and handoff readiness checklist for the local-dev worker, Docker smoke lifecycle, docs, verification, and future integration blockers. |
| [future-workspace-execution-design-constraints.md](./future-workspace-execution-design-constraints.md) | Design constraints and staged prerequisites before any future workspace mount or repo execution work. |
| [future-workspace-execution-review-checklist.md](./future-workspace-execution-review-checklist.md) | Future PR checklist for workspace/repo execution scope, path, mount, command, network, secret, cleanup, telemetry, and boundary review. |
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

PR #25 adds the final pre-container design gates: image allowlist policy, container command policy, no-network/no-mount resource and security policies, a plan-only Docker run preview model, readiness gate fixtures, and self-check coverage. It still does not execute `docker run`, start containers, pull/build images, mount workspaces, enable network, or expose execution to browser/production paths.

PR #26 adds the first reviewed local-dev Docker container smoke execution. Only the exact `alpine:3.20` + `echo hello` command may run, and only through `tools/local-dev-worker` with `--pull=never`, `--network none`, no mounts, no shell, no host environment, bounded output, and trusted manual review. PR #28 adds the static container name and allowlisted labels to that exact command. Docker/image unavailability is returned as structured output and is not a safety failure.

PR #27 hardens that smoke path with audit normalization, stable outcome categories, output sanitization/redaction, audit-safe summaries, cleanup-risk metadata, and self-check fixtures. It does not add any new Docker command, cleanup execution, image, network, mount, workspace, browser, or production capability.

PR #28 adds deterministic smoke container identity and cleanup review planning. The exact smoke command now includes static `--name lumixia-dremo-smoke-echo` and allowlisted `lumixia.dremo.*` labels, and the future cleanup preview is modeled as `docker rm -f lumixia-dremo-smoke-echo` without execution.

PR #29 adds the first reviewed local-dev cleanup execution path. It may attempt only `docker rm -f lumixia-dremo-smoke-echo` under the cleanup-specific trusted review/config. Missing containers, Docker CLI absence, and daemon unavailability are structured outcomes rather than safety failures.

PR #30 adds a local-dev Docker smoke lifecycle orchestrator that composes the already-reviewed readiness classifier, exact smoke command, audit normalization, and exact cleanup command. It adds no new Docker command capability, no new process API file, and the self-check uses dependency-injected fake adapters so Docker Desktop, `alpine:3.20`, and a cleanup target are not required.

PR #31 adds lifecycle report formatting utilities for future CLI/UI/audit display. Reports are generated from existing lifecycle results only, re-sanitize stdout/stderr previews, map outcomes to stable next actions, and do not add Docker execution, cleanup execution, browser integration, production UI, Supabase, SQL, or billing behavior.

PR #32 adds a local-dev CLI wrapper under `tools/local-dev-worker` for the existing Docker smoke lifecycle report. It can print sanitized Markdown or deterministic JSON, includes a dry-report fixture mode that does not require Docker, accepts no user-provided command/image/container/cleanup input, and is not imported by `src/` or exposed through Dremo Lab/production UI.

PR #33 adds golden Markdown and JSON checks for the deterministic dry-report fixture output. The checker imports fixture functions directly, does not execute Docker or cleanup, and protects report format stability without adding browser, production, Supabase, SQL, billing, or Docker capability changes.

PR #34 adds operator-readiness documentation for the local-dev worker. The operator guide, troubleshooting matrix, extension playbook, and docs link check make the current worker easier to run and safely extend without changing runtime behavior, Docker command capability, browser/production paths, Supabase, SQL, billing, branding, or TerminalWorkspace.

PR #35 adds local-dev lifecycle telemetry schema design. It defines typed event shapes, redaction policy, pure event builders, deterministic fixtures, self-check coverage, and safety scan coverage without collecting, uploading, persisting, transmitting, storing, or writing telemetry anywhere.

PR #36 adds deterministic golden checks for local-dev telemetry fixture JSON. The checker reads the committed fixture, regenerates fixture JSON from local telemetry fixtures, validates output safety, and compares the results without uploading, storing, transmitting, writing runtime telemetry files, calling networks, or touching databases.

PR #37 adds [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md) for the Dremo local-dev worker boundary and Docker smoke lifecycle. It records the architecture decision, safety invariants, capability ladder, verification stack, and future extension rules without changing runtime behavior.

PR #38 adds the [local-dev worker capability registry](./local-dev-worker-capability-registry.md), an operator-facing reference that maps executable, plan-only, report-only, schema-only, golden-check, and verification-only surfaces to their files, fixtures, docs, and safety notes without changing runtime behavior.

PR #39 adds the [local-dev worker threat model v2](./local-dev-worker-threat-model-v2.md) and [threat checklist](./local-dev-worker-threat-checklist.md). They document trust boundaries, assets, threats, mitigations, residual risks, verification coverage, and future security review gates without changing runtime behavior.

PR #40 adds the [local-dev worker release readiness checklist](./local-dev-worker-release-readiness.md). It gives maintainers a handoff checklist, release decision template, readiness status matrix, and future integration blockers without changing runtime behavior.

PR #41 adds [future workspace execution design constraints](./future-workspace-execution-design-constraints.md) and a [future workspace execution review checklist](./future-workspace-execution-review-checklist.md). They document prerequisites, forbidden defaults, staged review gates, and blocked implementation work before any future workspace mount or repo command execution is allowed.

PR #42 adds a synthetic workspace path policy design under `tools/local-dev-worker`. The policy is string-only and fixture-only: it normalizes synthetic `/workspace` read paths and denies host paths, parent traversal, home paths, `.env`, secrets, `.git`, `node_modules`, symlink following, writes, executes, null bytes, and shell metacharacters without reading or writing real files.

## Current Execution Status After PR #42

| Area | Status |
| --- | --- |
| Browser sandbox | Browser-safe policy validation only. No worker import and no execution. |
| Worker boundary | Local-dev-only adapter exists for reviewed version/identity commands. Default config blocks execution. |
| Review gates | Capability and manual-review readiness gate execution before the adapter can run. |
| Docker | `docker --version` and the readiness-only `docker version --format "{{json .}}"` may be attempted under separate Docker-specific trusted local-dev configs. Arbitrary `docker run`, `docker info`, `docker build`, `docker compose`, image/container commands, socket paths, and mounts remain denied. |
| Container execution | One exact local-dev smoke path may run with static `--name`, allowlisted labels, `--network none`, `--pull=never`, read-only root filesystem, dropped capabilities, no-new-privileges, resource caps, `--user 65534:65534`, `alpine:3.20`, and `echo hello`. No arbitrary image, command, metadata, pull/build/compose/exec, mounts, network, shell, root user, workspace access, or production/browser path exists. |
| Audit normalization | Smoke results normalize to stable outcomes such as success, Docker CLI unavailable, daemon unavailable, local image unavailable, timeout, policy blocked, execution failed, or unexpected output. |
| Cleanup | One exact reviewed local-dev cleanup command may run: `docker rm -f lumixia-dremo-smoke-echo`. Arbitrary names, container IDs, wildcards, multiple targets, `docker ps`, `docker inspect`, `docker stop`, `docker kill`, and prune remain denied. |
| Lifecycle orchestration | Local-dev worker can compose readiness -> exact smoke -> audit -> exact cleanup using existing reviewed adapters only. Dependency-injected self-checks cover ordering and cleanup decisions without requiring Docker. |
| Lifecycle reports | Worker can format existing lifecycle results into sanitized Markdown and deterministic JSON summaries for future local tooling. No browser or production path exists. |
| Lifecycle CLI | Worker can print those sanitized reports from a local-dev-only CLI. Fixture mode is deterministic and does not invoke Docker. No browser, production, Supabase, SQL, billing, branding, or TerminalWorkspace path exists. |
| Golden reports | Worker has committed fixture Markdown/JSON golden files and a fixture-only checker. No Docker, cleanup, browser, or production path is used. |
| Operator docs | Operator guide, troubleshooting matrix, extension playbook, and docs link check are docs/operator-readiness only. |
| Telemetry schema | Local-dev-only schema objects, redaction policy, event builders, and fixtures exist for future lifecycle telemetry. No upload, analytics provider, network, DB write, file write, browser path, or production path exists. |
| Telemetry golden | Committed telemetry fixture JSON and a fixture-only checker protect telemetry schema output stability. No telemetry collection, upload, persistence, runtime file write, network, DB, browser, or production path exists. |
| Architecture decision | [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md) records the accepted worker boundary, Docker smoke lifecycle, safety invariants, verification stack, and future extension rules. |
| Capability registry | [Registry reference](./local-dev-worker-capability-registry.md) maps every current worker capability and check to files, fixtures, docs, and safety notes. |
| Threat model | [Threat model v2](./local-dev-worker-threat-model-v2.md) and [threat checklist](./local-dev-worker-threat-checklist.md) document boundaries, assets, mitigations, residual risks, and future security review gates. |
| Release readiness | [Release readiness checklist](./local-dev-worker-release-readiness.md) documents handoff criteria, verification commands, readiness blockers, and future integration blockers. |
| Workspace execution design | [Future workspace constraints](./future-workspace-execution-design-constraints.md) and [review checklist](./future-workspace-execution-review-checklist.md) block workspace mounts, repo execution, package install, network, browser bridge, and production UI paths until separate staged reviews exist. |
| Synthetic workspace path policy | String-only TypeScript policy and fixtures model safe synthetic read paths under `/workspace`; no real filesystem reads, writes, mounts, symlink following, or repo execution exists. |
| Network | Disabled for container smoke with `--network none`; no network command surface exists. |
| File writes | No worker runtime writes. |
| Secrets | Not read or injected. |
| Production UI | No path to worker execution. |

## Recommended Next PR

Future PR #43 should add golden path-policy fixtures or remain reporting, telemetry design, documentation, or operator-experience oriented. It should not add telemetry upload or expand to arbitrary repo execution, workspace mounts, network, package install, broad cleanup, browser-to-worker bridges, production UI execution, or broader Docker runtime commands.
