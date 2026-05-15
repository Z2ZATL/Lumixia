import {
  type LocalDevWorkerDockerCleanupResult,
  executeLocalDevWorkerDockerSmokeCleanup,
} from './localDevWorkerDockerCleanupAdapter.ts';
import {
  type LocalDevWorkerDockerReadinessResult,
} from './localDevWorkerDockerReadiness.ts';
import { classifyLocalDevWorkerDockerReadiness } from './localDevWorkerDockerReadinessAdapter.ts';
import {
  type LocalDevWorkerDockerContainerSmokeResult,
  executeLocalDevWorkerDockerContainerSmoke,
} from './localDevWorkerDockerContainerSmokeAdapter.ts';
import { LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS } from './localDevWorkerDockerContainerSmokePolicy.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND } from './localDevWorkerDockerCleanupPolicy.ts';
import type { LocalDevWorkerDockerSmokeAuditRecord } from './localDevWorkerDockerSmokeAudit.ts';
import type { LocalDevWorkerExecutionConfig } from './localDevWorkerExecutionConfig.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import {
  assertTrustedManualReviewSource,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';
import {
  DEFAULT_LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_POLICY,
  aggregateLifecycleRejectionCodes,
  canTransitionLifecycleStage,
  classifyDockerSmokeLifecycleOutcome,
  evaluateDockerSmokeLifecycleCleanupDecision,
  type LocalDevWorkerDockerSmokeLifecycleOutcome,
  type LocalDevWorkerDockerSmokeLifecyclePolicy,
} from './localDevWorkerDockerSmokeLifecyclePolicy.ts';

export type LocalDevWorkerDockerSmokeLifecycleStage =
  | 'not_started'
  | 'readiness_checked'
  | 'smoke_blocked'
  | 'smoke_executed'
  | 'audit_created'
  | 'cleanup_skipped'
  | 'cleanup_attempted'
  | 'completed';

export type { LocalDevWorkerDockerSmokeLifecycleOutcome };

export interface LocalDevWorkerDockerSmokeLifecycleSafetyMetadata {
  workerBoundary: 'outside-browser-bundle';
  noNewDockerCapabilities: true;
  usedExistingReadinessAdapter: true;
  usedExistingSmokeAdapter: true;
  usedExistingCleanupAdapter: true;
  arbitraryDockerRunAllowed: false;
  arbitraryCleanupAllowed: false;
  imagePullAllowed: false;
  networkAllowed: false;
  mountsAllowed: false;
  workspaceMounted: false;
  dockerSocketMounted: false;
  homeMounted: false;
  shellAllowed: false;
  hostEnvironmentInherited: false;
  productionUiPath: false;
  srcImportPath: false;
}

export interface LocalDevWorkerDockerSmokeLifecycleResult {
  ok: boolean;
  localDevOnly: true;
  lifecycleId: string;
  stages: LocalDevWorkerDockerSmokeLifecycleStage[];
  outcome: LocalDevWorkerDockerSmokeLifecycleOutcome;
  readiness: LocalDevWorkerDockerReadinessResult;
  smoke?: LocalDevWorkerDockerContainerSmokeResult;
  cleanup?: LocalDevWorkerDockerCleanupResult;
  auditRecord?: LocalDevWorkerDockerSmokeAuditRecord;
  cleanupAttempted: boolean;
  cleanupRequired: boolean;
  rejectionCodes: string[];
  safetyMetadata: LocalDevWorkerDockerSmokeLifecycleSafetyMetadata;
}

interface LifecycleAdapterInput {
  request: LocalDevWorkerExecutionReadinessRequest;
  config?: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
}

