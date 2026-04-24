-- Lumixia Dashboard v1 - Schema first
-- Run this file first in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists credits_balance integer;

update public.profiles
set credits_balance = coalesce(credits_balance, 0);

alter table public.profiles
  alter column credits_balance set default 0;

alter table public.profiles
  alter column credits_balance set not null;

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_balance integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_user_id uuid not null references public.credit_accounts(user_id) on delete cascade,
  entry_kind text not null check (
    entry_kind in (
      'initial_grant',
      'migration_grant',
      'manual_adjustment',
      'agent_execution_debit',
      'agent_execution_refund',
      'top_up'
  )
  ),
  delta integer not null,
  balance_after integer not null,
  reference_type text,
  reference_id text,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$fn$;

create table if not exists public.dashboard_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dashboard_agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  author_name text not null,
  icon_name text not null,
  artwork_url text not null,
  category text not null,
  summary text,
  hero_badge text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  launch_mode text not null default 'locked' check (launch_mode in ('workspace', 'locked')),
  locked_message text,
  execution_cost integer not null default 150,
  workspace_title text,
  workspace_subtitle text,
  preview_code text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dashboard_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.dashboard_sections(id) on delete cascade,
  agent_id uuid not null references public.dashboard_agents(id) on delete cascade,
  position integer not null default 0,
  card_variant text not null default 'standard' check (card_variant in ('featured', 'standard')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (section_id, position)
);

