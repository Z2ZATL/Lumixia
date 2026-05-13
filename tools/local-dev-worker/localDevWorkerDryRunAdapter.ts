import {
  LOCAL_DEV_WORKER_SAFETY_METADATA,
  type LocalDevWorkerCommandResponse,
} from './localDevWorkerContract.ts';
import { classifyLocalDevWorkerCommand } from './localDevWorkerGuards.ts';
import { runLocalDevWorkerCommand } from './localDevWorkerRunner.ts';
import {
  createInvalidLocalDevWorkerDryRunRequest,
  normalizeLocalDevWorkerDryRunRequest,
  validateLocalDevWorkerDryRunRequest,
  type LocalDevWorkerDryRunRequest,
} from './localDevWorkerRequestValidation.ts';
import {
  createLocalDevWorkerTrace,
  type LocalDevWorkerDryRunTrace,
} from './localDevWorkerTrace.ts';

export interface LocalDevWorkerDryRunResponse {
  requestId: string;
  ok: boolean;
  noExecution: true;
  executionMode: 'blocked' | 'dry-run';
  normalizedCommand: string;
  workerResponse: LocalDevWorkerCommandResponse;
  trace: LocalDevWorkerDryRunTrace;
}

function commandToString(request: LocalDevWorkerDryRunRequest) {
  return [request.command, ...request.args]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createValidationBlockedResponse(
  blockedReason: string,
): LocalDevWorkerCommandResponse {
  return {
    ok: false,
    noExecution: true,
    executionMode: 'blocked',
    stdout: '',
    stderr: '',
    exitCode: null,
    blockedReason,
    safetyMetadata: LOCAL_DEV_WORKER_SAFETY_METADATA,
  };
}

export function createLocalDevWorkerDryRun(
  request: unknown,
): LocalDevWorkerDryRunResponse {
  const validation = validateLocalDevWorkerDryRunRequest(request);
  const normalizedRequest = validation.valid
    ? normalizeLocalDevWorkerDryRunRequest(request as LocalDevWorkerDryRunRequest)
    : createInvalidLocalDevWorkerDryRunRequest(request);
  const classification = classifyLocalDevWorkerCommand(normalizedRequest);
  const normalizedCommand =
    classification.normalizedCommand || commandToString(normalizedRequest);
  const workerResponse = validation.valid
    ? runLocalDevWorkerCommand(normalizedRequest)
    : createValidationBlockedResponse(
        validation.issues.map((issue) => issue.message).join(' '),
      );

  return {
    requestId: normalizedRequest.requestId,
    ok: workerResponse.ok,
    noExecution: true,
    executionMode: workerResponse.executionMode,
    normalizedCommand,
    workerResponse,
    trace: createLocalDevWorkerTrace({
      requestId: normalizedRequest.requestId,
      normalizedCommand,
      rejections: classification.rejections,
      validationIssues: validation.issues,
    }),
  };
}
