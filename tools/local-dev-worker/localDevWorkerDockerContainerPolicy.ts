export type LocalDevWorkerDockerContainerExecutionMode =
  | 'blocked'
  | 'plan-only'
  | 'future-reviewed-no-network-container';

export interface LocalDevWorkerDockerImagePolicy {
  allowedImages: readonly string[];
  blockedImages: readonly string[];
  requirePinnedDigest: boolean;
  allowLatestTag: false;
  allowPull: false;
}

export interface LocalDevWorkerDockerContainerResourcePolicy {
  maxWallClockMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  maxMemoryMb: number;
  maxCpuCount: number;
  pidsLimit: number;
}

export interface LocalDevWorkerDockerContainerNetworkPolicy {
  networkMode: 'none';
  allowNetwork: false;
  allowDns: false;
}

export interface LocalDevWorkerDockerContainerMountPolicy {
  allowDockerSocketMount: false;
  allowHomeMount: false;
  allowWorkspaceMount: false;
  allowTmpfs: false;
  readOnlyRootFilesystem: true;
}

export interface LocalDevWorkerDockerContainerSecurityPolicy {
  allowPrivileged: false;
  allowHostNetwork: false;
  allowHostPid: false;
  allowHostIpc: false;
  allowCapabilitiesAdd: false;
  dropAllCapabilities: true;
  noNewPrivileges: true;
  runAsNonRoot: true;
}

export interface LocalDevWorkerDockerContainerNetworkPolicyInput {
  networkMode: 'none' | 'bridge' | 'host';
  allowNetwork: boolean;
  allowDns: boolean;
}

export interface LocalDevWorkerDockerContainerMountPolicyInput {
  allowDockerSocketMount: boolean;
  allowHomeMount: boolean;
  allowWorkspaceMount: boolean;
  allowTmpfs: boolean;
  readOnlyRootFilesystem: boolean;
}

export interface LocalDevWorkerDockerContainerSecurityPolicyInput {
  allowPrivileged: boolean;
  allowHostNetwork: boolean;
  allowHostPid: boolean;
  allowHostIpc: boolean;
  allowCapabilitiesAdd: boolean;
  dropAllCapabilities: boolean;
  noNewPrivileges: boolean;
  runAsNonRoot: boolean;
}

export const LOCAL_DEV_WORKER_DOCKER_CONTAINER_PLAN_CAPABILITY_ID =
  'capability.docker.container.plan';

export const LOCAL_DEV_WORKER_DEFAULT_DOCKER_IMAGE_POLICY: LocalDevWorkerDockerImagePolicy =
  {
    allowedImages: ['alpine:3.20', 'node:20-alpine'],
    blockedImages: [],
    requirePinnedDigest: false,
    allowLatestTag: false,
    allowPull: false,
  };

export const LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_RESOURCE_POLICY: LocalDevWorkerDockerContainerResourcePolicy =
  {
    maxWallClockMs: 3000,
    maxStdoutBytes: 4096,
    maxStderrBytes: 4096,
    maxMemoryMb: 256,
    maxCpuCount: 1,
    pidsLimit: 64,
  };

export const LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_NETWORK_POLICY: LocalDevWorkerDockerContainerNetworkPolicy =
  {
    networkMode: 'none',
    allowNetwork: false,
    allowDns: false,
  };

export const LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY: LocalDevWorkerDockerContainerMountPolicy =
  {
    allowDockerSocketMount: false,
    allowHomeMount: false,
    allowWorkspaceMount: false,
    allowTmpfs: false,
    readOnlyRootFilesystem: true,
  };

export const LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY: LocalDevWorkerDockerContainerSecurityPolicy =
  {
    allowPrivileged: false,
    allowHostNetwork: false,
    allowHostPid: false,
    allowHostIpc: false,
    allowCapabilitiesAdd: false,
    dropAllCapabilities: true,
    noNewPrivileges: true,
    runAsNonRoot: true,
  };

