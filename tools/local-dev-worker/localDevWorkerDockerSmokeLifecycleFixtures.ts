import {
  type LocalDevWorkerDockerCleanupOutcome,
  type LocalDevWorkerDockerCleanupResult,
} from './localDevWorkerDockerCleanupAdapter.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND } from './localDevWorkerDockerCleanupPolicy.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME } from './localDevWorkerDockerContainerIdentity.ts';
import {
  type LocalDevWorkerDockerContainerSmokeResult,
} from './localDevWorkerDockerContainerSmokeAdapter.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID,
} from './localDevWorkerDockerContainerSmokePolicy.ts';
import type {
  LocalDevWorkerDockerReadinessResult,
  LocalDevWorkerDockerReadinessState,
} from './localDevWorkerDockerReadiness.ts';
import { createLocalDevWorkerDockerSmokeAuditRecord } from './localDevWorkerDockerSmokeAudit.ts';
import {
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
  LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
} from './localDevWorkerExecutionConfig.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import {
  type LocalDevWorkerDockerSmokeLifecycleAdapters,
  type LocalDevWorkerDockerSmokeLifecycleInput,
  type LocalDevWorkerDockerSmokeLifecycleOutcome,
  type LocalDevWorkerDockerSmokeLifecycleStage,
} from './localDevWorkerDockerSmokeLifecycle.ts';
import {
  createTrustedLocalDevManualReviewForCapabilities,
  createTrustedLocalDevManualReviewForContainerSmoke,
  createTrustedLocalDevManualReviewForDockerSmokeCleanup,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerDockerSmokeLifecycleScenario {
  input: LocalDevWorkerDockerSmokeLifecycleInput;
  calls: string[];
}

export interface LocalDevWorkerDockerSmokeLifecycleFixture {
  name: string;
  createScenario: () => LocalDevWorkerDockerSmokeLifecycleScenario;
  expectedOutcome: LocalDevWorkerDockerSmokeLifecycleOutcome;
  expectedStages: readonly LocalDevWorkerDockerSmokeLifecycleStage[];
  expectedCalls: readonly string[];
  expectedCleanupAttempted: boolean;
  expectedCleanupRequired: boolean;
  expectedSmokePresent: boolean;
  expectedCleanupPresent: boolean;
  expectedRejectionCodes: readonly string[];
}

const READINESS_CAPABILITY_ID = 'capability.docker.daemon.readiness';
const CLEANUP_CAPABILITY_ID = 'capability.docker.smoke.cleanup.exact';
const EXACT_CLEANUP_ARGS = LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND.slice(1);

function readinessRequest(
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: 'lifecycle-readiness',
    command: 'docker',
    args: ['version', '--format', '{{json .}}'],
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: 'Lifecycle readiness fixture.',
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: true,
    manualSecurityReview: createTrustedLocalDevManualReviewForCapabilities([
      READINESS_CAPABILITY_ID,
    ]),
    productionUiPath: false,
    srcImportPath: false,
    ...overrides,
  };
}

function smokeRequest(
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: 'lifecycle-smoke',
    command: 'docker',
    args: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: 'Lifecycle smoke fixture.',
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: true,
    manualSecurityReview: createTrustedLocalDevManualReviewForContainerSmoke(),
    productionUiPath: false,
    srcImportPath: false,
    ...overrides,
  };
}

function cleanupRequest(
  overrides: Partial<LocalDevWorkerExecutionReadinessRequest> = {},
): LocalDevWorkerExecutionReadinessRequest {
  return {
    requestId: 'lifecycle-cleanup',
    command: 'docker',
    args: EXACT_CLEANUP_ARGS,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: 'Lifecycle cleanup fixture.',
    createdBy: 'local-dev-worker-dry-run-harness',
    allowRealExecution: true,
    manualSecurityReview: createTrustedLocalDevManualReviewForDockerSmokeCleanup(),
    productionUiPath: false,
    srcImportPath: false,
    ...overrides,
  };
}

