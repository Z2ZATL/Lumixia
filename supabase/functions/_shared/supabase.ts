import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function ensureEnv(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is not configured for this function.`);
  }

  return value;
}

function constantTimeEquals(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

export function createServiceRoleClient() {
  return createClient(
    ensureEnv(supabaseUrl, 'SUPABASE_URL'),
    ensureEnv(supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function createRequestScopedClient(request: Request) {
  const authorization = request.headers.get('Authorization');

  if (!authorization) {
    throw new Error('Authorization header is required.');
  }

  return createClient(
    ensureEnv(supabaseUrl, 'SUPABASE_URL'),
    ensureEnv(supabaseAnonKey, 'SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    },
  );
}

export async function requireAuthenticatedUser(request: Request) {
  const client = createRequestScopedClient(request);
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('An authenticated Lumixia user is required.');
  }

  return user;
}

export function requireInternalCronRequest(request: Request) {
  const configuredSecret = Deno.env.get('LUMIXIA_BILLING_CRON_SECRET') ?? '';
  const headerSecret =
    request.headers.get('x-lumixia-cron-secret') ??
    request.headers.get('x-cron-secret') ??
    '';
  const authorization = request.headers.get('Authorization') ?? '';
  const bearerSecret = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!configuredSecret) {
    throw new Error('LUMIXIA_BILLING_CRON_SECRET is not configured.');
  }

  if (
    !constantTimeEquals(headerSecret, configuredSecret) &&
    !constantTimeEquals(bearerSecret, configuredSecret)
  ) {
    throw new Error('A valid Lumixia billing cron secret is required.');
  }
}
