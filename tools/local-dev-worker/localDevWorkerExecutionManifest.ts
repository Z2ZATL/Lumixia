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
  riskLevel: LocalDevWorkerExecutionCapability['riskLevel'] = 'low',
  outputBytes = 2048,
  timeoutMs = 3000,
): LocalDevWorkerExecutionCapability {
  return {
    capabilityId,
    command,
    args,
    riskLevel,
    category,
    networkRequired: false,
    fileWriteRequired: false,
    dockerRequired,
    shellRequired: false,
    allowedInProduction: false,
    requiresManualReview: true,
    defaultEnabled: false,
    expectedOutputKind,
    timeoutMs,
    maxStdoutBytes: outputBytes,
    maxStderrBytes: outputBytes,
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
  capability(
    'capability.docker.daemon.readiness',
    'docker',
    ['version', '--format', '{{json .}}'],
    'metadata',
    'metadata-string',
    true,
    'medium',
    4096,
  ),
  capability('capability.pwd.identity', 'pwd', [], 'identity', 'identity-string'),
  capability('capability.echo.metadata', 'echo', [], 'metadata', 'metadata-string'),
  capability(
    'capability.docker.container.smoke.echo',
    'docker',
    [
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
    ],
    'smoke',
    'metadata-string',
    true,
    'high',
    4096,
    5000,
  ),
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
