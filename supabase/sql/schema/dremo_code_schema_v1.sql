-- Lumixia Dremo Code v1 - Database foundation
-- Schema-only foundation for the future Dremo Code workspace.
--
-- Important:
-- - Code Architect AI is not renamed by this migration.
-- - Dremo backend / service role owns all trusted writes.
-- - Browser clients can only read their own Dremo records through RLS.
-- - Browser clients must request actions through authenticated APIs, not table writes.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$fn$;

create table if not exists public.dremo_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (
    status in (
      'created',
      'queued',
      'planning',
      'awaiting_approval',
      'running',
      'verifying',
      'repairing',
      'completed',
      'failed',
      'cancelled'
    )
  ),
  title text,
  prompt text not null,
  repo_url text,
  repo_branch text,
  sandbox_id text,
  model_provider text,
  model_id text,
  credit_state text not null default 'not_required' check (
    credit_state in (
      'not_required',
      'quoted',
      'reserved',
      'running',
      'completed_charged',
      'failed_refunded',
      'cancelled_released',
      'disputed',
      'manual_review'
    )
  ),
  credit_reservation_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  cancelled_at timestamptz,
  failure_reason text,
  constraint dremo_tasks_terminal_status_timestamps_check check (
    (status = 'completed' and completed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null and completed_at is null)
    or (status not in ('completed', 'cancelled'))
  )
);

create table if not exists public.dremo_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.dremo_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence bigint not null check (sequence > 0),
  event_type text not null check (
    event_type in (
      'task_created',
      'task_started',
      'repo_scanned',
      'plan_created',
      'approval_required',
      'approval_resolved',
      'tool_call_started',
      'tool_call_output',
      'tool_call_completed',
      'terminal_output',
      'file_read',
      'file_changed',
      'diff_created',
      'verification_started',
      'verification_result',
      'self_review_started',
      'self_review_result',
      'repair_started',
      'final_report_created',
      'artifact_created',
      'task_completed',
      'task_failed',
      'task_cancelled'
    )
  ),
  channel text not null check (
    channel in (
      'system',
      'agent',
      'terminal',
      'tool',
      'approval',
      'artifact',
      'billing'
    )
  ),
  severity text not null default 'info' check (
    severity in ('debug', 'info', 'warning', 'error')
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dremo_task_events_task_sequence_key unique (task_id, sequence)
);

create table if not exists public.dremo_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.dremo_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  approval_type text not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')
  ),
  risk_level text not null default 'medium' check (
    risk_level in ('low', 'medium', 'high', 'critical')
  ),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  constraint dremo_approvals_resolution_check check (
    (status = 'pending' and resolved_at is null)
    or (status <> 'pending' and resolved_at is not null)
  )
);

create table if not exists public.dremo_artifacts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.dremo_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null check (
    artifact_type in (
      'final_report',
      'diff',
      'log',
      'generated_file',
      'archive',
      'screenshot',
      'external_link',
      'pr_reference'
    )
  ),
  name text not null,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dremo_sandbox_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.dremo_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_sandbox_id text,
  status text not null check (
    status in (
      'creating',
      'ready',
      'running',
      'stopping',
      'stopped',
      'destroyed',
      'failed',
      'quarantined'
    )
  ),
  resource_limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  stopped_at timestamptz,
  failure_reason text,
  constraint dremo_sandbox_sessions_timestamps_check check (
    (started_at is null or started_at >= created_at)
    and (stopped_at is null or started_at is null or stopped_at >= started_at)
  )
);

create table if not exists public.dremo_model_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.dremo_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model_id text not null,
  phase text not null check (
    phase in (
      'planning',
      'repo_scan',
      'coding',
      'tool_selection',
      'verification',
      'self_review',
      'repair',
      'summarization',
      'final_report'
    )
  ),
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost numeric check (estimated_cost is null or estimated_cost >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dremo_model_runs_token_total_check check (
    total_tokens is null
    or (
      coalesce(prompt_tokens, 0) + coalesce(completion_tokens, 0) = total_tokens
    )
  )
);

drop trigger if exists dremo_tasks_touch_updated_at on public.dremo_tasks;
create trigger dremo_tasks_touch_updated_at
before update on public.dremo_tasks
for each row execute function public.touch_updated_at();

create index if not exists dremo_tasks_user_created_idx
  on public.dremo_tasks(user_id, created_at desc);

