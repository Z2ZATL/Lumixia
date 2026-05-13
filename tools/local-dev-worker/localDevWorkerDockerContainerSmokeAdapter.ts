import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG,
  type LocalDevWorkerExecutionConfig,
} from './localDevWorkerExecutionConfig.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
  LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID,
  evaluateLocalDevWorkerDockerContainerSmokePolicy,
} from './localDevWorkerDockerContainerSmokePolicy.ts';
import type { LocalDevWorkerDockerReadinessResult } from './localDevWorkerDockerReadiness.ts';
import type { LocalDevWorkerExecutionReadinessRequest } from './localDevWorkerExecutionReadiness.ts';
import { findLocalDevWorkerExecutionCapability } from './localDevWorkerExecutionManifest.ts';
import {
  assertTrustedManualReviewSource,
  createMissingManualReview,
  type TrustedLocalDevManualSecurityReview,
} from './localDevWorkerTrustedReview.ts';

export interface LocalDevWorkerDockerContainerSmokeSafetyMetadata {
  workerBoundary: 'outside-browser-bundle';
  localDevOnly: true;
  dockerCliAllowed: true;
  dockerRuntimeAllowed: boolean;
  containerStarted: boolean;
  imagePulled: false;
  imageBuilt: false;
  dockerSocketMounted: false;
  homeMounted: false;
  workspaceMounted: false;
  networkAllowed: false;
  fileWritesAllowed: false;
  shellAllowed: false;
  hostEnvironmentInherited: false;
}

export interface LocalDevWorkerDockerContainerSmokeResult {
  ok: boolean;
  noExecution: boolean;
  executionAttempted: boolean;
  containerStarted: boolean;
  imagePulled: false;
  imageBuilt: false;
  networkAllowed: false;
  mountsAllowed: false;
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
  safetyMetadata: LocalDevWorkerDockerContainerSmokeSafetyMetadata;
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

function createSafetyMetadata(input: {
  config: LocalDevWorkerExecutionConfig;
  containerStarted: boolean;
}): LocalDevWorkerDockerContainerSmokeSafetyMetadata {
  return {
    workerBoundary: 'outside-browser-bundle',
    localDevOnly: true,
    dockerCliAllowed: true,
    dockerRuntimeAllowed: input.config.allowDockerRuntime,
    containerStarted: input.containerStarted,
    imagePulled: false,
    imageBuilt: false,
    dockerSocketMounted: false,
    homeMounted: false,
    workspaceMounted: false,
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
  noExecution: boolean;
  executionAttempted: boolean;
  executionMode: 'blocked' | 'executed';
  capabilityId?: string;
  command: string;
  args: readonly string[];
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  durationMs?: number;
  rejectionCodes: readonly string[];
  containerStarted: boolean;
}): LocalDevWorkerDockerContainerSmokeResult {
  return {
    ok: input.ok,
    noExecution: input.noExecution,
    executionAttempted: input.executionAttempted,
    containerStarted: input.containerStarted,
    imagePulled: false,
    imageBuilt: false,
    networkAllowed: false,
    mountsAllowed: false,
    executionMode: input.executionMode,
    capabilityId: input.capabilityId,
    command: input.command,
    args: [...input.args],
    stdout: input.stdout ?? '',
    stderr: input.stderr ?? '',
    exitCode: input.exitCode ?? null,
    timedOut: input.timedOut ?? false,
    durationMs: input.durationMs ?? 0,
    rejectionCodes: [...new Set(input.rejectionCodes)],
    safetyMetadata: createSafetyMetadata({
      config: input.config,
      containerStarted: input.containerStarted,
    }),
  };
}

function blockedResult(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  capabilityId?: string;
  rejectionCodes: readonly string[];
}): LocalDevWorkerDockerContainerSmokeResult {
  return createResult({
    config: input.config,
    ok: false,
    noExecution: true,
    executionAttempted: false,
    executionMode: 'blocked',
    capabilityId: input.capabilityId,
    command: input.request.command,
    args: input.request.args,
    rejectionCodes: input.rejectionCodes,
    containerStarted: false,
  });
}

function classifyDockerError(input: {
  error: ExecFileError | null;
  stdout: string;
  stderr: string;
}) {
  const codes: string[] = [];
  const text = `${input.stderr}\n${input.error?.message ?? ''}`.toLowerCase();

  if (
    input.error?.code &&
    OPTIONAL_COMMAND_NOT_FOUND_CODES.has(String(input.error.code))
  ) {
    codes.push('optional_docker_cli_unavailable');
  }

  if (
    text.includes('cannot connect to the docker daemon') ||
    text.includes('is the docker daemon running') ||
    text.includes('docker daemon') ||
    text.includes('error during connect')
  ) {
    codes.push('docker_daemon_unavailable');
  }

  if (
    text.includes('pull access denied') ||
    text.includes('not found locally') ||
    text.includes('pull policy') ||
    text.includes('unable to find image')
  ) {
    codes.push('container_smoke_image_unavailable');
  }

  if (input.error && codes.length === 0) {
    codes.push('container_smoke_execution_failed');
  }

  return codes;
}

