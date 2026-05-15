import { createLocalDevWorkerDryRun } from './localDevWorkerDryRunAdapter.ts';
import { classifyLocalDevWorkerDockerReadiness } from './localDevWorkerDockerReadinessAdapter.ts';
import { localDevWorkerDockerReadinessFixtures } from './localDevWorkerDockerReadinessFixtures.ts';
import { evaluateLocalDevWorkerDockerContainerReadinessGate } from './localDevWorkerDockerContainerReadinessGate.ts';
import { localDevWorkerDockerContainerPolicyFixtures } from './localDevWorkerDockerContainerPolicyFixtures.ts';
import { executeLocalDevWorkerDockerContainerSmoke } from './localDevWorkerDockerContainerSmokeAdapter.ts';
import { localDevWorkerDockerContainerSmokeFixtures } from './localDevWorkerDockerContainerSmokeFixtures.ts';
import { LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS } from './localDevWorkerDockerContainerSmokePolicy.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
  LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS,
  validateLocalDevWorkerDockerContainerIdentity,
} from './localDevWorkerDockerContainerIdentity.ts';
import { createLocalDevWorkerDockerCleanupPlan } from './localDevWorkerDockerCleanupPlan.ts';
import { evaluateLocalDevWorkerDockerCleanupPolicy } from './localDevWorkerDockerCleanupPolicy.ts';
import { localDevWorkerDockerCleanupFixtures } from './localDevWorkerDockerCleanupFixtures.ts';
import { executeLocalDevWorkerDockerSmokeCleanup } from './localDevWorkerDockerCleanupAdapter.ts';
import { localDevWorkerDockerCleanupExecutionFixtures } from './localDevWorkerDockerCleanupExecutionFixtures.ts';
import { createLocalDevWorkerDockerSmokeAuditRecord } from './localDevWorkerDockerSmokeAudit.ts';
import { localDevWorkerDockerSmokeAuditFixtures } from './localDevWorkerDockerSmokeAuditFixtures.ts';
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
  checkedDockerContainerPolicyFixtures: number;
  checkedDockerContainerSmokeFixtures: number;
  checkedDockerSmokeAuditFixtures: number;
  checkedDockerCleanupFixtures: number;
  checkedDockerCleanupExecutionFixtures: number;
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

  for (const fixture of localDevWorkerDockerContainerPolicyFixtures) {
    const response = evaluateLocalDevWorkerDockerContainerReadinessGate(
      fixture.input,
    );
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.noExecution === true,
      `${fixture.name}: container policy gate must preserve noExecution.`,
      failures,
    );
    assertCondition(
      response.containerStarted === false,
      `${fixture.name}: containerStarted must remain false.`,
      failures,
    );
    assertCondition(
      response.imagePulled === false,
      `${fixture.name}: imagePulled must remain false.`,
      failures,
    );
    assertCondition(
      response.dockerRunExecuted === false,
      `${fixture.name}: dockerRunExecuted must remain false.`,
      failures,
    );
    assertCondition(
      response.readyForFutureContainerExecution ===
        fixture.expectedReadyForFutureContainerExecution,
      `${fixture.name}: expected readyForFutureContainerExecution ${fixture.expectedReadyForFutureContainerExecution}, got ${response.readyForFutureContainerExecution}.`,
      failures,
    );
    assertCondition(
      !!response.plan === fixture.expectedPlan,
      `${fixture.name}: expected plan presence ${fixture.expectedPlan}, got ${!!response.plan}.`,
      failures,
    );

    if (response.plan) {
      assertCondition(
        response.plan.noExecution === true,
        `${fixture.name}: plan must preserve noExecution.`,
        failures,
      );
      assertCondition(
        response.plan.executionMode === 'plan-only',
        `${fixture.name}: plan executionMode must be plan-only.`,
        failures,
      );
      assertCondition(
        response.plan.networkPolicy.allowNetwork === false,
        `${fixture.name}: plan network must remain disabled.`,
        failures,
      );
      assertCondition(
        response.plan.mountPolicy.allowDockerSocketMount === false,
        `${fixture.name}: plan must not allow Docker socket mount.`,
        failures,
      );
      assertCondition(
        response.plan.mountPolicy.allowHomeMount === false,
        `${fixture.name}: plan must not allow home mount.`,
        failures,
      );
      assertCondition(
        response.plan.mountPolicy.allowWorkspaceMount === false,
        `${fixture.name}: plan must not allow workspace mount yet.`,
        failures,
      );
      assertCondition(
        response.plan.securityPolicy.allowPrivileged === false,
        `${fixture.name}: plan must not allow privileged mode.`,
        failures,
      );
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected container policy rejection code ${code}.`,
        failures,
      );
    }
  }

  for (const fixture of localDevWorkerDockerContainerSmokeFixtures) {
    const response = await executeLocalDevWorkerDockerContainerSmoke({
      request: fixture.request,
      dockerReadiness: fixture.dockerReadiness,
      config: fixture.config,
      trustedManualReview: fixture.trustedManualReview,
    });
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.noExecution === fixture.expectedNoExecution,
      `${fixture.name}: expected noExecution ${fixture.expectedNoExecution}, got ${response.noExecution}.`,
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
    assertCondition(
      response.imagePulled === false,
      `${fixture.name}: imagePulled must remain false.`,
      failures,
    );
    assertCondition(
      response.imageBuilt === false,
      `${fixture.name}: imageBuilt must remain false.`,
      failures,
    );
    assertCondition(
      response.networkAllowed === false,
      `${fixture.name}: networkAllowed must remain false.`,
      failures,
    );
    assertCondition(
      response.mountsAllowed === false,
      `${fixture.name}: mountsAllowed must remain false.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.dockerSocketMounted === false,
      `${fixture.name}: Docker socket must not be mounted.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.homeMounted === false,
      `${fixture.name}: home must not be mounted.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.workspaceMounted === false,
      `${fixture.name}: workspace must not be mounted.`,
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
      response.safetyMetadata.runAsNonRoot === true,
      `${fixture.name}: smoke container must run as non-root.`,
      failures,
    );
    assertCondition(
      response.cleanupRisk === response.auditRecord.cleanupRisk,
      `${fixture.name}: cleanupRisk should mirror audit record cleanupRisk.`,
      failures,
    );
    assertCondition(
      response.outcome === response.auditRecord.outcome,
      `${fixture.name}: outcome should mirror audit record outcome.`,
      failures,
    );
    assertCondition(
      response.sanitizedStdout === response.auditRecord.stdoutPreview,
      `${fixture.name}: sanitizedStdout should mirror audit stdoutPreview.`,
      failures,
    );
    assertCondition(
      response.sanitizedStderr === response.auditRecord.stderrPreview,
      `${fixture.name}: sanitizedStderr should mirror audit stderrPreview.`,
      failures,
    );

    if (fixture.expectedExecutionAttempted) {
      assertCondition(
        response.command === 'docker',
        `${fixture.name}: smoke execution must use docker executable.`,
        failures,
      );
      assertCondition(
        JSON.stringify(response.args) ===
          JSON.stringify(LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS),
        `${fixture.name}: smoke args must match the exact reviewed allowlist.`,
        failures,
      );
      assertCondition(
        response.args.includes('--name') &&
          response.args.includes(LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME),
        `${fixture.name}: smoke args must include deterministic container name.`,
        failures,
      );
      for (const label of LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS) {
        assertCondition(
          response.args.includes(`${label.key}=${label.value}`),
          `${fixture.name}: smoke args must include allowlisted label ${label.key}.`,
          failures,
        );
      }
    }

    if (response.ok) {
      assertCondition(
        response.stdout.includes('hello'),
        `${fixture.name}: successful smoke output must include hello.`,
        failures,
      );
      assertCondition(
        response.containerStarted === fixture.expectedContainerStartedWhenOk,
        `${fixture.name}: successful smoke should set containerStarted ${fixture.expectedContainerStartedWhenOk}.`,
        failures,
      );
    }

    if (
      fixture.allowStructuredRuntimeUnavailable &&
      (observedCodes.has('optional_docker_cli_unavailable') ||
        observedCodes.has('docker_daemon_unavailable') ||
        observedCodes.has('container_smoke_image_unavailable') ||
        observedCodes.has('container_smoke_execution_failed'))
    ) {
      continue;
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected smoke rejection code ${code}.`,
        failures,
      );
    }
  }

  for (const fixture of localDevWorkerDockerSmokeAuditFixtures) {
    const auditRecord = createLocalDevWorkerDockerSmokeAuditRecord(
      fixture.input,
      fixture.options,
    );

    assertCondition(
      auditRecord.outcome === fixture.expectedOutcome,
      `${fixture.name}: expected outcome ${fixture.expectedOutcome}, got ${auditRecord.outcome}.`,
      failures,
    );
    assertCondition(
      auditRecord.cleanupRisk === fixture.expectedCleanupRisk,
      `${fixture.name}: expected cleanupRisk ${fixture.expectedCleanupRisk}, got ${auditRecord.cleanupRisk}.`,
      failures,
    );
    assertCondition(
      auditRecord.commandPreview[0] === 'docker',
      `${fixture.name}: command preview must start with docker.`,
      failures,
    );
    assertCondition(
      JSON.stringify(auditRecord.commandPreview.slice(1)) ===
        JSON.stringify(LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS),
      `${fixture.name}: audit command preview must preserve the exact reviewed smoke args.`,
      failures,
    );
    assertCondition(
      auditRecord.imagePulled === false,
      `${fixture.name}: audit must preserve imagePulled false.`,
      failures,
    );
    assertCondition(
      auditRecord.imageBuilt === false,
      `${fixture.name}: audit must preserve imageBuilt false.`,
      failures,
    );
    assertCondition(
      auditRecord.networkAllowed === false,
      `${fixture.name}: audit must preserve networkAllowed false.`,
      failures,
    );
    assertCondition(
      auditRecord.mountsAllowed === false,
      `${fixture.name}: audit must preserve mountsAllowed false.`,
      failures,
    );
    assertCondition(
      auditRecord.shellAllowed === false,
      `${fixture.name}: audit must preserve shellAllowed false.`,
      failures,
    );
    assertCondition(
      auditRecord.hostEnvironmentInherited === false,
      `${fixture.name}: audit must preserve hostEnvironmentInherited false.`,
      failures,
    );
    assertCondition(
      auditRecord.containerName === LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
      `${fixture.name}: audit must preserve deterministic container name.`,
      failures,
    );
    assertCondition(
      validateLocalDevWorkerDockerContainerIdentity({
        containerName: auditRecord.containerName,
        labels: auditRecord.containerLabels,
      }).valid,
      `${fixture.name}: audit container identity must remain allowlisted.`,
      failures,
    );
    assertCondition(
      auditRecord.cleanupExecuted === false,
      `${fixture.name}: audit must not claim cleanup execution.`,
      failures,
    );
    assertCondition(
      auditRecord.cleanupPlanAvailable ===
        (auditRecord.cleanupRisk === 'unknown_after_timeout'),
      `${fixture.name}: cleanupPlanAvailable should only be true for unknown timeout risk.`,
      failures,
    );

    if (fixture.options?.maxStdoutBytes !== undefined) {
      assertCondition(
        Buffer.from(auditRecord.stdoutPreview, 'utf8').byteLength <=
          fixture.options.maxStdoutBytes,
        `${fixture.name}: stdout preview exceeded configured byte cap.`,
        failures,
      );
    }

    if (fixture.options?.maxStderrBytes !== undefined) {
      assertCondition(
        Buffer.from(auditRecord.stderrPreview, 'utf8').byteLength <=
          fixture.options.maxStderrBytes,
        `${fixture.name}: stderr preview exceeded configured byte cap.`,
        failures,
      );
    }

    for (const expected of fixture.expectedStdoutIncludes ?? []) {
      assertCondition(
        auditRecord.stdoutPreview.includes(expected),
        `${fixture.name}: expected stdout preview to include ${expected}.`,
        failures,
      );
    }

    for (const expected of fixture.expectedStderrIncludes ?? []) {
      assertCondition(
        auditRecord.stderrPreview.includes(expected),
        `${fixture.name}: expected stderr preview to include ${expected}.`,
        failures,
      );
    }

    for (const forbidden of fixture.forbiddenStdoutPatterns ?? []) {
      assertCondition(
        !forbidden.test(auditRecord.stdoutPreview),
        `${fixture.name}: stdout preview still matched forbidden pattern ${forbidden}.`,
        failures,
      );
    }

    for (const forbidden of fixture.forbiddenStderrPatterns ?? []) {
      assertCondition(
        !forbidden.test(auditRecord.stderrPreview),
        `${fixture.name}: stderr preview still matched forbidden pattern ${forbidden}.`,
        failures,
      );
    }
  }

  const cleanupPlan = createLocalDevWorkerDockerCleanupPlan();
  assertCondition(
    cleanupPlan.noExecution === true,
    'cleanup plan must preserve noExecution true.',
    failures,
  );
  assertCondition(
    cleanupPlan.cleanupExecutionImplemented === false,
    'cleanup plan must not implement execution.',
    failures,
  );
  assertCondition(
    JSON.stringify(cleanupPlan.commandPreview) ===
      JSON.stringify(['docker', 'rm', '-f', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME]),
    'cleanup plan preview must be exact and deterministic.',
    failures,
  );
  assertCondition(
    cleanupPlan.targetContainerName === LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
    'cleanup plan target must be deterministic.',
    failures,
  );
  assertCondition(
    cleanupPlan.requiredLabels.length === LOCAL_DEV_WORKER_DOCKER_SMOKE_LABELS.length,
    'cleanup plan must preserve required labels.',
    failures,
  );
  assertCondition(
    cleanupPlan.cleanupRiskAddressed === true,
    'cleanup plan should address only the exact deterministic cleanup target.',
    failures,
  );

  for (const fixture of localDevWorkerDockerCleanupFixtures) {
    const response = evaluateLocalDevWorkerDockerCleanupPolicy({
      command: fixture.command,
      args: fixture.args,
    });
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      fixture.expectedPlanOnly === true,
      `${fixture.name}: cleanup fixture must remain plan-only.`,
      failures,
    );
    assertCondition(
      response.allowed === fixture.expectedAllowed,
      `${fixture.name}: expected cleanup allowed ${fixture.expectedAllowed}, got ${response.allowed}.`,
      failures,
    );

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected cleanup rejection code ${code}.`,
        failures,
      );
    }
  }

  for (const fixture of localDevWorkerDockerCleanupExecutionFixtures) {
    const response = await executeLocalDevWorkerDockerSmokeCleanup({
      request: fixture.request,
      config: fixture.config,
      trustedManualReview: fixture.trustedManualReview,
    });
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.noExecution === fixture.expectedNoExecution,
      `${fixture.name}: cleanup execution noExecution mismatch.`,
      failures,
    );
    assertCondition(
      response.executionMode === fixture.expectedExecutionMode,
      `${fixture.name}: expected cleanup executionMode ${fixture.expectedExecutionMode}, got ${response.executionMode}.`,
      failures,
    );
    assertCondition(
      response.executionAttempted === fixture.expectedExecutionAttempted,
      `${fixture.name}: expected cleanup executionAttempted ${fixture.expectedExecutionAttempted}, got ${response.executionAttempted}.`,
      failures,
    );
    assertCondition(
      fixture.expectedOutcomes.includes(response.outcome),
      `${fixture.name}: unexpected cleanup outcome ${response.outcome}.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.cleanupTarget === LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
      `${fixture.name}: cleanup target metadata must be deterministic.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.arbitraryTargetAllowed === false,
      `${fixture.name}: arbitrary cleanup target must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.wildcardAllowed === false,
      `${fixture.name}: wildcard cleanup must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.containerIdAllowed === false,
      `${fixture.name}: container-id cleanup must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.pruneAllowed === false,
      `${fixture.name}: prune must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.inspectAllowed === false,
      `${fixture.name}: inspect must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.listAllowed === false,
      `${fixture.name}: list must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.dockerSocketMounted === false,
      `${fixture.name}: Docker socket must not be mounted.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.homeMounted === false,
      `${fixture.name}: home must not be mounted.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.workspaceMounted === false,
      `${fixture.name}: workspace must not be mounted.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.networkAllowed === false,
      `${fixture.name}: network must remain disabled.`,
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
      Buffer.from(response.sanitizedStdout, 'utf8').byteLength <=
        fixture.config.maxStdoutBytes,
      `${fixture.name}: sanitized stdout exceeded configured byte cap.`,
      failures,
    );
    assertCondition(
      Buffer.from(response.sanitizedStderr, 'utf8').byteLength <=
        fixture.config.maxStderrBytes,
      `${fixture.name}: sanitized stderr exceeded configured byte cap.`,
      failures,
    );

    if (fixture.expectedExecutionAttempted) {
      assertCondition(
        response.command === 'docker',
        `${fixture.name}: exact cleanup must use docker executable.`,
        failures,
      );
      assertCondition(
        JSON.stringify(response.args) ===
          JSON.stringify(['rm', '-f', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME]),
        `${fixture.name}: exact cleanup args must not drift.`,
        failures,
      );
    } else {
      assertCondition(
        response.cleanupExecuted === false,
        `${fixture.name}: blocked cleanup must not execute.`,
        failures,
      );
    }

    if (response.ok) {
      assertCondition(
        response.cleanupExecuted === fixture.expectedCleanupExecutedWhenOk,
        `${fixture.name}: successful cleanup should set cleanupExecuted ${fixture.expectedCleanupExecutedWhenOk}.`,
        failures,
      );
    }

    if (
      fixture.allowStructuredRuntimeUnavailable &&
      response.executionAttempted &&
      fixture.expectedOutcomes.includes(response.outcome)
    ) {
      continue;
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected cleanup execution rejection code ${code}.`,
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
    checkedDockerContainerPolicyFixtures:
      localDevWorkerDockerContainerPolicyFixtures.length,
    checkedDockerContainerSmokeFixtures:
      localDevWorkerDockerContainerSmokeFixtures.length,
    checkedDockerSmokeAuditFixtures:
      localDevWorkerDockerSmokeAuditFixtures.length,
    checkedDockerCleanupFixtures:
      localDevWorkerDockerCleanupFixtures.length,
    checkedDockerCleanupExecutionFixtures:
      localDevWorkerDockerCleanupExecutionFixtures.length,
    failures,
  };
}
