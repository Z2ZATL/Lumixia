import type { LocalDevWorkerDockerCleanupResult } from './localDevWorkerDockerCleanupAdapter.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME } from './localDevWorkerDockerContainerIdentity.ts';
import type { LocalDevWorkerDockerContainerSmokeResult } from './localDevWorkerDockerContainerSmokeAdapter.ts';
import { LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS } from './localDevWorkerDockerContainerSmokePolicy.ts';
import type { LocalDevWorkerDockerReadinessResult } from './localDevWorkerDockerReadiness.ts';
import { createLocalDevWorkerDockerSmokeAuditRecord } from './localDevWorkerDockerSmokeAudit.ts';
import type { LocalDevWorkerDockerSmokeOutcome } from './localDevWorkerDockerSmokeResultNormalizer.ts';
import type {
  LocalDevWorkerDockerSmokeLifecycleOutcome,
  LocalDevWorkerDockerSmokeLifecycleResult,
  LocalDevWorkerDockerSmokeLifecycleStage,
} from './localDevWorkerDockerSmokeLifecycle.ts';
import type { LocalDevWorkerDockerSmokeCleanupRisk } from './localDevWorkerDockerSmokeAudit.ts';
import type { LocalDevWorkerDockerCleanupOutcome } from './localDevWorkerDockerCleanupAdapter.ts';
import { getLocalDevWorkerDockerSmokeLifecycleNextAction } from './localDevWorkerDockerSmokeLifecycleReportPolicy.ts';

export interface LocalDevWorkerDockerSmokeLifecycleReportFixture {
  name: string;
  result: LocalDevWorkerDockerSmokeLifecycleResult;
  expectedOutcome: LocalDevWorkerDockerSmokeLifecycleOutcome;
  expectedNextRecommendedAction: string;
  expectedMarkdownIncludes: readonly string[];
  forbiddenMarkdownPatterns: readonly RegExp[];
  forbiddenJsonPatterns: readonly RegExp[];
  expectedSmokeStdoutMaxBytes?: number;
  expectedSmokeStderrMaxBytes?: number;
}

const BASE_STAGES: LocalDevWorkerDockerSmokeLifecycleStage[] = [
  'not_started',
  'readiness_checked',
];

const SAFETY_METADATA = {
  workerBoundary: 'outside-browser-bundle',
  noNewDockerCapabilities: true,
  usedExistingReadinessAdapter: true,
  usedExistingSmokeAdapter: true,
  usedExistingCleanupAdapter: true,
  arbitraryDockerRunAllowed: false,
  arbitraryCleanupAllowed: false,
  imagePullAllowed: false,
  networkAllowed: false,
  mountsAllowed: false,
  workspaceMounted: false,
  dockerSocketMounted: false,
  homeMounted: false,
  shellAllowed: false,
  hostEnvironmentInherited: false,
  productionUiPath: false,
  srcImportPath: false,
} as const;

const SECRET_PATTERNS = [
  /abc123-secret/i,
  /token-value/i,
  /service_role_key/i,
  /C:\\Users\\Alice/i,
  /\/home\/alice/i,
  /\.env/i,
];