function runSmokeContainer(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  config: LocalDevWorkerExecutionConfig;
  capabilityId: string;
}): Promise<LocalDevWorkerDockerContainerSmokeResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    execFile(
      'docker',
      [...LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS],
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
        const rejectionCodes = classifyDockerError({
          error: typedError,
          stdout: normalizedStdout,
          stderr: normalizedStderr,
        });
        const exitCode =
          typeof typedError?.code === 'number'
            ? typedError.code
            : typedError
              ? null
              : 0;
        const timedOut =
          typedError?.killed === true || typedError?.signal === 'SIGTERM';
        const ok = !typedError && normalizedStdout.includes('hello');

        resolve(
          createResult({
            config: input.config,
            ok,
            noExecution: false,
            executionAttempted: true,
            executionMode: 'executed',
            capabilityId: input.capabilityId,
            command: input.request.command,
            args: input.request.args,
            stdout: normalizedStdout,
            stderr: normalizedStderr,
            exitCode,
            timedOut,
            durationMs: durationSince(startedAt),
            rejectionCodes,
            containerStarted: ok,
          }),
        );
      },
    );
  });
}

export async function executeLocalDevWorkerDockerContainerSmoke(input: {
  request: LocalDevWorkerExecutionReadinessRequest;
  dockerReadiness: LocalDevWorkerDockerReadinessResult;
  config?: LocalDevWorkerExecutionConfig;
  trustedManualReview?: TrustedLocalDevManualSecurityReview;
}): Promise<LocalDevWorkerDockerContainerSmokeResult> {
  const config = input.config ?? LOCAL_DEV_WORKER_DEFAULT_EXECUTION_CONFIG;
  const trustedManualReview = assertTrustedManualReviewSource(
    input.trustedManualReview,
  )
    ? input.trustedManualReview
    : createMissingManualReview();
  const capability = findLocalDevWorkerExecutionCapability(input.request);
  const capabilityId = capability?.capabilityId;
  const smokePolicy = evaluateLocalDevWorkerDockerContainerSmokePolicy({
    request: input.request,
    capabilityId,
  });
  const rejectionCodes = [...smokePolicy.rejectionCodes];

  if (!assertTrustedManualReviewSource(input.trustedManualReview)) {
    rejectionCodes.push('trusted_manual_review_missing');
  }

  if (
    !assertTrustedManualReviewSource(input.trustedManualReview) ||
    input.trustedManualReview.scope.length !== 1 ||
    input.trustedManualReview.scope[0] !==
      LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_CAPABILITY_ID
  ) {
    rejectionCodes.push('container_smoke_review_scope_not_exact');
  }

  if (!config.allowRealExecution) {
    rejectionCodes.push('execution_config_disabled');
  }

  if (config.executionMode !== 'reviewed-local-docker-container-smoke') {
    rejectionCodes.push('container_smoke_execution_mode_required');
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

  if (input.dockerReadiness.readinessState !== 'daemon_available') {
    rejectionCodes.push('docker_daemon_not_ready');
  }

  if (!input.dockerReadiness.noContainerExecution) {
    rejectionCodes.push('docker_readiness_must_not_execute_containers');
  }

  if (input.dockerReadiness.safetyMetadata.imagePulled) {
    rejectionCodes.push('docker_readiness_pulled_image');
  }

  if (input.dockerReadiness.safetyMetadata.imageBuilt) {
    rejectionCodes.push('docker_readiness_built_image');
  }

  if (input.dockerReadiness.safetyMetadata.dockerSocketMounted) {
    rejectionCodes.push('docker_readiness_mounted_socket');
  }

  if (input.dockerReadiness.safetyMetadata.homeMounted) {
    rejectionCodes.push('docker_readiness_mounted_home');
  }

  if (rejectionCodes.length > 0 || !smokePolicy.allowed) {
    return blockedResult({
      request: input.request,
      config,
      capabilityId,
      rejectionCodes,
    });
  }

  if (!capabilityId) {
    return blockedResult({
      request: input.request,
      config,
      rejectionCodes: ['capability_not_found'],
    });
  }

  return runSmokeContainer({
    request: input.request,
    config,
    capabilityId,
  });
}

export const LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_NOTE =
  'This adapter may execute only docker run for alpine:3.20 echo hello with --pull=never, no network, no mounts, no shell, and no host environment.';

