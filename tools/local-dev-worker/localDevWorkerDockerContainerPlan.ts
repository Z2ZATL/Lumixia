import {
  type LocalDevWorkerDockerContainerMountPolicy,
  type LocalDevWorkerDockerContainerNetworkPolicy,
  type LocalDevWorkerDockerContainerResourcePolicy,
  type LocalDevWorkerDockerContainerSecurityPolicy,
} from './localDevWorkerDockerContainerPolicy.ts';

export interface LocalDevWorkerDockerContainerPlan {
  planId: string;
  noExecution: true;
  executionMode: 'plan-only';
  image: string;
  imagePolicyDecision: 'allow' | 'deny';
  command: readonly string[];
  workingDirectory: string;
  networkPolicy: LocalDevWorkerDockerContainerNetworkPolicy;
  mountPolicy: LocalDevWorkerDockerContainerMountPolicy;
  resourcePolicy: LocalDevWorkerDockerContainerResourcePolicy;
  securityPolicy: LocalDevWorkerDockerContainerSecurityPolicy;
  rejectionCodes: string[];
  warnings: string[];
  dockerRunPreview: readonly string[];
}

export function createLocalDevWorkerDockerContainerPlan(input: {
  planId: string;
  image: string;
  imagePolicyDecision: 'allow' | 'deny';
  command: readonly string[];
  rejectionCodes: readonly string[];
  warnings: readonly string[];
  networkPolicy: LocalDevWorkerDockerContainerNetworkPolicy;
  mountPolicy: LocalDevWorkerDockerContainerMountPolicy;
  resourcePolicy: LocalDevWorkerDockerContainerResourcePolicy;
  securityPolicy: LocalDevWorkerDockerContainerSecurityPolicy;
}): LocalDevWorkerDockerContainerPlan {
  return {
    planId: input.planId,
    noExecution: true,
    executionMode: 'plan-only',
    image: input.image,
    imagePolicyDecision: input.imagePolicyDecision,
    command: [...input.command],
    workingDirectory: '/workspace',
    networkPolicy: input.networkPolicy,
    mountPolicy: input.mountPolicy,
    resourcePolicy: input.resourcePolicy,
    securityPolicy: input.securityPolicy,
    rejectionCodes: [...new Set(input.rejectionCodes)],
    warnings: [...new Set(input.warnings)],
    dockerRunPreview: [
      'docker',
      'run',
      '--rm',
      '--network',
      'none',
      '--read-only',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      '--user',
      '1000:1000',
      '--memory',
      `${input.resourcePolicy.maxMemoryMb}m`,
      '--cpus',
      String(input.resourcePolicy.maxCpuCount),
      '--pids-limit',
      String(input.resourcePolicy.pidsLimit),
      '--workdir',
      '/workspace',
      input.image,
      ...input.command,
    ],
  };
}

