import type { DremoSandboxProvider } from './sandboxRunner';

export interface DremoLocalDevSandboxConfig {
  enabled: false;
  provider: Extract<DremoSandboxProvider, 'docker-local-dev'>;
  requiresExplicitDeveloperOptIn: true;
  allowRealExecution: false;
  maxSessionDurationMs: number;
  notes: readonly string[];
}

export const localDevSandboxConfig: DremoLocalDevSandboxConfig = {
  enabled: false,
  provider: 'docker-local-dev',
  requiresExplicitDeveloperOptIn: true,
  allowRealExecution: false,
  maxSessionDurationMs: 15 * 60 * 1000,
  notes: [
    'This static config is a local-dev adapter skeleton only.',
    'It does not read environment variables or enable runtime execution.',
    'A separate reviewed PR must explicitly introduce any Docker execution path.',
  ],
};
