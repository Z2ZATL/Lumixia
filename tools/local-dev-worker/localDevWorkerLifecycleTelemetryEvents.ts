import type { LocalDevWorkerDockerSmokeLifecycleResult } from './localDevWorkerDockerSmokeLifecycle.ts';
import type { LocalDevWorkerDockerSmokeLifecycleReport } from './localDevWorkerDockerSmokeLifecycleReport.ts';
import {
  assertLocalDevWorkerTelemetrySafe,
  sanitizeLocalDevWorkerTelemetryString,
} from './localDevWorkerLifecycleTelemetryPolicy.ts';
import {
  LOCAL_DEV_WORKER_LIFECYCLE_TELEMETRY_SCHEMA_VERSION,
  type LocalDevWorkerDockerSmokeLifecycleCompletedTelemetryEvent,
  type LocalDevWorkerDockerSmokeLifecycleGoldenCheckedTelemetryEvent,
  type LocalDevWorkerDockerSmokeLifecyclePolicyBlockedTelemetryEvent,
  type LocalDevWorkerDockerSmokeLifecycleReportGeneratedTelemetryEvent,
  type LocalDevWorkerTelemetryBaseEvent,
  type LocalDevWorkerTelemetryEventKind,
  type LocalDevWorkerTelemetrySafetySummary,
} from './localDevWorkerLifecycleTelemetrySchema.ts';

const DEFAULT_TIMESTAMP_POLICY = 'omitted-for-deterministic-fixtures' as const;
const PREVIEW_BYTE_CAP = 1024;

function uniqueCodes(codes: readonly string[]) {
  return [...new Set(codes)].sort();
}

function preview(value: string) {
  const sanitized = sanitizeLocalDevWorkerTelemetryString(value);
  const buffer = Buffer.from(sanitized, 'utf8');
  const capped =
    buffer.byteLength > PREVIEW_BYTE_CAP
      ? buffer.subarray(0, PREVIEW_BYTE_CAP).toString('utf8')
      : sanitized;

  return {
    value: capped,
    bytes: Buffer.from(capped, 'utf8').byteLength,
  };
}

function safetySummary(
  safety: LocalDevWorkerDockerSmokeLifecycleResult['safetyMetadata'],
): LocalDevWorkerTelemetrySafetySummary {
  return {
    noNewDockerCapabilities: safety.noNewDockerCapabilities,
    arbitraryDockerRunAllowed: safety.arbitraryDockerRunAllowed,
    arbitraryCleanupAllowed: safety.arbitraryCleanupAllowed,
    imagePullAllowed: safety.imagePullAllowed,
    networkAllowed: safety.networkAllowed,
    mountsAllowed: safety.mountsAllowed,
    workspaceMounted: safety.workspaceMounted,
    dockerSocketMounted: safety.dockerSocketMounted,
    homeMounted: safety.homeMounted,
    shellAllowed: safety.shellAllowed,
    hostEnvironmentInherited: safety.hostEnvironmentInherited,
    productionUiPath: safety.productionUiPath,
    srcImportPath: safety.srcImportPath,
  };
}

function baseEvent<T extends LocalDevWorkerTelemetryEventKind>(input: {
  eventId: string;
  eventKind: T;
}): LocalDevWorkerTelemetryBaseEvent & { eventKind: T } {
  return {
    schemaVersion: LOCAL_DEV_WORKER_LIFECYCLE_TELEMETRY_SCHEMA_VERSION,
    eventId: input.eventId,
    eventKind: input.eventKind,
    localDevOnly: true,
    source: 'tools/local-dev-worker',
    productionUiPath: false,
    srcImportPath: false,
    timestampPolicy: DEFAULT_TIMESTAMP_POLICY,
    containsSecrets: false,
    containsHostPaths: false,
    containsUserPrompt: false,
    containsEnvironment: false,
  };
}

export function createLifecycleCompletedTelemetryEvent(
  result: LocalDevWorkerDockerSmokeLifecycleResult,
  options: {
    eventId?: string;
  } = {},
): LocalDevWorkerDockerSmokeLifecycleCompletedTelemetryEvent {
  const smokeStdout = preview(result.smoke?.sanitizedStdout ?? '');
  const smokeStderr = preview(result.smoke?.sanitizedStderr ?? '');
  const cleanupStdout = preview(result.cleanup?.sanitizedStdout ?? '');
  const cleanupStderr = preview(result.cleanup?.sanitizedStderr ?? '');
  const event: LocalDevWorkerDockerSmokeLifecycleCompletedTelemetryEvent = {
    ...baseEvent({
      eventId:
        options.eventId ??
        `telemetry.${result.lifecycleId}.lifecycle.completed.${result.outcome}`,
      eventKind: 'docker-smoke.lifecycle.completed',
    }),
    payload: {
      lifecycleId: result.lifecycleId,
      ok: result.ok,
      outcome: result.outcome,
      stages: [...result.stages],
      cleanupAttempted: result.cleanupAttempted,
      cleanupRequired: result.cleanupRequired,
      rejectionCodes: uniqueCodes(result.rejectionCodes),
      readiness: {
        readinessState: result.readiness.readinessState,
        daemonReachable: result.readiness.daemonReachable,
        rejectionCodes: uniqueCodes(result.readiness.rejectionCodes),
        durationMs: result.readiness.durationMs,
      },
      smoke: result.smoke
        ? {
            outcome: result.smoke.outcome,
            executionAttempted: result.smoke.executionAttempted,
            containerStarted: result.smoke.containerStarted,
            cleanupRisk: result.smoke.cleanupRisk,
            stdoutPreview: smokeStdout.value,
            stderrPreview: smokeStderr.value,
            stdoutPreviewBytes: smokeStdout.bytes,
            stderrPreviewBytes: smokeStderr.bytes,
            rejectionCodes: uniqueCodes(result.smoke.rejectionCodes),
            durationMs: result.smoke.durationMs,
          }
        : undefined,
      cleanup: result.cleanup
        ? {
            outcome: result.cleanup.outcome,
            executionAttempted: result.cleanup.executionAttempted,
            cleanupExecuted: result.cleanup.cleanupExecuted,
            stdoutPreview: cleanupStdout.value,
            stderrPreview: cleanupStderr.value,
            stdoutPreviewBytes: cleanupStdout.bytes,
            stderrPreviewBytes: cleanupStderr.bytes,
            rejectionCodes: uniqueCodes(result.cleanup.rejectionCodes),
            durationMs: result.cleanup.durationMs,
          }
        : undefined,
      safety: safetySummary(result.safetyMetadata),
    },
  };

  return assertLocalDevWorkerTelemetrySafe(event);
}

