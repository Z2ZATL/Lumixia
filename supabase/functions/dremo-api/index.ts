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

interface DremoEventDraft {
  sequence: number;
  eventType: string;
  channel: DremoEventChannel;
  severity?: DremoEventSeverity;
  payload?: Record<string, unknown>;
}

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

  return data as Record<string, unknown>;
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

  return (data ?? []).map((row) => mapEvent(row as Record<string, unknown>));
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

  const { data, error } = await serviceRole
    .from('dremo_task_events')
    .insert(
      events.map((event) => ({
        task_id: taskId,
        user_id: userId,
        sequence: event.sequence,
        event_type: event.eventType,
        channel: event.channel,
        severity: event.severity ?? 'info',
        payload: event.payload ?? {},
      })),
    )
    .select(
      'id, task_id, user_id, sequence, event_type, channel, severity, payload, created_at',
    )
    .order('sequence', { ascending: true });

  if (error) {
    console.error('Dremo event append failed', error.message);
    throw new DremoApiError(
      'Unable to append Dremo task events.',
      500,
      'event_append_failed',
    );
  }

  return (data ?? []).map((row) => mapEvent(row as Record<string, unknown>));
}

async function getNextSequence(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  taskId: string,
  userId: string,
) {
  const { data, error } = await serviceRole
    .from('dremo_task_events')
    .select('sequence')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Dremo sequence lookup failed', error.message);
    throw new DremoApiError(
      'Unable to prepare Dremo event sequence.',
      500,
      'sequence_lookup_failed',
    );
  }

  return Number(data?.sequence ?? 0) + 1;
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

  const taskId = String(taskRow.id);
  const events = await appendTaskEvents(serviceRole, taskId, userId, [
    {
      sequence: 1,
      eventType: 'task_created',
      channel: 'system',
      payload: {
        title,
        mode: 'stub',
        creditState: 'not_required',
      },
    },
    {
      sequence: 2,
      eventType: 'task_started',
      channel: 'system',
      payload: {
        status: 'planning',
        sandbox: 'not_started',
        note: 'Dremo API stub accepted the task. No sandbox execution is running.',
      },
    },
    {
      sequence: 3,
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
    task: mapTask(taskRow as Record<string, unknown>),
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

  const { data: taskRow, error: updateError } = await serviceRole
    .from('dremo_tasks')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      credit_state:
        existingTask.creditState === 'not_required'
          ? 'not_required'
          : 'cancelled_released',
    })
    .eq('id', taskId)
    .eq('user_id', userId)
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

  if (updateError) {
    console.error('Dremo task cancel failed', updateError.message);
    throw new DremoApiError(
      'Unable to cancel Dremo task.',
      500,
      'task_cancel_failed',
    );
  }

  // Stub-only sequence handling is intentionally simple. The production
  // orchestrator should move task status + event append into a transaction or
  // RPC that locks the task row before choosing the next sequence.
  const nextSequence = await getNextSequence(serviceRole, taskId, userId);
  const events = await appendTaskEvents(serviceRole, taskId, userId, [
    {
      sequence: nextSequence,
      eventType: 'task_cancelled',
      channel: 'system',
      payload: {
        reason: 'Cancelled through authenticated Dremo API stub.',
        creditState: String(taskRow.credit_state),
      },
    },
  ]);

  return {
    task: mapTask(taskRow as Record<string, unknown>),
    events,
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
