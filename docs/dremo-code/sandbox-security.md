# Proposed Sandbox Security Requirements

Status: proposed.

Dremo Code must execute untrusted or semi-trusted code safely. Repo contents, generated code, terminal output, package scripts, and model output must all be treated as untrusted.

Provider decision note: see [sandbox-provider-decision.md](./sandbox-provider-decision.md). The proposed direction is Docker local/dev only for the first prototype, E2B or Daytona evaluation before hosted production, and a managed isolated sandbox provider or dedicated sandbox worker pool for production. Supabase Edge Functions and Vercel Functions remain API/orchestration runtimes, not arbitrary code execution runtimes.

Runner interface note: PR #13 adds `src/features/dremo-code/sandbox/` with TypeScript interfaces, static default policy, pure event mapping helpers, and a noop runner that blocks every command. This is not a real runtime and must not be treated as Docker/E2B/Daytona integration.

Policy validation note: PR #14 adds pure TypeScript policy validation helpers for command requests, paths, environment variables, resource requests, and output limits. These helpers do not execute commands, read files, read environment variables, call networks, or provide sandbox isolation by themselves.

Smoke UI note: the internal `/dashboard/dremo-lab` route exposes those policy validation helpers for manual developer checks. This browser UI is local-only validation; it does not write Dremo events, call `dremo-api`, access the filesystem, use the network, or execute commands.

Local-dev adapter skeleton note: PR #16 adds `DockerLocalDevSandboxRunner` and static local-dev config. The adapter reports `provider = "docker-local-dev"` and calls policy validation, but every command request remains blocked with `noExecution: true`. It does not call Docker, execute commands, read or write files, clone repositories, call models, or change billing.

Docker execution checklist note: [docker-execution-security-checklist.md](./docker-execution-security-checklist.md) is a required gate before any PR enables real local-dev Docker execution. It defines threat model coverage, absolute blockers, command policy, mount policy, network policy, event/audit requirements, manual review, and rollback.

Docker probe note: PR #23 allows only `docker --version` inside the local-dev worker boundary, under a Docker-specific reviewed config and exact trusted review scope. It does not run containers, query Docker daemon state with `docker version` or `docker info`, mount Docker socket, mount the user home directory, use networks, write files, or expose execution through `src/`, Dremo Lab, production UI, Supabase functions, SQL, billing, or TerminalWorkspace.

Docker readiness note: PR #24 adds Docker daemon readiness classification only. It may run the exact local-dev command `docker version --format "{{json .}}"` to classify CLI/daemon availability, but it does not start containers, pull or build images, inspect runtime objects, mount Docker socket, mount home directories, use network commands, write files, or expose execution through browser/production paths.

Container design-gate note: PR #25 adds policy models for future local-dev container execution: image allowlists, command allowlists, no-network/no-mount policies, resource limits, security policy, plan-only Docker run preview, and self-check fixtures. It still does not execute `docker run`, start containers, pull/build images, mount workspaces, enable network, write files, or expose execution through browser/production paths.

Container smoke note: PR #26 adds the first reviewed local-dev container smoke execution path inside `tools/local-dev-worker` only. After PR #28, it may execute exactly `docker run --rm --name lumixia-dremo-smoke-echo --label lumixia.dremo.local-dev=true --label lumixia.dremo.kind=container-smoke --label lumixia.dremo.capability=capability.docker.container.smoke.echo --label lumixia.dremo.cleanup=review-required --network none --pull=never --read-only --cap-drop ALL --security-opt no-new-privileges --memory 128m --cpus 0.5 --pids-limit 64 --user 65534:65534 alpine:3.20 echo hello`. It does not allow arbitrary images, names, labels, or commands, image pull/build, compose, exec/cp/login, mounts, Docker socket, home/workspace access, network, shell, root user, host environment, secrets, browser imports, production UI, Supabase functions, SQL, billing, or TerminalWorkspace.

Smoke audit note: PR #27 adds audit normalization for that exact smoke path. It classifies outcomes, sanitizes stdout/stderr previews, redacts obvious secret-looking values and home paths, enforces audit byte caps, and records cleanup-risk metadata. It does not add cleanup command execution or any new Docker capability.

