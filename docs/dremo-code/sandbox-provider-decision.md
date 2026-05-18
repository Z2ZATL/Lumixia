# Dremo Sandbox Provider Decision Record

Status: proposed decision record.

Date: 2026-05-06

Scope: documentation only. This record does not implement real sandbox execution.

Implementation note: PR #13 adds a TypeScript sandbox runner interface, default policy constants, event mapping helpers, and a noop runner that blocks every command. It is still interface-only: no Docker, E2B, Daytona, filesystem, network, repo clone, model, or billing integration exists.

Policy validation note: PR #14 adds pure validation helpers for command allow/deny checks, blocked paths, environment policy, resource caps, and output caps. It still does not execute commands or integrate any sandbox provider.

Local-dev adapter note: PR #16 adds a Docker local-dev adapter skeleton and static config only. It follows the runner interface and policy validation layer, but it does not call Docker, execute commands, access files, use networks, clone repositories, or change billing.

Docker execution gate: before any real local-dev Docker execution PR, complete [docker-execution-security-checklist.md](./docker-execution-security-checklist.md). The checklist defines absolute blockers, local-dev gates, command allow/deny rules, mount policy, network policy, audit requirements, manual review, and rollback.

Worker boundary note: PR #19 adds `tools/local-dev-worker/` as a local-dev-only boundary outside the Vite browser bundle. It defines worker contracts, guards, a blocked/dry-run runner, and a browser source safety scan, but it still does not execute Docker or call process APIs.

Dry-run harness note: PR #20 extends the worker boundary with request validation, a dry-run adapter, deterministic trace metadata, fixtures, executable self-check helpers, npm verification scripts, and an expanded boundary scan. The worker is still dry-run only, Docker is not invoked, and there is no browser-to-worker execution path.

Execution review gate note: PR #21 adds the final pre-execution review layer: a disabled-by-default capability manifest, pure manual review gate, readiness evaluator, and readiness fixtures. The model can say a request is theoretically eligible for a future reviewed adapter, but it still returns `noExecution: true` and performs no Docker/process invocation.

Version execution adapter note: PR #22 adds the first real local-dev process execution path, isolated to `tools/local-dev-worker`. It is disabled by default, manually gated, non-Docker only, and not exposed to `src/`, Dremo Lab, production UI, Supabase functions, SQL, or billing.

Docker version probe note: PR #23 adds the first Docker-specific local-dev probe, limited strictly to `docker --version` inside the reviewed worker boundary. It does not run containers, query daemon state with `docker version` or `docker info`, mount Docker socket, mount home directories, or expose any Docker path to `src/` or production UI.

Docker readiness note: PR #24 adds local-dev Docker daemon readiness classification with the exact command `docker version --format "{{json .}}"`. It classifies CLI/daemon availability only; it does not start containers, pull/build images, inspect runtime objects, mount Docker socket, mount home directories, or expose execution through `src/` or production UI.

Container design-gate note: PR #25 adds local-dev container execution policy and plan models only. It defines future image, command, network, mount, resource, and security gates, plus a non-executed `dockerRunPreview`.

Container smoke note: PR #26 adds the first reviewed local-dev container smoke execution path. After PR #28, it allows only the exact `alpine:3.20` + `echo hello` Docker run command with static `--name lumixia-dremo-smoke-echo`, allowlisted `lumixia.dremo.*` labels, `--pull=never`, `--network none`, `--user 65534:65534`, read-only root filesystem, dropped capabilities, no-new-privileges, memory/CPU/PID caps, no mounts, no shell, no root user, no host environment, and no browser/production path. It still does not allow arbitrary repo execution, workspace mounts, network, image pull/build, compose, exec/cp/login, arbitrary names/labels, or production sandbox use.

Smoke audit note: PR #27 adds local-dev smoke result normalization, output sanitization, audit-safe records, and cleanup-risk metadata. It does not add cleanup execution, deterministic container names, arbitrary Docker commands, workspace mounts, network, or any browser/production path.

