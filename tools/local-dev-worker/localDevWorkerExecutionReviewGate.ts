import {
  LOCAL_DEV_WORKER_SAFETY_METADATA,
  type LocalDevWorkerCommandRejection,
  type LocalDevWorkerCommandRequest,
} from './localDevWorkerContract.ts';
import type { LocalDevWorkerExecutionCapability } from './localDevWorkerExecutionCapability.ts';
import { findLocalDevWorkerExecutionCapability } from './localDevWorkerExecutionManifest.ts';
import {
  classifyLocalDevWorkerCommand,
  rejectDockerRuntimeCommand,
  rejectFileWriteCommand,
  rejectHomeMountOrDockerSocket,
  rejectNetworkCommand,
  rejectPackageInstall,
  rejectSecretAccess,
  rejectShellChaining,
} from './localDevWorkerGuards.ts';

export interface LocalDevWorkerManualSecurityReview {
  completed: boolean;
  reviewedBy: string;
  reviewedAt: string;
  scope: readonly string[];
}

export interface LocalDevWorkerExecutionReviewContext
  extends LocalDevWorkerCommandRequest {
  allowRealExecution: boolean;
  manualSecurityReview: LocalDevWorkerManualSecurityReview;
  productionUiPath: boolean;
  srcImportPath: boolean;
}

export interface LocalDevWorkerExecutionReviewRejection {
  code: string;
  message: string;
}

export interface LocalDevWorkerExecutionReviewGateResult {
  eligibleForFutureExecution: boolean;
  noExecution: true;
  matchedCapability?: LocalDevWorkerExecutionCapability;
  rejectionCodes: string[];
  rejections: LocalDevWorkerExecutionReviewRejection[];
  safetyMetadata: typeof LOCAL_DEV_WORKER_SAFETY_METADATA;
}

function reject(
  code: string,
  message: string,
): LocalDevWorkerExecutionReviewRejection {
  return { code, message };
}

function fromCommandRejection(
  rejection: LocalDevWorkerCommandRejection,
): LocalDevWorkerExecutionReviewRejection {
  return {
    code: rejection.code,
    message: rejection.message,
  };
}

function addCommandRejections(
  target: LocalDevWorkerExecutionReviewRejection[],
  rejections: readonly LocalDevWorkerCommandRejection[],
) {
  target.push(...rejections.map(fromCommandRejection));
}

export function evaluateLocalDevWorkerExecutionReviewGate(
  context: LocalDevWorkerExecutionReviewContext,
): LocalDevWorkerExecutionReviewGateResult {
  const rejections: LocalDevWorkerExecutionReviewRejection[] = [];
  const matchedCapability = findLocalDevWorkerExecutionCapability(context);
  const classification = classifyLocalDevWorkerCommand(context);

  if (!context.allowRealExecution) {
    rejections.push(
      reject(
        'allow_real_execution_false',
        'allowRealExecution must be true before future local-dev execution is eligible.',
      ),
    );
  }

  if (!context.manualSecurityReview.completed) {
    rejections.push(
      reject(
        'manual_review_incomplete',
        'Manual security review must be completed before future execution is eligible.',
      ),
    );
  }

  if (context.manualSecurityReview.reviewedBy.trim().length === 0) {
    rejections.push(
      reject(
        'manual_review_missing_reviewer',
        'Manual security review must include a reviewer.',
      ),
    );
  }

  if (context.manualSecurityReview.reviewedAt.trim().length === 0) {
    rejections.push(
      reject(
        'manual_review_missing_reviewed_at',
        'Manual security review must include a reviewedAt timestamp.',
      ),
    );
  }

  if (!matchedCapability) {
    rejections.push(
      reject(
        'capability_not_found',
        'Command does not match an eligible local-dev execution capability.',
      ),
    );
  } else if (
    !context.manualSecurityReview.scope.includes(matchedCapability.capabilityId)
  ) {
    rejections.push(
      reject(
        'manual_review_scope_missing_capability',
        `Manual security review scope must include ${matchedCapability.capabilityId}.`,
      ),
    );
  }

  if (context.expectedEnvironment !== 'local-dev') {
    rejections.push(
      reject(
        'invalid_environment',
        'Future execution eligibility requires expectedEnvironment = local-dev.',
      ),
    );
  }

  if (context.source !== 'dremo-local-dev-sandbox') {
    rejections.push(
      reject(
        'invalid_source',
        'Future execution eligibility requires source = dremo-local-dev-sandbox.',
      ),
    );
  }

  if (context.productionUiPath) {
    rejections.push(
      reject(
        'production_ui_path_denied',
        'Production UI path must not trigger local-dev execution.',
      ),
    );
  }

  if (context.srcImportPath) {
    rejections.push(
      reject(
        'src_import_path_denied',
        'Browser-bundled src must not import local-dev worker execution code.',
      ),
    );
  }

  if (!classification.allowedByClassification) {
    addCommandRejections(rejections, classification.rejections);
  }

  addCommandRejections(rejections, rejectShellChaining(context));
  addCommandRejections(rejections, rejectPackageInstall(context));
  addCommandRejections(rejections, rejectNetworkCommand(context));
  addCommandRejections(rejections, rejectDockerRuntimeCommand(context));
  addCommandRejections(rejections, rejectFileWriteCommand(context));
  addCommandRejections(rejections, rejectSecretAccess(context));
  addCommandRejections(rejections, rejectHomeMountOrDockerSocket(context));

  const rejectionCodes = [...new Set(rejections.map((entry) => entry.code))];

  return {
    eligibleForFutureExecution: rejectionCodes.length === 0,
    noExecution: true,
    matchedCapability,
    rejectionCodes,
    rejections,
    safetyMetadata: LOCAL_DEV_WORKER_SAFETY_METADATA,
  };
}