function readinessResult(input: {
  readinessState: LocalDevWorkerDockerReadinessState;
  rejectionCodes?: readonly string[];
}): LocalDevWorkerDockerReadinessResult {
  const daemonReachable = input.readinessState === 'daemon_available';

  return {
    ok: daemonReachable,
    noContainerExecution: true,
    readinessState: input.readinessState,
    dockerCliVersion: daemonReachable ? 'Docker version fixture' : undefined,
    dockerServerVersion: daemonReachable ? 'fixture-server' : undefined,
    daemonReachable,
    commandAttempted:
      input.readinessState === 'probe_blocked' ? undefined : 'docker version --format {{json .}}',
    rejectionCodes: [...(input.rejectionCodes ?? [])],
    stdout: daemonReachable ? '{"Client":{"Version":"fixture"},"Server":{"Version":"fixture"}}' : '',
    stderr: daemonReachable ? '' : 'Fixture daemon unavailable.',
    exitCode: daemonReachable ? 0 : 1,
    timedOut: false,
    durationMs: 1,
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      localDevOnly: true,
      dockerCliAllowed: true,
      dockerDaemonStateQueried: daemonReachable,
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

function smokeResult(input: {
  ok: boolean;
  executionMode?: 'blocked' | 'executed';
  executionAttempted?: boolean;
  containerStarted?: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  rejectionCodes?: readonly string[];
}): LocalDevWorkerDockerContainerSmokeResult {
  const base = {
    ok: input.ok,
    noExecution: input.executionMode === 'blocked',
    executionAttempted: input.executionAttempted ?? input.executionMode !== 'blocked',
    containerStarted: input.containerStarted ?? input.ok,
    imagePulled: false as false,
    imageBuilt: false as false,
    networkAllowed: false as false,
    mountsAllowed: false as false,
    executionMode: input.executionMode ?? 'executed',
    capabilityId: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID,
    command: 'docker',
    args: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    stdout: input.stdout ?? '',
    stderr: input.stderr ?? '',
    exitCode: input.exitCode ?? null,
    timedOut: input.timedOut ?? false,
    durationMs: 1,
    rejectionCodes: [...(input.rejectionCodes ?? [])],
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle' as const,
      localDevOnly: true as const,
      dockerCliAllowed: true as const,
      dockerRuntimeAllowed: true,
      containerStarted: input.containerStarted ?? input.ok,
      imagePulled: false as false,
      imageBuilt: false as false,
      dockerSocketMounted: false as false,
      homeMounted: false as false,
      workspaceMounted: false as false,
      networkAllowed: false as false,
      fileWritesAllowed: false as false,
      shellAllowed: false as false,
      hostEnvironmentInherited: false as false,
      runAsNonRoot: true as const,
    },
  };
  const auditRecord = createLocalDevWorkerDockerSmokeAuditRecord(base, {
    maxStdoutBytes: LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG.maxStdoutBytes,
    maxStderrBytes: LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG.maxStderrBytes,
  });

  return {
    ...base,
    outcome: auditRecord.outcome,
    sanitizedStdout: auditRecord.stdoutPreview,
    sanitizedStderr: auditRecord.stderrPreview,
    cleanupRisk: auditRecord.cleanupRisk,
    auditRecord,
  };
}

function cleanupResult(input: {
  outcome: LocalDevWorkerDockerCleanupOutcome;
  ok?: boolean;
  executionMode?: 'blocked' | 'executed';
  executionAttempted?: boolean;
  cleanupExecuted?: boolean;
  rejectionCodes?: readonly string[];
}): LocalDevWorkerDockerCleanupResult {
  const executionMode = input.executionMode ?? 'executed';
  const ok = input.ok ?? input.outcome === 'cleanup_success';

  return {
    ok,
    noExecution: executionMode === 'blocked',
    executionAttempted: input.executionAttempted ?? executionMode === 'executed',
    cleanupExecuted: input.cleanupExecuted ?? input.outcome === 'cleanup_success',
    executionMode,
    capabilityId: CLEANUP_CAPABILITY_ID,
    command: 'docker',
    args: EXACT_CLEANUP_ARGS,
    stdout: ok ? LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME : '',
    stderr: '',
    sanitizedStdout: ok ? LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME : '',
    sanitizedStderr: '',
    exitCode: ok ? 0 : 1,
    timedOut: input.outcome === 'timeout',
    durationMs: 1,
    rejectionCodes: [...(input.rejectionCodes ?? [])],
    outcome: input.outcome,
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      localDevOnly: true,
      dockerCliAllowed: true,
      dockerRuntimeAllowed: true,
      cleanupTarget: LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
      arbitraryTargetAllowed: false,
      wildcardAllowed: false,
      containerIdAllowed: false,
      pruneAllowed: false,
      inspectAllowed: false,
      listAllowed: false,
      dockerSocketMounted: false,
      homeMounted: false,
      workspaceMounted: false,
      networkAllowed: false,
      fileWritesAllowed: false,
      shellAllowed: false,
      hostEnvironmentInherited: false,
    },
  };
}