Cleanup planning note: PR #28 adds deterministic smoke container naming, static allowlisted labels, and a plan-only cleanup preview for `docker rm -f lumixia-dremo-smoke-echo`. It does not execute cleanup commands, run `docker ps`, inspect containers, prune, stop/kill, or add arbitrary cleanup targets.

Cleanup execution note: PR #29 adds the first reviewed local-dev cleanup execution path. It may execute only `docker rm -f lumixia-dremo-smoke-echo` under cleanup-specific trusted review. Target-not-found, Docker CLI unavailable, and daemon unavailable are structured outcomes. It does not allow arbitrary cleanup targets, container IDs, wildcards, multiple targets, `docker ps`, `docker inspect`, `docker stop`, `docker kill`, prune, or any browser/production path.

Lifecycle orchestration note: PR #30 composes the already-reviewed local-dev readiness classifier, exact smoke execution, audit normalization, and exact cleanup execution. It adds no new Docker command capability and no new process API file; lifecycle self-checks use fake adapter injection so they do not require Docker Desktop, a local image, or an existing container.

Lifecycle reporting note: PR #31 adds sanitized report formatting for existing lifecycle results. It creates Markdown and deterministic JSON summaries for future CLI/UI/audit display, re-sanitizes stdout/stderr previews, maps outcomes to stable next actions, and does not add execution, cleanup, browser integration, production UI, Supabase, SQL, or billing behavior.

Lifecycle CLI note: PR #32 adds a local-dev-only CLI wrapper under `tools/local-dev-worker` for the existing lifecycle report. It can print Markdown or JSON summaries and includes a deterministic fixture mode that does not call Docker. The CLI accepts no user-provided command, image, container name, label, cleanup target, workspace path, environment, or secret, and it is not imported by `src/` or exposed through browser/production UI.

Golden report note: PR #33 adds committed Markdown and JSON golden checks for the deterministic lifecycle dry-report fixture. The checker imports fixture functions directly, validates no secret/home/.env markers, and does not execute Docker, cleanup, npm scripts, or any process adapter.

## Sandbox Lifecycle Model

The proposed lifecycle uses these statuses:

| Status | Meaning |
| --- | --- |
| `not_requested` | No sandbox lifecycle has been requested for the task. |
| `requested` | The backend accepted a sandbox lifecycle request. |
| `starting` | The backend is preparing a sandbox provider session. |
| `ready` | The sandbox can accept controlled work. |
| `stopping` | The backend is stopping the sandbox session. |
| `stopped` | The sandbox session is closed and should not accept work. |
| `failed` | The sandbox lifecycle failed and requires recovery or manual review. |

Current implementation note: `dremo-api` exposes a stub-only lifecycle for contract testing. It writes `provider = "stub"` records and server-owned events, but it does not create Docker/E2B/Daytona resources, execute commands, mount files, use network egress, inject secrets, or call models.

## Core Requirements

| Requirement | Policy |
| --- | --- |
| One sandbox per task | Each billable task gets an isolated sandbox session. |
| No production secrets | Production Supabase, Stripe, model, and deployment secrets must never enter the sandbox. |
| Least-privilege workspace | Sandbox receives only the repo/files needed for the task. |
| CPU limits | Per-task CPU limits must be enforced. |
| Memory limits | Per-task memory limits must be enforced. |
| Time limits | Sandbox and command execution must have hard timeouts. |
| Disk limits | Workspace and artifact size must be capped. |
| Network controls | Default egress should be denied or restricted by task policy. |
| Secret redaction | Logs and artifacts must be scanned/redacted before persistence and display. |
| Command approvals | Risky commands require approval or policy allowlist. |
| File allow/deny | Sensitive paths and generated binary blobs require rules. |
| Cleanup | Sandbox must be destroyed or quarantined after task completion/failure. |
| Audit | Sandbox lifecycle and privileged actions must emit events. |

## Command Risk Classes

