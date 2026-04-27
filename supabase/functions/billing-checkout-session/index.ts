import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  createStripeCheckoutSession,
  getStripeSecretKeyMode,
} from '../_shared/stripe.ts';
import {
  ensureBillingCustomer,
  getCurrentRateBook,
  normalizeCurrency,
} from '../_shared/billing.ts';
import {
  createServiceRoleClient,
  requireAuthenticatedUser,
} from '../_shared/supabase.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function buildReturnUrl(rawUrl: string, status: 'success' | 'cancelled') {
  const url = new URL(rawUrl);
  url.searchParams.set('billing_checkout', status);

  if (status === 'success') {
    url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  } else {
    url.searchParams.delete('session_id');
  }

  return url.toString();
}

serve(async (request) => {
  const preflight = handleOptions(request);

  if (preflight) {
    return preflight;
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, { status: 405 }, request);
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const serviceRole = createServiceRoleClient();
    const body = (await request.json()) as {
      amountMinor?: number;
      currency?: string;
      idempotencyKey?: string;
      returnUrl?: string;
    };

    const amountMinor = Number(body.amountMinor ?? 0);
    const currency = normalizeCurrency(String(body.currency ?? ''));
    const rawIdempotencyKey =
      typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
    const returnUrl = String(body.returnUrl ?? '');

    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      throw new Error('Choose a valid top-up amount before continuing.');
    }

    if (!currency) {
      throw new Error('Choose a billing currency before continuing.');
    }

    if (!returnUrl) {
      throw new Error('A return URL is required before Stripe checkout can open.');
    }

    if (
      rawIdempotencyKey &&
      !/^[A-Za-z0-9:_-]{8,128}$/.test(rawIdempotencyKey)
    ) {
      throw new Error('Stripe checkout idempotency key is invalid.');
    }

    const checkoutIdempotencyKey = rawIdempotencyKey || crypto.randomUUID();
    const requestOrigin = request.headers.get('Origin');
    const parsedReturnUrl = new URL(returnUrl);

    if (!['http:', 'https:'].includes(parsedReturnUrl.protocol)) {
      throw new Error('Stripe checkout requires a valid return URL.');
    }

    if (!requestOrigin) {
      throw new Error('Stripe checkout requires a browser origin header.');
    }

    if (
      getStripeSecretKeyMode() === 'live' &&
      isLoopbackHost(parsedReturnUrl.hostname)
    ) {
      throw new Error(
        'Live Stripe checkout is blocked on localhost and other loopback URLs. Use test mode locally or launch checkout from your production origin.',
      );
    }

    const parsedOrigin = new URL(requestOrigin);
    const isEquivalentLoopbackOrigin =
      parsedReturnUrl.port === parsedOrigin.port &&
      isLoopbackHost(parsedReturnUrl.hostname) &&
      isLoopbackHost(parsedOrigin.hostname);

    if (
      parsedReturnUrl.origin !== parsedOrigin.origin &&
      !isEquivalentLoopbackOrigin
    ) {
      throw new Error('Stripe checkout can only return to the current Lumixia origin.');
    }

    const rateBook = await getCurrentRateBook(serviceRole, currency);

    if (amountMinor < Number(rateBook.min_top_up_minor)) {
      throw new Error(
        `The minimum top-up for ${currency.toUpperCase()} is ${rateBook.min_top_up_minor}.`,
      );
    }

    if (amountMinor > Number(rateBook.max_top_up_minor)) {
      throw new Error(
        `The maximum top-up for ${currency.toUpperCase()} is ${rateBook.max_top_up_minor}.`,
      );
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data: priorOrders, error: priorOrdersError } = await serviceRole
      .from('credit_top_up_orders')
      .select('subtotal_minor')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .in('status', ['succeeded', 'reversed'])
      .gte('created_at', monthStart.toISOString());

    if (priorOrdersError) {
      throw new Error(priorOrdersError.message);
    }

    const currentMonthSpend = (priorOrders ?? []).reduce(
      (sum, row) => sum + Number(row.subtotal_minor ?? 0),
      0,
    );

    if (
      currentMonthSpend + amountMinor >
      Number(rateBook.monthly_user_cap_minor)
    ) {
      throw new Error(
        'This top-up would exceed the monthly cap configured for this currency.',
      );
    }

    const quotedCredits = Math.floor(
      amountMinor * Number(rateBook.credits_per_minor_unit),
    );

    if (quotedCredits <= 0) {
      throw new Error(
        'This top-up amount does not produce any credits with the current rate book.',
      );
    }

    const billingCustomer = await ensureBillingCustomer(serviceRole, user);

    const checkoutSession = await createStripeCheckoutSession(
      {
        mode: 'payment',
        customer: billingCustomer.stripe_customer_id,
        success_url: buildReturnUrl(returnUrl, 'success'),
        cancel_url: buildReturnUrl(returnUrl, 'cancelled'),
        automatic_tax: {
          enabled: 'true',
        },
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        tax_id_collection: {
          enabled: 'true',
        },
        payment_intent_data: {
          setup_future_usage: 'off_session',
          metadata: {
            lumixia_user_id: user.id,
            lumixia_trigger_source: 'manual',
            lumixia_amount_minor: String(amountMinor),
            lumixia_currency: currency,
            lumixia_rate_book_id: String(rateBook.id),
            lumixia_quoted_credits: String(quotedCredits),
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountMinor,
              product_data: {
                name: 'Lumixia Credits',
                description: `${quotedCredits.toLocaleString()} credits`,
                tax_code: String(rateBook.tax_code),
              },
            },
          },
        ],
        metadata: {
          lumixia_user_id: user.id,
          lumixia_trigger_source: 'manual',
          lumixia_amount_minor: String(amountMinor),
          lumixia_currency: currency,
          lumixia_rate_book_id: String(rateBook.id),
          lumixia_quoted_credits: String(quotedCredits),
        },
      },
      `checkout-session:${user.id}:${checkoutIdempotencyKey}`,
    );

    if (!checkoutSession.url) {
      throw new Error('Stripe checkout did not return a hosted session URL.');
    }

    return jsonResponse(
      {
        sessionId: String(checkoutSession.id ?? ''),
        url: String(checkoutSession.url),
        quotedCredits,
        currency: currency.toUpperCase(),
        amountMinor,
      },
      {},
      request,
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Stripe checkout could not be prepared.',
      },
      { status: 400 },
      request,
    );
  }
});
