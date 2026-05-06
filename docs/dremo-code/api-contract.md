# Proposed Dremo API Contract

Status: proposed contract with a server-owned stub foundation.

Implementation note: `supabase/functions/dremo-api/index.ts` currently provides a stub-only Edge Function for authenticated task creation, task reads, event reads, and task cancellation. Event appends and status transitions are backed by service-role-only Postgres RPCs so sequence assignment and cancellation events are server-owned. It intentionally does not run sandbox execution, call models, charge credits, or replace Code Architect AI branding.

Sandbox lifecycle note: the same Edge Function also provides stub-only `POST /tasks/:taskId/sandbox/start` and `POST /tasks/:taskId/sandbox/stop` routes. These routes create/update `provider = "stub"` sandbox lifecycle records and append server-owned events only. They do not run commands, mount files, make network calls, inject secrets, or create real provider sandboxes.

Repo scan note: `POST /tasks/:taskId/repo-scan` is currently a read-only stub contract. It appends server-owned repo scan events and returns a metadata-only summary based on request/task fields. It does not execute shell commands, clone repos, read local files, access the network, call models, or touch billing.

Final report note: `POST /tasks/:taskId/report/finalize` is currently a stub-only contract. It creates a `final_report` artifact metadata row and appends report/artifact events from existing task metadata and server-owned events only. It does not create storage files, call models, execute code, read repos, or charge credits.

Task history note: `GET /tasks` and `GET /tasks/:taskId/summary` are read-only restore helpers for the internal Dremo Lab. They use the authenticated JWT owner and service-role server filtering; browser clients must not query `dremo_*` tables directly.

All Dremo API routes must require a valid Supabase bearer token. The backend must derive `userId` from the JWT and must not trust a user id supplied in request bodies.

## Shared Rules

| Rule | Requirement |
| --- | --- |
| Auth | `Authorization: Bearer <supabase-access-token>` required. |
| Ownership | A user can only access tasks owned by that user unless an admin/service path is explicitly defined. |
| Idempotency | Mutating routes should accept or generate an idempotency key. |
| Audit | Mutating routes must append server-owned events. |
| Billing | Task creation/execution must call backend-owned credit reservation logic. |
| Errors | Responses should be safe for users and must not leak secrets, stack traces, or provider internals. |

## Error Shape

```json
{
  "error": {
    "code": "task_not_found",
    "message": "Task not found.",
    "retryable": false,
    "requestId": "req_123"
  }
}
```

## POST /dremo/tasks

Purpose: create a Dremo task and reserve/quote credits if needed.

Auth requirements: authenticated Supabase user.

Request:

```json
{
  "agentSlug": "code-architect",
  "workspaceSource": {
    "type": "github_repo",
    "repo": "owner/name",
    "branch": "main"
  },
  "prompt": "Fix the failing tests and explain the changes.",
  "modelPreference": "balanced",
  "approvalMode": "required_for_risky_actions",
  "idempotencyKey": "task-create-user-uuid-001"
}
```

Response:

