import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  createServiceRoleClient,
  requireAuthenticatedUser,
} from '../_shared/supabase.ts';

type DremoTaskStatus =
  | 'created'
  | 'queued'
  | 'planning'
  | 'awaiting_approval'
  | 'running'
  | 'verifying'
  | 'repairing'
  | 'completed'
  | 'failed'
  | 'cancelled';

type DremoCreditState =
  | 'not_required'
  | 'quoted'
  | 'reserved'
  | 'running'
  | 'completed_charged'
  | 'failed_refunded'
  | 'cancelled_released'
  | 'disputed'
  | 'manual_review';

type DremoEventChannel =
  | 'system'
  | 'agent'
  | 'terminal'
  | 'tool'
  | 'approval'
  | 'artifact'
  | 'billing';

type DremoEventSeverity = 'debug' | 'info' | 'warning' | 'error';

type DremoSandboxStatus =
  | 'not_requested'
  | 'requested'
  | 'starting'
  | 'creating'
  | 'ready'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'destroyed'
  | 'failed'
  | 'quarantined';

interface DremoEventDraft {
  eventType: string;
  channel: DremoEventChannel;
  severity?: DremoEventSeverity;
  payload?: Record<string, unknown>;
}

const SANDBOX_SESSION_SELECT = [
  'id',
  'task_id',
  'user_id',
  'provider',
  'provider_sandbox_id',
  'status',
  'resource_limits',
  'created_at',
  'started_at',
  'stopped_at',
  'failure_reason',
].join(', ');

class DremoApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'bad_request',
  ) {
    super(message);
  }
}

function parseDremoRoute(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const functionIndex = segments.indexOf('dremo-api');

  return functionIndex >= 0 ? segments.slice(functionIndex + 1) : segments;
}

function requireTaskId(value: unknown) {
  const taskId = typeof value === 'string' ? value.trim() : '';

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      taskId,
    )
  ) {
    throw new DremoApiError('A valid Dremo task id is required.', 400, 'invalid_task_id');
  }

  return taskId;
}

function optionalText(value: unknown, maxLength = 500) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new DremoApiError('Invalid text field.', 400, 'invalid_text_field');
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new DremoApiError('Text field is too long.', 400, 'text_too_long');
  }

  return trimmed;
}

function requirePrompt(value: unknown) {
  const prompt = optionalText(value, 12000);

  if (!prompt) {
    throw new DremoApiError('Prompt is required.', 400, 'prompt_required');
  }

  return prompt;
}

function parseAfterSequence(request: Request) {
  const raw = new URL(request.url).searchParams.get('afterSequence');

  if (raw === null || raw.trim() === '') {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new DremoApiError(
      'afterSequence must be a non-negative integer.',
      400,
      'invalid_cursor',
    );
  }

  return parsed;
}

async function requireDremoUser(request: Request) {
  try {
    return await requireAuthenticatedUser(request);
  } catch (error) {
    console.error(
      'Dremo authentication failed',
      error instanceof Error ? error.message : String(error),
    );
    throw new DremoApiError(
      'A valid Lumixia session is required.',
      401,
      'unauthorized',
    );
  }
}

function asRecord(value: unknown, message = 'Expected database row.') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DremoApiError(message, 500, 'invalid_database_row');
  }

  return value as Record<string, unknown>;
}

function asRpcRecord(value: unknown, message = 'Expected RPC row.') {
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new DremoApiError(message, 500, 'invalid_rpc_result');
    }

    return asRecord(value[0], message);
  }

  return asRecord(value, message);
}

function mapTask(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: String(row.status) as DremoTaskStatus,
    title: row.title === null ? null : String(row.title),
    prompt: String(row.prompt),
    repoUrl: row.repo_url === null ? null : String(row.repo_url),
    repoBranch: row.repo_branch === null ? null : String(row.repo_branch),
    sandboxId: row.sandbox_id === null ? null : String(row.sandbox_id),
    modelProvider:
      row.model_provider === null ? null : String(row.model_provider),
    modelId: row.model_id === null ? null : String(row.model_id),
    creditState: String(row.credit_state) as DremoCreditState,
    creditReservationId:
      row.credit_reservation_id === null
        ? null
        : String(row.credit_reservation_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: row.completed_at === null ? null : String(row.completed_at),
    cancelledAt: row.cancelled_at === null ? null : String(row.cancelled_at),
    failureReason:
      row.failure_reason === null ? null : String(row.failure_reason),
  };
}

function mapEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    sequence: Number(row.sequence),
    eventType: String(row.event_type),
    channel: String(row.channel) as DremoEventChannel,
    severity: String(row.severity) as DremoEventSeverity,
    payload:
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  };
}

function mapSandboxSession(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    provider: String(row.provider),
    providerSandboxId:
      row.provider_sandbox_id === null
        ? null
        : String(row.provider_sandbox_id),
    status: String(row.status) as DremoSandboxStatus,
    resourceLimits:
      row.resource_limits && typeof row.resource_limits === 'object'
        ? (row.resource_limits as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    startedAt: row.started_at === null ? null : String(row.started_at),
    stoppedAt: row.stopped_at === null ? null : String(row.stopped_at),
    failureReason:
      row.failure_reason === null ? null : String(row.failure_reason),
  };
}

function isTerminalTaskStatus(status: DremoTaskStatus) {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function isActiveSandboxStatus(status: DremoSandboxStatus) {
  return [
    'requested',
    'starting',
    'creating',
    'ready',
    'running',
  ].includes(status);
}

async function getOwnedTask(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  taskId: string,
  userId: string,
) {
  const { data, error } = await serviceRole
    .from('dremo_tasks')
    .select(
      [
        'id',
        'user_id',
        'status',
        'title',
        'prompt',
        'repo_url',
        'repo_branch',
        'sandbox_id',
        'model_provider',
        'model_id',
        'credit_state',
        'credit_reservation_id',
        'created_at',
        'updated_at',
        'completed_at',
        'cancelled_at',
        'failure_reason',
      ].join(', '),
    )
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Dremo task lookup failed', error.message);
    throw new DremoApiError('Unable to load Dremo task.', 500, 'task_lookup_failed');
  }

  if (!data) {
    throw new DremoApiError('Dremo task not found.', 404, 'task_not_found');
  }

  return asRecord(data);
}

async function fetchTaskEvents(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  taskId: string,
  userId: string,
  afterSequence: number | null,
) {
  let query = serviceRole
    .from('dremo_task_events')
    .select(
      'id, task_id, user_id, sequence, event_type, channel, severity, payload, created_at',
    )
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('sequence', { ascending: true });

  if (afterSequence !== null) {
    query = query.gt('sequence', afterSequence);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Dremo events fetch failed', error.message);
    throw new DremoApiError(
      'Unable to load Dremo task events.',
      500,
      'events_fetch_failed',
    );
  }

  return (data ?? []).map((row) => mapEvent(asRecord(row)));
}

async function fetchLatestSandboxSession(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  taskId: string,
  userId: string,
) {
  const { data, error } = await serviceRole
    .from('dremo_sandbox_sessions')
    .select(SANDBOX_SESSION_SELECT)
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Dremo sandbox lookup failed', error.message);
    throw new DremoApiError(
      'Unable to load Dremo sandbox session.',
      500,
      'sandbox_lookup_failed',
    );
  }

  return data ? asRecord(data) : null;
}

async function appendTaskEvents(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  taskId: string,
  userId: string,
  events: DremoEventDraft[],
) {
  if (events.length === 0) {
    return [];
  }

  const insertedEvents = [];

  for (const event of events) {
    const { data, error } = await serviceRole.rpc('append_dremo_task_event', {
      p_task_id: taskId,
      p_user_id: userId,
      p_event_type: event.eventType,
      p_channel: event.channel,
      p_severity: event.severity ?? 'info',
      p_payload: event.payload ?? {},
    });

    if (error) {
      console.error('Dremo event append failed', error.message);
      throw new DremoApiError(
        'Unable to append Dremo task events.',
        500,
        'event_append_failed',
      );
    }

    insertedEvents.push(mapEvent(asRpcRecord(data, 'Expected Dremo event row.')));
  }

  return insertedEvents;
}

async function transitionTaskStatus(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  taskId: string,
  userId: string,
  nextStatus: DremoTaskStatus,
  event: DremoEventDraft,
) {
  const { data, error } = await serviceRole
    .rpc('transition_dremo_task_status', {
      p_task_id: taskId,
      p_user_id: userId,
      p_next_status: nextStatus,
      p_event_type: event.eventType,
      p_channel: event.channel,
      p_severity: event.severity ?? 'info',
      p_payload: event.payload ?? {},
    });

  if (error) {
    console.error('Dremo task transition failed', error.message);
    throw new DremoApiError(
      'Unable to transition Dremo task.',
      500,
      'task_transition_failed',
    );
  }

  const result = asRpcRecord(data, 'Expected Dremo task transition result.');

  return {
    task: mapTask(asRecord(result.task, 'Expected transitioned Dremo task.')),
    events: [mapEvent(asRecord(result.event, 'Expected transition Dremo event.'))],
  };
}

