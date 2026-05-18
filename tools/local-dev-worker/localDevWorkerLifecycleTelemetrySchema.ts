import type { LocalDevWorkerDockerSmokeLifecycleOutcome } from './localDevWorkerDockerSmokeLifecycle.ts';

export const LOCAL_DEV_WORKER_LIFECYCLE_TELEMETRY_SCHEMA_VERSION =
  '2026-05-18.local-dev-worker.telemetry.v1' as const;

export type LocalDevWorkerTelemetryEventKind =
  | 'local-dev-worker.verify.started'
  | 'local-dev-worker.verify.completed'
  | 'docker-smoke.lifecycle.started'
  | 'docker-smoke.lifecycle.completed'
  | 'docker-smoke.lifecycle.report.generated'
  | 'docker-smoke.lifecycle.golden.checked'
  | 'docker-smoke.lifecycle.policy.blocked';

export interface LocalDevWorkerTelemetryBaseEvent {
  schemaVersion: typeof LOCAL_DEV_WORKER_LIFECYCLE_TELEMETRY_SCHEMA_VERSION;
  eventId: string;
  eventKind: LocalDevWorkerTelemetryEventKind;
  localDevOnly: true;
  source: 'tools/local-dev-worker';
  productionUiPath: false;
  srcImportPath: false;
  timestampPolicy:
    | 'omitted-for-deterministic-fixtures'
    | 'runtime-generated-in-future';
  containsSecrets: false;
  containsHostPaths: false;
  containsUserPrompt: false;
  containsEnvironment: false;
}

export interface LocalDevWorkerTelemetryReadinessSummary {
  readinessState: string;
  daemonReachable: boolean;
  rejectionCodes: readonly string[];
  durationMs: number;
}

export interface LocalDevWorkerTelemetrySmokeSummary {
  outcome: string;
  executionAttempted: boolean;
  containerStarted: boolean;
  cleanupRisk: string;
  stdoutPreview: string;
  stderrPreview: string;
  stdoutPreviewBytes: number;
  stderrPreviewBytes: number;
  rejectionCodes: readonly string[];
  durationMs: number;
}

export interface LocalDevWorkerTelemetryCleanupSummary {
  outcome: string;
  executionAttempted: boolean;
  cleanupExecuted: boolean;
  stdoutPreview: string;
  stderrPreview: string;
  stdoutPreviewBytes: number;
  stderrPreviewBytes: number;
  rejectionCodes: readonly string[];
  durationMs: number;
}

export interface LocalDevWorkerTelemetrySafetySummary {
  noNewDockerCapabilities: true;
  arbitraryDockerRunAllowed: false;
  arbitraryCleanupAllowed: false;
  imagePullAllowed: false;
  networkAllowed: false;
  mountsAllowed: false;
  workspaceMounted: false;
  dockerSocketMounted: false;
  homeMounted: false;
  shellAllowed: false;
  hostEnvironmentInherited: false;
  productionUiPath: false;
  srcImportPath: false;
}

export interface LocalDevWorkerTelemetryLifecycleOutcomeSummary {
  lifecycleId: string;
  ok: boolean;
  outcome: LocalDevWorkerDockerSmokeLifecycleOutcome;
  stages: readonly string[];
  cleanupAttempted: boolean;
  cleanupRequired: boolean;
  rejectionCodes: readonly string[];
  readiness: LocalDevWorkerTelemetryReadinessSummary;
  smoke?: LocalDevWorkerTelemetrySmokeSummary;
  cleanup?: LocalDevWorkerTelemetryCleanupSummary;
  safety: LocalDevWorkerTelemetrySafetySummary;
}

export interface LocalDevWorkerTelemetryReportSummary {
  reportId: string;
  lifecycleId: string;
  ok: boolean;
  outcome: string;
  warnings: readonly string[];
  nextRecommendedAction: string;
  smokeStdoutPreviewBytes?: number;
  smokeStderrPreviewBytes?: number;
  cleanupStdoutPreviewBytes?: number;
  cleanupStderrPreviewBytes?: number;
  safety: LocalDevWorkerTelemetrySafetySummary;
}

export interface LocalDevWorkerTelemetryGoldenCheckSummary {
  passed: boolean;
  checkedFiles: readonly string[];
  mismatchSummary: string;
  rejectionCodes: readonly string[];
}

export interface LocalDevWorkerTelemetryPolicyBlockedSummary {
  lifecycleId: string;
  blockedStage: string;
  sanitizedReason: string;
  rejectionCodes: readonly string[];
  safety: LocalDevWorkerTelemetrySafetySummary;
}

export interface LocalDevWorkerTelemetryVerifySummary {
  scriptName: string;
  fixtureCounts: Record<string, number>;
  passed?: boolean;
  rejectionCodes: readonly string[];
}

export interface LocalDevWorkerVerifyStartedTelemetryEvent
  extends LocalDevWorkerTelemetryBaseEvent {
  eventKind: 'local-dev-worker.verify.started';
  payload: LocalDevWorkerTelemetryVerifySummary;
}

export interface LocalDevWorkerVerifyCompletedTelemetryEvent
  extends LocalDevWorkerTelemetryBaseEvent {
  eventKind: 'local-dev-worker.verify.completed';
  payload: LocalDevWorkerTelemetryVerifySummary & {
    passed: boolean;
  };
}

export interface LocalDevWorkerDockerSmokeLifecycleStartedTelemetryEvent
  extends LocalDevWorkerTelemetryBaseEvent {
  eventKind: 'docker-smoke.lifecycle.started';
  payload: {
    lifecycleId: string;
    plannedStages: readonly string[];
    safety: LocalDevWorkerTelemetrySafetySummary;
  };
}

export interface LocalDevWorkerDockerSmokeLifecycleCompletedTelemetryEvent
  extends LocalDevWorkerTelemetryBaseEvent {
  eventKind: 'docker-smoke.lifecycle.completed';
  payload: LocalDevWorkerTelemetryLifecycleOutcomeSummary;
}

export interface LocalDevWorkerDockerSmokeLifecycleReportGeneratedTelemetryEvent
  extends LocalDevWorkerTelemetryBaseEvent {
  eventKind: 'docker-smoke.lifecycle.report.generated';
  payload: LocalDevWorkerTelemetryReportSummary;
}

export interface LocalDevWorkerDockerSmokeLifecycleGoldenCheckedTelemetryEvent
  extends LocalDevWorkerTelemetryBaseEvent {
  eventKind: 'docker-smoke.lifecycle.golden.checked';
  payload: LocalDevWorkerTelemetryGoldenCheckSummary;
}

export interface LocalDevWorkerDockerSmokeLifecyclePolicyBlockedTelemetryEvent
  extends LocalDevWorkerTelemetryBaseEvent {
  eventKind: 'docker-smoke.lifecycle.policy.blocked';
  payload: LocalDevWorkerTelemetryPolicyBlockedSummary;
}

export type LocalDevWorkerTelemetryEvent =
  | LocalDevWorkerVerifyStartedTelemetryEvent
  | LocalDevWorkerVerifyCompletedTelemetryEvent
  | LocalDevWorkerDockerSmokeLifecycleStartedTelemetryEvent
  | LocalDevWorkerDockerSmokeLifecycleCompletedTelemetryEvent
  | LocalDevWorkerDockerSmokeLifecycleReportGeneratedTelemetryEvent
  | LocalDevWorkerDockerSmokeLifecycleGoldenCheckedTelemetryEvent
  | LocalDevWorkerDockerSmokeLifecyclePolicyBlockedTelemetryEvent;
