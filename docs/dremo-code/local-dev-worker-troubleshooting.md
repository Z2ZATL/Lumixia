# Dremo Local-dev Worker Troubleshooting

Status: operator troubleshooting matrix.

This document helps diagnose the local-dev worker and Docker smoke lifecycle without expanding execution capability. It does not recommend broad Docker cleanup, container inspection, image pull/build, workspace mounts, network access, browser integration, or production execution.

## Troubleshooting Matrix

| Symptom | Likely cause | Safe check | Safe fix | What NOT to do |
| --- | --- | --- | --- | --- |
| npm script missing | Branch is stale or `package.json` was not updated. | Run `git log --oneline -5` and inspect `package.json`. | Rebase or merge the latest `main`, then restore the expected script. | Do not add ad hoc shell scripts that bypass worker verification. |
| Worker typecheck failure | Type mismatch in worker docs/check/helper files. | Run `npm run dremo:worker:typecheck`. | Fix the narrow TypeScript error and rerun typecheck. | Do not remove files from the typecheck list to hide errors. |
| Self-check failure | Fixture expectation drift or unsafe safety flag. | Run `npm run dremo:worker:selfcheck`. | Read the named fixture failure and update code or fixture intentionally. | Do not loosen assertions without explaining the safety reason. |
| Safety scan violation | Process API, worker import, or forbidden string entered the wrong boundary. | Run `npm run dremo:worker:safety`. | Move code back to the reviewed boundary or remove the unsafe reference. | Do not disable the safety scan or import worker code into `src/`. |
| Golden report mismatch | Report format changed from committed fixture output. | Run `npm run dremo:worker:lifecycle:report:golden`. | Review the mismatch summary; update goldens only if the report change is intentional. | Do not rewrite golden files without review. |
| Telemetry fixture failure | Telemetry schema, redaction, or deterministic JSON expectation drifted. | Run `npm run dremo:worker:selfcheck` and inspect the telemetry fixture name. | Fix the schema/policy/fixture so events validate and remain sanitized. | Do not add telemetry upload, network calls, DB writes, or raw output fields to make the fixture pass. |
| Telemetry golden mismatch | Generated local-dev telemetry fixture JSON no longer matches the committed golden file. | Run `npm run dremo:worker:telemetry:golden`. | Review the mismatch summary; update schema, fixture, or golden JSON only if the drift is intentional and sanitized. | Do not add telemetry upload, runtime file writes, network calls, DB writes, or bypass the golden check. |
| Telemetry safety scan violation | Telemetry file imported a forbidden API or introduced unsafe static text. | Run `npm run dremo:worker:safety`. | Remove process/network/file-write/Supabase/env/src imports or sanitize fixture content. | Do not disable telemetry scan coverage or move telemetry into `src/`. |
| Docker CLI unavailable | Docker is not installed or not on PATH. | Run fixture-only checks first: `npm run dremo:worker:verify`. | Treat as structured local environment state; install Docker manually only if you intend to test real local lifecycle paths. | Do not add fallback Docker commands or browser execution. |
| Docker daemon unavailable | Docker Desktop or daemon is not running. | Run fixture report or golden checks to confirm docs/report path. | Start Docker manually if you are intentionally testing real local lifecycle. | Do not add daemon inspection commands or broaden readiness probes. |
| `alpine:3.20` missing locally | Smoke command uses `--pull=never`. | Read smoke result for local image unavailable outcome. | Accept structured image unavailable, or manually prepare local environment outside repo automation if explicitly testing smoke. | Do not add image pull behavior to code. |
| Smoke image unavailable due to `--pull=never` | The local image is absent and the policy blocks pull. | Check lifecycle report smoke rejection codes. | Treat as structured non-safety output. | Do not change policy to pull images automatically. |
| Cleanup target not found | Deterministic smoke container is already absent. | Check cleanup outcome for target-not-found. | Treat as acceptable structured output. | Do not add broad cleanup, list, inspect, stop, kill, or prune behavior. |
| Cleanup failed structurally | Docker CLI/daemon issue or exact cleanup failure. | Read cleanup outcome and rejection codes. | Keep the exact cleanup target and troubleshoot local Docker manually outside repo automation. | Do not add arbitrary cleanup targets or container IDs. |
| Lifecycle `readiness_unavailable` | Readiness classifier could not reach Docker daemon. | Run fixture report to confirm reporting path. | Start Docker manually only if testing real lifecycle. | Do not bypass readiness or run smoke first. |
| Lifecycle `policy_blocked` | Trusted review, request shape, source, environment, or path gate failed. | Inspect lifecycle rejection codes. | Restore exact request shapes and trusted local review helpers. | Do not accept browser/user review payloads. |
| `productionUiPath` denied | Request attempted to model a production UI path. | Search the changed worker request fixture. | Set production UI path back to false for local-only checks. | Do not expose worker execution through production UI. |
| `srcImportPath` denied | Request attempted to model an import path from `src/`. | Run safety scan and inspect imports. | Remove `src/` to worker coupling. | Do not import `tools/local-dev-worker` from browser code. |
| Trusted manual review missing | Request did not use trusted local helper metadata. | Check request factory or fixture. | Use the existing trusted helper scoped to the exact capability. | Do not trust manual review metadata from user or browser payloads. |
| Wrong review scope | Manual review scope does not match the exact capability. | Compare rejection code with manifest capability id. | Use one exact capability id for the reviewed action. | Do not broaden scope to multiple unrelated capabilities. |
| Report contains redacted output | Sanitizer detected secret-like or host-path-like text. | Inspect sanitized preview and source fixture. | Keep redaction; adjust fixture expectations if intended. | Do not disable redaction to make output prettier. |
| Build passes but worker verify fails | Browser app is fine but worker safety or fixtures drifted. | Run each worker command directly. | Fix the worker-specific failure before merging. | Do not rely on `npm run build` alone. |
| Worker verify passes but real lifecycle report fails | Local Docker environment differs from fixture path. | Run fixture and golden checks to isolate report formatting. | Treat Docker-specific failures as local environment output unless safety flags changed. | Do not add new Docker commands to diagnose automatically. |

## Safe Escalation

If the matrix does not cover a failure:

1. Capture the failing command and exact rejection codes.
2. Confirm whether Docker was required for the command.
3. Confirm no `src/` import, process API, new Docker command, network, mount, or secret path was added.
4. Open a small follow-up PR with the narrowest fixture or docs fix.

When in doubt, prefer a docs/reporting fix over execution expansion.