```json
{
  "task": {
    "id": "task_123",
    "userId": "derived-from-jwt",
    "status": "created",
    "billingState": "quoted",
    "createdAt": "2026-04-28T00:00:00Z"
  },
  "initialEvents": []
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `unauthorized` | Missing or invalid JWT. |
| `agent_not_available` | Requested agent is not enabled for Dremo. |
| `workspace_source_invalid` | Repo/upload/source is unsupported or malformed. |
| `billing_unavailable` | Credit system cannot safely quote or reserve. |
| `insufficient_credits` | User does not have enough credits. |

Ownership and security rules:

| Rule | Requirement |
| --- | --- |
| User identity | Derived only from JWT. |
| Task insert | Backend/service role only. |
| Credit reserve | Backend-owned. |
| Repo access | Must verify user permission before cloning or reading private code. |

## GET /dremo/tasks

Purpose: list recent Dremo task summaries for task history and restore.

Current stub behavior: returns owner-scoped task summary rows sorted by `createdAt` descending. The route supports `limit`, `status`, and `beforeCreatedAt` query parameters.

Auth requirements: authenticated owner.

Query parameters:

| Parameter | Meaning |
| --- | --- |
| `limit` | Optional positive integer, capped by the backend. |
| `status` | Optional Dremo task status filter. |
| `beforeCreatedAt` | Optional ISO timestamp cursor for older history. |

Response:

```json
{
  "tasks": [
    {
      "id": "task_uuid",
      "status": "planning",
      "title": "Stub task",
      "repoBranch": "main",
      "creditState": "not_required",
      "createdAt": "2026-05-06T00:00:00Z",
      "updatedAt": "2026-05-06T00:00:00Z"
    }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `invalid_limit` | `limit` was not a positive integer. |
| `invalid_status` | `status` was not an allowed Dremo task status. |
| `invalid_before_created_at` | Cursor timestamp was invalid. |
| `task_history_lookup_failed` | History could not be loaded safely. |

Ownership and security rules: the backend must always filter by `user_id` derived from the JWT. It must not trust a `userId` query parameter or reveal other users' task existence.

## GET /dremo/tasks/:taskId

Purpose: fetch task summary and current state.

Auth requirements: authenticated owner.

Response:

```json
{
  "task": {
    "id": "task_123",
    "status": "running",
    "billingState": "running",
    "agentSlug": "code-architect",
    "title": "Fix failing tests",
    "createdAt": "2026-04-28T00:00:00Z",
    "updatedAt": "2026-04-28T00:03:00Z"
  }
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `task_not_found` | Missing or not owned by current user. |
| `unauthorized` | Missing or invalid JWT. |

Ownership and security rules: never reveal whether another user's task exists.

## GET /dremo/tasks/:taskId/summary

Purpose: restore an existing task into the internal Dremo Lab without trusting browser state.

Current stub behavior: returns the owned task, recent server-owned events, latest final report artifact metadata if present, artifact count, approval count, approval rows, and latest sandbox lifecycle status. The frontend may still call `/events` and `/artifacts` to hydrate the full timeline and artifact list.

Auth requirements: authenticated owner.

Response:

```json
{
  "task": {
    "id": "task_uuid",
    "status": "planning",
    "title": "Stub task"
  },
  "recentEvents": [{ "eventType": "task_created", "sequence": 1 }],
  "latestFinalReportArtifact": null,
  "artifactCount": 0,
  "approvalCount": 0,
  "approvals": [],
  "sandboxSession": null
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `task_not_found` | Missing or not owned by current user. |
| `events_fetch_failed` | Recent events could not be loaded. |
| `artifacts_fetch_failed` | Artifact metadata could not be loaded. |
| `approvals_fetch_failed` | Approval metadata could not be loaded. |
| `sandbox_lookup_failed` | Sandbox lifecycle status could not be loaded. |

Ownership and security rules: this is a read-only backend restore helper. It must not mutate task state, append events, expose tokens, or include storage download credentials.

## GET /dremo/tasks/:taskId/events

Purpose: stream or page ordered server-owned task events.

Auth requirements: authenticated owner.

Query options:

| Parameter | Meaning |
| --- | --- |
| `afterSequence` | Return events after this sequence. |
| `limit` | Max events for polling mode. |
| `stream` | If supported, upgrade to server-sent events. |

Response for polling:

```json
{
  "events": [
    {
      "id": "evt_123",
      "taskId": "task_123",
      "sequence": 42,
      "type": "terminal_output",
      "channel": "terminal",
      "severity": "info",
      "payload": {
        "stream": "stdout",
        "text": "npm test passed"
      },
      "createdAt": "2026-04-28T00:04:00Z"
    }
  ],
  "nextSequence": 43
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `task_not_found` | Missing or not owned by current user. |
| `stream_unavailable` | Event streaming backend is unavailable. |

Ownership and security rules: frontend can read events but cannot create or mutate runtime events.

## POST /dremo/tasks/:taskId/cancel

Purpose: request cancellation of a task.

Auth requirements: authenticated owner.

Request:

```json
{
  "reason": "User cancelled from workspace",
  "idempotencyKey": "cancel-task-123"
}
```

Response:

```json
{
  "task": {
    "id": "task_123",
    "status": "cancelled",
    "billingState": "cancelled_released"
  }
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `task_not_cancellable` | Task already completed, failed, or locked for finalization. |
| `billing_release_failed` | Cancellation happened but credit release needs manual review. |

Ownership and security rules: cancellation request is user-initiated, but final state and credit release are backend-owned.

## POST /dremo/tasks/:taskId/repo-scan

Purpose: request a safe repo scan summary for a task.

Current stub behavior: records `repo_scan_started` and `repo_scan_completed` events, then returns a metadata-only summary. The summary may use optional request fields or existing task metadata, but it never reads arbitrary filesystem paths or clones external repositories.

Auth requirements: authenticated owner.

Request:

```json
{
  "repoUrl": "https://github.com/owner/repo",
  "repoBranch": "main"
}
```

Response:

```json
{
  "summary": {
    "mode": "stub",
    "source": "request",
    "repoUrl": "https://github.com/owner/repo",
    "repoBranch": "main",
    "promptLength": 120,
    "languageHints": [],
    "limitations": [
      "No shell commands were executed.",
      "No filesystem paths were read.",
      "No external repositories were cloned."
    ]
  },
  "events": [
    { "eventType": "repo_scan_started" },
    { "eventType": "repo_scan_completed" }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `unauthorized` | Missing or invalid JWT. |
| `task_not_found` | Missing or not owned by current user. |
| `payload_too_large` | Request body exceeds the stub limit. |
| `text_too_long` | Repo metadata field is too long. |

Ownership and security rules: `userId` is derived from JWT, trusted event writes remain service-role-only, and the stub must not perform shell, filesystem, network, model, or billing work.

## POST /dremo/tasks/:taskId/sandbox/start

Purpose: request a sandbox lifecycle for a task.

Current stub behavior: creates or reuses a `dremo_sandbox_sessions` row with `provider = "stub"` and returns lifecycle events. No real sandbox provider is contacted.

Auth requirements: authenticated owner.

Response:

```json
{
  "sandboxSession": {
    "id": "sandbox_uuid",
    "taskId": "task_uuid",
    "provider": "stub",
    "status": "ready",
    "resourceLimits": {
      "stubOnly": true,
      "codeExecution": false,
      "networkEgress": "disabled",
      "secrets": "none"
    }
  },
  "events": [
    { "eventType": "sandbox_requested" },
    { "eventType": "sandbox_starting" },
    { "eventType": "sandbox_ready" }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `unauthorized` | Missing or invalid JWT. |
| `task_not_found` | Missing or not owned by current user. |
| `task_terminal` | A new sandbox cannot start for a completed, failed, or cancelled task. |
| `sandbox_create_failed` | Stub sandbox session could not be recorded. |

Ownership and security rules: the frontend can request lifecycle changes but cannot insert sandbox records or trusted events directly. Stub start must not execute code or expose secrets.

## POST /dremo/tasks/:taskId/sandbox/stop

Purpose: stop or close the sandbox lifecycle for a task.

Current stub behavior: marks the latest stub sandbox session as `stopped` and appends lifecycle events. No real runtime resources are destroyed because none were created.

Auth requirements: authenticated owner.

Response:

```json
{
  "sandboxSession": {
    "id": "sandbox_uuid",
    "taskId": "task_uuid",
    "provider": "stub",
    "status": "stopped"
  },
  "events": [
    { "eventType": "sandbox_stopping" },
    { "eventType": "sandbox_stopped" }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `sandbox_not_found` | No sandbox session exists for this task. |
| `sandbox_stop_failed` | Stub sandbox session could not be marked stopped. |

Ownership and security rules: the stop route is backend-owned and event-producing. Future real providers must also enforce cleanup, retention, and audit guarantees server-side.

## POST /dremo/tasks/:taskId/tools/request

Purpose: request a future Dremo tool action through the server-owned permission layer.

Current stub behavior: validates the request, records server-owned events, and either returns a low-risk stub result or creates a pending approval. It does not execute commands, read files, write files, access the network, install packages, run git, or call models.

Auth requirements: authenticated owner.

Request:

```json
{
  "toolName": "bash",
  "riskLevel": "medium",
  "reason": "Run tests in the future sandbox.",
  "input": {
    "command": "npm test",
    "cwd": "/workspace"
  }
}
```

Response for low-risk stubbed tools:

```json
{
  "approval": null,
  "toolResult": {
    "status": "stubbed",
    "toolRequestId": "uuid",
    "executionImplemented": false
  },
  "events": [
    { "eventType": "tool_call_requested" },
    { "eventType": "tool_call_stubbed" }
  ]
}
```

Response for approval-required tools:

```json
{
  "approval": {
    "id": "approval_uuid",
    "status": "pending",
    "approvalType": "bash_command",
    "riskLevel": "medium"
  },
  "toolResult": null,
  "events": [
    { "eventType": "tool_call_requested" },
    { "eventType": "tool_approval_required" }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `invalid_tool_name` | Tool name is missing or uses unsupported characters. |
| `invalid_risk_level` | Risk level is not `low`, `medium`, `high`, or `critical`. |
| `payload_too_large` | Request body is too large. |
| `tool_input_too_large` | Sanitized input exceeds the stub payload limit. |
| `task_not_found` | Missing or not owned by current user. |

Ownership and security rules: `userId` is derived from JWT. The browser cannot insert trusted events or approval rows directly. Sensitive-looking input keys are redacted before persistence.

## POST /dremo/tasks/:taskId/approvals/:approvalId/resolve

Purpose: approve or reject a pending tool approval.

Current stub behavior: records the user decision and appends an approval event. It does not execute the requested tool after approval.

Auth requirements: authenticated owner of both task and approval.

Request:

```json
{
  "decision": "approved",
  "note": "Approved for this task only."
}
```

Response:

```json
{
  "approval": {
    "id": "approval_uuid",
    "status": "approved",
    "resolvedAt": "2026-05-06T00:00:00Z"
  },
  "executionImplemented": false,
  "message": "Approval recorded. Tool execution is still not implemented.",
  "events": [
    { "eventType": "tool_approval_approved" }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `invalid_approval_decision` | Decision is not `approved` or `rejected`. |
| `approval_not_found` | Missing, not owned, or not attached to this task. |
| `approval_already_resolved` | Approval is no longer pending. |

Ownership and security rules: resolving an approval never broadens scope or executes a tool in this PR. Future execution must require a fresh backend-owned policy check after approval.

## POST /dremo/tasks/:taskId/approvals/:approvalId

Purpose: resolve a pending approval request.

Auth requirements: authenticated owner.

Request:

```json
{
  "decision": "approved",
  "comment": "Approved for this task only.",
  "scope": "single_action",
  "idempotencyKey": "approval-task-123-approval-456"
}
```

Response:

```json
{
  "approval": {
    "id": "approval_456",
    "status": "approved",
    "resolvedAt": "2026-04-28T00:05:00Z"
  }
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `approval_not_found` | Missing, not owned, or not attached to this task. |
| `approval_already_resolved` | Approval cannot be changed. |
| `approval_expired` | The requested approval window is closed. |

Ownership and security rules: approval payload must be constrained to the action presented to the user. The frontend cannot broaden approval scope.

## GET /dremo/tasks/:taskId/artifacts

Purpose: list artifact metadata for a task.

Current stub behavior: returns `dremo_artifacts` metadata rows owned by the authenticated user. It does not create signed download URLs yet because no storage files are generated by the stub final report flow.

Auth requirements: authenticated owner.

Response:

```json
{
  "artifacts": [
    {
      "id": "artifact_uuid",
      "artifactType": "final_report",
      "name": "Dremo Final Report Stub",
      "storagePath": null,
      "metadata": {
        "stubOnly": true
      },
      "createdAt": "2026-05-06T00:00:00Z"
    }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `task_not_found` | Missing or not owned by current user. |
| `artifacts_fetch_failed` | Artifact metadata could not be loaded safely. |

Ownership and security rules: browser clients must not insert artifact rows directly. Future artifact URLs must be signed, short-lived, and scoped to the owner.

## POST /dremo/tasks/:taskId/report/finalize

Purpose: create a stub final report artifact from server-owned data.

Current stub behavior: reads the owned task row and existing server-owned events, builds a bounded metadata report, inserts one `dremo_artifacts` row with `artifact_type = "final_report"` and `storage_path = null`, then appends `final_report_created` and `artifact_created` events.

Auth requirements: authenticated owner.

Response:

```json
{
  "artifact": {
    "id": "artifact_uuid",
    "artifactType": "final_report",
    "name": "Dremo Final Report Stub",
    "storagePath": null
  },
  "report": {
    "mode": "stub",
    "eventCounts": {
      "total": 8,
      "byType": {
        "task_created": 1,
        "repo_scan_completed": 1
      }
    },
    "signals": {
      "hasSandboxLifecycle": true,
      "hasRepoScanCompleted": true,
      "hasApprovalEvents": false,
      "wasCancelled": false
    },
    "safety": {
      "noCommandExecution": true,
      "noFilesystemAccess": true,
      "noModelCalls": true,
      "noBillingChanges": true,
      "noStorageFileCreated": true
    }
  },
  "events": [
    { "eventType": "final_report_created" },
    { "eventType": "artifact_created" }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `task_not_found` | Missing or not owned by current user. |
| `report_metadata_too_large` | Generated metadata exceeded the bounded stub limit. |
| `report_artifact_create_failed` | Artifact metadata row could not be created. |

Ownership and security rules: report creation is backend/service-role-owned. The stub must not store raw event payloads, execute commands, read files, create storage objects, call models, or mutate billing.

## GET /dremo/tasks/:taskId/report

Purpose: fetch the final task report.

Current stub behavior: returns the latest `final_report` artifact metadata and its embedded report object if one has been finalized.

Auth requirements: authenticated owner.

Response:

```json
{
  "report": {
    "mode": "stub",
    "title": "Stub task",
    "eventCounts": {
      "total": 8
    },
    "safety": {
      "noModelCalls": true
    }
  }
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `report_not_ready` | Task has not produced a final report yet. |
| `task_not_found` | Missing or not owned by current user. |

Ownership and security rules: final report content should be generated and stored by the backend, not reconstructed from untrusted browser state.
