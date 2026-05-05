# Proposed Dremo Frontend Workspace

Status: proposed.

The Dremo workspace should render server-owned task state and event streams. It should not mutate trusted runtime logs, task status, billing state, or artifacts directly.

## Current Frontend Stub

Lumixia includes an internal `/dashboard/dremo-lab` route for testing the deployed `dremo-api` stub. This lab can create stub tasks, refresh server-owned events, and cancel a task through authenticated Edge Function calls only. It is not the production Dremo workspace, does not run sandboxes or model calls, and does not replace Code Architect AI.

## Core Panels

| Panel | Purpose |
| --- | --- |
| Task input | Capture the user's coding goal, repo/source, constraints, and preferred mode. |
| Model selector | Let users choose approved strategy tiers, not arbitrary unsafe model/provider controls. |
| Plan panel | Show generated plan, risk level, and approval requirements. |
| Agent timeline | Render ordered task events. |
| Terminal panel | Display streamed terminal output from the sandbox. |
| Files panel | Show relevant files read/changed by the agent. |
| Diff viewer | Review proposed code changes. |
| Approval cards | Present scoped approvals for risky actions. |
| Verification/test panel | Show checks, test commands, failures, and repair attempts. |
| Final report panel | Summarize work, changed files, verification, risks, and next steps. |
| Artifact downloads | Provide signed downloads for patches, reports, logs, or screenshots. |

## Current Tool Approval Stub

The internal `/dashboard/dremo-lab` route includes a Tool Approval Stub section. It lets developers request low-risk stubbed tools or create pending approval cards for medium/high/critical tool requests. Approve/reject actions call `dremo-api` and only record the decision; the UI must continue to state clearly that no command, file, network, package, git, or model execution happens yet.

## Suggested Desktop Layout

```text
+--------------------------------------------------------------+
| Header: task title, status, credits, actions                 |
+----------------------+-------------------+-------------------+
| Plan / Timeline      | Terminal / Events | Files / Diff      |
|                      |                   |                   |
+----------------------+-------------------+-------------------+
| Verification / Self-review / Final Report                    |
+--------------------------------------------------------------+
```

## Mobile Requirement

Mobile must be tabbed, not a squeezed desktop split layout.

```text
+-----------------------------+
| Header / task status        |
+-----------------------------+
| Tabs: Plan Events Terminal  |
|       Files Diff Report     |
+-----------------------------+
| Active tab content          |
+-----------------------------+
| Sticky action bar           |
+-----------------------------+
```

## Responsive Requirements

| Width | Requirement |
| --- | --- |
| 320px mobile | Single-column tabbed interface; no horizontal scroll; sticky actions must not cover content. |
| 375px mobile | Terminal text wraps or scrolls inside panel; approval buttons stack. |
| 430px mobile | Tabs can scroll horizontally, but page itself should not. |
| 768px tablet | Two-pane layout allowed: timeline plus active detail panel. |
| 1024px small laptop | Three-pane layout allowed only if each pane remains readable. |
| 1366px desktop | Full workspace with timeline, terminal, files/diff, and report area. |
| 1440px+ desktop | Wider layout can add persistent right inspector and artifact drawer. |

## Interaction Rules

| Action | Frontend behavior |
| --- | --- |
| Start task | POST to Dremo API; do not create DB rows directly. |
| Cancel task | POST cancellation request; wait for server-owned final state. |
| Resolve approval | POST approval decision; show exact approved action. |
| View events | Subscribe/poll event API; keep last sequence checkpoint. |
| View artifact | Request signed URL from API; do not expose storage keys directly. |
| Retry failed task | Use API-provided retry affordance only when safe. |

## Accessibility

| Area | Requirement |
| --- | --- |
| Keyboard navigation | All tabs, approvals, terminal controls, and diff navigation must be keyboard accessible. |
| Screen readers | Task status and new important events should use polite live regions. |
| Reduced motion | Streaming and panel transitions should respect `prefers-reduced-motion`. |
| Contrast | Glass surfaces must maintain readable text contrast. |
| Focus management | Approval modals/cards must move focus predictably and restore focus on close. |
| Terminal | Output should be selectable and have copy controls with clear labels. |

## Empty, Loading, and Error States

| State | Requirement |
| --- | --- |
| No task selected | Explain how to start a Dremo task. |
| Task queued | Show queue state and estimated start if available. |
| Event stream reconnecting | Keep existing events visible and show reconnect status. |
| Sandbox unavailable | Explain that execution cannot safely start. |
| Billing unavailable | Prevent billable start and explain credit service issue. |
| Approval pending | Pause risky action and show exact decision needed. |
| Final report missing | Show task status and recovery action. |

## Performance Guidelines

| Area | Requirement |
| --- | --- |
| Event list | Virtualize long timelines and terminal logs. |
| Terminal output | Batch rendering of streaming chunks. |
| Diff viewer | Lazy-load large file diffs and collapse unchanged sections. |
| Artifact thumbnails | Load on demand. |
| Route loading | Lazy-load Dremo workspace bundle. |
| Mobile glass effects | Reduce blur intensity on low-power and reduced-motion environments. |
