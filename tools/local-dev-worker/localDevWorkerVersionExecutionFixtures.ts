import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import {
  createTrustedLocalDevManualReviewForCapabilities,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerVersionExecutionFixture {
  name: string;
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
  expectedExecutionMode: 'blocked' | 'executed';
  expectedNoExecution: boolean;
  expectedExecutionAttempted: boolean;
  expectedCapabilityId?: string;
  expectedRejectionCodes: readonly string[];
  allowCommandUnavailable?: boolean;
}

function trustedReview(capabilityId: string) {
  return createTrustedLocalDevManualReviewForCapabilities([capabilityId]);
}

function request(
  name: string,
  command: string,
  args: readonly string[],
  capabilityId: string,
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: `execution-${name}`,
    command,
    args,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: `Version execution fixture for ${name}.`,
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
  capabilityId = 'capability.node.version',
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
  config: LocalDevWorkerExecutionConfig = LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG,
  trustedManualReview: TrustedLocalDevManualSecurityReview | 'missing' =
    trustedReview(capabilityId),
): LocalDevWorkerVersionExecutionFixture {
  return {
    name,
    request: request(name, command, args, capabilityId, overrides),
    config,
    trustedManualReview:
      trustedManualReview === 'missing' ? undefined : trustedManualReview,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedExecutionAttempted: false,
    expectedCapabilityId: undefined,
    expectedRejectionCodes,
  };
}

function executable(
  name: string,
  command: string,
  args: readonly string[],
  capabilityId: string,
  allowCommandUnavailable = false,
): LocalDevWorkerVersionExecutionFixture {
  return {
    name,
    request: request(name, command, args, capabilityId),
    config: LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG,
    trustedManualReview: trustedReview(capabilityId),
    expectedExecutionMode: 'executed',
    expectedNoExecution: false,
    expectedExecutionAttempted: true,
    expectedCapabilityId: capabilityId,
    expectedRejectionCodes: [],
    allowCommandUnavailable,
  };
}

export const localDevWorkerVersionExecutionFixtures = [
  blocked(
    'default-config-blocks-node-version',
    'node',
    ['--version'],
    ['execution_config_disabled'],
    'capability.node.version',
    {},
    LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  ),
  blocked(
    'missing-manual-review-blocks-node-version',
    'node',
    ['--version'],
    [
      'trusted_manual_review_missing',
      'manual_review_incomplete',
      'manual_review_missing_reviewer',
      'manual_review_missing_reviewed_at',
    ],
    'capability.node.version',
    {},
    LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG,
    'missing',
  ),
  blocked(
    'untrusted-request-review-blocks-node-version',
    'node',
    ['--version'],
    [
      'trusted_manual_review_missing',
      'manual_review_incomplete',
      'manual_review_missing_reviewer',
      'manual_review_missing_reviewed_at',
    ],
    'capability.node.version',
    {
      manualSecurityReview: {
        completed: true,
        reviewedBy: 'browser-payload',
        reviewedAt: '2026-05-13T00:00:00Z',
        scope: ['capability.node.version'],
      },
    },
    LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG,
    'missing',
  ),
  blocked(
    'docker-version-blocked',
    'docker',
    ['--version'],
    ['docker_capability_blocked', 'capability_blocked_by_config'],
    'capability.docker.version',
    {},
    LOCAL_DEV_WORKER_REVIEWED_VERSION_COMMAND_EXECUTION_CONFIG,
    trustedReview('capability.docker.version'),
  ),
  blocked('docker-run-blocked', 'docker', ['run', 'alpine'], [
    'worker_docker_runtime_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked('npm-install-blocked', 'npm', ['install'], [
    'worker_package_install_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked('git-clone-blocked', 'git', ['clone', 'https://example.com/repo'], [
    'worker_network_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked('curl-blocked', 'curl', ['https://example.com'], [
    'worker_network_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked('shell-chaining-blocked', 'node', ['--version', '&&', 'pwd'], [
    'worker_shell_chaining_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked('bash-blocked', 'bash', ['-c', 'echo hi'], [
    'worker_shell_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked('file-write-blocked', 'touch', ['tmp.txt'], [
    'worker_file_write_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked('secret-access-blocked', 'echo', ['service_role'], [
    'worker_secret_access_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  blocked(
    'production-ui-path-blocked',
    'node',
    ['--version'],
    ['production_ui_path_denied'],
    'capability.node.version',
    { productionUiPath: true },
  ),
  blocked(
    'src-import-path-blocked',
    'node',
    ['--version'],
    ['src_import_path_denied'],
    'capability.node.version',
    { srcImportPath: true },
  ),
  blocked(
    'invalid-source-blocked',
    'node',
    ['--version'],
    ['invalid_source', 'worker_invalid_source'],
    'capability.node.version',
    { source: 'browser' as 'dremo-local-dev-sandbox' },
  ),
  blocked(
    'invalid-environment-blocked',
    'node',
    ['--version'],
    ['invalid_environment', 'worker_invalid_environment'],
    'capability.node.version',
    { expectedEnvironment: 'production' as 'local-dev' },
  ),
  executable(
    'node-version-executes',
    'node',
    ['--version'],
    'capability.node.version',
  ),
  executable(
    'npm-version-attempts',
    'npm',
    ['--version'],
    'capability.npm.version',
    true,
  ),
  executable(
    'pnpm-version-attempts',
    'pnpm',
    ['--version'],
    'capability.pnpm.version',
    true,
  ),
  executable(
    'python-version-attempts',
    'python',
    ['--version'],
    'capability.python.version',
    true,
  ),
  executable(
    'git-version-attempts',
    'git',
    ['--version'],
    'capability.git.version',
    true,
  ),
  executable('pwd-identity-executes', 'pwd', [], 'capability.pwd.identity'),
  executable('echo-metadata-executes', 'echo', [], 'capability.echo.metadata'),
] as const satisfies readonly LocalDevWorkerVersionExecutionFixture[];
