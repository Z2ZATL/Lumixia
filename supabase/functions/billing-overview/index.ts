import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { fetchBillingOverview } from '../_shared/billing.ts';
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
    const overview = await fetchBillingOverview(serviceRole, user.id);

    return jsonResponse(overview);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Billing overview failed.',
      },
      { status: 400 },
    );
  }
});
