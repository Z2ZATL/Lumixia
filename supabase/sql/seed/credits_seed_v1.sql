-- Lumixia production starter rate books.
-- Replace these values with your final commercial pricing before going live.
-- These rows are idempotent because they use fixed UUIDs.

insert into public.credit_rate_books (
  id,
  currency,
  credits_per_minor_unit,
  min_top_up_minor,
  max_top_up_minor,
  monthly_user_cap_minor,
  tax_code,
  effective_from,
  is_enabled,
  metadata
)
values
  (
    '5aebefb5-6f5f-429f-a4d5-5911de9b2f01',
    'usd',
    1.00000000,
    500,
    10000,
    100000,
    'txcd_10000000',
    timezone('utc', now()),
    true,
    jsonb_build_object(
      'seed_key', 'lumixia-rate-book-usd-v1',
      'label', 'USD starter rate book',
      'notes', '1 credit per cent'
    )
  ),
  (
    '5aebefb5-6f5f-429f-a4d5-5911de9b2f02',
    'thb',
    0.02800000,
    18000,
    360000,
    3600000,
    'txcd_10000000',
    timezone('utc', now()),
    true,
    jsonb_build_object(
      'seed_key', 'lumixia-rate-book-thb-v1',
      'label', 'THB starter rate book',
      'notes', 'Static ops-managed rate book for Thai Baht'
    )
  ),
  (
    '5aebefb5-6f5f-429f-a4d5-5911de9b2f03',
    'eur',
    1.10000000,
    500,
    9000,
    90000,
    'txcd_10000000',
    timezone('utc', now()),
    true,
    jsonb_build_object(
      'seed_key', 'lumixia-rate-book-eur-v1',
      'label', 'EUR starter rate book',
      'notes', 'Static ops-managed rate book for Euro'
    )
  )
on conflict (id) do update
set
  currency = excluded.currency,
  credits_per_minor_unit = excluded.credits_per_minor_unit,
  min_top_up_minor = excluded.min_top_up_minor,
  max_top_up_minor = excluded.max_top_up_minor,
  monthly_user_cap_minor = excluded.monthly_user_cap_minor,
  tax_code = excluded.tax_code,
  is_enabled = excluded.is_enabled,
  metadata = excluded.metadata,
  updated_at = timezone('utc', now());
