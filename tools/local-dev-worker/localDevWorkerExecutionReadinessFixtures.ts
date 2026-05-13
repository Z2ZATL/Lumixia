import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import type { LocalDevWorkerManualSecurityReview } from './localDevWorkerExecutionReviewGate.ts';

export interface LocalDevWorkerExecutionReadinessFixture {
  name: string;
  request: LocalDevWorkerExecutionReadinessRequest;
  expectedReadyForFutureExecution: boolean;
  expectedNoExecution: true;
  expectedMatchedCapabilityId?: string;
  expectedRejectionCodes: readonly string[];
}

const missingReview: LocalDevWorkerManualSecurityReview = {
  completed: false,
  reviewedBy: '',
  reviewedAt: '',
  scope: [],
};

function completedReview(
  scope: readonly string[],
): LocalDevWorkerManualSecurityReview {
  return {
    completed: true,
    reviewedBy: 'security-reviewer',
    reviewedAt: '2026-05-13T00:00:00Z',
    scope,
  };
}

function request(
  name: string,
  command: string,
  args: readonly string[],
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: `readiness-${name}`,
    command,
    args,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: `Execution readiness fixture for ${name}.`,
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: false,
    manualSecurityReview: missingReview,
    productionUiPath: false,
    srcImportPath: false,
    ...overrides,
  };
}

function fixture(
  name: string,
  command: string,
  args: readonly string[],
  expectedRejectionCodes: readonly string[],
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
  expectedMatchedCapabilityId?: string,
  expectedReadyForFutureExecution = false,
): LocalDevWorkerExecutionReadinessFixture {
  return {
    name,
    request: request(name, command, args, overrides),
    expectedReadyForFutureExecution,
    expectedNoExecution: true,
    expectedMatchedCapabilityId,
    expectedRejectionCodes,
  };
}

export const localDevWorkerExecutionReadinessFixtures = [
  fixture(
    'eligible-disabled-by-default',
    'node',
    ['--version'],
    [
      'allow_real_execution_false',
      'manual_review_incomplete',
      'manual_review_missing_reviewer',
      'manual_review_missing_reviewed_at',
      'manual_review_scope_missing_capability',
    ],
    {},
    'capability.node.version',
  ),
  fixture(
    'eligible-missing-manual-review',
    'npm',
    ['--version'],
    [
      'manual_review_incomplete',
      'manual_review_missing_reviewer',
      'manual_review_missing_reviewed_at',
      'manual_review_scope_missing_capability',
    ],
    { allowRealExecution: true },
    'capability.npm.version',
  ),
  fixture(
    'eligible-with-fake-manual-review',
    'git',
    ['--version'],
    [],
    {
      allowRealExecution: true,
      manualSecurityReview: completedReview(['capability.git.version']),
    },
    'capability.git.version',
    true,
  ),
  fixture('ineligible-package-install', 'npm', ['install'], [
    'worker_package_install_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  fixture('ineligible-docker-run', 'docker', ['run', 'alpine'], [
    'worker_docker_runtime_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  fixture('ineligible-shell-command', 'bash', ['-c', 'echo hi'], [
    'worker_shell_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  fixture('ineligible-secret-access', 'echo', ['service_role'], [
    'worker_secret_access_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  fixture('ineligible-network-command', 'curl', ['https://example.com'], [
    'worker_network_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  fixture('ineligible-file-write', 'touch', ['tmp.txt'], [
    'worker_file_write_denied',
    'worker_command_not_allowlisted',
    'capability_not_found',
  ]),
  fixture(
    'invalid-environment',
    'node',
    ['--version'],
    ['invalid_environment', 'worker_invalid_environment'],
    {
      allowRealExecution: true,
      expectedEnvironment: 'production' as 'local-dev',
      manualSecurityReview: completedReview(['capability.node.version']),
    },
    'capability.node.version',
  ),
  fixture(
    'invalid-source',
    'node',
    ['--version'],
    ['invalid_source', 'worker_invalid_source'],
    {
      allowRealExecution: true,
      source: 'browser' as 'dremo-local-dev-sandbox',
      manualSecurityReview: completedReview(['capability.node.version']),
    },
    'capability.node.version',
  ),
  fixture(
    'production-path-attempt',
    'node',
    ['--version'],
    ['production_ui_path_denied'],
    {
      allowRealExecution: true,
      manualSecurityReview: completedReview(['capability.node.version']),
      productionUiPath: true,
    },
    'capability.node.version',
  ),
] as const satisfies readonly LocalDevWorkerExecutionReadinessFixture[];
