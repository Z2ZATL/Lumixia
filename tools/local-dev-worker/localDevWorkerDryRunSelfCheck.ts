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
import {
  LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND,
  evaluateLocalDevWorkerDockerCleanupPolicy,
} from './localDevWorkerDockerCleanupPolicy.ts';
import { localDevWorkerDockerCleanupFixtures } from './localDevWorkerDockerCleanupFixtures.ts';
import { executeLocalDevWorkerDockerSmokeCleanup } from './localDevWorkerDockerCleanupAdapter.ts';
import { localDevWorkerDockerCleanupExecutionFixtures } from './localDevWorkerDockerCleanupExecutionFixtures.ts';
import { createLocalDevWorkerDockerSmokeAuditRecord } from './localDevWorkerDockerSmokeAudit.ts';
import { localDevWorkerDockerSmokeAuditFixtures } from './localDevWorkerDockerSmokeAuditFixtures.ts';
import { runLocalDevWorkerDockerSmokeLifecycle } from './localDevWorkerDockerSmokeLifecycle.ts';
import { localDevWorkerDockerSmokeLifecycleFixtures } from './localDevWorkerDockerSmokeLifecycleFixtures.ts';
import {
  createLocalDevWorkerDockerSmokeLifecycleReport,
  formatLocalDevWorkerDockerSmokeLifecycleJsonSummary,
  formatLocalDevWorkerDockerSmokeLifecycleMarkdown,
} from './localDevWorkerDockerSmokeLifecycleReport.ts';
import { localDevWorkerDockerSmokeLifecycleReportFixtures } from './localDevWorkerDockerSmokeLifecycleReportFixtures.ts';
import {
  createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureJsonSummary,
  createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureMarkdown,
  createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureResult,
} from './localDevWorkerDockerSmokeLifecycleCliFixtures.ts';
import {
  LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_CLI_READINESS_ARGS,
  createLocalDevWorkerDockerSmokeLifecycleCliCleanupRequest,
  createLocalDevWorkerDockerSmokeLifecycleCliInput,
  createLocalDevWorkerDockerSmokeLifecycleCliReadinessRequest,
  createLocalDevWorkerDockerSmokeLifecycleCliSmokeRequest,
} from './localDevWorkerDockerSmokeLifecycleCliRequests.ts';
import { evaluateLocalDevWorkerExecutionReadiness } from './localDevWorkerExecutionReadiness.ts';
import { localDevWorkerExecutionReadinessFixtures } from './localDevWorkerExecutionReadinessFixtures.ts';
import { findLocalDevWorkerExecutionCapability } from './localDevWorkerExecutionManifest.ts';
import {
  compareGoldenReportOutput,
  validateGoldenReportSafety,
} from './localDevWorkerGoldenReportCheck.ts';
import { localDevWorkerLifecycleTelemetryFixtures } from './localDevWorkerLifecycleTelemetryFixtures.ts';
import {
  sanitizeLocalDevWorkerTelemetryString,
  validateLocalDevWorkerTelemetryEvent,
} from './localDevWorkerLifecycleTelemetryPolicy.ts';
import {
  compareLocalDevWorkerTelemetryGoldenJson,
  createLocalDevWorkerTelemetryGoldenJson,
  validateLocalDevWorkerTelemetryGoldenJson,
} from './localDevWorkerTelemetryGoldenCheck.ts';
import { assertTrustedManualReviewSource } from './localDevWorkerTrustedReview.ts';
import { executeLocalDevWorkerVersionCommand } from './localDevWorkerVersionExecutionAdapter.ts';
import { localDevWorkerVersionExecutionFixtures } from './localDevWorkerVersionExecutionFixtures.ts';
import { evaluateLocalDevWorkerWorkspacePathPolicy } from './localDevWorkerWorkspacePathPolicy.ts';
import { localDevWorkerWorkspacePathPolicyFixtures } from './localDevWorkerWorkspacePathPolicyFixtures.ts';
import { localDevWorkerDryRunFixtures } from './localDevWorkerFixtures.ts';

