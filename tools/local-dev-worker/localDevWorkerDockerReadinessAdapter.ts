import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import { evaluateLocalDevWorkerDockerDaemonReadinessPolicy } from './localDevWorkerDockerDaemonReadinessPolicy.ts';
import {
  type LocalDevWorkerDockerReadinessResult,
  type LocalDevWorkerDockerReadinessSafetyMetadata,
  type LocalDevWorkerDockerReadinessState,
} from './localDevWorkerDockerReadiness.ts';
import {
  isLikelyDockerDaemonUnavailable,
  parseLocalDevWorkerDockerVersionJson,
} from './localDevWorkerDockerVersionParser.ts';
import {
  evaluateLocalDevWorkerExecutionReadiness,
  type LocalDevWorkerExecutionReadinessRequest,
} from './localDevWorkerExecutionReadiness.ts';
import {
  assertTrustedManualReviewSource,
  createMissingManualReview,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

interface ExecFileError extends Error {
  code?: number | string;
  signal?: string | null;
  killed?: boolean;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

const SAFE_LOCAL_DEV_WORKER_CWD = path.dirname(fileURLToPath(import.meta.url));
const DOCKER_READINESS_CAPABILITY_ID = 'capability.docker.daemon.readiness';
const DOCKER_READINESS_COMMAND = 'docker version --format {{json .}}';
const OPTIONAL_COMMAND_NOT_FOUND_CODES = new Set(['ENOENT', 'UNKNOWN']);

function createSafetyMetadata(input: {
  config: LocalDevWorkerExecutionConfig;
  dockerDaemonStateQueried: boolean;
}): LocalDevWorkerDockerReadinessSafetyMetadata {
  return {
    workerBoundary: 'outside-browser-bundle',
    localDevOnly: true,
    dockerCliAllowed: input.config.allowDockerCli,
    dockerDaemonStateQueried: input.dockerDaemonStateQueried,
    dockerRuntimeAllowed: false,
    containerStarted: false,
    imagePulled: false,
    imageBuilt: false,
    dockerSocketMounted: false,
    homeMounted: false,
    networkAllowed: false,
    fileWritesAllowed: false,
    shellAllowed: false,
    hostEnvironmentInherited: false,
  };
}

function truncateToBytes(value: string, maxBytes: number) {
  const buffer = Buffer.from(value, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return value;
  }

  return buffer.subarray(0, maxBytes).toString('utf8');
}

function durationSince(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

function createResult(input: {
  config: LocalDevWorkerExecutionConfig;
  ok: boolean;
  readinessState: LocalDevWorkerDockerReadinessState;
  daemonReachable: boolean;
  rejectionCodes: readonly string[];
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  durationMs?: number;
  commandAttempted?: string;
  dockerCliVersion?: string;
  dockerServerVersion?: string;
  dockerDaemonStateQueried?: boolean;
}): LocalDevWorkerDockerReadinessResult {
  return {
    ok: input.ok,
    noContainerExecution: true,
    readinessState: input.readinessState,
    dockerCliVersion: input.dockerCliVersion,
    dockerServerVersion: input.dockerServerVersion,
    daemonReachable: input.daemonReachable,
    commandAttempted: input.commandAttempted,
    rejectionCodes: [...new Set(input.rejectionCodes)],
    stdout: input.stdout ?? '',
    stderr: input.stderr ?? '',
    exitCode: input.exitCode ?? null,
    timedOut: input.timedOut ?? false,
    durationMs: input.durationMs ?? 0,
    safetyMetadata: createSafetyMetadata({
      config: input.config,
      dockerDaemonStateQueried: input.dockerDaemonStateQueried ?? false,
    }),
  };
}

function blockedResult(input: {
  config: LocalDevWorkerExecutionConfig;
  rejectionCodes: readonly string[];
}): LocalDevWorkerDockerReadinessResult {
  return createResult({
    config: input.config,
    ok: false,
    readinessState: 'probe_blocked',
    daemonReachable: false,
    rejectionCodes: input.rejectionCodes,
  });
}

function classifyExecResult(input: {
  config: LocalDevWorkerExecutionConfig;
  error: ExecFileError | null;
  stdout: string;
  stderr: string;
  startedAt: number;
}): LocalDevWorkerDockerReadinessResult {
  const exitCode =
    typeof input.error?.code === 'number' ? input.error.code : input.error ? null : 0;
  const stdout = truncateToBytes(input.stdout, input.config.maxStdoutBytes);
  const stderr = truncateToBytes(
    input.stderr || input.error?.message || '',
    input.config.maxStderrBytes,
  );
  const timedOut =
    input.error?.killed === true || input.error?.signal === 'SIGTERM';

  if (
    input.error?.code &&
    OPTIONAL_COMMAND_NOT_FOUND_CODES.has(String(input.error.code))
  ) {
    return createResult({
      config: input.config,
      ok: false,
      readinessState: 'cli_unavailable',
      daemonReachable: false,
      commandAttempted: DOCKER_READINESS_COMMAND,
      rejectionCodes: ['optional_docker_cli_unavailable'],
      stdout,
      stderr,
      exitCode,
      timedOut,
      durationMs: durationSince(input.startedAt),
      dockerDaemonStateQueried: true,
    });
  }

  const parsed = parseLocalDevWorkerDockerVersionJson(stdout);

  if (!input.error && parsed.dockerServerVersion) {
    return createResult({
      config: input.config,
      ok: true,
      readinessState: 'daemon_available',
      daemonReachable: true,
      commandAttempted: DOCKER_READINESS_COMMAND,
      rejectionCodes: parsed.rejectionCodes,
      stdout,
      stderr,
      exitCode,
      timedOut,
      durationMs: durationSince(input.startedAt),
      dockerCliVersion: parsed.dockerCliVersion,
      dockerServerVersion: parsed.dockerServerVersion,
      dockerDaemonStateQueried: true,
    });
  }

  if (!input.error && parsed.dockerCliVersion && !parsed.dockerServerVersion) {
    return createResult({
      config: input.config,
      ok: false,
      readinessState: 'daemon_unavailable',
      daemonReachable: false,
      commandAttempted: DOCKER_READINESS_COMMAND,
      rejectionCodes: ['docker_daemon_unavailable'],
      stdout,
      stderr,
      exitCode,
      timedOut,
      durationMs: durationSince(input.startedAt),
      dockerCliVersion: parsed.dockerCliVersion,
      dockerDaemonStateQueried: true,
    });
  }

  if (isLikelyDockerDaemonUnavailable({ stderr, stdout, exitCode })) {
    return createResult({
      config: input.config,
      ok: false,
      readinessState: 'daemon_unavailable',
      daemonReachable: false,
      commandAttempted: DOCKER_READINESS_COMMAND,
      rejectionCodes: ['docker_daemon_unavailable'],
      stdout,
      stderr,
      exitCode,
      timedOut,
      durationMs: durationSince(input.startedAt),
      dockerCliVersion: parsed.dockerCliVersion,
      dockerDaemonStateQueried: true,
    });
  }

  return createResult({
    config: input.config,
    ok: false,
    readinessState: 'probe_failed',
    daemonReachable: false,
    commandAttempted: DOCKER_READINESS_COMMAND,
    rejectionCodes: [
      'docker_readiness_probe_failed',
      ...parsed.rejectionCodes,
    ],
    stdout,
    stderr,
    exitCode,
    timedOut,
    durationMs: durationSince(input.startedAt),
    dockerCliVersion: parsed.dockerCliVersion,
    dockerServerVersion: parsed.dockerServerVersion,
    dockerDaemonStateQueried: true,
  });
}

function runDockerReadinessProbe(
  config: LocalDevWorkerExecutionConfig,
): Promise<LocalDevWorkerDockerReadinessResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    execFile(
      'docker',
      ['version', '--format', '{{json .}}'],
      {
        cwd: SAFE_LOCAL_DEV_WORKER_CWD,
        env: {},
        shell: false,
        timeout: config.maxWallClockMs,
        windowsHide: true,
        maxBuffer: Math.max(config.maxStdoutBytes, config.maxStderrBytes),
      },
      (error, stdout, stderr) => {
        resolve(
          classifyExecResult({
            config,
            error: error as ExecFileError | null,
            stdout: String(stdout ?? ''),
            stderr: String(stderr ?? ''),
            startedAt,
          }),
        );
      },
    );
  });
}

