import {
  LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
  LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS,
  type LocalDevWorkerDockerContainerLabel,
} from './localDevWorkerDockerContainerIdentity.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND,
  evaluateLocalDevWorkerDockerCleanupPolicy,
} from './localDevWorkerDockerCleanupPolicy.ts';

export interface LocalDevWorkerDockerCleanupPlan {
  planId: string;
  noExecution: true;
  cleanupExecutionImplemented: false;
  commandPreview: readonly string[];
  targetContainerName: string;
  requiredLabels: readonly LocalDevWorkerDockerContainerLabel[];
  rejectionCodes: string[];
  warnings: string[];
  cleanupRiskAddressed: boolean;
}

export function createLocalDevWorkerDockerCleanupPlan(): LocalDevWorkerDockerCleanupPlan {
  const commandPreview = [...LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND];
  const policy = evaluateLocalDevWorkerDockerCleanupPolicy({
    command: commandPreview[0],
    args: commandPreview.slice(1),
  });

  return {
    planId: 'local-dev-docker-smoke-cleanup.plan-only.v1',
    noExecution: true,
    cleanupExecutionImplemented: false,
    commandPreview,
    targetContainerName: LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
    requiredLabels: LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS,
    rejectionCodes: policy.rejectionCodes,
    warnings: [
      'Cleanup command execution is not implemented in this PR.',
      'Future cleanup must verify labels before execution.',
    ],
    cleanupRiskAddressed: policy.allowed,
  };
}
