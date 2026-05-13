import type {
  DremoSandboxCommandRequest,
  DremoSandboxOutputInfo,
  DremoSandboxPolicy,
  DremoSandboxPolicyDecision,
  DremoSandboxPolicyValidationResult,
  DremoSandboxPolicyViolation,
  DremoSandboxPolicyWarning,
  DremoSandboxResourceRequest,
} from './sandboxRunner';
import { DEFAULT_DREMO_SANDBOX_POLICY } from './defaultSandboxPolicy';

const SUSPICIOUS_SHELL_METACHARACTERS = [';', '&&', '||', '|', '>', '<', '`', '$('];

const DESTRUCTIVE_COMMAND_PATTERNS = [
  'rm -rf',
  'chmod -r',
  'chown -r',
  'mkfs',
  'dd ',
  'shutdown',
  'reboot',
  'curl | sh',
  'wget | sh',
];

const SENSITIVE_ENV_KEY_PATTERN = /(^|_)(KEY|SECRET|TOKEN)$/i;

const MULTILINE_PATTERN = /\r|\n/;
const MAX_ENV_VALUE_BYTES = 4096;

function createViolation(
  code: string,
  message: string,
  severity: DremoSandboxPolicyViolation['severity'],
  field?: string,
): DremoSandboxPolicyViolation {
  return field ? { code, message, severity, field } : { code, message, severity };
}

