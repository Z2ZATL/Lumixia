import type { LocalDevWorkerDockerCleanupResult } from './localDevWorkerDockerCleanupAdapter.ts';
import type { LocalDevWorkerDockerReadinessResult } from './localDevWorkerDockerReadiness.ts';
import type { LocalDevWorkerDockerContainerSmokeResult } from './localDevWorkerDockerContainerSmokeAdapter.ts';

export interface LocalDevWorkerDockerSmokeLifecyclePolicy {
  cleanupOnSuccess: boolean;
  cleanupOnFailure: boolean;
  cleanupOnTimeout: boolean;
  cleanupIfSmokeBlocked: false;
  cleanupIfReadinessUnavailable: false;
}

export interface LocalDevWorkerDockerSmokeCleanupDecision {
  cleanupRequired: boolean;
  rejectionCodes: string[];
  warnings: string[];
}

export type LocalDevWorkerDockerSmokeLifecycleOutcome =
  | 'success'
  | 'readiness_unavailable'
  | 'smoke_policy_blocked'
  | 'smoke_unavailable_or_failed'
  | 'smoke_timeout_cleanup_attempted'
  | 'cleanup_success'
  | 'cleanup_target_not_found'
  | 'cleanup_failed_structured'
  | 'policy_blocked';

export const DEFAULT_LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_POLICY: LocalDevWorkerDockerSmokeLifecyclePolicy =
  {
    cleanupOnSuccess: true,
    cleanupOnFailure: true,
    cleanupOnTimeout: true,
    cleanupIfSmokeBlocked: false,
    cleanupIfReadinessUnavailable: false,
  };

export function aggregateLifecycleRejectionCodes(
  ...codeGroups: readonly (readonly string[] | undefined)[]
) {
  return [...new Set(codeGroups.flatMap((codes) => codes ?? []))];
}

export function canTransitionLifecycleStage(input: {
  from: string;
  to: string;
}) {
  const allowed = new Set([
    'not_started->readiness_checked',
    'readiness_checked->completed',
    'readiness_checked->cleanup_skipped',
    'readiness_checked->smoke_blocked',
    'readiness_checked->smoke_executed',
    'smoke_blocked->cleanup_skipped',
    'smoke_executed->audit_created',
    'audit_created->cleanup_skipped',
    'audit_created->cleanup_attempted',
    'cleanup_skipped->completed',
    'cleanup_attempted->completed',
  ]);

  return allowed.has(`${input.from}->${input.to}`);
}

export function evaluateDockerSmokeLifecycleCleanupDecision(input: {
  readiness: LocalDevWorkerDockerReadinessResult;
  smoke?: LocalDevWorkerDockerContainerSmokeResult;
  policy?: Partial<LocalDevWorkerDockerSmokeLifecyclePolicy>;
}): LocalDevWorkerDockerSmokeCleanupDecision {
  const policy = {
    ...DEFAULT_LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_POLICY,
    ...input.policy,
  };

  if (input.readiness.readinessState !== 'daemon_available') {
    return {
      cleanupRequired: policy.cleanupIfReadinessUnavailable,
      rejectionCodes: policy.cleanupIfReadinessUnavailable
        ? []
        : ['cleanup_skipped_readiness_unavailable'],
      warnings: ['Readiness unavailable; smoke was not attempted.'],
    };
  }

  if (!input.smoke) {
    return {
      cleanupRequired: false,
      rejectionCodes: ['cleanup_skipped_no_smoke_result'],
      warnings: ['No smoke result exists.'],
    };
  }

  if (input.smoke.executionMode === 'blocked') {
    return {
      cleanupRequired: policy.cleanupIfSmokeBlocked,
      rejectionCodes: policy.cleanupIfSmokeBlocked
        ? []
        : ['cleanup_skipped_smoke_policy_blocked'],
      warnings: ['Smoke was policy-blocked; cleanup is skipped.'],
    };
  }

  if (
    policy.cleanupOnTimeout &&
    (input.smoke.timedOut ||
      input.smoke.cleanupRisk === 'unknown_after_timeout')
  ) {
    return {
      cleanupRequired: true,
      rejectionCodes: [],
      warnings: ['Smoke timed out or has unknown cleanup risk.'],
    };
  }

  if (policy.cleanupOnSuccess && input.smoke.ok) {
    return {
      cleanupRequired: true,
      rejectionCodes: [],
      warnings: [],
    };
  }

  if (
    policy.cleanupOnFailure &&
    (input.smoke.executionAttempted || input.smoke.containerStarted)
  ) {
    return {
      cleanupRequired: true,
      rejectionCodes: [],
      warnings: ['Smoke attempted execution; exact cleanup is allowed.'],
    };
  }

  return {
    cleanupRequired: false,
    rejectionCodes: ['cleanup_skipped_no_cleanup_condition'],
    warnings: ['No cleanup condition matched.'],
  };
}

export function classifyDockerSmokeLifecycleOutcome(input: {
  readiness: LocalDevWorkerDockerReadinessResult;
  smoke?: LocalDevWorkerDockerContainerSmokeResult;
  cleanup?: LocalDevWorkerDockerCleanupResult;
  cleanupAttempted: boolean;
  preflightBlocked?: boolean;
}): LocalDevWorkerDockerSmokeLifecycleOutcome {
  if (input.preflightBlocked) {
    return 'policy_blocked';
  }

  if (input.readiness.readinessState !== 'daemon_available') {
    return input.readiness.readinessState === 'probe_blocked'
      ? 'policy_blocked'
      : 'readiness_unavailable';
  }

  if (!input.smoke) {
    return 'readiness_unavailable';
  }

  if (input.smoke.executionMode === 'blocked') {
    return 'smoke_policy_blocked';
  }

  if (input.cleanup?.outcome === 'policy_blocked') {
    return 'policy_blocked';
  }

  if (input.smoke.timedOut && input.cleanupAttempted) {
    return 'smoke_timeout_cleanup_attempted';
  }

  if (input.cleanup?.outcome === 'cleanup_success') {
    return 'cleanup_success';
  }

  if (input.cleanup?.outcome === 'cleanup_target_not_found') {
    return 'cleanup_target_not_found';
  }

  if (
    input.cleanup &&
    ['docker_cli_unavailable', 'docker_daemon_unavailable', 'timeout', 'cleanup_failed'].includes(
      input.cleanup.outcome,
    )
  ) {
    return 'cleanup_failed_structured';
  }

  if (!input.smoke.ok) {
    return 'smoke_unavailable_or_failed';
  }

  return 'success';
}
