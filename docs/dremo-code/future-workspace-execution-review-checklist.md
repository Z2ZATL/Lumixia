# Future workspace execution review checklist

Status: future PR review checklist.

Use this checklist before proposing any Dremo local-dev workspace mount, repository command, or repo-aware execution change. It is documentation only. It does not approve workspace execution, repo execution, package install, network, new Docker commands, browser integration, production UI execution, telemetry upload, database writes, runtime file writes, or process APIs.

Pair this checklist with the [future workspace execution design constraints](./future-workspace-execution-design-constraints.md).

## Scope

| Question | Required safe answer |
| --- | --- |
| Does this implement workspace execution? | No, unless all prerequisite design, policy, fixture, safety scan, and review PRs have already merged. |
| Does this execute repository commands? | No. Repo execution requires a dedicated threat model and staged design. |
| Does this add a new Docker command? | No. New Docker command capability requires its own reviewed PR. |
| Does this combine browser bridge and execution? | No. Browser bridge and workspace execution must never be combined in one PR. |
| Does this stay one capability or one documentation/check intent? | Yes. Split broad changes before review. |

## Input trust

| Question | Required safe answer |
| --- | --- |
| Does this trust browser/user-supplied command, path, image, mount, env, or review metadata? | No. Trusted local helpers and exact policy objects must own review evidence. |
| Does this read instructions from repository files as trusted policy? | No. Repo content is untrusted input. |
| Does this accept arbitrary user text as command arguments? | No. Commands must be exact or allowlisted through pure policy. |
| Does this depend on user-provided cleanup targets? | No. Cleanup targets must be deterministic and policy-owned. |

## Path policy

| Question | Required safe answer |
| --- | --- |
| Does this read repo files? | No for this PR, or only from synthetic deterministic fixtures in a design-only phase. |
| Does this write files? | No. Future writes require artifact ownership, overwrite detection, rollback, and audit policy. |
| Does this allow absolute paths? | No. |
| Does this allow `..` traversal? | No. |
| Does this follow symlinks? | No until a dedicated symlink policy exists. |
| Does this read `.env` or hidden secret-like files? | No. |
| Does this expose home paths or workspace absolute paths in reports? | No. |

## Mount policy

| Question | Required safe answer |
| --- | --- |
| Does this mount a workspace? | No. Workspace mounts require separate path and mount policy PRs first. |
| Does this mount the home directory? | No. |
| Does this mount the Docker socket? | No. |
| Does this use volume, bind, tmpfs, env-file, or arbitrary mount flags? | No. |
| Does this mount writable paths? | No. |

## Command policy

| Question | Required safe answer |
| --- | --- |
| Does this depend on a user-provided command? | No. |
| Does this allow shell execution? | No. |
| Does this run package scripts? | No. |
| Does this run `npm install`, `pnpm install`, `yarn`, `pip install`, or similar install commands? | No. |
| Does this run git clone or remote fetch commands? | No. |
| Does this run Docker commands inside a container? | No. |
| Does this run destructive commands such as `rm -rf`, recursive delete, or broad cleanup? | No. |
| Does this allow background processes or daemons? | No. |

## Network policy

| Question | Required safe answer |
| --- | --- |
| Does this allow network or DNS? | No. |
| Does this call curl, wget, git remote, package registries, webhooks, or telemetry endpoints? | No. |
| Does this add `fetch`, XHR, or another network client to worker logic? | No. |
| Does this require image pull, build, or compose? | No. |

## Secret policy

| Question | Required safe answer |
| --- | --- |
| Does this read `.env` files? | No. |
| Does this read `process.env` or inherit host environment? | No. |
| Does this read service role keys, API keys, tokens, SSH keys, cloud credentials, or local config? | No. |
| Does this pass secrets into Docker, reports, telemetry, or fixtures? | No. |
| Does this add Supabase service role access? | No. |

## Output policy

| Question | Required safe answer |
| --- | --- |
| Are stdout/stderr previews sanitized? | Yes. |
| Are home paths, absolute workspace paths, `.env` references, and secret-like strings redacted or denied? | Yes. |
| Are raw repository file contents excluded from reports and telemetry? | Yes. |
| Are fixture and golden outputs deterministic? | Yes. |
| Are oversized outputs truncated with byte caps? | Yes. |

## Cleanup policy

| Question | Required safe answer |
| --- | --- |
| Does this add cleanup execution? | No, unless it is a dedicated exact cleanup PR with policy and fixtures. |
| Does this allow wildcard cleanup? | No. |
| Does this allow recursive workspace cleanup? | No. |
| Does this delete generated files without ownership tracking? | No. |
| Does this expand Docker cleanup beyond exact reviewed targets? | No. |

## Telemetry and privacy policy

| Question | Required safe answer |
| --- | --- |
| Does this add telemetry upload? | No. |
| Does this add analytics provider integration? | No. |
| Does this write telemetry to files or databases? | No. |
| Does this include raw prompts, repo file contents, env values, host paths, or usernames in telemetry schema output? | No. |
| Does this update telemetry docs if schema-only summaries change? | Yes. |

## Browser boundary

| Question | Required safe answer |
| --- | --- |
| Does this import `tools/local-dev-worker` from `src/`? | No. |
| Does this add process APIs under `src/`? | No. |
| Does this expose Dremo Lab, Code Architect AI UI, or TerminalWorkspace execution controls? | No. |
| Does this add browser-to-worker runtime connection? | No. |

## Production boundary

| Question | Required safe answer |
| --- | --- |
| Does this expose a production UI execution path? | No. |
| Does this change Supabase functions or SQL migrations? | No. |
| Does this change billing, branding, Code Architect AI naming, or TerminalWorkspace? | No. |
| Does this imply local-dev worker behavior is production sandbox behavior? | No. |

## Verification

Run and report:

```powershell
npm run typecheck
npm run build
npm audit --omit=dev
git diff --check
npm run dremo:worker:typecheck
npm run dremo:worker:selfcheck
npm run dremo:worker:safety
npm run dremo:worker:lifecycle:report:golden
npm run dremo:worker:telemetry:golden
npm run dremo:worker:docs
npm run dremo:worker:verify
```

## Documentation

| Question | Required safe answer |
| --- | --- |
| Does this update the workspace design constraints when a workspace boundary changes? | Yes. |
| Does this update the threat model if residual risk changes? | Yes. |
| Does this update the capability registry for new policy, fixture, report, schema, or verification surfaces? | Yes. |
| Does this update the release readiness checklist for new blockers or verification requirements? | Yes. |
| Does this keep the docs link check passing? | Yes. |

## If any answer is unsafe

Stop and split the work. Add a design-only PR, then policy-only PR, then fixture/golden PR, then safety scan coverage before any execution adapter is considered. Do not combine workspace mounts, repo execution, network, package install, browser bridge, production UI path, telemetry upload, or new Docker commands in a single PR.
