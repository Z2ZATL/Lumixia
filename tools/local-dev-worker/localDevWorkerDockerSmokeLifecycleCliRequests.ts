import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND } from './localDevWorkerDockerCleanupPolicy.ts';
import { LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS } from './localDevWorkerDockerContainerSmokePolicy.ts';
import {
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
} from './localDevWorkerExecutionConfig.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import type { LocalDevWorkerDockerSmokeLifecycleInput } from './localDevWorkerDockerSmokeLifecycle.ts';
import {
  createTrustedLocalDevManualReviewForCapabilities,
  createTrustedLocalDevManualReviewForContainerSmoke,
  createTrustedLocalDevManualReviewForDockerSmokeCleanup,
} from './localDevWorkerTrustedReview.ts';

export const LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_CLI_ID =
  'local-dev-docker-smoke-lifecycle-cli';

export const LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_CLI_READINESS_ARGS = [
  'version',
  '--format',
  '{{json .}}',
] as const;

const READINESS_CAPABILITY_ID = 'capability.docker.daemon.readiness';
const SMOKE_CAPABILITY_ID = 'capability.docker.container.smoke.echo';
const CLEANUP_CAPABILITY_ID = 'capability.docker.smoke.cleanup.exact';
const CLEANUP_ARGS = LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND.slice(1);

function baseRequest(input: {
  requestId: string;
  command: string;
  args: readonly string[];
  reason: string;
  capabilityId: string;
}): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: input.requestId,
    command: input.command,
    args: [...input.args],
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: input.reason,
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: true,
    manualSecurityReview: createTrustedLocalDevManualReviewForCapabilities([
      input.capabilityId,
    ]),
    productionUiPath: false,
    srcImportPath: false,
  };
}

export function createLocalDevWorkerDockerSmokeLifecycleCliReadinessRequest(): LocalDevWorkerExecutionReadinessRequest {
  return baseRequest({
    requestId: 'local-dev-cli-docker-readiness',
    command: 'docker',
    args: LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_CLI_READINESS_ARGS,
    reason:
      'Local-dev CLI wrapper invokes the reviewed Docker readiness classifier before the smoke lifecycle.',
    capabilityId: READINESS_CAPABILITY_ID,
  });
}

export function createLocalDevWorkerDockerSmokeLifecycleCliSmokeRequest(): LocalDevWorkerExecutionReadinessRequest {
  return baseRequest({
    requestId: 'local-dev-cli-docker-smoke',
    command: 'docker',
    args: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    reason:
      'Local-dev CLI wrapper invokes only the exact reviewed Docker smoke command.',
    capabilityId: SMOKE_CAPABILITY_ID,
  });
}

export function createLocalDevWorkerDockerSmokeLifecycleCliCleanupRequest(): LocalDevWorkerExecutionReadinessRequest {
  return baseRequest({
    requestId: 'local-dev-cli-docker-smoke-cleanup',
    command: 'docker',
    args: CLEANUP_ARGS,
    reason:
      'Local-dev CLI wrapper invokes only the exact reviewed deterministic cleanup command.',
    capabilityId: CLEANUP_CAPABILITY_ID,
  });
}

export function createLocalDevWorkerDockerSmokeLifecycleCliInput(
  options: {
    lifecycleId?: string;
  } = {},
): LocalDevWorkerDockerSmokeLifecycleInput {
  return {
    lifecycleId:
      options.lifecycleId ?? LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_CLI_ID,
    readiness: {
      request: createLocalDevWorkerDockerSmokeLifecycleCliReadinessRequest(),
      config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
      trustedManualReview: createTrustedLocalDevManualReviewForCapabilities([
        READINESS_CAPABILITY_ID,
      ]),
    },
    smoke: {
      request: createLocalDevWorkerDockerSmokeLifecycleCliSmokeRequest(),
      config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
      trustedManualReview: createTrustedLocalDevManualReviewForContainerSmoke(),
    },
    cleanup: {
      request: createLocalDevWorkerDockerSmokeLifecycleCliCleanupRequest(),
      config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
      trustedManualReview:
        createTrustedLocalDevManualReviewForDockerSmokeCleanup(),
    },
  };
}
