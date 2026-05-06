# Dremo Code Open Questions

Status: proposed.

These decisions should be resolved before production implementation or before renaming Code Architect AI to Dremo Code.

## Product and UX

| Question | Why it matters | Suggested next step |
| --- | --- | --- |
| Should Dremo support GitHub repo connect, local repo upload, or both? | Determines auth, storage, sandbox ingestion, and privacy model. | Start with GitHub connect plus limited file upload prototype. |
| Should Dremo expose model choices or strategy tiers? | Raw model selection can confuse users and weaken policy control. | Prefer strategy tiers: fast, balanced, deep review. |
| How much reasoning/planning should be visible? | Premium users need trust, but raw chain-of-thought should not be exposed. | Show concise plans, decisions, and audit events, not hidden reasoning. |
| Should mobile support full execution control? | Mobile can be hard for diff and approval-heavy work. | Support monitoring, approvals, and reports first; advanced diff review can be progressive. |

## Sandbox and Runtime

Resolved direction: `sandbox-provider-decision.md` now defines Docker as local/dev prototype only, E2B/Daytona as the first hosted evaluation targets, and a managed isolated sandbox provider or dedicated worker pool as the production path. Supabase Edge Functions and Vercel Functions remain orchestration/API only.

| Question | Why it matters | Suggested next step |
| --- | --- | --- |
| E2B or Daytona for first hosted evaluation? | The production provider is not permanently selected, but the candidate set is narrowed. | Benchmark startup time, streaming, filesystem controls, egress policy, artifact export, pricing, and cleanup reliability. |
| Should Lumixia self-host a sandbox worker pool later? | Self-hosting could improve control but increases security and operations burden. | Keep as fallback if managed sandbox providers cannot meet isolation, cost, or workflow requirements. |
| What should the local Docker prototype include? | Local Docker is useful but must not become accidental production. | Start with runner interfaces and harmless allowlisted commands only. |
| What queue/job system should orchestrate long-running tasks? | Dremo tasks need durable progress, retries, cancellation, and recovery. | Evaluate Supabase-compatible queues, dedicated workers, or managed workflow systems. |
| What network egress policy should be default? | Package installs may need network, but egress can leak data. | Default deny except package registries and approved destinations. |
| How should command approvals be scoped? | Over-broad approvals can become unsafe. | Use single-action approvals first. |

## Storage and Artifacts

| Question | Why it matters | Suggested next step |
| --- | --- | --- |
| Where should artifacts live? | Reports, patches, screenshots, and logs need secure download and retention. | Evaluate Supabase Storage first, then external object storage if limits require. |
| How long should terminal logs be retained? | Logs can include secrets or private code. | Define retention tiers and redaction/quarantine workflow. |
| Should full workspace archives be downloadable? | Useful for users but risky for data leakage and size. | Disable by default until policy is mature. |

## Model Routing

| Question | Why it matters | Suggested next step |
| --- | --- | --- |
| Which model providers should be allowed? | Affects privacy, latency, capability, and cost. | Start with a small allowlist and per-purpose routing. |
| Should model prompts include full repo context? | Full context increases quality but raises privacy and cost concerns. | Use retrieval/scoped file selection and audit file reads. |
| How should failed verification trigger repair? | Unbounded repair can burn credits and time. | Cap attempts and emit clear repair events. |

## Credits and Billing

| Question | Why it matters | Suggested next step |
| --- | --- | --- |
| Should Dremo use fixed task pricing or metered credits? | Pricing changes UX expectations and ledger complexity. | Begin with quoted/reserved fixed bands, then evaluate metered add-ons. |
| Should failed tasks always refund? | Some failures happen after costly billable work. | Define policy by failure phase and user-visible billing state. |
| How should free-tier or student usage work safely? | Free execution can be abused. | Use strict caps, lightweight sandboxes, and no external publication. |

## GitHub and PR Integration

| Question | Why it matters | Suggested next step |
| --- | --- | --- |
| Should Dremo create PRs directly? | PR creation is external publication and needs approvals. | Require explicit approval and narrow GitHub scopes. |
| Should Dremo push branches or return patches only? | Branch pushes are convenient but higher risk. | Start with patch artifacts, then add branch/PR flow after approval system. |
| How should GitHub credentials be stored? | Token security is critical. | Use provider OAuth with scoped tokens and never expose tokens to sandbox. |

## Legacy Compatibility

| Question | Why it matters | Suggested next step |
| --- | --- | --- |
| Should `execution_sessions` remain as compatibility views? | Existing workspace code may rely on old shape. | Prefer temporary compatibility views or adapter layer during migration. |
| When should Code Architect AI be removed? | Premature removal can break current demo UX. | Remove only after Dremo workspace has feature parity and safe backend. |
| Should Dremo route live under `/dashboard/workspace/code-architect` initially? | Route stability reduces migration risk. | Keep route alias until rename phase. |
