import {
  LOCAL_DEV_WORKER_SAFETY_METADATA,
  type LocalDevWorkerCommandRejection,
} from './localDevWorkerContract.ts';
import type { LocalDevWorkerValidationIssue } from './localDevWorkerRequestValidation.ts';

export interface LocalDevWorkerDryRunTrace {
  requestId: string;
  timestampPolicy: 'not-generated-in-dry-run';
  workerBoundary: 'outside-browser-bundle';
  executionStatus: 'dry-run-only';
  noExecution: true;
  guardVersion: 'local-dev-worker-guards-v1';
  policyVersion: 'local-dev-worker-policy-v1';
  normalizedCommand: string;
  rejectionCodes: string[];
  validationIssueCodes: string[];
  safetyFlags: typeof LOCAL_DEV_WORKER_SAFETY_METADATA;
}

export function summarizeLocalDevWorkerRejections(
  rejections: readonly LocalDevWorkerCommandRejection[],
) {
  return rejections.map((rejection) => rejection.code);
}

export function summarizeLocalDevWorkerValidationIssues(
  issues: readonly LocalDevWorkerValidationIssue[],
) {
  return issues.map((issue) => issue.code);
}

export function createLocalDevWorkerTrace(input: {
  requestId: string;
  normalizedCommand: string;
  rejections: readonly LocalDevWorkerCommandRejection[];
  validationIssues: readonly LocalDevWorkerValidationIssue[];
}): LocalDevWorkerDryRunTrace {
  return {
    requestId: input.requestId,
    timestampPolicy: 'not-generated-in-dry-run',
    workerBoundary: 'outside-browser-bundle',
    executionStatus: 'dry-run-only',
    noExecution: true,
    guardVersion: 'local-dev-worker-guards-v1',
    policyVersion: 'local-dev-worker-policy-v1',
    normalizedCommand: input.normalizedCommand,
    rejectionCodes: summarizeLocalDevWorkerRejections(input.rejections),
    validationIssueCodes: summarizeLocalDevWorkerValidationIssues(
      input.validationIssues,
    ),
    safetyFlags: LOCAL_DEV_WORKER_SAFETY_METADATA,
  };
}
