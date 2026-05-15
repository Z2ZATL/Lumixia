import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME } from './localDevWorkerDockerContainerIdentity.ts';
import type { LocalDevWorkerDockerCleanupPolicyResult } from './localDevWorkerDockerCleanupPolicy.ts';

export interface LocalDevWorkerDockerCleanupFixture {
  name: string;
  command: string;
  args: readonly string[];
  expectedAllowed: boolean;
  expectedRejectionCodes: readonly string[];
  expectedPlanOnly: boolean;
}

function exactFixture(): LocalDevWorkerDockerCleanupFixture {
  return {
    name: 'exact-cleanup-preview-plan-only',
    command: 'docker',
    args: ['rm', '-f', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME],
    expectedAllowed: true,
    expectedRejectionCodes: [],
    expectedPlanOnly: true,
  };
}

function blocked(
  name: string,
  command: string,
  args: readonly string[],
  expectedRejectionCodes: readonly string[],
): LocalDevWorkerDockerCleanupFixture {
  return {
    name,
    command,
    args,
    expectedAllowed: false,
    expectedRejectionCodes,
    expectedPlanOnly: true,
  };
}

export function cleanupFixturePassed(
  fixture: LocalDevWorkerDockerCleanupFixture,
  result: LocalDevWorkerDockerCleanupPolicyResult,
) {
  const observedCodes = new Set(result.rejectionCodes);

  return (
    result.allowed === fixture.expectedAllowed &&
    fixture.expectedRejectionCodes.every((code) => observedCodes.has(code))
  );
}

export const localDevWorkerDockerCleanupFixtures = [
  exactFixture(),
  blocked('arbitrary-container-name-blocked', 'docker', ['rm', '-f', 'other'], [
    'cleanup_target_not_exact',
  ]),
  blocked(
    'container-id-like-target-blocked',
    'docker',
    ['rm', '-f', 'abcdef123456'],
    ['cleanup_target_not_exact', 'cleanup_container_id_denied'],
  ),
  blocked('wildcard-target-blocked', 'docker', ['rm', '-f', '*'], [
    'cleanup_target_not_exact',
    'cleanup_wildcard_denied',
  ]),
  blocked(
    'multiple-targets-blocked',
    'docker',
    ['rm', '-f', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME, 'other'],
    ['cleanup_multiple_targets_denied'],
  ),
  blocked('container-prune-blocked', 'docker', ['container', 'prune'], [
    'cleanup_command_not_allowed',
    'cleanup_prune_denied',
    'cleanup_target_not_exact',
  ]),
  blocked('system-prune-blocked', 'docker', ['system', 'prune'], [
    'cleanup_command_not_allowed',
    'cleanup_prune_denied',
    'cleanup_target_not_exact',
  ]),
  blocked('docker-ps-blocked', 'docker', ['ps'], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
  ]),
  blocked('docker-inspect-blocked', 'docker', ['inspect', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
  ]),
  blocked('docker-stop-blocked', 'docker', ['stop', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
  ]),
  blocked('docker-kill-blocked', 'docker', ['kill', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME], [
    'cleanup_command_not_allowed',
    'cleanup_target_not_exact',
  ]),
  blocked('command-substitution-blocked', 'docker', ['rm', '-f', '$(docker ps)'], [
    'cleanup_target_not_exact',
    'cleanup_shell_metacharacter_denied',
  ]),
  blocked(
    'shell-chaining-blocked',
    'docker',
    ['rm', '-f', `${LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME} && docker ps`],
    ['cleanup_target_not_exact', 'cleanup_shell_metacharacter_denied'],
  ),
  blocked('whitespace-target-blocked', 'docker', ['rm', '-f', 'bad name'], [
    'cleanup_target_not_exact',
  ]),
  blocked('slash-path-target-blocked', 'docker', ['rm', '-f', 'bad/name'], [
    'cleanup_target_not_exact',
  ]),
  blocked('wrong-deterministic-name-blocked', 'docker', ['rm', '-f', 'lumixia-dremo-other'], [
    'cleanup_target_not_exact',
  ]),
  blocked('user-provided-name-blocked', 'docker', ['rm', '-f', 'user-task-123'], [
    'cleanup_target_not_exact',
  ]),
] as const satisfies readonly LocalDevWorkerDockerCleanupFixture[];
