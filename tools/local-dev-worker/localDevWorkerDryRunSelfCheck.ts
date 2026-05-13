import { createLocalDevWorkerDryRun } from './localDevWorkerDryRunAdapter.ts';
import { localDevWorkerDryRunFixtures } from './localDevWorkerFixtures.ts';

export interface LocalDevWorkerDryRunSelfCheckResult {
  passed: boolean;
  checkedFixtures: number;
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

  return {
    passed: failures.length === 0,
    checkedFixtures: localDevWorkerDryRunFixtures.length,
    failures,
  };
}

export const localDevWorkerDryRunSelfCheckSummary =
  runLocalDevWorkerDryRunSelfCheck();
