import {
  LOCAL_DEV_WORKER_ALLOWED_VERSION_COMMANDS,
  type LocalDevWorkerCommandClassification,
  type LocalDevWorkerCommandRejection,
  type LocalDevWorkerCommandRequest,
} from './localDevWorkerContract';

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
const NETWORK_COMMAND_PATTERNS = ['curl', 'wget', 'git clone'];
const DOCKER_RUNTIME_PATTERNS = [
  'docker run',
  'docker build',
  'docker compose',
  'docker-compose',
];
const FILE_WRITE_PATTERNS = [
  'touch',
  'mkdir',
  'cp',
  'mv',
  'tee',
  'cat >',
  'printf >',
];
const ARBITRARY_SHELL_PATTERNS = [
  'bash',
  'sh',
  'zsh',
  'fish',
  'powershell',
  'powershell.exe',
  'pwsh',
  'cmd',
  'cmd.exe',
];
const UNSAFE_SYSTEM_PATTERNS = [
  'sudo',
  'ssh',
  'scp',
  'rm',
  'chmod',
  'chown',
  'dd',
  'mkfs',
];
const SECRET_ACCESS_PATTERNS = [
  'service_role',
  'supabase_service_role',
  'supabase_service_role_key',
  'stripe_secret_key',
  'openai_api_key',
  'anthropic_api_key',
  'github_token',
  '.env',
  'secret',
  'token',
];
const HOME_MOUNT_PATTERNS = ['~', '$home', '%userprofile%', '/users/', '/home/'];
const DOCKER_SOCKET_PATTERNS = ['docker.sock', 'var/run/docker'];

function commandParts(request: LocalDevWorkerCommandRequest) {
  return [request.command, ...request.args].map((part) => part.trim());
}

function commandToString(request: LocalDevWorkerCommandRequest) {
  return commandParts(request).filter(Boolean).join(' ').trim();
}

function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function firstToken(request: LocalDevWorkerCommandRequest) {
  return normalize(request.command);
}

function reject(
  code: string,
  message: string,
): LocalDevWorkerCommandRejection {
  return { code, message };
}

function matchFirstToken(
  request: LocalDevWorkerCommandRequest,
  patterns: readonly string[],
) {
  const token = firstToken(request);

  return patterns.filter((pattern) => token === pattern);
}

function matchCommandText(
  normalizedCommand: string,
  patterns: readonly string[],
) {
  return patterns.filter(
    (pattern) =>
      normalizedCommand === pattern ||
      normalizedCommand.startsWith(`${pattern} `) ||
      normalizedCommand.includes(` ${pattern} `),
  );
}

export function rejectShellChaining(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  const command = commandToString(request);

  return SHELL_CHAINING_TOKENS.filter((token) => command.includes(token)).map(
    (token) =>
      reject(
        'worker_shell_chaining_denied',
        `Shell chaining, pipes, or redirection are denied: ${token}`,
      ),
  );
}

export function rejectPackageInstall(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  const normalizedCommand = normalize(commandToString(request));

  return matchCommandText(normalizedCommand, PACKAGE_INSTALL_PATTERNS).map(
    (pattern) =>
      reject(
        'worker_package_install_denied',
        `Package installation is denied: ${pattern}`,
      ),
  );
}

export function rejectNetworkCommand(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  const normalizedCommand = normalize(commandToString(request));

  return matchCommandText(normalizedCommand, NETWORK_COMMAND_PATTERNS).map(
    (pattern) =>
      reject(
        'worker_network_denied',
        `Network or repository ingestion command is denied: ${pattern}`,
      ),
  );
}

export function rejectDockerRuntimeCommand(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  const normalizedCommand = normalize(commandToString(request));

  return matchCommandText(normalizedCommand, DOCKER_RUNTIME_PATTERNS).map(
    (pattern) =>
      reject(
        'worker_docker_runtime_denied',
        `Docker runtime command remains denied: ${pattern}`,
      ),
  );
}

export function rejectFileWriteCommand(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  const normalizedCommand = normalize(commandToString(request));

  return matchCommandText(normalizedCommand, FILE_WRITE_PATTERNS).map(
    (pattern) =>
      reject(
        'worker_file_write_denied',
        `Filesystem write pattern is denied: ${pattern}`,
      ),
  );
}

export function rejectHomeMountOrDockerSocket(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  const normalizedCommand = normalize(commandToString(request));
  const homeMounts = matchCommandText(normalizedCommand, HOME_MOUNT_PATTERNS);
  const dockerSockets = matchCommandText(
    normalizedCommand,
    DOCKER_SOCKET_PATTERNS,
  );

  return [
    ...homeMounts.map((pattern) =>
      reject(
        'worker_home_mount_denied',
        `User home directory exposure is denied: ${pattern}`,
      ),
    ),
    ...dockerSockets.map((pattern) =>
      reject(
        'worker_docker_socket_denied',
        `Docker socket exposure is denied: ${pattern}`,
      ),
    ),
  ];
}

export function rejectSecretAccess(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  const normalizedCommand = normalize(commandToString(request));

  return matchCommandText(normalizedCommand, SECRET_ACCESS_PATTERNS).map(
    (pattern) =>
      reject(
        'worker_secret_access_denied',
        `Secret or token access pattern is denied: ${pattern}`,
      ),
  );
}

export function rejectArbitraryShellOrSystemCommand(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandRejection[] {
  return [
    ...matchFirstToken(request, ARBITRARY_SHELL_PATTERNS).map((pattern) =>
      reject(
        'worker_shell_denied',
        `Arbitrary shell execution is denied: ${pattern}`,
      ),
    ),
    ...matchFirstToken(request, UNSAFE_SYSTEM_PATTERNS).map((pattern) =>
      reject(
        'worker_system_command_denied',
        `Unsafe system command is denied: ${pattern}`,
      ),
    ),
  ];
}

export function isAllowedLocalDevWorkerVersionCommand(
  request: LocalDevWorkerCommandRequest,
) {
  const normalizedCommand = normalize(commandToString(request));

  return LOCAL_DEV_WORKER_ALLOWED_VERSION_COMMANDS.some(
    (allowedCommand) => normalizedCommand === allowedCommand,
  );
}

export function classifyLocalDevWorkerCommand(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandClassification {
  const normalizedCommand = normalize(commandToString(request));
  const rejections = [
    ...rejectShellChaining(request),
    ...rejectPackageInstall(request),
    ...rejectNetworkCommand(request),
    ...rejectDockerRuntimeCommand(request),
    ...rejectFileWriteCommand(request),
    ...rejectHomeMountOrDockerSocket(request),
    ...rejectSecretAccess(request),
    ...rejectArbitraryShellOrSystemCommand(request),
  ];

  if (request.source !== 'dremo-local-dev-sandbox') {
    rejections.push(
      reject(
        'worker_invalid_source',
        'Worker request source must be dremo-local-dev-sandbox.',
      ),
    );
  }

  if (request.expectedEnvironment !== 'local-dev') {
    rejections.push(
      reject(
        'worker_invalid_environment',
        'Worker expectedEnvironment must be local-dev.',
      ),
    );
  }

  if (normalizedCommand.length === 0) {
    rejections.push(reject('worker_empty_command', 'Command cannot be empty.'));
  }

  if (
    normalizedCommand.length > 0 &&
    !isAllowedLocalDevWorkerVersionCommand(request)
  ) {
    rejections.push(
      reject(
        'worker_command_not_allowlisted',
        'Command is not in the local-dev worker version/identity allowlist.',
      ),
    );
  }

  return {
    allowedByClassification: rejections.length === 0,
    normalizedCommand,
    rejections,
  };
}
