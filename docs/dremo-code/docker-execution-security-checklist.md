# Dremo Docker Execution Security Checklist

Status: required pre-execution gate.

This checklist must be completed before any PR enables or expands real local-dev Docker execution for Dremo Code.

## 1. Decision Status

| Area | Status |
| --- | --- |
| Current Docker adapter | Browser-bundled `DockerLocalDevSandboxRunner` remains skeleton-only. It validates policy and returns blocked results with `noExecution: true`. |
| Real local-dev execution | Implemented only in the out-of-bundle `tools/local-dev-worker` boundary for reviewed version/identity probes and the PR #26 exact container smoke command. It is not in the browser bundle. |
| Production execution | Out of scope. Production must use a managed isolated sandbox provider or dedicated worker pool after evaluation. |
| Supabase Edge Functions | Remain orchestration/API only. They must not become arbitrary code execution runtimes. |
| Code Architect AI rename | Still blocked until execution, events, sandboxing, and credits are server-owned and production-ready. |

No PR may expand Docker execution until every required blocker, gate, and review item below has an owner and a passing verification result.

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

PR #19 implementation status:

| Gate | Status |
| --- | --- |
| Worker boundary outside browser bundle | Implemented under `tools/local-dev-worker/`. |
| Worker request/response contract | Implemented as local-dev-specific types with `noExecution: true`. |
| Worker command guards | Implemented as pure TypeScript logic. |
| Worker runner | Implemented as blocked/dry-run only; no command execution. |
| Browser source safety scan | Implemented as `node tools/local-dev-worker/localDevWorkerSafetyScan.mjs`. |
| Real Docker invocation | Still deferred to a future reviewed local-dev worker PR. |

PR #20 implementation status:

| Gate | Status |
| --- | --- |
| Dry-run adapter | Implemented under `tools/local-dev-worker/localDevWorkerDryRunAdapter.ts`; always preserves `noExecution: true`. |
| Request validation | Implemented without new dependencies; validates shape, bounded strings, args, source, environment, and harness identity. |
| Trace/audit metadata | Implemented with deterministic dry-run trace metadata and explicit safety flags. |
| Fixture coverage | Added accepted-by-classification and rejected command fixtures. Accepted fixtures still expect `noExecution: true`. |
| Self-check harness | Added TypeScript fixture self-check helper and zero-dependency Node runner; no commands are executed. |
| Package verification scripts | Added `dremo:worker:typecheck`, `dremo:worker:safety`, and `dremo:worker:verify`. |
| Boundary scan | Expanded to fail if `src/` imports or references the local-dev worker implementation. |
| Real Docker invocation | Still not implemented. |

PR #21 implementation status:

| Gate | Status |
| --- | --- |
| Capability manifest | Added disabled-by-default future execution capabilities for version, identity, and metadata commands. |
| Manual review gate | Added pure TypeScript gate requiring `allowRealExecution`, completed review metadata, exact capability scope, local-dev source/environment, no production UI path, and no browser import path. |
| Readiness evaluator | Added combined validation, guard, manifest, review, safety metadata, warning, and rejection output. |
| Readiness fixtures | Added self-check coverage for eligible disabled defaults, missing review, theoretical reviewed eligibility, and unsafe commands. |
| `noExecution` | Preserved on every readiness path. |
| Real Docker invocation | Still not implemented. |

PR #22 implementation status:

| Gate | Status |
| --- | --- |
| First process execution path | Implemented only in `tools/local-dev-worker/localDevWorkerVersionExecutionAdapter.ts`. |
| Default execution | Disabled by default through `allowRealExecution: false`. |
| Manual review | Trusted local review helper is required; browser/user review payloads are not trusted. |
| Allowed commands | Reviewed non-Docker version/identity commands only: `node --version`, `npm --version`, `pnpm --version`, `python --version`, `git --version`, `pwd`, and `echo`. |
| Shell | `shell: false`; no shell interpolation. |
| Environment | Empty/minimal execution environment; host env is not inherited. |
| Output/time bounds | Wall-clock, stdout, and stderr caps are applied. |
| Docker | `docker --version`, `docker run`, `docker build`, and `docker compose` remain blocked until a Docker-specific review PR. |
| Browser boundary | `src/` remains process-free and does not import worker code. |

