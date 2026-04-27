import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  createStripeTaxTransactionFromCalculation,
  retrieveStripePaymentIntent,
  retrieveStripePaymentMethod,
  verifyStripeWebhookSignature,
} from '../_shared/stripe.ts';
import { createServiceRoleClient } from '../_shared/supabase.ts';
import { syncPaymentMethodRecord } from '../_shared/billing.ts';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
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

async function findOrderByPaymentIntent(
  serviceRole: ReturnType<typeof import('../_shared/supabase.ts').createServiceRoleClient>,
  paymentIntentId: string,
) {
  const { data, error } = await serviceRole
    .from('credit_top_up_orders')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function syncCheckoutBillingIdentity(
  serviceRole: ReturnType<typeof import('../_shared/supabase.ts').createServiceRoleClient>,
  input: {
    userId: string;
    customerDetails: Record<string, unknown>;
    fallbackEmail: string | null;
  },
) {
  const customerDetails = asRecord(input.customerDetails);
  const address = asRecord(customerDetails.address);
  const taxIds = Array.isArray(customerDetails.tax_ids)
    ? customerDetails.tax_ids.map(asRecord)
    : [];
  const primaryTaxId = taxIds[0] ?? {};
  const legalName =
    toStringOrNull(customerDetails.name) ??
    input.fallbackEmail ??
    'Lumixia Customer';
  const billingEmail =
    toStringOrNull(customerDetails.email) ??
    input.fallbackEmail ??
    'billing@lumixia.local';
  const payload = {
    entity_type: 'individual',
    legal_name: legalName,
    billing_email: billingEmail,
    country: (toStringOrNull(address.country) ?? 'US').toUpperCase(),
    address_line1:
      toStringOrNull(address.line1) ?? 'Collected by Stripe Checkout',
    address_line2: toStringOrNull(address.line2),
    city: toStringOrNull(address.city) ?? 'Unknown',
    state_region: toStringOrNull(address.state),
    postal_code: toStringOrNull(address.postal_code) ?? '00000',
    tax_id: toStringOrNull(primaryTaxId.value),
    tax_id_type: toStringOrNull(primaryTaxId.type),
    status: 'active',
  };

  const { data: existingDefault, error: existingDefaultError } = await serviceRole
    .from('billing_identities')
    .select('*')
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .eq('is_default', true)
    .maybeSingle();

  if (existingDefaultError) {
    throw new Error(existingDefaultError.message);
  }

  if (existingDefault) {
    const { data: updatedIdentity, error: updateError } = await serviceRole
      .from('billing_identities')
      .update(payload)
      .eq('id', existingDefault.id)
      .select('*')
      .single();

    if (updateError || !updatedIdentity) {
      throw new Error(updateError?.message ?? 'The billing identity could not be updated.');
    }

    return updatedIdentity;
  }

  const { data: insertedIdentity, error: insertError } = await serviceRole
    .from('billing_identities')
    .insert({
      user_id: input.userId,
      ...payload,
      is_default: true,
    })
    .select('*')
    .single();

  if (insertError || !insertedIdentity) {
    throw new Error(insertError?.message ?? 'The billing identity could not be created.');
  }

  return insertedIdentity;
}

async function createManualOrderFromCheckoutSession(
  serviceRole: ReturnType<typeof import('../_shared/supabase.ts').createServiceRoleClient>,
  session: Record<string, unknown>,
) {
  const metadata = asRecord(session.metadata);
  const userId = String(metadata.lumixia_user_id ?? '');
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (!userId || !paymentIntentId) {
    throw new Error('The Stripe checkout session is missing Lumixia metadata.');
  }

  const existingOrder = await findOrderByPaymentIntent(serviceRole, paymentIntentId);

  if (existingOrder) {
    return existingOrder;
  }

  const rateBookId = String(metadata.lumixia_rate_book_id ?? '');
  const quotedCredits = toNumber(metadata.lumixia_quoted_credits, 0);
  const paymentIntent = asRecord(await retrieveStripePaymentIntent(paymentIntentId));
  const customerDetails = asRecord(session.customer_details);
  const stripeCustomerId =
    toStringOrNull(session.customer) ??
    toStringOrNull(paymentIntent.customer);
  const currency = (
    toStringOrNull(session.currency) ??
    toStringOrNull(metadata.lumixia_currency) ??
    'usd'
  ).toLowerCase();
  const subtotalMinor =
    toNumber(session.amount_subtotal, 0) ||
    toNumber(metadata.lumixia_amount_minor, 0);
  const totalMinor = toNumber(session.amount_total, subtotalMinor);
  const totalDetails = asRecord(session.total_details);
  const taxMinor = toNumber(
    totalDetails.amount_tax,
    Math.max(totalMinor - subtotalMinor, 0),
  );

  if (!rateBookId || quotedCredits <= 0 || subtotalMinor <= 0 || !stripeCustomerId) {
    throw new Error('The Stripe checkout metadata is incomplete for Lumixia billing.');
  }

  const { data: rateBook, error: rateBookError } = await serviceRole
    .from('credit_rate_books')
    .select('*')
    .eq('id', rateBookId)
    .single();

  if (rateBookError || !rateBook) {
    throw new Error(rateBookError?.message ?? 'The Lumixia rate book could not be resolved.');
  }

  const billingIdentity = await syncCheckoutBillingIdentity(serviceRole, {
    userId,
    customerDetails,
    fallbackEmail: toStringOrNull(customerDetails.email),
  });

  const billingIdentitySnapshot = {
    id: billingIdentity.id,
    entity_type: billingIdentity.entity_type,
    legal_name: billingIdentity.legal_name,
    billing_email: billingIdentity.billing_email,
    country: billingIdentity.country,
    address_line1: billingIdentity.address_line1,
    address_line2: billingIdentity.address_line2,
    city: billingIdentity.city,
    state_region: billingIdentity.state_region,
    postal_code: billingIdentity.postal_code,
    tax_id: billingIdentity.tax_id,
    tax_id_type: billingIdentity.tax_id_type,
  };
  const taxSnapshot = {
    checkout_session_id: String(session.id ?? ''),
    automatic_tax: session.automatic_tax ?? null,
    total_details: totalDetails,
    customer_details: customerDetails,
  };
  const rateSnapshot = {
    rate_book_id: String(rateBook.id),
    currency: String(rateBook.currency),
    credits_per_minor_unit: Number(rateBook.credits_per_minor_unit ?? 0),
    monthly_user_cap_minor: Number(rateBook.monthly_user_cap_minor ?? 0),
  };

  const { data: insertedQuote, error: insertQuoteError } = await serviceRole
    .from('credit_top_up_quotes')
    .insert({
      user_id: userId,
      rate_book_id: rateBook.id,
      billing_identity_id: billingIdentity.id,
      currency,
      amount_minor: subtotalMinor,
      credits_per_minor_unit: Number(rateBook.credits_per_minor_unit ?? 0),
      quoted_credits: quotedCredits,
      subtotal_minor: subtotalMinor,
      tax_minor: taxMinor,
      total_minor: totalMinor,
      stripe_tax_calculation_id: null,
      billing_identity_snapshot: billingIdentitySnapshot,
      tax_snapshot: taxSnapshot,
      rate_snapshot: rateSnapshot,
      status: 'quoted',
      expires_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertQuoteError || !insertedQuote) {
    throw new Error(insertQuoteError?.message ?? 'The Lumixia checkout quote could not be created.');
  }

  const { data: insertedOrder, error: insertOrderError } = await serviceRole
    .from('credit_top_up_orders')
    .insert({
      user_id: userId,
      quote_id: insertedQuote.id,
      trigger_source: 'manual',
      status: 'processing',
      currency,
      quoted_credits: quotedCredits,
      subtotal_minor: subtotalMinor,
      tax_minor: taxMinor,
      total_minor: totalMinor,
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: toStringOrNull(paymentIntent.latest_charge),
      stripe_customer_id: stripeCustomerId,
      billing_identity_snapshot: billingIdentitySnapshot,
      tax_snapshot: taxSnapshot,
      rate_snapshot: rateSnapshot,
      idempotency_key: `checkout-session:${String(session.id ?? paymentIntentId)}`,
    })
    .select('*')
    .single();

  if (insertOrderError?.code === '23505') {
    const existingOrderAfterConflict = await findOrderByPaymentIntent(
      serviceRole,
      paymentIntentId,
    );

    if (existingOrderAfterConflict) {
      return existingOrderAfterConflict;
    }
  }

  if (insertOrderError || !insertedOrder) {
    throw new Error(insertOrderError?.message ?? 'The Lumixia top-up order could not be created.');
  }

  const paymentMethodId = toStringOrNull(paymentIntent.payment_method);

  if (paymentMethodId) {
    const stripePaymentMethod = await retrieveStripePaymentMethod(paymentMethodId);
    const { data: existingDefault } = await serviceRole
      .from('billing_payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_default', true)
      .maybeSingle();

    await syncPaymentMethodRecord(serviceRole, {
      userId,
      stripeCustomerId,
      stripePaymentMethod,
      reusableForAutoReload: true,
      markDefault: !existingDefault,
    });
  }

  return insertedOrder;
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
    const payload = await request.text();
    await verifyStripeWebhookSignature(
      payload,
      request.headers.get('Stripe-Signature'),
    );

    const event = JSON.parse(payload) as Record<string, unknown>;
    const eventId = String(event.id ?? '');
    const eventType = String(event.type ?? '');
    const eventObject = asRecord(asRecord(event.data).object);
    const serviceRole = createServiceRoleClient();

    if (eventType === 'checkout.session.completed') {
      const checkoutSession = eventObject;
      const triggerSource = String(
        asRecord(checkoutSession.metadata).lumixia_trigger_source ?? '',
      );

      if (triggerSource !== 'manual') {
        await serviceRole.from('billing_webhook_events').upsert({
          stripe_event_id: eventId,
          event_type: eventType,
          status: 'ignored',
          payload: event,
          processed_at: new Date().toISOString(),
        });

        return jsonResponse({ received: true, ignored: true }, {}, request);
      }

      if (String(checkoutSession.payment_status ?? '') !== 'paid') {
        await serviceRole.from('billing_webhook_events').upsert({
          stripe_event_id: eventId,
          event_type: eventType,
          status: 'ignored',
          payload: event,
          processed_at: new Date().toISOString(),
        });

        return jsonResponse({ received: true, ignored: true }, {}, request);
      }

      const order = await createManualOrderFromCheckoutSession(
        serviceRole,
        checkoutSession,
      );

      const { error: grantError } = await serviceRole.rpc('grant_top_up_credits', {
        order_id: order.id,
        stripe_event_id: eventId,
      });

      if (grantError) {
        throw new Error(grantError.message);
      }

      await serviceRole.from('billing_webhook_events').upsert({
        stripe_event_id: eventId,
        event_type: eventType,
        order_id: order.id,
        status: 'processed',
        payload: event,
        processed_at: new Date().toISOString(),
      });

      return jsonResponse({ received: true }, {}, request);
    }

    if (eventType === 'setup_intent.succeeded') {
      const setupIntent = eventObject;
      const userId = String(asRecord(setupIntent.metadata).lumixia_user_id ?? '');
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : null;
      const stripeCustomerId =
        typeof setupIntent.customer === 'string' ? setupIntent.customer : null;

      if (userId && paymentMethodId && stripeCustomerId) {
        const stripePaymentMethod = await retrieveStripePaymentMethod(paymentMethodId);
        const { data: existingDefault } = await serviceRole
          .from('billing_payment_methods')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .eq('is_default', true)
          .maybeSingle();

        await syncPaymentMethodRecord(serviceRole, {
          userId,
          stripeCustomerId,
          stripePaymentMethod,
          reusableForAutoReload: true,
          markDefault: !existingDefault,
        });
      }

      await serviceRole.from('billing_webhook_events').upsert({
        stripe_event_id: eventId,
        event_type: eventType,
        status: 'processed',
        payload: event,
        processed_at: new Date().toISOString(),
      });

      return jsonResponse({ received: true }, {}, request);
    }

    if (
      eventType === 'payment_intent.succeeded' ||
      eventType === 'payment_intent.payment_failed'
    ) {
      const paymentIntent = eventObject;
      const paymentIntentId = String(paymentIntent.id ?? '');

      if (!paymentIntentId) {
        throw new Error('Payment intent ID is missing from the Stripe event.');
      }

      const order =
        (await findOrderByPaymentIntent(serviceRole, paymentIntentId)) ??
        null;

      if (!order) {
        await serviceRole.from('billing_webhook_events').upsert({
          stripe_event_id: eventId,
          event_type: eventType,
          status: 'ignored',
          payload: event,
          processed_at: new Date().toISOString(),
        });

        return jsonResponse({ received: true, ignored: true }, {}, request);
      }

      const latestCharge =
        typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : null;
      const paymentMethodId =
        typeof paymentIntent.payment_method === 'string'
          ? paymentIntent.payment_method
          : null;

      if (paymentMethodId && typeof order.stripe_customer_id === 'string') {
        const stripePaymentMethod = await retrieveStripePaymentMethod(paymentMethodId);
        const { data: existingDefault } = await serviceRole
          .from('billing_payment_methods')
          .select('id')
          .eq('user_id', String(order.user_id))
          .eq('status', 'active')
          .eq('is_default', true)
          .maybeSingle();

        await syncPaymentMethodRecord(serviceRole, {
          userId: String(order.user_id),
          stripeCustomerId: String(order.stripe_customer_id),
          stripePaymentMethod,
          reusableForAutoReload: order.trigger_source === 'auto_reload',
          markDefault: !existingDefault,
        });
      }

      if (eventType === 'payment_intent.payment_failed') {
        await serviceRole
          .from('credit_top_up_orders')
          .update({
            status: 'failed',
            failure_code: String(paymentIntent.last_payment_error?.code ?? ''),
            failure_message: String(
              paymentIntent.last_payment_error?.message ?? 'Payment failed.',
            ),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (order.trigger_source === 'auto_reload') {
          const { data: policy } = await serviceRole
            .from('credit_auto_reload_policies')
            .select('failure_count')
            .eq('user_id', String(order.user_id))
            .maybeSingle();

          const nextFailureCount = Number(policy?.failure_count ?? 0) + 1;

          await serviceRole
            .from('credit_auto_reload_policies')
            .update({
              failure_count: nextFailureCount,
              enabled: nextFailureCount >= 3 ? false : true,
              status: nextFailureCount >= 3 ? 'disabled' : 'active',
              last_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', String(order.user_id));
        }

        await serviceRole.from('billing_webhook_events').upsert({
          stripe_event_id: eventId,
          event_type: eventType,
          order_id: order.id,
          status: 'processed',
          payload: event,
          processed_at: new Date().toISOString(),
        });

        return jsonResponse({ received: true }, {}, request);
      }

      const { data: quote } = await serviceRole
        .from('credit_top_up_quotes')
        .select('stripe_tax_calculation_id')
        .eq('id', String(order.quote_id))
        .maybeSingle();

      let stripeTaxTransactionId: string | null = null;

      if (typeof quote?.stripe_tax_calculation_id === 'string') {
        const taxTransaction = await createStripeTaxTransactionFromCalculation({
          calculation: quote.stripe_tax_calculation_id,
          reference: `lumixia-order-${String(order.id)}`,
          metadata: {
            lumixia_order_id: String(order.id),
            lumixia_user_id: String(order.user_id),
          },
        });

        stripeTaxTransactionId =
          typeof taxTransaction.id === 'string' ? taxTransaction.id : null;
      }

      await serviceRole
        .from('credit_top_up_orders')
        .update({
          status: 'processing',
          stripe_charge_id: latestCharge,
          stripe_tax_transaction_id: stripeTaxTransactionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      const { error: grantError } = await serviceRole.rpc('grant_top_up_credits', {
        order_id: order.id,
        stripe_event_id: eventId,
      });

      if (grantError) {
        throw new Error(grantError.message);
      }

      if (order.trigger_source === 'auto_reload') {
        const { data: policy } = await serviceRole
          .from('credit_auto_reload_policies')
          .select('month_to_date_minor')
          .eq('user_id', String(order.user_id))
          .maybeSingle();

        await serviceRole
          .from('credit_auto_reload_policies')
          .update({
            failure_count: 0,
            month_to_date_minor:
              Number(policy?.month_to_date_minor ?? 0) +
              Number(order.subtotal_minor ?? 0),
            last_attempt_at: new Date().toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', String(order.user_id));
      }

      return jsonResponse({ received: true }, {}, request);
    }

    if (
      eventType === 'charge.refunded' ||
      eventType === 'refund.updated' ||
      eventType === 'charge.dispute.created' ||
      eventType === 'charge.dispute.closed'
    ) {
      const chargeObject = eventObject;
      const disputeClosedWithoutLoss =
        eventType === 'charge.dispute.closed' &&
        !['lost', 'warning_closed'].includes(String(chargeObject.status ?? ''));

      if (disputeClosedWithoutLoss) {
        await serviceRole.from('billing_webhook_events').upsert({
          stripe_event_id: eventId,
          event_type: eventType,
          status: 'ignored',
          payload: event,
          processed_at: new Date().toISOString(),
        });

        return jsonResponse({ received: true, ignored: true }, {}, request);
      }

      const chargeId =
        typeof chargeObject.id === 'string'
          ? chargeObject.id
          : typeof chargeObject.charge === 'string'
            ? chargeObject.charge
            : null;
      let paymentIntentId =
        typeof chargeObject.payment_intent === 'string'
          ? chargeObject.payment_intent
          : null;

      if (!paymentIntentId && chargeId) {
        const { data: foundOrder } = await serviceRole
          .from('credit_top_up_orders')
          .select('*')
          .eq('stripe_charge_id', chargeId)
          .maybeSingle();

        if (foundOrder) {
          paymentIntentId = String(foundOrder.stripe_payment_intent_id ?? '');
        }
      }

      if (!paymentIntentId) {
        await serviceRole.from('billing_webhook_events').upsert({
          stripe_event_id: eventId,
          event_type: eventType,
          status: 'ignored',
          payload: event,
          processed_at: new Date().toISOString(),
        });

        return jsonResponse({ received: true, ignored: true }, {}, request);
      }

      const order = await findOrderByPaymentIntent(serviceRole, paymentIntentId);

      if (!order) {
        await serviceRole.from('billing_webhook_events').upsert({
          stripe_event_id: eventId,
          event_type: eventType,
          status: 'ignored',
          payload: event,
          processed_at: new Date().toISOString(),
        });

        return jsonResponse({ received: true, ignored: true }, {}, request);
      }

      const { error: reverseError } = await serviceRole.rpc('reverse_top_up_credits', {
        order_id: order.id,
        reason: eventType.startsWith('charge.dispute')
          ? 'charge_dispute'
          : 'charge_refund',
        stripe_event_id: eventId,
      });

      if (reverseError) {
        throw new Error(reverseError.message);
      }

      return jsonResponse({ received: true }, {}, request);
    }

    await serviceRole.from('billing_webhook_events').upsert({
      stripe_event_id: eventId,
      event_type: eventType,
      status: 'ignored',
      payload: event,
      processed_at: new Date().toISOString(),
    });

    return jsonResponse({ received: true, ignored: true }, {}, request);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Webhook processing failed.',
      },
      { status: 400 },
      request,
    );
  }
});
