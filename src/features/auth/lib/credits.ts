import { getSupabaseClient } from '../../../lib/supabase';

export type CreditsMode = 'stub' | 'live';
export type CreditState = 'loading' | 'ready' | 'unavailable';
export type CreditAccountStatus = 'active' | 'restricted' | 'closed';

export interface CreditAccount {
  user_id: string;
  available_balance: number;
  status: CreditAccountStatus;
  restricted_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  account_user_id: string;
  entry_kind: string;
  delta: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConsumeCreditsResult {
  balance_after: number;
  debited_amount: number;
  ledger_entry_id: string;
}

export interface RefundCreditsResult {
  balance_after: number;
  refunded_amount: number;
  ledger_entry_id: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback: number) {
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

function normalizeCreditsError(error: unknown, mode: 'fetch' | 'consume') {
  if (isRecord(error) && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    const code = typeof error.code === 'string' ? error.code : '';

    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      (message.includes('relation') && message.includes('credit_accounts')) ||
      (message.includes('relation') && message.includes('credit_ledger'))
    ) {
      return new Error(
        'The Lumixia credits schema is missing in Supabase. Run supabase/sql/schema/credits_hardening_v1.sql and try again.',
      );
    }

    if (
      code === '42501' ||
      message.includes('permission denied') ||
      message.includes('row-level security')
    ) {
      return new Error(
        'The Lumixia credits permissions are incomplete in Supabase. Re-apply the credits hardening SQL and try again.',
      );
    }

    if (mode === 'consume' && message.includes('function')) {
      return new Error(
        'The secure credits RPC is not available yet. Apply the latest credits SQL before enabling live billing.',
      );
    }

    return new Error(error.message);
  }

  return new Error(
    mode === 'fetch'
      ? 'We could not load your Lumixia credit account.'
      : 'We could not consume Lumixia credits right now.',
  );
}

function mapCreditAccount(row: Record<string, unknown>): CreditAccount {
  const status =
    row.status === 'restricted' || row.status === 'closed'
      ? row.status
      : 'active';

  return {
    user_id: String(row.user_id),
    available_balance: toNumber(row.available_balance, 0),
    status,
    restricted_reason:
      typeof row.restricted_reason === 'string' ? row.restricted_reason : null,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    created_at:
      typeof row.created_at === 'string'
        ? row.created_at
        : new Date(0).toISOString(),
    updated_at:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : new Date(0).toISOString(),
  };
}

export function getCreditsMode(): CreditsMode {
  return import.meta.env.VITE_CREDITS_MODE === 'live' ? 'live' : 'stub';
}

export async function fetchCreditAccount(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('credit_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw normalizeCreditsError(error, 'fetch');
  }

  return data && isRecord(data) ? mapCreditAccount(data) : null;
}

export async function consumeAgentCredits(input: {
  agentSlug: string;
  executionSessionId: string;
  idempotencyKey: string;
}) {
  const { data, error } = await getSupabaseClient().rpc(
    'consume_agent_credits',
    {
      agent_slug: input.agentSlug,
      execution_session_id: input.executionSessionId,
      idempotency_key: input.idempotencyKey,
    },
  );

  if (error) {
    throw normalizeCreditsError(error, 'consume');
  }

  const firstRow = Array.isArray(data) ? data[0] : data;

  if (!isRecord(firstRow)) {
    throw new Error(
      'The secure credits RPC did not return the updated account balance.',
    );
  }

  return {
    balance_after: toNumber(firstRow.balance_after, 0),
    debited_amount: toNumber(firstRow.debited_amount, 0),
    ledger_entry_id: String(firstRow.ledger_entry_id),
  } satisfies ConsumeCreditsResult;
}

export async function refundAgentCredits(input: {
  executionSessionId: string;
  idempotencyKey: string;
  reason?: string;
}) {
  const { data, error } = await getSupabaseClient().rpc('refund_agent_credits', {
    execution_session_id: input.executionSessionId,
    idempotency_key: input.idempotencyKey,
    reason: input.reason ?? 'execution_failed',
  });

  if (error) {
    throw normalizeCreditsError(error, 'consume');
  }

  const firstRow = Array.isArray(data) ? data[0] : data;

  if (!isRecord(firstRow)) {
    throw new Error(
      'The secure credits refund RPC did not return the updated account balance.',
    );
  }

  return {
    balance_after: toNumber(firstRow.balance_after, 0),
    refunded_amount: toNumber(firstRow.refunded_amount, 0),
    ledger_entry_id: String(firstRow.ledger_entry_id),
  } satisfies RefundCreditsResult;
}
