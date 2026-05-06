# Proposed Sandbox Security Requirements

Status: proposed.

Dremo Code must execute untrusted or semi-trusted code safely. Repo contents, generated code, terminal output, package scripts, and model output must all be treated as untrusted.

Provider decision note: see [sandbox-provider-decision.md](./sandbox-provider-decision.md). The proposed direction is Docker local/dev only for the first prototype, E2B or Daytona evaluation before hosted production, and a managed isolated sandbox provider or dedicated sandbox worker pool for production. Supabase Edge Functions and Vercel Functions remain API/orchestration runtimes, not arbitrary code execution runtimes.

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
