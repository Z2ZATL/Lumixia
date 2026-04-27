import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  createServiceRoleClient,
  requireAuthenticatedUser,
} from '../_shared/supabase.ts';

type ExecutionLogKind = 'system' | 'progress' | 'success' | 'error';
type ExecutionSessionStatus =
  | 'idle'
  | 'booting'
  | 'running'
  | 'completed'
  | 'failed';

interface ExecutionLog {
  kind: ExecutionLogKind;
  message: string;
}

const EXECUTION_CREDITS_MODE =
  Deno.env.get('LUMIXIA_EXECUTION_CREDITS_MODE') === 'live' ? 'live' : 'stub';

const BOOT_LOGS: Record<string, ExecutionLog[]> = {
  'code-architect': [
    { kind: 'system', message: '[SYSTEM] Execution API session authorized.' },
    { kind: 'progress', message: '-> Supabase JWT verified server-side.' },
    {
      kind: 'progress',
      message: '-> Demo workspace contract loaded. No sandboxed code is running yet.',
    },
    { kind: 'success', message: '-> Server-owned demo session is ready.' },
  ],
};

const EXECUTION_LOGS: Record<string, ExecutionLog[]> = {
  'code-architect': [
    { kind: 'progress', message: '[EXEC] Server-owned demo run accepted.' },
    { kind: 'progress', message: '-> Session ownership verified from JWT.' },
    {
      kind: 'progress',
      message: '-> Audit logs are written by the execution service.',
    },
    { kind: 'success', message: '-> Demo execution completed through the API path.' },
  ],
};

function parseExecutionRoute(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const functionIndex = segments.indexOf('execution-api');
  return functionIndex >= 0 ? segments.slice(functionIndex + 1) : segments;
}

function requireAgentSlug(value: unknown) {
  const slug = typeof value === 'string' ? value.trim() : '';

  if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
    throw new Error('A valid workspace agent slug is required.');
  }

  return slug;
}

function requireSessionId(value: unknown) {
  const sessionId = typeof value === 'string' ? value.trim() : '';

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionId,
    )
  ) {
    throw new Error('A valid execution session id is required.');
  }

  return sessionId;
}

function mapSession(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    agentSlug: String(row.agent_slug),
    agentName: String(row.agent_name),
    status: String(row.status) as ExecutionSessionStatus,
    executionCost: Number(row.execution_cost ?? 150),
    providerMode: row.provider_mode === 'api' ? 'api' : 'mock',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapLog(row: Record<string, unknown>) {
  const kind = ['system', 'progress', 'success', 'error'].includes(
    String(row.kind),
  )
    ? (String(row.kind) as ExecutionLogKind)
    : 'system';

  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    userId: String(row.user_id),
    kind,
    message: String(row.message),
    createdAt: String(row.created_at),
  };
}

async function getWorkspaceAgent(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  agentSlug: string,
) {
  const { data, error } = await serviceRole
    .from('dashboard_agents')
    .select(
      `
        slug,
        name,
        workspace_title,
        workspace_subtitle,
        execution_cost,
        is_active,
        launch_mode
      `,
    )
    .eq('slug', agentSlug)
    .eq('is_active', true)
    .eq('launch_mode', 'workspace')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Workspace agent not found or not available.');
  }

  return data as {
    slug: string;
    name: string;
    workspace_title: string | null;
    workspace_subtitle: string | null;
    execution_cost: number | null;
  };
}

async function getOwnedExecutionSession(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await serviceRole
    .from('execution_sessions')
    .select(
      'id, user_id, agent_slug, agent_name, status, execution_cost, provider_mode, created_at, updated_at',
    )
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Execution session not found for this authenticated user.');
  }

  return data as Record<string, unknown>;
}

async function updateSessionStatus(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  sessionId: string,
  status: ExecutionSessionStatus,
) {
  const { data, error } = await serviceRole
    .from('execution_sessions')
    .update({ status })
    .eq('id', sessionId)
    .select(
      'id, user_id, agent_slug, agent_name, status, execution_cost, provider_mode, created_at, updated_at',
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSession(data as Record<string, unknown>);
}

async function appendExecutionLogs(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  sessionId: string,
  userId: string,
  logs: ExecutionLog[],
) {
  if (logs.length === 0) {
    return [];
  }

  const { data, error } = await serviceRole
    .from('execution_logs')
    .insert(
      logs.map((log) => ({
        session_id: sessionId,
        user_id: userId,
        kind: log.kind,
        message: log.message,
      })),
    )
    .select('id, session_id, user_id, kind, message, created_at');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapLog(row as Record<string, unknown>));
}