Cleanup planning note: PR #28 adds deterministic smoke container naming, static labels, cleanup plan preview, and cleanup review policy. It does not execute `docker rm`, `docker ps`, `docker inspect`, prune, stop/kill, or arbitrary cleanup targets.

Exact cleanup note: PR #29 adds one reviewed local-dev cleanup execution path for `docker rm -f lumixia-dremo-smoke-echo`. It does not add arbitrary cleanup, `docker ps`, `docker inspect`, prune, stop/kill, arbitrary Docker runtime, workspace mounts, network, or browser/production execution.

Lifecycle note: PR #30 adds a local-dev-only orchestrator that composes readiness classification, exact smoke execution, audit normalization, and exact cleanup execution. It uses existing reviewed adapters and adds no new Docker command capability, process API file, browser path, production path, workspace mount, network, or arbitrary cleanup.

Lifecycle report note: PR #31 adds sanitized Markdown and deterministic JSON report formatting for existing local-dev lifecycle results. It is intended for future CLI/UI/audit display only and adds no Docker command capability, process API file, browser path, production path, workspace mount, network, cleanup expansion, Supabase, SQL, or billing behavior.

Lifecycle CLI note: PR #32 adds a local-dev-only CLI wrapper for those existing lifecycle reports. It lives under `tools/local-dev-worker`, accepts only report-format flags, includes a deterministic dry-report fixture mode, and adds no Docker command capability, process API file, browser path, production path, workspace mount, network, cleanup expansion, Supabase, SQL, billing, branding, or TerminalWorkspace behavior.

Golden report note: PR #33 adds committed Markdown and JSON golden checks for the deterministic lifecycle dry-report fixture. The checker reads local golden files and imports fixture functions directly; it does not execute Docker, cleanup, npm scripts, or any new process adapter.

## 1. Decision Summary

Dremo Code should use a phased sandbox strategy instead of trying to run code inside the current web or Supabase Edge Function runtime.

| Area | Proposed decision |
| --- | --- |
| MVP/local-dev sandbox | Use a Docker-based local/dev sandbox prototype only. It is for developer validation, not production multi-tenant execution. |
| Early hosted sandbox option | Evaluate E2B and Daytona before production because both are closer to AI coding-agent sandbox needs than generic request runtimes. |
| Production target | Use a managed isolated sandbox provider or a dedicated sandbox worker pool. Do not use Vercel Functions or Supabase Edge Functions as the real code execution runtime. |
| Supabase Edge Functions | Keep as API/orchestration only: auth, ownership checks, task state, event writes, approvals, and billing coordination. |

The conservative path is:

```text
Browser
  -> dremo-api orchestration
  -> sandbox worker/provider boundary
  -> isolated per-task runtime
  -> server-owned events/artifacts
```

## 2. Non-goals

This PR does not:

| Non-goal | Reason |
| --- | --- |
| Execute real code | Real execution requires provider selection, isolation tests, and abuse controls. |
| Clone user repositories | Repo ingestion requires OAuth, credential scoping, and privacy policy. |
| Put secrets in a sandbox | Production secrets must never enter untrusted execution environments. |
| Select a permanent production provider | Hosted providers still need security, cost, latency, and operational evaluation. |
| Change billing | Credit reservation/charge/release remains a separate backend-owned flow. |
| Rename Code Architect AI | Production Dremo branding waits until execution, events, sandboxing, and credits are server-owned. |

## 3. Provider Comparison