PR #23 implementation status:

| Gate | Status |
| --- | --- |
| Docker CLI version probe | Implemented only as `docker --version` inside `tools/local-dev-worker/localDevWorkerVersionExecutionAdapter.ts`. |
| Docker probe policy | Implemented as a separate policy that requires command `docker`, args exactly `["--version"]`, and capability `capability.docker.version`. |
| Docker reviewed config | Added separately from the non-Docker reviewed config; default config still blocks Docker. |
| Docker daemon state | `docker version`, `docker info`, `docker inspect`, `docker context`, `docker volume`, `docker network`, and `docker system` remain denied. |
| Docker runtime | `docker run`, `docker build`, `docker compose`, `docker-compose`, `docker pull`, `docker push`, `docker exec`, `docker cp`, and `docker login` remain denied. |
| Docker socket and mounts | Docker socket references, home references, and mount flags remain denied. |
| Containers | No container is started, pulled, inspected, mounted, or networked. |
| Browser boundary | `src/` remains process-free and does not import worker code. |

PR #24 implementation status:

| Gate | Status |
| --- | --- |
| Docker readiness classifier | Implemented only as `docker version --format "{{json .}}"` inside `tools/local-dev-worker/localDevWorkerDockerReadinessAdapter.ts`. |
| Readiness result model | Added structured states for `cli_unavailable`, `daemon_unavailable`, `daemon_available`, `probe_blocked`, and `probe_failed`. |
| Readiness policy | Requires exact args and denies `docker info`, `docker inspect`, `docker system`, `docker network`, `docker volume`, `docker context`, runtime commands, image/container commands, socket paths, mounts, and shell metacharacters. |
| Docker Desktop off | Treated as `daemon_unavailable`, not a safety failure. |
| Containers/images | No container is started, no image is pulled or built, and no runtime object is inspected. |
| Browser boundary | `src/` remains process-free and does not import worker code. |

PR #25 implementation status:

| Gate | Status |
| --- | --- |
| Container policy types | Added image, resource, network, mount, and security policies for future container execution. |
| Plan model | Added `dockerRunPreview` as a string-array preview only; it is never executed. |
| Image policy | Allows only exact future images such as `alpine:3.20` and `node:20-alpine`; denies `latest`, untagged, private registry, arbitrary, digest, whitespace, and shell-metacharacter images. |
| Command policy | Allows only tiny plan-only commands; denies shells, package installs, network tools, file writes, destructive commands, and Docker commands inside containers. |
| Runtime policy | Network, DNS, Docker socket, home mount, workspace mount, tmpfs, privileged mode, host namespace use, capability add, and root execution remain denied. |
| Execution | No `docker run`, image pull/build, container start, inspect, cleanup, or mount behavior exists. |

PR #26 implementation status:

| Gate | Status |
| --- | --- |
| First container smoke adapter | Implemented only in `tools/local-dev-worker/localDevWorkerDockerContainerSmokeAdapter.ts`. |
| Exact smoke command | Allows only `docker run --rm --network none --pull=never --read-only --cap-drop ALL --security-opt no-new-privileges --memory 128m --cpus 0.5 --pids-limit 64 --user 65534:65534 alpine:3.20 echo hello`. |
| Image pull | Blocked by required `--pull=never`; missing `alpine:3.20` is structured as image unavailable, not a safety failure. |
| Network and DNS | Disabled with `--network none`; no network flags or network commands are allowed. |
| Mounts | Docker socket, home, workspace, `--mount`, `-v`, and `--volume` remain denied. |
| Shell and env | Shell execution remains denied; `execFile` uses `shell: false` and `env: {}`. |
| Non-root user | Required with exact `--user 65534:65534`; missing user, `--user 0`, `--user 0:0`, and root user values are blocked. |
| Runtime expansion | Arbitrary `docker run`, `docker build`, `docker compose`, `docker pull`, `docker exec`, `docker cp`, and `docker login` remain denied. |
| Browser boundary | `src/` remains process-free and does not import worker code. |

