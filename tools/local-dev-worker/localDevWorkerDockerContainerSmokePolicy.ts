import type { LocalDevWorkerCommandRequest } from './localDevWorkerContract.ts';

export interface LocalDevWorkerDockerContainerSmokePolicyRejection {
  code: string;
  message: string;
}

export interface LocalDevWorkerDockerContainerSmokePolicyResult {
  allowed: boolean;
  rejectionCodes: string[];
  rejections: LocalDevWorkerDockerContainerSmokePolicyRejection[];
}

export const LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID =
  'capability.docker.container.smoke.echo';

export const LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS = [
  'run',
  '--rm',
  '--network',
  'none',
  '--pull=never',
  '--read-only',
  '--cap-drop',
  'ALL',
  '--security-opt',
  'no-new-privileges',
  '--memory',
  '128m',
  '--cpus',
  '0.5',
  '--pids-limit',
  '64',
  '--user',
  '65534:65534',
  'alpine:3.20',
  'echo',
  'hello',
] as const;

const SHELL_METACHARACTERS = [';', '&&', '||', '|', '>', '>>', '<', '`', '$('];
const SHELL_TOKENS = ['sh', 'bash', 'zsh', 'powershell', 'pwsh', 'cmd', 'cmd.exe'];
const MOUNT_FLAGS = new Set(['--mount', '-v', '--volume']);
const ENV_FLAGS = new Set(['--env', '-e', '--env-file']);
const PRIVILEGED_FLAGS = new Set(['--privileged', '--cap-add']);
const ROOT_USER_VALUES = new Set(['0', '0:0', 'root', 'root:root']);
const SOCKET_PATTERNS = ['docker.sock', '/var/run/docker.sock'];
const HOME_PATTERNS = ['~', '$home', '%userprofile%', '/home/', '/users/'];
const WORKSPACE_PATTERNS = ['/workspace/', 'c:\\users\\', 'documents\\coding project'];

function reject(
  code: string,
  message: string,
): LocalDevWorkerDockerContainerSmokePolicyRejection {
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
    args.length === LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS.length &&
    args.every(
      (arg, index) => arg === LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS[index],
    )
  );
}

function hasAnyPattern(value: string, patterns: readonly string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function includesFlag(args: readonly string[], flags: ReadonlySet<string>) {
  return args.some((arg) => {
    const normalizedArg = normalize(arg);

    return (
      flags.has(normalizedArg) ||
      [...flags].some((flag) => normalizedArg.startsWith(`${flag}=`))
    );
  });
}

function userValues(args: readonly string[]) {
  const values: string[] = [];

  args.forEach((arg, index) => {
    const normalizedArg = normalize(arg);

    if (normalizedArg === '--user') {
      values.push(normalize(args[index + 1] ?? ''));
    } else if (normalizedArg.startsWith('--user=')) {
      values.push(normalizedArg.slice('--user='.length));
    }
  });

  return values;
}

export function evaluateLocalDevWorkerDockerContainerSmokePolicy(input: {
  request: LocalDevWorkerCommandRequest;
  capabilityId?: string;
}): LocalDevWorkerDockerContainerSmokePolicyResult {
  const rejections: LocalDevWorkerDockerContainerSmokePolicyRejection[] = [];
  const command = normalize(input.request.command);
  const args = input.request.args;
  const fullCommand = commandText(input.request);
  const image = args[18] ?? '';
  const containerCommand = args.slice(19);
  const requestedUserValues = userValues(args);

  if (input.capabilityId !== LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID) {
    rejections.push(
      reject(
        'container_smoke_capability_not_allowed',
        'Container smoke execution requires capability.docker.container.smoke.echo.',
      ),
    );
  }

  if (command !== 'docker') {
    rejections.push(
      reject(
        'container_smoke_command_not_allowed',
        'Container smoke execution allows only the docker executable.',
      ),
    );
  }

  if (args[0] !== 'run') {
    rejections.push(
      reject(
        'container_smoke_command_not_allowed',
        'Container smoke execution allows only docker run.',
      ),
    );
  }

  if (!exactArgs(args)) {
    rejections.push(
      reject(
        'container_smoke_args_not_exact',
        'Container smoke execution requires the exact reviewed docker run argument array.',
      ),
    );
  }

  if (image !== 'alpine:3.20') {
    rejections.push(
      reject(
        'container_smoke_image_not_allowed',
        'Container smoke execution allows only alpine:3.20.',
      ),
    );
  }

  if (!args.includes('--pull=never')) {
    rejections.push(
      reject(
        'container_smoke_pull_never_required',
        'Container smoke execution requires --pull=never.',
      ),
    );
  }

  if (args.includes('--pull') || args.includes('--pull=always')) {
    rejections.push(
      reject(
        'container_smoke_pull_never_required',
        'Container smoke execution denies pull policies other than never.',
      ),
    );
  }

  const networkIndex = args.indexOf('--network');
  if (networkIndex === -1 || args[networkIndex + 1] !== 'none') {
    rejections.push(
      reject(
        'container_smoke_network_none_required',
        'Container smoke execution requires --network none.',
      ),
    );
  }

  if (args.includes('--network=host') || args.includes('host')) {
    rejections.push(
      reject(
        'container_smoke_network_none_required',
        'Container smoke execution denies host networking.',
      ),
    );
  }

  if (includesFlag(args, MOUNT_FLAGS)) {
    rejections.push(
      reject('container_smoke_mount_denied', 'Mount flags remain denied.'),
    );
  }

  if (includesFlag(args, ENV_FLAGS)) {
    rejections.push(
      reject('container_smoke_env_denied', 'Environment flags remain denied.'),
    );
  }

  if (includesFlag(args, PRIVILEGED_FLAGS)) {
    rejections.push(
      reject(
        'container_smoke_privileged_denied',
        'Privileged mode and capability additions remain denied.',
      ),
    );
  }

  if (
    requestedUserValues.length !== 1 ||
    requestedUserValues[0] !== '65534:65534'
  ) {
    rejections.push(
      reject(
        'container_smoke_non_root_user_required',
        'Container smoke execution requires --user 65534:65534.',
      ),
    );
  }

  if (requestedUserValues.some((value) => ROOT_USER_VALUES.has(value))) {
    rejections.push(
      reject(
        'container_smoke_root_user_denied',
        'Container smoke execution must not run as root.',
      ),
    );
  }

  if (
    containerCommand.some((part) => SHELL_TOKENS.includes(normalize(part))) ||
    hasAnyPattern(fullCommand, SHELL_METACHARACTERS)
  ) {
    rejections.push(
      reject(
        'container_smoke_shell_denied',
        'Shell execution, chaining, pipes, and redirection remain denied.',
      ),
    );
  }

  if (hasAnyPattern(fullCommand, SOCKET_PATTERNS)) {
    rejections.push(
      reject(
        'container_smoke_docker_socket_denied',
        'Docker socket references remain denied.',
      ),
    );
  }

  if (hasAnyPattern(fullCommand, HOME_PATTERNS)) {
    rejections.push(
      reject(
        'container_smoke_home_mount_denied',
        'Home directory references remain denied.',
      ),
    );
  }

  if (hasAnyPattern(fullCommand, WORKSPACE_PATTERNS)) {
    rejections.push(
      reject(
        'container_smoke_workspace_mount_denied',
        'Workspace path references remain denied.',
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
