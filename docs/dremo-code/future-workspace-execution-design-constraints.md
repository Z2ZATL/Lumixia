# Future workspace execution design constraints

Status: design constraints only.

This document defines constraints for any future Dremo local-dev workspace or repository execution work. It does not implement workspace execution, repo execution, workspace mounts, package install, network access, new Docker commands, browser integration, production UI execution, telemetry upload, database writes, runtime file writes, or process APIs.

## Purpose

Workspace execution is the next large risk boundary after the exact local-dev Docker smoke lifecycle. This document records the requirements that must exist before any future PR can mount a workspace, read real repository files for execution, run repository commands, or write project files.

Use this page with the [future workspace execution review checklist](./future-workspace-execution-review-checklist.md), [local-dev worker threat model v2](./local-dev-worker-threat-model-v2.md), [release readiness checklist](./local-dev-worker-release-readiness.md), [capability registry](./local-dev-worker-capability-registry.md), and [ADR 0001](../adr/0001-dremo-local-dev-worker-boundary.md).

## Non-goals

| Non-goal | Reason |
| --- | --- |
| No workspace mounts | Mount policy and path threat modeling are not implemented. |
| No repo execution | No repository command, script, test, build, install, or generated command is approved. |
| No user-code execution | User or AI-generated code must not run from the workspace. |
| No new Docker command capability | Existing exact Docker probes, smoke command, and cleanup command are unchanged. |
| No package install | Dependency installation and lifecycle scripts require separate supply-chain review. |
| No network | Egress, DNS, registry, and exfiltration controls are not designed here. |
| No browser bridge | Browser-to-worker integration requires separate architecture and threat model review. |
| No production UI path | Production execution remains blocked until server-owned sandbox execution exists. |
| No telemetry collection | Telemetry upload, persistence, or analytics providers remain out of scope. |

## Current system baseline

| Area | Current baseline |
| --- | --- |
| Browser boundary | `src/` is browser-bundled and must not import `tools/local-dev-worker`, process APIs, or Docker command adapters. |
| Local-dev worker | `tools/local-dev-worker` contains reviewed local-dev policies, adapters, lifecycle reports, golden checks, docs checks, and telemetry schema fixtures. |
| Docker smoke lifecycle | Only exact reviewed Docker probes, one exact no-network/no-mount/non-root smoke command, and one exact cleanup command exist. |
| Workspace access | No workspace bind mount, no workspace file write, no repo command execution, and no package install path exists. |
| Reporting and telemetry | Reports and telemetry fixtures are sanitized and deterministic; no upload, DB write, runtime file write, or network path exists. |

## Why workspace execution is high risk

| Risk | Why it matters |
| --- | --- |
| Reading user source files | Source files can contain proprietary code, prompt-injection text, credentials, comments, or local-only paths. |
| Writing or deleting project files | A tool can overwrite work, corrupt generated artifacts, or remove unrelated developer changes. |
| Secret exfiltration | Workspace files, shell output, dependency scripts, or logs can expose API keys, tokens, service roles, or private URLs. |
| Reading `.env` | Environment files commonly contain production credentials and must not be read by local worker execution. |
| Running package scripts | `preinstall`, `postinstall`, `prepare`, `test`, and build scripts can execute arbitrary code. |
| Dependency install supply chain | Installing packages can run attacker-controlled code and use networks or registries. |
| Network access | Network enables data exfiltration, package downloads, callbacks, and uncontrolled remote interactions. |
| Docker socket or host escape | Docker socket access can become host-level authority on many developer machines. |
| Workspace bind mounts | A container with a bind mount can read or mutate real project files and follow unsafe paths. |
| Symlink and path traversal | Symlinks or `..` paths can escape an intended workspace root or touch hidden files. |
| Generated file overwrite | AI-generated patches or artifacts can overwrite user work without an explicit artifact/rollback model. |
| Prompt injection from repo files | Repository content can instruct an agent to weaken gates, leak secrets, or broaden execution. |
| Browser-to-worker abuse | Browser-originated requests can spoof user intent unless a reviewed bridge and authorization model exists. |
| Production path exposure | A local worker path must not become callable from Dremo Lab or production UI. |
| Supabase or service role misuse | Service role keys and Supabase resources must stay outside local worker execution. |