| Provider | Best use case | Isolation model | Startup latency expectation | Persistence model | Networking controls | Filesystem controls | Cost/complexity | Fit for MVP | Fit for production | Key risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Docker local/dev | Developer prototype and contract validation. | Container isolation on developer machine. | Fast after image pull; variable on cold image builds. | Local volumes or temporary containers. | Docker network policies; can be disabled or restricted locally. | Bind mounts and container filesystem policies. | Low cost, moderate local setup complexity. | Strong fit for Phase B local/dev only. | Weak fit alone for multi-tenant production. | Host escape risk if misconfigured, local environment drift, secrets accidentally mounted. |
| E2B | AI agent sandboxes and fast hosted prototypes. | Managed isolated sandboxes built for agent workloads. | Expected to be low to moderate; must measure. | Provider-managed session/workspace lifecycle. | Provider policy support must be validated. | Provider workspace APIs and limits must be validated. | Medium operational complexity, provider pricing. | Strong candidate for hosted evaluation. | Potentially strong if controls and cost fit. | Vendor dependency, pricing at scale, exact isolation guarantees need review. |
| Daytona | Cloud development environment style tasks. | Managed dev environment/workspace isolation. | Expected moderate; measure cold start and repo prep. | Workspace/session model may support longer coding tasks. | Provider egress controls must be validated. | Workspace-level controls and mount boundaries need review. | Medium complexity, provider-specific workflow. | Strong candidate for hosted evaluation. | Potentially strong for repo-heavy tasks. | Operational fit, tenant isolation details, and cleanup guarantees need proof. |
| Fly Machines | Custom sandbox service with per-task machines. | VM or microVM-style app isolation depending on config. | Can be fast with prebuilt images; must measure per region. | Ephemeral machines with optional volumes. | Network can be controlled with platform and app policy. | Container image filesystem plus optional volumes. | Higher custom orchestration complexity. | Moderate fit after local prototype. | Good if Lumixia wants more control. | More custom worker code, image management, cleanup and cost runaway risk. |
| Google Cloud Run | Managed container workers and task services. | Managed container isolation with IAM boundaries. | Cold starts vary; can be improved with min instances. | Stateless by default; use external storage. | VPC egress and IAM controls are mature. | Container filesystem is ephemeral; external storage needed. | Moderate cloud complexity, mature operations. | Moderate fit for controlled workers. | Good for a dedicated worker service if streaming fits. | Interactive terminal streaming and long-running workspace persistence need design. |
| Kubernetes | Full control over multi-tenant sandbox worker pool. | Pods plus node/container isolation; stronger with gVisor/Kata/Firecracker. | Depends on cluster warm pool. | Persistent volumes or ephemeral pods. | Mature network policy support. | Volume and security-context policies. | Highest operational complexity. | Poor fit for early MVP. | Strong only if Lumixia accepts platform operations burden. | Misconfiguration, cluster escape risk, patch burden, high ops cost. |
| Modal | Batch/compute-style hosted execution and experiments. | Provider-managed isolated containers/functions. | Usually good for compute workloads; interactive latency must be measured. | Ephemeral by default with provider storage options. | Provider controls need validation. | Container filesystem and volume model. | Medium complexity. | Possible evaluation candidate. | Unclear for interactive coding workspace until tested. | Fit for terminal streaming, file diff workflows, and persistent sessions is uncertain. |
| Railway/Render backend service | Always-on orchestration or worker service. | Standard app/container hosting. | Good for web workers, not sandbox isolation. | App storage depends on service. | Basic platform/network controls. | Standard container filesystem. | Low to medium complexity. | Fit for orchestration workers, not untrusted code. | Not recommended as sandbox runtime. | Insufficient isolation for arbitrary user/AI code execution. |

## 4. Recommended Phased Approach

### Phase A: Contract-only, completed

| Item | Decision |
| --- | --- |
| Goal | Prove server-owned task, event, sandbox lifecycle, tool approval, repo scan, final report, artifact, and restore contracts. |
| Current state | Dremo Lab and `dremo-api` stubs exist. |
| Execution | No code execution. |
| Exit criteria | Already met for contract testing; continue to keep this safe while designing the runner. |

### Phase B: Local/dev sandbox prototype

