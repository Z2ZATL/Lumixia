import type { LocalDevWorkerCommandRequest } from './localDevWorkerContract.ts';

export interface LocalDevWorkerDockerProbePolicyRejection {
  code: string;
  message: string;
}

export interface LocalDevWorkerDockerProbePolicyResult {
  allowed: boolean;
  rejectionCodes: string[];
  rejections: LocalDevWorkerDockerProbePolicyRejection[];
}

const DOCKER_VERSION_CAPABILITY_ID = 'capability.docker.version';
const EXACT_DOCKER_VERSION_ARGS = ['--version'] as const;
const SHELL_METACHARACTERS = [';', '&&', '||', '|', '>', '>>', '<', '`', '$('];
const DOCKER_RUNTIME_COMMANDS = new Set([
  'build',
  'compose',
  'cp',
  'exec',
  'login',
  'pull',
  'push',
  'run',
]);
const DOCKER_DAEMON_STATE_COMMANDS = new Set([
  'context',
  'info',
  'inspect',
  'network',
  'system',
  'version',
  'volume',
]);
const DOCKER_SOCKET_PATTERNS = ['docker.sock', '/var/run/docker.sock'];
const DOCKER_HOME_PATTERNS = [
  '~',
  '$home',
  '%userprofile%',
  '/home/',
  '/users/',
];
const DOCKER_MOUNT_FLAGS = new Set(['--mount', '-v', '--volume']);

function reject(
  code: string,
  message: string,
): LocalDevWorkerDockerProbePolicyRejection {
  return { code, message };
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function commandText(request: LocalDevWorkerCommandRequest) {
  return [request.command, ...request.args].join(' ').trim().toLowerCase();
}

function hasShellMetacharacter(value: string) {
  return SHELL_METACHARACTERS.some((token) => value.includes(token));
}

function hasAnyPattern(value: string, patterns: readonly string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function hasMountFlag(args: readonly string[]) {
  return args.some((arg) => {
    const normalizedArg = normalize(arg);

    return (
      DOCKER_MOUNT_FLAGS.has(normalizedArg) ||
      normalizedArg.startsWith('--mount=') ||
      normalizedArg.startsWith('--volume=') ||
      normalizedArg.startsWith('-v=')
    );
  });
}

export function evaluateLocalDevWorkerDockerProbePolicy(input: {
  request: LocalDevWorkerCommandRequest;
  capabilityId?: string;
}): LocalDevWorkerDockerProbePolicyResult {
  const rejections: LocalDevWorkerDockerProbePolicyRejection[] = [];
  const command = normalize(input.request.command);
  const firstArg = normalize(input.request.args[0] ?? '');
  const fullCommand = commandText(input.request);

  if (input.capabilityId !== DOCKER_VERSION_CAPABILITY_ID) {
    rejections.push(
      reject(
        'docker_probe_capability_not_allowed',
        'Docker probe execution requires capability.docker.version.',
      ),
    );
  }

  if (command === 'docker-compose') {
    rejections.push(
      reject(
        'docker_runtime_command_denied',
        'docker-compose is a runtime command and remains denied.',
      ),
    );
    rejections.push(
      reject(
        'docker_probe_command_not_allowed',
        'Docker probe execution allows only the docker executable.',
      ),
    );
  } else if (command !== 'docker') {
    rejections.push(
      reject(
        'docker_probe_command_not_allowed',
        'Docker probe execution allows only the docker executable.',
      ),
    );
  }

  if (
    input.request.args.length !== EXACT_DOCKER_VERSION_ARGS.length ||
    firstArg !== EXACT_DOCKER_VERSION_ARGS[0]
  ) {
    rejections.push(
      reject(
        'docker_probe_args_not_exact',
        'Docker probe execution allows exactly docker --version and no extra arguments.',
      ),
    );
  }

  if (DOCKER_RUNTIME_COMMANDS.has(firstArg)) {
    rejections.push(
      reject(
        'docker_runtime_command_denied',
        `Docker runtime command remains denied: docker ${firstArg}.`,
      ),
    );
  }

  if (DOCKER_DAEMON_STATE_COMMANDS.has(firstArg)) {
    rejections.push(
      reject(
        'docker_daemon_state_command_denied',
        `Docker daemon-state command remains denied: docker ${firstArg}.`,
      ),
    );
  }

  if (hasShellMetacharacter(fullCommand)) {
    rejections.push(
      reject(
        'docker_probe_shell_metacharacter_denied',
        'Docker probe execution denies shell metacharacters, chaining, pipes, and redirection.',
      ),
    );
  }

  if (hasAnyPattern(fullCommand, DOCKER_SOCKET_PATTERNS)) {
    rejections.push(
      reject(
        'docker_socket_denied',
        'Docker socket references remain denied.',
      ),
    );
  }

  if (
    hasAnyPattern(fullCommand, DOCKER_HOME_PATTERNS) ||
    hasMountFlag(input.request.args)
  ) {
    rejections.push(
      reject(
        'docker_mount_denied',
        'Docker probe execution denies mounts and user home references.',
      ),
    );
  }

  const rejectionCodes = [...new Set(rejections.map((entry) => entry.code))];

  return {
    allowed: rejectionCodes.length === 0,
    rejectionCodes,
    rejections,
  };
}