## Required threat model before implementation

Before any workspace mount or repo command is implemented, a dedicated workspace threat model must define:

| Area | Required coverage |
| --- | --- |
| Assets | Workspace files, ignored files, generated artifacts, user changes, secrets, `.env`, package manager state, Docker host, and audit logs. |
| Trust boundaries | Browser, worker, synthetic workspace, real workspace, Docker container, host filesystem, package manager, network, and telemetry/reporting boundaries. |
| Threat actors | Malicious repo content, compromised dependency, accidental broad command, hostile symlink, spoofed browser request, and future integration mistakes. |
| Abuse cases | Secret reads, file overwrite, path traversal, package script execution, network exfiltration, Docker host escape, and cleanup misuse. |
| Residual risks | What remains risky even after no-network, no-shell, no-env, no-write, and path constraints. |
| Exit criteria | Exact verification commands, fixtures, safety scan coverage, docs updates, and rollback conditions required before execution. |

## Required policy design before implementation

Before execution, future PRs must add pure design/policy models for:

| Policy | Required default |
| --- | --- |
| Path policy | Deny absolute paths, `..`, symlinks, home paths, `.env`, hidden secret files, and paths outside an explicit synthetic root. |
| Mount policy | Deny workspace, home, Docker socket, volume, bind, tmpfs, and env-file mounts by default. |
| Command policy | Deny arbitrary commands, shells, package managers, network tools, Docker commands inside containers, background processes, and destructive commands. |
| Write policy | Deny file writes by default; future writes require artifact paths, overwrite checks, rollback, and review. |
| Network policy | Deny network and DNS by default. |
| Secret policy | Deny `.env`, service role, host env, token, key, credential, SSH, cloud config, and home path reads. |
| Output policy | Sanitize stdout/stderr, file previews, paths, dependency names if sensitive, and prompt-derived content before reports. |
| Cleanup policy | Deny recursive cleanup, broad Docker cleanup, workspace deletion, wildcard targets, and unreviewed generated paths. |
| Telemetry policy | Deny upload, raw prompts, raw file contents, host paths, env values, and identifiers until a separate privacy review exists. |

## Synthetic workspace path policy design

PR #42 adds a string-only synthetic path policy model under `tools/local-dev-worker/`. It does not read real files, write files, resolve real paths, mount directories, follow symlinks, execute repo commands, or add Docker behavior.

| Policy area | PR #42 behavior |
| --- | --- |
| Root | Accepts only synthetic `/workspace` paths or safe relative paths normalized under `/workspace`. |
| Access mode | Allows synthetic read decisions only; write and execute requests are denied. |
| Path normalization | Normalizes slash direction and removes `.` segments in string space only. |
| Denied paths | Blocks absolute host paths, Windows drive paths, parent traversal, home paths, `.env`, secret-looking files, `.git`, `node_modules`, null bytes, shell metacharacters, and empty paths. |
| Symlinks | Denies any request that would follow symlinks. |
| Filesystem access | No `fs`, `path`, realpath, stat, lstat, read, write, or directory access is used. |
| Future requirement | A future PR must add golden path-policy fixtures before any mount design or synthetic read-only mount execution. |

## Required fixture and golden coverage before implementation

Future workspace execution work must add deterministic tests before execution:

| Coverage | Required fixtures |
| --- | --- |
| Path denial | Absolute path, `..`, symlink, home path, `.env`, hidden secret file, workspace escape, and generated overwrite attempts. |
| Command denial | Shells, package managers, install scripts, git clone, curl/wget, Docker-in-Docker, destructive commands, background processes, and env reads. |
| Mount denial | Workspace mount, home mount, Docker socket, volume, bind, tmpfs, env-file, and arbitrary mount flags. |
| Network denial | Any egress, DNS, package registry, webhook, curl, wget, git remote, and telemetry upload attempt. |
| Output safety | Secret-like output, home paths, `.env` names, raw file snippets, oversized output, and prompt-injection text. |
| Golden stability | Plan previews, report summaries, and schema outputs must have deterministic sanitized golden fixtures. |

