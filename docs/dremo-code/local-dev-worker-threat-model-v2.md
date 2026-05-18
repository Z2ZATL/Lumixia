# Dremo local-dev worker threat model v2

Status: accepted local-dev security model.

This document describes the current threat model for the Dremo local-dev worker and Docker smoke lifecycle. It is documentation only. It does not change runtime behavior, add Docker execution, collect telemetry, add network calls, write databases, expose browser or production UI paths, or add dependencies.

For release or handoff decisions, pair this threat model with the [local-dev worker release readiness checklist](./local-dev-worker-release-readiness.md).

## Scope

This threat model covers:

| Area | Included |
| --- | --- |
| Browser/Vite/React boundary | `src/` must remain process-free and must not import worker code. |
| Local-dev worker boundary | `tools/local-dev-worker/` validation, trusted review helpers, policies, adapters, lifecycle, reports, golden checks, telemetry schema, and docs checks. |
| Docker local-dev probes | `docker --version`, the exact daemon readiness probe, the exact smoke command, and the exact cleanup command. |
| Report and telemetry schema output | Sanitized local-dev reports, golden fixtures, telemetry schema objects, and telemetry golden checks. |
| Verification stack | Worker typecheck, self-check, safety scan, lifecycle report golden check, telemetry golden check, docs link check, app typecheck/build, audit, and diff checks. |

## Out of scope

This threat model does not approve:

| Area | Status |
| --- | --- |
| Production sandbox execution | Out of scope. Requires provider selection and separate review. |
| Browser-to-worker bridge | Out of scope. Requires separate design review. |
| Repo execution | Out of scope. Requires workspace, artifact, credential, and rollback policy. |
| Workspace mounts | Out of scope. Requires a separate workspace mount threat model. |
| Package installs or network access | Out of scope. Requires egress and package lifecycle-script review. |
| Telemetry collection/upload | Out of scope. Requires privacy, storage, retention, and opt-in review. |
| Supabase, SQL, billing, branding, or TerminalWorkspace changes | Out of scope for local-dev worker security-model PRs. |

## System overview

The worker architecture has four major layers:

| Layer | Role |
| --- | --- |
| Browser bundle under `src/` | Browser-safe validation and display only. No process APIs, Docker calls, or worker imports. |
| `tools/local-dev-worker/` | Local-dev-only worker boundary for exact reviewed capabilities, fixtures, reports, golden checks, telemetry schema, and docs checks. |
| Docker CLI / daemon | Local operator machine boundary. Only exact reviewed probes, exact smoke run, and exact cleanup may be attempted. |
| Reporting / telemetry schema | Sanitized local summaries and deterministic fixtures. No upload, DB writes, runtime file writes, or network calls. |

The current executable Docker surface is intentionally tiny:

| Capability | Exact scope |
| --- | --- |
| Docker CLI version | `docker --version` only. |
| Docker readiness | Exact daemon readiness probe only. |
| Docker smoke | Exact no-network, no-mount, non-root `alpine:3.20 echo hello` command only. |
| Docker cleanup | Exact `docker rm -f lumixia-dremo-smoke-echo` only. |

## Trust boundaries

### Browser / Vite / React `src/` boundary

| Requirement | Control |
| --- | --- |
| No process APIs | Safety scan blocks process API strings in browser-bundled sandbox code. |
| No worker imports | Safety scan checks `src/` for references to `tools/local-dev-worker`. |
| No Docker commands | Docker process capability stays outside `src/`. |
| No production UI execution path | Dremo Lab and production UI do not call the local-dev worker. |

### `tools/local-dev-worker` boundary

| Requirement | Control |
| --- | --- |
| Local-dev only | Request source and expected environment gates require local-dev values. |
| Trusted review helpers | Browser/user-supplied review metadata is not trusted. |
| Exact capability configs | Reviewed configs allow only exact capability ids. Default config blocks real execution. |
| Reviewed adapter allowlist | Process APIs are allowed only in explicitly reviewed worker adapter files. |

### Docker CLI / daemon boundary

| Requirement | Control |
| --- | --- |
| Exact probes only | Docker version and readiness policies require exact command/arg arrays. |
| Exact smoke command | Smoke policy requires static name, static labels, no network, no pull, no mounts, non-root, and fixed resource caps. |
| Exact cleanup command | Cleanup policy allows only `docker rm -f lumixia-dremo-smoke-echo`. |
| No broad daemon operations | `docker ps`, `docker inspect`, prune, arbitrary cleanup, image pull/build, compose, exec, cp, login, and broad runtime commands remain denied. |

### Reporting / telemetry schema boundary

| Requirement | Control |
| --- | --- |
| Sanitized only | Output sanitizer redacts secret-like strings, home paths, and `.env` references. |
| Deterministic fixtures | Report and telemetry fixtures avoid timestamps, usernames, host paths, env values, and machine-specific Docker values. |
| No telemetry upload | Telemetry schema objects are local-dev-only and non-uploading. |
| No network or DB writes | Golden/report/telemetry checks do not call network APIs or write databases. |

## Assets to protect