PR #27 implementation status:

| Gate | Status |
| --- | --- |
| Smoke result normalization | Added stable outcomes for success, Docker CLI unavailable, daemon unavailable, local image unavailable, timeout, policy blocked, execution failed, and unexpected output. |
| Output sanitizer | Added pure stdout/stderr normalization, byte caps, secret-like redaction, home path redaction, and `.env` reference redaction before audit summaries. |
| Audit record | Added local-dev smoke audit records with command preview, sanitized output previews, rejection codes, timing, and safety metadata. |
| Cleanup risk | Added `none_expected`, `unknown_after_timeout`, `not_applicable_blocked`, and `not_applicable_cli_or_daemon_unavailable` classifications. No cleanup command is executed. |
| Runtime expansion | No new Docker command, image, pull/build, compose, exec/cp/login, mount, network, shell, workspace, browser, production, Supabase, SQL, or billing capability was added. |

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

## 10.1 Future Real Execution PR Checklist

The next PR that attempts real execution must prove:

| Check | Required proof |
| --- | --- |
| Worker boundary | Worker remains outside `src/`; no browser import path exists. |
| Feature flags | Execution feature flag remains disabled by default and requires local opt-in. |
| `allowRealExecution` | Remains false by default. |
| Command scope | First execution path supports only version/identity checks. |
| Shell policy | No shell chaining and no arbitrary shell. |
| Package managers | No package install. |
| Repository ingestion | No `git clone`. |
| Network | No network. |
| Docker socket | No Docker socket mount. |
| Home mount | No user home mount. |
| Secrets | No secrets or service role keys in args, env, files, logs, or artifacts. |
| Resource bounds | Bounded timeout, stdout, stderr, CPU, and memory. |
| Audit trace | Structured dry-run/execution trace survives into server-owned events later. |
| Manual review | Security review completed before merge. |

Current review gate model after PR #21:

| Requirement | Modeled by |
| --- | --- |
| Exact capability scope | `manualSecurityReview.scope` must include the matched capability id. |
| Reviewed by / reviewed at | Non-empty manual review metadata is required. |
| Local-dev only | `source = dremo-local-dev-sandbox` and `expectedEnvironment = local-dev`. |
| Browser isolation | Production UI path and `src/` import path are explicit blockers. |
| Unsafe commands | Existing worker guards remain blockers for shell chaining, package installs, network commands, Docker runtime commands, file writes, secret access, home mounts, and Docker socket exposure. |

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

Recommended next PR: **Add deterministic container naming plus exact cleanup command review** or further refine workspace/artifact policy before any broader execution.

PR #24 fulfills readiness classification, PR #25 fulfills the design-gate layer, PR #26 adds the first exact no-network/no-mount smoke command, and PR #27 adds audit normalization plus cleanup-risk metadata. Do not jump directly to arbitrary `docker run`; the next Docker step should stay conservative:

| Scope | Requirement |
| --- | --- |
| Commands | Keep only the exact non-root `alpine:3.20 echo hello` smoke command until audit/event/workspace policy is stronger. |
| Denied commands | Arbitrary `docker run`, `docker build`, `docker compose`, `docker pull`, `docker exec`, `docker cp`, `docker login`, and socket/mount paths remain denied. |
| Shell | No shell chaining and no arbitrary shell. |
| Filesystem | No file writes. Temporary task-scoped workspace only. |
| Network | No network. |
| Environment | Explicit local-dev only. No production secrets. |
| Review | Manual security review required before merge. |
| Rollback | Feature flag can disable execution immediately. |