create table if not exists public.dashboard_trending_searches (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  icon_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_dashboard_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_route text not null default '/dashboard',
  right_rail_collapsed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_lifestyle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text not null,
  emoji text not null,
  status text not null default 'upcoming',
  sort_order integer not null default 0,
  starts_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

create index if not exists dashboard_sections_sort_order_idx
  on public.dashboard_sections(sort_order);

create index if not exists dashboard_agents_sort_order_idx
  on public.dashboard_agents(sort_order);

create index if not exists dashboard_section_items_section_position_idx
  on public.dashboard_section_items(section_id, position);

create index if not exists user_lifestyle_events_user_sort_idx
  on public.user_lifestyle_events(user_id, sort_order);

create index if not exists credit_accounts_balance_idx
  on public.credit_accounts(available_balance);

create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger(user_id, created_at desc);

create index if not exists credit_ledger_account_created_idx
  on public.credit_ledger(account_user_id, created_at desc);

create index if not exists execution_sessions_user_created_idx
  on public.execution_sessions(user_id, created_at desc);

create index if not exists execution_logs_session_created_idx
  on public.execution_logs(session_id, created_at);

drop trigger if exists dashboard_sections_touch_updated_at on public.dashboard_sections;
create trigger dashboard_sections_touch_updated_at
before update on public.dashboard_sections
for each row execute function public.touch_updated_at();

drop trigger if exists dashboard_agents_touch_updated_at on public.dashboard_agents;
create trigger dashboard_agents_touch_updated_at
before update on public.dashboard_agents
for each row execute function public.touch_updated_at();

drop trigger if exists dashboard_section_items_touch_updated_at on public.dashboard_section_items;
create trigger dashboard_section_items_touch_updated_at
before update on public.dashboard_section_items
for each row execute function public.touch_updated_at();

drop trigger if exists dashboard_trending_searches_touch_updated_at on public.dashboard_trending_searches;
create trigger dashboard_trending_searches_touch_updated_at
before update on public.dashboard_trending_searches
for each row execute function public.touch_updated_at();

drop trigger if exists user_dashboard_preferences_touch_updated_at on public.user_dashboard_preferences;
create trigger user_dashboard_preferences_touch_updated_at
before update on public.user_dashboard_preferences
for each row execute function public.touch_updated_at();

drop trigger if exists user_lifestyle_events_touch_updated_at on public.user_lifestyle_events;
create trigger user_lifestyle_events_touch_updated_at
before update on public.user_lifestyle_events
for each row execute function public.touch_updated_at();

drop trigger if exists credit_accounts_touch_updated_at on public.credit_accounts;
create trigger credit_accounts_touch_updated_at
before update on public.credit_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists execution_sessions_touch_updated_at on public.execution_sessions;
create trigger execution_sessions_touch_updated_at
before update on public.execution_sessions
for each row execute function public.touch_updated_at();

insert into public.credit_accounts (user_id, available_balance)
select
  auth_users.id,
  coalesce(profiles.credits_balance, 0)
from auth.users as auth_users
left join public.profiles as profiles
  on profiles.id = auth_users.id
on conflict (user_id) do nothing;

insert into public.credit_ledger (
  user_id,
  account_user_id,
  entry_kind,
  delta,
  balance_after,
  reference_type,
  reference_id,
  idempotency_key,
  metadata
)
select
  credit_accounts.user_id,
  credit_accounts.user_id,
  'migration_grant',
  credit_accounts.available_balance,
  credit_accounts.available_balance,
  'migration',
  credit_accounts.user_id::text,
  concat('migration-balance-', credit_accounts.user_id::text),
  jsonb_build_object(
    'source',
    'profiles.credits_balance',
    'migration_version',
    'credits_hardening_v1'
  )
from public.credit_accounts
where credit_accounts.available_balance > 0
  and not exists (
  select 1
  from public.credit_ledger
  where credit_ledger.idempotency_key =
    concat('migration-balance-', credit_accounts.user_id::text)
);

create or replace function public.handle_new_credit_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.credit_accounts (user_id, available_balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created_credit_account on auth.users;
create trigger on_auth_user_created_credit_account
after insert on auth.users
for each row execute function public.handle_new_credit_account();

alter table public.dashboard_sections enable row level security;
alter table public.dashboard_agents enable row level security;
alter table public.dashboard_section_items enable row level security;
alter table public.dashboard_trending_searches enable row level security;
alter table public.user_dashboard_preferences enable row level security;
alter table public.user_lifestyle_events enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.execution_sessions enable row level security;
alter table public.execution_logs enable row level security;

drop policy if exists "Authenticated users can read dashboard sections" on public.dashboard_sections;
create policy "Authenticated users can read dashboard sections"
on public.dashboard_sections
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read dashboard agents" on public.dashboard_agents;
create policy "Authenticated users can read dashboard agents"
on public.dashboard_agents
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read dashboard section items" on public.dashboard_section_items;
create policy "Authenticated users can read dashboard section items"
on public.dashboard_section_items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read dashboard trending searches" on public.dashboard_trending_searches;
create policy "Authenticated users can read dashboard trending searches"
on public.dashboard_trending_searches
for select
to authenticated
using (true);

drop policy if exists "Users can view own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can view own dashboard preferences"
on public.user_dashboard_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can insert own dashboard preferences"
on public.user_dashboard_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own dashboard preferences" on public.user_dashboard_preferences;
create policy "Users can update own dashboard preferences"
on public.user_dashboard_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view own lifestyle events" on public.user_lifestyle_events;
create policy "Users can view own lifestyle events"
on public.user_lifestyle_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own lifestyle events" on public.user_lifestyle_events;
create policy "Users can insert own lifestyle events"
on public.user_lifestyle_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own lifestyle events" on public.user_lifestyle_events;
create policy "Users can update own lifestyle events"
on public.user_lifestyle_events
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view own credit account" on public.credit_accounts;
create policy "Users can view own credit account"
on public.credit_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own credit ledger" on public.credit_ledger;
create policy "Users can view own credit ledger"
on public.credit_ledger
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own execution sessions" on public.execution_sessions;
create policy "Users can view own execution sessions"
on public.execution_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own execution sessions" on public.execution_sessions;
create policy "Users can insert own execution sessions"
on public.execution_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own execution sessions" on public.execution_sessions;
create policy "Users can update own execution sessions"
on public.execution_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view own execution logs" on public.execution_logs;
create policy "Users can view own execution logs"
on public.execution_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own execution logs" on public.execution_logs;
create policy "Users can insert own execution logs"
on public.execution_logs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

grant select on public.dashboard_sections to authenticated;
grant select on public.dashboard_agents to authenticated;
grant select on public.dashboard_section_items to authenticated;
grant select on public.dashboard_trending_searches to authenticated;
grant select, insert, update on public.user_dashboard_preferences to authenticated;
grant select, insert, update on public.user_lifestyle_events to authenticated;
grant select on public.credit_accounts to authenticated;
grant select on public.credit_ledger to authenticated;
grant select, insert, update on public.execution_sessions to authenticated;
grant select, insert on public.execution_logs to authenticated;

create or replace function public.consume_agent_credits(
  agent_slug text,
  execution_session_id uuid,
  idempotency_key text
)
returns table (
  balance_after integer,
  debited_amount integer,
  ledger_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid;
  v_cost integer;
  v_current_balance integer;
  v_next_balance integer;
  v_existing_entry public.credit_ledger%rowtype;
  v_ledger_entry_id uuid;
  v_session public.execution_sessions%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authenticated user is required to consume credits.';
  end if;

  if coalesce(trim(idempotency_key), '') = '' then
    raise exception 'An idempotency key is required to consume credits.';
  end if;

  select *
  into v_existing_entry
  from public.credit_ledger
  where credit_ledger.user_id = v_user_id
    and credit_ledger.idempotency_key = consume_agent_credits.idempotency_key
  limit 1;

  if found then
    return query
    select
      v_existing_entry.balance_after,
      abs(v_existing_entry.delta),
      v_existing_entry.id;
    return;
  end if;

  select *
  into v_session
  from public.execution_sessions
  where execution_sessions.id = consume_agent_credits.execution_session_id
    and execution_sessions.user_id = v_user_id
  limit 1;

  if not found then
    raise exception 'Execution session not found for this user.';
  end if;

  if v_session.agent_slug <> consume_agent_credits.agent_slug then
    raise exception 'Execution session agent mismatch.';
  end if;

  select dashboard_agents.execution_cost
  into v_cost
  from public.dashboard_agents
  where dashboard_agents.slug = consume_agent_credits.agent_slug
    and dashboard_agents.is_active = true
    and dashboard_agents.launch_mode = 'workspace'
  limit 1;

  if v_cost is null then
    raise exception 'Agent pricing is not available for this workspace.';
  end if;

  select credit_accounts.available_balance
  into v_current_balance
  from public.credit_accounts
  where credit_accounts.user_id = v_user_id
  for update;

  if v_current_balance is null then
    raise exception 'Credit account not found for this user.';
  end if;

  if v_current_balance < v_cost then
    raise exception 'Not enough Lumixia Credits.';
  end if;

  v_next_balance := v_current_balance - v_cost;

  update public.credit_accounts
  set available_balance = v_next_balance
  where credit_accounts.user_id = v_user_id;

  insert into public.credit_ledger (
    user_id,
    account_user_id,
    entry_kind,
    delta,
    balance_after,
    reference_type,
    reference_id,
    idempotency_key,
    metadata
  )
  values (
    v_user_id,
    v_user_id,
    'agent_execution_debit',
    -v_cost,
    v_next_balance,
    'execution_session',
    consume_agent_credits.execution_session_id::text,
    consume_agent_credits.idempotency_key,
    jsonb_build_object(
      'agent_slug',
      consume_agent_credits.agent_slug,
      'execution_session_id',
      consume_agent_credits.execution_session_id
    )
  )
  returning credit_ledger.id
  into v_ledger_entry_id;

  return query
  select
    v_next_balance,
    v_cost,
    v_ledger_entry_id;
end;
$fn$;

revoke all on function public.consume_agent_credits(text, uuid, text) from public;
grant execute on function public.consume_agent_credits(text, uuid, text) to authenticated;
