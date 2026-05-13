import {
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY,
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_NETWORK_POLICY,
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_RESOURCE_POLICY,
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY,
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_PLAN_CAPABILITY_ID,
} from './localDevWorkerDockerContainerPolicy.ts';
import type { LocalDevWorkerDockerContainerReadinessGateInput } from './localDevWorkerDockerContainerReadinessGate.ts';
import type { LocalDevWorkerDockerReadinessResult } from './localDevWorkerDockerReadiness.ts';
import {
  createTrustedLocalDevManualReviewForCapabilities,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerDockerContainerPolicyFixture {
  name: string;
  input: LocalDevWorkerDockerContainerReadinessGateInput;
  expectedReadyForFutureContainerExecution: boolean;
  expectedPlan: boolean;
  expectedRejectionCodes: readonly string[];
}

function trustedReview(capabilityId = LOCAL_DEV_WORKER_DOCKER_CONTAINER_PLAN_CAPABILITY_ID) {
  return createTrustedLocalDevManualReviewForCapabilities([capabilityId]);
}

function readiness(
  state: DockerReadinessState = 'daemon_available',
): LocalDevWorkerDockerReadinessResult {
  return {
    ok: state === 'daemon_available',
    noContainerExecution: true,
    readinessState: state,
    dockerCliVersion: '25.0.0',
    dockerServerVersion: state === 'daemon_available' ? '25.0.0' : undefined,
    daemonReachable: state === 'daemon_available',
    commandAttempted: 'docker version --format {{json .}}',
    rejectionCodes: state === 'daemon_available' ? [] : ['docker_daemon_unavailable'],
    stdout: '',
    stderr: '',
    exitCode: state === 'daemon_available' ? 0 : 1,
    timedOut: false,
    durationMs: 1,
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      localDevOnly: true,
      dockerCliAllowed: true,
      dockerDaemonStateQueried: true,
      dockerRuntimeAllowed: false,
      containerStarted: false,
      imagePulled: false,
      imageBuilt: false,
      dockerSocketMounted: false,
      homeMounted: false,
      networkAllowed: false,
      fileWritesAllowed: false,
      shellAllowed: false,
      hostEnvironmentInherited: false,
    },
  };
}

type DockerReadinessState =
  | 'cli_unavailable'
  | 'daemon_unavailable'
  | 'daemon_available'
  | 'probe_failed';

function fixture(
  name: string,
  overrides: Partial<LocalDevWorkerDockerContainerReadinessGateInput>,
  expectedRejectionCodes: readonly string[],
  expectedReadyForFutureContainerExecution = false,
  expectedPlan = false,
  trustedManualReview: TrustedLocalDevManualSecurityReview | 'missing' =
    trustedReview(),
): LocalDevWorkerDockerContainerPolicyFixture {
  return {
    name,
    input: {
      planId: `container-plan-${name}`,
      image: 'alpine:3.20',
      command: ['echo', 'hello'],
      dockerReadiness: readiness(),
      trustedManualReview:
        trustedManualReview === 'missing' ? undefined : trustedManualReview,
      source: 'dremo-local-dev-sandbox',
      expectedEnvironment: 'local-dev',
      productionUiPath: false,
      srcImportPath: false,
      resourcePolicy: LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_RESOURCE_POLICY,
      networkPolicy: LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_NETWORK_POLICY,
      mountPolicy: LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY,
      securityPolicy: LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY,
      ...overrides,
    },
    expectedReadyForFutureContainerExecution,
    expectedPlan,
    expectedRejectionCodes,
  };
}