async function createTask(request: Request, userId: string) {
  const serviceRole = createServiceRoleClient();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const prompt = requirePrompt(body.prompt);
  const title = optionalText(body.title, 180) ?? 'Dremo Code stub task';
  const repoUrl = optionalText(body.repoUrl, 1000);
  const repoBranch = optionalText(body.repoBranch, 160);
  const modelProvider = optionalText(body.modelProvider, 120);
  const modelId = optionalText(body.modelId, 160);

  const { data: taskRow, error: taskError } = await serviceRole
    .from('dremo_tasks')
    .insert({
      user_id: userId,
      status: 'planning',
      title,
      prompt,
      repo_url: repoUrl,
      repo_branch: repoBranch,
      model_provider: modelProvider,
      model_id: modelId,
      credit_state: 'not_required',
    })
    .select(
      [
        'id',
        'user_id',
        'status',
        'title',
        'prompt',
        'repo_url',
        'repo_branch',
        'sandbox_id',
        'model_provider',
        'model_id',
        'credit_state',
        'credit_reservation_id',
        'created_at',
        'updated_at',
        'completed_at',
        'cancelled_at',
        'failure_reason',
      ].join(', '),
    )
    .single();

  if (taskError) {
    console.error('Dremo task create failed', taskError.message);
    throw new DremoApiError(
      'Unable to create Dremo task.',
      500,
      'task_create_failed',
    );
  }

  const task = asRecord(taskRow);
  const taskId = String(task.id);
  const events = await appendTaskEvents(serviceRole, taskId, userId, [
    {
      eventType: 'task_created',
      channel: 'system',
      payload: {
        title,
        mode: 'stub',
        creditState: 'not_required',
      },
    },
    {
      eventType: 'task_started',
      channel: 'system',
      payload: {
        status: 'planning',
        sandbox: 'not_started',
        note: 'Dremo API stub accepted the task. No sandbox execution is running.',
      },
    },
    {
      eventType: 'plan_created',
      channel: 'agent',
      payload: {
        summary:
          'Stub plan created by the server-owned Dremo API foundation.',
        steps: [
          {
            id: 'inspect-request',
            title: 'Record the authenticated task request.',
            risk: 'low',
          },
          {
            id: 'await-real-runtime',
            title:
              'Wait for the future Dremo orchestrator, sandbox, and verifier.',
            risk: 'medium',
          },
        ],
        intentionallyNotImplemented: [
          'sandbox execution',
          'model calls',
          'credit charging',
          'frontend workspace changes',
        ],
      },
    },
  ]);

  return {
    task: mapTask(task),
    events,
  };
}

async function cancelTask(taskId: string, userId: string) {
  const serviceRole = createServiceRoleClient();
  const existingTask = mapTask(await getOwnedTask(serviceRole, taskId, userId));

  if (existingTask.status === 'completed' || existingTask.status === 'failed') {
    throw new DremoApiError(
      'Dremo task is already in a terminal state.',
      409,
      'task_terminal',
    );
  }

  if (existingTask.status === 'cancelled') {
    return {
      task: existingTask,
      events: await fetchTaskEvents(serviceRole, taskId, userId, null),
    };
  }

  return transitionTaskStatus(serviceRole, taskId, userId, 'cancelled', {
    eventType: 'task_cancelled',
    channel: 'system',
    payload: {
      reason: 'Cancelled through authenticated Dremo API stub.',
      creditState:
        existingTask.creditState === 'not_required'
          ? 'not_required'
          : 'cancelled_released',
    },
  });
}

