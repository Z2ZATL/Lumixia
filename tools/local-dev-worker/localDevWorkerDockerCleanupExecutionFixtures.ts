import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import {
  type LocalDevWorkerDockerCleanupOutcome,
} from './localDevWorkerDockerCleanupAdapter.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND } from './localDevWorkerDockerCleanupPolicy.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME } from './localDevWorkerDockerContainerIdentity.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import {
  createTrustedLocalDevManualReviewForCapabilities,
  createTrustedLocalDevManualReviewForDockerSmokeCleanup,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerDockerCleanupExecutionFixture {
  name: string;
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
  expectedExecutionMode: 'blocked' | 'executed';
  expectedNoExecution: boolean;
  expectedExecutionAttempted: boolean;
  expectedCleanupExecutedWhenOk: boolean;
  expectedOutcomes: readonly LocalDevWorkerDockerCleanupOutcome[];
  expectedRejectionCodes: readonly string[];
  allowStructuredRuntimeUnavailable?: boolean;
}

const CLEANUP_CAPABILITY_ID = 'capability.docker.smoke.cleanup.exact';
const EXACT_CLEANUP_ARGS = LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND.slice(1);

function request(
  name: string,
  args: readonly string[] = EXACT_CLEANUP_ARGS,
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: `docker-cleanup-${name}`,
    command: 'docker',
    args,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: `Docker cleanup fixture for ${name}.`,
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: true,
    manualSecurityReview: createTrustedLocalDevManualReviewForDockerSmokeCleanup(),
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
  config: LocalDevWorkerExecutionConfig = LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
  trustedManualReview: TrustedLocalDevManualSecurityReview | 'missing' =
    createTrustedLocalDevManualReviewForDockerSmokeCleanup(),
): LocalDevWorkerDockerCleanupExecutionFixture {
  return {
    name,
    request: request(name, args, overrides),
    config,
    trustedManualReview:
      trustedManualReview === 'missing' ? undefined : trustedManualReview,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedExecutionAttempted: false,
    expectedCleanupExecutedWhenOk: false,
    expectedOutcomes: ['policy_blocked'],
    expectedRejectionCodes,
  };
}

function attempted(name: string): LocalDevWorkerDockerCleanupExecutionFixture {
  return {
    name,
    request: request(name),
    config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
    trustedManualReview: createTrustedLocalDevManualReviewForDockerSmokeCleanup(),
    expectedExecutionMode: 'executed',
    expectedNoExecution: false,
    expectedExecutionAttempted: true,
    expectedCleanupExecutedWhenOk: true,
    expectedOutcomes: [
      'cleanup_success',
      'cleanup_target_not_found',
      'docker_cli_unavailable',
      'docker_daemon_unavailable',
      'timeout',
      'cleanup_failed',
    ],
    expectedRejectionCodes: [],
    allowStructuredRuntimeUnavailable: true,
  };
}

export const localDevWorkerDockerCleanupExecutionFixtures = [
  attempted('reviewed-exact-cleanup-attempts'),
  blocked(
    'default-config-blocks-cleanup',
    EXACT_CLEANUP_ARGS,
    [
      'execution_config_disabled',
      'cleanup_execution_mode_required',
      'docker_cli_disabled',
      'docker_runtime_execution_required',
      'capability_blocked_by_config',
    ],
    {},
    LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  ),
  blocked(
    'missing-review-blocks-cleanup',
    EXACT_CLEANUP_ARGS,
    ['trusted_manual_review_missing', 'cleanup_review_scope_not_exact'],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
    'missing',
  ),
  blocked(
    'wrong-review-scope-blocks-cleanup',
    EXACT_CLEANUP_ARGS,
    ['cleanup_review_scope_not_exact'],
    {},
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
    createTrustedLocalDevManualReviewForCapabilities(['capability.docker.version']),
  ),
  blocked(
    'browser-review-payload-blocks-cleanup',
    EXACT_CLEANUP_ARGS,
    ['trusted_manual_review_missing', 'cleanup_review_scope_not_exact'],
    {
      manualSecurityReview: {
        completed: true,
        reviewedBy: 'browser-payload',
        reviewedAt: '2026-05-15T00:00:00Z',
        scope: [CLEANUP_CAPABILITY_ID],
      },
    },
    LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
    'missing',
  ),
  blocked('production-ui-path-blocks-cleanup', EXACT_CLEANUP_ARGS, [
    'production_ui_path_denied',
  ], { productionUiPath: true }),
  blocked('src-import-path-blocks-cleanup', EXACT_CLEANUP_ARGS, [
    'src_import_path_denied',
  ], { srcImportPath: true }),
  blocked('invalid-source-blocks-cleanup', EXACT_CLEANUP_ARGS, [
    'invalid_source',
  ], { source: 'browser' as 'dremo-local-dev-sandbox' }),
  blocked('invalid-environment-blocks-cleanup', EXACT_CLEANUP_ARGS, [
    'invalid_environment',
  ], { expectedEnvironment: 'production' as 'local-dev' }),
  blocked('arbitrary-container-name-blocked', ['rm', '-f', 'other'], [
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('container-id-like-target-blocked', ['rm', '-f', 'abcdef123456'], [
    'cleanup_target_not_exact',
    'cleanup_container_id_denied',
    'capability_not_found',
  ]),
  blocked('wildcard-target-blocked', ['rm', '-f', '*'], [
    'cleanup_target_not_exact',
    'cleanup_wildcard_denied',
    'capability_not_found',
  ]),
  blocked('multiple-targets-blocked', [
    'rm',
    '-f',
    LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
    'other',
  ], [
    'cleanup_multiple_targets_denied',
    'capability_not_found',
  ]),
  blocked('quoted-wildcard-target-blocked', ['rm', '-f', '"*"'], [
    'cleanup_target_not_exact',
    'cleanup_wildcard_denied',
    'capability_not_found',
  ]),
  blocked('command-substitution-blocked', ['rm', '-f', '$(docker ps)'], [
    'cleanup_target_not_exact',
    'cleanup_shell_metacharacter_denied',
    'capability_not_found',
  ]),
  blocked('container-prune-blocked', ['container', 'prune'], [
    'cleanup_command_not_allowed',
    'cleanup_prune_denied',
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('system-prune-blocked', ['system', 'prune'], [
    'cleanup_command_not_allowed',
    'cleanup_prune_denied',
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('docker-ps-blocked', ['ps'], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('docker-container-ls-blocked', ['container', 'ls'], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('docker-inspect-blocked', ['inspect', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('docker-stop-blocked', ['stop', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('docker-kill-blocked', ['kill', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('target-with-slash-blocked', ['rm', '-f', 'bad/name'], [
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
  blocked('target-with-whitespace-blocked', ['rm', '-f', 'bad name'], [
    'cleanup_target_not_exact',
    'capability_not_found',
  ]),
] as const satisfies readonly LocalDevWorkerDockerCleanupExecutionFixture[];
