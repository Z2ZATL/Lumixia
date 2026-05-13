export type LocalDevWorkerExecutionMode =
  | 'disabled'
  | 'reviewed-local-version-commands';

export interface LocalDevWorkerExecutionConfig {
  allowRealExecution: boolean;
  executionMode: LocalDevWorkerExecutionMode;
  expectedEnvironment: 'local-dev';
  maxWallClockMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  allowedCapabilityIds: readonly string[];
  blockedCapabilityIds: readonly string[];
  inheritHostEnvironment: false;
  allowShell: false;
  allowNetwork: false;
  allowFileWrites: false;
  allowDockerCli: false;
  allowDockerRuntime: false;
  allowDockerSocket: false;
  allowHomeMount: false;
}

export const LOCAL_DEV_WORKER_NON_DOCKER_VERSION_CAPABILITY_IDS = [
  'capability.node.version',
  'capability.npm.version',
  'capability.pnpm.version',
  'capability.python.version',
  'capability.git.version',
  'capability.pwd.identity',
  'capability.echo.metadata',
] as const;

export const LOCAL_DEV_WORKER_DOCKER_CAPABILITY_IDS = [
  'capability.docker.version',
] as const;

export const LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG: LocalDevWorkerExecutionConfig =
  {
    allowRealExecution: false,
    executionMode: 'disabled',
    expectedEnvironment: 'local-dev',
    maxWallClockMs: 3000,
    maxStdoutBytes: 2048,
    maxStderrBytes: 2048,
    allowedCapabilityIds: [],
    blockedCapabilityIds: [...LOCAL_DEV_WORKER_DOCKER_CAPABILITY_IDS],
    inheritHostEnvironment: false,
    allowShell: false,
    allowNetwork: false,
    allowFileWrites: false,
    allowDockerCli: false,
    allowDockerRuntime: false,
    allowDockerSocket: false,
    allowHomeMount: false,
  };

export const LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG: LocalDevWorkerExecutionConfig =
  {
    ...LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
    allowRealExecution: true,
    executionMode: 'reviewed-local-version-commands',
    allowedCapabilityIds: [
      ...LOCAL_DEV_WORKER_NON_DOCKER_VERSION_CAPABILITY_IDS,
    ],
  };
