-- Lumixia Dashboard v1 - Execution tables repair
-- Run this if sql/ops/dashboard_verify_v1.sql still shows null for:
--   public.execution_sessions
--   public.execution_logs
--
-- Security note:
-- This repair keeps execution writes server-owned. Authenticated clients may
-- read their own sessions/logs, but only the service-role execution backend
-- may insert or update execution audit records.

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

create table if not exists public.execution_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  agent_name text not null,
  status text not null default 'idle' check (status in ('idle', 'booting', 'running', 'completed', 'failed')),
  execution_cost integer not null default 150,
  provider_mode text not null default 'mock' check (provider_mode in ('mock', 'api')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.execution_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.execution_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'system' check (kind in ('system', 'progress', 'success', 'error')),
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists execution_sessions_user_created_idx
  on public.execution_sessions(user_id, created_at desc);

create index if not exists execution_logs_session_created_idx
  on public.execution_logs(session_id, created_at);

drop trigger if exists execution_sessions_touch_updated_at on public.execution_sessions;
create trigger execution_sessions_touch_updated_at
before update on public.execution_sessions
for each row execute function public.touch_updated_at();

alter table public.execution_sessions enable row level security;
alter table public.execution_logs enable row level security;

drop policy if exists "Users can view own execution sessions" on public.execution_sessions;
create policy "Users can view own execution sessions"
on public.execution_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own execution sessions" on public.execution_sessions;

drop policy if exists "Users can update own execution sessions" on public.execution_sessions;

drop policy if exists "Users can view own execution logs" on public.execution_logs;
create policy "Users can view own execution logs"
on public.execution_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own execution logs" on public.execution_logs;

revoke all on public.execution_sessions from public;
revoke all on public.execution_logs from public;
revoke all on public.execution_sessions from anon;
revoke all on public.execution_logs from anon;
revoke all on public.execution_sessions from authenticated;
revoke all on public.execution_logs from authenticated;
grant select on public.execution_sessions to authenticated;
grant select on public.execution_logs to authenticated;
grant select, insert, update on public.execution_sessions to service_role;
grant select, insert, update on public.execution_logs to service_role;
