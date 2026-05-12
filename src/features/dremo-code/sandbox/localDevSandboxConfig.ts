import type { DremoSandboxProvider } from './sandboxRunner';

export interface DremoLocalDevSandboxConfig {
  enabled: boolean;
  provider: Extract<DremoSandboxProvider, 'docker-local-dev'>;
  requiresExplicitDeveloperOptIn: true;
  allowRealExecution: boolean;
  environmentName: 'local-dev';
  allowedVersionCommands: readonly string[];
  networkEnabled: boolean;
  fileWritesEnabled: boolean;
  allowShellChaining: boolean;
  allowPackageInstall: boolean;
  allowGitClone: boolean;
  allowDockerSocket: boolean;
  allowHomeMount: boolean;
  maxSessionDurationMs: number;
  notes: readonly string[];
}

export const localDevSandboxConfig: DremoLocalDevSandboxConfig = {
  enabled: false,
  provider: 'docker-local-dev',
  requiresExplicitDeveloperOptIn: true,
  allowRealExecution: false,
  environmentName: 'local-dev',
  allowedVersionCommands: [
    'echo',
    'pwd',
    'node --version',
    'npm --version',
    'python --version',
    'git --version',
  ],
  networkEnabled: false,
  fileWritesEnabled: false,
  allowShellChaining: false,
  allowPackageInstall: false,
  allowGitClone: false,
  allowDockerSocket: false,
  allowHomeMount: false,
  maxSessionDurationMs: 15 * 60 * 1000,
  notes: [
    'This static config is local-dev only and disabled by default.',
    'It does not read environment variables or expose production UI execution.',
    'Docker execution must run in a separate reviewed Node/worker context, not the browser bundle.',
  ],
};