## Forbidden defaults

Any future workspace/repo execution design must default to:

| Default | Required value |
| --- | --- |
| Workspace mount | Disabled. |
| Home mount | Disabled. |
| Docker socket mount | Disabled. |
| Network | Disabled. |
| Package install | Disabled. |
| Package lifecycle scripts | Disabled. |
| Shell | Disabled. |
| Host environment inheritance | Disabled. |
| `.env` read | Disabled. |
| Secrets/service role | Disabled. |
| Arbitrary command | Disabled. |
| Browser path | Disabled. |
| Production path | Disabled. |
| File write access | Disabled. |
| Recursive cleanup | Disabled. |
| Broad Docker cleanup | Disabled. |
| Telemetry upload | Disabled. |

## Required review gates

| Gate | Requirement |
| --- | --- |
| One capability per PR | Do not combine workspace mounts, repo execution, browser bridge, network, package install, and Docker changes. |
| Policy before execution | Pure policy models and denial fixtures must merge before any runtime adapter. |
| Synthetic before real | Use synthetic read-only fixtures before real project workspaces. |
| Read-only before write | Read-only planning and reports must precede any file write or patch application. |
| No network before egress model | Network remains denied until a separate egress policy and package/security review exists. |
| No browser before bridge review | Browser-to-worker bridge must be reviewed separately and cannot be bundled with repo execution. |
| Safety scan update | Safety scan must cover new file categories, denied APIs, path patterns, and command strings. |
| Docs update | ADR, threat model, capability registry, readiness checklist, troubleshooting, and operator docs must stay aligned. |

## Required staged PR sequence

Use small PRs in this order before considering real project workspace integration:

| Stage | Scope |
| --- | --- |
| PR A | Workspace threat model v1. |
| PR B | Workspace path policy design only. |
| PR C | Read-only synthetic workspace fixture model. |
| PR D | Path traversal, symlink, `.env`, home path, and secret-file denial fixtures. |
| PR E | No-network command allowlist design. |
| PR F | Exact read-only workspace mount plan only. |
| PR G | Golden fixtures for workspace plan and report output. |
| PR H | First synthetic read-only mount smoke execution, if prior gates pass. |
| PR I | Audit/report formatter for workspace smoke. |
| PR J | Cleanup and rollback policy. |
| PR K | Real project workspace integration design only. |

No PR should combine browser bridge, workspace execution, and new Docker command capability.

## Open questions

| Question | Why it matters |
| --- | --- |
| What is the first synthetic workspace shape? | It must be deterministic, non-secret, and safe for fixtures. |
| How are symlinks represented and denied? | Path policies need platform-aware denial rules. |
| What counts as a safe read-only command? | Even read-only commands can leak paths, read env, or execute scripts. |
| How are generated artifacts represented? | Future writes require ownership, overwrite, rollback, and audit policy. |
| How is prompt injection from repo files handled? | Repo content must not be allowed to weaken policy gates. |
| What operator consent is required? | Local CLI use is not the same as browser or production execution approval. |
| How will telemetry remain non-uploading? | Workspace reports could accidentally include sensitive file or path summaries. |

## Explicitly blocked implementation work

This document does not approve:

| Blocked work | Status |
| --- | --- |
| Workspace execution | Blocked. |
| Repo command execution | Blocked. |
| Workspace bind mounts | Blocked. |
| Package install | Blocked. |
| Network access | Blocked. |
| New Docker commands | Blocked. |
| Process adapters | Blocked. |
| Browser-to-worker bridge | Blocked. |
| Production UI execution | Blocked. |
| Telemetry upload | Blocked. |
| Database writes | Blocked. |
| Supabase, SQL, billing, branding, or TerminalWorkspace changes | Blocked. |
