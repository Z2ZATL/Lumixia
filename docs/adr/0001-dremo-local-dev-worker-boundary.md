# ADR 0001: Dremo local-dev worker boundary and Docker smoke lifecycle

## Status

Accepted

## Date

2026-05-18

## Context

Dremo Code needs a path toward safe sandboxed execution without placing host process authority inside the Vite/React browser bundle. Code under `src/` is browser-bundled and must not contain process APIs, Docker command adapters, local worker imports, service role keys, secrets, or production execution paths.

The Dremo local-dev worker lives under `tools/local-dev-worker/` as an explicit out-of-bundle boundary. Real process execution was introduced gradually, with policy and verification layers added before each narrow execution capability.

The current ladder moved from browser-safe gates and dry-run worker contracts to reviewed version probes, Docker CLI/version readiness classification, one exact no-network Docker smoke run, exact deterministic cleanup, lifecycle orchestration, report formatting, golden report checks, operator docs, local-dev telemetry schema design, and telemetry golden checks.

## Decision

We will keep all local-dev worker execution outside the browser bundle and require local-dev-only trusted review gates for every executable capability.

Docker command capabilities must remain exact and allowlisted. New capabilities must be introduced one PR at a time, with policy before execution, fixtures before execution, safety scan coverage, deterministic verification, and docs updates.

All lifecycle/report/telemetry outputs must be sanitized before audit-safe summaries. Fixture and golden checks must remain deterministic and must not depend on Docker Desktop, local images, usernames, host paths, environment values, timestamps, or secrets.

Telemetry remains schema-only and local-dev-only. The current telemetry fixtures and golden checks do not collect, upload, persist, transmit, store, write runtime files, call networks, or write databases.

Browser or product integration remains blocked until a separate reviewed bridge design exists. Repo execution, workspace mounts, network access, package install, production UI execution, and telemetry collection all require separate threat models and review PRs.

## Consequences

This decision makes the local-dev worker slower to expand but easier to audit. Capability growth happens in small, reviewable increments instead of broad execution jumps.

The browser bundle remains process-free. Local verification can exercise reviewed worker paths without creating a production execution route.

The tradeoff is more documentation, fixtures, and golden checks per capability. That overhead is intentional because the worker handles high-risk execution boundaries.

## Safety Invariants

| Invariant | Required state |
| --- | --- |
| Browser bundle | No process APIs, Docker execution, or `tools/local-dev-worker` imports under `src/`. |
| Worker location | Local-dev worker code remains under `tools/local-dev-worker/`. |
| Defaults | Real execution remains disabled by default unless a reviewed local-dev config enables one exact capability. |
| Review evidence | Browser/user payloads are not trusted as manual security review evidence. |
| Command scope | Executable commands are exact allowlisted command/args arrays, not shell strings. |
| Shell | `shell: false`; no arbitrary shell, shell chaining, pipes, or redirection. |
| Environment | Host environment is not inherited; secrets are not read or injected. |
| Docker runtime | No arbitrary Docker runtime, image pull/build/compose/exec/cp/login, or daemon-object inspection. |
| Mounts | No Docker socket, home directory, or workspace mounts. |
| Network | No network for the smoke container and no network command surface. |
| Output | stdout/stderr previews are bounded and sanitized before audit/report/telemetry summaries. |
| Telemetry | Schema and golden fixtures are local-dev-only and non-uploading. |
| Verification | Worker typecheck, self-check, safety scan, golden checks, docs check, app typecheck/build, audit, and diff checks stay green. |

## Browser Bundle Boundary

`src/` is the browser and production UI boundary.

Allowed:

| Area | Allowed behavior |
| --- | --- |
| Dremo sandbox source | Browser-safe validation, policy display, and documentation concepts. |
| UI | Rendering trusted state and reports from future server-owned paths only. |

Forbidden:

| Area | Forbidden behavior |
| --- | --- |
| Process APIs | `child_process`, `spawn`, `exec`, `execFile`, `fork`, `Deno.Command`, shell adapters, or Docker CLI calls. |
| Worker imports | Importing or referencing `tools/local-dev-worker` from `src/`. |
| Production execution | Any direct browser-to-worker or production UI execution path. |
| Secrets | Supabase service role keys, `.env` reads, host env reads, or credential injection. |

## Local-dev Worker Boundary

`tools/local-dev-worker/` is the local-only boundary for reviewed experiments.

It contains validation, command guards, trusted review helpers, capability manifest, Docker readiness, exact smoke execution, exact cleanup execution, lifecycle orchestration, report formatting, local CLI wrapper, deterministic golden checks, docs checks, and local-dev telemetry schema fixtures.

Only explicitly reviewed adapter files may contain process APIs. Lifecycle, report, CLI fixture, golden checker, docs checker, telemetry schema, and telemetry golden files must not import process APIs or construct new Docker capabilities.

## Capability Ladder

