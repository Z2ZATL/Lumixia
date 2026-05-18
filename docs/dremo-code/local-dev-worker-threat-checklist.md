# Dremo local-dev worker threat checklist

Status: future PR author checklist.

Use this checklist before opening any Dremo local-dev worker PR. It is documentation only and does not approve runtime changes.

For maintainer handoff or release decisions, also use the [local-dev worker release readiness checklist](./local-dev-worker-release-readiness.md).

For any future workspace mount or repo command work, also use the [future workspace execution design constraints](./future-workspace-execution-design-constraints.md) and [future workspace execution review checklist](./future-workspace-execution-review-checklist.md).

## Scope check

| Question | Required safe answer |
| --- | --- |
| Does this add a new command? | No, unless the PR is a dedicated reviewed capability PR with policy, fixtures, safety scan coverage, and docs. |
| Does this add a new process API? | No, unless it is isolated to an explicitly reviewed worker adapter and never under `src/`. |
| Does this touch `src/`? | No worker imports, no process APIs, no Docker commands, and no execution path. |
| Does this expose a browser or production path? | No. Browser-to-worker and production UI execution require separate design review. |
| Does this read env values or secrets? | No `.env`, `process.env`, service role, API key, token, or secret reads. |
| Does this add network access? | No. Network requires a separate egress and package/security review. |
| Does this mount workspace, home, or Docker socket paths? | No. Workspace/home/socket mounts require separate threat models and review. |
| Does this expand Docker cleanup? | No. Cleanup remains exact unless a dedicated cleanup review PR proves the new target policy. |
| Does this add telemetry upload? | No. Telemetry collection/upload requires privacy, storage, retention, and opt-in review. |
| Does this change Supabase, SQL, billing, branding, or TerminalWorkspace? | No. These are outside local-dev worker PR scope. |
| Does this update docs/tests/safety scan? | Yes, for any boundary, capability, fixture, report, schema, or verification change. |
| Does this keep PR scope to one capability or one docs/check intent? | Yes. Split broad changes before review. |

## Required verification

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

## If any answer is unsafe

Stop and split the work. Add design docs, policy models, fixtures, and safety scan coverage before adding execution. Do not combine browser integration, repo execution, workspace mounts, network access, telemetry collection, or production UI paths with a runtime capability PR.
