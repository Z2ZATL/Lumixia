import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID,
} from './localDevWorkerDockerContainerSmokePolicy.ts';
import type { LocalDevWorkerDockerReadinessResult } from './localDevWorkerDockerReadiness.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import {
  createTrustedLocalDevManualReviewForCapabilities,
  createTrustedLocalDevManualReviewForContainerSmoke,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerDockerContainerSmokeFixture {
  name: string;
  request: LocalDevWorkerExecutionReadinessRequest;
  dockerReadiness: LocalDevWorkerDockerReadinessResult;
  config: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
  expectedExecutionMode: 'blocked' | 'executed';
  expectedNoExecution: boolean;
  expectedExecutionAttempted: boolean;
  expectedContainerStartedWhenOk: boolean;
  expectedRejectionCodes: readonly string[];
  allowStructuredRuntimeUnavailable?: boolean;
}

function readiness(
  state: 'daemon_available' | 'daemon_unavailable' | 'cli_unavailable' =
    'daemon_available',
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

function request(
  name: string,
  args: readonly string[] = LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: `container-smoke-${name}`,
    command: 'docker',
    args,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: `Container smoke fixture for ${name}.`,
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: true,
    manualSecurityReview: createTrustedLocalDevManualReviewForContainerSmoke(),
    productionUiPath: false,
    srcImportPath: false,
    ...overrides,
  };
}

function blocked(
  name: string,
  args: readonly string[],
  expectedRejectionCodes: readonly string[],
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
  config: LocalDevWorkerExecutionConfig = LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
  trustedManualReview: TrustedLocalDevManualSecurityReview | 'missing' =
    createTrustedLocalDevManualReviewForContainerSmoke(),
  dockerReadiness: LocalDevWorkerDockerReadinessResult = readiness(),
): LocalDevWorkerDockerContainerSmokeFixture {
  return {
    name,
    request: request(name, args, overrides),
    dockerReadiness,
    config,
    trustedManualReview:
      trustedManualReview === 'missing' ? undefined : trustedManualReview,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedExecutionAttempted: false,
    expectedContainerStartedWhenOk: false,
    expectedRejectionCodes,
  };
}

function attempted(name: string): LocalDevWorkerDockerContainerSmokeFixture {
  return {
    name,
    request: request(name),
    dockerReadiness: readiness(),
    config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
    trustedManualReview: createTrustedLocalDevManualReviewForContainerSmoke(),
    expectedExecutionMode: 'executed',
    expectedNoExecution: false,
    expectedExecutionAttempted: true,
    expectedContainerStartedWhenOk: true,
    expectedRejectionCodes: [],
    allowStructuredRuntimeUnavailable: true,
  };
}

function replaceArg(index: number, value: string): string[] {
  const args: string[] = [...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS];
  args[index] = value;

  return args;
}

function withoutArg(value: string): string[] {
  return LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS.filter(
    (arg) => arg !== value,
  );
}

function withoutUser(): string[] {
  return LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS.filter(
    (arg) => arg !== '--user' && arg !== '65534:65534',
  );
}