| Class | Examples | Default Policy |
| --- | --- | --- |
| Safe read | `ls`, `git status`, `npm test -- --help` | Allow in sandbox. |
| Safe local check | `npm run typecheck`, `npm test` | Allow with timeout. |
| Dependency install | `npm install`, `pip install` | Allow only with network policy and timeout. |
| File write | Generated patches, formatting | Allow inside workspace, deny outside workspace. |
| Network egress | Downloads, API calls, web requests | Require allowlist or approval. |
| Destructive command | `rm -rf`, force reset, credential deletion | Require strict policy or deny. |
| External publication | Git push, PR creation, deployment | Require explicit user approval. |

## Approval Before Execution

No future Dremo tool should execute directly from a browser request. Every tool request must pass through the server-owned permission layer before a sandbox runner can act.

Current implementation note: `dremo-api` includes a command approval stub. Low-risk tool requests emit `tool_call_requested` and `tool_call_stubbed`; medium, high, and critical requests create a pending `dremo_approvals` row and emit `tool_approval_required`. Approving a request only records `tool_approval_approved`; it does not execute the command yet.

Repo scan stub note: the current `POST /tasks/:taskId/repo-scan` route is metadata-only. It appends `repo_scan_started` and `repo_scan_completed` events but does not run shell commands, read files, clone repositories, access the network, call models, or change billing. A future real scanner must run inside the sandbox policy layer and preserve this no-browser-trusted-write rule.

Final report stub note: the current `POST /tasks/:taskId/report/finalize` route creates database artifact metadata only. It derives a bounded report from the task row and server-owned events, appends `final_report_created` and `artifact_created`, and does not create storage files, execute commands, read repo files, call models, or change billing.

| Tool category | Example | Stub policy |
| --- | --- | --- |
| `bash_command` | `npm test` | Approval required unless explicitly low-risk and stubbed. |
| `file_write` | Update a source file | Approval required before future write. |
| `network_request` | Fetch external URL | Approval and egress policy required. |
| `package_install` | `npm install` | Approval required with timeout and network controls. |
| `git_operation` | Commit, push, PR | Explicit approval required. |

## Policy Validation Before Execution

Policy validation is required before a future sandbox runner starts any real command. Validation is a gate, not the sandbox itself: a command that passes validation must still run only inside an isolated provider sandbox with runtime CPU, memory, filesystem, network, timeout, and cleanup controls.

Current implementation note: `src/features/dremo-code/sandbox/policyValidation.ts` exports pure helpers only. `DremoNoopSandboxRunner.requestCommand()` calls `validateSandboxCommandRequest(...)` and returns a blocked result with `noExecution: true` for every request.

| Validation area | Current policy |
| --- | --- |
| Command allowlist | Only commands explicitly listed in policy can pass validation. |
| Command denylist | Denied patterns and destructive commands always block. |
| Shell metacharacters | `;`, `&&`, `||`, pipes, redirects, backticks, and `$()` are denied by default. |
| Approval-required commands | Package install commands such as `npm install`, `pnpm add`, `pip install`, `poetry add`, `cargo add`, and `go get` require scoped approval. |
| Path policy | Workspace-relative paths are preferred; traversal, absolute host paths, secret paths, `.env*`, `secrets/**`, `~/.ssh/**`, `/etc/**`, and `/var/run/docker.sock` are denied. |
| Environment policy | Environment variables must be explicit; sensitive keys such as `*_KEY`, `*_SECRET`, `*_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GITHUB_TOKEN` are denied. |
| Resource caps | Requested CPU, memory, wall-clock timeout, stdout, stderr, and artifact caps must not exceed policy maximums. |
| Output caps | Output byte counts must be finite, non-negative, and within policy limits. |

## Local-dev Adapter Skeleton

The Docker local-dev adapter skeleton is an adapter boundary, not a sandbox runtime. It exists to keep future Docker work behind explicit provider selection, static config, policy validation, and code review.

