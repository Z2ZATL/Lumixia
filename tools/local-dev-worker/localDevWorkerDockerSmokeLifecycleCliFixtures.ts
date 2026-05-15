import type { LocalDevWorkerDockerCleanupResult } from './localDevWorkerDockerCleanupAdapter.ts';
import { LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME } from './localDevWorkerDockerContainerIdentity.ts';
import type { LocalDevWorkerDockerContainerSmokeResult } from './localDevWorkerDockerContainerSmokeAdapter.ts';
import { LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS } from './localDevWorkerDockerContainerSmokePolicy.ts';
import type { LocalDevWorkerDockerReadinessResult } from './localDevWorkerDockerReadiness.ts';
import { createLocalDevWorkerDockerSmokeAuditRecord } from './localDevWorkerDockerSmokeAudit.ts';
import type { LocalDevWorkerDockerSmokeLifecycleResult } from './localDevWorkerDockerSmokeLifecycle.ts';
import {
  createLocalDevWorkerDockerSmokeLifecycleReport,
  formatLocalDevWorkerDockerSmokeLifecycleJsonSummary,
  formatLocalDevWorkerDockerSmokeLifecycleMarkdown,
} from './localDevWorkerDockerSmokeLifecycleReport.ts';

const DRY_REPORT_LIFECYCLE_ID =
  'local-dev-docker-smoke-lifecycle-cli-dry-report-fixture';

function createDryReportReadiness(): LocalDevWorkerDockerReadinessResult {
  return {
    ok: true,
    noContainerExecution: true,
    readinessState: 'daemon_available',
    dockerCliVersion: 'fixture-docker-cli',
    dockerServerVersion: 'fixture-docker-server',
    daemonReachable: true,
    commandAttempted: 'docker version --format {{json .}}',
    rejectionCodes: [],
    stdout: '{"Client":{"Version":"fixture"},"Server":{"Version":"fixture"}}',
    stderr: '',
    exitCode: 0,
    timedOut: false,
    durationMs: 1,
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      localDevOnly: true,
      dockerCliAllowed: true,
      dockerDaemonStateQueried: true,
      dockerRuntimeAllowed: false,
      containerStarted: false,
      imagePulled: false,
      imageBuilt: false,
      dockerSocketMounted: false,
      homeMounted: false,
      networkAllowed: false,
      fileWritesAllowed: false,
      shellAllowed: false,
      hostEnvironmentInherited: false,
    },
  };
}

function createDryReportSmoke(): LocalDevWorkerDockerContainerSmokeResult {
  const base = {
    ok: true,
    noExecution: false,
    executionAttempted: true,
    containerStarted: true,
    imagePulled: false as false,
    imageBuilt: false as false,
    networkAllowed: false as false,
    mountsAllowed: false as false,
    executionMode: 'executed' as const,
    capabilityId: 'capability.docker.container.smoke.echo',
    command: 'docker',
    args: LOCAL_DEV_WORKER_DOCKER_CONTAINER_SMOKE_ARGS,
    stdout: 'hello\n',
    stderr: '',
    exitCode: 0,
    timedOut: false,
    durationMs: 1,
    rejectionCodes: [],
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle' as const,
      localDevOnly: true as const,
      dockerCliAllowed: true as const,
      dockerRuntimeAllowed: true,
      containerStarted: true,
      imagePulled: false as false,
      imageBuilt: false as false,
      dockerSocketMounted: false as false,
      homeMounted: false as false,
      workspaceMounted: false as false,
      networkAllowed: false as false,
      fileWritesAllowed: false as false,
      shellAllowed: false as false,
      hostEnvironmentInherited: false as false,
      runAsNonRoot: true as const,
    },
  };
  const auditRecord = createLocalDevWorkerDockerSmokeAuditRecord(base, {
    auditId: 'local-dev-cli-dry-report.smoke.success',
  });

  return {
    ...base,
    outcome: auditRecord.outcome,
    sanitizedStdout: auditRecord.stdoutPreview,
    sanitizedStderr: auditRecord.stderrPreview,
    cleanupRisk: auditRecord.cleanupRisk,
    auditRecord,
  };
}

function createDryReportCleanup(): LocalDevWorkerDockerCleanupResult {
  return {
    ok: true,
    noExecution: false,
    executionAttempted: true,
    cleanupExecuted: true,
    executionMode: 'executed',
    capabilityId: 'capability.docker.smoke.cleanup.exact',
    command: 'docker',
    args: ['rm', '-f', LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME],
    stdout: `${LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME}\n`,
    stderr: '',
    sanitizedStdout: `${LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME}\n`,
    sanitizedStderr: '',
    exitCode: 0,
    timedOut: false,
    durationMs: 1,
    rejectionCodes: [],
    outcome: 'cleanup_success',
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      localDevOnly: true,
      dockerCliAllowed: true,
      dockerRuntimeAllowed: true,
      cleanupTarget: LOCAL_DEV_WORKER_DOCKER_SMOKE_CONTAINER_NAME,
      arbitraryTargetAllowed: false,
      wildcardAllowed: false,
      containerIdAllowed: false,
      pruneAllowed: false,
      inspectAllowed: false,
      listAllowed: false,
      dockerSocketMounted: false,
      homeMounted: false,
      workspaceMounted: false,
      networkAllowed: false,
      fileWritesAllowed: false,
      shellAllowed: false,
      hostEnvironmentInherited: false,
    },
  };
}

export function createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureResult(): LocalDevWorkerDockerSmokeLifecycleResult {
  const smoke = createDryReportSmoke();

  return {
    ok: true,
    localDevOnly: true,
    lifecycleId: DRY_REPORT_LIFECYCLE_ID,
    stages: [
      'not_started',
      'readiness_checked',
      'smoke_executed',
      'audit_created',
      'cleanup_attempted',
      'completed',
    ],
    outcome: 'cleanup_success',
    readiness: createDryReportReadiness(),
    smoke,
    cleanup: createDryReportCleanup(),
    auditRecord: smoke.auditRecord,
    cleanupAttempted: true,
    cleanupRequired: true,
    rejectionCodes: [],
    safetyMetadata: {
      workerBoundary: 'outside-browser-bundle',
      noNewDockerCapabilities: true,
      usedExistingReadinessAdapter: true,
      usedExistingSmokeAdapter: true,
      usedExistingCleanupAdapter: true,
      arbitraryDockerRunAllowed: false,
      arbitraryCleanupAllowed: false,
      imagePullAllowed: false,
      networkAllowed: false,
      mountsAllowed: false,
      workspaceMounted: false,
      dockerSocketMounted: false,
      homeMounted: false,
      shellAllowed: false,
      hostEnvironmentInherited: false,
      productionUiPath: false,
      srcImportPath: false,
    },
  };
}

export function createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureMarkdown() {
  const report = createLocalDevWorkerDockerSmokeLifecycleReport(
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureResult(),
  );

  return formatLocalDevWorkerDockerSmokeLifecycleMarkdown(report);
}

export function createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureJsonSummary() {
  const report = createLocalDevWorkerDockerSmokeLifecycleReport(
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureResult(),
  );

  return formatLocalDevWorkerDockerSmokeLifecycleJsonSummary(report);
}
