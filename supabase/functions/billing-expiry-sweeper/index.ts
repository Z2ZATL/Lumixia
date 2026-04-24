import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  createServiceRoleClient,
  requireInternalCronRequest,
} from '../_shared/supabase.ts';

serve(async (request) => {
  const preflight = handleOptions(request);

  if (preflight) {
    return preflight;
  }

  try {
    requireInternalCronRequest(request);

    const serviceRole = createServiceRoleClient();
    const url = new URL(request.url);
    const limitRows = Number(
      url.searchParams.get('limitRows') ??
        url.searchParams.get('limit_rows') ??
        '250',
    );

    const { data, error } = await serviceRole.rpc('expire_available_credits', {
      limit_rows: Number.isFinite(limitRows) && limitRows > 0 ? limitRows : 250,
    });

    if (error) {
      throw new Error(error.message);
    }

    const items = Array.isArray(data) ? data : [];

    return jsonResponse({
      processedCount: items.length,
      items,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Credit expiry sweep failed.',
      },
      { status: 400 },
    );
  }
});
