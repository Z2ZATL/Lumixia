function requireStripeSecretKey() {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const normalizedSecretKey = secretKey.trim();
  const lowerSecretKey = normalizedSecretKey.toLowerCase();

  if (/_xxx$/i.test(normalizedSecretKey) || lowerSecretKey.includes('replace_with')) {
    throw new Error(
      'STRIPE_SECRET_KEY is still a placeholder. Replace it with a real Stripe secret key before opening checkout.',
    );
  }

  return normalizedSecretKey;
}

export function getStripeSecretKeyMode() {
  const secretKey = requireStripeSecretKey();
  return secretKey.startsWith('sk_live_') ? 'live' : 'test';
}

function appendFormValue(
  params: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      appendFormValue(params, `${key}[${index}]`, entry);
    });
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
      appendFormValue(params, `${key}[${entryKey}]`, entryValue);
    });
    return;
  }

  params.append(key, String(value));
}

function toStripeBody(input: Record<string, unknown>) {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    appendFormValue(params, key, value);
  });

  return params;
}

async function stripeRequest<TResponse>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
  options: { idempotencyKey?: string } = {},
) {
  const secretKey = requireStripeSecretKey();
  const headers = new Headers({
    Authorization: `Bearer ${secretKey}`,
  });

  let requestUrl = `https://api.stripe.com${path}`;
  let requestBody: URLSearchParams | undefined;

  if (method === 'GET' && body) {
    requestUrl += `?${toStripeBody(body).toString()}`;
  } else if (body) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    requestBody = toStripeBody(body);
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  const response = await fetch(requestUrl, {
    method,
    headers,
    body: requestBody?.toString(),
  });

  const json = (await response.json()) as TResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? 'Stripe request failed.');
  }

  return json;
}

export async function createStripeCustomer(input: {
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
}) {
  return stripeRequest<{
    id: string;
    email?: string | null;
  }>('POST', '/v1/customers', {
    email: input.email,
    name: input.name,
    metadata: input.metadata,
  });
}

export async function createStripePaymentIntent(
  input: Record<string, unknown>,
  idempotencyKey?: string,
) {
  return stripeRequest<{
    id: string;
    client_secret?: string;
    status?: string;
    latest_charge?: string | null;
  }>('POST', '/v1/payment_intents', input, {
    idempotencyKey,
  });
}

export async function createStripeCheckoutSession(
  input: Record<string, unknown>,
  idempotencyKey?: string,
) {
  return stripeRequest<{
    id: string;
    url?: string;
    payment_intent?: string | null;
    customer?: string | null;
    status?: string;
  }>('POST', '/v1/checkout/sessions', input, {
    idempotencyKey,
  });
}

export async function retrieveStripePaymentMethod(paymentMethodId: string) {
  return stripeRequest<Record<string, unknown>>(
    'GET',
    `/v1/payment_methods/${paymentMethodId}`,
  );
}

export async function retrieveStripePaymentIntent(paymentIntentId: string) {
  return stripeRequest<Record<string, unknown>>(
    'GET',
    `/v1/payment_intents/${paymentIntentId}`,
  );
}

export async function createStripeTaxCalculation(input: Record<string, unknown>) {
  return stripeRequest<Record<string, unknown>>(
    'POST',
    '/v1/tax/calculations',
    input,
  );
}

export async function createStripeTaxTransactionFromCalculation(input: {
  calculation: string;
  reference: string;
  metadata?: Record<string, string>;
}) {
  return stripeRequest<Record<string, unknown>>(
    'POST',
    '/v1/tax/transactions/create_from_calculation',
    {
      calculation: input.calculation,
      reference: input.reference,
      metadata: input.metadata ?? {},
    },
  );
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function computeStripeSignature(
  payload: string,
  timestamp: string,
  secret: string,
) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );

  return Array.from(new Uint8Array(signed))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
) {
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }

  if (!signatureHeader) {
    throw new Error('Stripe signature header is missing.');
  }

  const segments = signatureHeader.split(',');
  const timestamp = segments
    .find((segment) => segment.startsWith('t='))
    ?.replace('t=', '');
  const signatures = segments
    .filter((segment) => segment.startsWith('v1='))
    .map((segment) => segment.replace('v1=', ''));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Stripe signature header is malformed.');
  }

  const parsedTimestamp = Number(timestamp);
  const toleranceSeconds = Number(
    Deno.env.get('STRIPE_WEBHOOK_TOLERANCE_SECONDS') ?? '300',
  );

  if (!Number.isFinite(parsedTimestamp)) {
    throw new Error('Stripe signature timestamp is invalid.');
  }

  if (
    Number.isFinite(toleranceSeconds) &&
    toleranceSeconds > 0 &&
    Math.abs(Math.floor(Date.now() / 1000) - parsedTimestamp) > toleranceSeconds
  ) {
    throw new Error('Stripe signature timestamp is outside the allowed tolerance.');
  }

  const expectedSignature = await computeStripeSignature(
    payload,
    timestamp,
    webhookSecret,
  );

  const isValid = signatures.some((candidate) =>
    timingSafeEqualHex(candidate, expectedSignature),
  );

  if (!isValid) {
    throw new Error('Stripe signature verification failed.');
  }
}
