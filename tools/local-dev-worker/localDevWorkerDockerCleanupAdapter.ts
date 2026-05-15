import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND,
  evaluateLocalDevWorkerDockerCleanupPolicy,
} from './localDevWorkerDockerCleanupPolicy.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME } from './localDevWorkerDockerContainerIdentity.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import { findLocalDevWorkerExecutionCapability } from './localDevWorkerExecutionManifest.ts';
import { sanitizeWorkerOutputs } from './localDevWorkerOutputSanitizer.ts';
import {
  assertTrustedManualReviewSource,
  createMissingManualReview,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export type LocalDevWorkerDockerCleanupOutcome =
  | 'cleanup_success'
  | 'cleanup_target_not_found'
  | 'docker_cli_unavailable'
  | 'docker_daemon_unavailable'
  | 'timeout'
  | 'policy_blocked'
  | 'cleanup_failed';

export interface LocalDevWorkerDockerCleanupSafetyMetadata {
  workerBoundary: 'outside-browser-bundle';
  localDevOnly: true;
  dockerCliAllowed: true;
  dockerRuntimeAllowed: boolean;
  cleanupTarget: typeof LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME;
  arbitraryTargetAllowed: false;
  wildcardAllowed: false;
  containerIdAllowed: false;
  pruneAllowed: false;
  inspectAllowed: false;
  listAllowed: false;
  dockerSocketMounted: false;
  homeMounted: false;
  workspaceMounted: false;
  networkAllowed: false;
  fileWritesAllowed: false;
  shellAllowed: false;
  hostEnvironmentInherited: false;
}

export interface LocalDevWorkerDockerCleanupResult {
  ok: boolean;
  noExecution: boolean;
  executionAttempted: boolean;
  cleanupExecuted: boolean;
  executionMode: 'blocked' | 'executed';
  capabilityId?: 'capability.docker.smoke.cleanup.exact';
  command: 'docker';
  args: readonly string[];
  stdout: string;
  stderr: string;
  sanitizedStdout: string;
  sanitizedStderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  rejectionCodes: string[];
  outcome: LocalDevWorkerDockerCleanupOutcome;
  safetyMetadata: LocalDevWorkerDockerCleanupSafetyMetadata;
}

interface ExecFileError extends Error {
  code?: number | string;
  signal?: string | null;
  killed?: boolean;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

const SAFE_LOCAL_DEV_WORKER_CWD = path.dirname(fileURLToPath(import.meta.url));
const CLEANUP_CAPABILITY_ID = 'capability.docker.smoke.cleanup.exact';
const OPTIONAL_COMMAND_NOT_FOUND_CODES = new Set(['ENOENT', 'UNKNOWN']);

function durationSince(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

function truncateToBytes(value: string, maxBytes: number) {
  const buffer = Buffer.from(value, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return value;
  }

  return buffer.subarray(0, maxBytes).toString('utf8');
}

function createSafetyMetadata(
  config: LocalDevWorkerExecutionConfig,
): LocalDevWorkerDockerCleanupSafetyMetadata {
  return {
    workerBoundary: 'outside-browser-bundle',
    localDevOnly: true,
    dockerCliAllowed: true,
    dockerRuntimeAllowed: config.allowDockerRuntime,
    cleanupTarget: LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
    arbitraryTargetAllowed: false,
    wildcardAllowed: false,
    containerIdAllowed: false,
    pruneAllowed: false,
    inspectAllowed: false,
    listAllowed: false,
    dockerSocketMounted: false,
    homeMounted: false,
    workspaceMounted: false,
    networkAllowed: false,
    fileWritesAllowed: false,
    shellAllowed: false,
    hostEnvironmentInherited: false,
  };
}

function classifyCleanupOutcome(input: {
  error: ExecFileError | null;
  stderr: string;
  timedOut: boolean;
}): {
  outcome: LocalDevWorkerDockerCleanupOutcome;
  rejectionCodes: string[];
  ok: boolean;
  cleanupExecuted: boolean;
} {
  const text = `${input.stderr}\n${input.error?.message ?? ''}`.toLowerCase();

  if (input.timedOut) {
    return {
      outcome: 'timeout',
      rejectionCodes: ['cleanup_timeout'],
      ok: false,
      cleanupExecuted: false,
    };
  }

  if (
    input.error?.code &&
    OPTIONAL_COMMAND_NOT_FOUND_CODES.has(String(input.error.code))
  ) {
    return {
      outcome: 'docker_cli_unavailable',
      rejectionCodes: ['optional_docker_cli_unavailable'],
      ok: false,
      cleanupExecuted: false,
    };
  }

  if (
    text.includes('cannot connect to the docker daemon') ||
    text.includes('is the docker daemon running') ||
    text.includes('docker daemon') ||
    text.includes('error during connect')
  ) {
    return {
      outcome: 'docker_daemon_unavailable',
      rejectionCodes: ['docker_daemon_unavailable'],
      ok: false,
      cleanupExecuted: false,
    };
  }

  if (
    text.includes('no such container') ||
    text.includes('no such object') ||
    text.includes('container not found')
  ) {
    return {
      outcome: 'cleanup_target_not_found',
      rejectionCodes: ['cleanup_target_not_found'],
      ok: false,
      cleanupExecuted: false,
    };
  }

  if (!input.error) {
    return {
      outcome: 'cleanup_success',
      rejectionCodes: [],
      ok: true,
      cleanupExecuted: true,
    };
  }

  return {
    outcome: 'cleanup_failed',
    rejectionCodes: ['cleanup_failed'],
    ok: false,
    cleanupExecuted: false,
  };
}

function createResult(input: {
  config: LocalDevWorkerExecutionConfig;
  ok: boolean;
  noExecution: boolean;
  executionAttempted: boolean;
  cleanupExecuted: boolean;
  executionMode: 'blocked' | 'executed';
  capabilityId?: 'capability.docker.smoke.cleanup.exact';
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  durationMs?: number;
  rejectionCodes: readonly string[];
  outcome: LocalDevWorkerDockerCleanupOutcome;
  args?: readonly string[];
}): LocalDevWorkerDockerCleanupResult {
  const stdout = input.stdout ?? '';
  const stderr = input.stderr ?? '';
  const sanitized = sanitizeWorkerOutputs({
    stdout,
    stderr,
    maxStdoutBytes: input.config.maxStdoutBytes,
    maxStderrBytes: input.config.maxStderrBytes,
  });

  return {
    ok: input.ok,
    noExecution: input.noExecution,
    executionAttempted: input.executionAttempted,
    cleanupExecuted: input.cleanupExecuted,
    executionMode: input.executionMode,
    capabilityId: input.capabilityId,
    command: 'docker',
    args: input.args ?? LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND.slice(1),
    stdout,
    stderr,
    sanitizedStdout: sanitized.stdout.value,
    sanitizedStderr: sanitized.stderr.value,
    exitCode: input.exitCode ?? null,
    timedOut: input.timedOut ?? false,
    durationMs: input.durationMs ?? 0,
    rejectionCodes: [...new Set(input.rejectionCodes)],
    outcome: input.outcome,
    safetyMetadata: createSafetyMetadata(input.config),
  };
}

function blockedResult(input: {
  config: LocalDevWorkerExecutionConfig;
  request: LocalDevWorkerExecutionReadinessRequest;
  capabilityId?: 'capability.docker.smoke.cleanup.exact';
  rejectionCodes: readonly string[];
}): LocalDevWorkerDockerCleanupResult {
  return createResult({
    config: input.config,
    ok: false,
    noExecution: true,
    executionAttempted: false,
    cleanupExecuted: false,
    executionMode: 'blocked',
    capabilityId: input.capabilityId,
    args: input.request.args,
    rejectionCodes: input.rejectionCodes,
    outcome: 'policy_blocked',
  });
}

function runExactCleanup(input: {
  config: LocalDevWorkerExecutionConfig;
  capabilityId: 'capability.docker.smoke.cleanup.exact';
}): Promise<LocalDevWorkerDockerCleanupResult> {
  const startedAt = Date.now();
  const args = LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND.slice(1);

  return new Promise((resolve) => {
    execFile(
      'docker',
      [...args],
      {
        cwd: SAFE_LOCAL_DEV_WORKER_CWD,
        env: {},
        shell: false,
        timeout: input.config.maxWallClockMs,
        windowsHide: true,
        maxBuffer: Math.max(input.config.maxStdoutBytes, input.config.maxStderrBytes),
      },
      (error, stdout, stderr) => {
        const typedError = error as ExecFileError | null;
        const normalizedStdout = truncateToBytes(
          String(stdout ?? ''),
          input.config.maxStdoutBytes,
        );
        const normalizedStderr = truncateToBytes(
          String(stderr || typedError?.message || ''),
          input.config.maxStderrBytes,
        );
        const timedOut =
          typedError?.killed === true || typedError?.signal === 'SIGTERM';
        const classified = classifyCleanupOutcome({
          error: typedError,
          stderr: normalizedStderr,
          timedOut,
        });
        const exitCode =
          typeof typedError?.code === 'number'
            ? typedError.code
            : typedError
              ? null
              : 0;

        resolve(
          createResult({
            config: input.config,
            ok: classified.ok,
            noExecution: false,
            executionAttempted: true,
            cleanupExecuted: classified.cleanupExecuted,
            executionMode: 'executed',
            capabilityId: input.capabilityId,
            stdout: normalizedStdout,
            stderr: normalizedStderr,
            exitCode,
            timedOut,
            durationMs: durationSince(startedAt),
            rejectionCodes: classified.rejectionCodes,
            outcome: classified.outcome,
          }),
        );
      },
    );
  });
}

export async function executeLocalDevWorkerDockerSmokeCleanup(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config?: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
}): Promise<LocalDevWorkerDockerCleanupResult> {
  const config = input.config ?? LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG;
  const trustedManualReview = assertTrustedManualReviewSource(
    input.trustedManualReview,
  )
    ? input.trustedManualReview
    : createMissingManualReview();
  const capability = findLocalDevWorkerExecutionCapability(input.request);
  const capabilityId =
    capability?.capabilityId === CLEANUP_CAPABILITY_ID
      ? CLEANUP_CAPABILITY_ID
      : undefined;
  const cleanupPolicy = evaluateLocalDevWorkerDockerCleanupPolicy({
    command: input.request.command,
    args: input.request.args,
  });
  const rejectionCodes = [...cleanupPolicy.rejectionCodes];

  if (!assertTrustedManualReviewSource(input.trustedManualReview)) {
    rejectionCodes.push('trusted_manual_review_missing');
  }

  if (
    !assertTrustedManualReviewSource(input.trustedManualReview) ||
    trustedManualReview.scope.length !== 1 ||
    trustedManualReview.scope[0] !== CLEANUP_CAPABILITY_ID
  ) {
    rejectionCodes.push('cleanup_review_scope_not_exact');
  }

  if (!config.allowRealExecution) {
    rejectionCodes.push('execution_config_disabled');
  }

  if (config.executionMode !== 'reviewed-local-docker-smoke-cleanup') {
    rejectionCodes.push('cleanup_execution_mode_required');
  }

  if (!config.allowDockerCli) {
    rejectionCodes.push('docker_cli_disabled');
  }

  if (!config.allowDockerRuntime) {
    rejectionCodes.push('docker_runtime_execution_required');
  }

  if (config.allowDockerSocket) {
    rejectionCodes.push('docker_socket_execution_denied');
  }

  if (config.allowHomeMount) {
    rejectionCodes.push('home_mount_execution_denied');
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

  if (input.request.source !== 'dremo-local-dev-sandbox') {
    rejectionCodes.push('invalid_source');
  }

  if (input.request.expectedEnvironment !== 'local-dev') {
    rejectionCodes.push('invalid_environment');
  }

  if (input.request.productionUiPath) {
    rejectionCodes.push('production_ui_path_denied');
  }

  if (input.request.srcImportPath) {
    rejectionCodes.push('src_import_path_denied');
  }

  if (!capabilityId) {
    rejectionCodes.push('capability_not_found');
  } else if (config.blockedCapabilityIds.includes(capabilityId)) {
    rejectionCodes.push('capability_blocked_by_config');
  } else if (!config.allowedCapabilityIds.includes(capabilityId)) {
    rejectionCodes.push('capability_not_enabled_for_execution');
  }

  if (rejectionCodes.length > 0 || !cleanupPolicy.allowed) {
    return blockedResult({
      config,
      request: input.request,
      capabilityId,
      rejectionCodes,
    });
  }

  return runExactCleanup({
    config,
    capabilityId: CLEANUP_CAPABILITY_ID,
  });
}

export const LOCAL_DEV_WORKER_DOCKER_CLEANUP_NOTE =
  'This adapter may execute only docker rm -f lumixia-dremo-smoke-echo under trusted local-dev cleanup review. It never lists, inspects, prunes, stops, kills, or accepts arbitrary cleanup targets.';
