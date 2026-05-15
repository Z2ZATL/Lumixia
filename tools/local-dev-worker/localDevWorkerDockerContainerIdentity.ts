export interface LocalDevWorkerDockerContainerLabel {
  key: string;
  value: string;
}

export interface LocalDevWorkerDockerContainerIdentity {
  containerName: typeof LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME;
  labels: readonly LocalDevWorkerDockerContainerLabel[];
}

export interface LocalDevWorkerDockerContainerIdentityValidationResult {
  valid: boolean;
  rejectionCodes: string[];
}

export const LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME =
  'lumixia-dremo-smoke-echo';

export const LOCAL_DEV_WORKER_DOCKER_SMOKE_CAPABILITY_LABEL_VALUE =
  'capability.docker.container.smoke.echo';

export const LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS = [
  {
    key: 'lumixia.dremo.local-dev',
    value: 'true',
  },
  {
    key: 'lumixia.dremo.kind',
    value: 'container-smoke',
  },
  {
    key: 'lumixia.dremo.capability',
    value: LOCAL_DEV_WORKER_DOCKER_SMOKE_CAPABILITY_LABEL_VALUE,
  },
  {
    key: 'lumixia.dremo.cleanup',
    value: 'review-required',
  },
] as const satisfies readonly LocalDevWorkerDockerContainerLabel[];

const CONTAINER_NAME_PATTERN = /^lumixia-dremo-[a-z0-9-]+$/;

function labelKeyValue(label: LocalDevWorkerDockerContainerLabel) {
  return `${label.key}=${label.value}`;
}

export function createLocalDevWorkerDockerContainerIdentity(): LocalDevWorkerDockerContainerIdentity {
  return {
    containerName: LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
    labels: LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS,
  };
}

export function createLocalDevWorkerDockerSmokeLabelArgs(): readonly string[] {
  return LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS.flatMap((label) => [
    '--label',
    labelKeyValue(label),
  ]);
}

export function validateLocalDevWorkerDockerContainerIdentity(input: {
  containerName: string;
  labels: readonly LocalDevWorkerDockerContainerLabel[];
}): LocalDevWorkerDockerContainerIdentityValidationResult {
  const rejectionCodes: string[] = [];

  if (input.containerName !== LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME) {
    rejectionCodes.push('container_identity_name_not_exact');
  }

  if (!CONTAINER_NAME_PATTERN.test(input.containerName)) {
    rejectionCodes.push('container_identity_name_invalid');
  }

  if (input.labels.length !== LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS.length) {
    rejectionCodes.push('container_identity_label_count_mismatch');
  }

  for (const expected of LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS) {
    const matching = input.labels.find(
      (label) => label.key === expected.key && label.value === expected.value,
    );

    if (!matching) {
      rejectionCodes.push(`container_identity_label_missing:${expected.key}`);
    }
  }

  for (const label of input.labels) {
    const allowed = LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS.some(
      (expected) => expected.key === label.key && expected.value === label.value,
    );

    if (!allowed) {
      rejectionCodes.push(`container_identity_label_not_allowed:${label.key}`);
    }
  }

  return {
    valid: rejectionCodes.length === 0,
    rejectionCodes: [...new Set(rejectionCodes)],
  };
}