function createWarning(
  code: string,
  message: string,
  severity: DremoSandboxPolicyWarning['severity'],
  field?: string,
): DremoSandboxPolicyWarning {
  return field ? { code, message, severity, field } : { code, message, severity };
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function commandToString(command: readonly string[]) {
  return command.map((part) => part.trim()).filter(Boolean).join(' ').trim();
}

function commandToken(command: readonly string[]) {
  return command[0]?.trim().toLowerCase() ?? '';
}

function normalizeCommand(command: readonly string[]) {
  return commandToString(command).replace(/\s+/g, ' ').toLowerCase();
}

function matchesCommandPattern(pattern: string, command: string, firstToken: string) {
  const normalizedPattern = pattern.trim().replace(/\s+/g, ' ').toLowerCase();

  if (!normalizedPattern) {
    return false;
  }

  return (
    command === normalizedPattern ||
    command.startsWith(`${normalizedPattern} `) ||
    firstToken === normalizedPattern ||
    command.includes(normalizedPattern)
  );
}

function isWorkspaceRelativePath(path: string) {
  const trimmed = path.trim();

  return (
    trimmed.length > 0 &&
    !trimmed.startsWith('/') &&
    !/^[a-z]:[\\/]/i.test(trimmed) &&
    !trimmed.startsWith('~') &&
    !trimmed.includes('../') &&
    !trimmed.includes('..\\') &&
    trimmed !== '..'
  );
}

function pathMatchesBlockedPattern(path: string, blockedPath: string) {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
  const normalizedBlocked = blockedPath.replace(/\\/g, '/').toLowerCase();

  if (normalizedBlocked.endsWith('/**')) {
    const prefix = normalizedBlocked.slice(0, -3);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }

  if (normalizedBlocked.endsWith('*')) {
    return normalizedPath.startsWith(normalizedBlocked.slice(0, -1));
  }

  return (
    normalizedPath === normalizedBlocked ||
    normalizedPath.startsWith(`${normalizedBlocked}/`) ||
    normalizedPath.includes(`/${normalizedBlocked}/`) ||
    normalizedPath.endsWith(`/${normalizedBlocked}`)
  );
}

function mergeValidationResults(
  results: DremoSandboxPolicyValidationResult[],
): DremoSandboxPolicyValidationResult {
  const reasons = results.flatMap((result) => result.reasons);
  const warnings = results.flatMap((result) => result.warnings);
  const hasRequiresApproval = results.some(
    (result) => result.decision === 'requires_approval',
  );
  const decision: DremoSandboxPolicyDecision =
    reasons.length > 0
      ? hasRequiresApproval &&
        reasons.every((reason) => reason.code === 'approval_required')
        ? 'requires_approval'
        : 'deny'
      : 'allow';

  return {
    allowed: reasons.length === 0,
    decision,
    reasons,
    warnings,
  };
}

function validateRequestIdentity(
  request: DremoSandboxCommandRequest,
): DremoSandboxPolicyValidationResult {
  const reasons: DremoSandboxPolicyViolation[] = [];
  const requiredFields: Array<keyof DremoSandboxCommandRequest> = [
    'sessionId',
    'taskId',
    'toolCallId',
    'workingDirectory',
    'reason',
  ];

  for (const field of requiredFields) {
    const value = request[field];

    if (typeof value !== 'string' || value.trim().length === 0) {
      reasons.push(
        createViolation(
          'invalid_request',
          `${field} is required for sandbox command validation.`,
          'high',
          field,
        ),
      );
    }
  }

  return {
    allowed: reasons.length === 0,
    decision: reasons.length === 0 ? 'allow' : 'deny',
    reasons,
    warnings: [],
  };
}

export function validateCommandPolicy(
  policy: DremoSandboxPolicy,
  command: readonly string[],
): DremoSandboxPolicyValidationResult {
  const reasons: DremoSandboxPolicyViolation[] = [];
  const warnings: DremoSandboxPolicyWarning[] = [];
  const commandString = normalizeCommand(command);
  const firstToken = commandToken(command);

  if (!commandString || command.length === 0) {
    reasons.push(
      createViolation(
        'invalid_request',
        'Command request must include at least one command token.',
        'high',
        'command',
      ),
    );
  }

  for (const metacharacter of SUSPICIOUS_SHELL_METACHARACTERS) {
    if (commandString.includes(metacharacter)) {
      reasons.push(
        createViolation(
          'command_denied',
          `Command contains blocked shell metacharacter: ${metacharacter}`,
          'high',
          'command',
        ),
      );
    }
  }

  for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
    if (matchesCommandPattern(pattern, commandString, firstToken)) {
      reasons.push(
        createViolation(
          'command_denied',
          `Command matches destructive denied pattern: ${pattern}`,
          'critical',
          'command',
        ),
      );
    }
  }

  for (const pattern of policy.deniedCommands) {
    if (matchesCommandPattern(pattern, commandString, firstToken)) {
      reasons.push(
        createViolation(
          'command_denied',
          `Command matches denied policy pattern: ${pattern}`,
          'high',
          'command',
        ),
      );
    }
  }

  const approvalPattern = policy.approvalRequiredCommands.find((pattern) =>
    matchesCommandPattern(pattern, commandString, firstToken),
  );

  if (approvalPattern) {
    reasons.push(
      createViolation(
        'approval_required',
        `Command requires explicit approval before execution: ${approvalPattern}`,
        'medium',
        'command',
      ),
    );
  }

  const isAllowlisted = policy.allowedCommands.some((pattern) =>
    matchesCommandPattern(pattern, commandString, firstToken),
  );

  if (!isAllowlisted && !approvalPattern && commandString) {
    reasons.push(
      createViolation(
        'command_not_allowlisted',
        'Command is not explicitly allowlisted by the sandbox policy.',
        'medium',
        'command',
      ),
    );
  }

  if (isAllowlisted && command.length > 1) {
    warnings.push(
      createWarning(
        'command_has_arguments',
        'Allowlisted command includes arguments and must remain bounded by future runner policy.',
        'low',
        'command',
      ),
    );
  }

  return {
    allowed: reasons.length === 0,
    decision:
      reasons.length === 0
        ? 'allow'
        : reasons.every((reason) => reason.code === 'approval_required')
          ? 'requires_approval'
          : 'deny',
    reasons,
    warnings,
    normalizedRequest: {
      command: [...command],
      commandString,
    },
  };
}

