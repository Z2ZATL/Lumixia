import type {
  DashboardAgent,
  ExecutionExecutionResult,
  ExecutionProvider,
  ExecutionProviderLog,
  ExecutionProviderMode,
  ExecutionProviderSession,
} from '../types';

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
  async createSession({
    agent,
  }: {
    agent: DashboardAgent;
    userId: string;
  }): Promise<ExecutionProviderSession> {
    return {
      title: agent.workspaceTitle ?? `${agent.name} Workspace`,
      subtitle: agent.workspaceSubtitle ?? 'Session Active',
      status: 'booting',
      providerMode: 'mock',
      executionCost: agent.executionCost,
    };
  }

  async listLogs({
    agent,
  }: {
    agent: DashboardAgent;
    sessionId: string;
    userId: string;
  }) {
    return BOOT_LOGS[agent.slug] ?? [
      { kind: 'system', message: '[SYSTEM] Starting secure workspace...' },
      { kind: 'success', message: '-> Ready.' },
    ];
  }

  async execute({
    agent,
  }: {
    agent: DashboardAgent;
    sessionId: string;
    userId: string;
  }): Promise<ExecutionExecutionResult> {
    return {
      status: 'completed',
      logs: EXECUTION_LOGS[agent.slug] ?? [
        { kind: 'progress', message: '[EXEC] Running sequence...' },
        { kind: 'success', message: '-> Execution finished successfully.' },
      ],
    };
  }
}

class ApiExecutionProvider implements ExecutionProvider {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Execution API request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  async createSession({
    agent,
    userId,
  }: {
    agent: DashboardAgent;
    userId: string;
  }): Promise<ExecutionProviderSession> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        agentSlug: agent.slug,
        userId,
      }),
    });
  }

  async listLogs({
    sessionId,
  }: {
    agent: DashboardAgent;
    sessionId: string;
    userId: string;
  }) {
    return this.request<ExecutionProviderLog[]>(`/sessions/${sessionId}/logs`);
  }

  async execute({
    sessionId,
    agent,
    userId,
  }: {
    agent: DashboardAgent;
    sessionId: string;
    userId: string;
  }): Promise<ExecutionExecutionResult> {
    return this.request(`/sessions/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        agentSlug: agent.slug,
        userId,
      }),
    });
  }
}

export function getExecutionProviderMode(): ExecutionProviderMode {
  return import.meta.env.VITE_EXECUTION_MODE === 'api' ? 'api' : 'mock';
}

export function getExecutionProvider(): ExecutionProvider {
  if (getExecutionProviderMode() === 'api') {
    const baseUrl = import.meta.env.VITE_EXECUTION_API_BASE_URL;

    if (!baseUrl) {
      throw new Error(
        'VITE_EXECUTION_API_BASE_URL is required when VITE_EXECUTION_MODE=api.',
      );
    }

    return new ApiExecutionProvider(baseUrl);
  }

  return new MockExecutionProvider();
}
