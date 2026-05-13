import type { LocalDevWorkerCommandRequest } from './localDevWorkerContract.ts';

export interface LocalDevWorkerDockerDaemonReadinessPolicyRejection {
  code: string;
  message: string;
}

export interface LocalDevWorkerDockerDaemonReadinessPolicyResult {
  allowed: boolean;
  rejectionCodes: string[];
  rejections: LocalDevWorkerDockerDaemonReadinessPolicyRejection[];
}

const DOCKER_READINESS_CAPABILITY_ID = 'capability.docker.daemon.readiness';
const EXACT_DOCKER_READINESS_ARGS = [
  'version',
  '--format',
  '{{json .}}',
] as const;
const SHELL_METACHARACTERS = [';', '&&', '||', '|', '>', '>>', '<', '`', '$('];
const RUNTIME_COMMANDS = new Set([
  'build',
  'compose',
  'container',
  'cp',
  'exec',
  'image',
  'login',
  'pull',
  'push',
  'run',
]);
const DENIED_DAEMON_STATE_COMMANDS = new Set([
  'context',
  'info',
  'inspect',
  'network',
  'system',
  'volume',
]);
const SOCKET_PATTERNS = ['docker.sock', '/var/run/docker.sock'];
const HOME_PATTERNS = ['~', '$home', '%userprofile%', '/home/', '/users/'];
const MOUNT_FLAGS = new Set(['--mount', '-v', '--volume']);

function reject(
  code: string,
  message: string,
): LocalDevWorkerDockerDaemonReadinessPolicyRejection {
  return { code, message };
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function commandText(request: LocalDevWorkerCommandRequest) {
  return [request.command, ...request.args].join(' ').trim().toLowerCase();
}

function exactArgs(args: readonly string[]) {
  return (
    args.length === EXACT_DOCKER_READINESS_ARGS.length &&
    args.every((arg, index) => arg === EXACT_DOCKER_READINESS_ARGS[index])
  );
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
      MOUNT_FLAGS.has(normalizedArg) ||
      normalizedArg.startsWith('--mount=') ||
      normalizedArg.startsWith('--volume=') ||
      normalizedArg.startsWith('-v=')
    );
  });
}

export function evaluateLocalDevWorkerDockerDaemonReadinessPolicy(input: {
  request: LocalDevWorkerCommandRequest;
  capabilityId?: string;
}): LocalDevWorkerDockerDaemonReadinessPolicyResult {
  const rejections: LocalDevWorkerDockerDaemonReadinessPolicyRejection[] = [];
  const command = normalize(input.request.command);
  const firstArg = normalize(input.request.args[0] ?? '');
  const fullCommand = commandText(input.request);

  if (input.capabilityId !== DOCKER_READINESS_CAPABILITY_ID) {
    rejections.push(
      reject(
        'docker_readiness_capability_not_allowed',
        'Docker readiness requires capability.docker.daemon.readiness.',
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
        'docker_readiness_command_not_allowed',
        'Docker readiness allows only the docker executable.',
      ),
    );
  } else if (command !== 'docker') {
    rejections.push(
      reject(
        'docker_readiness_command_not_allowed',
        'Docker readiness allows only the docker executable.',
      ),
    );
  }

  if (!exactArgs(input.request.args)) {
    rejections.push(
      reject(
        'docker_readiness_args_not_exact',
        'Docker readiness allows exactly docker version --format "{{json .}}".',
      ),
    );
  }

  if (RUNTIME_COMMANDS.has(firstArg)) {
    rejections.push(
      reject(
        'docker_runtime_command_denied',
        `Docker runtime command remains denied: docker ${firstArg}.`,
      ),
    );
  }

  if (DENIED_DAEMON_STATE_COMMANDS.has(firstArg)) {
    rejections.push(
      reject(
        'docker_daemon_state_command_not_allowed',
        `Docker daemon-state command is not allowed for readiness: docker ${firstArg}.`,
      ),
    );
  }

  if (firstArg === 'version' && !exactArgs(input.request.args)) {
    rejections.push(
      reject(
        'docker_daemon_state_command_not_allowed',
        'docker version is allowed only with the exact JSON format args.',
      ),
    );
  }

  if (hasShellMetacharacter(fullCommand)) {
    rejections.push(
      reject(
        'docker_shell_metacharacter_denied',
        'Docker readiness denies shell metacharacters, chaining, pipes, and redirection.',
      ),
    );
  }

  if (hasAnyPattern(fullCommand, SOCKET_PATTERNS)) {
    rejections.push(
      reject('docker_socket_denied', 'Docker socket references remain denied.'),
    );
  }

  if (
    hasAnyPattern(fullCommand, HOME_PATTERNS) ||
    hasMountFlag(input.request.args)
  ) {
    rejections.push(
      reject(
        'docker_mount_denied',
        'Docker readiness denies mounts and user home references.',
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