export async function classifyLocalDevWorkerDockerReadiness(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config?: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
}): Promise<LocalDevWorkerDockerReadinessResult> {
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
  const daemonPolicy = evaluateLocalDevWorkerDockerDaemonReadinessPolicy({
    request: input.request,
    capabilityId,
  });
  const rejectionCodes = [...readiness.rejectionCodes];

  if (!assertTrustedManualReviewSource(input.trustedManualReview)) {
    rejectionCodes.push('trusted_manual_review_missing');
  }

  if (!config.allowRealExecution) {
    rejectionCodes.push('execution_config_disabled');
  }

  if (config.executionMode !== 'reviewed-local-docker-readiness-probe') {
    rejectionCodes.push('docker_readiness_execution_mode_required');
  }

  if (!config.allowDockerCli) {
    rejectionCodes.push('docker_cli_disabled');
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
    input.trustedManualReview.scope[0] !== DOCKER_READINESS_CAPABILITY_ID
  ) {
    rejectionCodes.push('docker_readiness_review_scope_not_exact');
  }

  rejectionCodes.push(...daemonPolicy.rejectionCodes);

  if (!capabilityId) {
    rejectionCodes.push('capability_not_found');
  } else if (config.blockedCapabilityIds.includes(capabilityId)) {
    rejectionCodes.push('capability_blocked_by_config');
  } else if (!config.allowedCapabilityIds.includes(capabilityId)) {
    rejectionCodes.push('capability_not_enabled_for_execution');
  }

  if (!readiness.readyForFutureExecution || rejectionCodes.length > 0) {
    return blockedResult({
      config,
      rejectionCodes,
    });
  }

  return runDockerReadinessProbe(config);
}

