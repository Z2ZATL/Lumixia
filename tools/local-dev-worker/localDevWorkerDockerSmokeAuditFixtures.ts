import {
  type LocalDevWorkerDockerSmokeAuditInput,
  type LocalDevWorkerDockerSmokeCleanupRisk,
} from './localDevWorkerDockerSmokeAudit.ts';
import type { LocalDevWorkerDockerSmokeOutcome } from './localDevWorkerDockerSmokeResultNormalizer.ts';
import { LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS } from './localDevWorkerDockerContainerSmokePolicy.ts';

export interface LocalDevWorkerDockerSmokeAuditFixture {
  name: string;
  input: LocalDevWorkerDockerSmokeAuditInput;
  options?: {
    maxStdoutBytes?: number;
    maxStderrBytes?: number;
  };
  expectedOutcome: LocalDevWorkerDockerSmokeOutcome;
  expectedCleanupRisk: LocalDevWorkerDockerSmokeCleanupRisk;
  expectedStdoutIncludes?: readonly string[];
  expectedStderrIncludes?: readonly string[];
  forbiddenStdoutPatterns?: readonly RegExp[];
  forbiddenStderrPatterns?: readonly RegExp[];
}

const safeMetadata = {
  dockerSocketMounted: false,
  homeMounted: false,
  workspaceMounted: false,
  shellAllowed: false,
  hostEnvironmentInherited: false,
} as const;

function auditInput(
  overrides: Partial<LocalDevWorkerDockerSmokeAuditInput> = {},
): LocalDevWorkerDockerSmokeAuditInput {
  return {
    ok: false,
    executionMode: 'executed',
    executionAttempted: true,
    containerStarted: false,
    capabilityId: 'capability.docker.container.smoke.echo',
    command: 'docker',
    args: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    stdout: '',
    stderr: '',
    exitCode: 1,
    timedOut: false,
    durationMs: 25,
    rejectionCodes: [],
    imagePulled: false,
    imageBuilt: false,
    networkAllowed: false,
    mountsAllowed: false,
    safetyMetadata: safeMetadata,
    ...overrides,
  };
}

export const localDevWorkerDockerSmokeAuditFixtures: readonly LocalDevWorkerDockerSmokeAuditFixture[] = [
  {
    name: 'successful-smoke-result',
    input: auditInput({
      ok: true,
      containerStarted: true,
      stdout: 'hello\n',
      exitCode: 0,
    }),
    expectedOutcome: 'success',
    expectedCleanupRisk: 'none_expected',
    expectedStdoutIncludes: ['hello'],
  },
  {
    name: 'cli-unavailable-result',
    input: auditInput({
      exitCode: null,
      stderr: 'spawn docker ENOENT',
      rejectionCodes: ['optional_docker_cli_unavailable'],
    }),
    expectedOutcome: 'docker_cli_unavailable',
    expectedCleanupRisk: 'not_applicable_cli_or_daemon_unavailable',
  },
  {
    name: 'daemon-unavailable-result',
    input: auditInput({
      executionMode: 'blocked',
      executionAttempted: false,
      exitCode: null,
      stderr: 'Cannot connect to the Docker daemon',
      rejectionCodes: ['docker_daemon_not_ready'],
    }),
    expectedOutcome: 'docker_daemon_unavailable',
    expectedCleanupRisk: 'not_applicable_cli_or_daemon_unavailable',
  },
  {
    name: 'image-unavailable-result',
    input: auditInput({
      exitCode: 125,
      stderr: 'Unable to find image alpine:3.20 locally and pull policy is never',
      rejectionCodes: ['container_smoke_image_unavailable'],
    }),
    expectedOutcome: 'image_unavailable_locally',
    expectedCleanupRisk: 'none_expected',
  },
  {
    name: 'timeout-result',
    input: auditInput({
      exitCode: null,
      timedOut: true,
      stderr: 'Command timed out',
      rejectionCodes: ['container_smoke_execution_failed'],
    }),
    expectedOutcome: 'timeout',
    expectedCleanupRisk: 'unknown_after_timeout',
  },
  {
    name: 'blocked-policy-result',
    input: auditInput({
      executionMode: 'blocked',
      executionAttempted: false,
      exitCode: null,
      rejectionCodes: ['container_smoke_args_not_exact'],
    }),
    expectedOutcome: 'policy_blocked',
    expectedCleanupRisk: 'not_applicable_blocked',
  },
  {
    name: 'execution-failed-result',
    input: auditInput({
      exitCode: 125,
      stderr: 'Docker returned exit status 125',
      rejectionCodes: ['container_smoke_execution_failed'],
    }),
    expectedOutcome: 'execution_failed',
    expectedCleanupRisk: 'none_expected',
  },
  {
    name: 'unexpected-output-result',
    input: auditInput({
      ok: false,
      stdout: 'goodbye\n',
      exitCode: 0,
    }),
    expectedOutcome: 'unexpected_output',
    expectedCleanupRisk: 'none_expected',
  },
  {
    name: 'stderr-secret-redaction',
    input: auditInput({
      stderr:
        'API_KEY=sk-test TOKEN=abc SECRET=value SUPABASE_SERVICE_ROLE_KEY=service_role_value',
      exitCode: 125,
      rejectionCodes: ['container_smoke_execution_failed'],
    }),
    expectedOutcome: 'execution_failed',
    expectedCleanupRisk: 'none_expected',
    expectedStderrIncludes: [
      'API_KEY=[REDACTED_SECRET]',
      'TOKEN=[REDACTED_SECRET]',
      'SECRET=[REDACTED_SECRET]',
      '[REDACTED_SERVICE_ROLE]',
    ],
    forbiddenStderrPatterns: [/sk-test/, /service_role_value/, /TOKEN=abc/],
  },
  {
    name: 'stderr-home-path-redaction',
    input: auditInput({
      stderr: 'Failed near C:\\Users\\LENOVO\\secret\\.env and /home/codex/.ssh',
      exitCode: 125,
      rejectionCodes: ['container_smoke_execution_failed'],
    }),
    expectedOutcome: 'execution_failed',
    expectedCleanupRisk: 'none_expected',
    expectedStderrIncludes: ['[REDACTED_HOME_PATH]'],
    forbiddenStderrPatterns: [/C:\\Users\\/i, /\/home\/codex/, /\.env/],
  },
  {
    name: 'stdout-byte-cap',
    input: auditInput({
      ok: true,
      containerStarted: true,
      stdout: 'hello '.repeat(20),
      exitCode: 0,
    }),
    options: {
      maxStdoutBytes: 16,
    },
    expectedOutcome: 'success',
    expectedCleanupRisk: 'none_expected',
  },
  {
    name: 'stderr-byte-cap',
    input: auditInput({
      stderr: 'error '.repeat(20),
      exitCode: 125,
      rejectionCodes: ['container_smoke_execution_failed'],
    }),
    options: {
      maxStderrBytes: 16,
    },
    expectedOutcome: 'execution_failed',
    expectedCleanupRisk: 'none_expected',
  },
];
