import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME } from './localDevWorkerDockerContainerIdentity.ts';

export interface LocalDevWorkerDockerCleanupPolicyResult {
  allowed: boolean;
  rejectionCodes: string[];
}

export const LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND = [
  'docker',
  'rm',
  '-f',
  LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
] as const;

const SHELL_METACHARACTERS = [';', '&&', '||', '|', '>', '>>', '<', '`', '$('];
const CONTAINER_ID_PATTERN = /^[a-f0-9]{12,64}$/i;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function hasShellMetacharacter(parts: readonly string[]) {
  const text = parts.join(' ');

  return SHELL_METACHARACTERS.some((pattern) => text.includes(pattern));
}

function hasUnsafeTarget(target: string) {
  return (
    target.includes('*') ||
    target.includes('/') ||
    target.includes('\\') ||
    target.includes(' ') ||
    target.includes('\t')
  );
}

export function evaluateLocalDevWorkerDockerCleanupPolicy(input: {
  command: string;
  args: readonly string[];
}): LocalDevWorkerDockerCleanupPolicyResult {
  const command = normalize(input.command);
  const args = input.args.map((arg) => arg.trim());
  const normalizedArgs = args.map(normalize);
  const rejectionCodes: string[] = [];
  const target = args[2] ?? '';

  if (command !== 'docker' || normalizedArgs[0] !== 'rm' || normalizedArgs[1] !== '-f') {
    rejectionCodes.push('cleanup_command_not_allowed');
  }

  if (
    normalizedArgs[0] === 'container' ||
    normalizedArgs[0] === 'system' ||
    normalizedArgs.includes('prune')
  ) {
    rejectionCodes.push('cleanup_prune_denied');
  }

  if (
    normalizedArgs[0] === 'ps' ||
    normalizedArgs[0] === 'inspect' ||
    normalizedArgs[0] === 'stop' ||
    normalizedArgs[0] === 'kill'
  ) {
    rejectionCodes.push('cleanup_command_not_allowed');
  }

  if (hasShellMetacharacter([input.command, ...input.args])) {
    rejectionCodes.push('cleanup_shell_metacharacter_denied');
  }

  if (args.length > 3) {
    rejectionCodes.push('cleanup_multiple_targets_denied');
  }

  if (target !== LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME) {
    rejectionCodes.push('cleanup_target_not_exact');
  }

  if (target.includes('*')) {
    rejectionCodes.push('cleanup_wildcard_denied');
  }

  if (CONTAINER_ID_PATTERN.test(target)) {
    rejectionCodes.push('cleanup_container_id_denied');
  }

  if (hasUnsafeTarget(target)) {
    rejectionCodes.push('cleanup_target_not_exact');
  }

  return {
    allowed: rejectionCodes.length === 0,
    rejectionCodes: [...new Set(rejectionCodes)],
  };
}
