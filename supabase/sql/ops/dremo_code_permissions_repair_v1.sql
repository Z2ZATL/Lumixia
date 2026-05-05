-- Lumixia Dremo Code v1 - Permissions repair
-- Re-apply intended Dremo grants/revokes without opening client write access.
--
-- Run after supabase/sql/schema/dremo_code_schema_v1.sql if permissions drift,
-- RLS policies are missing, or REST reads return unexpected authorization errors.

alter table if exists public.dremo_tasks enable row level security;
alter table if exists public.dremo_task_events enable row level security;
alter table if exists public.dremo_approvals enable row level security;
alter table if exists public.dremo_artifacts enable row level security;
alter table if exists public.dremo_sandbox_sessions enable row level security;
alter table if exists public.dremo_model_runs enable row level security;

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

-- Dremo runtime writes are trusted backend writes only.
-- Anonymous users get no direct table privileges.
-- Authenticated browser clients get owner-only SELECT through RLS and no writes.
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

revoke all on function public.append_dremo_task_event(uuid, uuid, text, text, text, jsonb) from public;
revoke all on function public.append_dremo_task_event(uuid, uuid, text, text, text, jsonb) from anon;
revoke all on function public.append_dremo_task_event(uuid, uuid, text, text, text, jsonb) from authenticated;
grant execute on function public.append_dremo_task_event(uuid, uuid, text, text, text, jsonb) to service_role;

revoke all on function public.transition_dremo_task_status(uuid, uuid, text, text, text, text, jsonb) from public;
revoke all on function public.transition_dremo_task_status(uuid, uuid, text, text, text, text, jsonb) from anon;
revoke all on function public.transition_dremo_task_status(uuid, uuid, text, text, text, text, jsonb) from authenticated;
grant execute on function public.transition_dremo_task_status(uuid, uuid, text, text, text, text, jsonb) to service_role;
