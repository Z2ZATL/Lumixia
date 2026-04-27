import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { attemptAutoReloadForUserId } from '../_shared/billing.ts';
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
    const limitUsers = Number(
      url.searchParams.get('limitUsers') ??
        url.searchParams.get('limit_users') ??
        '50',
    );
    const safeLimit = Number.isFinite(limitUsers) && limitUsers > 0 ? limitUsers : 50;

    const { data: users, error } = await serviceRole
      .from('credit_auto_reload_policies')
      .select('user_id')
      .eq('enabled', true)
      .in('status', ['active', 'needs_payment_method'])
      .order('updated_at', { ascending: true })
      .limit(safeLimit);

    if (error) {
      throw new Error(error.message);
    }

    const results: Array<{
      userId: string;
      attempted: boolean;
      orderId: string | null;
      error: string | null;
    }> = [];

    for (const row of users ?? []) {
      const userId = String(row.user_id ?? '');

      if (!userId) {
        continue;
      }

      try {
        const result = await attemptAutoReloadForUserId(serviceRole, userId);
        results.push({
          userId,
          attempted: result.attempted,
          orderId: result.order?.id ?? null,
          error: null,
        });
      } catch (error) {
        results.push({
          userId,
          attempted: false,
          orderId: null,
          error: error instanceof Error ? error.message : 'Auto reload failed.',
        });
      }
    }

    return jsonResponse(
      {
        scannedUsers: users?.length ?? 0,
        attemptedUsers: results.filter((result) => result.attempted).length,
        failedUsers: results.filter((result) => result.error).length,
        results,
      },
      {},
      request,
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Auto reload sweep failed.',
      },
      { status: 400 },
      request,
    );
  }
});
