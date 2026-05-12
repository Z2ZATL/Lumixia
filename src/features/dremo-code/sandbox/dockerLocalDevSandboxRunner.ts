import { DEFAULT_DREMO_SANDBOX_POLICY } from './defaultSandboxPolicy';
import { localDevSandboxConfig } from './localDevSandboxConfig';
import { validateSandboxCommandRequest } from './policyValidation';
import type { DremoLocalDevSandboxConfig } from './localDevSandboxConfig';
import type {
  DremoSandboxCommandRequest,
  DremoSandboxCommandResult,
  DremoSandboxPolicy,
  DremoSandboxRunner,
  DremoSandboxSession,
  DremoSandboxSessionRequest,
  DremoSandboxStatusRequest,
  DremoSandboxStopRequest,
} from './sandboxRunner';

const DOCKER_LOCAL_DEV_NOT_IMPLEMENTED_REASON =
  'Docker local-dev sandbox execution is not implemented in this skeleton PR.';

function createBlockedLocalDevSession(
  request: DremoSandboxSessionRequest,
  createdAt = new Date().toISOString(),
): DremoSandboxSession {
  return {
    id: `docker-local-dev:${request.taskId}`,
    taskId: request.taskId,
    userId: request.userId,
    provider: 'docker-local-dev',
    status: 'not_requested',
    policy: request.policy,
    createdAt,
    startedAt: null,
    stoppedAt: null,
    failureReason: DOCKER_LOCAL_DEV_NOT_IMPLEMENTED_REASON,
  };
}

function createUnknownLocalDevSession(
  request: DremoSandboxStatusRequest,
  policy: DremoSandboxPolicy,
): DremoSandboxSession {
  const now = new Date().toISOString();

  return {
    id: request.sessionId,
    taskId: request.taskId,
    userId: '',
    provider: 'docker-local-dev',
    status: 'not_requested',
    policy,
    createdAt: now,
    startedAt: null,
    stoppedAt: null,
    failureReason: DOCKER_LOCAL_DEV_NOT_IMPLEMENTED_REASON,
  };
}

export class DockerLocalDevSandboxRunner implements DremoSandboxRunner {
  private readonly sessions = new Map<string, DremoSandboxSession>();

  constructor(
    private readonly config: DremoLocalDevSandboxConfig = localDevSandboxConfig,
  ) {}

  async createSession(
    request: DremoSandboxSessionRequest,
  ): Promise<DremoSandboxSession> {
    const session = createBlockedLocalDevSession(request);

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
      provider: 'docker-local-dev',
      status: 'stopped',
      policy: current?.policy ?? DEFAULT_DREMO_SANDBOX_POLICY,
      createdAt: current?.createdAt ?? stoppedAt,
      startedAt: current?.startedAt ?? null,
      stoppedAt,
      failureReason:
        request.reason ?? 'Docker local-dev skeleton stopped without execution.',
    };

    this.sessions.set(session.id, session);

    return session;
  }

  async requestCommand(
    request: DremoSandboxCommandRequest,
  ): Promise<DremoSandboxCommandResult> {
    const policy =
      this.sessions.get(request.sessionId)?.policy ??
      DEFAULT_DREMO_SANDBOX_POLICY;
    const policyValidation = validateSandboxCommandRequest(policy, request);

    return {
      status: 'blocked',
      provider: this.config.provider,
      toolCallId: request.toolCallId,
      sessionId: request.sessionId,
      taskId: request.taskId,
      noExecution: true,
      reason: DOCKER_LOCAL_DEV_NOT_IMPLEMENTED_REASON,
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
    return (
      this.sessions.get(request.sessionId) ??
      createUnknownLocalDevSession(request, DEFAULT_DREMO_SANDBOX_POLICY)
    );
  }
}

export const dockerLocalDevBlockedCommandExample = {
  provider: 'docker-local-dev',
  noExecution: true,
  request: {
    sessionId: 'docker-local-dev:example-task',
    taskId: 'example-task',
    toolCallId: 'example-tool-safe-command',
    command: ['git', 'status'],
    workingDirectory: 'workspace',
    reason:
      'Demonstrate that allowed commands are still blocked by this skeleton.',
  } satisfies DremoSandboxCommandRequest,
  expected: {
    status: 'blocked',
    provider: 'docker-local-dev',
    noExecution: true,
    policyDecision: 'allow',
  },
} as const;

export const dockerLocalDevDeniedDangerousCommandExample = {
  provider: 'docker-local-dev',
  noExecution: true,
  request: {
    sessionId: 'docker-local-dev:example-task',
    taskId: 'example-task',
    toolCallId: 'example-tool-dangerous-command',
    command: ['rm', '-rf', '/'],
    workingDirectory: 'workspace',
    reason:
      'Demonstrate that dangerous commands are denied before future execution.',
  } satisfies DremoSandboxCommandRequest,
  expected: {
    status: 'blocked',
    provider: 'docker-local-dev',
    noExecution: true,
    policyDecision: 'deny',
  },
} as const;

export const dockerLocalDevApprovalRequiredPackageInstallExample = {
  provider: 'docker-local-dev',
  noExecution: true,
  request: {
    sessionId: 'docker-local-dev:example-task',
    taskId: 'example-task',
    toolCallId: 'example-tool-package-install',
    command: ['npm', 'install'],
    workingDirectory: 'workspace',
    reason:
      'Demonstrate that package installs require approval before future execution.',
  } satisfies DremoSandboxCommandRequest,
  expected: {
    status: 'blocked',
    provider: 'docker-local-dev',
    noExecution: true,
    policyDecision: 'requires_approval',
  },
} as const;