| Item | Decision |
| --- | --- |
| Runtime | Docker only on a developer machine. |
| Production use | Not allowed. |
| Commands | Run only allowlisted harmless commands first. |
| Secrets | No host secrets, no service role key, no production API keys. |
| Workspace | Fixed temporary workspace generated by the prototype. |
| Limits | Strict CPU, memory, wall-clock, stdout/stderr, and artifact limits. |
| Events | All output becomes server-owned events through the trusted API/backend path. |
| Current step | PR #13 defines the runner interface/policy/event mapping and a noop runner without execution. PR #14 adds pure policy validation before execution. PR #16 adds a Docker local-dev adapter skeleton/config that still blocks all command requests. PR #17 adds the pre-execution Docker security checklist. PR #19 adds an out-of-bundle local-dev worker boundary. PR #20 adds the dry-run harness and verification scripts for that boundary. PR #21 adds capability and manual-review readiness gates. PR #22 adds the first manually gated local-dev non-Docker version command execution adapter. PR #23 adds a Docker CLI version probe for `docker --version` only. PR #24 adds Docker daemon readiness classification only. PR #25 adds plan-only container execution design gates. PR #26 adds one exact no-network/no-mount local-dev container smoke command. PR #27 adds smoke audit normalization and cleanup-risk metadata. PR #28 adds deterministic naming plus cleanup planning. PR #29 adds exact cleanup execution for the deterministic smoke container only. PR #30 composes readiness, exact smoke, audit, and exact cleanup into one local-dev lifecycle using existing adapters. PR #31 formats existing lifecycle results for future local CLI/UI/audit display. PR #32 adds a local-dev CLI wrapper and deterministic dry-report fixture for those reports. PR #33 adds fixture-only golden checks for Markdown/JSON report stability; arbitrary Docker runtime, socket, mount, network, image pull/build, workspace access, arbitrary cleanup, and broader daemon-state paths remain denied. |
| Goal | Validate the runner interface, adapter boundary, worker boundary, config shape, event stream shape, and checklist gates before choosing a hosted provider or adding local Docker execution. |

### Phase C: Hosted sandbox evaluation

| Item | Decision |
| --- | --- |
| Candidates | E2B and Daytona first. Fly Machines or Cloud Run can be compared if control requirements exceed managed sandbox capabilities. |
| Measures | Startup time, stream latency, filesystem boundaries, network controls, artifact export, cleanup reliability, price per task, and audit hooks. |
| Security tests | Confirm no production secrets in sandbox, controlled egress, task isolation, cleanup, and log redaction. |
| Exit criteria | A provider recommendation with measured evidence and a failure/rollback plan. |

### Phase D: Production sandbox architecture

| Requirement | Decision |
| --- | --- |
| Isolation | One isolated sandbox per task. |
| Credentials | No service role key in sandbox. User OAuth tokens only if task-scoped and short-lived. |
| Workspace | Task-scoped files only. No parent directory or host mounts. |
| Egress | Default deny or strict allowlist. |
| Artifacts | Size quotas, signed access, redaction, and retention policy. |
| Cleanup | Automatic cleanup on completion/failure/cancel plus sweeper for stuck sandboxes. |
| Abuse detection | Monitor runaway CPU, network attempts, suspicious commands, repeated failures, and quota abuse. |
| Billing guardrails | Backend-owned reservation before billable work, charge only after policy-approved execution phase, release/refund on safe failure/cancel states. |

## 5. Security Boundary

The Dremo security boundary is intentionally split:

| Boundary | Rule |
| --- | --- |
| Browser | Renders state and sends authenticated requests. It never executes code or owns trusted runtime state. |
| `dremo-api` | Orchestrates tasks, validates ownership, records server-owned events, and coordinates approvals/billing. |
| Sandbox runner | Executes only inside an isolated sandbox after policy and approval checks. |
| Service role | Stays only in trusted backend/orchestration code. It is never injected into a sandbox. |
| Temporary credentials | Sandbox receives task-scoped temporary credentials only when required and only after policy approval. |
| Command output | Treated as untrusted data. It must be escaped, bounded, redacted, and stored/displayed safely. |
| Logs | Redact sensitive-looking values before persistence and display. Preserve audit-relevant metadata. |

## 6. Minimum Sandbox Policy

Initial defaults should be intentionally tight.