function readiness(input: {
  daemonReachable: boolean;
  rejectionCodes?: readonly string[];
}): LocalDevWorkerDockerReadinessResult {
  return {
    ok: input.daemonReachable,
    noContainerExecution: true,
    readinessState: input.daemonReachable ? 'daemon_available' : 'daemon_unavailable',
    daemonReachable: input.daemonReachable,
    commandAttempted: input.daemonReachable ? 'docker version --format {{json .}}' : undefined,
    rejectionCodes: [...(input.rejectionCodes ?? [])],
    stdout: '',
    stderr: '',
    exitCode: input.daemonReachable ? 0 : 1,
    timedOut: false,
    durationMs: 1,
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      localDevOnly: true,
      dockerCliAllowed: true,
      dockerDaemonStateQueried: input.daemonReachable,
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

function smoke(input: {
  ok: boolean;
  outcome?: LocalDevWorkerDockerSmokeOutcome;
  executionMode?: 'blocked' | 'executed';
  executionAttempted?: boolean;
  containerStarted?: boolean;
  stdout?: string;
  stderr?: string;
  sanitizedStdout?: string;
  sanitizedStderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  cleanupRisk?: LocalDevWorkerDockerSmokeCleanupRisk;
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
    capabilityId: 'capability.docker.container.smoke.echo',
    command: 'docker',
    args: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    stdout: input.stdout ?? '',
    stderr: input.stderr ?? '',
    exitCode: input.exitCode ?? (input.ok ? 0 : 1),
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
  const auditRecord = createLocalDevWorkerDockerSmokeAuditRecord(base);

  return {
    ...base,
    outcome: input.outcome ?? auditRecord.outcome,
    sanitizedStdout: input.sanitizedStdout ?? auditRecord.stdoutPreview,
    sanitizedStderr: input.sanitizedStderr ?? auditRecord.stderrPreview,
    cleanupRisk: input.cleanupRisk ?? auditRecord.cleanupRisk,
    auditRecord,
  };
}

function cleanup(input: {
  outcome: LocalDevWorkerDockerCleanupOutcome;
  ok?: boolean;
  executionAttempted?: boolean;
  cleanupExecuted?: boolean;
  stdout?: string;
  stderr?: string;
  sanitizedStdout?: string;
  sanitizedStderr?: string;
  rejectionCodes?: readonly string[];
}): LocalDevWorkerDockerCleanupResult {
  const ok = input.ok ?? input.outcome === 'cleanup_success';

  return {
    ok,
    noExecution: false,
    executionAttempted: input.executionAttempted ?? true,
    cleanupExecuted: input.cleanupExecuted ?? input.outcome === 'cleanup_success',
    executionMode: 'executed',
    capabilityId: 'capability.docker.smoke.cleanup.exact',
    command: 'docker',
    args: ['rm', '-f', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME],
    stdout: input.stdout ?? '',
    stderr: input.stderr ?? '',
    sanitizedStdout: input.sanitizedStdout ?? input.stdout ?? '',
    sanitizedStderr: input.sanitizedStderr ?? input.stderr ?? '',
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

function lifecycle(input: {
  lifecycleId: string;
  ok: boolean;
  outcome: LocalDevWorkerDockerSmokeLifecycleOutcome;
  stages: readonly LocalDevWorkerDockerSmokeLifecycleStage[];
  readiness: LocalDevWorkerDockerReadinessResult;
  smoke?: LocalDevWorkerDockerContainerSmokeResult;
  cleanup?: LocalDevWorkerDockerCleanupResult;
  cleanupAttempted?: boolean;
  cleanupRequired?: boolean;
  rejectionCodes?: readonly string[];
}): LocalDevWorkerDockerSmokeLifecycleResult {
  return {
    ok: input.ok,
    localDevOnly: true,
    lifecycleId: input.lifecycleId,
    stages: [...input.stages],
    outcome: input.outcome,
    readiness: input.readiness,
    smoke: input.smoke,
    cleanup: input.cleanup,
    auditRecord: input.smoke?.auditRecord,
    cleanupAttempted: input.cleanupAttempted ?? !!input.cleanup,
    cleanupRequired: input.cleanupRequired ?? !!input.cleanup,
    rejectionCodes: [...(input.rejectionCodes ?? [])],
    safetyMetadata: SAFETY_METADATA,
  };
}

function reportFixture(input: {
  name: string;
  result: LocalDevWorkerDockerSmokeLifecycleResult;
  expectedMarkdownIncludes?: readonly string[];
  forbiddenMarkdownPatterns?: readonly RegExp[];
  forbiddenJsonPatterns?: readonly RegExp[];
  expectedSmokeStdoutMaxBytes?: number;
  expectedSmokeStderrMaxBytes?: number;
}): LocalDevWorkerDockerSmokeLifecycleReportFixture {
  return {
    name: input.name,
    result: input.result,
    expectedOutcome: input.result.outcome,
    expectedNextRecommendedAction:
      getLocalDevWorkerDockerSmokeLifecycleNextAction(input.result.outcome),
    expectedMarkdownIncludes: input.expectedMarkdownIncludes ?? [
      `- Outcome: ${input.result.outcome}`,
    ],
    forbiddenMarkdownPatterns: input.forbiddenMarkdownPatterns ?? [],
    forbiddenJsonPatterns: input.forbiddenJsonPatterns ?? [],
    expectedSmokeStdoutMaxBytes: input.expectedSmokeStdoutMaxBytes,
    expectedSmokeStderrMaxBytes: input.expectedSmokeStderrMaxBytes,
  };
}

const successfulSmoke = smoke({
  ok: true,
  stdout: 'hello\n',
});
const successCleanup = cleanup({
  outcome: 'cleanup_success',
  stdout: `${LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME}\n`,
});

export const localDevWorkerDockerSmokeLifecycleReportFixtures = [
  reportFixture({
    name: 'lifecycle-success',
    result: lifecycle({
      lifecycleId: 'report-success',
      ok: true,
      outcome: 'success',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_skipped', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: successfulSmoke,
      cleanupAttempted: false,
      cleanupRequired: false,
    }),
  }),
  reportFixture({
    name: 'cleanup-success',
    result: lifecycle({
      lifecycleId: 'report-cleanup-success',
      ok: true,
      outcome: 'cleanup_success',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_attempted', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: successfulSmoke,
      cleanup: successCleanup,
    }),
    expectedMarkdownIncludes: [
      '- Outcome: cleanup_success',
      '- Cleanup executed: true',
    ],
  }),
  reportFixture({
    name: 'cleanup-target-not-found',
    result: lifecycle({
      lifecycleId: 'report-cleanup-target-not-found',
      ok: true,
      outcome: 'cleanup_target_not_found',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_attempted', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: successfulSmoke,
      cleanup: cleanup({
        outcome: 'cleanup_target_not_found',
        rejectionCodes: ['cleanup_target_not_found'],
      }),
    }),
  }),
  reportFixture({
    name: 'readiness-unavailable',
    result: lifecycle({
      lifecycleId: 'report-readiness-unavailable',
      ok: false,
      outcome: 'readiness_unavailable',
      stages: [...BASE_STAGES, 'cleanup_skipped', 'completed'],
      readiness: readiness({
        daemonReachable: false,
        rejectionCodes: ['docker_daemon_unavailable'],
      }),
      cleanupAttempted: false,
      cleanupRequired: false,
    }),
  }),
  reportFixture({
    name: 'smoke-policy-blocked',
    result: lifecycle({
      lifecycleId: 'report-smoke-policy-blocked',
      ok: false,
      outcome: 'smoke_policy_blocked',
      stages: [...BASE_STAGES, 'smoke_blocked', 'cleanup_skipped', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: smoke({
        ok: false,
        executionMode: 'blocked',
        executionAttempted: false,
        containerStarted: false,
        rejectionCodes: ['container_smoke_args_not_exact'],
      }),
      cleanupAttempted: false,
      cleanupRequired: false,
    }),
  }),
  reportFixture({
    name: 'smoke-image-unavailable',
    result: lifecycle({
      lifecycleId: 'report-smoke-image-unavailable',
      ok: false,
      outcome: 'smoke_unavailable_or_failed',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_skipped', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: smoke({
        ok: false,
        outcome: 'image_unavailable_locally',
        stdout: '',
        stderr: 'image not found locally because pull policy is never',
        rejectionCodes: ['container_smoke_image_unavailable'],
      }),
      cleanupAttempted: false,
      cleanupRequired: false,
      rejectionCodes: ['container_smoke_image_unavailable'],
    }),
  }),
  reportFixture({
    name: 'smoke-timeout-cleanup-attempted',
    result: lifecycle({
      lifecycleId: 'report-smoke-timeout',
      ok: false,
      outcome: 'smoke_timeout_cleanup_attempted',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_attempted', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: smoke({
        ok: false,
        outcome: 'timeout',
        executionAttempted: true,
        containerStarted: true,
        timedOut: true,
        cleanupRisk: 'unknown_after_timeout',
        stderr: 'timeout',
        rejectionCodes: ['container_smoke_timeout'],
      }),
      cleanup: successCleanup,
    }),
  }),
  reportFixture({
    name: 'cleanup-failed-structured',
    result: lifecycle({
      lifecycleId: 'report-cleanup-failed',
      ok: false,
      outcome: 'cleanup_failed_structured',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_attempted', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: successfulSmoke,
      cleanup: cleanup({
        outcome: 'docker_daemon_unavailable',
        rejectionCodes: ['docker_daemon_unavailable'],
      }),
    }),
  }),
  reportFixture({
    name: 'policy-blocked',
    result: lifecycle({
      lifecycleId: 'report-policy-blocked',
      ok: false,
      outcome: 'policy_blocked',
      stages: [...BASE_STAGES, 'completed'],
      readiness: readiness({
        daemonReachable: false,
        rejectionCodes: ['lifecycle_smoke_request_not_exact'],
      }),
      cleanupAttempted: false,
      cleanupRequired: false,
      rejectionCodes: ['lifecycle_smoke_request_not_exact'],
    }),
  }),
  reportFixture({
    name: 'secret-like-output-is-redacted',
    result: lifecycle({
      lifecycleId: 'report-secret-redaction',
      ok: false,
      outcome: 'smoke_unavailable_or_failed',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_skipped', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: smoke({
        ok: false,
        sanitizedStdout: 'API_KEY=abc123-secret TOKEN=token-value',
        sanitizedStderr: 'SUPABASE_SERVICE_ROLE_KEY=service_role_key .env.local',
        rejectionCodes: ['container_smoke_execution_failed'],
      }),
    }),
    forbiddenMarkdownPatterns: SECRET_PATTERNS,
    forbiddenJsonPatterns: SECRET_PATTERNS,
    expectedMarkdownIncludes: [
      '[REDACTED_SECRET]',
      '[REDACTED_SERVICE_ROLE]',
      '[REDACTED_ENV_FILE]',
    ],
  }),
  reportFixture({
    name: 'home-path-output-is-redacted',
    result: lifecycle({
      lifecycleId: 'report-home-redaction',
      ok: false,
      outcome: 'smoke_unavailable_or_failed',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_skipped', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: smoke({
        ok: false,
        sanitizedStdout: 'created at C:\\Users\\Alice\\repo',
        sanitizedStderr: 'looked at /home/alice/project',
        rejectionCodes: ['container_smoke_execution_failed'],
      }),
    }),
    forbiddenMarkdownPatterns: SECRET_PATTERNS,
    forbiddenJsonPatterns: SECRET_PATTERNS,
    expectedMarkdownIncludes: ['[REDACTED_HOME_PATH]'],
  }),
  reportFixture({
    name: 'long-output-is-capped',
    result: lifecycle({
      lifecycleId: 'report-long-output',
      ok: false,
      outcome: 'smoke_unavailable_or_failed',
      stages: [...BASE_STAGES, 'smoke_executed', 'audit_created', 'cleanup_skipped', 'completed'],
      readiness: readiness({ daemonReachable: true }),
      smoke: smoke({
        ok: false,
        sanitizedStdout: 'x'.repeat(6000),
        sanitizedStderr: 'y'.repeat(6000),
        rejectionCodes: ['container_smoke_execution_failed'],
      }),
    }),
    expectedSmokeStdoutMaxBytes: 4096,
    expectedSmokeStderrMaxBytes: 4096,
  }),
] as const satisfies readonly LocalDevWorkerDockerSmokeLifecycleReportFixture[];