export interface LocalDevWorkerDockerSmokeLifecycleAdapters {
  readiness: (
    input: LifecycleAdapterInput,
  ) => Promise<LocalDevWorkerDockerReadinessResult>;
  smoke: (
    input: LifecycleAdapterInput & {
      dockerReadiness: LocalDevWorkerDockerReadinessResult;
    },
  ) => Promise<LocalDevWorkerDockerContainerSmokeResult>;
  cleanup: (
    input: LifecycleAdapterInput,
  ) => Promise<LocalDevWorkerDockerCleanupResult>;
}

export interface LocalDevWorkerDockerSmokeLifecycleInput {
  lifecycleId?: string;
  readiness: LifecycleAdapterInput;
  smoke: LifecycleAdapterInput;
  cleanup: LifecycleAdapterInput;
  policy?: Partial<LocalDevWorkerDockerSmokeLifecyclePolicy>;
  adapters?: Partial<LocalDevWorkerDockerSmokeLifecycleAdapters>;
}

const DEFAULT_LIFECYCLE_ID = 'local-dev-docker-smoke-lifecycle';

const DEFAULT_ADAPTERS: LocalDevWorkerDockerSmokeLifecycleAdapters = {
  readiness: classifyLocalDevWorkerDockerReadiness,
  smoke: executeLocalDevWorkerDockerContainerSmoke,
  cleanup: executeLocalDevWorkerDockerSmokeCleanup,
};

const READINESS_CAPABILITY_ID = 'capability.docker.daemon.readiness';
const SMOKE_CAPABILITY_ID = 'capability.docker.container.smoke.echo';
const CLEANUP_CAPABILITY_ID = 'capability.docker.smoke.cleanup.exact';
const READINESS_ARGS = ['version', '--format', '{{json .}}'] as const;
const CLEANUP_ARGS = LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND.slice(1);

function createSafetyMetadata(): LocalDevWorkerDockerSmokeLifecycleSafetyMetadata {
  return {
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
  };
}