export const localDevWorkerDockerContainerSmokeFixtures = [
  attempted('reviewed-smoke-attempts'),
  blocked(
    'default-config-blocks-smoke',
    LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    [
      'execution_config_disabled',
      'container_smoke_execution_mode_required',
      'docker_runtime_execution_required',
      'capability_blocked_by_config',
    ],
    {},
    LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  ),
  blocked(
    'missing-review-blocks-smoke',
    LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    [
      'trusted_manual_review_missing',
      'container_smoke_review_scope_not_exact',
    ],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
    'missing',
  ),
  blocked(
    'wrong-review-scope-blocks-smoke',
    LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    ['container_smoke_review_scope_not_exact'],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
    createTrustedLocalDevManualReviewForCapabilities(['capability.docker.version']),
  ),
  blocked(
    'production-ui-path-blocks-smoke',
    LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    ['production_ui_path_denied'],
    { productionUiPath: true },
  ),
  blocked(
    'src-import-path-blocks-smoke',
    LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    ['src_import_path_denied'],
    { srcImportPath: true },
  ),
  blocked('missing-user-blocked', withoutUser(), [
    'container_smoke_args_not_exact',
    'container_smoke_non_root_user_required',
  ]),
  blocked('root-user-zero-blocked', replaceArg(17, '0'), [
    'container_smoke_args_not_exact',
    'container_smoke_non_root_user_required',
    'container_smoke_root_user_denied',
  ]),
  blocked('root-user-zero-zero-blocked', replaceArg(17, '0:0'), [
    'container_smoke_args_not_exact',
    'container_smoke_non_root_user_required',
    'container_smoke_root_user_denied',
  ]),
  blocked('root-user-name-blocked', replaceArg(17, 'root'), [
    'container_smoke_args_not_exact',
    'container_smoke_non_root_user_required',
    'container_smoke_root_user_denied',
  ]),
  blocked('wrong-image-blocked', replaceArg(18, 'ubuntu:22.04'), [
    'container_smoke_args_not_exact',
    'container_smoke_image_not_allowed',
  ]),
  blocked('latest-image-blocked', replaceArg(18, 'alpine:latest'), [
    'container_smoke_args_not_exact',
    'container_smoke_image_not_allowed',
  ]),
  blocked('missing-pull-never-blocked', withoutArg('--pull=never'), [
    'container_smoke_args_not_exact',
    'container_smoke_pull_never_required',
  ]),
  blocked('pull-always-blocked', replaceArg(4, '--pull=always'), [
    'container_smoke_args_not_exact',
    'container_smoke_pull_never_required',
  ]),
  blocked('network-bridge-blocked', replaceArg(3, 'bridge'), [
    'container_smoke_args_not_exact',
    'container_smoke_network_none_required',
  ]),
  blocked('network-host-blocked', replaceArg(3, 'host'), [
    'container_smoke_args_not_exact',
    'container_smoke_network_none_required',
  ]),
  blocked('mount-flag-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    '--mount',
    'type=bind,src=/tmp,dst=/tmp',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_mount_denied',
  ]),
  blocked('env-flag-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    '--env',
    'TOKEN=secret',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_env_denied',
  ]),
  blocked('privileged-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    '--privileged',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_privileged_denied',
  ]),
  blocked('cap-add-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    '--cap-add',
    'NET_ADMIN',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_privileged_denied',
  ]),
  blocked('shell-command-blocked', replaceArg(19, 'sh'), [
    'container_smoke_args_not_exact',
    'container_smoke_shell_denied',
  ]),
  blocked('sh-c-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS.slice(0, 19),
    'sh',
    '-c',
    'echo hello',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_shell_denied',
  ]),
  blocked('docker-socket-reference-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    '/var/run/docker.sock',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_docker_socket_denied',
  ]),
  blocked('home-reference-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    '~/workspace',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_home_mount_denied',
  ]),
  blocked('workspace-reference-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    '/workspace/project',
  ], [
    'container_smoke_args_not_exact',
    'container_smoke_workspace_mount_denied',
  ]),
  blocked('extra-arg-blocked', [
    ...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    'extra',
  ], ['container_smoke_args_not_exact']),
  blocked('docker-build-blocked', ['build', '.'], [
    'container_smoke_command_not_allowed',
    'container_smoke_args_not_exact',
    'container_smoke_image_not_allowed',
  ]),
  blocked('docker-compose-blocked', ['compose', 'up'], [
    'container_smoke_command_not_allowed',
    'container_smoke_args_not_exact',
    'container_smoke_image_not_allowed',
  ]),
  blocked('docker-pull-blocked', ['pull', 'alpine:3.20'], [
    'container_smoke_command_not_allowed',
    'container_smoke_args_not_exact',
    'container_smoke_image_not_allowed',
  ]),
  blocked('docker-exec-blocked', ['exec', 'container', 'echo', 'hello'], [
    'container_smoke_command_not_allowed',
    'container_smoke_args_not_exact',
    'container_smoke_image_not_allowed',
  ]),
  blocked(
    'daemon-unavailable-blocks-with-structured-result',
    LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    ['docker_daemon_not_ready'],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
    createTrustedLocalDevManualReviewForContainerSmoke(),
    readiness('daemon_unavailable'),
  ),
] as const satisfies readonly LocalDevWorkerDockerContainerSmokeFixture[];
