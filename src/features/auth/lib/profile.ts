import { getSupabaseClient } from '../../../lib/supabase';

export interface ProfileRecord {
  id: string;
  display_name: string | null;
  allow_training: boolean;
  marketing_opt_in: boolean;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  terms_version: string | null;
  privacy_version: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfilePatch = Partial<
  Omit<ProfileRecord, 'id' | 'created_at' | 'updated_at'>
>;

const PROFILE_SELECT = `
  id,
  display_name,
  allow_training,
  marketing_opt_in,
  terms_accepted_at,
  privacy_accepted_at,
  terms_version,
  privacy_version,
  onboarding_completed_at,
  created_at,
  updated_at
`;

function toStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toRequiredTimestamp(value: unknown) {
  return typeof value === 'string' && value.length > 0
    ? value
    : new Date(0).toISOString();
}

function mapProfileRecord(row: Record<string, unknown>): ProfileRecord {
  return {
    id: String(row.id),
    display_name: toStringOrNull(row.display_name),
    allow_training: toBoolean(row.allow_training, true),
    marketing_opt_in: toBoolean(row.marketing_opt_in, false),
    terms_accepted_at: toStringOrNull(row.terms_accepted_at),
    privacy_accepted_at: toStringOrNull(row.privacy_accepted_at),
    terms_version: toStringOrNull(row.terms_version),
    privacy_version: toStringOrNull(row.privacy_version),
    onboarding_completed_at: toStringOrNull(row.onboarding_completed_at),
    created_at: toRequiredTimestamp(row.created_at),
    updated_at: toRequiredTimestamp(row.updated_at),
  };
}

function normalizeProfileError(error: unknown, mode: 'fetch' | 'write') {
  if (isRecord(error) && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    const code = typeof error.code === 'string' ? error.code : '';

    if (
      code === '42P01' ||
      message.includes('relation') && message.includes('profiles')
    ) {
      return new Error(
        'The Supabase profiles table is missing. Create the expected profile schema before using Lumixia.',
      );
    }

    if (
      code === '42703' ||
      code === 'PGRST204' ||
      message.includes('column') ||
      message.includes('schema cache')
    ) {
      return new Error(
        mode === 'fetch'
          ? 'Your Supabase profiles schema is out of date. Apply the latest profile/dashboard SQL and try again.'
          : 'Your Supabase profiles schema is out of date, so this profile update could not be saved. Apply the latest SQL and try again.',
      );
    }

    return new Error(error.message);
  }

  return new Error(
    mode === 'fetch'
      ? 'We could not load your Lumixia profile.'
      : 'We could not save your Lumixia profile.',
  );
}

export async function fetchProfile(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw normalizeProfileError(error, 'fetch');
  }

  return data && isRecord(data) ? mapProfileRecord(data) : null;
}

export async function upsertProfile(userId: string, patch: ProfilePatch = {}) {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...patch,
      },
      { onConflict: 'id' },
    )
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    throw normalizeProfileError(error, 'write');
  }

  if (!isRecord(data)) {
    throw new Error('We could not read the updated Lumixia profile.');
  }

  return mapProfileRecord(data);
}
