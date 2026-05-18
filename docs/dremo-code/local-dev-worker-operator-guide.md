# Dremo Local-dev Worker Operator Guide

Status: operator-readiness guide.

This guide explains how to understand, run, verify, and safely extend the Dremo local-dev worker. It documents the current system only. It does not add execution capability, browser integration, production UI, Supabase behavior, SQL migrations, billing behavior, branding changes, or TerminalWorkspace changes.

## What The Worker Is

The Dremo local-dev worker is a developer-only boundary for reviewed local sandbox experiments. It lives under `tools/local-dev-worker/` so process-capable local tooling stays outside the Vite/React browser bundle.

The worker is not production infrastructure. It is a safety-reviewed local harness that lets developers test a tiny ladder of capabilities before any hosted sandbox provider or production worker exists.

The accepted architectural record is [ADR 0001: Dremo local-dev worker boundary and Docker smoke lifecycle](../adr/0001-dremo-local-dev-worker-boundary.md).

For a single operator-facing map of every current capability, policy, adapter, fixture, golden check, telemetry schema, and docs check, use the [local-dev worker capability registry](./local-dev-worker-capability-registry.md).

For security boundaries, assets, mitigations, residual risk, and future review gates, use the [local-dev worker threat model v2](./local-dev-worker-threat-model-v2.md). Before opening a future worker PR, run through the [local-dev worker threat checklist](./local-dev-worker-threat-checklist.md).

## Why It Is Outside `src/`

`src/` is bundled for the browser. Browser-bundled code must never contain process execution APIs, Docker command adapters, local worker imports, service role keys, secrets, or any production execution path.

The boundary is:

```text
src/features/dremo-code/sandbox
  -> browser-safe policy validation only
  -> no process APIs
  -> no worker imports
  -> no Docker commands

tools/local-dev-worker
  -> validation and guards
  -> trusted local review helpers
  -> disabled-by-default capability manifest
  -> Docker readiness classifier
  -> exact smoke execution adapter
  -> exact cleanup execution adapter
  -> lifecycle orchestrator
  -> report formatter and CLI
  -> golden fixture checks
  -> telemetry schema design and fixtures
```

## Capability Ladder

| PR | Capability | Current status |
| --- | --- | --- |
| PR #18 | Browser-safe local-dev Docker gates and command guards | No Docker invocation in `src/`. |
| PR #19 | Out-of-bundle local-dev worker boundary | Blocked/dry-run only. |
| PR #20 | Dry-run adapter, validation, trace, fixtures, self-check | `noExecution: true` dry-run harness. |
| PR #21 | Capability manifest and manual review gate | Models eligibility without execution. |
| PR #22 | Non-Docker version/identity execution adapter | Local-dev only, trusted review required. |
| PR #23 | Docker CLI version probe | Only `docker --version` under Docker-specific review. |
| PR #24 | Docker daemon readiness classifier | Only exact readiness classification; no containers. |
| PR #25 | Container design gates | Plan-only policy and preview objects. |
| PR #26 | Exact no-network/no-mount smoke execution | One exact non-root `alpine:3.20 echo hello` command. |
| PR #27 | Smoke outcome and audit normalization | Sanitized output and cleanup-risk metadata. |
| PR #28 | Deterministic name, labels, cleanup plan | Cleanup preview only. |
| PR #29 | Exact cleanup execution | Only `docker rm -f lumixia-dremo-smoke-echo`. |
| PR #30 | Lifecycle orchestrator | Composes existing reviewed adapters only. |
| PR #31 | Lifecycle report formatter | Sanitized Markdown and JSON summaries. |
| PR #32 | Local-dev lifecycle CLI wrapper | Local CLI only; fixture mode does not call Docker. |
| PR #33 | Golden lifecycle report checks | Fixture-only format drift protection. |
| PR #34 | Operator guide and troubleshooting docs | Documentation only; no runtime behavior changes. |
| PR #35 | Lifecycle telemetry schema design | Typed local-dev telemetry objects only; no collection, upload, DB, file, or network path. |
| PR #36 | Telemetry golden fixture checks | Fixture-only schema drift protection; no telemetry collection, upload, storage, network, DB, or runtime file writes. |
| PR #37 | Architecture Decision Record | Documents the accepted worker boundary, safety invariants, capability ladder, verification stack, and future extension rules. |
| PR #38 | Capability registry reference | Maps current executable, plan-only, report-only, schema-only, golden-check, and verification-only capabilities to files, fixtures, docs, and safety notes. |
| PR #39 | Threat model v2 | Documents worker trust boundaries, assets, threats, mitigations, residual risks, and future security review gates. |

## What Is Currently Executable

Executable paths are local-dev only, disabled by default unless a reviewed config and trusted local review helper are used, and isolated to `tools/local-dev-worker/`.

| Path | Scope |
| --- | --- |
| Reviewed non-Docker version/identity commands | Small local commands such as `node --version`, `npm --version`, `pwd`, and `echo`. |
| Docker CLI version probe | Only `docker --version`. |
| Docker readiness classifier | Only the exact readiness probe. |
| Docker smoke command | One exact static command using no network, no mounts, no host env, no shell, no root user, and no image pull. |
| Docker cleanup command | One exact deterministic cleanup target only. |

The normal operator checks do not require Docker unless the operator intentionally runs the real lifecycle report command.

