import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';

function getConfiguredBrowserOrigin() {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_ORIGIN;

  if (typeof configuredOrigin !== 'string' || configuredOrigin.trim().length === 0) {
    return null;
  }

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return null;
  }
}

function getBrowserRedirectUrl() {
  const configuredOrigin = getConfiguredBrowserOrigin();

  if (!configuredOrigin) {
    throw new Error(
      'VITE_PUBLIC_APP_ORIGIN must be configured before secure Lumixia authentication can run.',
    );
  }

  return configuredOrigin;
}

export async function requestEmailOtp(email: string) {
  const supabase = getSupabaseClient();
  const redirectTo = getBrowserRedirectUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  const redirectTo = getBrowserRedirectUrl();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      ...(redirectTo ? { redirectTo } : {}),
    },
  });

  if (error) {
    throw error;
  }
}

export async function verifyEmailOtp(email: string, token: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return getSupabaseClient().auth.onAuthStateChange(callback);
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