| Asset | Why it matters |
| --- | --- |
| User source code | Repo contents may contain private product logic and prompt-injection data. |
| Local filesystem | Developer machines may contain unrelated private files. |
| Home directory | Home paths can expose SSH keys, cloud credentials, tokens, and personal files. |
| Environment variables | Host env often contains credentials and service configuration. |
| Secrets and service role keys | Service role misuse can bypass application-level protections. |
| Supabase resources | Database, auth, storage, and functions must not be mutated by local worker experiments. |
| Browser production bundle | Browser code must not gain host process authority. |
| Docker daemon and host | Docker daemon access can become host-level authority on many machines. |
| Report and golden fixture integrity | Drift can hide unsafe changes or leak sensitive output. |
| Operator trust and review signal | Trusted review helpers must not be spoofed by request payloads. |

## Threat actors

| Actor | Capability |
| --- | --- |
| Malicious or compromised repo content | Can influence prompts, generated commands, output text, and documentation examples. |
| Accidental developer change | Can broaden a command, weaken a fixture, or move worker imports into `src/`. |
| Browser user input | Can attempt to spoof review metadata, command args, source, environment, or production path flags. |
| Local malware or hostile Docker state | Can create conflicting containers or alter Docker daemon behavior outside the worker. |
| Future integration PR | Can accidentally combine UI, workspace, network, and execution changes in one broad step. |

## Threat categories

| Threat | Example failure | Current control |
| --- | --- | --- |
| Browser bundle escape | Process API enters `src/`. | Browser sandbox safety scan and `src` worker-import scan. |
| Arbitrary command execution | A helper accepts arbitrary command/args. | Capability manifest, exact policies, trusted review, no shell strings. |
| Docker command expansion | A PR changes exact Docker args to broader runtime commands. | Docker probe/readiness/smoke/cleanup policies and fixtures. |
| Docker socket mount | A command mounts `/var/run/docker.sock`. | Mount flags and socket references remain denied. |
| Home/workspace mount | A command mounts home or workspace paths. | Home/workspace path patterns and mount flags remain denied. |
| Network enablement | Smoke command gains network or curl/wget path. | `--network none`, command guards, and safety scan coverage. |
| Image pull/build risk | A command pulls unreviewed images or builds from local context. | `--pull=never`; pull/build/compose denied. |
| Broad cleanup/destructive Docker operations | Cleanup expands to wildcard, container id, prune, ps, inspect, stop, or kill. | Exact cleanup policy and cleanup fixtures. |
| Secret leakage through output | stdout/stderr contains API keys, service role markers, home paths, or `.env` references. | Output sanitizer, report fixtures, telemetry policy, golden safety checks. |
| Telemetry exfiltration | Telemetry schema becomes upload/storage behavior. | Telemetry files are schema-only; safety scan blocks network, DB-ish APIs, env reads, and file writes. |
| Capability drift | Registry, ADR, docs, fixtures, and code disagree. | Capability registry, ADR, docs link check, self-check, and golden checks. |
| Fixture/golden drift | Report or telemetry shape changes silently. | Lifecycle and telemetry golden checks. |
| Review metadata spoofing | Browser/user request claims manual review completion. | Trusted local review helper source checks. |
| Production UI path exposure | Worker becomes callable from Dremo Lab or production UI. | Production path flags, no `src` imports, safety scan. |
| Supabase/service role misuse | Worker reads service role key or mutates Supabase. | No secrets/env reads, no Supabase function/SQL changes, safety scan coverage. |
| Documentation drift | Operators follow stale instructions. | ADR, capability registry, docs link check, checklist, and operator docs. |

## Current mitigations

| Mitigation | Control location |
| --- | --- |
| `src` safety scan | `localDevWorkerSafetyScan.mjs` scans browser sandbox and all `src/` worker imports. |
| Worker process API allowlist | Process APIs allowed only in reviewed adapter files. |
| Exact command policies | Docker probe, readiness, smoke, and cleanup policy files require exact command shapes. |
| Trusted local manual review helpers | `localDevWorkerTrustedReview.ts` prevents trusting browser/user review payloads. |
| Capability manifest | `localDevWorkerExecutionManifest.ts` records exact disabled-by-default capabilities. |
| Readiness gates | Validation, guards, capability match, manual review, source, environment, production path, and `src` import path checks. |
| No shell | Adapters use array args and `shell: false`; shell metacharacters remain denied. |
| Empty environment | Execution adapters use `env: {}` and do not inherit host env. |
| No network | Smoke command requires `--network none`; network tools remain denied. |
| No mounts | Docker socket, home, workspace, mount, volume, and env-file flags remain denied. |
| `--pull=never` | Smoke command cannot pull missing images. |
| Non-root user | Smoke command requires `--user 65534:65534`. |
| Read-only root filesystem | Smoke command requires `--read-only`. |
| Dropped capabilities | Smoke command requires `--cap-drop ALL`. |
| No new privileges | Smoke command requires `--security-opt no-new-privileges`. |
| Deterministic container name/labels | Smoke identity is static and allowlisted. |
| Exact cleanup target only | Cleanup policy allows only the deterministic smoke container name. |
| Output sanitizer | Redacts obvious secret-like strings, `.env` references, and home paths. |
| Audit record | Smoke audit model stores sanitized previews and cleanup-risk metadata. |
| Lifecycle report formatter | Reports summarize existing lifecycle results without new commands. |
| Golden report checks | Markdown/JSON lifecycle report fixtures protect report output stability. |
| Telemetry schema validation | Telemetry events validate local-dev-only, non-secret, non-host-path payloads. |
| Telemetry golden checks | Deterministic telemetry fixture JSON protects schema output stability. |
| Docs link check | Ensures operator docs, ADR, capability registry, threat model, and checklist remain linked. |
| ADR and capability registry | Record the architectural decision and current capability inventory. |

