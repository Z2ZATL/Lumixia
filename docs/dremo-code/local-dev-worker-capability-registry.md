# Dremo local-dev worker capability registry

Status: operator reference.

This registry maps the current Dremo local-dev worker capabilities, policies, adapters, fixtures, golden checks, telemetry schema, docs checks, and safety checks in one place. It is documentation only. It does not add runtime behavior, Docker execution, telemetry collection, network calls, database writes, browser integration, production UI paths, or dependencies.

## Purpose

The local-dev worker has grown through many deliberately small PRs. This registry gives operators and reviewers a single reference for what exists, what may execute, what is plan-only or report-only, where the files live, and which verification commands cover each surface.

Use this page with [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md), the [operator guide](./local-dev-worker-operator-guide.md), the [extension playbook](./local-dev-worker-extension-playbook.md), and the [Docker execution security checklist](./docker-execution-security-checklist.md).

## How to read this registry

| Field | Meaning |
| --- | --- |
| Capability | Human-readable name of the worker surface. |
| Capability ID / name | Manifest capability id, config mode, script name, or document/check name. |
| Command shape if any | Exact command array or "none" for non-execution surfaces. |
| Execution status | Whether the capability can execute, is plan-only, report-only, schema-only, golden-only, or verification-only. |
| Gate / config | Config, trusted review, or script that constrains the capability. |
| Adapter / policy files | Files that implement policy, adapter, formatter, or checker behavior. |
| Fixture coverage | Fixture or self-check files that prove expected behavior. |
| Safety notes | Boundary constraints reviewers must preserve. |

## Capability categories

| Category | Meaning |
| --- | --- |
| Executable | May execute only under reviewed local-dev config and trusted local review helpers. |
| Plan-only | Models a future command or policy but never executes it. |
| Report-only | Formats or normalizes existing structured results only. |
| Schema-only | Defines local-dev schema objects without collection, upload, storage, or network. |
| Golden-only | Compares deterministic fixture output to committed snapshots. |
| Verification-only | Checks boundaries, docs links, types, fixtures, and safety invariants. |

## Current executable capabilities