## What Is Plan-only Or Report-only

| Area | Status |
| --- | --- |
| Container policy model | Plan-only unless a reviewed adapter already exists. |
| Workspace policy | Design-only; no workspace mount exists. |
| Report formatting | Report-only; does not execute commands. |
| Golden checks | Fixture-only; does not call Docker. |
| CLI fixture mode | Report-only; no Docker, cleanup, or process adapter execution. |
| Telemetry schema | Design-only local-dev event objects and fixtures; no upload, persistence, or network calls. |
| Telemetry golden checks | Fixture-only JSON comparison; no upload, runtime persistence, Docker, network, DB, or file writes. |

## What Remains Forbidden

| Forbidden area | Reason |
| --- | --- |
| Arbitrary `docker run` | Too broad for current safety model. |
| New images or image pull/build | Requires separate review and supply-chain policy. |
| Workspace mounts | Requires task-scoped workspace policy and secret exclusion. |
| Network access | Requires egress policy and audit model. |
| Package installs | Can run scripts, use network, and mutate workspace. |
| Repo execution | Requires workspace, credential, and artifact policies. |
| Browser-to-worker bridge | Would create a production-like execution path too early. |
| Broad cleanup | Can remove unrelated containers or hide evidence. |
| Docker socket mount | Gives host daemon control. |
| Home mount or secrets | Risks credential exposure. |

## Verification Commands

Run these before opening a local-dev worker PR:

```powershell
npm run typecheck
npm run build
npm audit --omit=dev
git diff --check
npm run dremo:worker:typecheck
npm run dremo:worker:selfcheck
npm run dremo:worker:safety
npm run dremo:worker:lifecycle:report:golden
npm run dremo:worker:telemetry:golden
npm run dremo:worker:docs
npm run dremo:worker:verify
```

## Fixture Reports

These commands do not require Docker:

```powershell
npm run dremo:worker:lifecycle:report:fixture
npm run dremo:worker:lifecycle:report:fixture:json
```

Use them to inspect the current sanitized report shape. The output must stay deterministic and free of host paths, usernames, environment values, `.env` values, service role markers, API keys, tokens, and secrets.

## Golden Checks

The golden check compares generated fixture output with committed snapshots:

```powershell
npm run dremo:worker:lifecycle:report:golden
```

If it fails, review the diff-like summary. Do not update golden files casually. A golden change should be intentional and explained in the PR body.

## Telemetry Golden Checks

PR #36 adds a committed local-dev telemetry fixture JSON file and a fixture-only checker:

```powershell
npm run dremo:worker:telemetry:golden
```

The checker reads the committed golden file, regenerates telemetry fixture JSON in memory from the existing telemetry fixtures, validates both outputs for redaction and deterministic shape, and compares them. It does not upload telemetry, write runtime telemetry files, call networks, write databases, read environment values, execute Docker, or import `src/`.

## Interpreting Lifecycle Reports

| Report field | How to read it |
| --- | --- |
| `outcome` | Lifecycle-level state such as cleanup success, readiness unavailable, or policy blocked. |
| `stageSummary` | Ordered lifecycle stages. Readiness must happen before smoke. Cleanup must not happen after policy-blocked smoke. |
| `readinessSummary` | Docker CLI/daemon classification. Daemon unavailable is structured, not a safety failure. |
| `smokeSummary` | Exact smoke result, sanitized output, cleanup risk, and rejection codes. |
| `cleanupSummary` | Exact cleanup result. Missing target is an acceptable structured outcome. |
| `safetySummary` | Dangerous capabilities must remain false. |
| `nextRecommendedAction` | Human guidance for the local operator; it must not suggest broad Docker expansion. |

## Telemetry Schema Design

PR #35 adds local-dev lifecycle telemetry schema objects under `tools/local-dev-worker/`. These are typed summaries for future local tooling only.

| Area | Current behavior |
| --- | --- |
| Event objects | Built in memory from existing lifecycle, report, and golden-check fixture results. |
| Redaction | Secret-like strings, service-role markers, home paths, and `.env` references are denied or redacted before fixture events validate. |
| Determinism | Fixture helpers do not use timestamps, environment values, usernames, home paths, repo paths, or machine-specific Docker values. |
| Collection | Not implemented. No upload, analytics provider, database write, file write, network call, or browser path exists. |
| Golden fixture | PR #36 commits deterministic sanitized telemetry fixture JSON and validates it with a fixture-only checker. |

## Safe Troubleshooting Flow

1. Run `npm run dremo:worker:verify`.
2. If verification fails, run the failing script directly.
3. Read rejection codes or mismatch summaries.
4. Check [local-dev-worker-troubleshooting.md](./local-dev-worker-troubleshooting.md).
5. Fix the smallest scoped issue.
6. Rerun the exact failing command, then the full verification suite.

Do not bypass the safety scan, import worker files into `src/`, add broad Docker commands, or expand cleanup targets while troubleshooting.

## Safe Future PRs

Use [local-dev-worker-extension-playbook.md](./local-dev-worker-extension-playbook.md) before proposing future work. Good next PRs should remain documentation, reporting, telemetry, or operator-experience focused unless a separate security review explicitly approves a narrow execution change.

For boundary-level decisions, update [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md) or add a new ADR under [docs/adr](../adr/README.md) before expanding runtime behavior.
