# Dremo Docker Execution Security Checklist

Status: required pre-execution gate.

This checklist must be completed before any PR enables real local-dev Docker execution for Dremo Code.

## 1. Decision Status

| Area | Status |
| --- | --- |
| Current Docker adapter | `DockerLocalDevSandboxRunner` is skeleton-only. It validates policy and returns blocked results with `noExecution: true`. |
| Real local-dev execution | Still not implemented in the browser bundle. PR #18 adds explicit local-dev gates and command classification, but Docker invocation remains deferred to a separate Node/worker process. |
| Production execution | Out of scope. Production must use a managed isolated sandbox provider or dedicated worker pool after evaluation. |
| Supabase Edge Functions | Remain orchestration/API only. They must not become arbitrary code execution runtimes. |
| Code Architect AI rename | Still blocked until execution, events, sandboxing, and credits are server-owned and production-ready. |

No PR may enable Docker execution until every required blocker, gate, and review item below has an owner and a passing verification result.

PR #18 implementation status:

| Gate | Status |
| --- | --- |
| Feature flag disabled by default | Implemented in static local-dev config. |
| `allowRealExecution` false by default | Implemented in static local-dev config. |
| Explicit local-dev environment name | Implemented as `environmentName = "local-dev"`. |
| Tiny version/identity allowlist | Implemented as static `allowedVersionCommands`. |
| Network/file writes/package install/git clone/shell chaining denied | Implemented as static config gates and pure command guards. |
| Docker socket/home mount disabled | Implemented as static config gates. |
| Real Docker invocation | Deferred. The current Vite/React `src/` tree is browser-bundled, so process execution APIs must not be added there. |

## 2. Threat Model

| Threat | Why it matters | Required control |
| --- | --- | --- |
| Host filesystem escape | A container misconfiguration can expose developer files, SSH keys, cloud credentials, or project secrets. | Task-scoped temporary workspace only; no home directory mounts; no broad read-write repo mount. |
| Docker socket exposure | Mounting `/var/run/docker.sock` lets code control the host Docker daemon. | Absolute blocker; never mount Docker socket into a sandbox. |
| Secret leakage | Host env, `.env`, Supabase service role keys, Stripe keys, model keys, or GitHub tokens could leak to command output or artifacts. | Empty env by default, explicit allowlist only, redaction before storage/display. |
| Network abuse | Untrusted code can exfiltrate data, scan internal networks, download malware, or run bot traffic. | Default deny network; later allowlist only with logged policy decisions. |
| Dependency install abuse | `npm install`, `pip install`, and similar commands can run lifecycle scripts or fetch untrusted packages. | Deny by default or require approval and strict egress policy in later PRs. |
| Long-running or fork bomb commands | Untrusted commands can consume CPU, memory, process slots, or disk. | Hard wall-clock timeout, CPU/memory/process caps, kill and cleanup policy. |
| Resource exhaustion | Large stdout/stderr, artifacts, dependency caches, or generated files can exhaust disk/memory and degrade UX. | Output caps, artifact caps, disk quotas, truncation, cleanup sweeper. |
| Malicious stdout/stderr payloads | Terminal output can contain escape sequences, huge lines, prompt injection, or secrets. | Treat output as untrusted, escape in UI, bound size, redact sensitive patterns. |
| Prompt injection through repo files | Repo content may instruct the model or agent to ignore policy, leak secrets, or modify unsafe files. | Treat repo files as data; policy and approvals remain server-owned. |
| Artifact exfiltration | Generated archives, logs, or reports can accidentally include secrets or private files. | Artifact allowlist, redaction, size caps, signed access, quarantine on suspicion. |
| Cross-user data leakage | A reused workspace or stale sandbox can expose another user's task data. | One sandbox per task, task-scoped paths, cleanup, no shared writable volumes. |
| Running untrusted code on developer machine | Local/dev Docker is still running untrusted code near a real developer environment. | Explicit local-only opt-in, default disabled, narrow first commands, manual review. |

## 3. Absolute Blockers

Any one of these blocks real execution:

