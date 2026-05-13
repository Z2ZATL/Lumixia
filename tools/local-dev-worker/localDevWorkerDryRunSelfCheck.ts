import { createLocalDevWorkerDryRun } from './localDevWorkerDryRunAdapter.ts';
import { classifyLocalDevWorkerDockerReadiness } from './localDevWorkerDockerReadinessAdapter.ts';
import { localDevWorkerDockerReadinessFixtures } from './localDevWorkerDockerReadinessFixtures.ts';
import { evaluateLocalDevWorkerExecutionReadiness } from './localDevWorkerExecutionReadiness.ts';
import { localDevWorkerExecutionReadinessFixtures } from './localDevWorkerExecutionReadinessFixtures.ts';
import { executeLocalDevWorkerVersionCommand } from './localDevWorkerVersionExecutionAdapter.ts';
import { localDevWorkerVersionExecutionFixtures } from './localDevWorkerVersionExecutionFixtures.ts';
import { localDevWorkerDryRunFixtures } from './localDevWorkerFixtures.ts';

export interface LocalDevWorkerDryRunSelfCheckResult {
  passed: boolean;
  checkedDryRunFixtures: number;
  checkedExecutionReadinessFixtures: number;
  checkedVersionExecutionFixtures: number;
  checkedDockerReadinessFixtures: number;
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
  throw new Error(
    'runLocalDevWorkerDryRunSelfCheck is async now. Use runLocalDevWorkerDryRunSelfCheckAsync.',
  );
}

export async function runLocalDevWorkerDryRunSelfCheckAsync(): Promise<LocalDevWorkerDryRunSelfCheckResult> {
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

  for (const fixture of localDevWorkerVersionExecutionFixtures) {
    const response = await executeLocalDevWorkerVersionCommand({
      request: fixture.request,
      config: fixture.config,
      trustedManualReview: fixture.trustedManualReview,
    });
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.noExecution === fixture.expectedNoExecution,
      `${fixture.name}: version execution noExecution mismatch.`,
      failures,
    );
    assertCondition(
      response.executionMode === fixture.expectedExecutionMode,
      `${fixture.name}: expected executionMode ${fixture.expectedExecutionMode}, got ${response.executionMode}.`,
      failures,
    );
    assertCondition(
      response.executionAttempted === fixture.expectedExecutionAttempted,
      `${fixture.name}: expected executionAttempted ${fixture.expectedExecutionAttempted}, got ${response.executionAttempted}.`,
      failures,
    );

    if (fixture.expectedCapabilityId && !fixture.allowCommandUnavailable) {
      assertCondition(
        response.capabilityId === fixture.expectedCapabilityId,
        `${fixture.name}: expected capability ${fixture.expectedCapabilityId}, got ${response.capabilityId}.`,
        failures,
      );
    }

    if (fixture.expectedExecutionMode === 'executed') {
      assertCondition(
        response.durationMs >= 0,
        `${fixture.name}: durationMs should be non-negative.`,
        failures,
      );
      assertCondition(
        Buffer.from(response.stdout, 'utf8').byteLength <=
          fixture.config.maxStdoutBytes,
        `${fixture.name}: stdout exceeded configured byte cap.`,
        failures,
      );
      assertCondition(
        Buffer.from(response.stderr, 'utf8').byteLength <=
          fixture.config.maxStderrBytes,
        `${fixture.name}: stderr exceeded configured byte cap.`,
        failures,
      );
      assertCondition(
        response.safetyMetadata.shellAllowed === false,
        `${fixture.name}: shell must remain disabled.`,
        failures,
      );
      assertCondition(
        response.safetyMetadata.dockerRuntimeAllowed === false,
        `${fixture.name}: Docker runtime must remain disabled.`,
        failures,
      );
      assertCondition(
        response.safetyMetadata.dockerDaemonStateQueried === false,
        `${fixture.name}: Docker daemon state must not be queried.`,
        failures,
      );
      assertCondition(
        response.safetyMetadata.dockerSocketMounted === false,
        `${fixture.name}: Docker socket must not be mounted.`,
        failures,
      );
      assertCondition(
        response.safetyMetadata.hostEnvironmentInherited === false,
        `${fixture.name}: host environment must not be inherited.`,
        failures,
      );
    }

    if (
      fixture.allowCommandUnavailable &&
      (observedCodes.has('optional_command_unavailable') ||
        observedCodes.has('optional_docker_cli_unavailable'))
    ) {
      continue;
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected execution rejection code ${code}.`,
        failures,
      );
    }
  }

  for (const fixture of localDevWorkerDockerReadinessFixtures) {
    const response = await classifyLocalDevWorkerDockerReadiness({
      request: fixture.request,
      config: fixture.config,
      trustedManualReview: fixture.trustedManualReview,
    });
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.noContainerExecution === fixture.expectedNoContainerExecution,
      `${fixture.name}: Docker readiness must preserve noContainerExecution.`,
      failures,
    );
    assertCondition(
      fixture.expectedReadinessStates.includes(response.readinessState),
      `${fixture.name}: expected readinessState ${fixture.expectedReadinessStates.join(
        ' or ',
      )}, got ${response.readinessState}.`,
      failures,
    );
    assertCondition(
      !!response.commandAttempted === fixture.expectedCommandAttempted,
      `${fixture.name}: expected commandAttempted presence ${fixture.expectedCommandAttempted}, got ${response.commandAttempted ?? 'none'}.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.containerStarted === false,
      `${fixture.name}: containerStarted must remain false.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.imagePulled === false,
      `${fixture.name}: imagePulled must remain false.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.imageBuilt === false,
      `${fixture.name}: imageBuilt must remain false.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.dockerRuntimeAllowed === false,
      `${fixture.name}: Docker runtime must remain disabled.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.dockerSocketMounted === false,
      `${fixture.name}: Docker socket must not be mounted.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.homeMounted === false,
      `${fixture.name}: home directory must not be mounted.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.shellAllowed === false,
      `${fixture.name}: shell must remain disabled.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.hostEnvironmentInherited === false,
      `${fixture.name}: host environment must not be inherited.`,
      failures,
    );
    assertCondition(
      Buffer.from(response.stdout, 'utf8').byteLength <=
        fixture.config.maxStdoutBytes,
      `${fixture.name}: stdout exceeded configured byte cap.`,
      failures,
    );
    assertCondition(
      Buffer.from(response.stderr, 'utf8').byteLength <=
        fixture.config.maxStderrBytes,
      `${fixture.name}: stderr exceeded configured byte cap.`,
      failures,
    );

    if (
      fixture.expectedCommandAttempted &&
      ['cli_unavailable', 'daemon_unavailable', 'probe_failed'].includes(
        response.readinessState,
      )
    ) {
      continue;
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected Docker readiness rejection code ${code}.`,
        failures,
      );
    }
  }

  return {
    passed: failures.length === 0,
    checkedDryRunFixtures: localDevWorkerDryRunFixtures.length,
    checkedExecutionReadinessFixtures:
      localDevWorkerExecutionReadinessFixtures.length,
    checkedVersionExecutionFixtures: localDevWorkerVersionExecutionFixtures.length,
    checkedDockerReadinessFixtures: localDevWorkerDockerReadinessFixtures.length,
    failures,
  };
}