| Policy | Initial default |
| --- | --- |
| CPU limit | 1 vCPU equivalent for prototype tasks. Increase only by task tier. |
| Memory limit | 1 GB for prototype tasks. Kill on OOM rather than swapping. |
| Wall-clock timeout | 5 minutes per command and 20 minutes per task in local/dev prototype. |
| Max stdout/stderr bytes | 64 KB per event after truncation, 5 MB aggregate task log cap. |
| Max artifact size | 2 MB inline patch/report preview, 10 MB total artifact metadata/export cap for prototype. |
| Allowed commands first | `pwd`, `ls`, `find` with bounded path/depth, `git status`, `git diff --stat`, `npm --version`, `node --version`, future `npm test` only after timeout controls. |
| Denied commands | Shells with interactive TTY, privilege escalation, daemon start, package publish, deployment, `git push`, credential access, destructive recursive delete outside workspace. |
| Blocked paths | Parent directories, host mounts, `.env*`, secret files, OS credential stores, SSH keys, cloud config directories. |
| Environment variables | Empty by default except explicit task metadata and non-secret runtime flags. No inherited host environment. |
| Network policy | Default deny. Allowlist package registries or GitHub only after provider supports enforceable egress controls. |
| Cleanup | Destroy sandbox after task completion/failure/cancel and run periodic sweeper for stale sessions. |
| Quarantine | Preserve evidence and block artifact download if suspicious behavior, escape attempts, or secret exposure is detected. |

## 7. Tool Approval Integration

The PR #8 approval stub defines the permission layer that future sandbox execution must pass through.

| Rule | Requirement |
| --- | --- |
| Low-risk tools | May run automatically only after sandbox policy explicitly allows them. Low risk does not mean unlimited. |
| Medium/high/critical tools | Require user approval before execution. |
| Approval scope | A decision approves one scoped action, not a broad tool class forever. |
| Sandbox restrictions | Approvals do not bypass CPU, memory, timeout, filesystem, network, or secret policies. |
| Audit | Approval decisions must be recorded as server-owned events before execution. |
| Denied commands | Must emit `tool_call_blocked` with a safe reason. |
| Post-approval execution | Future execution must emit `tool_call_started`, `tool_call_output`, and `tool_call_completed` or a failure event. |

## 8. Event Model Impact

| Event | Status | Notes |
| --- | --- | --- |
| `sandbox_requested` | Existing | Emitted by lifecycle stub. |
| `sandbox_starting` | Existing | Emitted by lifecycle stub. |
| `sandbox_ready` | Existing | Emitted by lifecycle stub. |
| `sandbox_stopping` | Existing | Emitted by lifecycle stub. |
| `sandbox_stopped` | Existing | Emitted by lifecycle stub. |
| `sandbox_failed` | Existing | Emitted on lifecycle failure path. |
| `tool_call_requested` | Existing | Emitted by tool approval stub. |
| `tool_approval_required` | Existing | Emitted when approval row is created. |
| `tool_approval_approved` | Existing | Emitted when approval is approved. |
| `tool_approval_rejected` | Existing | Emitted when approval is rejected. |
| `tool_call_started` | Existing allowlist, future real use | Use when a sandbox starts a real tool. |
| `tool_call_output` | Existing allowlist, future real use | Use for bounded stdout/stderr chunks. |
| `tool_call_completed` | Existing allowlist, future real use | Include exit code, duration, and truncation flags. |
| `tool_call_blocked` | Existing | Use for policy-denied or approval-denied actions. |
| `tool_call_failed` | Future | Add before real execution to represent runner/provider/tool failure. |
| `verification_started` | Existing allowlist, future real use | Use before test/check execution. |
| `verification_result` | Existing allowlist, future real use | Include result, command id, duration, and artifact refs. |
| `final_report_created` | Existing | Emitted by final report stub. |
| `artifact_created` | Existing | Emitted by artifact stub. |

Before real execution, `tool_call_failed` should be added to the SQL event allowlist and client event types.

## 9. Deployment Recommendation

