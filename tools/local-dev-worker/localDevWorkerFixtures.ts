import type { LocalDevWorkerDryRunRequest } from './localDevWorkerRequestValidation.ts';

export interface LocalDevWorkerDryRunFixture {
  name: string;
  request: unknown;
  expectedAllowedByClassification: boolean;
  expectedExecutionMode: 'blocked' | 'dry-run';
  expectedNoExecution: true;
  expectedRejectionCodes: readonly string[];
}

function request(
  name: string,
  command: string,
  args: readonly string[],
): LocalDevWorkerDryRunRequest {
  return {
    requestId: `fixture-${name}`,
    command,
    args,
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
    reason: `Dry-run fixture for ${name}.`,
    createdBy: 'local-dev-worker-dry-run-harness',
  };
}

function accepted(
  name: string,
  command: string,
  args: readonly string[] = [],
): LocalDevWorkerDryRunFixture {
  return {
    name,
    request: request(name, command, args),
    expectedAllowedByClassification: true,
    expectedExecutionMode: 'dry-run',
    expectedNoExecution: true,
    expectedRejectionCodes: [],
  };
}

function rejected(
  name: string,
  command: string,
  args: readonly string[],
  expectedRejectionCodes: readonly string[],
): LocalDevWorkerDryRunFixture {
  return {
    name,
    request: request(name, command, args),
    expectedAllowedByClassification: false,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedRejectionCodes,
  };
}

export const localDevWorkerAcceptedDryRunFixtures = [
  accepted('node-version', 'node', ['--version']),
  accepted('npm-version', 'npm', ['--version']),
  accepted('pnpm-version', 'pnpm', ['--version']),
  accepted('python-version', 'python', ['--version']),
  accepted('git-version', 'git', ['--version']),
  accepted('docker-version', 'docker', ['--version']),
  accepted('pwd', 'pwd'),
  accepted('echo', 'echo'),
] as const satisfies readonly LocalDevWorkerDryRunFixture[];

