# Dremo local-dev worker release readiness checklist

Status: maintainer handoff checklist.

This checklist helps maintainers decide whether the Dremo local-dev worker and Docker smoke lifecycle are ready for local-dev handoff, review, future CLI use, or future integration planning. It is documentation only. It does not change runtime behavior, add Docker execution, collect telemetry, add network calls, write databases, expose browser or production UI paths, or add dependencies.

## Purpose

Use this checklist before treating the local-dev worker as ready for a handoff milestone. It gathers the current boundary, verification, threat model, registry, reporting, telemetry schema, and operator documentation requirements in one place.

Future workspace or repo execution planning must also satisfy the [future workspace execution design constraints](./future-workspace-execution-design-constraints.md) and [future workspace execution review checklist](./future-workspace-execution-review-checklist.md).

## Current status

| Area | Current state |
| --- | --- |
| Browser boundary | `src/` remains browser-safe and must not import `tools/local-dev-worker`. |
| Worker boundary | Reviewed local-dev execution stays under `tools/local-dev-worker` with exact configs and trusted review helpers. |
| Docker lifecycle | Only the already-reviewed exact Docker probes, smoke command, and cleanup command may run. |
| Reports | Lifecycle reports are sanitized and golden-checked. |
| Telemetry | Schema and golden fixtures exist only as deterministic local-dev objects; no telemetry is collected or uploaded. |
| Documentation | Operator guide, troubleshooting, extension playbook, capability registry, ADR, threat model, checklist, and docs link check are in place. |

## What this checklist does not approve

| Not approved | Reason |
| --- | --- |
| New Docker commands | New commands require a dedicated capability PR with policy, fixtures, safety scan coverage, and docs. |
| Arbitrary `docker run` or cleanup | Current execution remains exact-command only. |
| Browser-to-worker bridge | Requires separate architecture, threat model, authorization, and production separation review. |
| Production UI execution | Requires production sandbox provider and server-owned execution design. |
| Repo execution or workspace mounts | Requires separate workspace/repo execution threat model. |
| Network, package install, image pull/build/compose | Requires egress, supply-chain, and lifecycle-script review. |
| Telemetry upload or persistence | Requires privacy, retention, storage, consent, and deletion review. |
| Supabase, SQL, billing, branding, or TerminalWorkspace changes | Outside the local-dev worker release-readiness scope. |

## Required verification commands

Run and report:

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

## Browser boundary readiness

| Check | Required state |
| --- | --- |
| `src` worker import boundary | `src/` does not import or reference `tools/local-dev-worker`. |
| Process APIs under `src` | No `child_process`, `spawn`, `exec`, `execFile`, `fork`, `Deno.Command`, or similar host process APIs. |
| Docker strings in browser sandbox | No Docker execution command surface under browser-bundled Dremo sandbox files. |
| Production UI execution path | No Dremo Lab, Code Architect AI UI, TerminalWorkspace, or production UI path can invoke worker execution. |

## Worker boundary readiness

| Check | Required state |
| --- | --- |
| Process API allowlist | Process APIs are limited to the reviewed local-dev worker adapters. |
| Safety scan allowlist | `localDevWorkerSafetyScan.mjs` reflects the current reviewed adapter list and denied surfaces. |
| Trusted review helpers | Executable paths require trusted local review helpers, not browser/user request metadata. |
| Shell execution | `shell: false`; no shell command construction or interpolation. |
| Environment | Execution adapters use `env: {}` and do not inherit host environment. |
| Host environment | No `.env`, `process.env`, secret, service role, token, or credential reads. |

## Docker capability readiness

| Check | Required state |
| --- | --- |
| Exact reviewed commands | Only existing exact reviewed Docker commands are present. |
| Arbitrary Docker runtime | No arbitrary `docker run`, image, command, args, label, name, or cleanup target. |
| Image lifecycle | No image pull, build, compose, exec, cp, login, or package install path. |
| Docker daemon operations | No `docker ps`, `docker inspect`, prune, broad listing, or broad cleanup path. |
| Mounts | No Docker socket, home, workspace, volume, bind mount, or env-file mount. |
| Smoke command security | Smoke remains no-network, no-mount, non-root, read-only, cap-drop all, no-new-privileges, bounded, and `--pull=never`. |

## Cleanup readiness

| Check | Required state |
| --- | --- |
| Deterministic target | Cleanup target remains `lumixia-dremo-smoke-echo`. |
| Exact cleanup command | Only `docker rm -f lumixia-dremo-smoke-echo` may be attempted under cleanup-specific review. |
| Target safety | No wildcard, container ID, multiple target, arbitrary name, slash/path, command substitution, stop, kill, ps, inspect, or prune. |
| Missing target | Target-not-found is structured and not a safety failure. |

## Reporting readiness

| Check | Required state |
| --- | --- |
| Lifecycle report formatter | Report output is built from existing lifecycle results only. |
| Sanitization | stdout/stderr previews are sanitized before report summaries. |
| Report golden checks | Markdown and JSON lifecycle fixture golden checks pass. |
| Determinism | Fixture reports contain no timestamps, host paths, usernames, env values, secrets, or machine-specific Docker values. |

## Telemetry schema readiness

| Check | Required state |
| --- | --- |
| Schema-only posture | Telemetry remains typed local-dev schema objects only. |
| No collection | No telemetry upload, analytics provider, network call, DB write, runtime file write, or persistence path. |
| Golden checks | Telemetry golden checks pass. |
| Sensitive data | Telemetry fixtures contain no secrets, env values, host paths, service role markers, raw prompts, or `.env` values. |

## Golden fixture readiness