| Capability | Capability ID / name | Command shape if any | Execution status | Gate / config | Adapter / policy files | Fixture coverage | Safety notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Non-Docker version/identity commands | `capability.node.version`, `capability.npm.version`, `capability.pnpm.version`, `capability.python.version`, `capability.git.version`, `capability.pwd.identity`, `capability.echo.metadata` | Exact command/args arrays such as `node --version`, `npm --version`, `pwd`, and `echo` | Executable in local-dev only | `LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG`; trusted local manual review | `localDevWorkerVersionExecutionAdapter.ts`, `localDevWorkerExecutionConfig.ts`, `localDevWorkerExecutionManifest.ts`, `localDevWorkerExecutionReviewGate.ts` | `localDevWorkerVersionExecutionFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | No shell, no inherited host env, bounded output/time, no package install, no network tools. |
| Docker CLI version probe | `capability.docker.version` | `docker --version` | Executable in local-dev only | `LOCAL_DEV_WORKER_REVIEWED_DOCKER_VERSION_PROBE_CONFIG`; Docker-specific trusted review | `localDevWorkerVersionExecutionAdapter.ts`, `localDevWorkerDockerProbePolicy.ts`, `localDevWorkerExecutionConfig.ts` | `localDevWorkerVersionExecutionFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Does not run containers, query daemon state, mount sockets, or inspect runtime objects. |
| Docker daemon readiness probe | `capability.docker.daemon.readiness` | `docker version --format "{{json .}}"` | Executable in local-dev only | `LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG`; readiness trusted review | `localDevWorkerDockerReadinessAdapter.ts`, `localDevWorkerDockerDaemonReadinessPolicy.ts`, `localDevWorkerDockerVersionParser.ts`, `localDevWorkerDockerReadiness.ts` | `localDevWorkerDockerReadinessFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Classifies CLI/daemon availability only; no containers, image pull/build, object inspection, mounts, or network commands. |
| Exact Docker smoke command | `capability.docker.container.smoke.echo` | `docker run --rm --name lumixia-dremo-smoke-echo --label ... --network none --pull=never --read-only --cap-drop ALL --security-opt no-new-privileges --memory 128m --cpus 0.5 --pids-limit 64 --user 65534:65534 alpine:3.20 echo hello` | Executable in local-dev only | `LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG`; smoke trusted review; exact policy | `localDevWorkerDockerContainerSmokeAdapter.ts`, `localDevWorkerDockerContainerSmokePolicy.ts`, `localDevWorkerDockerContainerIdentity.ts`, `localDevWorkerExecutionConfig.ts` | `localDevWorkerDockerContainerSmokeFixtures.ts`, `localDevWorkerDockerSmokeAuditFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | One exact image and command; no pull, no network, no mounts, no root user, no shell, no host env, bounded output/time. |
| Exact Docker cleanup command | `capability.docker.smoke.cleanup.exact` | `docker rm -f lumixia-dremo-smoke-echo` | Executable in local-dev only | `LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG`; cleanup trusted review; exact cleanup policy | `localDevWorkerDockerCleanupAdapter.ts`, `localDevWorkerDockerCleanupPolicy.ts`, `localDevWorkerDockerContainerIdentity.ts`, `localDevWorkerExecutionConfig.ts` | `localDevWorkerDockerCleanupExecutionFixtures.ts`, `localDevWorkerDockerCleanupFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Only exact deterministic target; target-not-found is structured; no ps/inspect/prune/stop/kill, wildcard, container id, multiple target, or arbitrary cleanup. |
| Docker smoke lifecycle orchestrator | `localDevWorkerDockerSmokeLifecycle` | None added; composes existing readiness, smoke, audit, and cleanup adapters | Executable composition only; no new command capability | Existing reviewed readiness/smoke/cleanup configs and trusted reviews; dependency injection for self-check | `localDevWorkerDockerSmokeLifecycle.ts`, `localDevWorkerDockerSmokeLifecyclePolicy.ts` | `localDevWorkerDockerSmokeLifecycleFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Calls readiness before smoke; skips smoke when readiness unavailable; cleanup decision is exact and policy-bound. |
| Local-dev lifecycle report CLI | `dremo:worker:lifecycle:report`, `dremo:worker:lifecycle:report:json` | No user command input; default mode calls existing lifecycle only | Local-dev CLI wrapper only | Exact request factory, trusted local review helpers, existing lifecycle adapters | `localDevWorkerDockerSmokeLifecycleCli.ts`, `localDevWorkerDockerSmokeLifecycleCliRequests.ts`, `localDevWorkerDockerSmokeLifecycleReport.ts` | `localDevWorkerDockerSmokeLifecycleCliFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | CLI accepts report flags only; no user-provided image, command, container name, label, cleanup target, env, or path. |

## Current plan-only capabilities

| Capability | Capability ID / name | Command shape if any | Status | Gate / config | Files | Fixture coverage | Safety notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Container execution policy design | Container policy model | Plan previews only | Plan-only | Policy objects require no network, no mounts, read-only root filesystem, non-root, no privileged mode | `localDevWorkerDockerContainerPolicy.ts`, `localDevWorkerDockerImagePolicy.ts`, `localDevWorkerDockerContainerCommandPolicy.ts`, `localDevWorkerDockerContainerReadinessGate.ts` | `localDevWorkerDockerContainerPolicyFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | No `docker run` execution is introduced by the plan model. |
| Container plan model | `LocalDevWorkerDockerContainerPlan` | `dockerRunPreview` array only | Plan-only | Image policy and command policy must allow the preview | `localDevWorkerDockerContainerPlan.ts` | `localDevWorkerDockerContainerPolicyFixtures.ts` | Preview is data only and must not be passed to process APIs. |
| Cleanup plan model | `LocalDevWorkerDockerCleanupPlan` | `docker rm -f lumixia-dremo-smoke-echo` preview only | Plan-only companion to exact cleanup policy | Exact deterministic target and labels | `localDevWorkerDockerCleanupPlan.ts`, `localDevWorkerDockerCleanupPolicy.ts` | `localDevWorkerDockerCleanupFixtures.ts` | No arbitrary target, wildcard, container id, prune, ps, inspect, stop, or kill. |
| Execution readiness evaluator | Future execution readiness | None | Plan/readiness-only | Capability manifest, validation, guards, manual review gate | `localDevWorkerExecutionReadiness.ts`, `localDevWorkerExecutionReviewGate.ts`, `localDevWorkerExecutionManifest.ts` | `localDevWorkerExecutionReadinessFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Preserves blocked/default posture and records rejection codes. |

## Current report, schema, and golden-only capabilities

| Capability | Capability ID / name | Command shape if any | Status | Gate / config | Files | Fixture coverage | Safety notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Smoke result normalization | `LocalDevWorkerDockerSmokeOutcome` | None | Report-only | Existing smoke result input | `localDevWorkerDockerSmokeResultNormalizer.ts`, `localDevWorkerDockerSmokeAudit.ts`, `localDevWorkerOutputSanitizer.ts` | `localDevWorkerDockerSmokeAuditFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Sanitizes stdout/stderr and classifies cleanup risk; no cleanup execution is added. |
| Lifecycle report formatter | `LocalDevWorkerDockerSmokeLifecycleReport` | None | Report-only | Existing lifecycle result input | `localDevWorkerDockerSmokeLifecycleReport.ts`, `localDevWorkerDockerSmokeLifecycleReportPolicy.ts` | `localDevWorkerDockerSmokeLifecycleReportFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Produces sanitized Markdown/JSON summaries only. |
| Lifecycle report fixture CLI modes | `dremo:worker:lifecycle:report:fixture`, `dremo:worker:lifecycle:report:fixture:json` | None | Report-only | Deterministic fake lifecycle fixture | `localDevWorkerDockerSmokeLifecycleCli.ts`, `localDevWorkerDockerSmokeLifecycleCliFixtures.ts` | `localDevWorkerDockerSmokeLifecycleCliFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | Does not require Docker Desktop, local images, or cleanup target. |
| Golden lifecycle report checks | `dremo:worker:lifecycle:report:golden` | None | Golden-only | Committed Markdown/JSON fixtures | `localDevWorkerDockerSmokeLifecycleGoldenCheck.ts`, `localDevWorkerGoldenReportCheck.ts`, `golden/docker-smoke-lifecycle.fixture.md`, `golden/docker-smoke-lifecycle.fixture.json` | `localDevWorkerDryRunSelfCheck.ts` | Imports fixture functions directly; no Docker, cleanup, npm script execution, or file writes. |
| Telemetry schema | `2026-05-18.local-dev-worker.telemetry.v1` | None | Schema-only | Local-dev-only event policy | `localDevWorkerLifecycleTelemetrySchema.ts`, `localDevWorkerLifecycleTelemetryPolicy.ts`, `localDevWorkerLifecycleTelemetryEvents.ts`, `localDevWorkerLifecycleTelemetryFixtures.ts` | `localDevWorkerLifecycleTelemetryFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` | No upload, analytics provider, network, DB write, runtime file write, env read, or browser path. |
| Telemetry golden checks | `dremo:worker:telemetry:golden` | None | Golden-only | Committed telemetry fixture JSON | `localDevWorkerTelemetryGoldenCheck.ts`, `golden/local-dev-worker-telemetry.fixture.json` | `localDevWorkerDryRunSelfCheck.ts` | Fixture-only comparison; no telemetry collection, upload, storage, runtime write, network, DB, Docker, or `src` import. |