| Component | Recommendation |
| --- | --- |
| Lumixia frontend | Can remain on Vercel, Cloudflare Pages, or another static frontend platform. |
| Supabase | Remains auth, database, RLS, billing metadata, and Edge Function orchestration. |
| `dremo-api` | Remains API/orchestrator for now: auth, ownership, events, approvals, artifacts, and coordination. |
| Real sandbox execution | Should live in a separate backend/sandbox service or managed sandbox provider. |
| Vercel/Supabase Edge Functions | Not appropriate as the real sandbox runtime because request runtimes are not designed for arbitrary untrusted code execution, strict per-task isolation, long-lived workspaces, or strong egress/filesystem controls. |

## 10. Open Decisions

| Decision | Current position |
| --- | --- |
| E2B vs Daytona vs self-hosted worker | Open. Evaluate E2B and Daytona first, then compare custom workers if needed. |
| Local Docker prototype scope | Partially resolved. `docker --version`, readiness-only `docker version --format "{{json .}}"`, the exact PR #26/PR #28 non-root `alpine:3.20 echo hello` no-network/no-mount smoke command with static name/labels, the PR #29 exact cleanup command, the PR #30 lifecycle composition, the PR #31 report formatting utilities, the PR #32 local-dev CLI report wrapper, and the PR #33 fixture-only golden checks are allowed only under reviewed local-dev configs. Arbitrary container execution, socket access, mounts, image pull/build, network, workspace access, arbitrary cleanup, arbitrary names/labels, browser integration, and repo execution remain open and require separate security-reviewed PRs. |
| GitHub repo connect vs zip upload first | Open. GitHub connect is likely first, but credential handling must be designed. |
| Network egress default deny vs allowlist | Proposed default deny. Provider enforcement details remain open. |
| Artifact storage provider | Open. Supabase Storage is the first candidate, but signed URLs and quotas need design. |
| Pricing/credit model | Open. Keep backend-owned reservation/charge/release as a hard requirement. |
| Abuse monitoring | Open. Needs metrics for CPU, timeout, network attempts, blocked commands, and suspicious output. |
| Retention policy | Open. Define retention tiers for logs, artifacts, sandboxes, and quarantined evidence. |
| Private repo credentials | Open. Use scoped OAuth, short-lived tokens, and never expose tokens to the sandbox unless task-scoped and necessary. |

## 11. Next PR Recommendation

PR #13 recommendation has been fulfilled as an interface-only contract, PR #14 adds pure policy validation, PR #15 adds a smoke UI, PR #16 adds the local-dev adapter skeleton without execution, PR #17 adds the Docker execution security checklist, PR #23 adds only the `docker --version` probe, PR #24 adds readiness classification only, PR #25 adds container design gates, PR #26 adds one exact no-network/no-mount container smoke command after explicit review, PR #27 adds audit normalization plus cleanup-risk metadata, PR #28 adds deterministic naming plus cleanup planning, PR #29 adds exact cleanup execution, PR #30 adds lifecycle orchestration without expanding command capability, PR #31 adds sanitized lifecycle report formatting, PR #32 adds a local-dev CLI report wrapper, and PR #33 adds golden report checks without expanding execution.

The next PR should remain conservative:

| Scope | Recommendation |
| --- | --- |
| Policy validation | Already added as pure helper functions; keep extending with tests/fixtures before execution. |
| Tests | Add unit tests only if the repo adopts a test setup deliberately; otherwise keep relying on typecheck/build and documented examples. |
| Execution | Do not expand beyond the exact smoke command yet. No arbitrary command execution, repo execution, package install, network, mounts, image pull/build, or workspace access. |
| Cleanup | Exact cleanup execution now exists for `docker rm -f lumixia-dremo-smoke-echo`; PR #30 orchestrates when it runs, PR #31 reports it safely, PR #32 exposes reports through local-dev CLI scripts, and PR #33 locks fixture output with golden checks, so next work should stay telemetry/reporting focused rather than broaden cleanup targets. |
| Events | Keep event mapping pure; do not write DB rows from the runner module. |
| Security | Keep service role out of runner payloads and continue documenting credential handoff boundaries. |