export function createReportGeneratedTelemetryEvent(
  report: LocalDevWorkerDockerSmokeLifecycleReport,
  options: {
    eventId?: string;
  } = {},
): LocalDevWorkerDockerSmokeLifecycleReportGeneratedTelemetryEvent {
  const smokeStdout = preview(report.smokeSummary?.stdoutPreview ?? '');
  const smokeStderr = preview(report.smokeSummary?.stderrPreview ?? '');
  const cleanupStdout = preview(report.cleanupSummary?.stdoutPreview ?? '');
  const cleanupStderr = preview(report.cleanupSummary?.stderrPreview ?? '');
  const event: LocalDevWorkerDockerSmokeLifecycleReportGeneratedTelemetryEvent = {
    ...baseEvent({
      eventId:
        options.eventId ??
        `telemetry.${report.lifecycleId}.report.generated.${report.outcome}`,
      eventKind: 'docker-smoke.lifecycle.report.generated',
    }),
    payload: {
      reportId: report.reportId,
      lifecycleId: report.lifecycleId,
      ok: report.ok,
      outcome: report.outcome,
      warnings: [...report.warnings],
      nextRecommendedAction: sanitizeLocalDevWorkerTelemetryString(
        report.nextRecommendedAction,
      ),
      smokeStdoutPreviewBytes: report.smokeSummary ? smokeStdout.bytes : undefined,
      smokeStderrPreviewBytes: report.smokeSummary ? smokeStderr.bytes : undefined,
      cleanupStdoutPreviewBytes: report.cleanupSummary
        ? cleanupStdout.bytes
        : undefined,
      cleanupStderrPreviewBytes: report.cleanupSummary
        ? cleanupStderr.bytes
        : undefined,
      safety: safetySummary(report.safetySummary),
    },
  };

  return assertLocalDevWorkerTelemetrySafe(event);
}

export function createGoldenCheckTelemetryEvent(input: {
  eventId?: string;
  passed: boolean;
  checkedFiles: readonly string[];
  mismatchSummary?: string;
  rejectionCodes?: readonly string[];
}): LocalDevWorkerDockerSmokeLifecycleGoldenCheckedTelemetryEvent {
  const event: LocalDevWorkerDockerSmokeLifecycleGoldenCheckedTelemetryEvent = {
    ...baseEvent({
      eventId:
        input.eventId ??
        `telemetry.local-dev-worker.golden.${input.passed ? 'passed' : 'failed'}`,
      eventKind: 'docker-smoke.lifecycle.golden.checked',
    }),
    payload: {
      passed: input.passed,
      checkedFiles: input.checkedFiles.map((file) =>
        sanitizeLocalDevWorkerTelemetryString(file),
      ),
      mismatchSummary: sanitizeLocalDevWorkerTelemetryString(
        input.mismatchSummary ?? '',
      ),
      rejectionCodes: uniqueCodes(input.rejectionCodes ?? []),
    },
  };

  return assertLocalDevWorkerTelemetrySafe(event);
}

export function createPolicyBlockedTelemetryEvent(input: {
  eventId?: string;
  lifecycleId: string;
  blockedStage: string;
  reason: string;
  rejectionCodes: readonly string[];
  safety: LocalDevWorkerTelemetrySafetySummary;
}): LocalDevWorkerDockerSmokeLifecyclePolicyBlockedTelemetryEvent {
  const event: LocalDevWorkerDockerSmokeLifecyclePolicyBlockedTelemetryEvent = {
    ...baseEvent({
      eventId:
        input.eventId ??
        `telemetry.${input.lifecycleId}.policy.blocked.${input.blockedStage}`,
      eventKind: 'docker-smoke.lifecycle.policy.blocked',
    }),
    payload: {
      lifecycleId: input.lifecycleId,
      blockedStage: sanitizeLocalDevWorkerTelemetryString(input.blockedStage),
      sanitizedReason: sanitizeLocalDevWorkerTelemetryString(input.reason),
      rejectionCodes: uniqueCodes(input.rejectionCodes),
      safety: input.safety,
    },
  };

  return assertLocalDevWorkerTelemetrySafe(event);
}