async function startStubSandbox(taskId: string, userId: string) {
  const serviceRole = createServiceRoleClient();
  const existingTask = mapTask(await getOwnedTask(serviceRole, taskId, userId));

  if (isTerminalTaskStatus(existingTask.status)) {
    throw new DremoApiError(
      'A sandbox cannot be started for a terminal Dremo task.',
      409,
      'task_terminal',
    );
  }

  const latestSandbox = await fetchLatestSandboxSession(
    serviceRole,
    taskId,
    userId,
  );

  if (latestSandbox) {
    const sandboxSession = mapSandboxSession(latestSandbox);

    if (isActiveSandboxStatus(sandboxSession.status)) {
      return {
        sandboxSession,
        events: await appendTaskEvents(serviceRole, taskId, userId, [
          {
            eventType: 'sandbox_ready',
            channel: 'system',
            payload: {
              provider: 'stub',
              sandboxSessionId: sandboxSession.id,
              status: sandboxSession.status,
              stubOnly: true,
              noCodeExecution: true,
              note:
                'Stub sandbox session is already available. No code execution is happening.',
            },
          },
        ]),
      };
    }
  }

  const now = new Date().toISOString();
  const { data: sandboxRow, error: sandboxError } = await serviceRole
    .from('dremo_sandbox_sessions')
    .insert({
      task_id: taskId,
      user_id: userId,
      provider: 'stub',
      provider_sandbox_id: `stub:${taskId}`,
      status: 'ready',
      resource_limits: {
        stubOnly: true,
        cpu: 'none',
        memory: 'none',
        filesystem: 'none',
        networkEgress: 'disabled',
        secrets: 'none',
        codeExecution: false,
      },
      created_at: now,
      started_at: now,
    })
    .select(SANDBOX_SESSION_SELECT)
    .single();

  if (sandboxError) {
    console.error('Dremo sandbox create failed', sandboxError.message);
    throw new DremoApiError(
      'Unable to create Dremo sandbox session.',
      500,
      'sandbox_create_failed',
    );
  }

  const sandboxSession = mapSandboxSession(asRecord(sandboxRow));

  const { error: taskUpdateError } = await serviceRole
    .from('dremo_tasks')
    .update({ sandbox_id: sandboxSession.id })
    .eq('id', taskId)
    .eq('user_id', userId);

  if (taskUpdateError) {
    console.error('Dremo task sandbox link failed', taskUpdateError.message);
    throw new DremoApiError(
      'Unable to link Dremo sandbox session.',
      500,
      'sandbox_link_failed',
    );
  }

  return {
    sandboxSession,
    events: await appendTaskEvents(serviceRole, taskId, userId, [
      {
        eventType: 'sandbox_requested',
        channel: 'system',
        payload: {
          provider: 'stub',
          sandboxSessionId: sandboxSession.id,
          status: 'requested',
          stubOnly: true,
          noCodeExecution: true,
          note:
            'Sandbox lifecycle was requested for contract testing only. No sandbox provider was called.',
        },
      },
      {
        eventType: 'sandbox_starting',
        channel: 'system',
        payload: {
          provider: 'stub',
          sandboxSessionId: sandboxSession.id,
          status: 'starting',
          stubOnly: true,
          noCodeExecution: true,
          filesystemAccess: false,
          networkEgress: false,
          secretsMounted: false,
        },
      },
      {
        eventType: 'sandbox_ready',
        channel: 'system',
        payload: {
          provider: 'stub',
          sandboxSessionId: sandboxSession.id,
          status: 'ready',
          stubOnly: true,
          noCodeExecution: true,
          note:
            'Stub sandbox is marked ready for lifecycle testing. It cannot run commands.',
        },
      },
    ]),
  };
}

