import type { User } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {
  createStripeCustomer,
  createStripePaymentIntent,
  createStripeTaxCalculation,
} from './stripe.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function normalizeCurrency(value: string) {
  return value.trim().toLowerCase();
}

export async function ensureBillingCustomer(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  user: User,
) {
  const { data: existingCustomer, error: existingCustomerError } =
    await serviceRole
      .from('billing_customers')
      .select('user_id, stripe_customer_id, default_currency, locale, status')
      .eq('user_id', user.id)
      .maybeSingle();

  if (existingCustomerError) {
    throw new Error(existingCustomerError.message);
  }

  if (existingCustomer) {
    return existingCustomer;
  }

  const stripeCustomer = await createStripeCustomer({
    email: user.email ?? null,
    name:
      typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : null,
    metadata: {
      lumixia_user_id: user.id,
    },
  });

  const { data: insertedCustomer, error: insertCustomerError } =
    await serviceRole
      .from('billing_customers')
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: stripeCustomer.id,
          default_currency: 'usd',
          locale: 'en-US',
          status: 'active',
        },
        {
          onConflict: 'user_id',
        },
      )
      .select('user_id, stripe_customer_id, default_currency, locale, status')
      .single();

  if (insertCustomerError) {
    throw new Error(insertCustomerError.message);
  }

  return insertedCustomer;
}

