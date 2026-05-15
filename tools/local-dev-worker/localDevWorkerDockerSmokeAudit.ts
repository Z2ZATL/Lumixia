import {
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID,
} from './localDevWorkerDockerContainerSmokePolicy.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
  LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS,
  type LocalDevWorkerDockerContainerLabel,
} from './localDevWorkerDockerContainerIdentity.ts';
import { createLocalDevWorkerDockerCleanupPlan } from './localDevWorkerDockerCleanupPlan.ts';
import {
  type LocalDevWorkerDockerSmokeOutcome,
  type LocalDevWorkerDockerSmokeOutcomeInput,
  normalizeLocalDevWorkerDockerSmokeOutcome,
} from './localDevWorkerDockerSmokeResultNormalizer.ts';
import { sanitizeWorkerOutputs } from './localDevWorkerOutputSanitizer.ts';

export type LocalDevWorkerDockerSmokeCleanupRisk =
  | 'none_expected'
  | 'unknown_after_timeout'
  | 'not_applicable_blocked'
  | 'not_applicable_cli_or_daemon_unavailable';

export interface LocalDevWorkerDockerSmokeAuditInput
  extends LocalDevWorkerDockerSmokeOutcomeInput {
  capabilityId?: string;
  command: string;
  args: readonly string[];
  durationMs: number;
  imagePulled: false;
  imageBuilt: false;
  networkAllowed: false;
  mountsAllowed: false;
  safetyMetadata: {
    dockerSocketMounted: false;
    homeMounted: false;
    workspaceMounted: false;
    shellAllowed: false;
    hostEnvironmentInherited: false;
  };
}

export interface LocalDevWorkerDockerSmokeAuditRecord {
  auditId: string;
  kind: 'local-dev-docker-container-smoke';
  localDevOnly: true;
  capabilityId: typeof LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID;
  outcome: LocalDevWorkerDockerSmokeOutcome;
  executionAttempted: boolean;
  containerStarted: boolean;
  imagePulled: false;
  imageBuilt: false;
  networkAllowed: false;
  mountsAllowed: false;
  shellAllowed: false;
  hostEnvironmentInherited: false;
  dockerSocketMounted: false;
  homeMounted: false;
  workspaceMounted: false;
  commandPreview: readonly string[];
  containerName: typeof LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME;
  containerLabels: readonly LocalDevWorkerDockerContainerLabel[];
  cleanupPlanAvailable: boolean;
  cleanupExecuted: false;
  cleanupPlanPreview: readonly string[];
  stdoutPreview: string;
  stderrPreview: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  rejectionCodes: readonly string[];
  cleanupRisk: LocalDevWorkerDockerSmokeCleanupRisk;
}

export function getLocalDevWorkerDockerSmokeCleanupRisk(input: {
  outcome: LocalDevWorkerDockerSmokeOutcome;
  executionAttempted: boolean;
  timedOut: boolean;
}): LocalDevWorkerDockerSmokeCleanupRisk {
  if (input.outcome === 'policy_blocked') {
    return 'not_applicable_blocked';
  }

  if (
    input.outcome === 'docker_cli_unavailable' ||
    input.outcome === 'docker_daemon_unavailable'
  ) {
    return 'not_applicable_cli_or_daemon_unavailable';
  }

  if (input.executionAttempted && input.timedOut) {
    return 'unknown_after_timeout';
  }

  return 'none_expected';
}

export function createLocalDevWorkerDockerSmokeAuditRecord(
  input: LocalDevWorkerDockerSmokeAuditInput,
  options: {
    auditId?: string;
    maxStdoutBytes?: number;
    maxStderrBytes?: number;
  } = {},
): LocalDevWorkerDockerSmokeAuditRecord {
  const outcome = normalizeLocalDevWorkerDockerSmokeOutcome(input);
  const sanitized = sanitizeWorkerOutputs({
    stdout: input.stdout,
    stderr: input.stderr,
    maxStdoutBytes: options.maxStdoutBytes,
    maxStderrBytes: options.maxStderrBytes,
  });
  const cleanupRisk = getLocalDevWorkerDockerSmokeCleanupRisk({
    outcome,
    executionAttempted: input.executionAttempted,
    timedOut: input.timedOut,
  });
  const cleanupPlan = createLocalDevWorkerDockerCleanupPlan();

  return {
    auditId:
      options.auditId ??
      `local-dev-smoke.${outcome}.${input.executionAttempted ? 'attempted' : 'blocked'}`,
    kind: 'local-dev-docker-container-smoke',
    localDevOnly: true,
    capabilityId: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID,
    outcome,
    executionAttempted: input.executionAttempted,
    containerStarted: input.containerStarted,
    imagePulled: false,
    imageBuilt: false,
    networkAllowed: false,
    mountsAllowed: false,
    shellAllowed: false,
    hostEnvironmentInherited: false,
    dockerSocketMounted: false,
    homeMounted: false,
    workspaceMounted: false,
    commandPreview: [input.command, ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS],
    containerName: LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
    containerLabels: LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS,
    cleanupPlanAvailable: cleanupRisk === 'unknown_after_timeout',
    cleanupExecuted: false,
    cleanupPlanPreview: cleanupPlan.commandPreview,
    stdoutPreview: sanitized.stdout.value,
    stderrPreview: sanitized.stderr.value,
    exitCode: input.exitCode,
    timedOut: input.timedOut,
    durationMs: input.durationMs,
    rejectionCodes: [...new Set(input.rejectionCodes)],
    cleanupRisk,
  };
}
