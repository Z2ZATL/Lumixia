import { validateSandboxCommandRequest } from './policyValidation';

export type DremoSandboxProvider =
  | 'stub'
  | 'docker-local-dev'
  | 'e2b'
  | 'daytona'
  | 'worker-pool';

export type DremoSandboxStatus =
  | 'not_requested'
  | 'requested'
  | 'starting'
  | 'ready'
  | 'stopping'
  | 'stopped'
  | 'failed';

export type DremoSandboxNetworkPolicy =
  | 'deny_all'
  | 'allow_package_registries'
  | 'allow_approved_destinations';

export type DremoSandboxEnvironmentPolicy =
  | 'empty'
  | 'task_metadata_only'
  | 'scoped_temporary_credentials';

export type DremoSandboxCleanupPolicy =
  | 'destroy_after_task'
  | 'quarantine_on_suspicion'
  | 'manual_review';

export type DremoSandboxEventType =
  | 'sandbox_requested'
  | 'sandbox_starting'
  | 'sandbox_ready'
  | 'sandbox_stopping'
  | 'sandbox_stopped'
  | 'sandbox_failed'
  | 'tool_call_started'
  | 'tool_call_output'
  | 'tool_call_completed'
  | 'tool_call_blocked'
  | 'tool_call_failed';

export type DremoSandboxCommandResultStatus =
  | 'blocked'
  | 'started'
  | 'output'
  | 'completed'
  | 'failed';

export type DremoSandboxPolicyDecision =
  | 'allow'
  | 'deny'
  | 'requires_approval';

export type DremoSandboxPolicySeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface DremoSandboxPolicyViolation {
  code: string;
  message: string;
  severity: DremoSandboxPolicySeverity;
  field?: string;
}

export interface DremoSandboxPolicyWarning {
  code: string;
  message: string;
  severity: DremoSandboxPolicySeverity;
  field?: string;
}

export interface DremoSandboxPolicyValidationResult {
  allowed: boolean;
  decision: DremoSandboxPolicyDecision;
  reasons: DremoSandboxPolicyViolation[];
  warnings: DremoSandboxPolicyWarning[];
  normalizedRequest?: Record<string, unknown>;
}

export interface DremoSandboxResourceLimits {
  maxCpu: number;
  maxMemoryMb: number;
  wallClockTimeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  maxArtifactBytes: number;
}

export interface DremoSandboxPolicy extends DremoSandboxResourceLimits {
  networkPolicy: DremoSandboxNetworkPolicy;
  allowedCommands: readonly string[];
  deniedCommands: readonly string[];
  approvalRequiredCommands: readonly string[];
  blockedPaths: readonly string[];
  allowedEnvironmentKeys: readonly string[];
  envPolicy: DremoSandboxEnvironmentPolicy;
  cleanupPolicy: DremoSandboxCleanupPolicy;
}

export interface DremoSandboxSessionRequest {
  taskId: string;
  userId: string;
  provider: DremoSandboxProvider;
  policy: DremoSandboxPolicy;
}

export interface DremoSandboxSession {
  id: string;
  taskId: string;
  userId: string;
  provider: DremoSandboxProvider;
  status: DremoSandboxStatus;
  policy: DremoSandboxPolicy;
  createdAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  failureReason: string | null;
}

export interface DremoSandboxStopRequest {
  sessionId: string;
  taskId: string;
  reason?: string;
}

export interface DremoSandboxStatusRequest {
  sessionId: string;
  taskId: string;
}

export interface DremoSandboxResourceRequest {
  maxCpu?: number;
  maxMemoryMb?: number;
  wallClockTimeoutMs?: number;
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
  maxArtifactBytes?: number;
}

export interface DremoSandboxOutputInfo {
  stdoutBytes?: number;
  stderrBytes?: number;
  artifactBytes?: number;
}