function scenario(input: {
  readiness?: LocalDevWorkerDockerReadinessResult;
  smoke?: LocalDevWorkerDockerContainerSmokeResult;
  cleanup?: LocalDevWorkerDockerCleanupResult;
  readinessRequestOverrides?: Partial<LocalDevWorkerExecutionReadinessRequest>;
  smokeRequestOverrides?: Partial<LocalDevWorkerExecutionReadinessRequest>;
  cleanupRequestOverrides?: Partial<LocalDevWorkerExecutionReadinessRequest>;
  readinessReview?: ReturnType<typeof createTrustedLocalDevManualReviewForCapabilities>;
  smokeReview?: ReturnType<typeof createTrustedLocalDevManualReviewForCapabilities>;
  cleanupReview?: ReturnType<typeof createTrustedLocalDevManualReviewForCapabilities>;
}): LocalDevWorkerDockerSmokeLifecycleScenario {
  const calls: string[] = [];
  const adapters: Partial<LocalDevWorkerDockerSmokeLifecycleAdapters> = {
    readiness: async () => {
      calls.push('readiness');
      return input.readiness ?? readinessResult({ readinessState: 'daemon_available' });
    },
    smoke: async () => {
      calls.push('smoke');
      return input.smoke ?? smokeResult({ ok: true, stdout: 'hello\n', exitCode: 0 });
    },
    cleanup: async () => {
      calls.push('cleanup');
      return input.cleanup ?? cleanupResult({ outcome: 'cleanup_success' });
    },
  };

  return {
    calls,
    input: {
      lifecycleId: 'fixture-lifecycle',
      readiness: {
        request: readinessRequest(input.readinessRequestOverrides),
        config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_READINESS_PROBE_CONFIG,
        trustedManualReview:
          input.readinessReview ??
          createTrustedLocalDevManualReviewForCapabilities([
            READINESS_CAPABILITY_ID,
          ]),
      },
      smoke: {
        request: smokeRequest(input.smokeRequestOverrides),
        config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_CONTAINER_SMOKE_CONFIG,
        trustedManualReview:
          input.smokeReview ?? createTrustedLocalDevManualReviewForContainerSmoke(),
      },
      cleanup: {
        request: cleanupRequest(input.cleanupRequestOverrides),
        config: LOCAL_DEV_WORKER_REVIEWED_DOCKER_SMOKE_CLEANUP_CONFIG,
        trustedManualReview:
          input.cleanupReview ??
          createTrustedLocalDevManualReviewForDockerSmokeCleanup(),
      },
      adapters,
    },
  };
}

function fixture(
  input: LocalDevWorkerDockerSmokeLifecycleFixture,
): LocalDevWorkerDockerSmokeLifecycleFixture {
  return input;
}

const PRE_FLIGHT_STAGES = [
  'not_started',
  'readiness_checked',
  'completed',
] as const;