export function validatePathPolicy(
  policy: DremoSandboxPolicy,
  paths: readonly string[] = [],
): DremoSandboxPolicyValidationResult {
  const reasons: DremoSandboxPolicyViolation[] = [];
  const normalizedPaths = paths.map((path) => path.trim()).filter(Boolean);
  const blockedPatterns = [
    ...policy.blockedPaths,
    '.env',
    '.env.*',
    'secrets/**',
    '~/.ssh/**',
    '/etc/**',
    'docker.sock',
  ];

  for (const path of normalizedPaths) {
    if (path.includes('../') || path.includes('..\\') || path === '..') {
      reasons.push(
        createViolation(
          'path_outside_workspace',
          'Path traversal outside the task workspace is denied.',
          'critical',
          'paths',
        ),
      );
    }

    if (!isWorkspaceRelativePath(path)) {
      reasons.push(
        createViolation(
          'path_outside_workspace',
          'Absolute, home-relative, or parent-directory paths are denied by default.',
          'high',
          'paths',
        ),
      );
    }

    for (const blockedPath of blockedPatterns) {
      if (pathMatchesBlockedPattern(path, blockedPath)) {
        reasons.push(
          createViolation(
            'path_blocked',
            `Path matches blocked sandbox policy path: ${blockedPath}`,
            'high',
            'paths',
          ),
        );
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    decision: reasons.length === 0 ? 'allow' : 'deny',
    reasons,
    warnings: [],
    normalizedRequest: {
      paths: normalizedPaths,
    },
  };
}

export function validateEnvironmentPolicy(
  policy: DremoSandboxPolicy,
  env: Readonly<Record<string, string>> = {},
): DremoSandboxPolicyValidationResult {
  const reasons: DremoSandboxPolicyViolation[] = [];
  const warnings: DremoSandboxPolicyWarning[] = [];
  const entries = Object.entries(env);

  if (policy.envPolicy === 'empty' && entries.length > 0) {
    reasons.push(
      createViolation(
        'env_key_denied',
        'Sandbox environment policy is empty; no environment variables are allowed.',
        'high',
        'environment',
      ),
    );
  }

  for (const [key, value] of entries) {
    if (!policy.allowedEnvironmentKeys.includes(key)) {
      reasons.push(
        createViolation(
          'env_key_denied',
          `Environment key is not explicitly allowlisted: ${key}`,
          'high',
          'environment',
        ),
      );
    }

    if (SENSITIVE_ENV_KEY_PATTERN.test(key)) {
      reasons.push(
        createViolation(
          'env_key_denied',
          `Environment key is sensitive and denied: ${key}`,
          'critical',
          'environment',
        ),
      );
    }

    if (byteLength(value) > MAX_ENV_VALUE_BYTES) {
      reasons.push(
        createViolation(
          'env_value_too_large',
          `Environment value is too large for key: ${key}`,
          'medium',
          'environment',
        ),
      );
    }

    if (MULTILINE_PATTERN.test(value)) {
      reasons.push(
        createViolation(
          'env_key_denied',
          `Multiline environment values are denied by default: ${key}`,
          'high',
          'environment',
        ),
      );
    }
  }

  if (policy.envPolicy === 'task_metadata_only' && entries.length > 0) {
    warnings.push(
      createWarning(
        'env_metadata_only',
        'Only non-secret task metadata environment variables should be passed.',
        'medium',
        'environment',
      ),
    );
  }

  return {
    allowed: reasons.length === 0,
    decision: reasons.length === 0 ? 'allow' : 'deny',
    reasons,
    warnings,
    normalizedRequest: {
      envKeys: entries.map(([key]) => key).sort(),
    },
  };
}

export function validateResourceRequest(
  policy: DremoSandboxPolicy,
  resourceRequest: DremoSandboxResourceRequest = {},
): DremoSandboxPolicyValidationResult {
  const reasons: DremoSandboxPolicyViolation[] = [];
  const checks: Array<{
    code: string;
    field: keyof DremoSandboxResourceRequest;
    requested: number | undefined;
    maximum: number;
  }> = [
    {
      code: 'timeout_exceeds_policy',
      field: 'wallClockTimeoutMs',
      requested: resourceRequest.wallClockTimeoutMs,
      maximum: policy.wallClockTimeoutMs,
    },
    {
      code: 'stdout_limit_exceeds_policy',
      field: 'maxStdoutBytes',
      requested: resourceRequest.maxStdoutBytes,
      maximum: policy.maxStdoutBytes,
    },
    {
      code: 'stderr_limit_exceeds_policy',
      field: 'maxStderrBytes',
      requested: resourceRequest.maxStderrBytes,
      maximum: policy.maxStderrBytes,
    },
    {
      code: 'artifact_limit_exceeds_policy',
      field: 'maxArtifactBytes',
      requested: resourceRequest.maxArtifactBytes,
      maximum: policy.maxArtifactBytes,
    },
    {
      code: 'memory_limit_exceeds_policy',
      field: 'maxMemoryMb',
      requested: resourceRequest.maxMemoryMb,
      maximum: policy.maxMemoryMb,
    },
    {
      code: 'cpu_limit_exceeds_policy',
      field: 'maxCpu',
      requested: resourceRequest.maxCpu,
      maximum: policy.maxCpu,
    },
  ];

  for (const check of checks) {
    if (check.requested === undefined) {
      continue;
    }

    if (!Number.isFinite(check.requested) || check.requested < 0) {
      reasons.push(
        createViolation(
          'invalid_request',
          `${check.field} must be a non-negative finite number.`,
          'high',
          `resourceRequest.${check.field}`,
        ),
      );
      continue;
    }

    if (check.requested > check.maximum) {
      reasons.push(
        createViolation(
          check.code,
          `${check.field} exceeds sandbox policy maximum.`,
          'medium',
          `resourceRequest.${check.field}`,
        ),
      );
    }
  }

  return {
    allowed: reasons.length === 0,
    decision: reasons.length === 0 ? 'allow' : 'deny',
    reasons,
    warnings: [],
    normalizedRequest: {
      resourceRequest: { ...resourceRequest },
    },
  };
}

export function validateOutputLimits(
  policy: DremoSandboxPolicy,
  outputInfo: DremoSandboxOutputInfo = {},
): DremoSandboxPolicyValidationResult {
  const reasons: DremoSandboxPolicyViolation[] = [];
  const checks: Array<{
    code: string;
    field: keyof DremoSandboxOutputInfo;
    value: number | undefined;
    maximum: number;
  }> = [
    {
      code: 'stdout_limit_exceeds_policy',
      field: 'stdoutBytes',
      value: outputInfo.stdoutBytes,
      maximum: policy.maxStdoutBytes,
    },
    {
      code: 'stderr_limit_exceeds_policy',
      field: 'stderrBytes',
      value: outputInfo.stderrBytes,
      maximum: policy.maxStderrBytes,
    },
    {
      code: 'artifact_limit_exceeds_policy',
      field: 'artifactBytes',
      value: outputInfo.artifactBytes,
      maximum: policy.maxArtifactBytes,
    },
  ];

  for (const check of checks) {
    if (check.value === undefined) {
      continue;
    }

    if (!Number.isFinite(check.value) || check.value < 0) {
      reasons.push(
        createViolation(
          'invalid_request',
          `${check.field} must be a non-negative finite number.`,
          'high',
          `outputInfo.${check.field}`,
        ),
      );
      continue;
    }

    if (check.value > check.maximum) {
      reasons.push(
        createViolation(
          check.code,
          `${check.field} exceeds sandbox policy maximum.`,
          'medium',
          `outputInfo.${check.field}`,
        ),
      );
    }
  }

  return {
    allowed: reasons.length === 0,
    decision: reasons.length === 0 ? 'allow' : 'deny',
    reasons,
    warnings: [],
    normalizedRequest: {
      outputInfo: { ...outputInfo },
    },
  };
}

export function validateSandboxCommandRequest(
  policy: DremoSandboxPolicy,
  request: DremoSandboxCommandRequest,
): DremoSandboxPolicyValidationResult {
  const resourceRequest: DremoSandboxResourceRequest = {
    ...request.resourceRequest,
    ...(request.timeoutMs !== undefined
      ? { wallClockTimeoutMs: request.timeoutMs }
      : {}),
    ...(request.maxOutputBytes !== undefined
      ? {
          maxStdoutBytes: request.maxOutputBytes,
          maxStderrBytes: request.maxOutputBytes,
        }
      : {}),
  };
  const result = mergeValidationResults([
    validateRequestIdentity(request),
    validateCommandPolicy(policy, request.command),
    validatePathPolicy(policy, [request.workingDirectory, ...(request.paths ?? [])]),
    validateEnvironmentPolicy(policy, request.environment),
    validateResourceRequest(policy, resourceRequest),
    validateOutputLimits(policy, request.outputInfo),
  ]);
  const hasApproval = Boolean(request.approvedByApprovalId);
  const approvalOnly =
    result.reasons.length > 0 &&
    result.reasons.every((reason) => reason.code === 'approval_required');
  const reasons =
    hasApproval && approvalOnly
      ? []
      : result.reasons;
  const warnings =
    hasApproval && approvalOnly
      ? [
          ...result.warnings,
          createWarning(
            'approval_recorded',
            'Approval id is present, but sandbox restrictions still apply.',
            'medium',
            'approvedByApprovalId',
          ),
        ]
      : result.warnings;

  return {
    ...result,
    allowed: reasons.length === 0,
    decision: reasons.length === 0 ? 'allow' : result.decision,
    reasons,
    warnings,
    normalizedRequest: {
      command: [...request.command],
      workingDirectory: request.workingDirectory,
      paths: [...(request.paths ?? [])],
      envKeys: Object.keys(request.environment ?? {}).sort(),
      resourceRequest,
      outputInfo: { ...(request.outputInfo ?? {}) },
      approvedByApprovalId: request.approvedByApprovalId ?? null,
    },
  };
}

export const safeRepoScanExample = {
  policy: DEFAULT_DREMO_SANDBOX_POLICY,
  request: {
    sessionId: 'example-session',
    taskId: 'example-task',
    toolCallId: 'example-tool-safe-repo-scan',
    command: ['git', 'status'],
    workingDirectory: 'workspace',
    reason: 'Read safe repository metadata.',
    paths: ['src'],
    resourceRequest: {
      wallClockTimeoutMs: 30_000,
      maxStdoutBytes: 8 * 1024,
      maxStderrBytes: 8 * 1024,
    },
  } satisfies DremoSandboxCommandRequest,
} as const;

export const deniedRmRfExample = {
  policy: DEFAULT_DREMO_SANDBOX_POLICY,
  request: {
    sessionId: 'example-session',
    taskId: 'example-task',
    toolCallId: 'example-tool-rm-rf',
    command: ['rm', '-rf', '/'],
    workingDirectory: 'workspace',
    reason: 'Demonstrate destructive command denial.',
  } satisfies DremoSandboxCommandRequest,
} as const;

export const approvalRequiredNpmInstallExample = {
  policy: DEFAULT_DREMO_SANDBOX_POLICY,
  request: {
    sessionId: 'example-session',
    taskId: 'example-task',
    toolCallId: 'example-tool-npm-install',
    command: ['npm', 'install'],
    workingDirectory: 'workspace',
    reason: 'Demonstrate package install approval requirement.',
  } satisfies DremoSandboxCommandRequest,
} as const;

export const deniedSecretEnvExample = {
  policy: DEFAULT_DREMO_SANDBOX_POLICY,
  request: {
    sessionId: 'example-session',
    taskId: 'example-task',
    toolCallId: 'example-tool-secret-env',
    command: ['git', 'status'],
    workingDirectory: 'workspace',
    reason: 'Demonstrate secret environment denial.',
    environment: {
      OPENAI_API_KEY: 'example-secret',
    },
  } satisfies DremoSandboxCommandRequest,
} as const;

export const deniedPathTraversalExample = {
  policy: DEFAULT_DREMO_SANDBOX_POLICY,
  request: {
    sessionId: 'example-session',
    taskId: 'example-task',
    toolCallId: 'example-tool-path-traversal',
    command: ['ls'],
    workingDirectory: '../outside-workspace',
    reason: 'Demonstrate path traversal denial.',
    paths: ['../.env'],
  } satisfies DremoSandboxCommandRequest,
} as const;
