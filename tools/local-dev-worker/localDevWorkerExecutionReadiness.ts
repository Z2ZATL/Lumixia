import {
  LOCAL_DEV_WORKER_SAFETY_METADATA,
  type LocalDevWorkerCommandClassification,
} from './localDevWorkerContract.ts';
import type { LocalDevWorkerExecutionCapability } from './localDevWorkerExecutionCapability.ts';
import {
  evaluateLocalDevWorkerExecutionReviewGate,
  type LocalDevWorkerManualSecurityReview,
} from './localDevWorkerExecutionReviewGate.ts';
import { findLocalDevWorkerExecutionCapability } from './localDevWorkerExecutionManifest.ts';
import { classifyLocalDevWorkerCommand } from './localDevWorkerGuards.ts';
import {
  validateLocalDevWorkerDryRunRequest,
  type LocalDevWorkerDryRunRequest,
  type LocalDevWorkerValidationResult,
} from './localDevWorkerRequestValidation.ts';

export interface LocalDevWorkerExecutionReadinessRequest
  extends LocalDevWorkerDryRunRequest {
  allowRealExecution: boolean;
  manualSecurityReview: LocalDevWorkerManualSecurityReview;
  productionUiPath: boolean;
  srcImportPath: boolean;
}

export interface LocalDevWorkerExecutionReadinessWarning {
  code: string;
  message: string;
}

export interface LocalDevWorkerExecutionReadinessResult {
  readyForFutureExecution: boolean;
  noExecution: true;
  matchedCapabilityId?: string;
  rejectionCodes: string[];
  warnings: LocalDevWorkerExecutionReadinessWarning[];
  safetyMetadata: typeof LOCAL_DEV_WORKER_SAFETY_METADATA;
  explanation: string;
  dryRunValidation: LocalDevWorkerValidationResult;
  commandClassification: LocalDevWorkerCommandClassification;
  matchedCapability?: LocalDevWorkerExecutionCapability;
}

function warning(
  code: string,
  message: string,
): LocalDevWorkerExecutionReadinessWarning {
  return { code, message };
}

function explain(readyForFutureExecution: boolean, rejectionCodes: string[]) {
  if (readyForFutureExecution) {
    return 'The request is theoretically eligible for a future reviewed local-dev execution adapter, but this PR still performs no execution.';
  }

  return `The request is not eligible for future execution: ${rejectionCodes.join(
    ', ',
  )}.`;
}

export function evaluateLocalDevWorkerExecutionReadiness(
  request: LocalDevWorkerExecutionReadinessRequest,
): LocalDevWorkerExecutionReadinessResult {
  const dryRunValidation = validateLocalDevWorkerDryRunRequest(request);
  const commandClassification = classifyLocalDevWorkerCommand(request);
  const matchedCapability = findLocalDevWorkerExecutionCapability(request);
  const reviewGate = evaluateLocalDevWorkerExecutionReviewGate(request);
  const rejectionCodes = [
    ...new Set([
      ...dryRunValidation.issues.map((issue) => issue.code),
      ...commandClassification.rejections.map((rejection) => rejection.code),
      ...reviewGate.rejectionCodes,
    ]),
  ];
  const warnings: LocalDevWorkerExecutionReadinessWarning[] = [];

  if (matchedCapability?.defaultEnabled === false) {
    warnings.push(
      warning(
        'capability_default_disabled',
        'The matched capability is disabled by default and requires explicit reviewed opt-in in a future PR.',
      ),
    );
  }

  if (matchedCapability?.allowedInProduction === false) {
    warnings.push(
      warning(
        'production_not_allowed',
        'The matched capability is local-dev only and must not be exposed in production UI.',
      ),
    );
  }

  const readyForFutureExecution =
    dryRunValidation.valid &&
    commandClassification.allowedByClassification &&
    reviewGate.eligibleForFutureExecution;

  return {
    readyForFutureExecution,
    noExecution: true,
    matchedCapabilityId: matchedCapability?.capabilityId,
    rejectionCodes,
    warnings,
    safetyMetadata: LOCAL_DEV_WORKER_SAFETY_METADATA,
    explanation: explain(readyForFutureExecution, rejectionCodes),
    dryRunValidation,
    commandClassification,
    matchedCapability,
  };
}