export interface DremoSandboxCommandRequest {
  sessionId: string;
  taskId: string;
  toolCallId: string;
  command: readonly string[];
  workingDirectory: string;
  reason: string;
  paths?: readonly string[];
  environment?: Readonly<Record<string, string>>;
  resourceRequest?: DremoSandboxResourceRequest;
  outputInfo?: DremoSandboxOutputInfo;
  approvedByApprovalId?: string | null;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export interface DremoSandboxCommandResult {
  status: DremoSandboxCommandResultStatus;
  toolCallId: string;
  sessionId: string;
  taskId: string;
  noExecution: boolean;
  reason: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  truncated: boolean;
  policyValidation?: DremoSandboxPolicyValidationResult;
}

export interface DremoSandboxRunner {
  createSession(
    request: DremoSandboxSessionRequest,
  ): Promise<DremoSandboxSession>;
  stopSession(request: DremoSandboxStopRequest): Promise<DremoSandboxSession>;
  requestCommand(
    request: DremoSandboxCommandRequest,
  ): Promise<DremoSandboxCommandResult>;
  getSessionStatus(
    request: DremoSandboxStatusRequest,
  ): Promise<DremoSandboxSession>;
}

export function mapSandboxStatusToEventType(
  status: DremoSandboxStatus,
): DremoSandboxEventType | null {
  switch (status) {
    case 'requested':
      return 'sandbox_requested';
    case 'starting':
      return 'sandbox_starting';
    case 'ready':
      return 'sandbox_ready';
    case 'stopping':
      return 'sandbox_stopping';
    case 'stopped':
      return 'sandbox_stopped';
    case 'failed':
      return 'sandbox_failed';
    case 'not_requested':
      return null;
  }
}

export function mapSandboxCommandResultToEventType(
  status: DremoSandboxCommandResultStatus,
): DremoSandboxEventType {
  switch (status) {
    case 'started':
      return 'tool_call_started';
    case 'output':
      return 'tool_call_output';
    case 'completed':
      return 'tool_call_completed';
    case 'blocked':
      return 'tool_call_blocked';
    case 'failed':
      return 'tool_call_failed';
  }
}

const NOOP_FALLBACK_POLICY: DremoSandboxPolicy = {
  maxCpu: 0,
  maxMemoryMb: 0,
  wallClockTimeoutMs: 0,
  maxStdoutBytes: 0,
  maxStderrBytes: 0,
  maxArtifactBytes: 0,
  networkPolicy: 'deny_all',
  allowedCommands: [],
  deniedCommands: [],
  approvalRequiredCommands: [],
  blockedPaths: [],
  allowedEnvironmentKeys: [],
  envPolicy: 'empty',
  cleanupPolicy: 'destroy_after_task',
};

export class DremoNoopSandboxRunner implements DremoSandboxRunner {
  private readonly sessions = new Map<string, DremoSandboxSession>();

  async createSession(
    request: DremoSandboxSessionRequest,
  ): Promise<DremoSandboxSession> {
    const now = new Date().toISOString();
    const session: DremoSandboxSession = {
      id: `noop:${request.taskId}`,
      taskId: request.taskId,
      userId: request.userId,
      provider: 'stub',
      status: 'not_requested',
      policy: request.policy,
      createdAt: now,
      startedAt: null,
      stoppedAt: null,
      failureReason:
        'Sandbox execution is not implemented in this interface-only PR.',
    };

    this.sessions.set(session.id, session);

    return session;
  }

  async stopSession(
    request: DremoSandboxStopRequest,
  ): Promise<DremoSandboxSession> {
    const current = this.sessions.get(request.sessionId);
    const stoppedAt = new Date().toISOString();
    const session: DremoSandboxSession = {
      id: request.sessionId,
      taskId: request.taskId,
      userId: current?.userId ?? '',
      provider: current?.provider ?? 'stub',
      status: 'stopped',
      policy: current?.policy ?? NOOP_FALLBACK_POLICY,
      createdAt: current?.createdAt ?? stoppedAt,
      startedAt: current?.startedAt ?? null,
      stoppedAt,
      failureReason:
        request.reason ??
        'Noop sandbox session stopped without executing commands.',
    };

    this.sessions.set(session.id, session);

    return session;
  }

  async requestCommand(
    request: DremoSandboxCommandRequest,
  ): Promise<DremoSandboxCommandResult> {
    const policy =
      this.sessions.get(request.sessionId)?.policy ?? NOOP_FALLBACK_POLICY;
    const policyValidation = validateSandboxCommandRequest(policy, request);
    const validationReason = policyValidation.reasons
      .map((reason) => reason.message)
      .join(' ');

    return {
      status: 'blocked',
      toolCallId: request.toolCallId,
      sessionId: request.sessionId,
      taskId: request.taskId,
      noExecution: true,
      reason: policyValidation.allowed
        ? 'Sandbox execution is not implemented yet.'
        : validationReason ||
          'Sandbox policy validation blocked this command request.',
      stdout: '',
      stderr: '',
      exitCode: null,
      startedAt: null,
      completedAt: new Date().toISOString(),
      durationMs: null,
      truncated: false,
      policyValidation,
    };
  }

  async getSessionStatus(
    request: DremoSandboxStatusRequest,
  ): Promise<DremoSandboxSession> {
    const session = this.sessions.get(request.sessionId);

    if (session) {
      return session;
    }

    const now = new Date().toISOString();

    return {
      id: request.sessionId,
      taskId: request.taskId,
      userId: '',
      provider: 'stub',
      status: 'not_requested',
      policy: NOOP_FALLBACK_POLICY,
      createdAt: now,
      startedAt: null,
      stoppedAt: null,
      failureReason:
        'Noop sandbox session has not been requested and cannot execute commands.',
    };
  }
}