export const localDevWorkerRejectedDryRunFixtures = [
  rejected('npm-install', 'npm', ['install'], [
    'worker_package_install_denied',
  ]),
  rejected('pnpm-add-react', 'pnpm', ['add', 'react'], [
    'worker_package_install_denied',
  ]),
  rejected('yarn-add-vite', 'yarn', ['add', 'vite'], [
    'worker_package_install_denied',
  ]),
  rejected('pip-install-requests', 'pip', ['install', 'requests'], [
    'worker_package_install_denied',
  ]),
  rejected('curl-url', 'curl', ['https://example.com'], [
    'worker_network_denied',
  ]),
  rejected('wget-url', 'wget', ['https://example.com'], [
    'worker_network_denied',
  ]),
  rejected('git-clone', 'git', ['clone', 'https://github.com/example/repo'], [
    'worker_network_denied',
  ]),
  rejected('docker-run', 'docker', ['run', 'alpine'], [
    'worker_docker_runtime_denied',
  ]),
  rejected('docker-build', 'docker', ['build', '.'], [
    'worker_docker_runtime_denied',
  ]),
  rejected('docker-compose', 'docker', ['compose', 'up'], [
    'worker_docker_runtime_denied',
  ]),
  rejected('bash-c', 'bash', ['-c', 'echo hi'], ['worker_shell_denied']),
  rejected('sh-c', 'sh', ['-c', 'echo hi'], ['worker_shell_denied']),
  rejected('powershell', 'powershell', ['Get-ChildItem'], [
    'worker_shell_denied',
  ]),
  rejected('cmd-exe', 'cmd.exe', ['/c', 'dir'], ['worker_shell_denied']),
  rejected('rm-rf-root', 'rm', ['-rf', '/'], ['worker_system_command_denied']),
  rejected('chmod-recursive', 'chmod', ['-R', '777', '.'], [
    'worker_system_command_denied',
  ]),
  rejected('sudo-command', 'sudo', ['echo'], ['worker_system_command_denied']),
  rejected('semicolon', 'node', ['--version;pwd'], [
    'worker_shell_chaining_denied',
  ]),
  rejected('and-chain', 'node', ['--version', '&&', 'pwd'], [
    'worker_shell_chaining_denied',
  ]),
  rejected('or-chain', 'node', ['--version', '||', 'pwd'], [
    'worker_shell_chaining_denied',
  ]),
  rejected('pipe', 'node', ['--version', '|', 'cat'], [
    'worker_shell_chaining_denied',
  ]),
  rejected('redirect-out', 'echo', ['>'], ['worker_shell_chaining_denied']),
  rejected('append-out', 'echo', ['>>'], ['worker_shell_chaining_denied']),
  rejected('redirect-in', 'node', ['<', 'input.txt'], [
    'worker_shell_chaining_denied',
  ]),
  rejected('subshell', 'echo', ['$(whoami)'], [
    'worker_shell_chaining_denied',
  ]),
  rejected('backticks', 'echo', ['`whoami`'], [
    'worker_shell_chaining_denied',
  ]),
  rejected('env-reference', 'echo', ['.env'], [
    'worker_secret_access_denied',
  ]),
  rejected('service-role-reference', 'echo', ['service_role'], [
    'worker_secret_access_denied',
  ]),
  rejected('supabase-service-role-reference', 'echo', [
    'SUPABASE_SERVICE_ROLE',
  ], ['worker_secret_access_denied']),
  rejected('docker-sock-reference', 'echo', ['docker.sock'], [
    'worker_docker_socket_denied',
  ]),
  rejected('var-run-docker-sock-reference', 'echo', [
    '/var/run/docker.sock',
  ], ['worker_docker_socket_denied']),
  rejected('tilde-reference', 'echo', ['~'], ['worker_home_mount_denied']),
  rejected('home-reference', 'echo', ['/home/user'], [
    'worker_home_mount_denied',
  ]),
  rejected('users-reference', 'echo', ['/Users/alice'], [
    'worker_home_mount_denied',
  ]),
  rejected('empty-command', '', [], ['worker_empty_command']),
] as const satisfies readonly LocalDevWorkerDryRunFixture[];

export const localDevWorkerInvalidDryRunFixtures = [
  {
    name: 'invalid-source',
    request: {
      ...request('invalid-source', 'node', ['--version']),
      source: 'browser',
    },
    expectedAllowedByClassification: false,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedRejectionCodes: ['invalid_source'],
  },
  {
    name: 'invalid-expected-environment',
    request: {
      ...request('invalid-expected-environment', 'node', ['--version']),
      expectedEnvironment: 'production',
    },
    expectedAllowedByClassification: false,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedRejectionCodes: ['invalid_environment'],
  },
  {
    name: 'overly-long-command',
    request: request('overly-long-command', 'n'.repeat(180), []),
    expectedAllowedByClassification: false,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedRejectionCodes: ['string_too_long'],
  },
  {
    name: 'multiline-command',
    request: request('multiline-command', 'node\n--version', []),
    expectedAllowedByClassification: false,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedRejectionCodes: ['multiline_value'],
  },
  {
    name: 'null-byte-command',
    request: request('null-byte-command', 'node\0--version', []),
    expectedAllowedByClassification: false,
    expectedExecutionMode: 'blocked',
    expectedNoExecution: true,
    expectedRejectionCodes: ['null_byte_value'],
  },
] as const satisfies readonly LocalDevWorkerDryRunFixture[];

export const localDevWorkerDryRunFixtures = [
  ...localDevWorkerAcceptedDryRunFixtures,
  ...localDevWorkerRejectedDryRunFixtures,
  ...localDevWorkerInvalidDryRunFixtures,
] as const satisfies readonly LocalDevWorkerDryRunFixture[];