## Current verification-only capabilities

| Capability | Capability ID / name | Command shape if any | Status | Files | Coverage | Safety notes |
| --- | --- | --- | --- | --- | --- | --- |
| Worker typecheck | `dremo:worker:typecheck` | None | Verification-only | `package.json` script list | Typechecks worker TS modules | No runtime behavior change; compile-only. |
| Worker self-check | `dremo:worker:selfcheck` | May invoke reviewed adapters through existing fixtures | Verification-only | `localDevWorkerDryRunSelfCheck.ts`, `localDevWorkerDryRunSelfCheckRunner.ts` | Fixtures across dry-run, readiness, execution, Docker, lifecycle, reports, telemetry, and golden helpers | Docker/CLI absence is structured where expected; fixture paths guard unsafe expansion. |
| Worker safety scan | `dremo:worker:safety` | None | Verification-only | `localDevWorkerSafetyScan.mjs` | Browser sandbox, `src` imports, process API boundary, telemetry/golden fixture safety | Fails on process APIs in `src`, worker imports from `src`, and unsafe API usage outside reviewed adapters. |
| Docs link check | `dremo:worker:docs` | None | Verification-only | `localDevWorkerDocsLinkCheck.ts` | Operator docs, ADR docs, capability registry, docs indexes | Reads local Markdown only; no process APIs, Docker, network, env reads, or file writes. |
| Worker verify | `dremo:worker:verify` | Runs typecheck, self-check, safety, golden checks, docs check | Verification-only | `package.json` | Combined worker verification stack | Must remain deterministic and should not require Docker success. |