| Check | Required state |
| --- | --- |
| Lifecycle report goldens | `npm run dremo:worker:lifecycle:report:golden` passes. |
| Telemetry goldens | `npm run dremo:worker:telemetry:golden` passes. |
| Mismatch handling | Any golden drift is reviewed, intentional, and explained in the PR body. |
| No Docker dependency | Golden checks do not execute Docker, cleanup, or npm scripts internally. |

## Documentation readiness

| Check | Required state |
| --- | --- |
| Operator guide | [Operator guide](./local-dev-worker-operator-guide.md) exists and links to current boundary docs. |
| Troubleshooting matrix | [Troubleshooting matrix](./local-dev-worker-troubleshooting.md) exists and avoids unsafe fixes. |
| Extension playbook | [Extension playbook](./local-dev-worker-extension-playbook.md) exists and defines allowed/forbidden PR shapes. |
| Capability registry | [Capability registry](./local-dev-worker-capability-registry.md) exists and maps capabilities to files, fixtures, docs, and checks. |
| ADR 0001 | [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md) exists and records the accepted boundary decision. |
| Threat model v2 | [Threat model v2](./local-dev-worker-threat-model-v2.md) exists and documents assets, threats, mitigations, residual risks, and future gates. |
| Threat checklist | [Threat checklist](./local-dev-worker-threat-checklist.md) exists for future PR scope review. |
| Docs link check | `npm run dremo:worker:docs` passes. |

## Threat model readiness

| Check | Required state |
| --- | --- |
| Trust boundaries | Browser, worker, Docker daemon, reporting, and telemetry schema boundaries are documented. |
| Assets | Source code, local filesystem, home directory, secrets, Supabase resources, Docker host, fixture integrity, and review signal are covered. |
| Residual risks | Docker daemon privilege, local image trust, deterministic cleanup name collision, and operator-invoked real mode are documented. |
| Future gates | Workspace mounts, repo execution, package/network, browser bridge, production UI, secrets, image provenance, cleanup lifecycle, telemetry collection, and Supabase/security reviews remain required before expansion. |

## Operator handoff readiness

| Check | Required state |
| --- | --- |
| Verification runbook | Required commands are listed and known to pass on the handoff commit. |
| Safe troubleshooting | Operators know to use the troubleshooting matrix before changing policy or commands. |
| Real lifecycle expectations | Docker CLI, daemon, local image, or cleanup-target absence is structured output where expected. |
| Fixture-only path | Fixture report, golden, docs, and telemetry checks do not require Docker Desktop or `alpine:3.20`. |
| Scope clarity | The handoff explicitly states that this is local-dev tooling, not production sandbox execution. |

## Future integration blockers

Before any integration beyond local-dev reports, resolve:

| Blocker | Required next review |
| --- | --- |
| Browser-to-worker bridge | Bridge authorization, origin, CSRF, local-only availability, and production separation review. |
| Production execution | Server-owned execution, sandbox provider, audit, billing, and artifact lifecycle review. |
| Workspace mounts | Workspace path, secret exclusion, artifact, cleanup, and rollback threat model. |
| Repo execution | Prompt-injection, command allowlist, package lifecycle scripts, network, and recovery model. |
| Telemetry collection | Privacy, consent, storage, retention, deletion, and upload review. |
| Broader Docker cleanup | Exact target, stale resource, collision, quarantine, and audit review. |

## Readiness status matrix

| Area | Current state | Required command/check | Release blocker if failing | Notes |
| --- | --- | --- | --- | --- |
| Typecheck | App TypeScript must pass. | `npm run typecheck` | Yes | Confirms app-level TS health. |
| Build | Production browser build must pass. | `npm run build` | Yes | Confirms docs changes did not break the app build. |
| Audit | Production dependency audit must pass or be triaged. | `npm audit --omit=dev` | Yes | Docs-only PRs should not add dependencies. |
| Worker typecheck | Worker TS modules must compile. | `npm run dremo:worker:typecheck` | Yes | Includes docs checker when listed in worker typecheck script. |
| Self-check | Deterministic fixtures must pass. | `npm run dremo:worker:selfcheck` | Yes | Should not require Docker success for fixture-only coverage. |
| Safety scan | Boundary invariants must pass. | `npm run dremo:worker:safety` | Yes | Blocks `src` process APIs, worker imports, and unsafe scanner violations. |
| Lifecycle golden report | Report fixture output must match committed goldens. | `npm run dremo:worker:lifecycle:report:golden` | Yes | Protects Markdown/JSON report drift. |
| Telemetry golden | Telemetry fixture JSON must match committed golden. | `npm run dremo:worker:telemetry:golden` | Yes | Protects schema fixture drift without collection. |
| Docs link check | Required docs must exist and link together. | `npm run dremo:worker:docs` | Yes | Protects operator docs graph. |
| Threat model | Threat model must cover current boundaries and residual risks. | Review [threat model v2](./local-dev-worker-threat-model-v2.md) | Yes for boundary changes | Update before broadening runtime behavior. |
| Capability registry | Registry must match current files, fixtures, docs, and checks. | Review [capability registry](./local-dev-worker-capability-registry.md) | Yes for capability changes | Prevents capability drift. |
| Operator docs | Operator guide, troubleshooting, playbook, ADR, threat docs, and this checklist must be linked. | `npm run dremo:worker:docs` | Yes | Keeps handoff path discoverable. |

## Release decision template

Copy this into a handoff issue, PR body, or review note:

```markdown
## Release decision record

- Date:
- Reviewer:
- Commit SHA:
- Verification commands run:
- Result:
- Known limitations:
- Explicitly not approved:
- Next recommended PR:
- Decision: approve local-dev worker handoff / hold / needs patch
```
