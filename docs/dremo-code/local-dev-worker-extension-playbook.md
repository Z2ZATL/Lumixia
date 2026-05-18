# Dremo Local-dev Worker Extension Playbook

Status: future PR planning guide.

Use this playbook before proposing changes to the Dremo local-dev worker. The goal is to keep PRs small, reviewable, and safety-preserving.

## Allowed Future PR Shapes

| Shape | Examples |
| --- | --- |
| Documentation | Operator guide improvements, troubleshooting additions, runbooks, architecture diagrams. |
| Reporting | Report formatting improvements, golden fixture maintenance, deterministic summaries. |
| Telemetry design | Event or telemetry schema proposals without execution. |
| CLI UX | Local-dev CLI help text, fixture-only modes, output formatting without new commands. |
| Lifecycle docs | Result schema documentation, outcome guidance, review checklists. |
| Safety checks | Link checks, fixture consistency checks, static boundary checks without process execution. |

## Forbidden PR Shapes For Now

| Shape | Why blocked |
| --- | --- |
| Repo execution | Requires workspace, credential, artifact, and rollback policy. |
| Workspace mounts | Requires task-scoped temporary workspace policy and secret exclusion. |
| Package install | Can run lifecycle scripts, mutate workspace, and use network. |
| Arbitrary Docker runtime | Current policy allows only one exact smoke command. |
| Browser-to-worker bridge | Would expose execution path too early. |
| Production UI execution | Production sandbox provider is not selected or approved. |
| Docker socket mount | Grants host daemon control. |
| Broad cleanup | Risks deleting unrelated containers or hiding evidence. |
| Docker list/inspect/prune automation | Expands authority beyond exact cleanup. |
| Service role or secret access | Must never enter local worker or sandbox. |

## Review Checklist For New Capabilities

| Question | Required answer |
| --- | --- |
| Is this local-dev only? | Yes. |
| Is it outside `src/`? | Yes. |
| Is it disabled by default? | Yes. |
| Is the capability exact and tiny? | Yes. |
| Is trusted review scoped to one capability? | Yes. |
| Are network, mounts, shell, host env, and secrets denied? | Yes. |
| Does the safety scan cover the new boundary? | Yes. |
| Are fixtures deterministic? | Yes. |
| Does the PR body explain what remains forbidden? | Yes. |

If any answer is not yes, split the work into design/docs first.

## Review Checklist For Docs/reporting-only PRs

| Check | Requirement |
| --- | --- |
| Runtime behavior | No runtime behavior changes. |
| Process APIs | No new process imports or adapters. |
| Docker | No new Docker command capability. |
| Browser boundary | No import from `src/` to worker. |
| Fixtures | Deterministic and sanitized. |
| Verification | Typecheck, worker verify, safety scan, and relevant report checks. |
| Docs links | New docs linked from the docs index and worker README. |

## Review Checklist For Telemetry Schema PRs

Telemetry schema work is allowed only while it stays design-only.

| Check | Requirement |
| --- | --- |
| Collection | No telemetry upload, analytics provider, network call, database write, or file write. |
| Boundary | Files stay under `tools/local-dev-worker` and are not imported from `src/`. |
| Secrets | No raw secrets, service role keys, API keys, tokens, `.env` values, home paths, absolute workspace paths, raw user prompts, or environment values. |
| Determinism | Fixtures do not use `Date.now()`, `new Date()`, machine-specific paths, usernames, or Docker daemon values. |
| Payload scope | Include only schema version, event kind, lifecycle outcome, stages, readiness state, safety booleans, rejection codes, sanitized preview lengths, and pass/fail state. |
| Safety scan | Telemetry files are scanned for process APIs, `fetch`, XHR, Supabase imports, file writes, `process.env`, `src` imports, and new Docker command strings. |

## Review Checklist For Process API Changes

Process API changes are high-risk and should be rare.

| Check | Requirement |
| --- | --- |
| Location | Only in an explicitly reviewed adapter under `tools/local-dev-worker`. |
| Shell | `shell: false`. |
| Environment | No inherited host environment. |
| Args | Exact command and args array. |
| Timeout/output | Bounded wall-clock, stdout, and stderr. |
| Safety scan | Updated allowlist and targeted checks. |
| Tests | Fixtures cover blocked unsafe variants and structured local failures. |

Do not add process APIs to docs checkers, report formatters, lifecycle orchestration, golden checks, or `src/`.

## Review Checklist For Docker-related Changes

| Check | Requirement |
| --- | --- |
| Command scope | Exact reviewed command only. |
| Images | No new image unless separately reviewed. |
| Pull/build | Remains denied. |
| Network | Remains denied. |
| Mounts | Remain denied. |
| Docker socket | Remains denied. |
| Cleanup | Exact deterministic target only. |
| Browser/production | No path. |
| Docs | Update operator guide, troubleshooting, checklist, and provider decision docs. |

## Keep PRs Small And Mergeable

Prefer one intent per PR:

| Good PR split | Avoid |
| --- | --- |
| Docs only | Docs plus execution changes. |
| Fixture only | Fixture plus new command adapter. |
| Report formatting only | Report formatting plus lifecycle policy changes. |
| Safety scan only | Safety scan plus runtime expansion. |
| Design record only | Design record plus Docker execution. |

## Before Opening A PR

Run:

```powershell
npm run typecheck
npm run build
npm audit --omit=dev
git diff --check
npm run dremo:worker:typecheck
npm run dremo:worker:selfcheck
npm run dremo:worker:safety
npm run dremo:worker:lifecycle:report:golden
npm run dremo:worker:verify
```

If docs links changed, run:

```powershell
npm run dremo:worker:docs
```

## PR Body Template

Include:

| Section | Content |
| --- | --- |
| Summary | What changed and why. |
| Important implementation note | Whether the PR is docs-only, fixture-only, or local-dev-only. |
| Safety confirmed | Explicitly list unchanged forbidden capabilities. |
| Verification | Every command run and result. |
| Next recommendation | A conservative next PR shape. |

## Default Next Step

Prefer reporting, telemetry, docs, or operator experience next. Do not jump from the smoke lifecycle to repo execution, workspace mounts, package installs, network, arbitrary Docker runtime, broad cleanup, or browser-to-worker bridges.
