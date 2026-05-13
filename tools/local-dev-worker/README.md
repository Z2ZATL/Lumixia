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
| `localDevWorkerDockerContainerPolicy.ts` | Future container execution policy types for images, resources, network, mounts, and security. |
| `localDevWorkerDockerImagePolicy.ts` | Conservative future image allowlist policy; no image pull happens. |
| `localDevWorkerDockerContainerCommandPolicy.ts` | Plan-only command allowlist/denylist for future first container smoke tests. |
| `localDevWorkerDockerContainerPlan.ts` | Pure plan object and `dockerRunPreview` array; it is never executed. |
| `localDevWorkerDockerContainerReadinessGate.ts` | Combines Docker readiness, trusted review, image policy, command policy, and runtime safety gates without execution. |
| `localDevWorkerDockerContainerPolicyFixtures.ts` | Plan-only and blocked fixtures for future container execution policies. |
| `localDevWorkerDockerContainerSmokePolicy.ts` | Exact allowlist policy for the first local-dev no-network/no-mount container smoke command. |
| `localDevWorkerDockerContainerSmokeAdapter.ts` | Reviewed local-dev adapter that may execute only the exact non-root `alpine:3.20 echo hello` Docker smoke command. |
| `localDevWorkerDockerContainerSmokeFixtures.ts` | Fixtures for the allowed smoke path and blocked Docker runtime variants. |
| `localDevWorkerTrustedReview.ts` | Trusted local manual-review helpers; browser/user payloads are not accepted as review evidence. |
| `localDevWorkerVersionExecutionAdapter.ts` | Manually gated local-dev adapter for reviewed version/identity commands, including the Docker CLI version probe only. |
| `localDevWorkerVersionExecutionFixtures.ts` | Execution fixtures for default-blocked, unsafe-blocked, optional-command, and reviewed local cases. |
| `localDevWorkerDryRunSelfCheck.ts` | TypeScript self-check harness for fixture expectations. |
| `localDevWorkerDryRunSelfCheckRunner.ts` | Zero-dependency Node runner for executing the dry-run self-check. |
| `localDevWorkerSafetyScan.mjs` | Dev safety scan that fails if forbidden process/Docker/network/filesystem APIs appear in browser-bundled sandbox source. |

## Non-goals

| Non-goal | Reason |
| --- | --- |
| No arbitrary Docker execution | Only the PR #26 exact local-dev smoke command may run after trusted review; arbitrary `docker run` remains denied. |
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

The scan checks worker TypeScript files for process APIs too. Process APIs are allowed only in explicitly reviewed worker adapters: `localDevWorkerVersionExecutionAdapter.ts`, `localDevWorkerDockerReadinessAdapter.ts`, and `localDevWorkerDockerContainerSmokeAdapter.ts`. Guard fixtures may still contain denied command strings by design.

## Verification Scripts

```powershell
npm run dremo:worker:typecheck
npm run dremo:worker:selfcheck
npm run dremo:worker:safety
npm run dremo:worker:verify
```

These scripts typecheck the worker contract, validation, trace, fixtures, and self-check harness, execute the fixture self-check, then run the browser-boundary safety scan. The self-check may attempt reviewed local version/identity commands, the readiness-only `docker version --format "{{json .}}"`, and the PR #26 exact smoke command `docker run --rm --network none --pull=never --read-only --cap-drop ALL --security-opt no-new-privileges --memory 128m --cpus 0.5 --pids-limit 64 --user 65534:65534 alpine:3.20 echo hello` under Docker-specific review. Docker CLI, daemon, or local image absence is treated as structured non-safety output.

## Current Execution Status After PR #26

| Area | Status |
| --- | --- |
| Browser sandbox | Validation only; no execution. |
| Worker boundary | Manually gated local-dev execution exists only for reviewed version/identity commands. Default config blocks execution. |
| Docker | `docker --version` and readiness-only `docker version --format "{{json .}}"` may be attempted under separate reviewed configs. Runtime, object, socket, mount, and container commands remain denied. |
| Container smoke | One exact reviewed local-dev smoke command may execute with `--pull=never`, `--network none`, `--user 65534:65534`, no mounts, no shell, no root user, no host env, bounded output, and trusted review. No arbitrary `docker run` exists. |
| Network | Disabled for container smoke with `--network none`; no network command surface exists. |
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

## Docker Container Design Gates

PR #25 adds plan-only policy gates for future local-dev container smoke execution.

| Gate | Current behavior |
| --- | --- |
| Images | Only exact future references such as `alpine:3.20` and `node:20-alpine` are allowlisted. `latest`, untagged, private registry, digest, arbitrary, and shell-metacharacter images are denied. |
| Commands | Plan-only allowlist covers `echo`, `pwd`, `node --version`, and `python --version`. Shells, package installs, network tools, file writes, destructive commands, and Docker commands inside the container are denied. |
| Network | `networkMode = none`; DNS and network remain disabled. |
| Mounts | Docker socket, home, workspace bind mount, and tmpfs remain disabled. |
| Security | Privileged, host network, host PID/IPC, capability add, root user, and missing no-new-privileges are denied. |
| Plan | `dockerRunPreview` is a string-array preview only. It is never passed to `execFile`. |

## Future Execution Gate

The next execution PR must remain local-dev only and must satisfy `docs/dremo-code/docker-execution-security-checklist.md`.

Required defaults:

| Gate | Required value |
| --- | --- |
| `noExecution` | `true` until reviewed runtime execution exists. |
| `allowRealExecution` | `false` by default. |
| Docker socket mount | `false`. |
| Home mount | `false`. |
| Workspace mount | `false`. |
| Network | `false`. |
| File writes | `false`. |
| Production UI path | Not allowed. |