export async function getCurrentRateBook(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  currency: string,
) {
  const nowIso = new Date().toISOString();
  const normalizedCurrency = normalizeCurrency(currency);
  const { data, error } = await serviceRole
    .from('credit_rate_books')
    .select(
      'id, currency, credits_per_minor_unit, min_top_up_minor, max_top_up_minor, monthly_user_cap_minor, tax_code, effective_from, effective_to, is_enabled, metadata',
    )
    .eq('currency', normalizedCurrency)
    .eq('is_enabled', true)
    .lte('effective_from', nowIso)
    .or(`effective_to.is.null,effective_to.gt.${nowIso}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      `Lumixia billing is not available for ${normalizedCurrency.toUpperCase()} right now.`,
    );
  }

  return data;
}

export function mapCreditSummary(account: Record<string, unknown> | null) {
  return {
    userId: String(account?.user_id ?? ''),
    availableBalance:
      account?.available_balance === null || account?.available_balance === undefined
        ? null
        : toNumber(account.available_balance, 0),
    state: account ? 'ready' : 'unavailable',
    status:
      account?.status === 'restricted' || account?.status === 'closed'
        ? account.status
        : account?.status === 'active'
          ? 'active'
          : null,
    restrictedReason:
      typeof account?.restricted_reason === 'string'
        ? account.restricted_reason
        : null,
    updatedAt:
      typeof account?.updated_at === 'string' ? account.updated_at : null,
  };
}

export function mapPaymentMethod(value: Record<string, unknown>) {
  return {
    id: String(value.id),
    stripePaymentMethodId: String(value.stripe_payment_method_id),
    brand: typeof value.brand === 'string' ? value.brand : null,
    last4: typeof value.last4 === 'string' ? value.last4 : null,
    expMonth:
      value.exp_month === null || value.exp_month === undefined
        ? null
        : toNumber(value.exp_month, 0),
    expYear:
      value.exp_year === null || value.exp_year === undefined
        ? null
        : toNumber(value.exp_year, 0),
    isDefault: value.is_default === true,
    reusableForAutoReload: value.reusable_for_auto_reload === true,
    status: value.status === 'revoked' ? 'revoked' : 'active',
    createdAt: String(value.created_at),
    updatedAt: String(value.updated_at),
  };
}

export function mapRateBook(value: Record<string, unknown>) {
  return {
    id: String(value.id),
    currency: String(value.currency).toUpperCase(),
    minTopUpMinor: toNumber(value.min_top_up_minor, 0),
    maxTopUpMinor: toNumber(value.max_top_up_minor, 0),
    monthlyUserCapMinor: toNumber(value.monthly_user_cap_minor, 0),
  };
}

export function mapOrder(value: Record<string, unknown>) {
  return {
    id: String(value.id),
    status: String(value.status),
    triggerSource:
      value.trigger_source === 'auto_reload' ? 'auto_reload' : 'manual',
    currency: String(value.currency).toUpperCase(),
    quotedCredits: toNumber(value.quoted_credits, 0),
    subtotalMinor: toNumber(value.subtotal_minor, 0),
    taxMinor: toNumber(value.tax_minor, 0),
    totalMinor: toNumber(value.total_minor, 0),
    stripePaymentIntentId:
      typeof value.stripe_payment_intent_id === 'string'
        ? value.stripe_payment_intent_id
        : null,
    stripeSetupIntentId:
      typeof value.stripe_setup_intent_id === 'string'
        ? value.stripe_setup_intent_id
        : null,
    stripeChargeId:
      typeof value.stripe_charge_id === 'string' ? value.stripe_charge_id : null,
    createdAt: String(value.created_at),
    updatedAt: String(value.updated_at),
  };
}

export function mapAutoReloadPolicy(value: Record<string, unknown> | null) {
  if (!value) {
    return null;
  }

  return {
    enabled: value.enabled === true,
    status:
      value.status === 'active' ||
      value.status === 'paused' ||
      value.status === 'disabled' ||
      value.status === 'needs_payment_method'
        ? value.status
        : 'inactive',
    thresholdCredits: toNumber(value.threshold_credits, 0),
    reloadAmountMinor: toNumber(value.reload_amount_minor, 0),
    currency: typeof value.currency === 'string' ? value.currency.toUpperCase() : null,
    monthlyCapMinor: toNumber(value.monthly_cap_minor, 0),
    monthToDateMinor: toNumber(value.month_to_date_minor, 0),
    monthWindowStartedAt: String(value.month_window_started_at),
    defaultPaymentMethodId:
      typeof value.default_payment_method_id === 'string'
        ? value.default_payment_method_id
        : null,
    consentTextVersion:
      typeof value.consent_text_version === 'string'
        ? value.consent_text_version
        : null,
    consentedAt:
      typeof value.consented_at === 'string' ? value.consented_at : null,
    lastAttemptAt:
      typeof value.last_attempt_at === 'string' ? value.last_attempt_at : null,
    failureCount: toNumber(value.failure_count, 0),
    updatedAt: String(value.updated_at),
  };
}

export function mapLedgerEntry(value: Record<string, unknown>) {
  return {
    id: String(value.id),
    entryKind: String(value.entry_kind),
    delta: toNumber(value.delta, 0),
    balanceAfter: toNumber(value.balance_after, 0),
    referenceType:
      typeof value.reference_type === 'string' ? value.reference_type : null,
    referenceId:
      typeof value.reference_id === 'string' ? value.reference_id : null,
    createdAt: String(value.created_at),
    metadata: isRecord(value.metadata) ? value.metadata : {},
  };
}

export async function syncPaymentMethodRecord(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  input: {
    userId: string;
    stripeCustomerId: string;
    stripePaymentMethod: Record<string, unknown>;
    reusableForAutoReload?: boolean;
    markDefault?: boolean;
  },
) {
  const card = isRecord(input.stripePaymentMethod.card)
    ? input.stripePaymentMethod.card
    : {};

  if (input.markDefault) {
    await serviceRole
      .from('billing_payment_methods')
      .update({ is_default: false })
      .eq('user_id', input.userId);
  }

  const payload = {
    user_id: input.userId,
    billing_customer_user_id: input.userId,
    stripe_payment_method_id: String(input.stripePaymentMethod.id),
    stripe_customer_id: input.stripeCustomerId,
    payment_method_type: String(input.stripePaymentMethod.type ?? 'card'),
    brand: typeof card.brand === 'string' ? card.brand : null,
    last4: typeof card.last4 === 'string' ? card.last4 : null,
    exp_month:
      card.exp_month === undefined || card.exp_month === null
        ? null
        : toNumber(card.exp_month, 0),
    exp_year:
      card.exp_year === undefined || card.exp_year === null
        ? null
        : toNumber(card.exp_year, 0),
    is_default: input.markDefault === true,
    reusable_for_auto_reload: input.reusableForAutoReload === true,
    status: 'active',
    metadata: {},
  };

  const { data, error } = await serviceRole
    .from('billing_payment_methods')
    .upsert(payload, { onConflict: 'stripe_payment_method_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPaymentMethod(data as Record<string, unknown>);
}

export async function fetchBillingOverview(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  userId: string,
) {
  const [
    { data: account, error: accountError },
    { data: paymentMethods, error: paymentMethodsError },
    { data: rateBooks, error: rateBooksError },
    { data: autoReloadPolicy, error: autoReloadPolicyError },
    { data: ledger, error: ledgerError },
  ] = await Promise.all([
    serviceRole
      .from('credit_accounts')
      .select(
        'user_id, available_balance, status, restricted_reason, updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    serviceRole
      .from('billing_payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
    serviceRole
      .from('credit_rate_books')
      .select(
        'id, currency, min_top_up_minor, max_top_up_minor, monthly_user_cap_minor, effective_from',
      )
      .eq('is_enabled', true)
      .order('currency')
      .order('effective_from', { ascending: false }),
    serviceRole
      .from('credit_auto_reload_policies')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    serviceRole
      .from('credit_ledger')
      .select(
        'id, entry_kind, delta, balance_after, reference_type, reference_id, metadata, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const firstError =
    accountError ||
    paymentMethodsError ||
    rateBooksError ||
    autoReloadPolicyError ||
    ledgerError;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    summary: mapCreditSummary(
      (account ?? null) as Record<string, unknown> | null,
    ),
    rateBooks: (rateBooks ?? []).map((row) =>
      mapRateBook(row as Record<string, unknown>),
    ),
    paymentMethods: (paymentMethods ?? []).map((row) =>
      mapPaymentMethod(row as Record<string, unknown>),
    ),
    autoReloadPolicy: mapAutoReloadPolicy(
      (autoReloadPolicy ?? null) as Record<string, unknown> | null,
    ),
    recentLedger: {
      items: (ledger ?? []).map((row) =>
        mapLedgerEntry(row as Record<string, unknown>),
      ),
    },
  };
}

export function monthWindowStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function getAutoReloadPolicy(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  userId: string,
) {
  const { data, error } = await serviceRole
    .from('credit_auto_reload_policies')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function listCurrentMonthSpend(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  userId: string,
  currency: string,
) {
  const windowStart = monthWindowStart();

  const { data, error } = await serviceRole
    .from('credit_top_up_orders')
    .select('subtotal_minor')
    .eq('user_id', userId)
    .eq('currency', currency)
    .in('status', ['succeeded', 'reversed'])
    .gte('created_at', windowStart.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((sum, row) => sum + Number(row.subtotal_minor ?? 0), 0);
}

async function resolveBillingUser(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  userId: string,
) {
  const { data, error } = await serviceRole.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('The Lumixia billing user could not be resolved.');
  }

  return data.user;
}

export async function attemptAutoReloadForUserId(
  serviceRole: ReturnType<typeof import('./supabase.ts').createServiceRoleClient>,
  userId: string,
) {
  const { data: account, error: accountError } = await serviceRole
    .from('credit_accounts')
    .select('user_id, available_balance, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (accountError) {
    throw new Error(accountError.message);
  }

  const policy = await getAutoReloadPolicy(serviceRole, userId);

  if (!account || !policy || policy.enabled !== true) {
    return { attempted: false, order: null };
  }

  if (account.status !== 'active') {
    return { attempted: false, order: null };
  }

  if (Number(account.available_balance ?? 0) > Number(policy.threshold_credits ?? 0)) {
    return { attempted: false, order: null };
  }

  const { data: inFlightOrder, error: inFlightOrderError } = await serviceRole
    .from('credit_top_up_orders')
    .select('*')
    .eq('user_id', userId)
    .eq('trigger_source', 'auto_reload')
    .in('status', ['initiated', 'requires_action', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inFlightOrderError) {
    throw new Error(inFlightOrderError.message);
  }

  if (inFlightOrder) {
    return {
      attempted: true,
      order: mapOrder(inFlightOrder as Record<string, unknown>),
    };
  }

  if (!policy.default_payment_method_id || !policy.currency) {
    await serviceRole
      .from('credit_auto_reload_policies')
      .update({
        enabled: false,
        status: 'needs_payment_method',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { attempted: false, order: null };
  }

  const { data: defaultPaymentMethod, error: defaultPaymentMethodError } =
    await serviceRole
      .from('billing_payment_methods')
      .select('*')
      .eq('id', policy.default_payment_method_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

  if (defaultPaymentMethodError || !defaultPaymentMethod) {
    await serviceRole
      .from('credit_auto_reload_policies')
      .update({
        enabled: false,
        status: 'needs_payment_method',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { attempted: false, order: null };
  }

  const { data: defaultIdentity, error: defaultIdentityError } = await serviceRole
    .from('billing_identities')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('is_default', true)
    .maybeSingle();

  if (defaultIdentityError || !defaultIdentity) {
    throw new Error(
      'Auto reload requires a default billing identity before it can run.',
    );
  }

  const rateBook = await getCurrentRateBook(serviceRole, String(policy.currency));
  const reloadAmountMinor = Number(policy.reload_amount_minor ?? 0);

  if (reloadAmountMinor < Number(rateBook.min_top_up_minor)) {
    throw new Error('The configured auto reload amount is below the minimum top-up.');
  }

  if (reloadAmountMinor > Number(rateBook.max_top_up_minor)) {
    throw new Error('The configured auto reload amount exceeds the maximum top-up.');
  }

  const currentMonthSpend = await listCurrentMonthSpend(
    serviceRole,
    userId,
    String(policy.currency),
  );

  if (currentMonthSpend + reloadAmountMinor > Number(policy.monthly_cap_minor ?? 0)) {
    return { attempted: false, order: null };
  }

  const quotedCredits = Math.floor(
    reloadAmountMinor * Number(rateBook.credits_per_minor_unit),
  );

  const taxCalculation = await createStripeTaxCalculation({
    currency: String(policy.currency).toLowerCase(),
    line_items: [
      {
        amount: reloadAmountMinor,
        reference: 'lumixia_credit_auto_reload',
        tax_code: String(rateBook.tax_code),
      },
    ],
    customer_details: {
      address_source: 'billing',
      address: {
        country: String(defaultIdentity.country).toUpperCase(),
        line1: String(defaultIdentity.address_line1),
        line2:
          typeof defaultIdentity.address_line2 === 'string'
            ? defaultIdentity.address_line2
            : undefined,
        city: String(defaultIdentity.city),
        state:
          typeof defaultIdentity.state_region === 'string'
            ? defaultIdentity.state_region
            : undefined,
        postal_code: String(defaultIdentity.postal_code),
      },
    },
  });

  const subtotalMinor = reloadAmountMinor;
  const totalMinor = Number(
    taxCalculation.amount_total ?? taxCalculation.amountTotal ?? subtotalMinor,
  );
  const taxMinor = Number(
    taxCalculation.tax_amount_exclusive ??
      taxCalculation.amount_tax ??
      Math.max(totalMinor - subtotalMinor, 0),
  );

  const { data: quote, error: quoteError } = await serviceRole
    .from('credit_top_up_quotes')
    .insert({
      user_id: userId,
      rate_book_id: rateBook.id,
      billing_identity_id: defaultIdentity.id,
      currency: String(policy.currency).toLowerCase(),
      amount_minor: reloadAmountMinor,
      credits_per_minor_unit: Number(rateBook.credits_per_minor_unit),
      quoted_credits: quotedCredits,
      subtotal_minor: subtotalMinor,
      tax_minor: taxMinor,
      total_minor: totalMinor,
      stripe_tax_calculation_id:
        typeof taxCalculation.id === 'string' ? taxCalculation.id : null,
      billing_identity_snapshot: {
        id: defaultIdentity.id,
        entity_type: defaultIdentity.entity_type,
        legal_name: defaultIdentity.legal_name,
        billing_email: defaultIdentity.billing_email,
        country: defaultIdentity.country,
        address_line1: defaultIdentity.address_line1,
        address_line2: defaultIdentity.address_line2,
        city: defaultIdentity.city,
        state_region: defaultIdentity.state_region,
        postal_code: defaultIdentity.postal_code,
        tax_id: defaultIdentity.tax_id,
        tax_id_type: defaultIdentity.tax_id_type,
      },
      tax_snapshot: taxCalculation,
      rate_snapshot: {
        currency: String(rateBook.currency),
        credits_per_minor_unit: Number(rateBook.credits_per_minor_unit),
        monthly_user_cap_minor: Number(rateBook.monthly_user_cap_minor),
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select('*')
    .single();

  if (quoteError || !quote) {
    throw new Error(quoteError?.message ?? 'The auto reload quote could not be created.');
  }

  const billingUser = await resolveBillingUser(serviceRole, userId);
  const billingCustomer = await ensureBillingCustomer(serviceRole, billingUser);
  const orderId = crypto.randomUUID();

  const { data: order, error: orderError } = await serviceRole
    .from('credit_top_up_orders')
    .insert({
      id: orderId,
      user_id: userId,
      quote_id: quote.id,
      trigger_source: 'auto_reload',
      status: 'initiated',
      currency: quote.currency,
      quoted_credits: quote.quoted_credits,
      subtotal_minor: quote.subtotal_minor,
      tax_minor: quote.tax_minor,
      total_minor: quote.total_minor,
      stripe_customer_id: billingCustomer.stripe_customer_id,
      default_payment_method_id: defaultPaymentMethod.id,
      billing_identity_snapshot: quote.billing_identity_snapshot,
      tax_snapshot: quote.tax_snapshot,
      rate_snapshot: quote.rate_snapshot,
      idempotency_key: `auto-reload:${userId}:${orderId}`,
    })
    .select('*')
    .single();

  if (orderError?.code === '23505') {
    const { data: existingOrder, error: existingOrderError } = await serviceRole
      .from('credit_top_up_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('trigger_source', 'auto_reload')
      .in('status', ['initiated', 'requires_action', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOrderError) {
      throw new Error(existingOrderError.message);
    }

    if (existingOrder) {
      return {
        attempted: true,
        order: mapOrder(existingOrder as Record<string, unknown>),
      };
    }
  }

  if (orderError || !order) {
    throw new Error(orderError?.message ?? 'The auto reload order could not be created.');
  }

  try {
    const paymentIntent = await createStripePaymentIntent(
      {
        amount: Number(quote.total_minor),
        currency: String(quote.currency),
        customer: billingCustomer.stripe_customer_id,
        payment_method: String(defaultPaymentMethod.stripe_payment_method_id),
        off_session: 'true',
        confirm: 'true',
        metadata: {
          lumixia_user_id: userId,
          lumixia_order_id: order.id,
          lumixia_quote_id: quote.id,
          lumixia_trigger_source: 'auto_reload',
        },
      },
      `auto-reload-pi:${order.id}`,
    );

    const { data: updatedOrder, error: updatedOrderError } = await serviceRole
      .from('credit_top_up_orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status:
          paymentIntent.status === 'requires_action'
            ? 'requires_action'
            : paymentIntent.status === 'succeeded'
              ? 'processing'
              : 'initiated',
      })
      .eq('id', order.id)
      .select('*')
      .single();

    if (updatedOrderError || !updatedOrder) {
      throw new Error(
        updatedOrderError?.message ?? 'The auto reload order could not be updated.',
      );
    }

    await serviceRole
      .from('credit_auto_reload_policies')
      .update({
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return {
      attempted: true,
      order: mapOrder(updatedOrder as Record<string, unknown>),
    };
  } catch (error) {
    const nextFailureCount = Number(policy.failure_count ?? 0) + 1;
    const nextStatus = nextFailureCount >= 3 ? 'disabled' : String(policy.status ?? 'active');

    await serviceRole
      .from('credit_top_up_orders')
      .update({
        status: 'failed',
        failure_message: error instanceof Error ? error.message : 'Auto reload failed.',
      })
      .eq('id', order.id);

    await serviceRole
      .from('credit_auto_reload_policies')
      .update({
        last_attempt_at: new Date().toISOString(),
        failure_count: nextFailureCount,
        enabled: nextFailureCount >= 3 ? false : Boolean(policy.enabled),
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    throw error;
  }
}
