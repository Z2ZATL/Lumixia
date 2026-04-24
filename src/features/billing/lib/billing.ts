import { getSupabaseClient } from '../../../lib/supabase';
import type {
  BillingOverview,
  BillingRateBookSummary,
  CheckoutSessionSummary,
  CreditAutoReloadPolicy,
  CreditBalanceSummary,
  CreditLedgerItem,
  CreditTopUpOrder,
  PaymentMethodSummary,
} from '../types';

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

function toStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null;
}

async function normalizeBillingError(error: unknown, functionName: string) {
  if (
    isRecord(error) &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      const payload = await error.context.clone().json();

      if (isRecord(payload) && typeof payload.error === 'string') {
        return new Error(payload.error);
      }
    } catch {
      try {
        const text = await error.context.clone().text();

        if (text.trim()) {
          return new Error(text.trim());
        }
      } catch {
        // Ignore response body parsing failures and fall through to generic handling.
      }
    }
  }

  if (isRecord(error) && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    const code = typeof error.code === 'string' ? error.code : '';

    if (
      code === 'PGRST205' ||
      code === '42P01' ||
      message.includes('relation') ||
      message.includes('schema')
    ) {
      return new Error(
        'The Lumixia billing schema is missing or out of date. Apply supabase/sql/schema/credits_hardening_v1.sql and try again.',
      );
    }

    if (
      code === '42501' ||
      message.includes('permission denied') ||
      message.includes('row-level security')
    ) {
      return new Error(
        'The Lumixia billing permissions are incomplete. Re-apply supabase/sql/ops/dashboard_permissions_repair_v1.sql and try again.',
      );
    }

    return new Error(error.message);
  }

  return new Error(
    `The Lumixia billing request (${functionName}) could not be completed.`,
  );
}

async function invokeBillingFunction<TResponse>(
  functionName: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
  } = {},
) {
  const invokeOptions: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
  } = {
    method: options.method ?? 'POST',
  };

  if (options.body !== undefined) {
    invokeOptions.body = options.body;
  }

  const { data, error } = await getSupabaseClient().functions.invoke(
    functionName,
    invokeOptions,
  );

  if (error) {
    throw await normalizeBillingError(error, functionName);
  }

  return data as TResponse;
}

function mapCreditSummary(value: unknown): CreditBalanceSummary {
  const row = isRecord(value) ? value : {};

  return {
    userId: String(row.userId ?? row.user_id ?? ''),
    availableBalance:
      row.availableBalance === null || row.available_balance === null
        ? null
        : toNumber(row.availableBalance ?? row.available_balance, 0),
    state:
      row.state === 'ready' || row.state === 'loading' ? row.state : 'unavailable',
    status:
      row.status === 'restricted' || row.status === 'closed'
        ? row.status
        : row.status === 'active'
          ? 'active'
          : null,
    restrictedReason: toStringOrNull(
      row.restrictedReason ?? row.restricted_reason,
    ),
    updatedAt: toStringOrNull(row.updatedAt ?? row.updated_at),
  };
}

function mapRateBook(value: unknown): BillingRateBookSummary {
  const row = isRecord(value) ? value : {};

  return {
    id: String(row.id ?? ''),
    currency: String(row.currency ?? '').toUpperCase(),
    minTopUpMinor: toNumber(row.minTopUpMinor ?? row.min_top_up_minor, 0),
    maxTopUpMinor: toNumber(row.maxTopUpMinor ?? row.max_top_up_minor, 0),
    monthlyUserCapMinor: toNumber(
      row.monthlyUserCapMinor ?? row.monthly_user_cap_minor,
      0,
    ),
  };
}

