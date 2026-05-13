import {
  capabilityCommandKey,
  normalizeLocalDevWorkerCapabilityCommand,
  type LocalDevWorkerExecutionCapability,
} from './localDevWorkerExecutionCapability.ts';

function capability(
  capabilityId: string,
  command: string,
  args: readonly string[],
  category: LocalDevWorkerExecutionCapability['category'],
  expectedOutputKind: LocalDevWorkerExecutionCapability['expectedOutputKind'],
  dockerRequired = false,
): LocalDevWorkerExecutionCapability {
  return {
    capabilityId,
    command,
    args,
    riskLevel: 'low',
    category,
    networkRequired: false,
    fileWriteRequired: false,
    dockerRequired,
    shellRequired: false,
    allowedInProduction: false,
    requiresManualReview: true,
    defaultEnabled: false,
    expectedOutputKind,
    timeoutMs: 3000,
    maxStdoutBytes: 2048,
    maxStderrBytes: 2048,
  };
}

export const LOCAL_DEV_WORKER_EXECUTION_CAPABILITIES = [
  capability(
    'capability.node.version',
    'node',
    ['--version'],
    'version',
    'version-string',
  ),
  capability(
    'capability.npm.version',
    'npm',
    ['--version'],
    'version',
    'version-string',
  ),
  capability(
    'capability.pnpm.version',
    'pnpm',
    ['--version'],
    'version',
    'version-string',
  ),
  capability(
    'capability.python.version',
    'python',
    ['--version'],
    'version',
    'version-string',
  ),
  capability(
    'capability.git.version',
    'git',
    ['--version'],
    'version',
    'version-string',
  ),
  capability(
    'capability.docker.version',
    'docker',
    ['--version'],
    'version',
    'version-string',
    true,
  ),
  capability('capability.pwd.identity', 'pwd', [], 'identity', 'identity-string'),
  capability('capability.echo.metadata', 'echo', [], 'metadata', 'metadata-string'),
] as const satisfies readonly LocalDevWorkerExecutionCapability[];

export function findLocalDevWorkerExecutionCapability(input: {
  command: string;
  args: readonly string[];
}) {
  const commandKey = normalizeLocalDevWorkerCapabilityCommand(input);

  return LOCAL_DEV_WORKER_EXECUTION_CAPABILITIES.find(
    (capability) => capabilityCommandKey(capability) === commandKey,
  );
}
