# Dremo Local-dev Worker Boundary

Status: boundary-only, no execution.

This directory is intentionally outside `src/` so future local-dev Docker execution work cannot be imported into the Vite/React browser bundle by accident.

## What This Is

| File | Purpose |
| --- | --- |
| `localDevWorkerContract.ts` | Local-dev worker request/response contract for future Docker execution. |
| `localDevWorkerGuards.ts` | Pure command guard logic for shell chaining, network commands, package installs, file writes, Docker runtime commands, home mounts, Docker socket exposure, and secret access patterns. |
| `localDevWorkerRunner.ts` | Blocked/dry-run runner stub. It never executes commands and always returns `noExecution: true`. |
| `localDevWorkerSafetyScan.mjs` | Dev safety scan that fails if forbidden process/Docker/network/filesystem APIs appear in browser-bundled sandbox source. |

## Non-goals

| Non-goal | Reason |
| --- | --- |
| No Docker execution | Real Docker invocation requires a separate manual security review PR. |
| No process APIs | This boundary PR must not add `child_process`, `spawn`, `exec`, `Deno.Command`, or Docker CLI calls. |
| No production path | The worker is not imported from `src/` and is not exposed through Dremo Lab or production UI. |
| No filesystem writes | Future writes require a task-scoped workspace policy and separate review. |
| No network calls | First execution prototype must remain network-disabled. |
| No secrets | Service role keys and production credentials must never enter the worker or sandbox. |

## Safety Scan

Run this before any future sandbox PR:

```powershell
node tools/local-dev-worker/localDevWorkerSafetyScan.mjs
```

The scan covers `src/features/dremo-code/sandbox` because that folder is browser-bundled. It intentionally does not scan this `tools/` folder because the worker boundary documentation and guard strings mention denied command names by design.

## Future Execution Gate

The next execution PR must remain local-dev only and must satisfy `docs/dremo-code/docker-execution-security-checklist.md`.

Required defaults:

| Gate | Required value |
| --- | --- |
| `noExecution` | `true` until reviewed runtime execution exists. |
| `allowRealExecution` | `false` by default. |
| Docker socket mount | `false`. |
| Home mount | `false`. |
| Network | `false`. |
| File writes | `false`. |
| Production UI path | Not allowed. |
