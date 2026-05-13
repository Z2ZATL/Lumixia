import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import { evaluateLocalDevWorkerDockerProbePolicy } from './localDevWorkerDockerProbePolicy.ts';
import {
  evaluateLocalDevWorkerExecutionReadiness,
  type LocalDevWorkerExecutionReadinessRequest,
} from './localDevWorkerExecutionReadiness.ts';
import {
  assertTrustedManualReviewSource,
  createMissingManualReview,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerVersionExecutionSafetyMetadata {
  workerBoundary: 'outside-browser-bundle';
  allowRealExecution: boolean;
  dockerExecutionImplemented: false;
  dockerCliAllowed: boolean;
  dockerRuntimeAllowed: false;
  dockerDaemonStateQueried: false;
  dockerSocketMounted: false;
  homeMounted: false;
  networkAllowed: false;
  fileWritesAllowed: false;
  shellAllowed: false;
  hostEnvironmentInherited: false;
}

export interface LocalDevWorkerVersionExecutionResult {
  ok: boolean;
  noExecution: false | true;
  executionAttempted: boolean;
  executionMode: 'blocked' | 'executed';
  capabilityId?: string;
  command: string;
  args: readonly string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  rejectionCodes: string[];
  safetyMetadata: LocalDevWorkerVersionExecutionSafetyMetadata;
}

interface ExecFileError extends Error {
  code?: number | string;
  signal?: string | null;
  killed?: boolean;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

const SAFE_LOCAL_DEV_WORKER_CWD = path.dirname(fileURLToPath(import.meta.url));
const OPTIONAL_COMMAND_NOT_FOUND_CODES = new Set(['ENOENT', 'UNKNOWN']);

function createSafetyMetadata(
  config: LocalDevWorkerExecutionConfig,
): LocalDevWorkerVersionExecutionSafetyMetadata {
  return {
    workerBoundary: 'outside-browser-bundle',
    allowRealExecution: config.allowRealExecution,
    dockerExecutionImplemented: false,
    dockerCliAllowed: config.allowDockerCli,
    dockerRuntimeAllowed: false,
    dockerDaemonStateQueried: false,
    dockerSocketMounted: false,
    homeMounted: false,
    networkAllowed: false,
    fileWritesAllowed: false,
    shellAllowed: false,
    hostEnvironmentInherited: false,
  };
}

function blockResult(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  capabilityId?: string;
  rejectionCodes: readonly string[];
  stderr?: string;
}): LocalDevWorkerVersionExecutionResult {
  return {
    ok: false,
    noExecution: true,
    executionAttempted: false,
    executionMode: 'blocked',
    capabilityId: input.capabilityId,
    command: input.request.command,
    args: input.request.args,
    stdout: '',
    stderr: input.stderr ?? '',
    exitCode: null,
    timedOut: false,
    durationMs: 0,
    rejectionCodes: [...new Set(input.rejectionCodes)],
    safetyMetadata: createSafetyMetadata(input.config),
  };
}

function truncateToBytes(value: string, maxBytes: number) {
  const buffer = Buffer.from(value, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return value;
  }

  return buffer.subarray(0, maxBytes).toString('utf8');
}

function normalizeDuration(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

function commandForExecution(request: LocalDevWorkerExecutionReadinessRequest) {
  if (request.command === 'node') {
    return {
      executable: process.execPath,
      args: request.args,
    };
  }

  return {
    executable: request.command,
    args: request.args,
  };
}

function builtinIdentityExecution(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  capabilityId: string;
  stdout: string;
  startedAt: number;
}): LocalDevWorkerVersionExecutionResult {
  return {
    ok: true,
    noExecution: false,
    executionAttempted: true,
    executionMode: 'executed',
    capabilityId: input.capabilityId,
    command: input.request.command,
    args: input.request.args,
    stdout: truncateToBytes(input.stdout, input.config.maxStdoutBytes),
    stderr: '',
    exitCode: 0,
    timedOut: false,
    durationMs: normalizeDuration(input.startedAt),
    rejectionCodes: [],
    safetyMetadata: createSafetyMetadata(input.config),
  };
}

function runExecFile(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  capabilityId: string;
}): Promise<LocalDevWorkerVersionExecutionResult> {
  const startedAt = Date.now();
  const command = commandForExecution(input.request);

  return new Promise((resolve) => {
    execFile(
      command.executable,
      [...command.args],
      {
        cwd: SAFE_LOCAL_DEV_WORKER_CWD,
        env: {},
        shell: false,
        timeout: input.config.maxWallClockMs,
        windowsHide: true,
        maxBuffer: Math.max(
          input.config.maxStdoutBytes,
          input.config.maxStderrBytes,
        ),
      },
      (error, stdout, stderr) => {
        const typedError = error as ExecFileError | null;
        const exitCode =
          typeof typedError?.code === 'number'
            ? typedError.code
            : typedError
              ? null
              : 0;
        const isOptionalCommandUnavailable =
          typedError?.code &&
          OPTIONAL_COMMAND_NOT_FOUND_CODES.has(String(typedError.code));
        const rejectionCodes = isOptionalCommandUnavailable
          ? [
              input.capabilityId === 'capability.docker.version'
                ? 'optional_docker_cli_unavailable'
                : 'optional_command_unavailable',
            ]
          : [];

        resolve({
          ok: !typedError,
          noExecution: false,
          executionAttempted: true,
          executionMode: 'executed',
          capabilityId: input.capabilityId,
          command: input.request.command,
          args: input.request.args,
          stdout: truncateToBytes(
            String(stdout ?? ''),
            input.config.maxStdoutBytes,
          ),
          stderr: truncateToBytes(
            String(stderr || typedError?.message || ''),
            input.config.maxStderrBytes,
          ),
          exitCode,
          timedOut:
            typedError?.killed === true || typedError?.signal === 'SIGTERM',
          durationMs: normalizeDuration(startedAt),
          rejectionCodes,
          safetyMetadata: createSafetyMetadata(input.config),
        });
      },
    );
  });
}