| Blocker | Required state |
| --- | --- |
| Docker socket mounted into sandbox | Must be absent. |
| Host home directory mounted | Must be absent. |
| Project root mounted read-write without explicit scope | Must be absent. |
| Service role key or production secrets available to sandbox | Must be absent. |
| Network egress unrestricted | Must be absent. |
| No wall-clock timeout | Must be fixed before execution. |
| No memory/CPU cap | Must be fixed before execution. |
| No stdout/stderr cap | Must be fixed before execution. |
| No cleanup policy | Must be fixed before execution. |
| No command policy validation | Must be fixed before execution. |
| No approval integration for risky commands | Must be fixed before execution. |
| No audit event emission | Must be fixed before execution. |
| No manual developer opt-in | Must be fixed before execution. |

## 4. Minimum Local-dev Execution Gate

Before even local-dev Docker execution is allowed, all gates below must pass.

| Gate | Requirement |
| --- | --- |
| Feature flag | Enabled only by explicit developer action. Default remains disabled. |
| `allowRealExecution` | May be true only in local-dev config after separate review. Default remains false. |
| Environment | Must prove non-production local-dev context. |
| Sandbox state | Task must have `sandbox_ready` or equivalent local-dev ready state. |
| Policy validation | `validateSandboxCommandRequest(...)` must run before execution. |
| Approval | Medium/high/critical commands require a scoped approval id. |
| Command allowlist | Command must be in a tiny first allowlist. |
| Secrets | No production secrets, service role keys, model keys, Stripe keys, or GitHub tokens injected. |
| Workspace | Temporary task-scoped workspace path only. |
| Network | Default deny or strict allowlist with logged decisions. |
| Resource limits | CPU, memory, wall-clock, stdout, stderr, artifact, and disk caps applied. |
| Cleanup | Sandbox/session/workspace cleanup after completion, failure, or cancellation. |

## 5. First Allowed Command Set

The first local-dev prototype should allow only version and identity commands that do not require network, file writes, package scripts, or shell chaining.

| Command | Reason |
| --- | --- |
| `echo` | Harmless output path validation. |
| `pwd` | Confirms working directory boundary. |
| `node --version` | Confirms runtime image availability. |
| `npm --version` | Confirms package manager binary without installing packages. |
| `python --version` | Confirms Python binary when present. |
| `git --version` | Confirms Git binary without network or repository mutation. |

Explicitly not allowed in the first execution PR:

| Not allowed | Reason |
| --- | --- |
| `npm install` | Can run lifecycle scripts and use network. |
| `pip install` | Can run setup code and use network. |
| `curl` / `wget` | Network exfiltration/download risk. |
| `git clone` | Network, credential, and workspace ingestion risk. |
| File writes | Requires a separate workspace output policy. |
| Shell chaining | Makes policy validation and audit harder. |
| Arbitrary `bash`, `sh`, `powershell`, or `cmd.exe` | Opens broad command execution surface. |

## 6. Denied Command Policy

The following commands or patterns must be denied by default:

| Pattern | Reason |
| --- | --- |
| `rm -rf` | Destructive recursive deletion. |
| `chmod -R` | Permission changes can weaken isolation. |
| `chown -R` | Ownership changes can interfere with cleanup and isolation. |
| `dd` | Disk overwrite and resource exhaustion risk. |
| `mkfs` | Filesystem destructive operation. |
| `shutdown` / `reboot` | Host or sandbox disruption. |
| `curl | sh` | Remote arbitrary code execution pattern. |
| `wget | sh` | Remote arbitrary code execution pattern. |
| `docker` | Nested Docker or host daemon access risk. |
| `sudo` | Privilege escalation. |
| `ssh` / `scp` | Credential and network exfiltration risk. |
| `powershell` / `cmd.exe` | Broad shell execution surface. |
| Package manager installs | Denied by default until network, scripts, approvals, and caches are controlled. |

## 7. Workspace Mount Policy