export const localDevWorkerDockerSmokeLifecycleFixtures = [
  fixture({
    name: 'readiness-unavailable-skips-smoke-and-cleanup',
    createScenario: () =>
      scenario({
        readiness: readinessResult({
          readinessState: 'daemon_unavailable',
          rejectionCodes: ['docker_daemon_unavailable'],
        }),
      }),
    expectedOutcome: 'readiness_unavailable',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'cleanup_skipped',
      'completed',
    ],
    expectedCalls: ['readiness'],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: [
      'docker_daemon_unavailable',
      'cleanup_skipped_readiness_unavailable',
    ],
  }),
  fixture({
    name: 'readiness-success-smoke-success-cleanup-success',
    createScenario: () =>
      scenario({
        cleanup: cleanupResult({ outcome: 'cleanup_success' }),
      }),
    expectedOutcome: 'cleanup_success',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'smoke_executed',
      'audit_created',
      'cleanup_attempted',
      'completed',
    ],
    expectedCalls: ['readiness', 'smoke', 'cleanup'],
    expectedCleanupAttempted: true,
    expectedCleanupRequired: true,
    expectedSmokePresent: true,
    expectedCleanupPresent: true,
    expectedRejectionCodes: [],
  }),
  fixture({
    name: 'readiness-success-smoke-success-cleanup-target-not-found',
    createScenario: () =>
      scenario({
        cleanup: cleanupResult({
          outcome: 'cleanup_target_not_found',
          rejectionCodes: ['cleanup_target_not_found'],
        }),
      }),
    expectedOutcome: 'cleanup_target_not_found',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'smoke_executed',
      'audit_created',
      'cleanup_attempted',
      'completed',
    ],
    expectedCalls: ['readiness', 'smoke', 'cleanup'],
    expectedCleanupAttempted: true,
    expectedCleanupRequired: true,
    expectedSmokePresent: true,
    expectedCleanupPresent: true,
    expectedRejectionCodes: ['cleanup_target_not_found'],
  }),
  fixture({
    name: 'smoke-image-unavailable-is-structured-and-cleaned',
    createScenario: () =>
      scenario({
        smoke: smokeResult({
          ok: false,
          executionMode: 'executed',
          executionAttempted: true,
          containerStarted: false,
          stderr: 'Unable to find image locally because pull policy is never.',
          exitCode: 125,
          rejectionCodes: ['container_smoke_image_unavailable'],
        }),
        cleanup: cleanupResult({
          outcome: 'cleanup_target_not_found',
          rejectionCodes: ['cleanup_target_not_found'],
        }),
      }),
    expectedOutcome: 'cleanup_target_not_found',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'smoke_executed',
      'audit_created',
      'cleanup_attempted',
      'completed',
    ],
    expectedCalls: ['readiness', 'smoke', 'cleanup'],
    expectedCleanupAttempted: true,
    expectedCleanupRequired: true,
    expectedSmokePresent: true,
    expectedCleanupPresent: true,
    expectedRejectionCodes: [
      'container_smoke_image_unavailable',
      'cleanup_target_not_found',
    ],
  }),
  fixture({
    name: 'smoke-timeout-attempts-cleanup',
    createScenario: () =>
      scenario({
        smoke: smokeResult({
          ok: false,
          executionMode: 'executed',
          executionAttempted: true,
          containerStarted: true,
          timedOut: true,
          stderr: 'Timed out.',
          rejectionCodes: ['container_smoke_timeout'],
        }),
        cleanup: cleanupResult({ outcome: 'cleanup_success' }),
      }),
    expectedOutcome: 'smoke_timeout_cleanup_attempted',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'smoke_executed',
      'audit_created',
      'cleanup_attempted',
      'completed',
    ],
    expectedCalls: ['readiness', 'smoke', 'cleanup'],
    expectedCleanupAttempted: true,
    expectedCleanupRequired: true,
    expectedSmokePresent: true,
    expectedCleanupPresent: true,
    expectedRejectionCodes: ['container_smoke_timeout'],
  }),
  fixture({
    name: 'smoke-policy-blocked-skips-cleanup',
    createScenario: () =>
      scenario({
        smoke: smokeResult({
          ok: false,
          executionMode: 'blocked',
          executionAttempted: false,
          containerStarted: false,
          rejectionCodes: ['container_smoke_args_not_exact'],
        }),
      }),
    expectedOutcome: 'smoke_policy_blocked',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'smoke_blocked',
      'cleanup_skipped',
      'completed',
    ],
    expectedCalls: ['readiness', 'smoke'],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: true,
    expectedCleanupPresent: false,
    expectedRejectionCodes: [
      'container_smoke_args_not_exact',
      'cleanup_skipped_smoke_policy_blocked',
    ],
  }),
  fixture({
    name: 'cleanup-policy-blocked-is-structured',
    createScenario: () =>
      scenario({
        cleanup: cleanupResult({
          outcome: 'policy_blocked',
          executionMode: 'blocked',
          executionAttempted: false,
          cleanupExecuted: false,
          rejectionCodes: ['cleanup_command_not_allowed'],
        }),
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'smoke_executed',
      'audit_created',
      'cleanup_attempted',
      'completed',
    ],
    expectedCalls: ['readiness', 'smoke', 'cleanup'],
    expectedCleanupAttempted: true,
    expectedCleanupRequired: true,
    expectedSmokePresent: true,
    expectedCleanupPresent: true,
    expectedRejectionCodes: ['cleanup_command_not_allowed'],
  }),
  fixture({
    name: 'cleanup-docker-unavailable-is-structured',
    createScenario: () =>
      scenario({
        cleanup: cleanupResult({
          outcome: 'docker_daemon_unavailable',
          rejectionCodes: ['docker_daemon_unavailable'],
        }),
      }),
    expectedOutcome: 'cleanup_failed_structured',
    expectedStages: [
      'not_started',
      'readiness_checked',
      'smoke_executed',
      'audit_created',
      'cleanup_attempted',
      'completed',
    ],
    expectedCalls: ['readiness', 'smoke', 'cleanup'],
    expectedCleanupAttempted: true,
    expectedCleanupRequired: true,
    expectedSmokePresent: true,
    expectedCleanupPresent: true,
    expectedRejectionCodes: ['docker_daemon_unavailable'],
  }),
  fixture({
    name: 'missing-trusted-review-blocks-lifecycle-before-adapters',
    createScenario: () => {
      const created = scenario({});
      created.input.readiness.trustedManualReview = undefined;
      return created;
    },
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: ['lifecycle_readiness_trusted_review_missing'],
  }),
  fixture({
    name: 'wrong-smoke-review-scope-blocks-lifecycle-before-adapters',
    createScenario: () =>
      scenario({
        smokeReview: createTrustedLocalDevManualReviewForCapabilities([
          'capability.docker.version',
        ]),
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: ['lifecycle_smoke_review_scope_not_exact'],
  }),
  fixture({
    name: 'wrong-cleanup-review-scope-blocks-lifecycle-before-adapters',
    createScenario: () =>
      scenario({
        cleanupReview: createTrustedLocalDevManualReviewForCapabilities([
          LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID,
        ]),
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: ['lifecycle_cleanup_review_scope_not_exact'],
  }),
  fixture({
    name: 'production-ui-path-blocks-lifecycle-before-adapters',
    createScenario: () =>
      scenario({
        smokeRequestOverrides: { productionUiPath: true },
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: ['production_ui_path_denied'],
  }),
  fixture({
    name: 'src-import-path-blocks-lifecycle-before-adapters',
    createScenario: () =>
      scenario({
        cleanupRequestOverrides: { srcImportPath: true },
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: ['src_import_path_denied'],
  }),
  fixture({
    name: 'invalid-source-blocks-lifecycle-before-adapters',
    createScenario: () =>
      scenario({
        readinessRequestOverrides: {
          source: 'browser' as 'dremo-local-dev-sandbox',
        },
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: ['invalid_source'],
  }),
  fixture({
    name: 'invalid-environment-blocks-lifecycle-before-adapters',
    createScenario: () =>
      scenario({
        smokeRequestOverrides: {
          expectedEnvironment: 'production' as 'local-dev',
        },
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: ['invalid_environment'],
  }),
  fixture({
    name: 'non-exact-smoke-request-blocks-lifecycle-before-adapters',
    createScenario: () =>
      scenario({
        smokeRequestOverrides: {
          args: ['run', 'alpine:latest'],
        },
      }),
    expectedOutcome: 'policy_blocked',
    expectedStages: PRE_FLIGHT_STAGES,
    expectedCalls: [],
    expectedCleanupAttempted: false,
    expectedCleanupRequired: false,
    expectedSmokePresent: false,
    expectedCleanupPresent: false,
    expectedRejectionCodes: [
      'lifecycle_smoke_request_not_exact',
    ],
  }),
] as const satisfies readonly LocalDevWorkerDockerSmokeLifecycleFixture[];
