import { getSupabaseClient } from '../../../lib/supabase';
import type {
  DremoApproval,
  DremoApprovalDecision,
  DremoApprovalStatus,
  DremoArtifact,
  DremoCreditState,
  DremoEventChannel,
  DremoEventSeverity,
  DremoEventType,
  DremoFinalReportStub,
  DremoRepoScanSummary,
  DremoRiskLevel,
  DremoSandboxSession,
  DremoSandboxStatus,
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

export interface DremoSandboxLifecycleResponse {
  sandboxSession: DremoSandboxSession;
  events: DremoTaskEvent[];
}

export interface DremoToolRequestInput {
  toolName: string;
  riskLevel: DremoRiskLevel;
  reason: string;
  input: Record<string, unknown>;
}

export interface DremoToolStubResult {
  status: 'stubbed' | 'blocked';
  toolRequestId: string;
  toolName?: string;
  riskLevel?: DremoRiskLevel;
  executionImplemented: false;
  output?: string;
  reason?: string;
}

export interface DremoToolRequestResponse {
  approval: DremoApproval | null;
  toolResult: DremoToolStubResult | null;
  events: DremoTaskEvent[];
}

export interface DremoApprovalResolveResponse {
  approval: DremoApproval;
  executionImplemented: false;
  message: string;
  events: DremoTaskEvent[];
}

export interface DremoRepoScanInput {
  repoUrl?: string;
  repoBranch?: string;
}

export interface DremoRepoScanResponse {
  summary: DremoRepoScanSummary;
  events: DremoTaskEvent[];
}

export interface DremoArtifactsResponse {
  artifacts: DremoArtifact[];
}

export interface DremoFinalReportResponse {
  artifact: DremoArtifact;
  report: DremoFinalReportStub;
}

export interface DremoFinalizeReportResponse extends DremoFinalReportResponse {
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
    'repo_scan_started',
    'repo_scan_completed',
    'repo_scan_failed',
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
    'sandbox_requested',
    'sandbox_starting',
    'sandbox_ready',
    'sandbox_stopping',
    'sandbox_stopped',
    'sandbox_failed',
    'tool_call_requested',
    'tool_approval_required',
    'tool_approval_approved',
    'tool_approval_rejected',
    'tool_call_blocked',
    'tool_call_stubbed',
  ];

  return allowed.includes(eventType as DremoEventType)
    ? (eventType as DremoEventType)
    : 'task_failed';
}

function toDremoRiskLevel(value: unknown): DremoRiskLevel {
  const riskLevel = String(value);
  const allowed: DremoRiskLevel[] = ['low', 'medium', 'high', 'critical'];

  return allowed.includes(riskLevel as DremoRiskLevel)
    ? (riskLevel as DremoRiskLevel)
    : 'medium';
}

function toDremoApprovalStatus(value: unknown): DremoApprovalStatus {
  const status = String(value);
  const allowed: DremoApprovalStatus[] = [
    'pending',
    'approved',
    'rejected',
    'expired',
    'cancelled',
  ];

  return allowed.includes(status as DremoApprovalStatus)
    ? (status as DremoApprovalStatus)
    : 'pending';
}