| PR | Capability | Decision point |
| --- | --- | --- |
| PR #18 | Disabled browser-safe gates and guards | No execution inside `src/`. |
| PR #19 | Worker boundary | Move future local-dev execution scaffolding outside `src/`. |
| PR #20 | Dry-run adapter and verification harness | Validate requests and fixtures with `noExecution: true`. |
| PR #21 | Review gates and capability manifest | Model manual review and readiness before execution. |
| PR #22 | Non-Docker version command execution | Add first local-dev process adapter for tiny reviewed commands. |
| PR #23 | `docker --version` | Add Docker CLI version probe only. |
| PR #24 | Daemon readiness classification | Classify Docker daemon availability without containers. |
| PR #25 | Container policy design | Define image, command, network, mount, resource, and security gates before `docker run`. |
| PR #26 | Exact no-network smoke execution | Allow only the non-root `alpine:3.20 echo hello` smoke command. |
| PR #27 | Audit normalization | Normalize smoke outcomes, sanitize output, and classify cleanup risk. |
| PR #28 | Deterministic naming and cleanup plan | Add static container name, labels, and plan-only cleanup preview. |
| PR #29 | Exact cleanup execution | Allow only `docker rm -f lumixia-dremo-smoke-echo`. |
| PR #30 | Lifecycle orchestrator | Compose readiness, exact smoke, audit, and exact cleanup without new commands. |
| PR #31 | Report formatter | Format sanitized lifecycle reports without execution expansion. |
| PR #32 | Local-dev CLI wrapper | Print existing lifecycle reports locally; fixture mode avoids Docker. |
| PR #33 | Golden report checks | Protect report Markdown/JSON fixture output from drift. |
| PR #34 | Operator guide and troubleshooting | Document safe operation and extension rules. |
| PR #35 | Telemetry schema design | Define local-dev telemetry objects without collection. |
| PR #36 | Telemetry golden checks | Protect telemetry fixture JSON from schema drift without upload or storage. |

## Current Allowed Capabilities

| Capability | Scope |
| --- | --- |
| Reviewed non-Docker version/identity commands | Tiny local commands such as `node --version`, `npm --version`, `pwd`, and `echo`, behind trusted local review/config. |
| Docker CLI version probe | Only `docker --version`. |
| Docker daemon readiness probe | Only the exact readiness command used to classify CLI/daemon availability. |
| Docker smoke run | One exact no-network, no-mount, non-root `alpine:3.20 echo hello` smoke command with static name and labels. |
| Docker cleanup | One exact deterministic cleanup command for `lumixia-dremo-smoke-echo`. |
| Lifecycle orchestration | Composition of existing exact readiness, smoke, audit, and cleanup capabilities only. |
| Local-dev CLI report wrapper | Markdown/JSON report display for existing lifecycle results. |
| Fixture and golden checks | Deterministic local checks that do not add execution capability. |
| Telemetry schema/golden fixtures | Local-dev-only schema objects and committed fixture checks; no collection/upload/storage. |

## Explicitly Forbidden Capabilities

| Capability | Status |
| --- | --- |
| Arbitrary `docker run` | Forbidden. |
| Repo execution | Forbidden. |
| Workspace mounts | Forbidden. |
| Network access | Forbidden. |
| Package install | Forbidden. |
| Image pull/build/compose | Forbidden. |
| Docker socket mount | Forbidden. |
| Home directory mount | Forbidden. |
| `docker ps`, `docker inspect`, or prune | Forbidden. |
| Arbitrary cleanup | Forbidden. |
| Browser-to-worker bridge | Forbidden until separate design review. |
| Production UI execution | Forbidden. |
| Telemetry upload or analytics provider | Forbidden until separate reviewed telemetry collection PR. |
| Database writes | Forbidden for local-dev worker telemetry/reporting. |
| Supabase, SQL, billing, branding, or TerminalWorkspace changes | Out of scope for this worker boundary. |
| Service role or secrets access | Forbidden. |

## Verification Stack

Run the full stack before merging changes that touch this boundary:

```powershell
npm run dremo:worker:typecheck
npm run dremo:worker:selfcheck
npm run dremo:worker:safety
npm run dremo:worker:lifecycle:report:golden
npm run dremo:worker:telemetry:golden
npm run dremo:worker:docs
npm run dremo:worker:verify
npm run typecheck
npm run build
npm audit --omit=dev
git diff --check
```

## Future Extension Rules

| Rule | Requirement |
| --- | --- |
| One capability per PR | Do not mix unrelated execution, reporting, docs, telemetry, or UI changes. |
| Exact command first | Never introduce arbitrary command execution as the first step. |
| Policy before execution | Add pure policy, fixtures, and safety scan coverage before any executable adapter. |
| Fixture before execution | Unsafe variants and structured local failures must be covered before enabling execution. |
| Golden checks for stable outputs | Report or schema output changes require deterministic fixture/golden coverage. |
| Docs with every boundary change | Update the operator guide, troubleshooting, extension playbook, checklist, and ADR when boundaries change. |
| Browser integration requires design review | A browser-to-worker bridge must be designed separately and must not be combined with repo/workspace execution. |
| Repo/workspace execution requires a new threat model | Workspace mounts, repo commands, package install, and network must not be bundled with UI integration. |

## Related PRs

| PR | Relationship |
| --- | --- |
| #18 - #21 | Established browser-safe gates, worker boundary, dry-run harness, and review manifest. |
| #22 - #24 | Added reviewed local version execution, Docker version probe, and Docker daemon readiness classification. |
| #25 - #29 | Added container policy design, exact smoke execution, audit hardening, deterministic naming, cleanup planning, and exact cleanup. |
| #30 - #33 | Added lifecycle orchestration, report formatting, CLI wrapper, and golden report checks. |
| #34 - #36 | Added operator docs, telemetry schema design, and telemetry golden checks. |