create index if not exists dremo_tasks_user_status_idx
  on public.dremo_tasks(user_id, status);

create index if not exists dremo_task_events_task_sequence_idx
  on public.dremo_task_events(task_id, sequence);

create index if not exists dremo_task_events_user_created_idx
  on public.dremo_task_events(user_id, created_at desc);

create index if not exists dremo_approvals_task_status_idx
  on public.dremo_approvals(task_id, status);

create index if not exists dremo_artifacts_task_created_idx
  on public.dremo_artifacts(task_id, created_at desc);

create index if not exists dremo_sandbox_sessions_task_idx
  on public.dremo_sandbox_sessions(task_id);

create index if not exists dremo_model_runs_task_created_idx
  on public.dremo_model_runs(task_id, created_at desc);

alter table public.dremo_tasks enable row level security;
alter table public.dremo_task_events enable row level security;
alter table public.dremo_approvals enable row level security;
alter table public.dremo_artifacts enable row level security;
alter table public.dremo_sandbox_sessions enable row level security;
alter table public.dremo_model_runs enable row level security;

drop policy if exists "Users can view own Dremo tasks" on public.dremo_tasks;
create policy "Users can view own Dremo tasks"
on public.dremo_tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own Dremo task events" on public.dremo_task_events;
create policy "Users can view own Dremo task events"
on public.dremo_task_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own Dremo approvals" on public.dremo_approvals;
create policy "Users can view own Dremo approvals"
on public.dremo_approvals
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own Dremo artifacts" on public.dremo_artifacts;
create policy "Users can view own Dremo artifacts"
on public.dremo_artifacts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own Dremo sandbox sessions" on public.dremo_sandbox_sessions;
create policy "Users can view own Dremo sandbox sessions"
on public.dremo_sandbox_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own Dremo model runs" on public.dremo_model_runs;
create policy "Users can view own Dremo model runs"
on public.dremo_model_runs
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.dremo_tasks from public;
revoke all on public.dremo_task_events from public;
revoke all on public.dremo_approvals from public;
revoke all on public.dremo_artifacts from public;
revoke all on public.dremo_sandbox_sessions from public;
revoke all on public.dremo_model_runs from public;

revoke all on public.dremo_tasks from anon;
revoke all on public.dremo_task_events from anon;
revoke all on public.dremo_approvals from anon;
revoke all on public.dremo_artifacts from anon;
revoke all on public.dremo_sandbox_sessions from anon;
revoke all on public.dremo_model_runs from anon;

revoke all on public.dremo_tasks from authenticated;
revoke all on public.dremo_task_events from authenticated;
revoke all on public.dremo_approvals from authenticated;
revoke all on public.dremo_artifacts from authenticated;
revoke all on public.dremo_sandbox_sessions from authenticated;
revoke all on public.dremo_model_runs from authenticated;

grant select on public.dremo_tasks to authenticated;
grant select on public.dremo_task_events to authenticated;
grant select on public.dremo_approvals to authenticated;
grant select on public.dremo_artifacts to authenticated;
grant select on public.dremo_sandbox_sessions to authenticated;
grant select on public.dremo_model_runs to authenticated;

grant select, insert, update, delete on public.dremo_tasks to service_role;
grant select, insert, update, delete on public.dremo_task_events to service_role;
grant select, insert, update, delete on public.dremo_approvals to service_role;
grant select, insert, update, delete on public.dremo_artifacts to service_role;
grant select, insert, update, delete on public.dremo_sandbox_sessions to service_role;
grant select, insert, update, delete on public.dremo_model_runs to service_role;

comment on table public.dremo_tasks is
  'Dremo Code task records. Trusted writes are owned by the Dremo backend/service role.';

comment on table public.dremo_task_events is
  'Append-only structured Dremo event stream. Browser clients may read own rows but must not insert trusted runtime events.';

comment on table public.dremo_approvals is
  'Human-in-the-loop Dremo approval requests and decisions. Resolution should happen through authenticated Dremo APIs.';

comment on table public.dremo_artifacts is
  'Dremo artifact metadata for reports, diffs, logs, files, archives, and external links.';

comment on table public.dremo_sandbox_sessions is
  'Dremo sandbox lifecycle records. Provider internals must stay backend-owned.';

comment on table public.dremo_model_runs is
  'Dremo model run audit and cost metadata. Sensitive prompts/responses should not be stored here by default.';
