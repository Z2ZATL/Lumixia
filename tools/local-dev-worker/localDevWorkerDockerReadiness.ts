export type LocalDevWorkerDockerReadinessState =
  | 'not_checked'
  | 'cli_unavailable'
  | 'cli_available'
  | 'daemon_unavailable'
  | 'daemon_available'
  | 'probe_blocked'
  | 'probe_failed';

export interface LocalDevWorkerDockerReadinessSafetyMetadata {
  workerBoundary: 'outside-browser-bundle';
  localDevOnly: true;
  dockerCliAllowed: boolean;
  dockerDaemonStateQueried: boolean;
  dockerRuntimeAllowed: false;
  containerStarted: false;
  imagePulled: false;
  imageBuilt: false;
  dockerSocketMounted: false;
  homeMounted: false;
  networkAllowed: false;
  fileWritesAllowed: false;
  shellAllowed: false;
  hostEnvironmentInherited: false;
}

export interface LocalDevWorkerDockerReadinessResult {
  ok: boolean;
  noContainerExecution: true;
  readinessState: LocalDevWorkerDockerReadinessState;
  dockerCliVersion?: string;
  dockerServerVersion?: string;
  daemonReachable: boolean;
  commandAttempted?: string;
  rejectionCodes: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  safetyMetadata: LocalDevWorkerDockerReadinessSafetyMetadata;
}

