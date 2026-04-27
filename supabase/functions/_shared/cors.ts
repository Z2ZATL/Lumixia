const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

function getConfiguredOrigins() {
  const raw = Deno.env.get('LUMIXIA_ALLOWED_ORIGINS') ?? '';

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(request?: Request) {
  const origin = request?.headers.get('Origin') ?? null;

  if (!origin) {
    return null;
  }

  const configuredOrigins = getConfiguredOrigins();

  if (configuredOrigins.length > 0) {
    return configuredOrigins.includes(origin) ? origin : null;
  }

  return DEFAULT_ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function buildCorsHeaders(request?: Request) {
  const allowedOrigin = resolveAllowedOrigin(request);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, accept, prefer, stripe-signature, x-lumixia-cron-secret',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  return headers;
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
  request?: Request,
) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request),
      ...(init.headers ?? {}),
    },
  });
}

export function handleOptions(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: buildCorsHeaders(request),
    });
  }

  return null;
}
