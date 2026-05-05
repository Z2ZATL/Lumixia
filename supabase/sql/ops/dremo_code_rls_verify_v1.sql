-- Lumixia Dremo Code v1 - RLS verification helper
-- This file is read-only diagnostics only. It does not insert, update, or delete data.
--
-- Expected results after applying:
--   supabase/sql/schema/dremo_code_schema_v1.sql
--   supabase/sql/ops/dremo_code_permissions_repair_v1.sql
--
-- 1. All six public.dremo_* tables resolve.
-- 2. RLS is enabled on every table.
-- 3. Each table has exactly one authenticated SELECT policy using auth.uid() = user_id.
-- 4. anon has no privileges on dremo_* tables.
-- 5. authenticated has SELECT only and no INSERT/UPDATE/DELETE.
-- 6. service_role has SELECT/INSERT/UPDATE/DELETE for backend-owned writes.
--
-- Manual REST/API checks to run separately with real tokens:
--   - Authenticated user can SELECT their own dremo_* rows.
--   - Authenticated user cannot SELECT another user's dremo_* rows.
--   - Authenticated user cannot INSERT dremo_task_events.
--   - Authenticated user cannot UPDATE dremo_tasks.
--   - service role / future Dremo backend can INSERT events and UPDATE task status.

select
  checks.schema_name,
  to_regclass(checks.schema_name) as resolved_name
from (
  values
    ('public.dremo_tasks'),
    ('public.dremo_task_events'),
    ('public.dremo_approvals'),
    ('public.dremo_artifacts'),
    ('public.dremo_sandbox_sessions'),
    ('public.dremo_model_runs')
) as checks(schema_name);

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'dremo_tasks',
    'dremo_task_events',
    'dremo_approvals',
    'dremo_artifacts',
    'dremo_sandbox_sessions',
    'dremo_model_runs'
  )
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'dremo_tasks',
    'dremo_task_events',
    'dremo_approvals',
    'dremo_artifacts',
    'dremo_sandbox_sessions',
    'dremo_model_runs'
  )
order by tablename, policyname;

select
  grantee,
  table_name,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'dremo_tasks',
    'dremo_task_events',
    'dremo_approvals',
    'dremo_artifacts',
    'dremo_sandbox_sessions',
    'dremo_model_runs'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;

select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'dremo_tasks',
    'dremo_task_events',
    'dremo_approvals',
    'dremo_artifacts',
    'dremo_sandbox_sessions',
    'dremo_model_runs'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_name, grantee
order by table_name, grantee;

select
  'anon privilege leak' as check_name,
  count(*) as finding_count
from information_schema.table_privileges
where table_schema = 'public'
  and table_name like 'dremo_%'
  and grantee = 'anon';

select
  'authenticated write privilege leak' as check_name,
  count(*) as finding_count
from information_schema.table_privileges
where table_schema = 'public'
  and table_name like 'dremo_%'
  and grantee = 'authenticated'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
