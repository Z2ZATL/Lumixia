-- Lumixia Dashboard v1 - Verification query
-- Run this after sql/schema/dashboard_schema_v1.sql
-- and optionally after sql/seed/dashboard_seed_v1.sql.

select
  checks.schema_name,
  to_regclass(checks.schema_name) as resolved_name
from (
  values
    ('public.dashboard_sections'),
    ('public.dashboard_agents'),
    ('public.dashboard_section_items'),
    ('public.dashboard_trending_searches'),
    ('public.user_dashboard_preferences'),
    ('public.user_lifestyle_events'),
    ('public.credit_accounts'),
    ('public.credit_ledger'),
    ('public.credit_grants'),
    ('public.credit_grant_usages'),
    ('public.billing_customers'),
    ('public.billing_identities'),
    ('public.billing_payment_methods'),
    ('public.credit_rate_books'),
    ('public.credit_top_up_quotes'),
    ('public.credit_top_up_orders'),
    ('public.credit_auto_reload_policies'),
    ('public.billing_documents'),
    ('public.billing_webhook_events'),
    ('public.execution_sessions'),
    ('public.execution_logs')
) as checks(schema_name);