| Area | Current PR #16 behavior |
| --- | --- |
| Provider | Reports `docker-local-dev` only as an adapter identity. |
| Config | Static TypeScript config; disabled by default; no environment variable reads. |
| Session lifecycle | Creates and stores in-memory stub session records only. |
| Command handling | Calls `validateSandboxCommandRequest(...)`, then always returns `status = "blocked"` and `noExecution = true`. |
| Runtime execution | Not implemented. No Docker CLI, process execution API, filesystem access, network calls, repo clone, model calls, or billing changes. |
| Future requirement | Any real Docker execution requires a separate PR, manual security review, explicit developer opt-in, and proof that policy validation is enforced before runtime execution. |

Before that separate execution PR can merge, it must satisfy the Docker execution security checklist. The initial execution surface should be limited to version/identity commands, no shell chaining, no file writes, no network, explicit local-dev only, and immediate rollback through a disabled-by-default feature flag.

PR #18 note: the local-dev Docker adapter now has explicit config gates and pure command guards for the version/identity allowlist, shell chaining, package installs, network commands, file writes, Docker/system commands, Docker socket mounts, and home mounts. It still does not invoke Docker because the adapter lives in browser-bundled `src/`; real execution must move to a separate local-dev Node/worker process.

PR #19 note: `tools/local-dev-worker/` creates that local-dev worker boundary outside the browser bundle. It includes a worker-specific contract, pure guards, a blocked/dry-run runner, and a safety scan that prevents process/Docker APIs from entering `src/features/dremo-code/sandbox`. Real Docker execution is still not implemented.

PR #20 note: the local-dev worker boundary now has a dry-run adapter, dependency-free request validation, deterministic trace/audit metadata, accepted/rejected fixtures, an executable TypeScript self-check harness, npm verification scripts, and an expanded boundary scan that checks `src/` does not import worker implementation files. The worker remains dry-run only and every response preserves `noExecution: true`.

PR #21 note: the worker boundary now has a disabled-by-default execution capability manifest, a pure manual review gate, and a readiness evaluator. This models the final review layer before a future execution PR, but it still does not invoke Docker, spawn processes, read secrets, call networks, write files, or expose execution through the browser.

PR #22 note: the first real local-dev process execution path exists only in `tools/local-dev-worker/localDevWorkerVersionExecutionAdapter.ts`. It is disabled by default, requires trusted local manual review metadata, uses `shell: false`, passes an empty environment, bounds timeout/stdout/stderr, and only allows reviewed non-Docker version/identity commands. Docker CLI execution remains blocked.

PR #23 through PR #33 progressively add Docker-specific local-dev probes, one exact container smoke path, smoke audit normalization, cleanup planning, one exact cleanup path, lifecycle orchestration, lifecycle report formatting, a local-dev CLI report wrapper, and fixture-only golden checks. `docker --version` and readiness classification are separate reviewed configs, while the container smoke adapter allows only static identity metadata plus `alpine:3.20 echo hello` with `--name lumixia-dremo-smoke-echo`, allowlisted `lumixia.dremo.*` labels, `--pull=never`, `--user 65534:65534`, no network, no mounts, no shell, no root user, no host env, bounded output, and audit-safe summaries.

## Current Execution Status After PR #33

| Area | Status |
| --- | --- |
| Browser sandbox | Policy validation only; no worker import and no execution. |
| Worker boundary | Reviewed local-dev adapters exist only under `tools/local-dev-worker`; default config blocks execution. |
| Review gates | Capability and manual-review readiness are enforced before execution. |
| Docker | Version probe, daemon readiness classification, and one exact no-network/no-mount smoke command are the only reviewed Docker paths. Arbitrary Docker runtime commands remain denied. |
| Container smoke | Exact static-name/static-label `docker run` for `alpine:3.20 echo hello` only. |
| Smoke audit | Output previews are sanitized and result outcomes/cleanup risk are normalized. |
| Cleanup | Exact `docker rm -f lumixia-dremo-smoke-echo` may execute under reviewed local-dev cleanup config only. No arbitrary cleanup, listing, inspect, stop/kill, or prune exists. |
| Lifecycle | Worker can orchestrate readiness -> exact smoke -> audit -> exact cleanup using existing adapters only. It does not add commands, Docker flags, process APIs, network, mounts, or a browser/production path. |
| Lifecycle reports | Existing lifecycle results can be formatted as sanitized Markdown or deterministic JSON summaries for future local tooling only. |
| Lifecycle CLI | Local-dev-only CLI wrapper can print those reports. Fixture mode is deterministic and does not call Docker; real mode uses the existing reviewed lifecycle only. |
| Golden reports | Fixture-only golden checks protect report format stability without Docker, cleanup, browser, or production execution. |
| Network | Disabled for container smoke with `--network none`; no network command surface. |
| File writes | No worker runtime writes. |
| Secrets | Not read, injected, logged, or traced. |
| Production UI | No path to worker execution. |

