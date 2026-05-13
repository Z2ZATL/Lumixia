export type LocalDevWorkerDockerContainerCommandPolicyDecision =
  | 'allow'
  | 'deny';

export interface LocalDevWorkerDockerContainerCommandPolicyResult {
  decision: LocalDevWorkerDockerContainerCommandPolicyDecision;
  rejectionCodes: string[];
  warnings: string[];
}

const SHELL_TOKENS = ['sh', 'bash', 'zsh', 'fish', 'powershell', 'pwsh', 'cmd', 'cmd.exe'];
const SHELL_METACHARACTERS = [';', '&&', '||', '|', '>', '>>', '<', '`', '$(', '&'];
const PACKAGE_INSTALL_PATTERNS = [
  'npm install',
  'pnpm add',
  'yarn add',
  'pip install',
  'poetry add',
  'cargo add',
  'go get',
];
const NETWORK_PATTERNS = ['curl', 'wget', 'git clone'];
const FILE_WRITE_TOKENS = ['touch', 'mkdir', 'tee', 'cp', 'mv'];
const DESTRUCTIVE_TOKENS = ['rm', 'chmod', 'chown', 'dd', 'mkfs'];
const SECRET_PATTERNS = ['.env', 'secret', 'token', 'service_role', 'api_key'];
const ALLOWED_COMMANDS = new Set(['echo', 'pwd', 'node --version', 'python --version']);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function commandText(command: readonly string[]) {
  return command.map((part) => part.trim()).filter(Boolean).join(' ');
}

function normalizedCommandText(command: readonly string[]) {
  return normalize(commandText(command).replace(/\s+/g, ' '));
}

function hasPattern(value: string, patterns: readonly string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export function evaluateLocalDevWorkerDockerContainerCommandPolicy(input: {
  command: readonly string[];
}): LocalDevWorkerDockerContainerCommandPolicyResult {
  const command = input.command;
  const firstToken = normalize(command[0] ?? '');
  const fullCommand = normalizedCommandText(command);
  const rejectionCodes: string[] = [];

  if (command.length === 0 || !firstToken) {
    rejectionCodes.push('container_command_not_allowlisted');
  }

  if (SHELL_TOKENS.includes(firstToken)) {
    rejectionCodes.push('container_shell_denied');
  }

  if (command.some((part) => hasPattern(part, SHELL_METACHARACTERS))) {
    rejectionCodes.push('container_shell_metacharacter_denied');
  }

  if (hasPattern(fullCommand, PACKAGE_INSTALL_PATTERNS)) {
    rejectionCodes.push('container_package_install_denied');
  }

  if (hasPattern(fullCommand, NETWORK_PATTERNS)) {
    rejectionCodes.push('container_network_command_denied');
  }

  if (FILE_WRITE_TOKENS.includes(firstToken)) {
    rejectionCodes.push('container_file_write_denied');
  }

  if (DESTRUCTIVE_TOKENS.includes(firstToken)) {
    rejectionCodes.push('container_file_write_denied');
  }

  if (hasPattern(fullCommand, SECRET_PATTERNS)) {
    rejectionCodes.push('container_secret_access_denied');
  }

  if (firstToken === 'docker') {
    rejectionCodes.push('container_docker_command_denied');
  }

  if (!ALLOWED_COMMANDS.has(fullCommand) && firstToken !== 'echo') {
    rejectionCodes.push('container_command_not_allowlisted');
  }

  return {
    decision: rejectionCodes.length === 0 ? 'allow' : 'deny',
    rejectionCodes:
      rejectionCodes.length === 0
        ? ['container_command_allowed']
        : [...new Set(rejectionCodes)],
    warnings: [],
  };
}