function toDremoSandboxStatus(value: unknown): DremoSandboxStatus {
  const status = String(value);
  const allowed: DremoSandboxStatus[] = [
    'not_requested',
    'requested',
    'starting',
    'creating',
    'ready',
    'running',
    'stopping',
    'stopped',
    'destroyed',
    'failed',
    'quarantined',
  ];

  return allowed.includes(status as DremoSandboxStatus)
    ? (status as DremoSandboxStatus)
    : 'failed';
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

function mapDremoSandboxSession(value: unknown): DremoSandboxSession {
  if (!isRecord(value)) {
    throw new Error('The Dremo API returned an invalid sandbox payload.');
  }

  return {
    id: String(value.id ?? ''),
    taskId: String(value.taskId ?? ''),
    userId: String(value.userId ?? ''),
    provider: String(value.provider ?? ''),
    providerSandboxId: toStringOrNull(value.providerSandboxId),
    status: toDremoSandboxStatus(value.status),
    resourceLimits: isRecord(value.resourceLimits) ? value.resourceLimits : {},
    createdAt: String(value.createdAt ?? ''),
    startedAt: toStringOrNull(value.startedAt),
    stoppedAt: toStringOrNull(value.stoppedAt),
    failureReason: toStringOrNull(value.failureReason),
  };
}

function mapDremoApproval(value: unknown): DremoApproval {
  if (!isRecord(value)) {
    throw new Error('The Dremo API returned an invalid approval payload.');
  }

  return {
    id: String(value.id ?? ''),
    taskId: String(value.taskId ?? ''),
    userId: String(value.userId ?? ''),
    approvalType: String(value.approvalType ?? ''),
    status: toDremoApprovalStatus(value.status),
    riskLevel: toDremoRiskLevel(value.riskLevel),
    requestPayload: isRecord(value.requestPayload) ? value.requestPayload : {},
    responsePayload: isRecord(value.responsePayload)
      ? value.responsePayload
      : null,
    requestedAt: String(value.requestedAt ?? ''),
    resolvedAt: toStringOrNull(value.resolvedAt),
  };
}

function mapDremoRepoScanSummary(value: unknown): DremoRepoScanSummary {
  if (!isRecord(value)) {
    throw new Error('The Dremo API returned an invalid repo scan payload.');
  }

  return {
    mode: 'stub',
    source:
      value.source === 'request' ||
      value.source === 'task_metadata' ||
      value.source === 'none'
        ? value.source
        : 'none',
    repoUrl: toStringOrNull(value.repoUrl),
    repoBranch: toStringOrNull(value.repoBranch),
    taskTitle: toStringOrNull(value.taskTitle),
    promptLength: Number(value.promptLength ?? 0),
    languageHints: Array.isArray(value.languageHints)
      ? value.languageHints.filter(
          (language): language is string => typeof language === 'string',
        )
      : [],
    limitations: Array.isArray(value.limitations)
      ? value.limitations.filter(
          (limitation): limitation is string => typeof limitation === 'string',
        )
      : [],
  };
}

function mapDremoArtifact(value: unknown): DremoArtifact {
  if (!isRecord(value)) {
    throw new Error('The Dremo API returned an invalid artifact payload.');
  }

  return {
    id: String(value.id ?? ''),
    taskId: String(value.taskId ?? ''),
    userId: String(value.userId ?? ''),
    artifactType: String(value.artifactType ?? ''),
    name: String(value.name ?? ''),
    storagePath: toStringOrNull(value.storagePath),
    metadata: isRecord(value.metadata) ? value.metadata : {},
    createdAt: String(value.createdAt ?? ''),
  };
}

function mapDremoFinalReportStub(value: unknown): DremoFinalReportStub {
  if (!isRecord(value)) {
    throw new Error('The Dremo API returned an invalid final report payload.');
  }

  const eventCounts = isRecord(value.eventCounts) ? value.eventCounts : {};
  const signals = isRecord(value.signals) ? value.signals : {};
  const safety = isRecord(value.safety) ? value.safety : {};

  return {
    mode: 'stub',
    title: toStringOrNull(value.title),
    promptPreview: String(value.promptPreview ?? ''),
    promptLength: Number(value.promptLength ?? 0),
    taskStatus: toDremoTaskStatus(value.taskStatus),
    eventCounts: {
      total: Number(eventCounts.total ?? 0),
      byType: isRecord(eventCounts.byType) ? eventCounts.byType as Record<string, number> : {},
      byChannel: isRecord(eventCounts.byChannel)
        ? eventCounts.byChannel as Record<string, number>
        : {},
    },
    signals: {
      hasSandboxLifecycle: Boolean(signals.hasSandboxLifecycle),
      hasRepoScanCompleted: Boolean(signals.hasRepoScanCompleted),
      hasApprovalEvents: Boolean(signals.hasApprovalEvents),
      wasCancelled: Boolean(signals.wasCancelled),
    },
    safety: {
      noCommandExecution: safety.noCommandExecution === true,
      noFilesystemAccess: safety.noFilesystemAccess === true,
      noModelCalls: safety.noModelCalls === true,
      noBillingChanges: safety.noBillingChanges === true,
      noStorageFileCreated: safety.noStorageFileCreated === true,
    },
    limitations: Array.isArray(value.limitations)
      ? value.limitations.filter(
          (limitation): limitation is string => typeof limitation === 'string',
        )
      : [],
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

export async function startDremoStubSandbox(
  taskId: string,
): Promise<DremoSandboxLifecycleResponse> {
  const payload = await requestDremoApi<DremoSandboxLifecycleResponse>(
    `/tasks/${encodeURIComponent(taskId)}/sandbox/start`,
    { method: 'POST' },
  );

  return {
    sandboxSession: mapDremoSandboxSession(payload.sandboxSession),
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}

export async function stopDremoStubSandbox(
  taskId: string,
): Promise<DremoSandboxLifecycleResponse> {
  const payload = await requestDremoApi<DremoSandboxLifecycleResponse>(
    `/tasks/${encodeURIComponent(taskId)}/sandbox/stop`,
    { method: 'POST' },
  );

  return {
    sandboxSession: mapDremoSandboxSession(payload.sandboxSession),
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}

export async function runDremoStubRepoScan(
  taskId: string,
  input: DremoRepoScanInput = {},
): Promise<DremoRepoScanResponse> {
  const payload = await requestDremoApi<DremoRepoScanResponse>(
    `/tasks/${encodeURIComponent(taskId)}/repo-scan`,
    {
      method: 'POST',
      body: input,
    },
  );

  return {
    summary: mapDremoRepoScanSummary(payload.summary),
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}

export async function finalizeDremoStubReport(
  taskId: string,
): Promise<DremoFinalizeReportResponse> {
  const payload = await requestDremoApi<DremoFinalizeReportResponse>(
    `/tasks/${encodeURIComponent(taskId)}/report/finalize`,
    { method: 'POST' },
  );

  return {
    artifact: mapDremoArtifact(payload.artifact),
    report: mapDremoFinalReportStub(payload.report),
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}

export async function getDremoArtifacts(
  taskId: string,
): Promise<DremoArtifactsResponse> {
  const payload = await requestDremoApi<DremoArtifactsResponse>(
    `/tasks/${encodeURIComponent(taskId)}/artifacts`,
  );

  return {
    artifacts: (payload.artifacts ?? []).map(mapDremoArtifact),
  };
}

export async function getDremoFinalReport(
  taskId: string,
): Promise<DremoFinalReportResponse> {
  const payload = await requestDremoApi<DremoFinalReportResponse>(
    `/tasks/${encodeURIComponent(taskId)}/report`,
  );

  return {
    artifact: mapDremoArtifact(payload.artifact),
    report: mapDremoFinalReportStub(payload.report),
  };
}

export async function requestDremoTool(
  taskId: string,
  input: DremoToolRequestInput,
): Promise<DremoToolRequestResponse> {
  const payload = await requestDremoApi<DremoToolRequestResponse>(
    `/tasks/${encodeURIComponent(taskId)}/tools/request`,
    {
      method: 'POST',
      body: input,
    },
  );

  return {
    approval: payload.approval ? mapDremoApproval(payload.approval) : null,
    toolResult: payload.toolResult,
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}

export async function resolveDremoApproval(
  taskId: string,
  approvalId: string,
  input: {
    decision: DremoApprovalDecision;
    note?: string;
  },
): Promise<DremoApprovalResolveResponse> {
  const payload = await requestDremoApi<DremoApprovalResolveResponse>(
    `/tasks/${encodeURIComponent(taskId)}/approvals/${encodeURIComponent(
      approvalId,
    )}/resolve`,
    {
      method: 'POST',
      body: input,
    },
  );

  return {
    approval: mapDremoApproval(payload.approval),
    executionImplemented: false,
    message: payload.message,
    events: (payload.events ?? []).map(mapDremoTaskEvent),
  };
}
