-- Lumixia Credits Production Hardening v1
-- Apply this after sql/schema/dashboard_schema_v1.sql.
-- This migration upgrades the original dashboard/credits schema into a
-- production billing foundation with Stripe-backed top-ups, saved cards,
-- auto-reload policies, immutable credit grants, and billing documents.

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

create or replace function public.generate_document_number(prefix text)
returns text
language plpgsql
as $fn$
begin
  return upper(prefix)
    || '-'
    || to_char(timezone('utc', now()), 'YYYYMMDD')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
end;
$fn$;

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_balance integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'restricted', 'closed')),
  restricted_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.credit_accounts
  drop constraint if exists credit_accounts_available_balance_check;

alter table public.credit_accounts
  add column if not exists status text;

alter table public.credit_accounts
  add column if not exists restricted_reason text;

alter table public.credit_accounts
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.credit_accounts
set status = case
  when coalesce(available_balance, 0) < 0 then 'restricted'
  else 'active'
end
where status is null
   or status not in ('active', 'restricted', 'closed');

alter table public.credit_accounts
  alter column status set default 'active';

alter table public.credit_accounts
  alter column status set not null;

alter table public.credit_accounts
  drop constraint if exists credit_accounts_status_check;

alter table public.credit_accounts
  add constraint credit_accounts_status_check
  check (status in ('active', 'restricted', 'closed'));

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_user_id uuid not null references public.credit_accounts(user_id) on delete cascade,
  entry_kind text not null check (
    entry_kind in (
      'promo_grant',
      'migration_grant',
      'top_up_grant',
      'top_up_reversal',
      'usage_debit',
      'usage_refund',
      'expiry_debit',
      'manual_adjustment'
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

create unique index if not exists credit_ledger_single_execution_refund_idx
  on public.credit_ledger(user_id, reference_id, entry_kind)
  where reference_type = 'execution_session' and entry_kind = 'usage_refund';

update public.credit_ledger
set entry_kind = case
  when entry_kind = 'top_up' then 'top_up_grant'
  when entry_kind = 'agent_execution_debit' then 'usage_debit'
  when entry_kind = 'agent_execution_refund' then 'usage_refund'
  when entry_kind = 'initial_grant' then 'migration_grant'
  else entry_kind
end
where entry_kind in (
  'top_up',
  'agent_execution_debit',
  'agent_execution_refund',
  'initial_grant'
);

alter table public.credit_ledger
  drop constraint if exists credit_ledger_balance_after_check;

alter table public.credit_ledger
  drop constraint if exists credit_ledger_entry_kind_check;

alter table public.credit_ledger
  add constraint credit_ledger_entry_kind_check
  check (
    entry_kind in (
      'promo_grant',
      'migration_grant',
      'top_up_grant',
      'top_up_reversal',
      'usage_debit',
      'usage_refund',
      'expiry_debit',
      'manual_adjustment'
    )
  );

create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_ledger_entry_id uuid not null unique references public.credit_ledger(id) on delete cascade,
  grant_kind text not null
    check (
      grant_kind in (
        'promo_grant',
        'migration_grant',
        'top_up_grant',
        'usage_refund',
        'manual_adjustment'
      )
    ),
  granted_credits integer not null check (granted_credits > 0),
  remaining_credits integer not null check (remaining_credits >= 0),
  expires_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'consumed', 'expired', 'reversed')),
  source_reference_type text,
  source_reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_grant_usages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_ledger_entry_id uuid not null references public.credit_ledger(id) on delete cascade,
  grant_id uuid not null references public.credit_grants(id) on delete cascade,
  consumed_credits integer not null check (consumed_credits > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (usage_ledger_entry_id, grant_id)
);

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  default_currency text not null default 'usd',
  locale text,
  status text not null default 'active'
    check (status in ('active', 'restricted', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('individual', 'business')),
  legal_name text not null,
  billing_email text not null,
  country text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state_region text,
  postal_code text not null,
  tax_id text,
  tax_id_type text,
  is_default boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists billing_identities_default_active_idx
  on public.billing_identities(user_id)
  where is_default = true and status = 'active';

create table if not exists public.billing_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  billing_customer_user_id uuid not null references public.billing_customers(user_id) on delete cascade,
  stripe_payment_method_id text not null unique,
  stripe_customer_id text not null,
  payment_method_type text not null default 'card',
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean not null default false,
  reusable_for_auto_reload boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists billing_payment_methods_default_active_idx
  on public.billing_payment_methods(user_id)
  where is_default = true and status = 'active';

create table if not exists public.credit_rate_books (
  id uuid primary key default gen_random_uuid(),
  currency text not null,
  credits_per_minor_unit numeric(20,8) not null check (credits_per_minor_unit > 0),
  min_top_up_minor bigint not null check (min_top_up_minor > 0),
  max_top_up_minor bigint not null check (max_top_up_minor >= min_top_up_minor),
  monthly_user_cap_minor bigint not null check (monthly_user_cap_minor >= max_top_up_minor),
  tax_code text not null default 'txcd_10000000',
  effective_from timestamptz not null default timezone('utc', now()),
  effective_to timestamptz,
  is_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_rate_books_currency_effective_idx
  on public.credit_rate_books(currency, effective_from desc);

create table if not exists public.credit_top_up_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rate_book_id uuid not null references public.credit_rate_books(id),
  billing_identity_id uuid not null references public.billing_identities(id),
  currency text not null,
  amount_minor bigint not null check (amount_minor > 0),
  credits_per_minor_unit numeric(20,8) not null check (credits_per_minor_unit > 0),
  quoted_credits integer not null check (quoted_credits > 0),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  tax_minor bigint not null check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= subtotal_minor),
  stripe_tax_calculation_id text,
  billing_identity_snapshot jsonb not null,
  tax_snapshot jsonb not null default '{}'::jsonb,
  rate_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'quoted'
    check (status in ('quoted', 'consumed', 'expired', 'canceled')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_top_up_quotes_user_created_idx
  on public.credit_top_up_quotes(user_id, created_at desc);

create table if not exists public.credit_top_up_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid not null references public.credit_top_up_quotes(id),
  trigger_source text not null check (trigger_source in ('manual', 'auto_reload')),
  status text not null default 'initiated'
    check (
      status in (
        'initiated',
        'requires_action',
        'processing',
        'succeeded',
        'failed',
        'canceled',
        'reversed'
      )
    ),
  currency text not null,
  quoted_credits integer not null check (quoted_credits > 0),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  tax_minor bigint not null check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= subtotal_minor),
  stripe_payment_intent_id text unique,
  stripe_setup_intent_id text,
  stripe_charge_id text,
  stripe_tax_transaction_id text,
  stripe_customer_id text,
  default_payment_method_id uuid references public.billing_payment_methods(id),
  billing_identity_snapshot jsonb not null,
  tax_snapshot jsonb not null default '{}'::jsonb,
  rate_snapshot jsonb not null default '{}'::jsonb,
  granted_ledger_entry_id uuid references public.credit_ledger(id),
  reversal_ledger_entry_id uuid references public.credit_ledger(id),
  idempotency_key text not null unique,
  failure_code text,
  failure_message text,
  initiated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_top_up_orders_user_created_idx
  on public.credit_top_up_orders(user_id, created_at desc);

create index if not exists credit_top_up_orders_status_idx
  on public.credit_top_up_orders(status, created_at desc);

create unique index if not exists credit_top_up_single_active_auto_reload_order_idx
  on public.credit_top_up_orders(user_id)
  where trigger_source = 'auto_reload'
    and status in ('initiated', 'requires_action', 'processing');

create table if not exists public.credit_auto_reload_policies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  threshold_credits integer not null default 0 check (threshold_credits >= 0),
  reload_amount_minor bigint not null default 0 check (reload_amount_minor >= 0),
  currency text,
  monthly_cap_minor bigint not null default 0 check (monthly_cap_minor >= 0),
  month_to_date_minor bigint not null default 0 check (month_to_date_minor >= 0),
  month_window_started_at timestamptz not null default timezone('utc', now()),
  default_payment_method_id uuid references public.billing_payment_methods(id),
  enabled boolean not null default false,
  consent_text_version text,
  consented_at timestamptz,
  last_attempt_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  status text not null default 'inactive'
    check (
      status in (
        'inactive',
        'active',
        'paused',
        'disabled',
        'needs_payment_method'
      )
    ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.credit_top_up_orders(id) on delete set null,
  document_type text not null
    check (document_type in ('receipt', 'tax_invoice', 'credit_note')),
  document_number text not null unique,
  currency text not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  tax_minor bigint not null check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  pdf_url text,
  snapshot jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default timezone('utc', now()),
  voided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists billing_documents_order_type_idx
  on public.billing_documents(order_id, document_type)
  where order_id is not null;

create table if not exists public.billing_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  order_id uuid references public.credit_top_up_orders(id),
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create index if not exists credit_accounts_balance_idx
  on public.credit_accounts(available_balance);

create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger(user_id, created_at desc);

create index if not exists credit_ledger_account_created_idx
  on public.credit_ledger(account_user_id, created_at desc);

create index if not exists credit_grants_user_expiry_idx
  on public.credit_grants(user_id, expires_at, created_at);

create index if not exists credit_grant_usages_usage_idx
  on public.credit_grant_usages(usage_ledger_entry_id, created_at);

create index if not exists billing_identities_user_created_idx
  on public.billing_identities(user_id, created_at desc);

create index if not exists billing_payment_methods_user_created_idx
  on public.billing_payment_methods(user_id, created_at desc);

create index if not exists billing_documents_user_issued_idx
  on public.billing_documents(user_id, issued_at desc);

drop trigger if exists credit_accounts_touch_updated_at on public.credit_accounts;
create trigger credit_accounts_touch_updated_at
before update on public.credit_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists credit_grants_touch_updated_at on public.credit_grants;
create trigger credit_grants_touch_updated_at
before update on public.credit_grants
for each row execute function public.touch_updated_at();

drop trigger if exists billing_customers_touch_updated_at on public.billing_customers;
create trigger billing_customers_touch_updated_at
before update on public.billing_customers
for each row execute function public.touch_updated_at();

drop trigger if exists billing_identities_touch_updated_at on public.billing_identities;
create trigger billing_identities_touch_updated_at
before update on public.billing_identities
for each row execute function public.touch_updated_at();

drop trigger if exists billing_payment_methods_touch_updated_at on public.billing_payment_methods;
create trigger billing_payment_methods_touch_updated_at
before update on public.billing_payment_methods
for each row execute function public.touch_updated_at();

drop trigger if exists credit_rate_books_touch_updated_at on public.credit_rate_books;
create trigger credit_rate_books_touch_updated_at
before update on public.credit_rate_books
for each row execute function public.touch_updated_at();

drop trigger if exists credit_top_up_orders_touch_updated_at on public.credit_top_up_orders;
create trigger credit_top_up_orders_touch_updated_at
before update on public.credit_top_up_orders
for each row execute function public.touch_updated_at();

drop trigger if exists credit_auto_reload_policies_touch_updated_at on public.credit_auto_reload_policies;
create trigger credit_auto_reload_policies_touch_updated_at
before update on public.credit_auto_reload_policies
for each row execute function public.touch_updated_at();

drop trigger if exists billing_documents_touch_updated_at on public.billing_documents;
create trigger billing_documents_touch_updated_at
before update on public.billing_documents
for each row execute function public.touch_updated_at();

create or replace function public.ensure_credit_account_row(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.credit_accounts (user_id, available_balance, status)
  values (p_user_id, 0, 'active')
  on conflict (user_id) do nothing;
end;
$fn$;

insert into public.credit_accounts (user_id, available_balance, status)
select
  auth_users.id,
  case
    when profiles.credits_balance is null then 0
    else profiles.credits_balance
  end,
  case
    when coalesce(profiles.credits_balance, 0) < 0 then 'restricted'
    else 'active'
  end
from auth.users as auth_users
left join public.profiles as profiles
  on profiles.id = auth_users.id
on conflict (user_id) do update
set status = case
      when public.credit_accounts.available_balance < 0 then 'restricted'
      when public.credit_accounts.status = 'closed' then 'closed'
      else 'active'
    end;

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

insert into public.credit_grants (
  user_id,
  source_ledger_entry_id,
  grant_kind,
  granted_credits,
  remaining_credits,
  expires_at,
  source_reference_type,
  source_reference_id,
  metadata
)
select
  credit_ledger.user_id,
  credit_ledger.id,
  'migration_grant',
  credit_ledger.delta,
  credit_ledger.delta,
  credit_ledger.created_at + interval '1 year',
  credit_ledger.reference_type,
  credit_ledger.reference_id,
  credit_ledger.metadata
from public.credit_ledger
where credit_ledger.entry_kind = 'migration_grant'
  and credit_ledger.delta > 0
  and not exists (
    select 1
    from public.credit_grants
    where credit_grants.source_ledger_entry_id = credit_ledger.id
  );

create or replace function public.handle_new_credit_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.credit_accounts (user_id, available_balance, status)
  values (new.id, 0, 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created_credit_account on auth.users;
create trigger on_auth_user_created_credit_account
after insert on auth.users
for each row execute function public.handle_new_credit_account();

create or replace function public.grant_top_up_credits(
  order_id uuid,
  stripe_event_id text
)
returns table (
  balance_after integer,
  granted_credits integer,
  ledger_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_order public.credit_top_up_orders%rowtype;
  v_quote public.credit_top_up_quotes%rowtype;
  v_current_balance integer;
  v_next_balance integer;
  v_ledger_entry_id uuid;
  v_monthly_cap_minor bigint;
  v_current_month_spend bigint;
  v_month_window_start timestamptz;
  v_receipt_number text;
  v_invoice_number text;
begin
  if coalesce(trim(stripe_event_id), '') = '' then
    raise exception 'stripe_event_id is required.';
  end if;

  if exists (
    select 1
    from public.billing_webhook_events
    where billing_webhook_events.stripe_event_id = grant_top_up_credits.stripe_event_id
      and billing_webhook_events.status = 'processed'
  ) then
    select credit_ledger.balance_after, abs(credit_ledger.delta), credit_ledger.id
    into balance_after, granted_credits, ledger_entry_id
    from public.credit_top_up_orders
    join public.credit_ledger
      on credit_ledger.id = public.credit_top_up_orders.granted_ledger_entry_id
    where public.credit_top_up_orders.id = grant_top_up_credits.order_id;

    return next;
    return;
  end if;

  select *
  into v_order
  from public.credit_top_up_orders
  where credit_top_up_orders.id = grant_top_up_credits.order_id
  for update;

  if not found then
    raise exception 'Top-up order not found.';
  end if;

  perform public.ensure_credit_account_row(v_order.user_id);

  if v_order.granted_ledger_entry_id is not null then
    insert into public.billing_webhook_events (
      stripe_event_id,
      event_type,
      order_id,
      status,
      payload,
      processed_at
    )
    values (
      stripe_event_id,
      'payment_intent.succeeded',
      v_order.id,
      'processed',
      jsonb_build_object('idempotent', true),
      timezone('utc', now())
    )
    on conflict (stripe_event_id) do update
    set status = excluded.status,
        processed_at = excluded.processed_at,
        order_id = excluded.order_id;

    select credit_ledger.balance_after, abs(credit_ledger.delta), credit_ledger.id
    into balance_after, granted_credits, ledger_entry_id
    from public.credit_ledger
    where credit_ledger.id = v_order.granted_ledger_entry_id;

    return next;
    return;
  end if;

  select *
  into v_quote
  from public.credit_top_up_quotes
  where credit_top_up_quotes.id = v_order.quote_id
  for update;

  if not found then
    raise exception 'Top-up quote not found.';
  end if;

  select credit_accounts.available_balance
  into v_current_balance
  from public.credit_accounts
  where credit_accounts.user_id = v_order.user_id
  for update;

  v_monthly_cap_minor := nullif(v_order.rate_snapshot ->> 'monthly_user_cap_minor', '')::bigint;

  if v_monthly_cap_minor is null then
    raise exception 'The monthly cap snapshot is missing for this top-up order.';
  end if;

  v_month_window_start := date_trunc('month', timezone('utc', now()));

  select coalesce(sum(credit_top_up_orders.subtotal_minor), 0)::bigint
  into v_current_month_spend
  from public.credit_top_up_orders
  where credit_top_up_orders.user_id = v_order.user_id
    and credit_top_up_orders.currency = v_order.currency
    and credit_top_up_orders.status in ('succeeded', 'reversed')
    and credit_top_up_orders.created_at >= v_month_window_start
    and credit_top_up_orders.id <> v_order.id;

  if v_current_month_spend + v_order.subtotal_minor > v_monthly_cap_minor then
    update public.credit_top_up_orders
    set status = 'failed',
        failure_code = 'monthly_cap_exceeded',
        failure_message = 'This top-up exceeds the monthly cap configured for this currency.',
        updated_at = timezone('utc', now())
    where credit_top_up_orders.id = v_order.id;

    raise exception 'This top-up exceeds the monthly cap configured for this currency.';
  end if;

  v_next_balance := coalesce(v_current_balance, 0) + v_order.quoted_credits;

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
    v_order.user_id,
    v_order.user_id,
    'top_up_grant',
    v_order.quoted_credits,
    v_next_balance,
    'credit_top_up_order',
    v_order.id::text,
    concat('top-up-grant-', v_order.id::text),
    jsonb_build_object(
      'quote_id',
      v_order.quote_id,
      'trigger_source',
      v_order.trigger_source,
      'currency',
      v_order.currency,
      'stripe_payment_intent_id',
      v_order.stripe_payment_intent_id
    )
  )
  returning credit_ledger.id
  into v_ledger_entry_id;

  insert into public.credit_grants (
    user_id,
    source_ledger_entry_id,
    grant_kind,
    granted_credits,
    remaining_credits,
    expires_at,
    source_reference_type,
    source_reference_id,
    metadata
  )
  values (
    v_order.user_id,
    v_ledger_entry_id,
    'top_up_grant',
    v_order.quoted_credits,
    v_order.quoted_credits,
    timezone('utc', now()) + interval '1 year',
    'credit_top_up_order',
    v_order.id::text,
    jsonb_build_object(
      'quote_id',
      v_order.quote_id,
      'currency',
      v_order.currency
    )
  )
  on conflict (source_ledger_entry_id) do nothing;

  update public.credit_accounts
  set available_balance = v_next_balance,
      status = case
        when v_next_balance < 0 then 'restricted'
        else 'active'
      end,
      restricted_reason = case
        when v_next_balance < 0 then coalesce(restricted_reason, 'negative_balance')
        else null
      end
  where credit_accounts.user_id = v_order.user_id;

  update public.credit_top_up_quotes
  set status = 'consumed',
      consumed_at = timezone('utc', now())
  where credit_top_up_quotes.id = v_quote.id;

  update public.credit_top_up_orders
  set status = 'succeeded',
      granted_ledger_entry_id = v_ledger_entry_id,
      completed_at = timezone('utc', now())
  where credit_top_up_orders.id = v_order.id;

  v_receipt_number := public.generate_document_number('rcpt');
  v_invoice_number := public.generate_document_number('tax');

  insert into public.billing_documents (
    user_id,
    order_id,
    document_type,
    document_number,
    currency,
    subtotal_minor,
    tax_minor,
    total_minor,
    snapshot
  )
  values (
    v_order.user_id,
    v_order.id,
    'receipt',
    v_receipt_number,
    v_order.currency,
    v_order.subtotal_minor,
    v_order.tax_minor,
    v_order.total_minor,
    jsonb_build_object(
      'billing_identity',
      v_order.billing_identity_snapshot,
      'tax',
      v_order.tax_snapshot,
      'rate',
      v_order.rate_snapshot
    )
  )
  on conflict (order_id, document_type) where order_id is not null do nothing;

  insert into public.billing_documents (
    user_id,
    order_id,
    document_type,
    document_number,
    currency,
    subtotal_minor,
    tax_minor,
    total_minor,
    snapshot
  )
  values (
    v_order.user_id,
    v_order.id,
    'tax_invoice',
    v_invoice_number,
    v_order.currency,
    v_order.subtotal_minor,
    v_order.tax_minor,
    v_order.total_minor,
    jsonb_build_object(
      'billing_identity',
      v_order.billing_identity_snapshot,
      'tax',
      v_order.tax_snapshot,
      'rate',
      v_order.rate_snapshot
    )
  )
  on conflict (order_id, document_type) where order_id is not null do nothing;

  insert into public.billing_webhook_events (
    stripe_event_id,
    event_type,
    order_id,
    status,
    payload,
    processed_at
  )
  values (
    stripe_event_id,
    'payment_intent.succeeded',
    v_order.id,
    'processed',
    jsonb_build_object('order_status', 'succeeded'),
    timezone('utc', now())
  )
  on conflict (stripe_event_id) do update
  set status = excluded.status,
      order_id = excluded.order_id,
      processed_at = excluded.processed_at,
      payload = excluded.payload;

  balance_after := v_next_balance;
  granted_credits := v_order.quoted_credits;
  ledger_entry_id := v_ledger_entry_id;

  return next;
end;
$fn$;

create or replace function public.reverse_top_up_credits(
  order_id uuid,
  reason text,
  stripe_event_id text
)
returns table (
  balance_after integer,
  reversed_credits integer,
  ledger_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_order public.credit_top_up_orders%rowtype;
  v_current_balance integer;
  v_next_balance integer;
  v_reversal_ledger_entry_id uuid;
  v_credit_note_number text;
begin
  if coalesce(trim(stripe_event_id), '') = '' then
    raise exception 'stripe_event_id is required.';
  end if;

  if exists (
    select 1
    from public.billing_webhook_events
    where billing_webhook_events.stripe_event_id = reverse_top_up_credits.stripe_event_id
      and billing_webhook_events.status = 'processed'
  ) then
    select credit_ledger.balance_after, abs(credit_ledger.delta), credit_ledger.id
    into balance_after, reversed_credits, ledger_entry_id
    from public.credit_top_up_orders
    join public.credit_ledger
      on credit_ledger.id = public.credit_top_up_orders.reversal_ledger_entry_id
    where public.credit_top_up_orders.id = reverse_top_up_credits.order_id;

    return next;
    return;
  end if;

  select *
  into v_order
  from public.credit_top_up_orders
  where credit_top_up_orders.id = reverse_top_up_credits.order_id
  for update;

  if not found then
    raise exception 'Top-up order not found.';
  end if;

  if v_order.granted_ledger_entry_id is null then
    raise exception 'This top-up was not granted yet.';
  end if;

  if v_order.reversal_ledger_entry_id is not null then
    insert into public.billing_webhook_events (
      stripe_event_id,
      event_type,
      order_id,
      status,
      payload,
      processed_at
    )
    values (
      stripe_event_id,
      'charge.refunded',
      v_order.id,
      'processed',
      jsonb_build_object('idempotent', true),
      timezone('utc', now())
    )
    on conflict (stripe_event_id) do update
    set status = excluded.status,
        processed_at = excluded.processed_at,
        order_id = excluded.order_id;

    select credit_ledger.balance_after, abs(credit_ledger.delta), credit_ledger.id
    into balance_after, reversed_credits, ledger_entry_id
    from public.credit_ledger
    where credit_ledger.id = v_order.reversal_ledger_entry_id;

    return next;
    return;
  end if;

  select credit_accounts.available_balance
  into v_current_balance
  from public.credit_accounts
  where credit_accounts.user_id = v_order.user_id
  for update;

  v_next_balance := coalesce(v_current_balance, 0) - v_order.quoted_credits;

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
    v_order.user_id,
    v_order.user_id,
    'top_up_reversal',
    -v_order.quoted_credits,
    v_next_balance,
    'credit_top_up_order',
    v_order.id::text,
    concat('top-up-reversal-', v_order.id::text),
    jsonb_build_object(
      'reason',
      coalesce(reason, 'reversal'),
      'stripe_payment_intent_id',
      v_order.stripe_payment_intent_id
    )
  )
  returning credit_ledger.id
  into v_reversal_ledger_entry_id;

  update public.credit_accounts
  set available_balance = v_next_balance,
      status = case
        when v_next_balance < 0 then 'restricted'
        else 'active'
      end,
      restricted_reason = case
        when v_next_balance < 0 then coalesce(reason, 'negative_balance')
        else null
      end
  where credit_accounts.user_id = v_order.user_id;

  update public.credit_grants
  set remaining_credits = 0,
      status = 'reversed'
  where credit_grants.source_ledger_entry_id = v_order.granted_ledger_entry_id
    and credit_grants.status <> 'reversed';

  update public.credit_top_up_orders
  set status = 'reversed',
      reversal_ledger_entry_id = v_reversal_ledger_entry_id,
      completed_at = timezone('utc', now())
  where credit_top_up_orders.id = v_order.id;

  v_credit_note_number := public.generate_document_number('crn');

  insert into public.billing_documents (
    user_id,
    order_id,
    document_type,
    document_number,
    currency,
    subtotal_minor,
    tax_minor,
    total_minor,
    snapshot
  )
  values (
    v_order.user_id,
    v_order.id,
    'credit_note',
    v_credit_note_number,
    v_order.currency,
    v_order.subtotal_minor,
    v_order.tax_minor,
    v_order.total_minor,
    jsonb_build_object(
      'billing_identity',
      v_order.billing_identity_snapshot,
      'tax',
      v_order.tax_snapshot,
      'rate',
      v_order.rate_snapshot,
      'reason',
      coalesce(reason, 'refund_or_dispute')
    )
  )
  on conflict (order_id, document_type) where order_id is not null do nothing;

  insert into public.billing_webhook_events (
    stripe_event_id,
    event_type,
    order_id,
    status,
    payload,
    processed_at
  )
  values (
    stripe_event_id,
    'charge.refunded',
    v_order.id,
    'processed',
    jsonb_build_object('reason', coalesce(reason, 'refund_or_dispute')),
    timezone('utc', now())
  )
  on conflict (stripe_event_id) do update
  set status = excluded.status,
      order_id = excluded.order_id,
      processed_at = excluded.processed_at,
      payload = excluded.payload;

  balance_after := v_next_balance;
  reversed_credits := v_order.quoted_credits;
  ledger_entry_id := v_reversal_ledger_entry_id;

  return next;
end;
$fn$;

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
  v_remaining_to_consume integer;
  v_grant public.credit_grants%rowtype;
  v_consumed integer;
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
    and credit_accounts.status = 'active'
  for update;

  if v_current_balance is null then
    raise exception 'Credit account not found or not active for this user.';
  end if;

  if v_current_balance < v_cost then
    raise exception 'Not enough Lumixia Credits.';
  end if;

  v_next_balance := v_current_balance - v_cost;

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
    'usage_debit',
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

  v_remaining_to_consume := v_cost;

  for v_grant in
    select *
    from public.credit_grants
    where credit_grants.user_id = v_user_id
      and credit_grants.status = 'active'
      and credit_grants.remaining_credits > 0
      and credit_grants.expires_at > timezone('utc', now())
    order by credit_grants.expires_at asc, credit_grants.created_at asc
    for update
  loop
    exit when v_remaining_to_consume <= 0;

    v_consumed := least(v_grant.remaining_credits, v_remaining_to_consume);

    update public.credit_grants
    set remaining_credits = remaining_credits - v_consumed,
        status = case
          when remaining_credits - v_consumed <= 0 then 'consumed'
          else 'active'
        end
    where credit_grants.id = v_grant.id;

    insert into public.credit_grant_usages (
      user_id,
      usage_ledger_entry_id,
      grant_id,
      consumed_credits
    )
    values (
      v_user_id,
      v_ledger_entry_id,
      v_grant.id,
      v_consumed
    );

    v_remaining_to_consume := v_remaining_to_consume - v_consumed;
  end loop;

  if v_remaining_to_consume > 0 then
    raise exception 'Credit grants are out of sync with the available balance.';
  end if;

  update public.credit_accounts
  set available_balance = v_next_balance,
      status = 'active',
      restricted_reason = null
  where credit_accounts.user_id = v_user_id;

  return query
  select
    v_next_balance,
    v_cost,
    v_ledger_entry_id;
end;
$fn$;

create or replace function public.consume_agent_credits_for_user(
  p_user_id uuid,
  p_agent_slug text,
  p_execution_session_id uuid,
  p_idempotency_key text
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
  v_user_id uuid := p_user_id;
  v_cost integer;
  v_current_balance integer;
  v_next_balance integer;
  v_existing_entry public.credit_ledger%rowtype;
  v_ledger_entry_id uuid;
  v_session public.execution_sessions%rowtype;
  v_remaining_to_consume integer;
  v_grant public.credit_grants%rowtype;
  v_consumed integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role is required to consume execution credits for a user.';
  end if;

  if v_user_id is null then
    raise exception 'A user id is required to consume execution credits.';
  end if;

  if coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'An idempotency key is required to consume execution credits.';
  end if;

  select *
  into v_existing_entry
  from public.credit_ledger
  where credit_ledger.user_id = v_user_id
    and credit_ledger.idempotency_key = p_idempotency_key
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
  where execution_sessions.id = p_execution_session_id
    and execution_sessions.user_id = v_user_id
  limit 1;

  if not found then
    raise exception 'Execution session not found for this user.';
  end if;

  if v_session.agent_slug <> p_agent_slug then
    raise exception 'Execution session agent mismatch.';
  end if;

  select dashboard_agents.execution_cost
  into v_cost
  from public.dashboard_agents
  where dashboard_agents.slug = p_agent_slug
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
    and credit_accounts.status = 'active'
  for update;

  if v_current_balance is null then
    raise exception 'Credit account not found or not active for this user.';
  end if;

  if v_current_balance < v_cost then
    raise exception 'Not enough Lumixia Credits.';
  end if;

  v_next_balance := v_current_balance - v_cost;

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
    'usage_debit',
    -v_cost,
    v_next_balance,
    'execution_session',
    p_execution_session_id::text,
    p_idempotency_key,
    jsonb_build_object(
      'agent_slug',
      p_agent_slug,
      'execution_session_id',
      p_execution_session_id,
      'debited_by',
      'execution_service'
    )
  )
  returning credit_ledger.id
  into v_ledger_entry_id;

  v_remaining_to_consume := v_cost;

  for v_grant in
    select *
    from public.credit_grants
    where credit_grants.user_id = v_user_id
      and credit_grants.status = 'active'
      and credit_grants.remaining_credits > 0
      and credit_grants.expires_at > timezone('utc', now())
    order by credit_grants.expires_at asc, credit_grants.created_at asc
    for update
  loop
    exit when v_remaining_to_consume <= 0;

    v_consumed := least(v_grant.remaining_credits, v_remaining_to_consume);

    update public.credit_grants
    set remaining_credits = remaining_credits - v_consumed,
        status = case
          when remaining_credits - v_consumed <= 0 then 'consumed'
          else 'active'
        end
    where credit_grants.id = v_grant.id;

    insert into public.credit_grant_usages (
      user_id,
      usage_ledger_entry_id,
      grant_id,
      consumed_credits
    )
    values (
      v_user_id,
      v_ledger_entry_id,
      v_grant.id,
      v_consumed
    );

    v_remaining_to_consume := v_remaining_to_consume - v_consumed;
  end loop;

  if v_remaining_to_consume > 0 then
    raise exception 'Credit grants are out of sync with the available balance.';
  end if;

  update public.credit_accounts
  set available_balance = v_next_balance,
      status = 'active',
      restricted_reason = null
  where credit_accounts.user_id = v_user_id;

  return query
  select
    v_next_balance,
    v_cost,
    v_ledger_entry_id;
end;
$fn$;

create or replace function public.refund_agent_credits(
  execution_session_id uuid,
  idempotency_key text,
  reason text default 'execution_failed'
)
returns table (
  balance_after integer,
  refunded_amount integer,
  ledger_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid;
  v_existing_entry public.credit_ledger%rowtype;
  v_original_usage public.credit_ledger%rowtype;
  v_existing_refund public.credit_ledger%rowtype;
  v_current_balance integer;
  v_next_balance integer;
  v_refund_amount integer;
  v_ledger_entry_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authenticated user is required to refund credits.';
  end if;

  if coalesce(trim(idempotency_key), '') = '' then
    raise exception 'An idempotency key is required to refund credits.';
  end if;

  select *
  into v_existing_entry
  from public.credit_ledger
  where credit_ledger.user_id = v_user_id
    and credit_ledger.idempotency_key = refund_agent_credits.idempotency_key
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
  into v_original_usage
  from public.credit_ledger
  where credit_ledger.user_id = v_user_id
    and credit_ledger.reference_type = 'execution_session'
    and credit_ledger.reference_id = refund_agent_credits.execution_session_id::text
    and credit_ledger.entry_kind = 'usage_debit'
  order by credit_ledger.created_at desc
  limit 1;

  if not found then
    raise exception 'Original credit debit for this execution session was not found.';
  end if;

  select *
  into v_existing_refund
  from public.credit_ledger
  where credit_ledger.user_id = v_user_id
    and credit_ledger.reference_type = 'execution_session'
    and credit_ledger.reference_id = refund_agent_credits.execution_session_id::text
    and credit_ledger.entry_kind = 'usage_refund'
  order by credit_ledger.created_at desc
  limit 1;

  if found then
    return query
    select
      v_existing_refund.balance_after,
      abs(v_existing_refund.delta),
      v_existing_refund.id;
    return;
  end if;

  v_refund_amount := abs(v_original_usage.delta);

  select credit_accounts.available_balance
  into v_current_balance
  from public.credit_accounts
  where credit_accounts.user_id = v_user_id
  for update;

  if v_current_balance is null then
    raise exception 'Credit account not found for this user.';
  end if;

  v_next_balance := v_current_balance + v_refund_amount;

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
    'usage_refund',
    v_refund_amount,
    v_next_balance,
    'execution_session',
    refund_agent_credits.execution_session_id::text,
    refund_agent_credits.idempotency_key,
    jsonb_build_object(
      'reason',
      coalesce(reason, 'execution_failed'),
      'original_usage_ledger_entry_id',
      v_original_usage.id
    )
  )
  returning credit_ledger.id
  into v_ledger_entry_id;

  insert into public.credit_grants (
    user_id,
    source_ledger_entry_id,
    grant_kind,
    granted_credits,
    remaining_credits,
    expires_at,
    source_reference_type,
    source_reference_id,
    metadata
  )
  values (
    v_user_id,
    v_ledger_entry_id,
    'usage_refund',
    v_refund_amount,
    v_refund_amount,
    timezone('utc', now()) + interval '1 year',
    'execution_session',
    refund_agent_credits.execution_session_id::text,
    jsonb_build_object(
      'reason',
      coalesce(reason, 'execution_failed'),
      'original_usage_ledger_entry_id',
      v_original_usage.id
    )
  )
  on conflict (source_ledger_entry_id) do nothing;

  update public.credit_accounts
  set available_balance = v_next_balance,
      status = case
        when v_next_balance < 0 then 'restricted'
        else 'active'
      end,
      restricted_reason = case
        when v_next_balance < 0 then coalesce(restricted_reason, 'negative_balance')
        else null
      end
  where credit_accounts.user_id = v_user_id;

  return query
  select
    v_next_balance,
    v_refund_amount,
    v_ledger_entry_id;
end;
$fn$;

create or replace function public.expire_available_credits(
  limit_rows integer default 200
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_grant public.credit_grants%rowtype;
  v_current_balance integer;
  v_next_balance integer;
  v_processed integer := 0;
begin
  for v_grant in
    select *
    from public.credit_grants
    where credit_grants.status = 'active'
      and credit_grants.remaining_credits > 0
      and credit_grants.expires_at <= timezone('utc', now())
    order by credit_grants.expires_at asc
    limit greatest(limit_rows, 1)
    for update skip locked
  loop
    select credit_accounts.available_balance
    into v_current_balance
    from public.credit_accounts
    where credit_accounts.user_id = v_grant.user_id
    for update;

    if v_current_balance is null then
      continue;
    end if;

    v_next_balance := v_current_balance - v_grant.remaining_credits;

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
      v_grant.user_id,
      v_grant.user_id,
      'expiry_debit',
      -v_grant.remaining_credits,
      v_next_balance,
      'credit_grant',
      v_grant.id::text,
      concat('credit-expiry-', v_grant.id::text),
      jsonb_build_object(
        'grant_id',
        v_grant.id,
        'source_ledger_entry_id',
        v_grant.source_ledger_entry_id
      )
    )
    on conflict (idempotency_key) do nothing;

    update public.credit_accounts
    set available_balance = v_next_balance,
        status = case
          when v_next_balance < 0 then 'restricted'
          else 'active'
        end,
        restricted_reason = case
          when v_next_balance < 0 then 'negative_balance'
          else null
        end
    where credit_accounts.user_id = v_grant.user_id;

    update public.credit_grants
    set remaining_credits = 0,
        status = 'expired'
    where credit_grants.id = v_grant.id;

    v_processed := v_processed + 1;
  end loop;

  return v_processed;
end;
$fn$;

alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.credit_grants enable row level security;
alter table public.credit_grant_usages enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_identities enable row level security;
alter table public.billing_payment_methods enable row level security;
alter table public.credit_rate_books enable row level security;
alter table public.credit_top_up_quotes enable row level security;
alter table public.credit_top_up_orders enable row level security;
alter table public.credit_auto_reload_policies enable row level security;
alter table public.billing_documents enable row level security;
alter table public.billing_webhook_events enable row level security;

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

drop policy if exists "Users can view own credit grants" on public.credit_grants;
create policy "Users can view own credit grants"
on public.credit_grants
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own credit grant usages" on public.credit_grant_usages;
create policy "Users can view own credit grant usages"
on public.credit_grant_usages
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own billing customer" on public.billing_customers;
create policy "Users can view own billing customer"
on public.billing_customers
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own billing identities" on public.billing_identities;
create policy "Users can view own billing identities"
on public.billing_identities
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view active rate books" on public.credit_rate_books;
create policy "Users can view active rate books"
on public.credit_rate_books
for select
to authenticated
using (is_enabled = true);

drop policy if exists "Users can view own payment methods" on public.billing_payment_methods;
create policy "Users can view own payment methods"
on public.billing_payment_methods
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own credit quotes" on public.credit_top_up_quotes;
create policy "Users can view own credit quotes"
on public.credit_top_up_quotes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own top-up orders" on public.credit_top_up_orders;
create policy "Users can view own top-up orders"
on public.credit_top_up_orders
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own auto-reload policy" on public.credit_auto_reload_policies;
create policy "Users can view own auto-reload policy"
on public.credit_auto_reload_policies
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own billing documents" on public.billing_documents;
create policy "Users can view own billing documents"
on public.billing_documents
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.credit_accounts to authenticated;
grant select on public.credit_ledger to authenticated;
grant select on public.credit_grants to authenticated;
grant select on public.credit_grant_usages to authenticated;
grant select on public.billing_customers to authenticated;
grant select on public.billing_identities to authenticated;
grant select on public.billing_payment_methods to authenticated;
grant select on public.credit_rate_books to authenticated;
grant select on public.credit_top_up_quotes to authenticated;
grant select on public.credit_top_up_orders to authenticated;
grant select on public.credit_auto_reload_policies to authenticated;
grant select on public.billing_documents to authenticated;

revoke insert, update, delete on public.credit_accounts from authenticated;
revoke insert, update, delete on public.credit_ledger from authenticated;
revoke insert, update, delete on public.credit_grants from authenticated;
revoke insert, update, delete on public.credit_grant_usages from authenticated;
revoke insert, update, delete on public.billing_customers from authenticated;
revoke insert, update, delete on public.billing_identities from authenticated;
revoke insert, update, delete on public.billing_payment_methods from authenticated;
revoke insert, update, delete on public.credit_rate_books from authenticated;
revoke insert, update, delete on public.credit_top_up_quotes from authenticated;
revoke insert, update, delete on public.credit_top_up_orders from authenticated;
revoke insert, update, delete on public.credit_auto_reload_policies from authenticated;
revoke insert, update, delete on public.billing_documents from authenticated;
revoke insert, update, delete on public.billing_webhook_events from authenticated;

revoke all on function public.grant_top_up_credits(uuid, text) from public;
revoke all on function public.reverse_top_up_credits(uuid, text, text) from public;
revoke all on function public.consume_agent_credits(text, uuid, text) from public;
revoke all on function public.consume_agent_credits_for_user(uuid, text, uuid, text) from public;
revoke all on function public.refund_agent_credits(uuid, text, text) from public;
revoke all on function public.expire_available_credits(integer) from public;
revoke all on function public.consume_agent_credits(text, uuid, text) from authenticated;
revoke all on function public.consume_agent_credits_for_user(uuid, text, uuid, text) from authenticated;
revoke all on function public.refund_agent_credits(uuid, text, text) from authenticated;

grant execute on function public.grant_top_up_credits(uuid, text) to service_role;
grant execute on function public.reverse_top_up_credits(uuid, text, text) to service_role;
grant execute on function public.consume_agent_credits_for_user(uuid, text, uuid, text) to service_role;
grant execute on function public.refund_agent_credits(uuid, text, text) to service_role;
grant execute on function public.expire_available_credits(integer) to service_role;
