# Architecture Decision Records

Status: documentation index.

Architecture Decision Records (ADRs) capture important architectural choices, the context behind them, and the safety or operational consequences that future PRs must preserve.

ADRs are documentation-only unless a specific ADR-linked implementation PR says otherwise. Adding or updating an ADR must not change runtime behavior by itself.

## Current ADRs

| ADR | Status | Decision |
| --- | --- | --- |
| [ADR 0001: Dremo local-dev worker boundary and Docker smoke lifecycle](./0001-dremo-local-dev-worker-boundary.md) | Accepted | Keep local-dev execution outside the browser bundle, behind reviewed worker gates, exact command capabilities, deterministic verification, and non-uploading telemetry schema fixtures. |