## File Policy

| Path class | Policy |
| --- | --- |
| Workspace files | Read/write according to task plan. |
| `.env*` | Do not expose to model by default; redact from logs. |
| Secret files | Deny or require explicit secure injection mechanism. |
| Build outputs | Allow creation but cap artifact size. |
| Parent directories | Deny read/write outside mounted workspace. |
| System files | Deny by sandbox isolation. |

## Artifact Limits

| Artifact | Suggested Initial Limit |
| --- | --- |
| Terminal event payload | 16 KB per event after truncation. |
| Full terminal log artifact | 5 MB per task unless upgraded. |
| Patch artifact | 2 MB for inline display, larger as download only. |
| Screenshot artifact | 10 MB per task. |
| Workspace archive | Disabled by default. |

## Abuse Prevention

| Risk | Control |
| --- | --- |
| Crypto mining or long-running loops | CPU/time limits and kill switch. |
| Data exfiltration | Network egress policy and secret redaction. |
| Malware generation | Tool policy, content policy, and provider safety layers. |
| Prompt injection from repo | Treat repo content as data, not instructions. |
| Billing abuse | Backend-owned credit reservation and spend caps. |
| Sandbox escape attempts | Provider isolation, patched images, no host mounts beyond workspace. |

## Logging and Audit

Every sandbox should emit events for:

| Event | Reason |
| --- | --- |
| Sandbox created | Trace resource ownership. |
| Sandbox ready | Mark execution readiness. |
| Command started | Audit privileged action. |
| Command output | User-visible progress and debugging. |
| Command completed | Capture exit status and duration. |
| File changed | Support diff review. |
| Sandbox destroyed | Confirm cleanup. |
| Sandbox quarantined | Preserve evidence after suspicious behavior. |

## Possible Sandbox Backends

No permanent production provider is chosen yet. The current decision record narrows the path: Docker is acceptable for local/dev prototype work only; E2B and Daytona should be evaluated before production; Fly Machines, Cloud Run, Kubernetes, or other worker models remain fallback options if Dremo needs more operational control.

| Backend | Strengths | Risks / Tradeoffs |
| --- | --- | --- |
| Docker for local/dev | Easy developer loop, cheap, familiar. | Not enough by itself for multi-tenant production unless heavily isolated. |
| E2B | Built for AI agent sandboxes and quick prototypes. | Provider dependency and pricing need review. |
| Daytona | Developer environment model may fit repo tasks. | Operational fit and isolation details need validation. |
| Fly Machines | Fast microVM-like app isolation and global regions. | More custom orchestration work. |
| Cloud Run | Managed containers, IAM, logs, scale-to-zero. | Interactive streaming and workspace persistence need design. |
| Kubernetes | Maximum control and extensibility. | Highest operational complexity. |

## Decision Criteria

| Criterion | Question |
| --- | --- |
| Isolation strength | Can it safely run untrusted code for multiple users? |
| Startup latency | Can it feel responsive for premium UX? |
| Streaming support | Can terminal/events stream reliably? |
| Workspace persistence | Can it preserve enough state for review and repair? |
| Cost controls | Can we cap task spend predictably? |
| Observability | Can we audit commands, resources, failures, and cleanup? |
| Secret handling | Can it inject temporary scoped secrets safely when needed? |
| Cleanup guarantees | Can stale sandboxes be terminated and purged reliably? |