export const localDevWorkerDockerContainerPolicyFixtures = [
  fixture(
    'alpine-echo-plan-only-allowed',
    {},
    [],
    true,
    true,
  ),
  fixture(
    'node-version-plan-only-allowed',
    {
      image: 'node:20-alpine',
      command: ['node', '--version'],
    },
    [],
    true,
    true,
  ),
  fixture('image-latest-tag-blocked', { image: 'node:latest' }, [
    'image_latest_tag_denied',
    'image_not_allowlisted',
  ]),
  fixture('image-without-tag-blocked', { image: 'alpine' }, [
    'image_untagged_denied',
    'image_not_allowlisted',
  ]),
  fixture('arbitrary-image-blocked', { image: 'ubuntu:22.04' }, [
    'image_not_allowlisted',
  ]),
  fixture('private-registry-image-blocked', { image: 'registry.example.com/node:20-alpine' }, [
    'image_private_registry_denied',
    'image_not_allowlisted',
  ]),
  fixture('image-shell-metacharacter-blocked', { image: 'alpine:3.20;whoami' }, [
    'image_shell_metacharacter_denied',
    'image_not_allowlisted',
  ]),
  fixture('shell-command-blocked', { command: ['sh', '-c', 'echo hello'] }, [
    'container_shell_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('bash-command-blocked', { command: ['bash'] }, [
    'container_shell_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('npm-install-blocked', { command: ['npm', 'install'] }, [
    'container_package_install_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('curl-blocked', { command: ['curl', 'https://example.com'] }, [
    'container_network_command_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('wget-blocked', { command: ['wget', 'https://example.com'] }, [
    'container_network_command_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('git-clone-blocked', { command: ['git', 'clone', 'https://example.com/repo'] }, [
    'container_network_command_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('touch-blocked', { command: ['touch', 'file.txt'] }, [
    'container_file_write_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('rm-rf-blocked', { command: ['rm', '-rf', '/'] }, [
    'container_file_write_denied',
    'container_command_not_allowlisted',
  ]),
  fixture('docker-run-inside-container-blocked', { command: ['docker', 'run', 'alpine'] }, [
    'container_docker_command_denied',
    'container_command_not_allowlisted',
  ]),
  fixture(
    'network-enabled-blocked',
    { networkPolicy: { networkMode: 'bridge', allowNetwork: true, allowDns: true } },
    [
      'container_network_mode_denied',
      'container_network_denied',
      'container_dns_denied',
    ],
  ),
  fixture(
    'workspace-mount-blocked',
    { mountPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY, allowWorkspaceMount: true } },
    ['container_workspace_mount_denied'],
  ),
  fixture(
    'docker-socket-mount-blocked',
    { mountPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY, allowDockerSocketMount: true } },
    ['container_docker_socket_mount_denied'],
  ),
  fixture(
    'home-mount-blocked',
    { mountPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY, allowHomeMount: true } },
    ['container_home_mount_denied'],
  ),
  fixture(
    'privileged-blocked',
    { securityPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY, allowPrivileged: true } },
    ['container_privileged_denied'],
  ),
  fixture(
    'host-network-blocked',
    { securityPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY, allowHostNetwork: true } },
    ['container_host_network_denied'],
  ),
  fixture(
    'host-pid-blocked',
    { securityPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY, allowHostPid: true } },
    ['container_host_pid_denied'],
  ),
  fixture(
    'capabilities-add-blocked',
    { securityPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY, allowCapabilitiesAdd: true } },
    ['container_capabilities_add_denied'],
  ),
  fixture(
    'no-new-privileges-false-blocked',
    { securityPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY, noNewPrivileges: false } },
    ['container_no_new_privileges_required'],
  ),
  fixture(
    'run-as-root-blocked',
    { securityPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_SECURITY_POLICY, runAsNonRoot: false } },
    ['container_run_as_non_root_required'],
  ),
  fixture(
    'read-write-rootfs-blocked',
    { mountPolicy: { ...LOCAL_DEV_WORKER_DEFAULT_DOCKER_CONTAINER_MOUNT_POLICY, readOnlyRootFilesystem: false } },
    ['container_read_only_rootfs_required'],
  ),
  fixture(
    'production-ui-path-blocked',
    { productionUiPath: true },
    ['production_ui_path_denied'],
  ),
  fixture(
    'src-import-path-blocked',
    { srcImportPath: true },
    ['src_import_path_denied'],
  ),
  fixture(
    'missing-manual-review-blocked',
    {},
    ['trusted_manual_review_missing', 'container_review_scope_not_exact'],
    false,
    false,
    'missing',
  ),
  fixture(
    'wrong-review-scope-blocked',
    {},
    ['container_review_scope_not_exact'],
    false,
    false,
    trustedReview('capability.docker.version'),
  ),
  fixture(
    'docker-daemon-unavailable-blocked',
    { dockerReadiness: readiness('daemon_unavailable') },
    ['docker_daemon_not_ready'],
  ),
] as const satisfies readonly LocalDevWorkerDockerContainerPolicyFixture[];
