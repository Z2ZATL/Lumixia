import {
  type LocalDevWorkerDockerReadinessResult,
} from './localDevWorkerDockerReadiness.ts';
import {
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY,
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_NETWORK_POLICY,
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_RESOURCE_POLICY,
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY,
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_IMAGE_POLICY,
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_PLAN_CAPABILITY_ID,
  type LocalDevWorkerDockerContainerMountPolicy,
  type LocalDevWorkerDockerContainerMountPolicyInput,
  type LocalDevWorkerDockerContainerNetworkPolicy,
  type LocalDevWorkerDockerContainerNetworkPolicyInput,
  type LocalDevWorkerDockerContainerResourcePolicy,
  type LocalDevWorkerDockerContainerSecurityPolicy,
  type LocalDevWorkerDockerContainerSecurityPolicyInput,
  type LocalDevWorkerDockerImagePolicy,
} from './localDevWorkerDockerContainerPolicy.ts';
import {
  createLocalDevWorkerDockerContainerPlan,
  type LocalDevWorkerDockerContainerPlan,
} from './localDevWorkerDockerContainerPlan.ts';
import { evaluateLocalDevWorkerDockerContainerCommandPolicy } from './localDevWorkerDockerContainerCommandPolicy.ts';
import { evaluateLocalDevWorkerDockerImagePolicy } from './localDevWorkerDockerImagePolicy.ts';
import {
  assertTrustedManualReviewSource,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerDockerContainerReadinessGateInput {
  planId: string;
  image: string;
  command: readonly string[];
  dockerReadiness: LocalDevWorkerDockerReadinessResult;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
  source: 'dremo-local-dev-sandbox';
  expectedEnvironment: 'local-dev';
  productionUiPath: boolean;
  srcImportPath: boolean;
  imagePolicy?: LocalDevWorkerDockerImagePolicy;
  resourcePolicy?: LocalDevWorkerDockerContainerResourcePolicy;
  networkPolicy?: LocalDevWorkerDockerContainerNetworkPolicyInput;
  mountPolicy?: LocalDevWorkerDockerContainerMountPolicyInput;
  securityPolicy?: LocalDevWorkerDockerContainerSecurityPolicyInput;
}

export interface LocalDevWorkerDockerContainerReadinessGateResult {
  readyForFutureContainerExecution: boolean;
  noExecution: true;
  containerStarted: false;
  imagePulled: false;
  dockerRunExecuted: false;
  rejectionCodes: string[];
  warnings: string[];
  plan?: LocalDevWorkerDockerContainerPlan;
}

function asStrictNetworkPolicy(
  policy: LocalDevWorkerDockerContainerNetworkPolicyInput,
): LocalDevWorkerDockerContainerNetworkPolicy {
  return {
    networkMode: 'none',
    allowNetwork: false,
    allowDns: false,
  };
}

function asStrictMountPolicy(
  policy: LocalDevWorkerDockerContainerMountPolicyInput,
): LocalDevWorkerDockerContainerMountPolicy {
  return {
    allowDockerSocketMount: false,
    allowHomeMount: false,
    allowWorkspaceMount: false,
    allowTmpfs: false,
    readOnlyRootFilesystem: true,
  };
}

function asStrictSecurityPolicy(
  policy: LocalDevWorkerDockerContainerSecurityPolicyInput,
): LocalDevWorkerDockerContainerSecurityPolicy {
  return {
    allowPrivileged: false,
    allowHostNetwork: false,
    allowHostPid: false,
    allowHostIpc: false,
    allowCapabilitiesAdd: false,
    dropAllCapabilities: true,
    noNewPrivileges: true,
    runAsNonRoot: true,
  };
}

function validateNetworkPolicy(
  policy: LocalDevWorkerDockerContainerNetworkPolicyInput,
) {
  const rejections: string[] = [];

  if (policy.networkMode !== 'none') {
    rejections.push('container_network_mode_denied');
  }

  if (policy.allowNetwork) {
    rejections.push('container_network_denied');
  }

  if (policy.allowDns) {
    rejections.push('container_dns_denied');
  }

  return rejections;
}

function validateMountPolicy(
  policy: LocalDevWorkerDockerContainerMountPolicyInput,
) {
  const rejections: string[] = [];

  if (policy.allowDockerSocketMount) {
    rejections.push('container_docker_socket_mount_denied');
  }

  if (policy.allowHomeMount) {
    rejections.push('container_home_mount_denied');
  }

  if (policy.allowWorkspaceMount) {
    rejections.push('container_workspace_mount_denied');
  }

  if (policy.allowTmpfs) {
    rejections.push('container_tmpfs_denied');
  }

  if (!policy.readOnlyRootFilesystem) {
    rejections.push('container_read_only_rootfs_required');
  }

  return rejections;
}

function validateSecurityPolicy(
  policy: LocalDevWorkerDockerContainerSecurityPolicyInput,
) {
  const rejections: string[] = [];

  if (policy.allowPrivileged) {
    rejections.push('container_privileged_denied');
  }

  if (policy.allowHostNetwork) {
    rejections.push('container_host_network_denied');
  }

  if (policy.allowHostPid) {
    rejections.push('container_host_pid_denied');
  }

  if (policy.allowHostIpc) {
    rejections.push('container_host_ipc_denied');
  }

  if (policy.allowCapabilitiesAdd) {
    rejections.push('container_capabilities_add_denied');
  }

  if (!policy.dropAllCapabilities) {
    rejections.push('container_drop_all_capabilities_required');
  }

  if (!policy.noNewPrivileges) {
    rejections.push('container_no_new_privileges_required');
  }

  if (!policy.runAsNonRoot) {
    rejections.push('container_run_as_non_root_required');
  }

  return rejections;
}

function validateResourcePolicy(
  policy: LocalDevWorkerDockerContainerResourcePolicy,
) {
  const rejections: string[] = [];

  if (policy.maxWallClockMs <= 0 || policy.maxWallClockMs > 3000) {
    rejections.push('container_wall_clock_limit_invalid');
  }

  if (policy.maxStdoutBytes <= 0 || policy.maxStdoutBytes > 4096) {
    rejections.push('container_stdout_limit_invalid');
  }

  if (policy.maxStderrBytes <= 0 || policy.maxStderrBytes > 4096) {
    rejections.push('container_stderr_limit_invalid');
  }

  if (policy.maxMemoryMb <= 0 || policy.maxMemoryMb > 256) {
    rejections.push('container_memory_limit_invalid');
  }

  if (policy.maxCpuCount <= 0 || policy.maxCpuCount > 1) {
    rejections.push('container_cpu_limit_invalid');
  }

  if (policy.pidsLimit <= 0 || policy.pidsLimit > 64) {
    rejections.push('container_pids_limit_invalid');
  }

  return rejections;
}

export function evaluateLocalDevWorkerDockerContainerReadinessGate(
  input: LocalDevWorkerDockerContainerReadinessGateInput,
): LocalDevWorkerDockerContainerReadinessGateResult {
  const imagePolicy =
    input.imagePolicy ?? LOCAL_DEV_WORKER_DEFAULT_DOCKER_IMAGE_POLICY;
  const resourcePolicy =
    input.resourcePolicy ??
    LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_RESOURCE_POLICY;
  const networkPolicy =
    input.networkPolicy ??
    LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_NETWORK_POLICY;
  const mountPolicy =
    input.mountPolicy ?? LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY;
  const securityPolicy =
    input.securityPolicy ??
    LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY;
  const imageDecision = evaluateLocalDevWorkerDockerImagePolicy({
    image: input.image,
    policy: imagePolicy,
  });
  const commandDecision = evaluateLocalDevWorkerDockerContainerCommandPolicy({
    command: input.command,
  });
  const rejectionCodes = [
    ...imageDecision.rejectionCodes.filter((code) => code !== 'image_allowed'),
    ...commandDecision.rejectionCodes.filter(
      (code) => code !== 'container_command_allowed',
    ),
    ...validateNetworkPolicy(networkPolicy),
    ...validateMountPolicy(mountPolicy),
    ...validateSecurityPolicy(securityPolicy),
    ...validateResourcePolicy(resourcePolicy),
  ];
  const warnings = [...imageDecision.warnings, ...commandDecision.warnings];

  if (!assertTrustedManualReviewSource(input.trustedManualReview)) {
    rejectionCodes.push('trusted_manual_review_missing');
  }

  if (
    !assertTrustedManualReviewSource(input.trustedManualReview) ||
    input.trustedManualReview.scope.length !== 1 ||
    input.trustedManualReview.scope[0] !==
      LOCAL_DEV_WORKER_DOCKER_CONTAINER_PLAN_CAPABILITY_ID
  ) {
    rejectionCodes.push('container_review_scope_not_exact');
  }

  if (input.source !== 'dremo-local-dev-sandbox') {
    rejectionCodes.push('invalid_source');
  }

  if (input.expectedEnvironment !== 'local-dev') {
    rejectionCodes.push('invalid_environment');
  }

  if (input.productionUiPath) {
    rejectionCodes.push('production_ui_path_denied');
  }

  if (input.srcImportPath) {
    rejectionCodes.push('src_import_path_denied');
  }

  if (input.dockerReadiness.readinessState !== 'daemon_available') {
    rejectionCodes.push('docker_daemon_not_ready');
  }

  if (!input.dockerReadiness.noContainerExecution) {
    rejectionCodes.push('docker_readiness_must_not_execute_containers');
  }

  if (input.dockerReadiness.safetyMetadata.containerStarted) {
    rejectionCodes.push('docker_readiness_started_container');
  }

  if (input.dockerReadiness.safetyMetadata.imagePulled) {
    rejectionCodes.push('docker_readiness_pulled_image');
  }

  if (input.dockerReadiness.safetyMetadata.imageBuilt) {
    rejectionCodes.push('docker_readiness_built_image');
  }

  const uniqueRejections = [...new Set(rejectionCodes)];
  const readyForFutureContainerExecution = uniqueRejections.length === 0;
  const plan = createLocalDevWorkerDockerContainerPlan({
    planId: input.planId,
    image: input.image,
    imagePolicyDecision: imageDecision.decision,
    command: input.command,
    rejectionCodes: uniqueRejections,
    warnings,
    networkPolicy: asStrictNetworkPolicy(networkPolicy),
    mountPolicy: asStrictMountPolicy(mountPolicy),
    resourcePolicy,
    securityPolicy: asStrictSecurityPolicy(securityPolicy),
  });

  return {
    readyForFutureContainerExecution,
    noExecution: true,
    containerStarted: false,
    imagePulled: false,
    dockerRunExecuted: false,
    rejectionCodes: uniqueRejections,
    warnings,
    plan: readyForFutureContainerExecution ? plan : undefined,
  };
}

