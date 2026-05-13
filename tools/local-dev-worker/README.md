# Dremo Local-dev Worker Boundary

Status: boundary-only, no execution.

This directory is intentionally outside `src/` so future local-dev Docker execution work cannot be imported into the Vite/React browser bundle by accident.

## What This Is

| File | Purpose |
| --- | --- |
| `localDevWorkerContract.ts` | Local-dev worker request/response contract for future Docker execution. |
| `localDevWorkerGuards.ts` | Pure command guard logic for shell chaining, network commands, package installs, file writes, Docker runtime commands, home mounts, Docker socket exposure, and secret access patterns. |
| `localDevWorkerRunner.ts` | Blocked/dry-run runner stub. It never executes commands and always returns `noExecution: true`. |
| `localDevWorkerRequestValidation.ts` | Dependency-free request shape validation for dry-run worker requests. |
| `localDevWorkerTrace.ts` | Deterministic dry-run trace and safety metadata helpers. |
| `localDevWorkerDryRunAdapter.ts` | Converts validated dry-run requests into the blocked/dry-run runner flow. |
| `localDevWorkerFixtures.ts` | Deterministic accepted and rejected dry-run fixtures. |
| `localDevWorkerExecutionCapability.ts` | Future execution capability type model. |
| `localDevWorkerExecutionManifest.ts` | Disabled-by-default capability manifest for version, identity, and metadata commands. |
| `localDevWorkerExecutionReviewGate.ts` | Pure manual review gate that rejects future execution unless every gate is satisfied. |
| `localDevWorkerExecutionReadiness.ts` | Pure readiness evaluator that combines validation, guards, capability match, manual review, and safety metadata. |
| `localDevWorkerExecutionReadinessFixtures.ts` | Deterministic readiness fixtures for safe and unsafe future execution cases. |
| `localDevWorkerExecutionConfig.ts` | Disabled-by-default local execution config, reviewed non-Docker version-command config, and reviewed Docker version-probe config. |
| `localDevWorkerDockerProbePolicy.ts` | Docker-specific policy that allows only `docker --version` and rejects daemon-state, runtime, socket, mount, and shell patterns. |
| `localDevWorkerDockerDaemonReadinessPolicy.ts` | Docker readiness policy that allows only `docker version --format "{{json .}}"` and rejects runtime, object-inspection, socket, mount, and shell patterns. |
| `localDevWorkerDockerReadiness.ts` | Structured Docker readiness result and safety metadata types. |
| `localDevWorkerDockerReadinessAdapter.ts` | Reviewed local-dev readiness adapter for classifying Docker CLI/daemon availability without container execution. |
| `localDevWorkerDockerReadinessFixtures.ts` | Fixtures for allowed readiness classification and denied Docker runtime/daemon-state/object commands. |
| `localDevWorkerDockerVersionParser.ts` | Defensive parser for Docker JSON version output. |
| `localDevWorkerTrustedReview.ts` | Trusted local manual-review helpers; browser/user payloads are not accepted as review evidence. |
| `localDevWorkerVersionExecutionAdapter.ts` | Manually gated local-dev adapter for reviewed version/identity commands, including the Docker CLI version probe only. |
| `localDevWorkerVersionExecutionFixtures.ts` | Execution fixtures for default-blocked, unsafe-blocked, optional-command, and reviewed local cases. |
| `localDevWorkerDryRunSelfCheck.ts` | TypeScript self-check harness for fixture expectations. |
| `localDevWorkerDryRunSelfCheckRunner.ts` | Zero-dependency Node runner for executing the dry-run self-check. |
| `localDevWorkerSafetyScan.mjs` | Dev safety scan that fails if forbidden process/Docker/network/filesystem APIs appear in browser-bundled sandbox source. |

## Non-goals

| Non-goal | Reason |
| --- | --- |
| No Docker execution | Real Docker invocation requires a separate manual security review PR. |
| No process APIs in `src/` | Browser-bundled code must not add `child_process`, `spawn`, `exec`, `Deno.Command`, or Docker CLI calls. |
| No production path | The worker is not imported from `src/` and is not exposed through Dremo Lab or production UI. |
| No filesystem writes | Future writes require a task-scoped workspace policy and separate review. |
| No network calls | First execution prototype must remain network-disabled. |
| No secrets | Service role keys and production credentials must never enter the worker or sandbox. |

## Safety Scan

Run this before any future sandbox PR:

```powershell
node tools/local-dev-worker/localDevWorkerSafetyScan.mjs
```

