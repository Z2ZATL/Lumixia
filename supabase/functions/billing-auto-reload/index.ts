import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  attemptAutoReloadForUserId,
  getAutoReloadPolicy,
  mapAutoReloadPolicy,
} from '../_shared/billing.ts';
import {
  createServiceRoleClient,
  requireAuthenticatedUser,
} from '../_shared/supabase.ts';

serve(async (request) => {
  const preflight = handleOptions(request);

  if (preflight) {
    return preflight;
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const serviceRole = createServiceRoleClient();

    if (request.method === 'GET') {
      const policy = await getAutoReloadPolicy(serviceRole, user.id);
      return jsonResponse(policy ? mapAutoReloadPolicy(policy as Record<string, unknown>) : null);
    }

    if (request.method === 'PUT') {
      const body = (await request.json()) as Record<string, unknown>;

      const enabled = body.enabled === true;
      const thresholdCredits = Number(body.thresholdCredits ?? 0);
      const reloadAmountMinor = Number(body.reloadAmountMinor ?? 0);
      const currency = String(body.currency ?? '').toLowerCase();
      const monthlyCapMinor = Number(body.monthlyCapMinor ?? 0);
      const defaultPaymentMethodId =
        typeof body.defaultPaymentMethodId === 'string' && body.defaultPaymentMethodId
          ? body.defaultPaymentMethodId
          : null;
      const consentTextVersion =
        typeof body.consentTextVersion === 'string' && body.consentTextVersion
          ? body.consentTextVersion
          : null;

      if (enabled) {
        if (!defaultPaymentMethodId) {
          throw new Error('Select a default payment method before enabling auto reload.');
        }

        if (!currency) {
          throw new Error('Choose a currency before enabling auto reload.');
        }

        if (!Number.isInteger(thresholdCredits) || thresholdCredits < 0) {
          throw new Error('Choose a valid credit threshold.');
        }

        if (!Number.isInteger(reloadAmountMinor) || reloadAmountMinor <= 0) {
          throw new Error('Choose a valid reload amount.');
        }

        if (!Number.isInteger(monthlyCapMinor) || monthlyCapMinor < reloadAmountMinor) {
          throw new Error('Choose a monthly cap that is at least one reload amount.');
        }

        if (!consentTextVersion) {
          throw new Error('Auto reload consent is required before saving this policy.');
        }
      }

      const { data: policy, error } = await serviceRole
        .from('credit_auto_reload_policies')
        .upsert(
          {
            user_id: user.id,
            enabled,
            threshold_credits: thresholdCredits,
            reload_amount_minor: reloadAmountMinor,
            currency: currency || null,
            monthly_cap_minor: monthlyCapMinor,
            default_payment_method_id: defaultPaymentMethodId,
            consent_text_version: consentTextVersion,
            consented_at: enabled ? new Date().toISOString() : null,
            failure_count: 0,
            status: enabled
              ? defaultPaymentMethodId
                ? 'active'
                : 'needs_payment_method'
              : 'inactive',
          },
          { onConflict: 'user_id' },
        )
        .select('*')
        .single();

      if (error || !policy) {
        throw new Error(error?.message ?? 'The auto reload policy could not be saved.');
      }

      return jsonResponse(mapAutoReloadPolicy(policy as Record<string, unknown>));
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as Record<string, unknown>;

      if (String(body.action ?? '') !== 'attempt') {
        throw new Error('Unsupported auto reload action.');
      }

      return jsonResponse(await attemptAutoReloadForUserId(serviceRole, user.id));
    }

    return jsonResponse({ error: 'Method not allowed.' }, { status: 405 });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Auto reload request failed.',
      },
      { status: 400 },
    );
  }
});