function mapPaymentMethod(value: unknown): PaymentMethodSummary {
  const row = isRecord(value) ? value : {};

  return {
    id: String(row.id ?? ''),
    stripePaymentMethodId: String(
      row.stripePaymentMethodId ?? row.stripe_payment_method_id ?? '',
    ),
    brand: toStringOrNull(row.brand),
    last4: toStringOrNull(row.last4 ?? row.last_4),
    expMonth:
      row.expMonth === null || row.exp_month === null
        ? null
        : toNumber(row.expMonth ?? row.exp_month, 0),
    expYear:
      row.expYear === null || row.exp_year === null
        ? null
        : toNumber(row.expYear ?? row.exp_year, 0),
    isDefault: row.isDefault === true || row.is_default === true,
    reusableForAutoReload:
      row.reusableForAutoReload === true ||
      row.reusable_for_auto_reload === true,
    status: row.status === 'revoked' ? 'revoked' : 'active',
    createdAt: String(row.createdAt ?? row.created_at ?? new Date(0).toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date(0).toISOString()),
  };
}

function mapTopUpOrder(value: unknown): CreditTopUpOrder {
  const row = isRecord(value) ? value : {};

  return {
    id: String(row.id ?? ''),
    status:
      row.status === 'requires_action' ||
      row.status === 'processing' ||
      row.status === 'succeeded' ||
      row.status === 'failed' ||
      row.status === 'canceled' ||
      row.status === 'reversed'
        ? row.status
        : 'initiated',
    triggerSource: row.triggerSource === 'auto_reload' || row.trigger_source === 'auto_reload'
      ? 'auto_reload'
      : 'manual',
    currency: String(row.currency ?? '').toUpperCase(),
    quotedCredits: toNumber(row.quotedCredits ?? row.quoted_credits, 0),
    subtotalMinor: toNumber(row.subtotalMinor ?? row.subtotal_minor, 0),
    taxMinor: toNumber(row.taxMinor ?? row.tax_minor, 0),
    totalMinor: toNumber(row.totalMinor ?? row.total_minor, 0),
    stripePaymentIntentId: toStringOrNull(
      row.stripePaymentIntentId ?? row.stripe_payment_intent_id,
    ),
    stripeSetupIntentId: toStringOrNull(
      row.stripeSetupIntentId ?? row.stripe_setup_intent_id,
    ),
    stripeChargeId: toStringOrNull(row.stripeChargeId ?? row.stripe_charge_id),
    createdAt: String(row.createdAt ?? row.created_at ?? new Date(0).toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date(0).toISOString()),
  };
}

function mapAutoReloadPolicy(value: unknown): CreditAutoReloadPolicy {
  const row = isRecord(value) ? value : {};

  return {
    enabled: row.enabled === true,
    status:
      row.status === 'active' ||
      row.status === 'paused' ||
      row.status === 'disabled' ||
      row.status === 'needs_payment_method'
        ? row.status
        : 'inactive',
    thresholdCredits: toNumber(
      row.thresholdCredits ?? row.threshold_credits,
      0,
    ),
    reloadAmountMinor: toNumber(
      row.reloadAmountMinor ?? row.reload_amount_minor,
      0,
    ),
    currency: toStringOrNull(row.currency),
    monthlyCapMinor: toNumber(
      row.monthlyCapMinor ?? row.monthly_cap_minor,
      0,
    ),
    monthToDateMinor: toNumber(
      row.monthToDateMinor ?? row.month_to_date_minor,
      0,
    ),
    monthWindowStartedAt: String(
      row.monthWindowStartedAt ??
        row.month_window_started_at ??
        new Date(0).toISOString(),
    ),
    defaultPaymentMethodId: toStringOrNull(
      row.defaultPaymentMethodId ?? row.default_payment_method_id,
    ),
    consentTextVersion: toStringOrNull(
      row.consentTextVersion ?? row.consent_text_version,
    ),
    consentedAt: toStringOrNull(row.consentedAt ?? row.consented_at),
    lastAttemptAt: toStringOrNull(row.lastAttemptAt ?? row.last_attempt_at),
    failureCount: toNumber(row.failureCount ?? row.failure_count, 0),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date(0).toISOString()),
  };
}

