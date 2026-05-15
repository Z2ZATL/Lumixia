import type { LocalDevWorkerDockerSmokeLifecycleOutcome } from './localDevWorkerDockerSmokeLifecycle.ts';

export interface LocalDevWorkerDockerSmokeLifecycleReportPolicy {
  outcome: LocalDevWorkerDockerSmokeLifecycleOutcome;
  nextRecommendedAction: string;
  warnings: readonly string[];
}

const NEXT_ACTION_BY_OUTCOME: Record<
  LocalDevWorkerDockerSmokeLifecycleOutcome,
  string
> = {
  success:
    'Smoke lifecycle completed. Continue with report review or telemetry formatting.',
  cleanup_success:
    'Smoke lifecycle completed and exact cleanup succeeded. Continue with report review or telemetry formatting.',
  cleanup_target_not_found:
    'Cleanup target was already absent; no unsafe cleanup expansion is needed.',
  readiness_unavailable:
    'Docker daemon is unavailable. Check Docker Desktop, but do not expand execution.',
  smoke_policy_blocked:
    'Smoke was blocked by policy. Review exact trusted local-dev gates.',
  smoke_unavailable_or_failed:
    'Smoke execution did not complete. Review structured stderr and local image availability.',
  smoke_timeout_cleanup_attempted:
    'Smoke timed out and exact cleanup was attempted. Review cleanup outcome.',
  cleanup_failed_structured:
    'Cleanup failed in a structured way. Do not add broad cleanup; review exact target behavior.',
  policy_blocked:
    'Policy blocked lifecycle before execution. Review trusted local-dev gates.',
};

const WARNINGS_BY_OUTCOME: Record<
  LocalDevWorkerDockerSmokeLifecycleOutcome,
  readonly string[]
> = {
  success: [],
  cleanup_success: [],
  cleanup_target_not_found: [
    'Cleanup target was already absent; this is acceptable for local-dev smoke cleanup.',
  ],
  readiness_unavailable: [
    'Readiness was unavailable, so smoke and cleanup should remain skipped.',
  ],
  smoke_policy_blocked: [
    'Smoke policy blocked execution; do not bypass the exact smoke command policy.',
  ],
  smoke_unavailable_or_failed: [
    'Smoke failed or was unavailable; inspect sanitized output before changing policy.',
  ],
  smoke_timeout_cleanup_attempted: [
    'Timeout creates cleanup uncertainty; review exact cleanup outcome only.',
  ],
  cleanup_failed_structured: [
    'Cleanup failed structurally; do not add broad listing, inspect, prune, or wildcard cleanup.',
  ],
  policy_blocked: [
    'Lifecycle was blocked before execution; verify trusted local-dev review, source, environment, and exact request shape.',
  ],
};

export function getLocalDevWorkerDockerSmokeLifecycleNextAction(
  outcome: LocalDevWorkerDockerSmokeLifecycleOutcome,
) {
  return NEXT_ACTION_BY_OUTCOME[outcome];
}

export function getLocalDevWorkerDockerSmokeLifecycleWarnings(
  outcome: LocalDevWorkerDockerSmokeLifecycleOutcome,
) {
  return WARNINGS_BY_OUTCOME[outcome];
}

export function evaluateLocalDevWorkerDockerSmokeLifecycleReportPolicy(
  outcome: LocalDevWorkerDockerSmokeLifecycleOutcome,
): LocalDevWorkerDockerSmokeLifecycleReportPolicy {
  return {
    outcome,
    nextRecommendedAction:
      getLocalDevWorkerDockerSmokeLifecycleNextAction(outcome),
    warnings: getLocalDevWorkerDockerSmokeLifecycleWarnings(outcome),
  };
}
