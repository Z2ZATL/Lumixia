import { localDevSandboxConfig } from './localDevSandboxConfig';

export interface LocalDevCommandRejection {
  code: string;
  message: string;
}

export interface LocalDevCommandClassification {
  allowed: boolean;
  normalizedCommand: string;
  rejections: LocalDevCommandRejection[];
}

const SHELL_CHAINING_TOKENS = [';', '&&', '||', '|', '>', '>>', '<', '`', '$('];
const PACKAGE_INSTALL_PATTERNS = [
  'npm install',
  'pnpm add',
  'yarn add',
  'pip install',
  'poetry add',
  'cargo add',
  'go get',
];
const NETWORK_COMMANDS = ['curl', 'wget'];
const NETWORK_PATTERNS = ['git clone'];
const FILE_WRITE_COMMANDS = ['touch', 'mkdir', 'cp', 'mv', 'tee'];
const UNSAFE_SYSTEM_COMMANDS = [
  'docker',
  'sudo',
  'ssh',
  'scp',
  'powershell',
  'powershell.exe',
  'pwsh',
  'cmd',
  'cmd.exe',
  'rm',
  'chmod',
  'chown',
  'dd',
  'mkfs',
];

function commandToString(command: readonly string[]) {
  return command.map((part) => part.trim()).filter(Boolean).join(' ').trim();
}

function normalizeCommand(command: readonly string[]) {
  return commandToString(command).replace(/\s+/g, ' ').toLowerCase();
}

function firstToken(command: readonly string[]) {
  return command[0]?.trim().toLowerCase() ?? '';
}

function rejectByFirstToken(
  command: readonly string[],
  deniedTokens: readonly string[],
  code: string,
  message: string,
): LocalDevCommandRejection[] {
  const token = firstToken(command);

  return deniedTokens.includes(token) ? [{ code, message }] : [];
}

function matchesPattern(commandString: string, pattern: string) {
  return commandString === pattern || commandString.startsWith(`${pattern} `);
}

export function isAllowedLocalDevVersionCommand(
  command: readonly string[],
  allowedCommands = localDevSandboxConfig.allowedVersionCommands,
) {
  const normalizedCommand = normalizeCommand(command);

  return allowedCommands.some(
    (allowedCommand) => normalizedCommand === allowedCommand,
  );
}

export function rejectShellChaining(
  command: readonly string[],
): LocalDevCommandRejection[] {
  const commandString = commandToString(command);

  return SHELL_CHAINING_TOKENS.filter((token) =>
    commandString.includes(token),
  ).map((token) => ({
    code: 'local_dev_shell_chaining_denied',
    message: `Shell chaining or redirection token is denied: ${token}`,
  }));
}

export function rejectPackageInstall(
  command: readonly string[],
): LocalDevCommandRejection[] {
  const normalizedCommand = normalizeCommand(command);

  return PACKAGE_INSTALL_PATTERNS.filter((pattern) =>
    matchesPattern(normalizedCommand, pattern),
  ).map((pattern) => ({
    code: 'local_dev_package_install_denied',
    message: `Package installation is denied in local-dev execution: ${pattern}`,
  }));
}

export function rejectNetworkCommand(
  command: readonly string[],
): LocalDevCommandRejection[] {
  const normalizedCommand = normalizeCommand(command);
  const networkCommandRejections = rejectByFirstToken(
    command,
    NETWORK_COMMANDS,
    'local_dev_network_command_denied',
    'Network commands are denied in the local-dev Docker prototype.',
  );
  const networkPatternRejections = NETWORK_PATTERNS.filter((pattern) =>
    matchesPattern(normalizedCommand, pattern),
  ).map((pattern) => ({
    code: 'local_dev_network_command_denied',
    message: `Network/repository ingestion command is denied: ${pattern}`,
  }));

  return [...networkCommandRejections, ...networkPatternRejections];
}

export function rejectFileWriteCommand(
  command: readonly string[],
): LocalDevCommandRejection[] {
  return rejectByFirstToken(
    command,
    FILE_WRITE_COMMANDS,
    'local_dev_file_write_denied',
    'File write commands are denied in the local-dev Docker prototype.',
  );
}

export function rejectDockerCommand(
  command: readonly string[],
): LocalDevCommandRejection[] {
  return rejectByFirstToken(
    command,
    UNSAFE_SYSTEM_COMMANDS,
    'local_dev_unsafe_system_command_denied',
    'Docker, privilege, shell, remote access, and destructive system commands are denied.',
  );
}

export function classifyLocalDevCommand(
  command: readonly string[],
): LocalDevCommandClassification {
  const normalizedCommand = normalizeCommand(command);
  const rejections = [
    ...rejectShellChaining(command),
    ...rejectPackageInstall(command),
    ...rejectNetworkCommand(command),
    ...rejectFileWriteCommand(command),
    ...rejectDockerCommand(command),
  ];

  if (
    normalizedCommand.length > 0 &&
    !isAllowedLocalDevVersionCommand(command)
  ) {
    rejections.push({
      code: 'local_dev_command_not_allowlisted',
      message:
        'Command is not in the local-dev version/identity command allowlist.',
    });
  }

  if (!normalizedCommand) {
    rejections.push({
      code: 'local_dev_empty_command',
      message: 'Command cannot be empty.',
    });
  }

  return {
    allowed: rejections.length === 0,
    normalizedCommand,
    rejections,
  };
}
