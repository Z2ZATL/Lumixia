import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_VERSION_PROBE_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import type { LocalDevWorkerDockerReadinessState } from './localDevWorkerDockerReadiness.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import {
  createTrustedLocalDevManualReviewForCapabilities,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerDockerReadinessFixture {
  name: string;
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
  expectedReadinessStates: readonly LocalDevWorkerDockerReadinessState[];
  expectedNoContainerExecution: true;
  expectedCommandAttempted: boolean;
  expectedRejectionCodes: readonly string[];
}

const DOCKER_READINESS_CAPABILITY_ID = 'capability.docker.daemon.readiness';

function trustedReview(capabilityId: string) {
  return createTrustedLocalDevManualReviewForCapabilities([capabilityId]);
}

function request(
  name: string,
  command: string,
  args: readonly string[],
  capabilityId = DOCKER_READINESS_CAPABILITY_ID,
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: `docker-readiness-${name}`,
    command,
    args,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: `Docker readiness fixture for ${name}.`,
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: true,
    manualSecurityReview: trustedReview(capabilityId),
    productionUiPath: false,
    srcImportPath: false,
    ...overrides,
  };
}

function blocked(
  name: string,
  command: string,
  args: readonly string[],
  expectedRejectionCodes: readonly string[],
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
  config: LocalDevWorkerExecutionConfig = LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
  trustedManualReview: TrustedLocalDevManualSecurityReview | 'missing' =
    trustedReview(DOCKER_READINESS_CAPABILITY_ID),
  capabilityId = DOCKER_READINESS_CAPABILITY_ID,
): LocalDevWorkerDockerReadinessFixture {
  return {
    name,
    request: request(name, command, args, capabilityId, overrides),
    config,
    trustedManualReview:
      trustedManualReview === 'missing' ? undefined : trustedManualReview,
    expectedReadinessStates: ['probe_blocked'],
    expectedNoContainerExecution: true,
    expectedCommandAttempted: false,
    expectedRejectionCodes,
  };
}

function attempted(name: string): LocalDevWorkerDockerReadinessFixture {
  return {
    name,
    request: request(name, 'docker', [
      'version',
      '--format',
      '{{json .}}',
    ]),
    config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
    trustedManualReview: trustedReview(DOCKER_READINESS_CAPABILITY_ID),
    expectedReadinessStates: [
      'cli_unavailable',
      'daemon_unavailable',
      'daemon_available',
      'probe_failed',
    ],
    expectedNoContainerExecution: true,
    expectedCommandAttempted: true,
    expectedRejectionCodes: [],
  };
}