function syntheticBlockedReadiness(
  rejectionCodes: readonly string[],
): LocalDevWorkerDockerReadinessResult {
  return {
    ok: false,
    noContainerExecution: true,
    readinessState: 'probe_blocked',
    daemonReachable: false,
    rejectionCodes: [...new Set(rejectionCodes)],
    stdout: '',
    stderr: '',
    exitCode: null,
    timedOut: false,
    durationMs: 0,
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      localDevOnly: true,
      dockerCliAllowed: false,
      dockerDaemonStateQueried: false,
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

function pushStage(
  stages: LocalDevWorkerDockerSmokeLifecycleStage[],
  stage: LocalDevWorkerDockerSmokeLifecycleStage,
  rejectionCodes: string[],
) {
  const previous = stages[stages.length - 1];
  if (!previous || canTransitionLifecycleStage({ from: previous, to: stage })) {
    stages.push(stage);
    return;
  }

  rejectionCodes.push(`invalid_stage_transition:${previous}->${stage}`);
  stages.push(stage);
}

function trustedReviewRejectionCodes(input: LocalDevWorkerDockerSmokeLifecycleInput) {
  const rejectionCodes: string[] = [];
  const readinessReview = input.readiness.trustedManualReview;
  const smokeReview = input.smoke.trustedManualReview;
  const cleanupReview = input.cleanup.trustedManualReview;
  const readinessReviewTrusted = assertTrustedManualReviewSource(readinessReview);
  const smokeReviewTrusted = assertTrustedManualReviewSource(smokeReview);
  const cleanupReviewTrusted = assertTrustedManualReviewSource(cleanupReview);

  if (!readinessReviewTrusted) {
    rejectionCodes.push('lifecycle_readiness_trusted_review_missing');
  }

  if (!smokeReviewTrusted) {
    rejectionCodes.push('lifecycle_smoke_trusted_review_missing');
  }

  if (!cleanupReviewTrusted) {
    rejectionCodes.push('lifecycle_cleanup_trusted_review_missing');
  }

  if (
    readinessReviewTrusted &&
    (readinessReview.scope.length !== 1 ||
      readinessReview.scope[0] !== READINESS_CAPABILITY_ID)
  ) {
    rejectionCodes.push('lifecycle_readiness_review_scope_not_exact');
  }

  if (
    smokeReviewTrusted &&
    (smokeReview.scope.length !== 1 ||
      smokeReview.scope[0] !== SMOKE_CAPABILITY_ID)
  ) {
    rejectionCodes.push('lifecycle_smoke_review_scope_not_exact');
  }

  if (
    cleanupReviewTrusted &&
    (cleanupReview.scope.length !== 1 ||
      cleanupReview.scope[0] !== CLEANUP_CAPABILITY_ID)
  ) {
    rejectionCodes.push('lifecycle_cleanup_review_scope_not_exact');
  }

  if (input.readiness.request.productionUiPath || input.smoke.request.productionUiPath || input.cleanup.request.productionUiPath) {
    rejectionCodes.push('production_ui_path_denied');
  }

  if (input.readiness.request.srcImportPath || input.smoke.request.srcImportPath || input.cleanup.request.srcImportPath) {
    rejectionCodes.push('src_import_path_denied');
  }

  if (
    input.readiness.request.source !== 'dremo-local-dev-sandbox' ||
    input.smoke.request.source !== 'dremo-local-dev-sandbox' ||
    input.cleanup.request.source !== 'dremo-local-dev-sandbox'
  ) {
    rejectionCodes.push('invalid_source');
  }

  if (
    input.readiness.request.expectedEnvironment !== 'local-dev' ||
    input.smoke.request.expectedEnvironment !== 'local-dev' ||
    input.cleanup.request.expectedEnvironment !== 'local-dev'
  ) {
    rejectionCodes.push('invalid_environment');
  }

  if (
    input.readiness.request.command !== 'docker' ||
    JSON.stringify(input.readiness.request.args) !== JSON.stringify(READINESS_ARGS)
  ) {
    rejectionCodes.push('lifecycle_readiness_request_not_exact');
  }

  if (
    input.smoke.request.command !== 'docker' ||
    JSON.stringify(input.smoke.request.args) !==
      JSON.stringify(LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS)
  ) {
    rejectionCodes.push('lifecycle_smoke_request_not_exact');
  }

  if (
    input.cleanup.request.command !== 'docker' ||
    JSON.stringify(input.cleanup.request.args) !== JSON.stringify(CLEANUP_ARGS)
  ) {
    rejectionCodes.push('lifecycle_cleanup_request_not_exact');
  }

  return [...new Set(rejectionCodes)];
}

function createResult(input: {
  lifecycleId: string;
  stages: LocalDevWorkerDockerSmokeLifecycleStage[];
  readiness: LocalDevWorkerDockerReadinessResult;
  smoke?: LocalDevWorkerDockerContainerSmokeResult;
  cleanup?: LocalDevWorkerDockerCleanupResult;
  cleanupAttempted: boolean;
  cleanupRequired: boolean;
  rejectionCodes: readonly string[];
  preflightBlocked?: boolean;
}): LocalDevWorkerDockerSmokeLifecycleResult {
  const outcome = classifyDockerSmokeLifecycleOutcome({
    readiness: input.readiness,
    smoke: input.smoke,
    cleanup: input.cleanup,
    cleanupAttempted: input.cleanupAttempted,
    preflightBlocked: input.preflightBlocked,
  });

  return {
    ok: ['success', 'cleanup_success', 'cleanup_target_not_found'].includes(outcome),
    localDevOnly: true,
    lifecycleId: input.lifecycleId,
    stages: input.stages,
    outcome,
    readiness: input.readiness,
    smoke: input.smoke,
    cleanup: input.cleanup,
    auditRecord: input.smoke?.auditRecord,
    cleanupAttempted: input.cleanupAttempted,
    cleanupRequired: input.cleanupRequired,
    rejectionCodes: aggregateLifecycleRejectionCodes(
      input.rejectionCodes,
      input.readiness.rejectionCodes,
      input.smoke?.rejectionCodes,
      input.cleanup?.rejectionCodes,
    ),
    safetyMetadata: createSafetyMetadata(),
  };
}

export async function runLocalDevWorkerDockerSmokeLifecycle(
  input: LocalDevWorkerDockerSmokeLifecycleInput,
): Promise<LocalDevWorkerDockerSmokeLifecycleResult> {
  const lifecycleId = input.lifecycleId ?? DEFAULT_LIFECYCLE_ID;
  const stages: LocalDevWorkerDockerSmokeLifecycleStage[] = ['not_started'];
  const rejectionCodes = trustedReviewRejectionCodes(input);
  const policy = {
    ...DEFAULT_LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_POLICY,
    ...input.policy,
  };
  const adapters = {
    ...DEFAULT_ADAPTERS,
    ...input.adapters,
  };

  if (rejectionCodes.length > 0) {
    pushStage(stages, 'readiness_checked', rejectionCodes);
    pushStage(stages, 'completed', rejectionCodes);

    return createResult({
      lifecycleId,
      stages,
      readiness: syntheticBlockedReadiness(rejectionCodes),
      cleanupAttempted: false,
      cleanupRequired: false,
      rejectionCodes,
      preflightBlocked: true,
    });
  }

  const readiness = await adapters.readiness(input.readiness);
  pushStage(stages, 'readiness_checked', rejectionCodes);

  if (readiness.readinessState !== 'daemon_available') {
    const cleanupDecision = evaluateDockerSmokeLifecycleCleanupDecision({
      readiness,
      policy,
    });
    pushStage(stages, 'cleanup_skipped', rejectionCodes);
    pushStage(stages, 'completed', rejectionCodes);

    return createResult({
      lifecycleId,
      stages,
      readiness,
      cleanupAttempted: false,
      cleanupRequired: cleanupDecision.cleanupRequired,
      rejectionCodes: cleanupDecision.rejectionCodes,
    });
  }

  const smoke = await adapters.smoke({
    ...input.smoke,
    dockerReadiness: readiness,
  });

  if (smoke.executionMode === 'blocked') {
    pushStage(stages, 'smoke_blocked', rejectionCodes);
    const cleanupDecision = evaluateDockerSmokeLifecycleCleanupDecision({
      readiness,
      smoke,
      policy,
    });
    pushStage(stages, 'cleanup_skipped', rejectionCodes);
    pushStage(stages, 'completed', rejectionCodes);

    return createResult({
      lifecycleId,
      stages,
      readiness,
      smoke,
      cleanupAttempted: false,
      cleanupRequired: cleanupDecision.cleanupRequired,
      rejectionCodes: cleanupDecision.rejectionCodes,
    });
  }

  pushStage(stages, 'smoke_executed', rejectionCodes);
  pushStage(stages, 'audit_created', rejectionCodes);

  const cleanupDecision = evaluateDockerSmokeLifecycleCleanupDecision({
    readiness,
    smoke,
    policy,
  });

  if (!cleanupDecision.cleanupRequired) {
    pushStage(stages, 'cleanup_skipped', rejectionCodes);
    pushStage(stages, 'completed', rejectionCodes);

    return createResult({
      lifecycleId,
      stages,
      readiness,
      smoke,
      cleanupAttempted: false,
      cleanupRequired: false,
      rejectionCodes: cleanupDecision.rejectionCodes,
    });
  }

  const cleanup = await adapters.cleanup(input.cleanup);
  pushStage(stages, 'cleanup_attempted', rejectionCodes);
  pushStage(stages, 'completed', rejectionCodes);

  return createResult({
    lifecycleId,
    stages,
    readiness,
    smoke,
    cleanup,
    cleanupAttempted: true,
    cleanupRequired: true,
    rejectionCodes: cleanupDecision.rejectionCodes,
  });
}
