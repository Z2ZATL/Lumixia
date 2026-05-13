export type LocalDevWorkerExecutionMode =
  | 'blocked'
  | 'dry-run'
  | 'future-reviewed-docker';

export type LocalDevWorkerSource = 'dremo-local-dev-sandbox';

export type LocalDevWorkerExpectedEnvironment = 'local-dev';

export interface LocalDevWorkerCommandRequest {
  command: string;
  args: readonly string[];
  requestId?: string;
  source: LocalDevWorkerSource;
  expectedEnvironment: LocalDevWorkerExpectedEnvironment;
}

export interface LocalDevWorkerSafetyMetadata {
  workerBoundary: 'outside-browser-bundle';
  allowRealExecution: false;
  dockerExecutionImplemented: false;
  dockerSocketMounted: false;
  homeMounted: false;
  networkAllowed: false;
  fileWritesAllowed: false;
}

export interface LocalDevWorkerCommandResponse {
  ok: boolean;
  noExecution: true;
  executionMode: Extract<LocalDevWorkerExecutionMode, 'blocked' | 'dry-run'>;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  blockedReason: string;
  safetyMetadata: LocalDevWorkerSafetyMetadata;
}

export interface LocalDevWorkerCommandRejection {
  code: string;
  message: string;
}

export interface LocalDevWorkerCommandClassification {
  allowedByClassification: boolean;
  normalizedCommand: string;
  rejections: LocalDevWorkerCommandRejection[];
}

export const LOCAL_DEV_WORKER_SAFETY_METADATA: LocalDevWorkerSafetyMetadata = {
  workerBoundary: 'outside-browser-bundle',
  allowRealExecution: false,
  dockerExecutionImplemented: false,
  dockerSocketMounted: false,
  homeMounted: false,
  networkAllowed: false,
  fileWritesAllowed: false,
};

export const LOCAL_DEV_WORKER_ALLOWED_VERSION_COMMANDS = [
  'echo',
  'pwd',
  'node --version',
  'npm --version',
  'pnpm --version',
  'python --version',
  'git --version',
  'docker --version',
  'docker version --format {{json .}}',
] as const;

export const LOCAL_DEV_WORKER_BOUNDARY_NOTE =
  'This worker contract is outside the browser bundle. It is still blocked/dry-run only and does not implement Docker execution.';
