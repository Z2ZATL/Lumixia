export type LocalDevWorkerDockerSmokeOutcome =
  | 'success'
  | 'docker_cli_unavailable'
  | 'docker_daemon_unavailable'
  | 'image_unavailable_locally'
  | 'timeout'
  | 'policy_blocked'
  | 'execution_failed'
  | 'unexpected_output';

export interface LocalDevWorkerDockerSmokeOutcomeInput {
  ok: boolean;
  executionMode: 'blocked' | 'executed';
  executionAttempted: boolean;
  containerStarted: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  rejectionCodes: readonly string[];
}

function hasCode(
  rejectionCodes: readonly string[],
  codes: readonly string[],
) {
  const observed = new Set(rejectionCodes);

  return codes.some((code) => observed.has(code));
}

export function normalizeLocalDevWorkerDockerSmokeOutcome(
  input: LocalDevWorkerDockerSmokeOutcomeInput,
): LocalDevWorkerDockerSmokeOutcome {
  if (
    input.ok &&
    input.exitCode === 0 &&
    input.stdout.toLowerCase().includes('hello')
  ) {
    return 'success';
  }

  if (
    hasCode(input.rejectionCodes, [
      'optional_docker_cli_unavailable',
      'docker_cli_unavailable',
    ])
  ) {
    return 'docker_cli_unavailable';
  }

  if (
    hasCode(input.rejectionCodes, [
      'docker_daemon_unavailable',
      'docker_daemon_not_ready',
    ])
  ) {
    return 'docker_daemon_unavailable';
  }

  if (hasCode(input.rejectionCodes, ['container_smoke_image_unavailable'])) {
    return 'image_unavailable_locally';
  }

  if (input.timedOut) {
    return 'timeout';
  }

  if (input.executionMode === 'blocked' || !input.executionAttempted) {
    return 'policy_blocked';
  }

  if (input.exitCode !== null && input.exitCode !== 0) {
    return 'execution_failed';
  }

  if (input.exitCode === 0 && !input.stdout.toLowerCase().includes('hello')) {
    return 'unexpected_output';
  }

  return 'execution_failed';
}
