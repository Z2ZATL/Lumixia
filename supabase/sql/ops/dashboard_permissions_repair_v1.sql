-- Lumixia Dashboard + Billing permissions repair
-- Run this if the tables exist but client reads return 403 / RLS errors.

alter table public.dashboard_sections enable row level security;
alter table public.dashboard_agents enable row level security;
alter table public.dashboard_section_items enable row level security;
alter table public.dashboard_trending_searches enable row level security;
alter table public.user_dashboard_preferences enable row level security;
alter table public.user_lifestyle_events enable row level security;
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

drop policy if exists "Users can view own payment methods" on public.billing_payment_methods;
create policy "Users can view own payment methods"
on public.billing_payment_methods
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view active rate books" on public.credit_rate_books;
create policy "Users can view active rate books"
on public.credit_rate_books
for select
to authenticated
using (is_enabled = true);

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

drop policy if exists "Users can view own auto reload policy" on public.credit_auto_reload_policies;
create policy "Users can view own auto reload policy"
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
grant select, insert, update on public.execution_sessions to authenticated;
grant select, insert on public.execution_logs to authenticated;

revoke all on function public.consume_agent_credits(text, uuid, text) from public;
revoke all on function public.refund_agent_credits(uuid, text, text) from public;
grant execute on function public.consume_agent_credits(text, uuid, text) to authenticated;
grant execute on function public.refund_agent_credits(uuid, text, text) to authenticated;