function mapLedgerItem(value: unknown): CreditLedgerItem {
  const row = isRecord(value) ? value : {};

  return {
    id: String(row.id ?? ''),
    entryKind: String(row.entryKind ?? row.entry_kind ?? ''),
    delta: toNumber(row.delta, 0),
    balanceAfter: toNumber(row.balanceAfter ?? row.balance_after, 0),
    referenceType: toStringOrNull(row.referenceType ?? row.reference_type),
    referenceId: toStringOrNull(row.referenceId ?? row.reference_id),
    createdAt: String(row.createdAt ?? row.created_at ?? new Date(0).toISOString()),
    metadata: isRecord(row.metadata) ? row.metadata : {},
  };
}

function mapOverview(value: unknown): BillingOverview {
  const row = isRecord(value) ? value : {};
  const rateBooksSource = Array.isArray(row.rateBooks)
    ? row.rateBooks
    : Array.isArray(row.rate_books)
      ? row.rate_books
      : [];
  const paymentMethodsSource = Array.isArray(row.paymentMethods)
    ? row.paymentMethods
    : Array.isArray(row.payment_methods)
      ? row.payment_methods
      : [];
  const autoReloadPolicySource =
    row.autoReloadPolicy ?? row.auto_reload_policy ?? null;
  const recentLedgerContainer = isRecord(row.recentLedger)
    ? row.recentLedger
    : isRecord(row.recent_ledger)
      ? row.recent_ledger
      : null;
  const recentLedgerSource = Array.isArray(recentLedgerContainer?.items)
    ? recentLedgerContainer.items
    : Array.isArray(row.recentLedger)
      ? row.recentLedger
      : Array.isArray(row.recent_ledger)
        ? row.recent_ledger
        : [];

  return {
    summary: mapCreditSummary(row.summary),
    rateBooks: rateBooksSource.map(mapRateBook),
    paymentMethods: paymentMethodsSource.map(mapPaymentMethod),
    autoReloadPolicy: autoReloadPolicySource
      ? mapAutoReloadPolicy(autoReloadPolicySource)
      : null,
    recentLedger: {
      items: recentLedgerSource.map(mapLedgerItem),
    },
  };
}

export function formatMinorCurrency(
  amountMinor: number,
  currency: string,
  locale = 'en-US',
) {
  const normalizedCurrency =
    typeof currency === 'string' && currency.trim().length >= 3
      ? currency.trim().toUpperCase()
      : 'USD';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(amountMinor / 100);
  } catch {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  }
}

export async function fetchBillingOverview() {
  const data = await invokeBillingFunction<unknown>('billing-overview', {
    method: 'POST',
  });

  return mapOverview(data);
}

export async function createCheckoutSession(input: {
  amountMinor: number;
  currency: string;
  returnUrl: string;
}) {
  const data = await invokeBillingFunction<unknown>('billing-checkout-session', {
    method: 'POST',
    body: {
      amountMinor: input.amountMinor,
      currency: input.currency,
      returnUrl: input.returnUrl,
    },
  });

  const row = isRecord(data) ? data : {};

  return {
    sessionId: String(row.sessionId ?? row.session_id ?? ''),
    url: String(row.url ?? ''),
    quotedCredits: toNumber(row.quotedCredits ?? row.quoted_credits, 0),
    currency: String(row.currency ?? '').toUpperCase(),
    amountMinor: toNumber(row.amountMinor ?? row.amount_minor, 0),
  } satisfies CheckoutSessionSummary;
}

export async function updateAutoReloadPolicy(input: {
  enabled: boolean;
  thresholdCredits: number;
  reloadAmountMinor: number;
  currency: string;
  monthlyCapMinor: number;
  defaultPaymentMethodId: string | null;
  consentTextVersion?: string;
}) {
  const data = await invokeBillingFunction<unknown>('billing-auto-reload', {
    method: 'PUT',
    body: input,
  });

  return mapAutoReloadPolicy(data);
}

export async function attemptAutoReload() {
  const data = await invokeBillingFunction<unknown>('billing-auto-reload', {
    method: 'POST',
    body: {
      action: 'attempt',
    },
  });

  return data && isRecord(data)
    ? {
        attempted: data.attempted === true,
        order: data.order ? mapTopUpOrder(data.order) : null,
      }
    : { attempted: false, order: null };
}
