# Proposed Dremo API Contract

Status: proposed contract with a server-owned stub foundation.

Implementation note: `supabase/functions/dremo-api/index.ts` currently provides a stub-only Edge Function for authenticated task creation, task reads, event reads, and task cancellation. Event appends and status transitions are backed by service-role-only Postgres RPCs so sequence assignment and cancellation events are server-owned. It intentionally does not run sandbox execution, call models, charge credits, or replace Code Architect AI branding.

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

Purpose: list generated artifacts.

Auth requirements: authenticated owner.

Response:

```json
{
  "artifacts": [
    {
      "id": "artifact_123",
      "kind": "patch",
      "name": "changes.diff",
      "sizeBytes": 8200,
      "downloadUrl": "signed-url",
      "expiresAt": "2026-04-28T00:15:00Z"
    }
  ]
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `task_not_found` | Missing or not owned by current user. |
| `artifact_store_unavailable` | Artifact metadata exists but signed URLs cannot be created. |

Ownership and security rules: artifact URLs must be signed, short-lived, and scoped to the owner.

## GET /dremo/tasks/:taskId/report

Purpose: fetch the final task report.

Auth requirements: authenticated owner.

Response:

```json
{
  "report": {
    "taskId": "task_123",
    "summary": "Tests were fixed by updating the parser fallback.",
    "filesChanged": ["src/parser.ts"],
    "verification": {
      "status": "passed",
      "commands": ["npm run typecheck", "npm test"]
    },
    "risks": [],
    "createdAt": "2026-04-28T00:10:00Z"
  }
}
```

Error cases:

| Code | Meaning |
| --- | --- |
| `report_not_ready` | Task has not produced a final report yet. |
| `task_not_found` | Missing or not owned by current user. |

Ownership and security rules: final report content should be generated and stored by the backend, not reconstructed from untrusted browser state.