export const localDevWorkerDockerReadinessFixtures = [
  blocked(
    'default-config-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    [
      'execution_config_disabled',
      'docker_readiness_execution_mode_required',
      'docker_cli_disabled',
      'capability_blocked_by_config',
    ],
    {},
    LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  ),
  blocked(
    'version-probe-config-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    [
      'docker_readiness_execution_mode_required',
      'capability_not_enabled_for_execution',
    ],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_VERSION_PROBE_CONFIG,
  ),
  blocked(
    'missing-trusted-review-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    [
      'trusted_manual_review_missing',
      'manual_review_incomplete',
      'manual_review_missing_reviewer',
      'manual_review_missing_reviewed_at',
      'docker_readiness_review_scope_not_exact',
    ],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
    'missing',
  ),
  blocked(
    'untrusted-request-review-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    [
      'trusted_manual_review_missing',
      'manual_review_incomplete',
      'manual_review_missing_reviewer',
      'manual_review_missing_reviewed_at',
      'docker_readiness_review_scope_not_exact',
    ],
    {
      manualSecurityReview: {
        completed: true,
        reviewedBy: 'browser-payload',
        reviewedAt: '2026-05-13T00:00:00Z',
        scope: [DOCKER_READINESS_CAPABILITY_ID],
      },
    },
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
    'missing',
  ),
  blocked(
    'wrong-review-scope-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    [
      'manual_review_scope_missing_capability',
      'docker_readiness_review_scope_not_exact',
    ],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
    trustedReview('capability.docker.version'),
  ),
  blocked(
    'production-ui-path-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    ['production_ui_path_denied'],
    { productionUiPath: true },
  ),
  blocked(
    'src-import-path-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    ['src_import_path_denied'],
    { srcImportPath: true },
  ),
  blocked(
    'invalid-source-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    ['invalid_source', 'worker_invalid_source'],
    { source: 'browser' as 'dremo-local-dev-sandbox' },
  ),
  blocked(
    'invalid-environment-blocks-readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    ['invalid_environment', 'worker_invalid_environment'],
    { expectedEnvironment: 'production' as 'local-dev' },
  ),
  blocked('docker-version-without-format-blocked', 'docker', ['version'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_daemon_state_command_not_allowed',
  ]),
  blocked('docker-version-extra-arg-blocked', 'docker', [
    'version',
    '--format',
    '{{json .}}',
    'extra',
  ], [
    'docker_readiness_args_not_exact',
  ]),
  blocked('docker-info-blocked', 'docker', ['info'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_daemon_state_command_not_allowed',
  ]),
  blocked('docker-inspect-blocked', 'docker', ['inspect', 'container'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_daemon_state_command_not_allowed',
  ]),
  blocked('docker-system-blocked', 'docker', ['system', 'df'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_daemon_state_command_not_allowed',
  ]),
  blocked('docker-network-blocked', 'docker', ['network', 'ls'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_daemon_state_command_not_allowed',
  ]),
  blocked('docker-volume-blocked', 'docker', ['volume', 'ls'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_daemon_state_command_not_allowed',
  ]),
  blocked('docker-context-blocked', 'docker', ['context', 'ls'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_daemon_state_command_not_allowed',
  ]),
  blocked('docker-run-blocked', 'docker', ['run', 'alpine'], [
    'worker_docker_runtime_denied',
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_runtime_command_denied',
  ]),
  blocked('docker-build-blocked', 'docker', ['build', '.'], [
    'worker_docker_runtime_denied',
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_runtime_command_denied',
  ]),
  blocked('docker-compose-blocked', 'docker', ['compose', 'up'], [
    'worker_docker_runtime_denied',
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_runtime_command_denied',
  ]),
  blocked('docker-compose-binary-blocked', 'docker-compose', ['up'], [
    'worker_docker_runtime_denied',
    'docker_readiness_command_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_runtime_command_denied',
  ]),
  blocked('docker-pull-blocked', 'docker', ['pull', 'alpine'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_runtime_command_denied',
  ]),
  blocked('docker-image-blocked', 'docker', ['image', 'ls'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_runtime_command_denied',
  ]),
  blocked('docker-container-blocked', 'docker', ['container', 'ls'], [
    'docker_readiness_capability_not_allowed',
    'docker_readiness_args_not_exact',
    'docker_runtime_command_denied',
  ]),
  blocked('docker-readiness-shell-chain-blocked', 'docker', [
    'version',
    '--format',
    '{{json .}}',
    '&&',
    'pwd',
  ], [
    'worker_shell_chaining_denied',
    'docker_readiness_args_not_exact',
    'docker_shell_metacharacter_denied',
  ]),
  blocked('docker-socket-reference-blocked', 'docker', [
    'version',
    '--format',
    '{{json .}}',
    '/var/run/docker.sock',
  ], [
    'worker_docker_socket_denied',
    'docker_readiness_args_not_exact',
    'docker_socket_denied',
  ]),
  blocked('docker-home-reference-blocked', 'docker', [
    'version',
    '--format',
    '{{json .}}',
    '~/workspace',
  ], [
    'worker_home_mount_denied',
    'docker_readiness_args_not_exact',
    'docker_mount_denied',
  ]),
  blocked('docker-mount-flag-blocked', 'docker', [
    'version',
    '--format',
    '{{json .}}',
    '--mount',
  ], [
    'docker_readiness_args_not_exact',
    'docker_mount_denied',
  ]),
  attempted('docker-readiness-probe-attempts'),
] as const satisfies readonly LocalDevWorkerDockerReadinessFixture[];