## Explicitly forbidden capabilities

| Forbidden capability | Status |
| --- | --- |
| Arbitrary `docker run` | Forbidden. |
| Arbitrary cleanup | Forbidden. |
| `docker ps`, `docker inspect`, or prune | Forbidden. |
| Image pull, build, or compose | Forbidden. |
| Repo execution | Forbidden. |
| Workspace mounts | Forbidden. |
| Package install | Forbidden. |
| Docker socket mount | Forbidden. |
| Home directory mount | Forbidden. |
| Network access | Forbidden. |
| Browser-to-worker bridge | Forbidden. |
| Production UI execution | Forbidden. |
| Telemetry upload or analytics provider | Forbidden. |
| Supabase, SQL, or billing changes | Forbidden in local-dev worker PRs. |
| Service role or secrets access | Forbidden. |

## Capability-to-file map

| Capability area | Primary files |
| --- | --- |
| Contracts, validation, dry-run | `localDevWorkerContract.ts`, `localDevWorkerRequestValidation.ts`, `localDevWorkerRunner.ts`, `localDevWorkerDryRunAdapter.ts`, `localDevWorkerTrace.ts`, `localDevWorkerGuards.ts` |
| Manifest, config, review gates | `localDevWorkerExecutionCapability.ts`, `localDevWorkerExecutionManifest.ts`, `localDevWorkerExecutionConfig.ts`, `localDevWorkerExecutionReviewGate.ts`, `localDevWorkerExecutionReadiness.ts`, `localDevWorkerTrustedReview.ts` |
| Version and identity execution | `localDevWorkerVersionExecutionAdapter.ts`, `localDevWorkerVersionExecutionFixtures.ts` |
| Docker version/readiness probes | `localDevWorkerDockerProbePolicy.ts`, `localDevWorkerDockerDaemonReadinessPolicy.ts`, `localDevWorkerDockerReadiness.ts`, `localDevWorkerDockerReadinessAdapter.ts`, `localDevWorkerDockerVersionParser.ts` |
| Container policy/design | `localDevWorkerDockerContainerPolicy.ts`, `localDevWorkerDockerImagePolicy.ts`, `localDevWorkerDockerContainerCommandPolicy.ts`, `localDevWorkerDockerContainerPlan.ts`, `localDevWorkerDockerContainerReadinessGate.ts` |
| Smoke execution and identity | `localDevWorkerDockerContainerSmokePolicy.ts`, `localDevWorkerDockerContainerSmokeAdapter.ts`, `localDevWorkerDockerContainerIdentity.ts` |
| Cleanup plan/execution | `localDevWorkerDockerCleanupPolicy.ts`, `localDevWorkerDockerCleanupPlan.ts`, `localDevWorkerDockerCleanupAdapter.ts` |
| Audit and output safety | `localDevWorkerDockerSmokeResultNormalizer.ts`, `localDevWorkerOutputSanitizer.ts`, `localDevWorkerDockerSmokeAudit.ts` |
| Lifecycle orchestration | `localDevWorkerDockerSmokeLifecycle.ts`, `localDevWorkerDockerSmokeLifecyclePolicy.ts` |
| Reports and CLI | `localDevWorkerDockerSmokeLifecycleReport.ts`, `localDevWorkerDockerSmokeLifecycleReportPolicy.ts`, `localDevWorkerDockerSmokeLifecycleCli.ts`, `localDevWorkerDockerSmokeLifecycleCliRequests.ts`, `localDevWorkerDockerSmokeLifecycleCliFixtures.ts` |
| Golden checks | `localDevWorkerGoldenReportCheck.ts`, `localDevWorkerDockerSmokeLifecycleGoldenCheck.ts`, `localDevWorkerTelemetryGoldenCheck.ts`, `tools/local-dev-worker/golden/*` |
| Telemetry schema | `localDevWorkerLifecycleTelemetrySchema.ts`, `localDevWorkerLifecycleTelemetryPolicy.ts`, `localDevWorkerLifecycleTelemetryEvents.ts`, `localDevWorkerLifecycleTelemetryFixtures.ts` |
| Verification | `localDevWorkerDryRunSelfCheck.ts`, `localDevWorkerDryRunSelfCheckRunner.ts`, `localDevWorkerSafetyScan.mjs`, `localDevWorkerDocsLinkCheck.ts` |

