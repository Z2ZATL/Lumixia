import {
  LOCAL_DEV_WORKER_BOUNDARY_NOTE,
  LOCAL_DEV_WORKER_SAFETY_METADATA,
  type LocalDevWorkerCommandRequest,
  type LocalDevWorkerCommandResponse,
} from './localDevWorkerContract.ts';
import { classifyLocalDevWorkerCommand } from './localDevWorkerGuards.ts';

const REAL_EXECUTION_DEFERRED_REASON =
  'Real Docker execution is not implemented in this worker-boundary PR. A future manual security review PR must add the only process/Docker invocation path.';

function createResponse(
  request: LocalDevWorkerCommandRequest,
  blockedReason: string,
  executionMode: LocalDevWorkerCommandResponse['executionMode'],
): LocalDevWorkerCommandResponse {
  return {
    ok: executionMode === 'dry-run',
    noExecution: true,
    executionMode,
    stdout:
      executionMode === 'dry-run'
        ? `Dry-run accepted for ${request.command} ${request.args.join(' ')}`.trim()
        : '',
    stderr: '',
    exitCode: null,
    blockedReason,
    safetyMetadata: LOCAL_DEV_WORKER_SAFETY_METADATA,
  };
}

export function runLocalDevWorkerCommand(
  request: LocalDevWorkerCommandRequest,
): LocalDevWorkerCommandResponse {
  const classification = classifyLocalDevWorkerCommand(request);

  if (!classification.allowedByClassification) {
    return createResponse(
      request,
      classification.rejections.map((rejection) => rejection.message).join(' '),
      'blocked',
    );
  }

  return createResponse(
    request,
    `${REAL_EXECUTION_DEFERRED_REASON} ${LOCAL_DEV_WORKER_BOUNDARY_NOTE}`,
    'dry-run',
  );
}

export const localDevWorkerDryRunExamples = {
  acceptedVersionCheck: runLocalDevWorkerCommand({
    command: 'node',
    args: ['--version'],
    requestId: 'example-node-version',
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
  }),
  blockedPackageInstall: runLocalDevWorkerCommand({
    command: 'npm',
    args: ['install'],
    requestId: 'example-package-install',
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
  }),
  blockedDockerRuntime: runLocalDevWorkerCommand({
    command: 'docker',
    args: ['run', 'alpine'],
    requestId: 'example-docker-run',
    source: 'dremo-local-dev-sandbox',
    expectedEnvironment: 'local-dev',
  }),
} as const;