async function fetchExecutionLogs(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await serviceRole
    .from('execution_logs')
    .select('id, session_id, user_id, kind, message, created_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapLog(row as Record<string, unknown>));
}

async function maybeDebitExecutionCredits(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  agentSlug: string,
  sessionId: string,
) {
  if (EXECUTION_CREDITS_MODE !== 'live') {
    return null;
  }

  const { data, error } = await serviceRole.rpc(
    'consume_agent_credits_for_user',
    {
      p_user_id: userId,
      p_agent_slug: agentSlug,
      p_execution_session_id: sessionId,
      p_idempotency_key: `usage:${sessionId}:execute`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data[0] : data;
}

serve(async (request) => {
  const preflight = handleOptions(request);

  if (preflight) {
    return preflight;
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const serviceRole = createServiceRoleClient();
    const route = parseExecutionRoute(request);

    if (request.method === 'POST' && route.length === 1 && route[0] === 'sessions') {
      const body = (await request.json()) as Record<string, unknown>;
      const agentSlug = requireAgentSlug(body.agentSlug);
      const agent = await getWorkspaceAgent(serviceRole, agentSlug);

      const { data: sessionRow, error: sessionError } = await serviceRole
        .from('execution_sessions')
        .insert({
          user_id: user.id,
          agent_slug: agent.slug,
          agent_name: agent.name,
          status: 'booting',
          execution_cost: Number(agent.execution_cost ?? 150),
          provider_mode: 'api',
        })
        .select(
          'id, user_id, agent_slug, agent_name, status, execution_cost, provider_mode, created_at, updated_at',
        )
        .single();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const sessionId = String(sessionRow.id);
      await appendExecutionLogs(
        serviceRole,
        sessionId,
        user.id,
        BOOT_LOGS[agent.slug] ?? [
          { kind: 'system', message: '[SYSTEM] Execution API session authorized.' },
          { kind: 'success', message: '-> Server-owned demo session is ready.' },
        ],
      );

      const session = await updateSessionStatus(serviceRole, sessionId, 'idle');
      const logs = await fetchExecutionLogs(serviceRole, sessionId, user.id);

      return jsonResponse(
        {
          session,
          logs,
          providerSession: {
            title: agent.workspace_title ?? `${agent.name} Workspace`,
            subtitle:
              agent.workspace_subtitle ??
              'Server-owned demo session. No sandboxed code is running yet.',
            status: session.status,
            providerMode: 'api',
            executionCost: Number(agent.execution_cost ?? 150),
          },
        },
        {},
        request,
      );
    }

    if (
      request.method === 'GET' &&
      route.length === 3 &&
      route[0] === 'sessions' &&
      route[2] === 'logs'
    ) {
      const sessionId = requireSessionId(route[1]);
      await getOwnedExecutionSession(serviceRole, sessionId, user.id);

      return jsonResponse(
        await fetchExecutionLogs(serviceRole, sessionId, user.id),
        {},
        request,
      );
    }

    if (
      request.method === 'POST' &&
      route.length === 3 &&
      route[0] === 'sessions' &&
      route[2] === 'execute'
    ) {
      const sessionId = requireSessionId(route[1]);
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const sessionRow = await getOwnedExecutionSession(
        serviceRole,
        sessionId,
        user.id,
      );
      const session = mapSession(sessionRow);
      const agentSlug = body.agentSlug
        ? requireAgentSlug(body.agentSlug)
        : session.agentSlug;

      if (agentSlug !== session.agentSlug) {
        throw new Error('Execution agent does not match the owned session.');
      }

      if (session.status === 'completed' || session.status === 'failed') {
        throw new Error('Execution session is already in a terminal state.');
      }

      await getWorkspaceAgent(serviceRole, agentSlug);
      await maybeDebitExecutionCredits(serviceRole, user.id, agentSlug, sessionId);
      await updateSessionStatus(serviceRole, sessionId, 'running');
      await appendExecutionLogs(
        serviceRole,
        sessionId,
        user.id,
        EXECUTION_LOGS[agentSlug] ?? [
          { kind: 'progress', message: '[EXEC] Server-owned demo run accepted.' },
          { kind: 'success', message: '-> Demo execution completed.' },
        ],
      );
      const completedSession = await updateSessionStatus(
        serviceRole,
        sessionId,
        'completed',
      );
      const logs = await fetchExecutionLogs(serviceRole, sessionId, user.id);

      return jsonResponse(
        {
          session: completedSession,
          logs,
        },
        {},
        request,
      );
    }

    return jsonResponse(
      { error: 'Execution API route not found.' },
      { status: 404 },
      request,
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Execution API request failed.',
      },
      { status: 400 },
      request,
    );
  }
});