## Capability-to-test map

| Capability area | Test / fixture coverage |
| --- | --- |
| Dry-run contract and guards | `localDevWorkerFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Review gates and readiness | `localDevWorkerExecutionReadinessFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Version and Docker probe execution | `localDevWorkerVersionExecutionFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Docker readiness | `localDevWorkerDockerReadinessFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Container policy design | `localDevWorkerDockerContainerPolicyFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Smoke execution | `localDevWorkerDockerContainerSmokeFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Smoke audit and output sanitization | `localDevWorkerDockerSmokeAuditFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Cleanup plan and execution | `localDevWorkerDockerCleanupFixtures.ts`, `localDevWorkerDockerCleanupExecutionFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Lifecycle orchestration | `localDevWorkerDockerSmokeLifecycleFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Lifecycle reports and CLI fixtures | `localDevWorkerDockerSmokeLifecycleReportFixtures.ts`, `localDevWorkerDockerSmokeLifecycleCliFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Golden checks | `localDevWorkerDockerSmokeLifecycleGoldenCheck.ts`, `localDevWorkerTelemetryGoldenCheck.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Telemetry schema | `localDevWorkerLifecycleTelemetryFixtures.ts`, `localDevWorkerDryRunSelfCheck.ts` |
| Boundary and docs checks | `localDevWorkerSafetyScan.mjs`, `localDevWorkerDocsLinkCheck.ts` |

## Capability-to-doc map

| Document | Role |
| --- | --- |
| [README](./README.md) | Dremo Code docs index and current status summary. |
| [Operator guide](./local-dev-worker-operator-guide.md) | How to understand, run, verify, and safely extend the worker. |
| [Troubleshooting matrix](./local-dev-worker-troubleshooting.md) | Safe checks and safe fixes for common worker/lifecycle failures. |
| [Extension playbook](./local-dev-worker-extension-playbook.md) | Allowed and forbidden future PR shapes and review checklists. |
| [Docker execution security checklist](./docker-execution-security-checklist.md) | Required gates before Docker execution expansion. |
| [Sandbox security](./sandbox-security.md) | Broader sandbox threat model and isolation rules. |
| [Sandbox provider decision](./sandbox-provider-decision.md) | Production sandbox provider boundary and local-dev worker notes. |
| [Migration plan](./migration-plan.md) | Phased path from Code Architect AI mock to Dremo Code. |
| [ADR index](../adr/README.md) | Architecture decision record index. |
| [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md) | Accepted decision for the local-dev worker boundary and Docker smoke lifecycle. |
| [Worker README](../../tools/local-dev-worker/README.md) | File-level worker map and verification commands. |

## Future extension rules

| Rule | Requirement |
| --- | --- |
| One capability per PR | Do not mix execution, telemetry, reporting, docs, UI, and workspace changes. |
| Document before broadening | Update this registry, ADRs, operator docs, checklist, and fixtures before changing boundaries. |
| Policy before execution | Add pure policy, denial coverage, and safety scan changes before any adapter can execute. |
| Fixture before execution | Add allowed and denied fixtures before enabling a new command. |
| Exact command before general command | Never jump from one reviewed command to arbitrary command execution. |
| Golden checks for stable outputs | Report or schema output drift must be intentional, reviewed, and covered by golden checks. |
| Browser bridge is separate | Browser-to-worker integration requires a separate design review and must not be combined with repo execution. |
| Repo/workspace execution is separate | Workspace mounts, repo commands, package install, network, and artifact writes require their own threat model. |
