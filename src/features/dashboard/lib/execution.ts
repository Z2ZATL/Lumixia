import type {
  DashboardAgent,
  ExecutionExecutionResult,
  ExecutionLogRecord,
  ExecutionProvider,
  ExecutionProviderLog,
  ExecutionProviderMode,
  ExecutionProviderSession,
  ExecutionSessionRecord,
  ExecutionWorkspaceSessionResult,
} from '../types';
import { getSupabaseClient } from '../../../lib/supabase';

const EXECUTION_REQUEST_TIMEOUT_MS = 10000;
const REQUIRED_EXECUTION_AUTH_MODE = 'supabase-jwt';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getDefaultExecutionApiBaseUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (typeof supabaseUrl !== 'string' || !supabaseUrl.trim()) {
    return null;
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/execution-api`;
}

const BOOT_LOGS: Record<string, ExecutionProviderLog[]> = {
  'code-architect': [
    { kind: 'system', message: '[SYSTEM] Starting Code Architect session...' },
    { kind: 'progress', message: '-> Initializing neural routing...' },
    { kind: 'progress', message: '-> Mapping file architecture...' },
    { kind: 'system', message: 'Loaded 14 macro-context nodes.' },
    { kind: 'success', message: '-> Ready for execution.' },
  ],
};

const EXECUTION_LOGS: Record<string, ExecutionProviderLog[]> = {
  'code-architect': [
    { kind: 'progress', message: '[EXEC] Running sequence...' },
    { kind: 'progress', message: '-> Validating workspace assumptions...' },
    { kind: 'progress', message: '-> Synthesizing architectural diff...' },
    { kind: 'success', message: '-> Execution finished successfully.' },
  ],
};

class MockExecutionProvider implements ExecutionProvider {
  private createEphemeralSession(
    agent: DashboardAgent,
    userId: string,
    status: ExecutionSessionRecord['status'],
  ): ExecutionSessionRecord {
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      userId,
      agentSlug: agent.slug,
      agentName: agent.name,
      status,
      executionCost: agent.executionCost,
      providerMode: 'mock',
      createdAt: now,
      updatedAt: now,
    };
  }

  private mapEphemeralLogs(
    sessionId: string,
    userId: string,
    logs: ExecutionProviderLog[],
  ): ExecutionLogRecord[] {
    const now = new Date().toISOString();

    return logs.map((log) => ({
      id: crypto.randomUUID(),
      sessionId,
      userId,
      kind: log.kind,
      message: log.message,
      createdAt: now,
    }));
  }

  async createSession({
    agent,
    userId,
  }: {
    agent: DashboardAgent;
    userId: string;
  }): Promise<ExecutionWorkspaceSessionResult> {
    const session = this.createEphemeralSession(agent, userId, 'idle');
    const providerSession: ExecutionProviderSession = {
      title: agent.workspaceTitle ?? `${agent.name} Workspace`,
      subtitle:
        agent.workspaceSubtitle ??
        'Demo session. No sandboxed code is running yet.',
      status: 'idle',
      providerMode: 'mock',
      executionCost: agent.executionCost,
    };

    return {
      session,
      providerSession,
      logs: this.mapEphemeralLogs(
        session.id,
        userId,
        BOOT_LOGS[agent.slug] ?? [
          { kind: 'system', message: '[SYSTEM] Starting demo workspace...' },
          { kind: 'success', message: '-> Demo workspace ready.' },
        ],
      ),
    };
  }

  async execute({
    agent,
    sessionId,
    userId,
  }: {
    agent: DashboardAgent;
    sessionId: string;
    userId: string;
  }): Promise<ExecutionExecutionResult> {
    const session = {
      ...this.createEphemeralSession(agent, userId, 'completed'),
      id: sessionId,
    };

    return {
      session,
      logs: this.mapEphemeralLogs(
        sessionId,
        userId,
        EXECUTION_LOGS[agent.slug] ?? [
          { kind: 'progress', message: '[EXEC] Running demo sequence...' },
          { kind: 'success', message: '-> Demo execution finished.' },
        ],
      ),
    };
  }
}

class ApiExecutionProvider implements ExecutionProvider {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, init?: RequestInit) {
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();

    if (!session?.access_token) {
      throw new Error('A secure Lumixia session is required before execution can run.');
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      EXECUTION_REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: unknown }
          | null;
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : `Execution API request failed with status ${response.status}.`;

        throw new Error(message);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(
          'The secure execution service took too long to respond. Please try again.',
        );
      }

      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async createSession({
    agent,
  }: {
    agent: DashboardAgent;
    userId: string;
  }): Promise<ExecutionWorkspaceSessionResult> {
    const response = await this.request<unknown>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        agentSlug: agent.slug,
      }),
    });

    if (
      !isRecord(response) ||
      !isRecord(response.session) ||
      !Array.isArray(response.logs) ||
      !isRecord(response.providerSession)
    ) {
      throw new Error(
        'The secure execution API deployment is out of date. Deploy supabase/functions/execution-api before using API execution mode.',
      );
    }

    return response as unknown as ExecutionWorkspaceSessionResult;
  }

  async execute({
    sessionId,
    agent,
  }: {
    agent: DashboardAgent;
    sessionId: string;
    userId: string;
  }): Promise<ExecutionExecutionResult> {
    const response = await this.request<unknown>(`/sessions/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        agentSlug: agent.slug,
      }),
    });

    if (
      !isRecord(response) ||
      !isRecord(response.session) ||
      !Array.isArray(response.logs)
    ) {
      throw new Error(
        'The secure execution API deployment is out of date. Deploy supabase/functions/execution-api before using API execution mode.',
      );
    }

    return response as unknown as ExecutionExecutionResult;
  }
}

export function getExecutionProviderMode(): ExecutionProviderMode {
  return resolveExecutionProvider().mode;
}

export function resolveExecutionProvider(): {
  mode: ExecutionProviderMode;
  provider: ExecutionProvider;
  configurationError: string | null;
} {
  const requestedMode =
    import.meta.env.VITE_EXECUTION_MODE === 'api' ? 'api' : 'mock';

  if (requestedMode !== 'api') {
    return {
      mode: 'mock',
      provider: new MockExecutionProvider(),
      configurationError: null,
    };
  }

  const baseUrl =
    import.meta.env.VITE_EXECUTION_API_BASE_URL ?? getDefaultExecutionApiBaseUrl();
  const authMode = import.meta.env.VITE_EXECUTION_API_AUTH_MODE;

  if (!baseUrl) {
    return {
      mode: 'mock',
      provider: new MockExecutionProvider(),
      configurationError:
        'Execution API mode was requested, but VITE_EXECUTION_API_BASE_URL is missing. Lumixia is staying in demo workspace mode.',
    };
  }

  if (authMode !== REQUIRED_EXECUTION_AUTH_MODE) {
    return {
      mode: 'mock',
      provider: new MockExecutionProvider(),
      configurationError:
        'Execution API mode was requested without VITE_EXECUTION_API_AUTH_MODE=supabase-jwt. Lumixia is staying in demo workspace mode.',
    };
  }

  return {
    mode: 'api',
    provider: new ApiExecutionProvider(baseUrl),
    configurationError: null,
  };
}

export function getExecutionProvider(): ExecutionProvider {
  return resolveExecutionProvider().provider;
}

export function getExecutionProviderConfigurationError() {
  return resolveExecutionProvider().configurationError;
}