async function stopStubSandbox(taskId: string, userId: string) {
  const serviceRole = createServiceRoleClient();
  await getOwnedTask(serviceRole, taskId, userId);

  const latestSandbox = await fetchLatestSandboxSession(
    serviceRole,
    taskId,
    userId,
  );

  if (!latestSandbox) {
    throw new DremoApiError(
      'No Dremo sandbox session exists for this task.',
      404,
      'sandbox_not_found',
    );
  }

  const sandboxSession = mapSandboxSession(latestSandbox);

  if (sandboxSession.status === 'stopped') {
    return {
      sandboxSession,
      events: await appendTaskEvents(serviceRole, taskId, userId, [
        {
          eventType: 'sandbox_stopped',
          channel: 'system',
          payload: {
            provider: 'stub',
            sandboxSessionId: sandboxSession.id,
            status: 'stopped',
            stubOnly: true,
            noCodeExecution: true,
            note: 'Stub sandbox session was already stopped.',
          },
        },
      ]),
    };
  }

  const stoppingEvents = await appendTaskEvents(serviceRole, taskId, userId, [
    {
      eventType: 'sandbox_stopping',
      channel: 'system',
      payload: {
        provider: 'stub',
        sandboxSessionId: sandboxSession.id,
        previousStatus: sandboxSession.status,
        status: 'stopping',
        stubOnly: true,
        noCodeExecution: true,
      },
    },
  ]);

  const stoppedAt = new Date().toISOString();
  const { data: stoppedRow, error: stopError } = await serviceRole
    .from('dremo_sandbox_sessions')
    .update({
      status: 'stopped',
      stopped_at: stoppedAt,
    })
    .eq('id', sandboxSession.id)
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .select(SANDBOX_SESSION_SELECT)
    .single();

  if (stopError) {
    console.error('Dremo sandbox stop failed', stopError.message);
    await appendTaskEvents(serviceRole, taskId, userId, [
      {
        eventType: 'sandbox_failed',
        channel: 'system',
        severity: 'error',
        payload: {
          provider: 'stub',
          sandboxSessionId: sandboxSession.id,
          status: 'failed',
          stubOnly: true,
          noCodeExecution: true,
          reason: 'Unable to mark the stub sandbox session stopped.',
        },
      },
    ]);
    throw new DremoApiError(
      'Unable to stop Dremo sandbox session.',
      500,
      'sandbox_stop_failed',
    );
  }

  const stoppedSandboxSession = mapSandboxSession(asRecord(stoppedRow));

  return {
    sandboxSession: stoppedSandboxSession,
    events: [
      ...stoppingEvents,
      ...(await appendTaskEvents(serviceRole, taskId, userId, [
        {
          eventType: 'sandbox_stopped',
          channel: 'system',
          payload: {
            provider: 'stub',
            sandboxSessionId: stoppedSandboxSession.id,
            status: 'stopped',
            stubOnly: true,
            noCodeExecution: true,
            note:
              'Stub sandbox lifecycle stopped. No runtime resources were created.',
          },
        },
      ])),
    ],
  };
}

serve(async (request) => {
  const preflight = handleOptions(request);

  if (preflight) {
    return preflight;
  }

  try {
    const user = await requireDremoUser(request);
    const serviceRole = createServiceRoleClient();
    const route = parseDremoRoute(request);

    if (request.method === 'POST' && route.length === 1 && route[0] === 'tasks') {
      return jsonResponse(await createTask(request, user.id), {}, request);
    }

    if (request.method === 'GET' && route.length === 2 && route[0] === 'tasks') {
      const taskId = requireTaskId(route[1]);
      const task = mapTask(await getOwnedTask(serviceRole, taskId, user.id));

      return jsonResponse({ task }, {}, request);
    }

    if (
      request.method === 'GET' &&
      route.length === 3 &&
      route[0] === 'tasks' &&
      route[2] === 'events'
    ) {
      const taskId = requireTaskId(route[1]);
      await getOwnedTask(serviceRole, taskId, user.id);

      return jsonResponse(
        {
          events: await fetchTaskEvents(
            serviceRole,
            taskId,
            user.id,
            parseAfterSequence(request),
          ),
        },
        {},
        request,
      );
    }

    if (
      request.method === 'POST' &&
      route.length === 3 &&
      route[0] === 'tasks' &&
      route[2] === 'cancel'
    ) {
      const taskId = requireTaskId(route[1]);

      return jsonResponse(await cancelTask(taskId, user.id), {}, request);
    }

    if (
      request.method === 'POST' &&
      route.length === 4 &&
      route[0] === 'tasks' &&
      route[2] === 'sandbox' &&
      route[3] === 'start'
    ) {
      const taskId = requireTaskId(route[1]);

      return jsonResponse(await startStubSandbox(taskId, user.id), {}, request);
    }

    if (
      request.method === 'POST' &&
      route.length === 4 &&
      route[0] === 'tasks' &&
      route[2] === 'sandbox' &&
      route[3] === 'stop'
    ) {
      const taskId = requireTaskId(route[1]);

      return jsonResponse(await stopStubSandbox(taskId, user.id), {}, request);
    }

    return jsonResponse(
      {
        error: {
          code: 'route_not_found',
          message: 'Dremo API route not found.',
        },
      },
      { status: 404 },
      request,
    );
  } catch (error) {
    const status = error instanceof DremoApiError ? error.status : 400;
    const code = error instanceof DremoApiError ? error.code : 'request_failed';
    const message =
      error instanceof DremoApiError
        ? error.message
        : 'Dremo API request failed.';

    return jsonResponse(
      {
        error: {
          code,
          message,
        },
      },
      { status },
      request,
    );
  }
});
