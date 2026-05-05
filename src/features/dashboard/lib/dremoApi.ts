import { getSupabaseClient } from '../../../lib/supabase';
import type {
  DremoCreditState,
  DremoEventChannel,
  DremoEventSeverity,
  DremoEventType,
  DremoTask,
  DremoTaskEvent,
  DremoTaskStatus,
} from '../types';

interface DremoApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  } | string;
}

export interface CreateDremoTaskInput {
  title?: string;
  prompt: string;
  repoUrl?: string;
  repoBranch?: string;
  modelProvider?: string;
  modelId?: string;
}

export interface DremoTaskResponse {
  task: DremoTask;
}

export interface DremoTaskWithEventsResponse {
  task: DremoTask;
  events: DremoTaskEvent[];
}

export interface DremoEventsResponse {
  events: DremoTaskEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toDremoTaskStatus(value: unknown): DremoTaskStatus {
  const status = String(value);
  const allowed: DremoTaskStatus[] = [
    'created',
    'queued',
    'planning',
    'awaiting_approval',
    'running',
    'verifying',
    'repairing',
    'completed',
    'failed',
    'cancelled',
  ];

  return allowed.includes(status as DremoTaskStatus)
    ? (status as DremoTaskStatus)
    : 'failed';
}

function toDremoCreditState(value: unknown): DremoCreditState {
  const state = String(value);
  const allowed: DremoCreditState[] = [
    'not_required',
    'quoted',
    'reserved',
    'running',
    'completed_charged',
    'failed_refunded',
    'cancelled_released',
    'disputed',
    'manual_review',
  ];

  return allowed.includes(state as DremoCreditState)
    ? (state as DremoCreditState)
    : 'manual_review';
}

function toDremoEventType(value: unknown): DremoEventType {
  const eventType = String(value);
  const allowed: DremoEventType[] = [
    'task_created',
    'task_started',
    'repo_scanned',
    'plan_created',
    'approval_required',
    'approval_resolved',
    'tool_call_started',
    'tool_call_output',
    'tool_call_completed',
    'terminal_output',
    'file_read',
    'file_changed',
    'diff_created',
    'verification_started',
    'verification_result',
    'self_review_started',
    'self_review_result',
    'repair_started',
    'final_report_created',
    'artifact_created',
    'task_completed',
    'task_failed',
    'task_cancelled',
  ];

  return allowed.includes(eventType as DremoEventType)
    ? (eventType as DremoEventType)
    : 'task_failed';
}

function toDremoEventChannel(value: unknown): DremoEventChannel {
  const channel = String(value);
  const allowed: DremoEventChannel[] = [
    'system',
    'agent',
    'terminal',
    'tool',
    'approval',
    'artifact',
    'billing',
  ];

  return allowed.includes(channel as DremoEventChannel)
    ? (channel as DremoEventChannel)
    : 'system';
}

function toDremoEventSeverity(value: unknown): DremoEventSeverity {
  const severity = String(value);
  const allowed: DremoEventSeverity[] = ['debug', 'info', 'warning', 'error'];

  return allowed.includes(severity as DremoEventSeverity)
    ? (severity as DremoEventSeverity)
    : 'info';
}

function mapDremoTask(value: unknown): DremoTask {
  if (!isRecord(value)) {
    throw new Error('The Dremo API returned an invalid task payload.');
  }

  return {
    id: String(value.id ?? ''),
    userId: String(value.userId ?? ''),
    status: toDremoTaskStatus(value.status),
    title: toStringOrNull(value.title),
    prompt: String(value.prompt ?? ''),
    repoUrl: toStringOrNull(value.repoUrl),
    repoBranch: toStringOrNull(value.repoBranch),
    sandboxId: toStringOrNull(value.sandboxId),
    modelProvider: toStringOrNull(value.modelProvider),
    modelId: toStringOrNull(value.modelId),
    creditState: toDremoCreditState(value.creditState),
    creditReservationId: toStringOrNull(value.creditReservationId),
    createdAt: String(value.createdAt ?? ''),
    updatedAt: String(value.updatedAt ?? ''),
    completedAt: toStringOrNull(value.completedAt),
    cancelledAt: toStringOrNull(value.cancelledAt),
    failureReason: toStringOrNull(value.failureReason),
  };
}

function mapDremoTaskEvent(value: unknown): DremoTaskEvent {
  if (!isRecord(value)) {
    throw new Error('The Dremo API returned an invalid event payload.');
  }

  return {
    id: String(value.id ?? ''),
    taskId: String(value.taskId ?? ''),
    userId: String(value.userId ?? ''),
    sequence: Number(value.sequence ?? 0),
    eventType: toDremoEventType(value.eventType),
    channel: toDremoEventChannel(value.channel),
    severity: toDremoEventSeverity(value.severity),
    payload: isRecord(value.payload) ? value.payload : {},
    createdAt: String(value.createdAt ?? ''),
  };
}

function getDremoApiBaseUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (typeof supabaseUrl !== 'string' || !supabaseUrl.trim()) {
    throw new Error('VITE_SUPABASE_URL is not configured for Dremo API calls.');
  }

  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/dremo-api`;
}

async function getAccessToken() {
  const { data, error } = await getSupabaseClient().auth.getSession();

  if (error) {
    throw new Error('Unable to read the current Lumixia session.');
  }

  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Sign in again before using the Dremo API lab.');
  }

  return accessToken;
}

async function parseDremoError(response: Response) {
  try {
    const payload = (await response.clone().json()) as DremoApiErrorPayload;

    if (isRecord(payload.error) && typeof payload.error.message === 'string') {
      return payload.error.message;
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }
  } catch {
    try {
      const text = await response.clone().text();

      if (text.trim()) {
        return text.trim();
      }
    } catch {
      // Keep the generic message when the response body is not readable.
    }
  }

  if (response.status === 401 || response.status === 403) {
    return 'Your session is not authorized for the Dremo API lab. Sign in again and verify Edge Function deployment.';
  }

  if (response.status === 404) {
    return 'The Dremo API route is not deployed yet. Deploy the latest dremo-api Edge Function.';
  }

  return 'The Dremo API request could not be completed.';
}

async function requestDremoApi<TResponse>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
  } = {},
): Promise<TResponse> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getDremoApiBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await parseDremoError(response));
  }

  return (await response.json()) as TResponse;
}

export async function createDremoTask(
  input: CreateDremoTaskInput,
): Promise<DremoTaskWithEventsResponse> {
  const payload = await requestDremoApi<DremoTaskWithEventsResponse>('/tasks', {
    method: 'POST',
    body: input,
  });

  return {
    task: mapDremoTask(payload.task),
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}

export async function getDremoTask(taskId: string): Promise<DremoTaskResponse> {
  const payload = await requestDremoApi<DremoTaskResponse>(
    `/tasks/${encodeURIComponent(taskId)}`,
  );

  return {
    task: mapDremoTask(payload.task),
  };
}

export async function getDremoTaskEvents(
  taskId: string,
  afterSequence?: number,
): Promise<DremoEventsResponse> {
  const query =
    typeof afterSequence === 'number'
      ? `?afterSequence=${encodeURIComponent(String(afterSequence))}`
      : '';
  const payload = await requestDremoApi<DremoEventsResponse>(
    `/tasks/${encodeURIComponent(taskId)}/events${query}`,
  );

  return {
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}

export async function cancelDremoTask(
  taskId: string,
): Promise<DremoTaskWithEventsResponse> {
  const payload = await requestDremoApi<DremoTaskWithEventsResponse>(
    `/tasks/${encodeURIComponent(taskId)}/cancel`,
    { method: 'POST' },
  );

  return {
    task: mapDremoTask(payload.task),
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}