export interface LocalDevWorkerDryRunSelfCheckResult {
  passed: boolean;
  checkedDryRunFixtures: number;
  checkedExecutionReadinessFixtures: number;
  checkedVersionExecutionFixtures: number;
  checkedDockerReadinessFixtures: number;
  checkedDockerContainerPolicyFixtures: number;
  checkedWorkspacePathPolicyFixtures: number;
  checkedDockerContainerSmokeFixtures: number;
  checkedDockerSmokeAuditFixtures: number;
  checkedDockerCleanupFixtures: number;
  checkedDockerCleanupExecutionFixtures: number;
  checkedDockerSmokeLifecycleFixtures: number;
  checkedDockerSmokeLifecycleReportFixtures: number;
  checkedDockerSmokeLifecycleCliFixtures: number;
  checkedDockerSmokeLifecycleGoldenChecks: number;
  checkedLifecycleTelemetryFixtures: number;
  checkedLifecycleTelemetryGoldenChecks: number;
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

  for (const fixture of localDevWorkerWorkspacePathPolicyFixtures) {
    const response = evaluateLocalDevWorkerWorkspacePathPolicy(fixture.input);
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.ok === fixture.expectedOk,
      `${fixture.name}: expected ok ${fixture.expectedOk}, got ${response.ok}.`,
      failures,
    );
    assertCondition(
      response.noFilesystemAccess === true,
      `${fixture.name}: workspace path policy must never access the filesystem.`,
      failures,
    );
    assertCondition(
      response.decision === fixture.expectedDecision,
      `${fixture.name}: expected decision ${fixture.expectedDecision}, got ${response.decision}.`,
      failures,
    );
    assertCondition(
      response.normalizedSyntheticPath ===
        fixture.expectedNormalizedSyntheticPath,
      `${fixture.name}: expected normalizedSyntheticPath ${fixture.expectedNormalizedSyntheticPath}, got ${response.normalizedSyntheticPath}.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.syntheticOnly === true &&
        response.safetyMetadata.realWorkspaceRead === false &&
        response.safetyMetadata.realWorkspaceWrite === false,
      `${fixture.name}: workspace path policy must remain synthetic-only with no real reads or writes.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.executionAllowed === false &&
        response.safetyMetadata.symlinkFollowAllowed === false,
      `${fixture.name}: execution and symlink following must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.homePathAllowed === false &&
        response.safetyMetadata.envFileAllowed === false &&
        response.safetyMetadata.secretsAllowed === false,
      `${fixture.name}: home paths, env files, and secrets must remain denied.`,
      failures,
    );

    if (response.normalizedSyntheticPath) {
      assertCondition(
        response.normalizedSyntheticPath.startsWith('/workspace/'),
        `${fixture.name}: normalized path must stay under /workspace.`,
        failures,
      );
      assertCondition(
        !response.normalizedSyntheticPath.includes('..'),
        `${fixture.name}: normalized path must not include parent traversal.`,
        failures,
      );
      assertCondition(
        !/^[A-Za-z]:/.test(response.normalizedSyntheticPath),
        `${fixture.name}: normalized path must not be a Windows host path.`,
        failures,
      );
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected workspace path rejection code ${code}.`,
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

  for (const fixture of localDevWorkerDockerSmokeLifecycleFixtures) {
    const scenario = fixture.createScenario();
    const response = await runLocalDevWorkerDockerSmokeLifecycle(scenario.input);
    const observedCodes = new Set(response.rejectionCodes);

    assertCondition(
      response.outcome === fixture.expectedOutcome,
      `${fixture.name}: expected lifecycle outcome ${fixture.expectedOutcome}, got ${response.outcome}.`,
      failures,
    );
    assertCondition(
      JSON.stringify(response.stages) === JSON.stringify(fixture.expectedStages),
      `${fixture.name}: expected stages ${fixture.expectedStages.join(
        ' -> ',
      )}, got ${response.stages.join(' -> ')}.`,
      failures,
    );
    assertCondition(
      JSON.stringify(scenario.calls) === JSON.stringify(fixture.expectedCalls),
      `${fixture.name}: expected adapter calls ${fixture.expectedCalls.join(
        ' -> ',
      )}, got ${scenario.calls.join(' -> ')}.`,
      failures,
    );
    assertCondition(
      response.cleanupAttempted === fixture.expectedCleanupAttempted,
      `${fixture.name}: expected cleanupAttempted ${fixture.expectedCleanupAttempted}, got ${response.cleanupAttempted}.`,
      failures,
    );
    assertCondition(
      response.cleanupRequired === fixture.expectedCleanupRequired,
      `${fixture.name}: expected cleanupRequired ${fixture.expectedCleanupRequired}, got ${response.cleanupRequired}.`,
      failures,
    );
    assertCondition(
      !!response.smoke === fixture.expectedSmokePresent,
      `${fixture.name}: expected smoke presence ${fixture.expectedSmokePresent}, got ${!!response.smoke}.`,
      failures,
    );
    assertCondition(
      !!response.cleanup === fixture.expectedCleanupPresent,
      `${fixture.name}: expected cleanup presence ${fixture.expectedCleanupPresent}, got ${!!response.cleanup}.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.noNewDockerCapabilities === true,
      `${fixture.name}: lifecycle must declare noNewDockerCapabilities true.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.arbitraryDockerRunAllowed === false,
      `${fixture.name}: arbitrary Docker run must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.arbitraryCleanupAllowed === false,
      `${fixture.name}: arbitrary cleanup must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.imagePullAllowed === false,
      `${fixture.name}: image pulls must remain denied.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.networkAllowed === false,
      `${fixture.name}: network must remain disabled.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.mountsAllowed === false,
      `${fixture.name}: mounts must remain disabled.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.workspaceMounted === false,
      `${fixture.name}: workspace must not be mounted.`,
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
      response.safetyMetadata.productionUiPath === false,
      `${fixture.name}: lifecycle must not expose a production UI path.`,
      failures,
    );
    assertCondition(
      response.safetyMetadata.srcImportPath === false,
      `${fixture.name}: lifecycle must not expose a src import path.`,
      failures,
    );

    if (response.smoke) {
      assertCondition(
        JSON.stringify(response.smoke.args) ===
          JSON.stringify(LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS),
        `${fixture.name}: lifecycle smoke args must stay exact.`,
        failures,
      );
      assertCondition(
        response.smoke.imagePulled === false,
        `${fixture.name}: lifecycle smoke must not pull images.`,
        failures,
      );
      assertCondition(
        response.smoke.networkAllowed === false,
        `${fixture.name}: lifecycle smoke must not allow network.`,
        failures,
      );
      assertCondition(
        response.auditRecord === response.smoke.auditRecord,
        `${fixture.name}: lifecycle auditRecord should come from the smoke result.`,
        failures,
      );
    }

    if (response.cleanup) {
      assertCondition(
        JSON.stringify(response.cleanup.args) ===
          JSON.stringify(['rm', '-f', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME]),
        `${fixture.name}: lifecycle cleanup args must stay exact.`,
        failures,
      );
      assertCondition(
        response.cleanup.safetyMetadata.arbitraryTargetAllowed === false,
        `${fixture.name}: lifecycle cleanup must not allow arbitrary targets.`,
        failures,
      );
      assertCondition(
        response.cleanup.safetyMetadata.wildcardAllowed === false,
        `${fixture.name}: lifecycle cleanup must not allow wildcard targets.`,
        failures,
      );
    }

    for (const code of fixture.expectedRejectionCodes) {
      assertCondition(
        observedCodes.has(code),
        `${fixture.name}: expected lifecycle rejection code ${code}.`,
        failures,
      );
    }
  }

  for (const fixture of localDevWorkerDockerSmokeLifecycleReportFixtures) {
    const report = createLocalDevWorkerDockerSmokeLifecycleReport(fixture.result);
    const markdown = formatLocalDevWorkerDockerSmokeLifecycleMarkdown(report);
    const repeatedMarkdown =
      formatLocalDevWorkerDockerSmokeLifecycleMarkdown(report);
    const jsonSummary =
      formatLocalDevWorkerDockerSmokeLifecycleJsonSummary(report);
    const repeatedJsonSummary =
      formatLocalDevWorkerDockerSmokeLifecycleJsonSummary(report);
    const parsedJson = JSON.parse(jsonSummary) as typeof report;

    assertCondition(
      report.kind === 'local-dev-docker-smoke-lifecycle-report',
      `${fixture.name}: report kind mismatch.`,
      failures,
    );
    assertCondition(
      report.localDevOnly === true,
      `${fixture.name}: report must be local-dev only.`,
      failures,
    );
    assertCondition(
      report.outcome === fixture.expectedOutcome,
      `${fixture.name}: expected report outcome ${fixture.expectedOutcome}, got ${report.outcome}.`,
      failures,
    );
    assertCondition(
      report.nextRecommendedAction === fixture.expectedNextRecommendedAction,
      `${fixture.name}: nextRecommendedAction drifted.`,
      failures,
    );
    assertCondition(
      markdown === repeatedMarkdown,
      `${fixture.name}: markdown formatting must be deterministic.`,
      failures,
    );
    assertCondition(
      jsonSummary === repeatedJsonSummary,
      `${fixture.name}: JSON formatting must be deterministic.`,
      failures,
    );
    assertCondition(
      parsedJson.reportId === report.reportId &&
        parsedJson.lifecycleId === report.lifecycleId &&
        parsedJson.outcome === report.outcome,
      `${fixture.name}: JSON summary must parse back to stable report identifiers.`,
      failures,
    );
    assertCondition(
      report.safetySummary.noNewDockerCapabilities === true,
      `${fixture.name}: report must preserve noNewDockerCapabilities true.`,
      failures,
    );
    assertCondition(
      report.safetySummary.arbitraryDockerRunAllowed === false,
      `${fixture.name}: report must keep arbitrary Docker run denied.`,
      failures,
    );
    assertCondition(
      report.safetySummary.arbitraryCleanupAllowed === false,
      `${fixture.name}: report must keep arbitrary cleanup denied.`,
      failures,
    );
    assertCondition(
      report.safetySummary.imagePullAllowed === false,
      `${fixture.name}: report must keep image pull denied.`,
      failures,
    );
    assertCondition(
      report.safetySummary.networkAllowed === false,
      `${fixture.name}: report must keep network denied.`,
      failures,
    );
    assertCondition(
      report.safetySummary.mountsAllowed === false,
      `${fixture.name}: report must keep mounts denied.`,
      failures,
    );
    assertCondition(
      report.safetySummary.workspaceMounted === false,
      `${fixture.name}: report must keep workspace unmounted.`,
      failures,
    );
    assertCondition(
      report.safetySummary.dockerSocketMounted === false,
      `${fixture.name}: report must keep Docker socket unmounted.`,
      failures,
    );
    assertCondition(
      report.safetySummary.homeMounted === false,
      `${fixture.name}: report must keep home unmounted.`,
      failures,
    );
    assertCondition(
      report.safetySummary.shellAllowed === false,
      `${fixture.name}: report must keep shell disabled.`,
      failures,
    );
    assertCondition(
      report.safetySummary.hostEnvironmentInherited === false,
      `${fixture.name}: report must keep host environment uninherited.`,
      failures,
    );
    assertCondition(
      report.safetySummary.productionUiPath === false,
      `${fixture.name}: report must keep production UI path false.`,
      failures,
    );
    assertCondition(
      report.safetySummary.srcImportPath === false,
      `${fixture.name}: report must keep src import path false.`,
      failures,
    );

    for (const expected of fixture.expectedMarkdownIncludes) {
      assertCondition(
        markdown.includes(expected),
        `${fixture.name}: expected markdown to include ${expected}.`,
        failures,
      );
    }

    for (const forbidden of fixture.forbiddenMarkdownPatterns) {
      assertCondition(
        !forbidden.test(markdown),
        `${fixture.name}: markdown matched forbidden pattern ${forbidden}.`,
        failures,
      );
    }

    for (const forbidden of fixture.forbiddenJsonPatterns) {
      assertCondition(
        !forbidden.test(jsonSummary),
        `${fixture.name}: JSON summary matched forbidden pattern ${forbidden}.`,
        failures,
      );
    }

    if (
      fixture.expectedSmokeStdoutMaxBytes !== undefined &&
      report.smokeSummary
    ) {
      assertCondition(
        Buffer.from(report.smokeSummary.stdoutPreview, 'utf8').byteLength <=
          fixture.expectedSmokeStdoutMaxBytes,
        `${fixture.name}: smoke stdout preview exceeded byte cap.`,
        failures,
      );
    }

    if (
      fixture.expectedSmokeStderrMaxBytes !== undefined &&
      report.smokeSummary
    ) {
      assertCondition(
        Buffer.from(report.smokeSummary.stderrPreview, 'utf8').byteLength <=
          fixture.expectedSmokeStderrMaxBytes,
        `${fixture.name}: smoke stderr preview exceeded byte cap.`,
        failures,
      );
    }
  }

  const cliReadinessRequest =
    createLocalDevWorkerDockerSmokeLifecycleCliReadinessRequest();
  const cliSmokeRequest =
    createLocalDevWorkerDockerSmokeLifecycleCliSmokeRequest();
  const cliCleanupRequest =
    createLocalDevWorkerDockerSmokeLifecycleCliCleanupRequest();
  const cliLifecycleInput = createLocalDevWorkerDockerSmokeLifecycleCliInput({
    lifecycleId: 'self-check-cli-lifecycle',
  });
  const cliDryReportResult =
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureResult();
  const cliDryMarkdown =
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureMarkdown();
  const repeatedCliDryMarkdown =
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureMarkdown();
  const cliDryJson =
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureJsonSummary();
  const repeatedCliDryJson =
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureJsonSummary();
  const parsedCliDryJson = JSON.parse(cliDryJson) as {
    lifecycleId: string;
    outcome: string;
    safetySummary: {
      noNewDockerCapabilities: boolean;
      arbitraryDockerRunAllowed: boolean;
      arbitraryCleanupAllowed: boolean;
      productionUiPath: boolean;
      srcImportPath: boolean;
    };
  };
  const forbiddenCliReportPatterns = [
    /API_KEY=/i,
    /TOKEN=/i,
    /SECRET=/i,
    /SERVICE_ROLE/i,
    /SUPABASE_SERVICE_ROLE/i,
    /C:\\Users\\/i,
    /\/home\//i,
    /\/Users\//i,
    /\.env/i,
  ];

  assertCondition(
    cliDryMarkdown === repeatedCliDryMarkdown,
    'CLI dry-report markdown must be deterministic.',
    failures,
  );
  assertCondition(
    cliDryJson === repeatedCliDryJson,
    'CLI dry-report JSON summary must be deterministic.',
    failures,
  );
  assertCondition(
    cliDryMarkdown.includes(
      '# Dremo Local-dev Docker Smoke Lifecycle Report',
    ),
    'CLI dry-report markdown must include the lifecycle report heading.',
    failures,
  );
  assertCondition(
    parsedCliDryJson.lifecycleId === cliDryReportResult.lifecycleId &&
      parsedCliDryJson.outcome === cliDryReportResult.outcome,
    'CLI dry-report JSON must preserve deterministic lifecycle identifiers.',
    failures,
  );
  JSON.parse(cliDryJson);
  assertCondition(
    parsedCliDryJson.safetySummary.noNewDockerCapabilities === true,
    'CLI dry-report JSON must preserve noNewDockerCapabilities true.',
    failures,
  );
  assertCondition(
    parsedCliDryJson.safetySummary.arbitraryDockerRunAllowed === false &&
      parsedCliDryJson.safetySummary.arbitraryCleanupAllowed === false,
    'CLI dry-report JSON must keep arbitrary Docker run and cleanup denied.',
    failures,
  );
  assertCondition(
    parsedCliDryJson.safetySummary.productionUiPath === false &&
      parsedCliDryJson.safetySummary.srcImportPath === false,
    'CLI dry-report JSON must keep production and src paths disabled.',
    failures,
  );

  for (const forbidden of forbiddenCliReportPatterns) {
    assertCondition(
      !forbidden.test(cliDryMarkdown),
      `CLI dry-report markdown matched forbidden pattern ${forbidden}.`,
      failures,
    );
    assertCondition(
      !forbidden.test(cliDryJson),
      `CLI dry-report JSON matched forbidden pattern ${forbidden}.`,
      failures,
    );
  }

  const goldenMarkdownMatch = compareGoldenReportOutput({
    expectedName: 'expected Markdown report',
    actualName: 'actual Markdown report',
    expected: cliDryMarkdown,
    actual: repeatedCliDryMarkdown,
  });
  const goldenJsonMatch = compareGoldenReportOutput({
    expectedName: 'expected JSON report',
    actualName: 'actual JSON report',
    expected: cliDryJson,
    actual: repeatedCliDryJson,
  });
  const goldenMismatch = compareGoldenReportOutput({
    expectedName: 'expected mismatch fixture',
    actualName: 'actual mismatch fixture',
    expected: cliDryMarkdown,
    actual: cliDryMarkdown.replace(
      '- Outcome: cleanup_success',
      '- Outcome: drifted',
    ),
  });
  const unsafeGoldenSafetyIssues = validateGoldenReportSafety(
    'TOKEN=value\n/home/alice/project\n.env.local',
  );

  assertCondition(
    goldenMarkdownMatch.matches,
    `Golden Markdown comparison should match: ${goldenMarkdownMatch.mismatchSummary}`,
    failures,
  );
  assertCondition(
    goldenJsonMatch.matches,
    `Golden JSON comparison should match: ${goldenJsonMatch.mismatchSummary}`,
    failures,
  );
  assertCondition(
    !goldenMismatch.matches &&
      goldenMismatch.mismatchSummary.includes('First mismatch at line'),
    'Golden comparison helper must detect mismatches with a useful summary.',
    failures,
  );
  assertCondition(
    validateGoldenReportSafety(cliDryMarkdown).length === 0 &&
      validateGoldenReportSafety(cliDryJson).length === 0,
    'Golden report safety validation must pass for generated fixture output.',
    failures,
  );
  assertCondition(
    unsafeGoldenSafetyIssues.some((issue) => issue.code === 'token_assignment') &&
      unsafeGoldenSafetyIssues.some((issue) => issue.code === 'linux_home_path') &&
      unsafeGoldenSafetyIssues.some((issue) => issue.code === 'env_file_marker'),
    'Golden report safety validation must detect token, home path, and .env markers.',
    failures,
  );

  assertCondition(
    cliReadinessRequest.command === 'docker' &&
      JSON.stringify(cliReadinessRequest.args) ===
        JSON.stringify(LOCAL_DEV_WORKER_DOCKER_SMOKE_LIFECYCLE_CLI_READINESS_ARGS),
    'CLI readiness request must use the exact reviewed readiness probe shape.',
    failures,
  );
  assertCondition(
    cliSmokeRequest.command === 'docker' &&
      JSON.stringify(cliSmokeRequest.args) ===
        JSON.stringify(LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS),
    'CLI smoke request must use the exact reviewed smoke command shape.',
    failures,
  );
  assertCondition(
    cliCleanupRequest.command === 'docker' &&
      JSON.stringify(['docker', ...cliCleanupRequest.args]) ===
        JSON.stringify(LOCAL_DEV_WORKER_DOCKER_SMOKE_CLEANUP_COMMAND),
    'CLI cleanup request must use the exact reviewed cleanup command shape.',
    failures,
  );

  for (const request of [
    cliReadinessRequest,
    cliSmokeRequest,
    cliCleanupRequest,
  ]) {
    assertCondition(
      request.source === 'dremo-local-dev-sandbox',
      `${request.requestId}: CLI request source must stay local-dev sandbox.`,
      failures,
    );
    assertCondition(
      request.expectedEnvironment === 'local-dev',
      `${request.requestId}: CLI request environment must stay local-dev.`,
      failures,
    );
    assertCondition(
      request.productionUiPath === false && request.srcImportPath === false,
      `${request.requestId}: CLI request must not expose production UI or src import paths.`,
      failures,
    );
    assertCondition(
      assertTrustedManualReviewSource(request.manualSecurityReview),
      `${request.requestId}: CLI request manual review must come from trusted local worker helpers.`,
      failures,
    );
  }

  assertCondition(
    assertTrustedManualReviewSource(
      cliLifecycleInput.readiness.trustedManualReview,
    ) &&
      assertTrustedManualReviewSource(
        cliLifecycleInput.smoke.trustedManualReview,
      ) &&
      assertTrustedManualReviewSource(
        cliLifecycleInput.cleanup.trustedManualReview,
      ),
    'CLI lifecycle input must use trusted local review helpers for all stages.',
    failures,
  );
  assertCondition(
    cliLifecycleInput.readiness.config?.executionMode ===
      'reviewed-local-docker-readiness-probe' &&
      cliLifecycleInput.smoke.config?.executionMode ===
        'reviewed-local-docker-container-smoke' &&
      cliLifecycleInput.cleanup.config?.executionMode ===
        'reviewed-local-docker-smoke-cleanup',
    'CLI lifecycle input must use only the reviewed readiness, smoke, and cleanup configs.',
    failures,
  );
  assertCondition(
    findLocalDevWorkerExecutionCapability(cliReadinessRequest)?.capabilityId ===
      'capability.docker.daemon.readiness' &&
      findLocalDevWorkerExecutionCapability(cliSmokeRequest)?.capabilityId ===
        'capability.docker.container.smoke.echo' &&
      findLocalDevWorkerExecutionCapability(cliCleanupRequest)?.capabilityId ===
        'capability.docker.smoke.cleanup.exact',
    'CLI lifecycle factory must match only existing reviewed capabilities.',
    failures,
  );

  for (const fixture of localDevWorkerLifecycleTelemetryFixtures) {
    const validation = validateLocalDevWorkerTelemetryEvent(fixture.event);
    const jsonSummary = JSON.stringify(fixture.event, null, 2);
    const repeatedJsonSummary = JSON.stringify(fixture.event, null, 2);
    const parsedJson = JSON.parse(jsonSummary) as typeof fixture.event;

    assertCondition(
      validation.safe,
      `${fixture.name}: telemetry validation failed with ${validation.issues
        .map((item) => item.code)
        .join(', ')}.`,
      failures,
    );
    assertCondition(
      fixture.event.eventKind === fixture.expectedEventKind,
      `${fixture.name}: expected telemetry kind ${fixture.expectedEventKind}, got ${fixture.event.eventKind}.`,
      failures,
    );
    assertCondition(
      jsonSummary === repeatedJsonSummary,
      `${fixture.name}: telemetry JSON must be deterministic.`,
      failures,
    );
    assertCondition(
      parsedJson.eventId === fixture.event.eventId &&
        parsedJson.schemaVersion === fixture.event.schemaVersion &&
        parsedJson.eventKind === fixture.event.eventKind,
      `${fixture.name}: telemetry JSON must parse back to stable identifiers.`,
      failures,
    );
    assertCondition(
      fixture.event.localDevOnly === true &&
        fixture.event.source === 'tools/local-dev-worker' &&
        fixture.event.productionUiPath === false &&
        fixture.event.srcImportPath === false,
      `${fixture.name}: telemetry must remain local-dev worker only.`,
      failures,
    );
    assertCondition(
      fixture.event.containsSecrets === false &&
        fixture.event.containsHostPaths === false &&
        fixture.event.containsUserPrompt === false &&
        fixture.event.containsEnvironment === false,
      `${fixture.name}: telemetry sensitive-content flags must remain false.`,
      failures,
    );

    for (const expected of fixture.expectedRedactedFragments ?? []) {
      assertCondition(
        jsonSummary.includes(expected),
        `${fixture.name}: expected telemetry JSON to include redacted fragment ${expected}.`,
        failures,
      );
    }

    for (const forbidden of fixture.forbiddenPatterns ?? []) {
      assertCondition(
        !forbidden.test(jsonSummary),
        `${fixture.name}: telemetry JSON matched forbidden pattern ${forbidden}.`,
        failures,
      );
    }
  }

  const unsafeTelemetrySecret = sanitizeLocalDevWorkerTelemetryString(
    ['API_KEY', '=fixture-value'].join(''),
  );
  const unsafeTelemetryHome = sanitizeLocalDevWorkerTelemetryString(
    ['/Users', '/operator/project'].join(''),
  );

  assertCondition(
    unsafeTelemetrySecret.includes('[REDACTED_SECRET]'),
    'Telemetry sanitizer must redact secret-like assignments.',
    failures,
  );
  assertCondition(
    unsafeTelemetryHome.includes('[REDACTED_HOME_PATH]'),
    'Telemetry sanitizer must redact home-looking paths.',
    failures,
  );

  const telemetryGoldenJson = createLocalDevWorkerTelemetryGoldenJson();
  const repeatedTelemetryGoldenJson = createLocalDevWorkerTelemetryGoldenJson();
  const telemetryGoldenParsed = JSON.parse(telemetryGoldenJson) as {
    kind: string;
    localDevOnly: boolean;
    fixtureCount: number;
    fixtures: unknown[];
  };
  const telemetryGoldenMatch = compareLocalDevWorkerTelemetryGoldenJson({
    expected: telemetryGoldenJson,
    actual: repeatedTelemetryGoldenJson,
  });
  const telemetryGoldenMismatch = compareLocalDevWorkerTelemetryGoldenJson({
    expected: telemetryGoldenJson,
    actual: telemetryGoldenJson.replace(
      '"fixtureCount": 10',
      '"fixtureCount": 999',
    ),
  });
  const telemetryGoldenSafetyIssues =
    validateLocalDevWorkerTelemetryGoldenJson(telemetryGoldenJson);

  assertCondition(
    telemetryGoldenJson === repeatedTelemetryGoldenJson,
    'Telemetry golden JSON generation must be deterministic.',
    failures,
  );
  assertCondition(
    telemetryGoldenParsed.kind === 'local-dev-worker-telemetry-golden-fixture' &&
      telemetryGoldenParsed.localDevOnly === true &&
      telemetryGoldenParsed.fixtureCount ===
        localDevWorkerLifecycleTelemetryFixtures.length &&
      telemetryGoldenParsed.fixtures.length ===
        localDevWorkerLifecycleTelemetryFixtures.length,
    'Telemetry golden JSON must parse back to stable fixture metadata.',
    failures,
  );
  assertCondition(
    telemetryGoldenMatch.matches,
    `Telemetry golden comparison should match: ${telemetryGoldenMatch.mismatchSummary}`,
    failures,
  );
  assertCondition(
    !telemetryGoldenMismatch.matches &&
      telemetryGoldenMismatch.mismatchSummary.includes('First mismatch at line'),
    'Telemetry golden comparison helper must detect mismatches with a useful summary.',
    failures,
  );
  assertCondition(
    telemetryGoldenSafetyIssues.length === 0,
    `Telemetry golden JSON safety validation must pass, got ${telemetryGoldenSafetyIssues
      .map((issue) => issue.code)
      .join(', ')}.`,
    failures,
  );

  return {
    passed: failures.length === 0,
    checkedDryRunFixtures: localDevWorkerDryRunFixtures.length,
    checkedExecutionReadinessFixtures:
      localDevWorkerExecutionReadinessFixtures.length,
    checkedVersionExecutionFixtures: localDevWorkerVersionExecutionFixtures.length,
    checkedDockerReadinessFixtures: localDevWorkerDockerReadinessFixtures.length,
    checkedDockerContainerPolicyFixtures:
      localDevWorkerDockerContainerPolicyFixtures.length,
    checkedWorkspacePathPolicyFixtures:
      localDevWorkerWorkspacePathPolicyFixtures.length,
    checkedDockerContainerSmokeFixtures:
      localDevWorkerDockerContainerSmokeFixtures.length,
    checkedDockerSmokeAuditFixtures:
      localDevWorkerDockerSmokeAuditFixtures.length,
    checkedDockerCleanupFixtures:
      localDevWorkerDockerCleanupFixtures.length,
    checkedDockerCleanupExecutionFixtures:
      localDevWorkerDockerCleanupExecutionFixtures.length,
    checkedDockerSmokeLifecycleFixtures:
      localDevWorkerDockerSmokeLifecycleFixtures.length,
    checkedDockerSmokeLifecycleReportFixtures:
      localDevWorkerDockerSmokeLifecycleReportFixtures.length,
    checkedDockerSmokeLifecycleCliFixtures: 1,
    checkedDockerSmokeLifecycleGoldenChecks: 3,
    checkedLifecycleTelemetryFixtures:
      localDevWorkerLifecycleTelemetryFixtures.length,
    checkedLifecycleTelemetryGoldenChecks: 3,
    failures,
  };
}