## Verification coverage

| Command | Coverage |
| --- | --- |
| `npm run dremo:worker:typecheck` | Typechecks worker contracts, policies, adapters, fixtures, reports, telemetry, docs checks, and self-check runner. |
| `npm run dremo:worker:selfcheck` | Exercises deterministic fixtures across dry-run, review gates, execution, Docker readiness, container policy, smoke, audit, cleanup, lifecycle, reports, CLI, golden helpers, and telemetry. |
| `npm run dremo:worker:safety` | Enforces browser bundle boundary, process API allowlist, worker import boundary, telemetry/golden safety, and reviewed adapter boundaries. |
| `npm run dremo:worker:lifecycle:report:golden` | Protects deterministic lifecycle report Markdown/JSON fixture output. |
| `npm run dremo:worker:telemetry:golden` | Protects deterministic telemetry fixture JSON output. |
| `npm run dremo:worker:docs` | Ensures operator, ADR, registry, threat model, checklist, and index links remain connected. |
| `npm run dremo:worker:verify` | Runs worker typecheck, self-check, safety scan, golden checks, and docs check. |
| `npm run typecheck` / `npm run build` | Confirms app TypeScript and production browser build still pass. |
| `npm audit --omit=dev` | Checks production dependency vulnerabilities. |
| `git diff --check` | Catches whitespace and patch hygiene issues. |

## Residual risks

| Risk | Current posture |
| --- | --- |
| Docker daemon privilege | Docker daemon remains privileged on many hosts; local-dev use is still not a production sandbox. |
| Local image trust | Even no-network/no-mount containers depend on the trustworthiness of the already-local image. |
| Deterministic cleanup name collision | Exact cleanup can target the deterministic name if another process creates a container with that name. |
| Operator-invoked real mode | The local CLI real mode can run Docker locally if the operator intentionally invokes it. |
| Documentation and policy maintenance | Docs, registry, ADR, fixtures, and safety scan need continual maintenance as the worker evolves. |
| Future workspace/repo execution | Workspace mounts, repo commands, package installs, and network remain high risk and are not approved. |
| Telemetry collection absent | Telemetry collection is not implemented and must not be assumed safe from schema-only work. |

## Future review gates

Before high-risk expansion, require a dedicated PR and review for:

| Future area | Required review |
| --- | --- |
| Workspace mounts | Workspace mount threat model, secret exclusion, path policy, cleanup, and artifact policy. |
| Repo execution | Repo command threat model, prompt-injection controls, workspace rollback, and artifact review. |
| Package installs or network | Egress policy, package lifecycle-script policy, registry allowlist, and audit model. |
| Browser-to-worker bridge | Bridge design review, auth/authorization model, CSRF/origin controls, and production separation. |
| Production UI execution | Production sandbox provider review and server-owned execution/event/billing model. |
| Secrets handling | Secret injection, scope, redaction, storage, rotation, and audit review. |
| Docker image provenance | Image source, digest pinning, local image trust, and update policy. |
| Cleanup lifecycle | Cleanup naming, stale resource handling, quarantine policy, and exact target review. |
| Telemetry collection | Privacy, consent, storage, retention, upload, and deletion review. |
| Supabase/security | RLS, service role exclusion, function boundaries, SQL migration review, and audit ownership. |

## Related docs and PRs

| Reference | Relationship |
| --- | --- |
| [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md) | Accepted architecture decision for the local-dev worker boundary and Docker smoke lifecycle. |
| [Capability registry](./local-dev-worker-capability-registry.md) | Current capability, file, fixture, doc, and verification inventory. |
| [Threat checklist](./local-dev-worker-threat-checklist.md) | Future PR author checklist derived from this threat model. |
| [Release readiness checklist](./local-dev-worker-release-readiness.md) | Maintainer handoff checklist and readiness decision template. |
| [Operator guide](./local-dev-worker-operator-guide.md) | How to run, verify, and safely extend the worker. |
| [Extension playbook](./local-dev-worker-extension-playbook.md) | Allowed/forbidden future PR shapes and review checklists. |
| [Docker execution security checklist](./docker-execution-security-checklist.md) | Docker-specific blocker, gate, and review requirements. |
| [Sandbox security](./sandbox-security.md) | Broader Dremo sandbox threat model and production-provider criteria. |
| PR #18 - PR #38 | Capability ladder from browser-safe gates through registry reference. |