export async function executeLocalDevWorkerVersionCommand(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config?: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
}): Promise<LocalDevWorkerVersionExecutionResult> {
  const config = input.config ?? LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG;
  const trustedManualReview = assertTrustedManualReviewSource(
    input.trustedManualReview,
  )
    ? input.trustedManualReview
    : createMissingManualReview();
  const readinessRequest = {
    ...input.request,
    allowRealExecution: config.allowRealExecution,
    manualSecurityReview: trustedManualReview,
  };
  const readiness = evaluateLocalDevWorkerExecutionReadiness(readinessRequest);
  const capabilityId = readiness.matchedCapabilityId;
  const rejectionCodes = [...readiness.rejectionCodes];
  const isDockerRequest = ['docker', 'docker-compose'].includes(
    input.request.command.trim().toLowerCase(),
  );
  const dockerProbePolicy = evaluateLocalDevWorkerDockerProbePolicy({
    request: input.request,
    capabilityId,
  });

  if (!assertTrustedManualReviewSource(input.trustedManualReview)) {
    rejectionCodes.push('trusted_manual_review_missing');
  }

  if (!config.allowRealExecution) {
    rejectionCodes.push('execution_config_disabled');
  }

  if (config.inheritHostEnvironment) {
    rejectionCodes.push('host_environment_inheritance_denied');
  }

  if (config.allowShell) {
    rejectionCodes.push('shell_execution_denied');
  }

  if (config.allowNetwork) {
    rejectionCodes.push('network_execution_denied');
  }

  if (config.allowFileWrites) {
    rejectionCodes.push('file_write_execution_denied');
  }

  if (isDockerRequest) {
    if (config.executionMode !== 'reviewed-local-docker-version-probe') {
      rejectionCodes.push('docker_probe_execution_mode_required');
    }

    if (!config.allowDockerCli) {
      rejectionCodes.push('docker_cli_disabled');
    }

    if (config.allowDockerRuntime) {
      rejectionCodes.push('docker_runtime_execution_denied');
    }

    if (config.allowDockerSocket) {
      rejectionCodes.push('docker_socket_execution_denied');
    }

    if (config.allowHomeMount) {
      rejectionCodes.push('home_mount_execution_denied');
    }

    if (
      !assertTrustedManualReviewSource(input.trustedManualReview) ||
      input.trustedManualReview.scope.length !== 1 ||
      input.trustedManualReview.scope[0] !== 'capability.docker.version'
    ) {
      rejectionCodes.push('docker_probe_review_scope_not_exact');
    }

    rejectionCodes.push(...dockerProbePolicy.rejectionCodes);
  } else {
    if (config.executionMode !== 'reviewed-local-version-commands') {
      rejectionCodes.push('execution_mode_not_reviewed_local_version_commands');
    }

    if (
      config.allowDockerCli ||
      config.allowDockerRuntime ||
      readiness.matchedCapability?.dockerRequired
    ) {
      rejectionCodes.push('docker_capability_blocked');
    }
  }

  if (!capabilityId) {
    rejectionCodes.push('capability_not_found');
  } else if (config.blockedCapabilityIds.includes(capabilityId)) {
    rejectionCodes.push('capability_blocked_by_config');
  } else if (!config.allowedCapabilityIds.includes(capabilityId)) {
    rejectionCodes.push('capability_not_enabled_for_execution');
  }

  if (!readiness.readyForFutureExecution || rejectionCodes.length > 0) {
    return blockResult({
      request: input.request,
      config,
      capabilityId,
      rejectionCodes,
    });
  }

  if (!capabilityId) {
    return blockResult({
      request: input.request,
      config,
      rejectionCodes: ['capability_not_found'],
    });
  }

  const executableCapabilityId = capabilityId;

  const startedAt = Date.now();

  if (input.request.command === 'pwd') {
    return builtinIdentityExecution({
      request: input.request,
      config,
      capabilityId: executableCapabilityId,
      stdout: 'tools/local-dev-worker\n',
      startedAt,
    });
  }

  if (input.request.command === 'echo') {
    return builtinIdentityExecution({
      request: input.request,
      config,
      capabilityId: executableCapabilityId,
      stdout: `${input.request.args.join(' ')}\n`,
      startedAt,
    });
  }

  return runExecFile({
    request: input.request,
    config,
    capabilityId: executableCapabilityId,
  });
}
