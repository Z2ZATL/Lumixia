# Proposed Dremo Code Migration Plan

Status: proposed.

Code Architect AI must remain the visible production name until Dremo has server-owned execution, structured events, sandbox lifecycle, and trusted credit accounting.

## Phase 0: Completed Pre-Dremo Hardening

| Item | Details |
| --- | --- |
| Goal | Harden the current execution path enough to avoid client-owned runtime facts. |
| Files expected to change | Already completed in prior hardening work. |
| Exit criteria | `execution-api` validates Supabase JWT; execution tables allow owner-only reads; client cannot insert/update logs/sessions. |
| Risks | Deployed SQL/functions can drift from repo if not verified regularly. |
| Verification steps | Confirm RLS, grants, Supabase functions, and mock workspace behavior. |

## Phase 1: Docs/spec Only

| Item | Details |
| --- | --- |
| Goal | Define architecture and migration plan before implementation. |
| Files expected to change | `docs/dremo-code/*` only. |
| Exit criteria | Architecture, API, events, schema, sandbox, billing, frontend, migration, and open questions are documented. |
| Risks | Docs become stale if implementation starts without updating specs. |
| Verification steps | Confirm docs-only diff and review with product/security/engineering. |

## Phase 2: `dremo_*` Schema Migration

| Item | Details |
| --- | --- |
| Goal | Add future Dremo tables with safe RLS and service-owned writes. |
| Files expected to change | New Supabase SQL migration files and verification scripts. |
| Exit criteria | Users can select own Dremo rows; users cannot forge runtime events; service role can write. |
| Risks | Accidentally granting client inserts or exposing another user's task events. |
| Verification steps | RLS tests for select/insert/update across owner and non-owner cases. |

## Phase 3: Dremo API Stub With Server-owned Events

| Item | Details |
| --- | --- |
| Goal | Add `/dremo/*` API routes that create tasks and append structured events without real sandbox execution. |
| Files expected to change | Supabase functions or backend service code, API tests, frontend API client if needed. |
| Exit criteria | Authenticated task creation works; event stream/polling returns ordered events; frontend cannot write events directly. |
| Risks | Stub could be mistaken for real Dremo if UI copy is unclear. |
| Verification steps | JWT validation, ownership checks, event ordering, idempotency tests. |

## Phase 4: Dremo Workspace Frontend Using Event Stream

| Item | Details |
| --- | --- |
| Goal | Build a read-only event-rendering workspace behind current Code Architect branding or a clearly labeled preview. |
| Files expected to change | Workspace UI components, route loading, event client, responsive styles. |
| Exit criteria | Workspace can render task, timeline, terminal, approvals, diffs, artifacts, and reports from API data. |
| Risks | Mobile layout could regress if desktop panels are squeezed instead of tabbed. |
| Verification steps | Responsive QA at 320, 375, 430, 768, 1024, 1366, and 1440+ widths. |

## Phase 5: Sandbox Runner Prototype

| Item | Details |
| --- | --- |
| Goal | Add a local/dev sandbox prototype after the provider decision record. Docker is allowed only for developer validation, not production multi-tenant execution. |
| Files expected to change | Sandbox runner interface, local/dev policy config, provider adapter stubs, security policy docs, and later local Docker prototype code. |
| Current status | PR #13 adds the TypeScript runner interface, static default policy, pure event mapping helpers, and a noop runner that blocks command requests. |
| Exit criteria | Interface exists before execution; first real local/dev prototype runs only allowlisted harmless commands with strict CPU, memory, timeout, output, artifact, network, and cleanup controls. |
| Risks | Secret leakage, weak isolation, runaway processes, excessive cost, or treating local Docker as production-ready. |
| Verification steps | Confirm no production secrets in sandbox, command timeout tests, output truncation tests, blocked path tests, default-deny network tests, cleanup tests. |

## Phase 5.5: Hosted Sandbox Evaluation

| Item | Details |
| --- | --- |
| Goal | Compare E2B and Daytona before selecting a production provider. |
| Files expected to change | Evaluation docs, benchmark scripts or test harnesses, provider risk review, cost model notes. |
| Exit criteria | Measured startup latency, streaming behavior, filesystem controls, network controls, artifact export, cleanup guarantees, and pricing. |
| Risks | Choosing a provider before proving isolation, cost, and operational fit. |
| Verification steps | Provider security review, trial workloads, egress tests, cleanup tests, audit/event mapping tests. |

## Phase 6: Verification and Self-review Loop

| Item | Details |
| --- | --- |
| Goal | Add test/check execution, self-review events, and safe repair loop. |
| Files expected to change | Orchestrator, verifier, model routing, event renderer. |
| Exit criteria | Tasks can run checks, produce verification results, self-review, and repair when safe. |
| Risks | Infinite repair loops or misleading success reports. |
| Verification steps | Max repair attempts, failed test handling, final report accuracy tests. |

## Phase 7: Rename Code Architect AI to Dremo Code

| Item | Details |
| --- | --- |
| Goal | Rename production branding only after Dremo is a real server-owned product surface. |
| Files expected to change | Dashboard seed/content, UI labels, docs, route aliases if needed. |
| Exit criteria | Backend owns execution/events/credits; sandbox is production-approved; billing is audited. |
| Risks | Premature branding creates user trust and billing expectations before product is ready. |
| Verification steps | Full end-to-end Dremo task, credit charge/refund, event audit, and responsive QA. |

## Phase 8: Production Hardening and Abuse Testing

| Item | Details |
| --- | --- |
| Goal | Prepare Dremo for live users and adversarial inputs. |
| Files expected to change | Security tests, monitoring, rate limits, abuse prevention, runbooks. |
| Exit criteria | Load tests, abuse tests, billing reconciliation, incident runbooks, and monitoring dashboards are ready. |
| Risks | High-cost workloads, malicious repos, prompt injection, credential exfiltration. |
| Verification steps | Red-team tests, billing reconciliation tests, sandbox cleanup tests, security review signoff. |

## Release Gate Before Public Dremo Branding

| Gate | Must be true |
| --- | --- |
| Server-owned execution | Frontend cannot write trusted task status/events. |
| Structured event stream | UI renders ordered Dremo events from backend. |
| Sandbox isolation | Production sandbox provider and policy are approved. |
| Billing safety | Credits are reserved, charged, released, and refunded by backend only. |
| Auditability | Every privileged action maps to event, user, task, and timestamp. |
| Responsive UX | Mobile uses tabbed workspace and no hidden CTAs. |