| Policy | Requirement |
| --- | --- |
| Task directory | Use a temporary task-scoped directory only. |
| User home | Never mount user home. |
| Repo root | Never mount repo root read-write by default. |
| Read-only first | Start read-only where possible. |
| Writes | In later PRs, writes go only to a task output directory. |
| Secrets | Exclude `.env`, `.env.*`, `secrets/**`, SSH keys, cloud config, tokens, and credential stores. |
| Parent paths | Deny parent traversal and absolute host paths. |
| Cleanup | Delete temporary workspace after session unless quarantined for security review. |

## 8. Network Policy

| Policy | Requirement |
| --- | --- |
| First prototype | Default deny. No internet access required for version commands. |
| Later network access | Allowlist only after separate review. |
| Metadata endpoints | Block cloud metadata endpoints and link-local metadata addresses. |
| Private network ranges | Block private networks unless explicitly needed and reviewed. |
| Package registries | Future allowlist must be explicit per registry and command class. |
| Audit | Log all network policy decisions without storing secrets. |

## 9. Event and Audit Requirements

Every future execution must emit server-owned events. The browser must only render these events.

| Event | Required when |
| --- | --- |
| `tool_call_started` | A sandbox begins a policy-approved command. |
| `tool_call_output` | Bounded stdout/stderr chunk is retained. |
| `tool_call_completed` | Command exits successfully or with nonzero exit code. |
| `tool_call_failed` | Runner/provider fails before normal command completion. |
| `tool_call_blocked` | Policy, approval, feature flag, or sandbox state blocks execution. |
| `verification_started` | A verification command begins. |
| `verification_result` | Verification result is available. |
| `artifact_created` | Any output artifact is retained. |

Each event must include:

| Field | Requirement |
| --- | --- |
| `taskId` | Required. |
| Command summary | Redacted and bounded. No raw secrets. |
| Policy decision | Include allow/deny/requires approval and reason code. |
| Approval id | Required when approval is used. |
| Sandbox session id | Required for traceability. |
| Output | Bounded, escaped, and redacted. |
| Secrets | Must not be included. |

## 10. Manual Review Checklist

The future PR that enables Docker execution must include evidence for every item:

| Check | Required evidence |
| --- | --- |
| Search for process APIs | Confirm any `Deno.Command`, `child_process`, `spawn`, `exec`, `shelljs`, or `execa` use is isolated to the reviewed adapter path. |
| Feature flag default | Confirm execution flag defaults disabled. |
| Production environment | Confirm execution cannot run in production by default. |
| Service role | Confirm service role key never enters sandbox environment, command args, files, logs, or artifacts. |
| Docker socket | Confirm Docker socket is not mounted. |
| Policy validation | Confirm validation runs before execution. |
| Approval enforcement | Confirm medium/high/critical commands require approval before execution. |
| Timeout/resource caps | Confirm CPU, memory, wall-clock, stdout, stderr, disk, and artifact caps. |
| Output redaction | Confirm redaction and escaping before storage/display. |
| Cleanup | Confirm container/session/workspace cleanup and stale session sweeper. |
| Smoke tests | Confirm allowed version commands work and denied commands remain blocked. |
| Rollback | Confirm feature flag can disable execution immediately. |

## 11. Rollback Plan

If local-dev Docker execution behaves unexpectedly:

| Step | Action |
| --- | --- |
| 1 | Disable the local-dev execution feature flag. |
| 2 | Stop any local sandbox sessions. |
| 3 | Revert the execution-enabling adapter PR if needed. |
| 4 | Keep the Dremo Lab stub path working so task/event UI remains testable. |
| 5 | Preserve task/event history for debugging and audit. |
| 6 | Quarantine artifacts/logs if secret exposure is suspected. |

## 12. Next PR Recommendation

Recommended next PR: **Add separate local-dev Docker worker prototype behind disabled feature flag**.

That PR should remain conservative:

| Scope | Requirement |
| --- | --- |
| Commands | Only version/identity commands: `echo`, `pwd`, `node --version`, `npm --version`, `python --version`, `git --version`. |
| Shell | No shell chaining and no arbitrary shell. |
| Filesystem | No file writes. Temporary task-scoped workspace only. |
| Network | No network. |
| Environment | Explicit local-dev only. No production secrets. |
| Review | Manual security review required before merge. |
| Rollback | Feature flag can disable execution immediately. |