The scan covers `src/features/dremo-code/sandbox` because that folder is browser-bundled. It also checks all `src/` files for imports or references to worker implementation files. The frontend must not import this worker boundary.

The scan checks worker TypeScript files for process APIs too. The only allowed process API location is `tools/local-dev-worker/localDevWorkerVersionExecutionAdapter.ts`; guard fixtures may still contain denied command strings by design.

## Verification Scripts

```powershell
npm run dremo:worker:typecheck
npm run dremo:worker:selfcheck
npm run dremo:worker:safety
npm run dremo:worker:verify
```

These scripts typecheck the worker contract, validation, trace, fixtures, and self-check harness, execute the fixture self-check, then run the browser-boundary safety scan. The self-check may attempt only reviewed local version/identity commands plus the readiness-only `docker version --format "{{json .}}"` under Docker-specific review; Docker CLI or daemon absence is treated as structured non-safety output. The scripts do not run containers, pull/build images, inspect runtime objects, mount Docker socket, read secrets, or write files.

## Current Execution Status After PR #24

| Area | Status |
| --- | --- |
| Browser sandbox | Validation only; no execution. |
| Worker boundary | Manually gated local-dev execution exists only for reviewed version/identity commands. Default config blocks execution. |
| Docker | `docker --version` and readiness-only `docker version --format "{{json .}}"` may be attempted under separate reviewed configs. Runtime, object, socket, mount, and container commands remain denied. |
| Network | Disabled; no worker runtime calls. |
| File writes | Disabled; no worker runtime writes. |
| Secrets | Not read. |
| Production UI | No path to execution. |

## Execution Review Gates

PR #21 adds a final pre-execution review layer:

| Gate | Current behavior |
| --- | --- |
| Capability manifest | Lists version/identity/metadata commands that may be eligible in a future PR. Every capability is `defaultEnabled: false`, `allowedInProduction: false`, and `requiresManualReview: true`. |
| Manual review gate | Requires explicit `allowRealExecution`, completed manual review metadata, exact capability scope, local-dev source/environment, and no unsafe command patterns. |
| Readiness evaluator | Produces `readyForFutureExecution`, rejection codes, warnings, and safety metadata while preserving `noExecution: true`. |
| Self-check | Verifies defaults block execution, manual review is required, unsafe commands are rejected, Docker runtime/daemon-state commands remain blocked, and reviewed version commands stay bounded. |

## Local-dev Version Execution Adapter

PR #22 introduces the first real local-dev process execution path, and PR #23 adds the Docker CLI version probe. Both stay inside `tools/local-dev-worker/localDevWorkerVersionExecutionAdapter.ts`.

| Rule | Current behavior |
| --- | --- |
| Default config | `allowRealExecution: false`; all execution blocked. |
| Reviewed non-Docker config | Enables only non-Docker version/identity commands in local tooling fixtures. |
| Reviewed Docker probe config | Enables only `docker --version` with exact trusted review scope. |
| Shell | `shell: false`; no shell interpolation. |
| Environment | Empty environment; host environment is not inherited. |
| Filesystem | No file writes; safe worker cwd only. |
| Network | No network commands are allowed. |
| Docker | `docker --version` may be attempted only by the Docker probe config. `docker version --format "{{json .}}"` may be attempted only by the Docker readiness config. `docker info`, `docker run`, `docker build`, `docker compose`, `docker image`, and `docker container` remain blocked. |
| Browser | `src/` must not import worker code. |

## Docker Readiness Classifier

PR #24 adds readiness classification only. The adapter can report:

| State | Meaning |
| --- | --- |
| `cli_unavailable` | Docker CLI is not available on the contributor machine. |
| `daemon_unavailable` | Docker CLI is present but the daemon/Desktop is not reachable. |
| `daemon_available` | Docker returned client/server metadata for the exact readiness command. |
| `probe_blocked` | Policy, review, source, environment, or path gates blocked the probe before execution. |
| `probe_failed` | The exact probe failed in an unexpected but structured way. |

This is not a sandbox runtime. It does not start containers, pull or build images, inspect containers/images, mount anything, or expose a browser-to-worker bridge.

## Future Execution Gate

The next execution PR must remain local-dev only and must satisfy `docs/dremo-code/docker-execution-security-checklist.md`.

Required defaults:

| Gate | Required value |
| --- | --- |
| `noExecution` | `true` until reviewed runtime execution exists. |
| `allowRealExecution` | `false` by default. |
| Docker socket mount | `false`. |
| Home mount | `false`. |
| Network | `false`. |
| File writes | `false`. |
| Production UI path | Not allowed. |
