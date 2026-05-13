import { createLocalDevWorkerDryRun } from './localDevWorkerDryRunAdapter.ts';
import { evaluateLocalDevWorkerExecutionReadiness } from './localDevWorkerExecutionReadiness.ts';
import { localDevWorkerExecutionReadinessFixtures } from './localDevWorkerExecutionReadinessFixtures.ts';
import { localDevWorkerDryRunFixtures } from './localDevWorkerFixtures.ts';

export interface LocalDevWorkerDryRunSelfCheckResult {
  passed: boolean;
  checkedDryRunFixtures: number;
  checkedExecutionReadinessFixtures: number;
  failures: string[];
}

function assertCondition(
  condition: boolean,
  message: string,
  failures: string[],
) {
  if (!condition) {
    failures.push(message);
  }
}

export function runLocalDevWorkerDryRunSelfCheck(): LocalDevWorkerDryRunSelfCheckResult {
  const failures: string[] = [];

  for (const fixture of localDevWorkerDryRunFixtures) {
    const response = createLocalDevWorkerDryRun(fixture.request);
    const observedCodes = new Set([
      ...response.trace.rejectionCodes,
      ...response.trace.validationIssueCodes,
    ]);

    assertCondition(
      response.noExecution === fixture.expectedNoExecution,
      `${fixture.name}: noExecution mismatch.`,
      failures,
    );
    assertCondition(
      response.workerResponse.noExecution === true,
      `${fixture.name}: workerResponse must preserve noExecution.`,
      failures,
    );
    assertCondition(
      response.executionMode === fixture.expectedExecutionMode,
      `${fixture.name}: expected executionMode ${fixture.expectedExecutionMode}, got ${response.executionMode}.`,
      failures,
    );

    if (fixture.expectedAllowedByClassification) {
      assertCondition(
        observedCodes.size === 0,
        `${fixture.name}: expected no rejection or validation codes, got ${[
          ...observedCodes,
        ].join(', ')}.`,
        failures,
      );
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected rejection/validation code ${code}.`,
        failures,
      );
    }
  }

  for (const fixture of localDevWorkerExecutionReadinessFixtures) {
    const response = evaluateLocalDevWorkerExecutionReadiness(fixture.request);
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.noExecution === fixture.expectedNoExecution,
      `${fixture.name}: readiness noExecution mismatch.`,
      failures,
    );
    assertCondition(
      response.readyForFutureExecution ===
        fixture.expectedReadyForFutureExecution,
      `${fixture.name}: expected readyForFutureExecution ${fixture.expectedReadyForFutureExecution}, got ${response.readyForFutureExecution}.`,
      failures,
    );

    if (fixture.expectedMatchedCapabilityId) {
      assertCondition(
        response.matchedCapabilityId === fixture.expectedMatchedCapabilityId,
        `${fixture.name}: expected matched capability ${fixture.expectedMatchedCapabilityId}, got ${response.matchedCapabilityId}.`,
        failures,
      );
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected readiness rejection code ${code}.`,
        failures,
      );
    }
  }

  return {
    passed: failures.length === 0,
    checkedDryRunFixtures: localDevWorkerDryRunFixtures.length,
    checkedExecutionReadinessFixtures:
      localDevWorkerExecutionReadinessFixtures.length,
    failures,
  };
}

export const localDevWorkerDryRunSelfCheckSummary =
  runLocalDevWorkerDryRunSelfCheck();
